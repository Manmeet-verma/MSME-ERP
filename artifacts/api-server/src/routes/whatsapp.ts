import { Router } from "express";
import crypto from "node:crypto";
import { getDb } from "../lib/firebase";
import { requireAuth } from "../middlewares/auth";
import { logger } from "../lib/logger";
import { scoreLead } from "../lib/leadScoring";

const db = () => getDb();

const whatsappRouter = Router();

function fmt(m: Record<string, unknown>) {
  return {
    id: m.id as string,
    leadId: (m.leadId as string) ?? null,
    clientId: (m.clientId as string) ?? null,
    direction: m.direction as string,
    phone: m.phone as string,
    body: (m.body as string) ?? null,
    templateName: (m.templateName as string) ?? null,
    templateLanguage: (m.templateLanguage as string) ?? null,
    templateVariables: (m.templateVariables as string[]) ?? [],
    status: m.status as string,
    providerMessageId: (m.providerMessageId as string) ?? null,
    errorMessage: (m.errorMessage as string) ?? null,
    createdAt: m.createdAt as string,
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

async function getConfig(orgId: string): Promise<WhatsappConfig | null> {
  const snap = await db()
    .collection("integrations")
    .where("organizationId", "==", orgId)
    .where("provider", "==", "whatsapp")
    .limit(1)
    .get();
  if (snap.empty) return null;
  const row = snap.docs[0].data();
  if (!row.enabled) return null;
  return (row.config ?? {}) as WhatsappConfig;
}

whatsappRouter.get("/whatsapp/messages", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const { leadId } = req.query as Record<string, string | undefined>;
  let q: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db().collection("whatsapp_messages").where("organizationId", "==", orgId);
  if (leadId) q = q.where("leadId", "==", leadId);
  const snap = await q.orderBy("createdAt", "desc").limit(200).get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
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

  const ref = await db().collection("whatsapp_messages").add({
    organizationId: orgId,
    direction: "outbound",
    phone,
    body: body ?? null,
    templateName: templateName ?? null,
    templateLanguage: templateLanguage ?? "en_US",
    templateVariables: vars,
    leadId: typeof leadId === "string" ? leadId : null,
    clientId: typeof clientId === "string" ? clientId : null,
    status: "queued",
    createdAt: new Date().toISOString(),
  });

  if (!cfg || !cfg.accessToken || !cfg.phoneNumberId) {
    await ref.update({ status: "failed", errorMessage: "WhatsApp not configured" });
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
      await ref.update({ status: "failed", errorMessage: msg });
      res.status(502).json({ error: msg });
      return;
    }
    const providerId = data.messages?.[0]?.id ?? null;
    await ref.update({ status: "sent", providerMessageId: providerId });

    if (leadId) {
      await db().collection("lead_activities").add({
        organizationId: orgId,
        leadId,
        type: "note",
        title: "WhatsApp sent",
        body: body ?? `Template: ${templateName}`,
        userId: req.user!.userId,
        createdAt: new Date().toISOString(),
      });
    }
    const updatedSnap = await ref.get();
    res.json(fmt({ id: updatedSnap.id, ...updatedSnap.data() }));
  } catch (err) {
    const msg = (err as Error).message;
    await ref.update({ status: "failed", errorMessage: msg });
    res.status(502).json({ error: msg });
  }
});

// Public webhook — Meta verification (GET) + inbound delivery (POST).
whatsappRouter.get("/whatsapp/webhook", async (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  const all = await db().collection("integrations").where("provider", "==", "whatsapp").get();
  const ok = all.docs.some((row) => {
    const cfg = (row.data().config ?? {}) as WhatsappConfig;
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

  const allIntegrations = await db()
    .collection("integrations")
    .where("provider", "==", "whatsapp")
    .get();
  const intDocs = allIntegrations.docs.map((d) => ({ id: d.id, ...d.data() }));

  const anyMatch = intDocs.some((row) => {
    const cfg = (row.config ?? {}) as WhatsappConfig;
    return cfg.appSecret && verifySignature(rawBody, signature, cfg.appSecret);
  });
  if (!anyMatch) {
    logger.warn({ signature: signature ? "present" : "missing" }, "WhatsApp webhook signature verification failed");
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  res.status(200).json({ received: true });
  try {
    for (const entry of entries) {
      const changes = Array.isArray(entry.changes) ? entry.changes : [];
      for (const change of changes) {
        const value = change.value ?? {};
        const phoneNumberId = value.metadata?.phone_number_id;
        if (!phoneNumberId) continue;
        const match = intDocs.find((row) => {
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
          const msgSnap = await db().collection("whatsapp_messages").where("providerMessageId", "==", st.id).limit(1).get();
          for (const doc of msgSnap.docs) {
            await doc.ref.update({ status });
          }
        }
        // Inbound messages.
        for (const m of value.messages ?? []) {
          if (!m.from) continue;
          // Try to thread onto an existing lead by phone.
          const leadSnap = await db()
            .collection("leads")
            .where("organizationId", "==", orgId)
            .where("phone", "==", m.from)
            .limit(1)
            .get();
          let leadId: string | null = leadSnap.empty ? null : leadSnap.docs[0].id;
          let clientId: string | null = null;
          if (!leadId) {
            const clientSnap = await db()
              .collection("clients")
              .where("organizationId", "==", orgId)
              .where("phone", "==", m.from)
              .limit(1)
              .get();
            clientId = clientSnap.empty ? null : clientSnap.docs[0].id;
            if (!clientId) {
              const sc = scoreLead({ source: "whatsapp", phone: m.from } as never);
              const newLeadRef = await db().collection("leads").add({
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
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
              leadId = newLeadRef.id;
            }
          }
          await db().collection("whatsapp_messages").add({
            organizationId: orgId,
            leadId,
            clientId,
            direction: "inbound",
            phone: m.from,
            body: m.text?.body ?? null,
            status: "received",
            providerMessageId: m.id ?? null,
            createdAt: new Date().toISOString(),
          });
          if (leadId) {
            await db().collection("lead_activities").add({
              organizationId: orgId,
              leadId,
              type: "note",
              title: "WhatsApp received",
              body: m.text?.body ?? "(no text)",
              createdAt: new Date().toISOString(),
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
