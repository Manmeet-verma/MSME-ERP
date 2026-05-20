import { Router } from "express";
import { db, clientsTable, quotationsTable } from "@workspace/db";
import { and, eq, count, sum } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { logAction } from "../lib/auditLog";

const clientsRouter = Router();

function formatClient(c: typeof clientsTable.$inferSelect, quotationCount = 0, totalValue = 0) {
  return {
    id: c.id,
    name: c.name,
    email: c.email ?? null,
    phone: c.phone ?? null,
    company: c.company ?? null,
    address: c.address ?? null,
    city: c.city ?? null,
    state: c.state ?? null,
    gstNumber: c.gstNumber ?? null,
    notes: c.notes ?? null,
    quotationCount,
    totalValue,
    createdAt: c.createdAt.toISOString(),
  };
}

clientsRouter.get("/clients", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const rows = await db
    .select()
    .from(clientsTable)
    .where(eq(clientsTable.organizationId, orgId))
    .orderBy(clientsTable.name);

  const stats = await db
    .select({
      clientId: quotationsTable.clientId,
      count: count(),
      total: sum(quotationsTable.total),
    })
    .from(quotationsTable)
    .where(eq(quotationsTable.organizationId, orgId))
    .groupBy(quotationsTable.clientId);
  const statMap = new Map(stats.map((s) => [s.clientId, s]));
  res.json(
    rows.map((c) =>
      formatClient(
        c,
        Number(statMap.get(c.id)?.count ?? 0),
        Number(statMap.get(c.id)?.total ?? 0),
      ),
    ),
  );
});

clientsRouter.get("/clients/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const [c] = await db
    .select()
    .from(clientsTable)
    .where(and(eq(clientsTable.id, Number(req.params.id)), eq(clientsTable.organizationId, orgId)));
  if (!c) {
    res.status(404).json({ error: "Client not found" });
    return;
  }
  res.json(formatClient(c));
});

clientsRouter.post("/clients", requireAuth, async (req, res) => {
  const { name, email, phone, company, address, city, state, gstNumber, notes } = req.body ?? {};
  if (!name) {
    res.status(400).json({ error: "name required" });
    return;
  }
  const [c] = await db
    .insert(clientsTable)
    .values({
      organizationId: req.user!.organizationId,
      name,
      email,
      phone,
      company,
      address,
      city,
      state,
      gstNumber,
      notes,
      createdById: req.user!.userId,
    })
    .returning();
  await logAction(req, "CREATE", "client", c.id, `Created client ${name}`);
  res.status(201).json(formatClient(c));
});

clientsRouter.patch("/clients/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const updates: Record<string, unknown> = {};
  const fields = ["name", "email", "phone", "company", "address", "city", "state", "gstNumber", "notes"] as const;
  for (const f of fields) if (req.body?.[f] !== undefined) updates[f] = req.body[f];
  const [c] = await db
    .update(clientsTable)
    .set(updates)
    .where(and(eq(clientsTable.id, Number(req.params.id)), eq(clientsTable.organizationId, orgId)))
    .returning();
  if (!c) {
    res.status(404).json({ error: "Client not found" });
    return;
  }
  await logAction(req, "UPDATE", "client", c.id);
  res.json(formatClient(c));
});

clientsRouter.delete("/clients/:id", requireAuth, requireAdmin, async (req, res) => {
  const orgId = req.user!.organizationId;
  await db
    .delete(clientsTable)
    .where(and(eq(clientsTable.id, Number(req.params.id)), eq(clientsTable.organizationId, orgId)));
  await logAction(req, "DELETE", "client", Number(req.params.id));
  res.json({ message: "Client deleted" });
});

export default clientsRouter;
