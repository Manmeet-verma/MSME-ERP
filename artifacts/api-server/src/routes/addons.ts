import { Router } from "express";
import { db, addonsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { logAction } from "../lib/auditLog";

const addonsRouter = Router();

function formatAddon(a: typeof addonsTable.$inferSelect) {
  return {
    id: a.id,
    name: a.name,
    description: a.description ?? null,
    price: Number(a.price),
    priceType: a.priceType,
    category: a.category,
    isActive: a.isActive,
  };
}

addonsRouter.get("/addons", requireAuth, async (req, res) => {
  const addons = await db
    .select()
    .from(addonsTable)
    .where(eq(addonsTable.organizationId, req.user!.organizationId))
    .orderBy(addonsTable.category, addonsTable.name);
  res.json(addons.map(formatAddon));
});

addonsRouter.post("/addons", requireAuth, requireAdmin, async (req, res) => {
  const { name, description, price, priceType, category, isActive } = req.body ?? {};
  if (!name || price === undefined || !priceType || !category) {
    res.status(400).json({ error: "Required fields missing" });
    return;
  }
  const [a] = await db
    .insert(addonsTable)
    .values({
      organizationId: req.user!.organizationId,
      name,
      description,
      price: String(price),
      priceType,
      category,
      isActive: isActive !== false,
    })
    .returning();
  await logAction(req, "CREATE", "addon", a.id, `Created addon ${name}`);
  res.status(201).json(formatAddon(a));
});

addonsRouter.patch("/addons/:id", requireAuth, requireAdmin, async (req, res) => {
  const orgId = req.user!.organizationId;
  const updates: Record<string, unknown> = {};
  const fields = ["name", "description", "priceType", "category", "isActive"] as const;
  for (const f of fields) if (req.body?.[f] !== undefined) updates[f] = req.body[f];
  if (req.body?.price !== undefined) updates.price = String(req.body.price);
  const [a] = await db
    .update(addonsTable)
    .set(updates)
    .where(and(eq(addonsTable.id, Number(req.params.id)), eq(addonsTable.organizationId, orgId)))
    .returning();
  if (!a) {
    res.status(404).json({ error: "Addon not found" });
    return;
  }
  await logAction(req, "UPDATE", "addon", a.id);
  res.json(formatAddon(a));
});

addonsRouter.delete("/addons/:id", requireAuth, requireAdmin, async (req, res) => {
  const orgId = req.user!.organizationId;
  await db
    .delete(addonsTable)
    .where(and(eq(addonsTable.id, Number(req.params.id)), eq(addonsTable.organizationId, orgId)));
  await logAction(req, "DELETE", "addon", Number(req.params.id));
  res.json({ message: "Addon deleted" });
});

export default addonsRouter;
