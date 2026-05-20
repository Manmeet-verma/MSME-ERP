import { Router } from "express";
import { db, vendorsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { logAction } from "../lib/auditLog";

const vendorsRouter = Router();

function fmt(v: typeof vendorsTable.$inferSelect) {
  return {
    id: v.id,
    name: v.name,
    contactName: v.contactName ?? null,
    email: v.email ?? null,
    phone: v.phone ?? null,
    address: v.address ?? null,
    city: v.city ?? null,
    state: v.state ?? null,
    gstNumber: v.gstNumber ?? null,
    paymentTermsDays: v.paymentTermsDays,
    notes: v.notes ?? null,
    createdAt: v.createdAt.toISOString(),
  };
}

vendorsRouter.get("/vendors", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const rows = await db
    .select()
    .from(vendorsTable)
    .where(eq(vendorsTable.organizationId, orgId))
    .orderBy(vendorsTable.name);
  res.json(rows.map(fmt));
});

vendorsRouter.get("/vendors/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const [v] = await db
    .select()
    .from(vendorsTable)
    .where(and(eq(vendorsTable.id, Number(req.params.id)), eq(vendorsTable.organizationId, orgId)));
  if (!v) {
    res.status(404).json({ error: "Vendor not found" });
    return;
  }
  res.json(fmt(v));
});

vendorsRouter.post("/vendors", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const b = req.body ?? {};
  if (!b.name) {
    res.status(400).json({ error: "name required" });
    return;
  }
  const [v] = await db
    .insert(vendorsTable)
    .values({
      organizationId: orgId,
      name: b.name,
      contactName: b.contactName ?? null,
      email: b.email ?? null,
      phone: b.phone ?? null,
      address: b.address ?? null,
      city: b.city ?? null,
      state: b.state ?? null,
      gstNumber: b.gstNumber ?? null,
      paymentTermsDays: b.paymentTermsDays ?? 30,
      notes: b.notes ?? null,
    })
    .returning();
  await logAction(req, "CREATE", "vendor", v.id, `Created vendor ${v.name}`);
  res.status(201).json(fmt(v));
});

vendorsRouter.patch("/vendors/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = Number(req.params.id);
  const b = req.body ?? {};
  const updates: Record<string, unknown> = {};
  for (const f of ["name", "contactName", "email", "phone", "address", "city", "state", "gstNumber", "paymentTermsDays", "notes"] as const) {
    if (b[f] !== undefined) updates[f] = b[f];
  }
  const [v] = await db
    .update(vendorsTable)
    .set(updates)
    .where(and(eq(vendorsTable.id, id), eq(vendorsTable.organizationId, orgId)))
    .returning();
  if (!v) {
    res.status(404).json({ error: "Vendor not found" });
    return;
  }
  await logAction(req, "UPDATE", "vendor", id);
  res.json(fmt(v));
});

vendorsRouter.delete("/vendors/:id", requireAuth, requireAdmin, async (req, res) => {
  const orgId = req.user!.organizationId;
  await db
    .delete(vendorsTable)
    .where(and(eq(vendorsTable.id, Number(req.params.id)), eq(vendorsTable.organizationId, orgId)));
  await logAction(req, "DELETE", "vendor", Number(req.params.id));
  res.json({ message: "Vendor deleted" });
});

export default vendorsRouter;
