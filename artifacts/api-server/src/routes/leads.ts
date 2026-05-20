import { Router } from "express";
import {
  db,
  leadsTable,
  leadActivitiesTable,
  usersTable,
  clientsTable,
  quotationsTable,
} from "@workspace/db";
import { and, eq, sql, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { logAction } from "../lib/auditLog";
import { scoreLead } from "../lib/leadScoring";

const leadsRouter = Router();

function formatLead(l: typeof leadsTable.$inferSelect) {
  return {
    id: l.id,
    name: l.name,
    email: l.email ?? null,
    phone: l.phone ?? null,
    company: l.company ?? null,
    city: l.city ?? null,
    state: l.state ?? null,
    source: l.source,
    externalId: l.externalId ?? null,
    status: l.status,
    priority: l.priority,
    score: l.score,
    budget: l.budget !== null ? Number(l.budget) : null,
    product: l.product ?? null,
    notes: l.notes ?? null,
    nextAction: l.nextAction ?? null,
    assignedToId: l.assignedToId ?? null,
    convertedClientId: l.convertedClientId ?? null,
    lastContactedAt: l.lastContactedAt?.toISOString() ?? null,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
  };
}

leadsRouter.get("/leads", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const { status, priority, source, search } = req.query as Record<string, string | undefined>;
  let rows = await db
    .select()
    .from(leadsTable)
    .where(eq(leadsTable.organizationId, orgId))
    .orderBy(desc(leadsTable.createdAt));
  if (status) rows = rows.filter((r) => r.status === status);
  if (priority) rows = rows.filter((r) => r.priority === priority);
  if (source) rows = rows.filter((r) => r.source === source);
  if (search) {
    const s = search.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.name.toLowerCase().includes(s) ||
        (r.email ?? "").toLowerCase().includes(s) ||
        (r.company ?? "").toLowerCase().includes(s) ||
        (r.phone ?? "").includes(s),
    );
  }
  res.json(rows.map(formatLead));
});

leadsRouter.post("/leads", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const body = req.body ?? {};
  if (!body.name) {
    res.status(400).json({ error: "name required" });
    return;
  }
  const initial = {
    organizationId: orgId,
    name: body.name,
    email: body.email ?? null,
    phone: body.phone ?? null,
    company: body.company ?? null,
    city: body.city ?? null,
    state: body.state ?? null,
    source: body.source ?? "manual",
    status: body.status ?? "new",
    budget: body.budget !== undefined && body.budget !== null ? String(body.budget) : null,
    product: body.product ?? null,
    notes: body.notes ?? null,
    assignedToId: body.assignedToId ?? null,
    createdById: req.user!.userId,
  };
  const sc = scoreLead({
    ...initial,
    budget: initial.budget ? Number(initial.budget) : null,
  } as never);
  const [lead] = await db
    .insert(leadsTable)
    .values({
      ...initial,
      priority: sc.priority,
      score: sc.score,
      nextAction: sc.nextAction,
    })
    .returning();
  await db.insert(leadActivitiesTable).values({
    organizationId: orgId,
    leadId: lead.id,
    type: "note",
    title: "Lead created",
    body: `Source: ${lead.source}`,
    userId: req.user!.userId,
  });
  await logAction(req, "CREATE", "lead", lead.id, `Created lead ${lead.name}`);
  res.status(201).json(formatLead(lead));
});

leadsRouter.get("/leads/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = Number(req.params.id);
  const [l] = await db
    .select()
    .from(leadsTable)
    .where(and(eq(leadsTable.id, id), eq(leadsTable.organizationId, orgId)));
  if (!l) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }
  const acts = await db
    .select({
      id: leadActivitiesTable.id,
      leadId: leadActivitiesTable.leadId,
      type: leadActivitiesTable.type,
      title: leadActivitiesTable.title,
      body: leadActivitiesTable.body,
      userId: leadActivitiesTable.userId,
      userName: usersTable.name,
      createdAt: leadActivitiesTable.createdAt,
    })
    .from(leadActivitiesTable)
    .leftJoin(usersTable, eq(leadActivitiesTable.userId, usersTable.id))
    .where(eq(leadActivitiesTable.leadId, id))
    .orderBy(desc(leadActivitiesTable.createdAt));
  res.json({
    ...formatLead(l),
    activities: acts.map((a) => ({
      id: a.id,
      leadId: a.leadId,
      type: a.type,
      title: a.title,
      body: a.body ?? null,
      userId: a.userId ?? null,
      userName: a.userName ?? null,
      createdAt: a.createdAt.toISOString(),
    })),
  });
});

leadsRouter.patch("/leads/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = Number(req.params.id);
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  const body = req.body ?? {};
  for (const f of [
    "name", "email", "phone", "company", "city", "state",
    "source", "status", "product", "notes", "nextAction", "assignedToId",
  ] as const) {
    if (body[f] !== undefined) updates[f] = body[f];
  }
  if (body.budget !== undefined) updates.budget = body.budget !== null ? String(body.budget) : null;
  if (body.priority) updates.priority = body.priority;
  if (body.status && body.status !== "new") updates.lastContactedAt = new Date();
  const [l] = await db
    .update(leadsTable)
    .set(updates)
    .where(and(eq(leadsTable.id, id), eq(leadsTable.organizationId, orgId)))
    .returning();
  if (!l) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }
  // Re-score
  const sc = scoreLead({ ...l, budget: l.budget ? Number(l.budget) : null } as never);
  const [updated] = await db
    .update(leadsTable)
    .set({ priority: sc.priority, score: sc.score, nextAction: sc.nextAction })
    .where(eq(leadsTable.id, id))
    .returning();
  await logAction(req, "UPDATE", "lead", id);
  res.json(formatLead(updated));
});

