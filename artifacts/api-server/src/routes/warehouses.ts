import { Router } from "express";
import { db, warehousesTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { logAction } from "../lib/auditLog";

const warehousesRouter = Router();

function fmt(w: typeof warehousesTable.$inferSelect) {
  return {
    id: w.id,
    name: w.name,
    code: w.code ?? null,
    address: w.address ?? null,
    city: w.city ?? null,
    state: w.state ?? null,
    isDefault: w.isDefault,
    isActive: w.isActive,
    createdAt: w.createdAt.toISOString(),
  };
}

warehousesRouter.get("/warehouses", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const rows = await db
    .select()
    .from(warehousesTable)
    .where(eq(warehousesTable.organizationId, orgId))
    .orderBy(warehousesTable.name);
  res.json(rows.map(fmt));
});

warehousesRouter.post("/warehouses", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const b = req.body ?? {};
  if (!b.name) {
    res.status(400).json({ error: "name required" });
    return;
  }
  if (b.isDefault) {
    await db
      .update(warehousesTable)
      .set({ isDefault: false })
      .where(eq(warehousesTable.organizationId, orgId));
  }
  const [w] = await db
    .insert(warehousesTable)
    .values({
      organizationId: orgId,
      name: b.name,
      code: b.code ?? null,
      address: b.address ?? null,
      city: b.city ?? null,
      state: b.state ?? null,
      isDefault: b.isDefault ?? false,
      isActive: b.isActive ?? true,
    })
    .returning();
  await logAction(req, "CREATE", "warehouse", w.id, `Created warehouse ${w.name}`);
  res.status(201).json(fmt(w));
});

warehousesRouter.patch("/warehouses/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = Number(req.params.id);
  const b = req.body ?? {};
  if (b.isDefault) {
    await db
      .update(warehousesTable)
      .set({ isDefault: false })
      .where(eq(warehousesTable.organizationId, orgId));
  }
  const updates: Record<string, unknown> = {};
  for (const f of ["name", "code", "address", "city", "state", "isDefault", "isActive"] as const) {
    if (b[f] !== undefined) updates[f] = b[f];
  }
  const [w] = await db
    .update(warehousesTable)
    .set(updates)
    .where(and(eq(warehousesTable.id, id), eq(warehousesTable.organizationId, orgId)))
    .returning();
  if (!w) {
    res.status(404).json({ error: "Warehouse not found" });
    return;
  }
  await logAction(req, "UPDATE", "warehouse", id);
  res.json(fmt(w));
});

warehousesRouter.delete("/warehouses/:id", requireAuth, requireAdmin, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = Number(req.params.id);
  await db
    .delete(warehousesTable)
    .where(and(eq(warehousesTable.id, id), eq(warehousesTable.organizationId, orgId)));
  await logAction(req, "DELETE", "warehouse", id);
  res.json({ message: "Warehouse deleted" });
});

export default warehousesRouter;
