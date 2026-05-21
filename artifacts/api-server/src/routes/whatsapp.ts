import { Router } from "express";
import crypto from "node:crypto";
import {
  db,
  integrationsTable,
  whatsappMessagesTable,
  leadsTable,
  leadActivitiesTable,
  clientsTable,
} from "@workspace/db";
import { and, eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { logger } from "../lib/logger";
import { scoreLead } from "../lib/leadScoring";

const whatsappRouter = Router();

function fmt(m: typeof whatsappMessagesTable.$inferSelect) {
  return {
    id: m.id,
    leadId: m.leadId ?? null,
    clientId: m.clientId ?? null,
    direction: m.direction,
    phone: m.phone,
    body: m.body ?? null,
    templateName: m.templateName ?? null,
    templateLanguage: m.templateLanguage ?? null,
    templateVariables: m.templateVariables ?? [],
    status: m.status,
    providerMessageId: m.providerMessageId ?? null,
    errorMessage: m.errorMessage ?? null,
    createdAt: m.createdAt.toISOString(),
  };
}

interface WhatsappConfig {
  phoneNumberId?: string;
  accessToken?: string;
  verifyToken?: string;
  businessAccountId?: string;
  appSecret?: string;
}

function verifySignature(rawBody: Buffer | undefined, header: string | undefined, appSecret: string): boolean {
  if (!rawBody || !header || !appSecret) return false;
  const expected = "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(header));
  } catch {
    return false;
  }
}

async function getConfig(orgId: number): Promise<WhatsappConfig | null> {
  const [row] = await db
    .select()
    .from(integrationsTable)
    .where(and(eq(integrationsTable.organizationId, orgId), eq(integrationsTable.provider, "whatsapp")));
  if (!row || !row.enabled) return null;
  return (row.config ?? {}) as WhatsappConfig;
}

whatsappRouter.get("/whatsapp/messages", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const { leadId } = req.query as Record<string, string | undefined>;
  const where = leadId
    ? and(eq(whatsappMessagesTable.organizationId, orgId), eq(whatsappMessagesTable.leadId, Number(leadId)))
    : eq(whatsappMessagesTable.organizationId, orgId);
  const rows = await db.select().from(whatsappMessagesTable).where(where).orderBy(desc(whatsappMessagesTable.createdAt)).limit(200);
  res.json(rows.map(fmt));
});

