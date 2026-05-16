import { Router } from "express";
import { db, addonsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
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
  const addons = await db.select().from(addonsTable).orderBy(addonsTable.category, addonsTable.name);
  res.json(addons.map(formatAddon));
});

addonsRouter.post("/addons", requireAuth, requireAdmin, async (req, res) => {
  const { name, description, price, priceType, category, isActive } = req.body;
  if (!name || !price || !priceType || !category) { res.status(400).json({ error: "Required fields missing" }); return; }
  const [addon] = await db.insert(addonsTable).values({
    name, description, price: String(price), priceType, category,
    isActive: isActive !== false,
  }).returning();
  await logAction(req, "CREATE", "addon", addon.id, `Created addon ${name}`);
  res.status(201).json(formatAddon(addon));
});

addonsRouter.patch("/addons/:id", requireAuth, requireAdmin, async (req, res) => {
  const { name, description, price, priceType, category, isActive } = req.body;
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (price !== undefined) updates.price = String(price);
  if (priceType !== undefined) updates.priceType = priceType;
  if (category !== undefined) updates.category = category;
  if (isActive !== undefined) updates.isActive = isActive;
  const [addon] = await db.update(addonsTable).set(updates).where(eq(addonsTable.id, Number(req.params.id))).returning();
  if (!addon) { res.status(404).json({ error: "Addon not found" }); return; }
  await logAction(req, "UPDATE", "addon", addon.id);
  res.json(formatAddon(addon));
});

addonsRouter.delete("/addons/:id", requireAuth, requireAdmin, async (req, res) => {
  await db.delete(addonsTable).where(eq(addonsTable.id, Number(req.params.id)));
  await logAction(req, "DELETE", "addon", Number(req.params.id));
  res.json({ message: "Addon deleted" });
});

export default addonsRouter;