leadsRouter.delete("/leads/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = Number(req.params.id);
  const r = await db
    .delete(leadsTable)
    .where(and(eq(leadsTable.id, id), eq(leadsTable.organizationId, orgId)))
    .returning({ id: leadsTable.id });
  if (r.length === 0) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }
  await logAction(req, "DELETE", "lead", id);
  res.json({ message: "Lead deleted" });
});

// Activities
leadsRouter.get("/leads/:id/activities", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = Number(req.params.id);
  const [l] = await db
    .select()
    .from(leadsTable)
    .where(and(eq(leadsTable.id, id), eq(leadsTable.organizationId, orgId)));
  if (!l) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }
  const acts = await db
    .select({
      id: leadActivitiesTable.id,
      leadId: leadActivitiesTable.leadId,
      type: leadActivitiesTable.type,
      title: leadActivitiesTable.title,
      body: leadActivitiesTable.body,
      userId: leadActivitiesTable.userId,
      userName: usersTable.name,
      createdAt: leadActivitiesTable.createdAt,
    })
    .from(leadActivitiesTable)
    .leftJoin(usersTable, eq(leadActivitiesTable.userId, usersTable.id))
    .where(eq(leadActivitiesTable.leadId, id))
    .orderBy(desc(leadActivitiesTable.createdAt));
  res.json(
    acts.map((a) => ({
      id: a.id,
      leadId: a.leadId,
      type: a.type,
      title: a.title,
      body: a.body ?? null,
      userId: a.userId ?? null,
      userName: a.userName ?? null,
      createdAt: a.createdAt.toISOString(),
    })),
  );
});

leadsRouter.post("/leads/:id/activities", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = Number(req.params.id);
  const [l] = await db
    .select()
    .from(leadsTable)
    .where(and(eq(leadsTable.id, id), eq(leadsTable.organizationId, orgId)));
  if (!l) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }
  const { type, title, body } = req.body ?? {};
  if (!type || !title) {
    res.status(400).json({ error: "type and title required" });
    return;
  }
  const [a] = await db
    .insert(leadActivitiesTable)
    .values({
      organizationId: orgId,
      leadId: id,
      type,
      title,
      body: body ?? null,
      userId: req.user!.userId,
    })
    .returning();
  if (type === "call" || type === "email") {
    await db
      .update(leadsTable)
      .set({ lastContactedAt: new Date(), status: l.status === "new" ? "contacted" : l.status })
      .where(eq(leadsTable.id, id));
  }
  res.status(201).json({
    id: a.id,
    leadId: a.leadId,
    type: a.type,
    title: a.title,
    body: a.body ?? null,
    userId: a.userId ?? null,
    userName: null,
    createdAt: a.createdAt.toISOString(),
  });
});

leadsRouter.post("/leads/:id/score", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = Number(req.params.id);
  const [l] = await db
    .select()
    .from(leadsTable)
    .where(and(eq(leadsTable.id, id), eq(leadsTable.organizationId, orgId)));
  if (!l) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }
  const sc = scoreLead({ ...l, budget: l.budget ? Number(l.budget) : null } as never);
  const [updated] = await db
    .update(leadsTable)
    .set({ score: sc.score, priority: sc.priority, nextAction: sc.nextAction, updatedAt: new Date() })
    .where(eq(leadsTable.id, id))
    .returning();
  res.json(formatLead(updated));
});

leadsRouter.post("/leads/:id/convert", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = Number(req.params.id);
  const [l] = await db
    .select()
    .from(leadsTable)
    .where(and(eq(leadsTable.id, id), eq(leadsTable.organizationId, orgId)));
  if (!l) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }
  // Reuse existing client if already converted
  let clientId = l.convertedClientId ?? null;
  if (!clientId) {
    const [c] = await db
      .insert(clientsTable)
      .values({
        organizationId: orgId,
        name: l.name,
        email: l.email,
        phone: l.phone,
        company: l.company,
        city: l.city,
        state: l.state,
        notes: l.notes,
        createdById: req.user!.userId,
      })
      .returning();
    clientId = c.id;
    await db
      .update(leadsTable)
      .set({ convertedClientId: clientId, status: "won", updatedAt: new Date() })
      .where(eq(leadsTable.id, id));
  }
  let quotationId: number | null = null;
  if (req.body?.createQuotation) {
    const now = new Date();
    const qn = `QT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${Math.floor(Math.random() * 9000) + 1000}`;
    const [q] = await db
      .insert(quotationsTable)
      .values({
        organizationId: orgId,
        quotationNumber: qn,
        clientId,
        createdById: req.user!.userId,
        notes: `Converted from lead #${l.id}`,
        taxPercent: "18",
      })
      .returning();
    quotationId = q.id;
  }
  await db.insert(leadActivitiesTable).values({
    organizationId: orgId,
    leadId: id,
    type: "conversion",
    title: "Converted to client",
    body: quotationId ? `Quotation #${quotationId} created` : undefined,
    userId: req.user!.userId,
  });
  await logAction(req, "CONVERT", "lead", id, `Converted to client ${clientId}`);
  res.json({ clientId, quotationId });
});

leadsRouter.use((err: Error, _req: import("express").Request, res: import("express").Response, _next: import("express").NextFunction) => {
  res.status(500).json({ error: err.message });
});

export default leadsRouter;