whatsappRouter.post("/whatsapp/send", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const { phone, body, templateName, templateLanguage, templateVariables, leadId, clientId } = req.body ?? {};
  if (typeof phone !== "string" || !phone) {
    res.status(400).json({ error: "phone is required" });
    return;
  }
  if (!body && !templateName) {
    res.status(400).json({ error: "Either body or templateName is required" });
    return;
  }
  const cfg = await getConfig(orgId);
  const vars = Array.isArray(templateVariables) ? templateVariables.map(String) : [];

  // Insert queued row first so we always have a record.
  const [row] = await db
    .insert(whatsappMessagesTable)
    .values({
      organizationId: orgId,
      direction: "outbound",
      phone,
      body: body ?? null,
      templateName: templateName ?? null,
      templateLanguage: templateLanguage ?? "en_US",
      templateVariables: vars,
      leadId: typeof leadId === "number" ? leadId : null,
      clientId: typeof clientId === "number" ? clientId : null,
      status: "queued",
    })
    .returning();

  if (!cfg || !cfg.accessToken || !cfg.phoneNumberId) {
    await db
      .update(whatsappMessagesTable)
      .set({ status: "failed", errorMessage: "WhatsApp not configured" })
      .where(eq(whatsappMessagesTable.id, row.id));
    res.status(400).json({ error: "WhatsApp integration not configured" });
    return;
  }

  const payload: Record<string, unknown> = templateName
    ? {
        messaging_product: "whatsapp",
        to: phone.replace(/[^\d]/g, ""),
        type: "template",
        template: {
          name: templateName,
          language: { code: templateLanguage ?? "en_US" },
          components: vars.length > 0 ? [{ type: "body", parameters: vars.map((text) => ({ type: "text", text })) }] : [],
        },
      }
    : {
        messaging_product: "whatsapp",
        to: phone.replace(/[^\d]/g, ""),
        type: "text",
        text: { body },
      };

  try {
    const resp = await fetch(`https://graph.facebook.com/v20.0/${cfg.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    });
    const data = (await resp.json()) as { messages?: Array<{ id: string }>; error?: { message: string } };
    if (!resp.ok || data.error) {
      const msg = data.error?.message ?? `HTTP ${resp.status}`;
      await db
        .update(whatsappMessagesTable)
        .set({ status: "failed", errorMessage: msg })
        .where(eq(whatsappMessagesTable.id, row.id));
      res.status(502).json({ error: msg });
      return;
    }
    const providerId = data.messages?.[0]?.id ?? null;
    const [updated] = await db
      .update(whatsappMessagesTable)
      .set({ status: "sent", providerMessageId: providerId })
      .where(eq(whatsappMessagesTable.id, row.id))
      .returning();

    if (row.leadId) {
      await db.insert(leadActivitiesTable).values({
        organizationId: orgId,
        leadId: row.leadId,
        type: "note",
        title: "WhatsApp sent",
        body: body ?? `Template: ${templateName}`,
        userId: req.user!.userId,
      });
    }
    res.json(fmt(updated));
  } catch (err) {
    const msg = (err as Error).message;
    await db
      .update(whatsappMessagesTable)
      .set({ status: "failed", errorMessage: msg })
      .where(eq(whatsappMessagesTable.id, row.id));
    res.status(502).json({ error: msg });
  }
});

// Public webhook — Meta verification (GET) + inbound delivery (POST).
whatsappRouter.get("/whatsapp/webhook", async (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  // Match against any org's stored verifyToken.
  const all = await db.select().from(integrationsTable).where(eq(integrationsTable.provider, "whatsapp"));
  const ok = all.some((row) => {
    const cfg = (row.config ?? {}) as WhatsappConfig;
    return cfg.verifyToken && cfg.verifyToken === token;
  });
  if (mode === "subscribe" && ok && typeof challenge === "string") {
    res.status(200).send(challenge);
    return;
  }
  res.status(403).send("forbidden");
});

interface MetaWebhookEntry {
  changes?: Array<{
    value?: {
      metadata?: { phone_number_id?: string };
      messages?: Array<{
        from?: string;
        id?: string;
        text?: { body?: string };
        type?: string;
      }>;
      statuses?: Array<{ id?: string; status?: string }>;
    };
  }>;
}

whatsappRouter.post("/whatsapp/webhook", async (req, res) => {
  const body = req.body as { entry?: MetaWebhookEntry[] };
  const entries = Array.isArray(body?.entry) ? body.entry : [];
  const signature = (req.header("x-hub-signature-256") ?? req.header("X-Hub-Signature-256")) || undefined;
  const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody;

  // Pre-resolve org per entry by phoneNumberId, then verify each entry's payload
  // signature against the matching org's appSecret before processing.
  const allIntegrations = await db
    .select()
    .from(integrationsTable)
    .where(eq(integrationsTable.provider, "whatsapp"));

  // Reject when no integration has signed off on this signature.
  const anyMatch = allIntegrations.some((row) => {
    const cfg = (row.config ?? {}) as WhatsappConfig;
    return cfg.appSecret && verifySignature(rawBody, signature, cfg.appSecret);
  });
  if (!anyMatch) {
    logger.warn({ signature: signature ? "present" : "missing" }, "WhatsApp webhook signature verification failed");
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  // Always 200 so Meta doesn't retry indefinitely.
  res.status(200).json({ received: true });
  try {
    for (const entry of entries) {
      const changes = Array.isArray(entry.changes) ? entry.changes : [];
      for (const change of changes) {
        const value = change.value ?? {};
        const phoneNumberId = value.metadata?.phone_number_id;
        if (!phoneNumberId) continue;
        // Find org by phoneNumberId and validate signature against THIS org's secret.
        const match = allIntegrations.find((row) => {
          const cfg = (row.config ?? {}) as WhatsappConfig;
          return cfg.phoneNumberId === phoneNumberId && cfg.appSecret &&
            verifySignature(rawBody, signature, cfg.appSecret);
        });
        if (!match) {
          logger.warn({ phoneNumberId }, "WhatsApp webhook: no signature-verified org for phoneNumberId");
          continue;
        }
        const orgId = match.organizationId;
        // Status updates.
        for (const st of value.statuses ?? []) {
          if (!st.id) continue;
          const allowed = ["sent", "delivered", "read", "failed"] as const;
          const status = allowed.includes(st.status as (typeof allowed)[number])
            ? (st.status as (typeof allowed)[number])
            : null;
          if (!status) continue;
          await db
            .update(whatsappMessagesTable)
            .set({ status })
            .where(eq(whatsappMessagesTable.providerMessageId, st.id));
        }
        // Inbound messages.
        for (const m of value.messages ?? []) {
          if (!m.from) continue;
          // Try to thread onto an existing lead by phone.
          const [lead] = await db
            .select()
            .from(leadsTable)
            .where(and(eq(leadsTable.organizationId, orgId), eq(leadsTable.phone, m.from)))
            .limit(1);
          let leadId: number | null = lead?.id ?? null;
          let clientId: number | null = null;
          if (!leadId) {
            // No lead? Try client.
            const [client] = await db
              .select()
              .from(clientsTable)
              .where(and(eq(clientsTable.organizationId, orgId), eq(clientsTable.phone, m.from)))
              .limit(1);
            clientId = client?.id ?? null;
            if (!clientId) {
              // Create a lead.
              const sc = scoreLead({ source: "whatsapp", phone: m.from } as never);
              const [newLead] = await db
                .insert(leadsTable)
                .values({
                  organizationId: orgId,
                  name: `WhatsApp ${m.from}`,
                  phone: m.from,
                  source: "whatsapp",
                  externalId: m.id ?? null,
                  status: "new",
                  priority: sc.priority,
                  score: sc.score,
                  notes: m.text?.body ?? null,
                  nextAction: sc.nextAction,
                })
                .returning();
              leadId = newLead.id;
            }
          }
          await db.insert(whatsappMessagesTable).values({
            organizationId: orgId,
            leadId,
            clientId,
            direction: "inbound",
            phone: m.from,
            body: m.text?.body ?? null,
            status: "received",
            providerMessageId: m.id ?? null,
          });
          if (leadId) {
            await db.insert(leadActivitiesTable).values({
              organizationId: orgId,
              leadId,
              type: "note",
              title: "WhatsApp received",
              body: m.text?.body ?? "(no text)",
            });
          }
        }
      }
    }
  } catch (err) {
    logger.error({ err }, "WhatsApp webhook processing failed");
  }
});

export default whatsappRouter;
