import { Router } from "express";
import { db, clientsTable, quotationsTable } from "@workspace/db";
import { eq, ilike, or, count, sum, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { logAction } from "../lib/auditLog";

const clientsRouter = Router();

clientsRouter.get("/clients", requireAuth, async (req, res) => {
  const { search } = req.query;
  let clients = await db.select().from(clientsTable).orderBy(clientsTable.name);
  if (search && typeof search === "string") {
    const s = search.toLowerCase();
    clients = clients.filter(c =>
      c.name.toLowerCase().includes(s) ||
      (c.company ?? "").toLowerCase().includes(s) ||
      (c.email ?? "").toLowerCase().includes(s)
    );
  }
  const quoteStats = await db
    .select({
      clientId: quotationsTable.clientId,
      quotationCount: count(quotationsTable.id),
      totalValue: sum(quotationsTable.total),
    })
    .from(quotationsTable)
    .groupBy(quotationsTable.clientId);

  const statsMap = new Map(quoteStats.map(s => [s.clientId, s]));

  res.json(clients.map(c => {
    const stats = statsMap.get(c.id);
    return {
      id: c.id,
      name: c.name,
      email: c.email ?? null,
      phone: c.phone ?? null,
      company: c.company ?? null,
      address: c.address ?? null,
      city: c.city ?? null,
      gstNumber: c.gstNumber ?? null,
      notes: c.notes ?? null,
      quotationCount: Number(stats?.quotationCount ?? 0),
      totalValue: Number(stats?.totalValue ?? 0),
      createdAt: c.createdAt.toISOString(),
    };
  }));
});

clientsRouter.post("/clients", requireAuth, async (req, res) => {
  const { name, email, phone, company, address, city, gstNumber, notes } = req.body;
  if (!name) { res.status(400).json({ error: "Name required" }); return; }
  const [client] = await db.insert(clientsTable).values({
    name, email, phone, company, address, city, gstNumber, notes,
    createdById: req.user!.userId,
  }).returning();
  await logAction(req, "CREATE", "client", client.id, `Created client ${name}`);
  res.status(201).json({
    id: client.id,
    name: client.name,
    email: client.email ?? null,
    phone: client.phone ?? null,
    company: client.company ?? null,
    address: client.address ?? null,
    city: client.city ?? null,
    gstNumber: client.gstNumber ?? null,
    notes: client.notes ?? null,
    quotationCount: 0,
    totalValue: 0,
    createdAt: client.createdAt.toISOString(),
  });
});

clientsRouter.get("/clients/:id", requireAuth, async (req, res) => {
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, Number(req.params.id)));
  if (!client) { res.status(404).json({ error: "Client not found" }); return; }
  const stats = await db
    .select({ quotationCount: count(), totalValue: sum(quotationsTable.total) })
    .from(quotationsTable)
    .where(eq(quotationsTable.clientId, client.id));
  res.json({
    id: client.id,
    name: client.name,
    email: client.email ?? null,
    phone: client.phone ?? null,
    company: client.company ?? null,
    address: client.address ?? null,
    city: client.city ?? null,
    gstNumber: client.gstNumber ?? null,
    notes: client.notes ?? null,
    quotationCount: Number(stats[0]?.quotationCount ?? 0),
    totalValue: Number(stats[0]?.totalValue ?? 0),
    createdAt: client.createdAt.toISOString(),
  });
});

clientsRouter.patch("/clients/:id", requireAuth, async (req, res) => {
  const { name, email, phone, company, address, city, gstNumber, notes } = req.body;
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (email !== undefined) updates.email = email;
  if (phone !== undefined) updates.phone = phone;
  if (company !== undefined) updates.company = company;
  if (address !== undefined) updates.address = address;
  if (city !== undefined) updates.city = city;
  if (gstNumber !== undefined) updates.gstNumber = gstNumber;
  if (notes !== undefined) updates.notes = notes;
  const [client] = await db.update(clientsTable).set(updates).where(eq(clientsTable.id, Number(req.params.id))).returning();
  if (!client) { res.status(404).json({ error: "Client not found" }); return; }
  await logAction(req, "UPDATE", "client", client.id, `Updated client ${client.name}`);
  const stats = await db
    .select({ quotationCount: count(), totalValue: sum(quotationsTable.total) })
    .from(quotationsTable)
    .where(eq(quotationsTable.clientId, client.id));
  res.json({
    id: client.id,
    name: client.name,
    email: client.email ?? null,
    phone: client.phone ?? null,
    company: client.company ?? null,
    address: client.address ?? null,
    city: client.city ?? null,
    gstNumber: client.gstNumber ?? null,
    notes: client.notes ?? null,
    quotationCount: Number(stats[0]?.quotationCount ?? 0),
    totalValue: Number(stats[0]?.totalValue ?? 0),
    createdAt: client.createdAt.toISOString(),
  });
});

clientsRouter.delete("/clients/:id", requireAuth, async (req, res) => {
  await db.delete(clientsTable).where(eq(clientsTable.id, Number(req.params.id)));
  await logAction(req, "DELETE", "client", Number(req.params.id));
  res.json({ message: "Client deleted" });
});

export default clientsRouter;
