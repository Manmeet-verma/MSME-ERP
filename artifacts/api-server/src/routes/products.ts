import { Router } from "express";
import { db, productsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { logAction } from "../lib/auditLog";

const productsRouter = Router();

function formatProduct(p: typeof productsTable.$inferSelect) {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    description: p.description ?? null,
    unit: p.unit,
    basePrice: Number(p.basePrice),
    pixelPitch: p.pixelPitch ?? null,
    resolution: p.resolution ?? null,
    brightness: p.brightness ?? null,
    application: p.application ?? null,
    isActive: p.isActive,
    createdAt: p.createdAt.toISOString(),
  };
}

productsRouter.get("/products", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const { category, isActive } = req.query;
  let products = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.organizationId, orgId))
    .orderBy(productsTable.name);
  if (category) products = products.filter((p) => p.category === category);
  if (isActive !== undefined) products = products.filter((p) => p.isActive === (isActive === "true"));
  res.json(products.map(formatProduct));
});

productsRouter.post("/products", requireAuth, requireAdmin, async (req, res) => {
  const { name, category, unit, basePrice, description, pixelPitch, resolution, brightness, application, isActive } =
    req.body ?? {};
  if (!name || !category || basePrice === undefined) {
    res.status(400).json({ error: "name, category, basePrice required" });
    return;
  }
  const [p] = await db
    .insert(productsTable)
    .values({
      organizationId: req.user!.organizationId,
      name,
      category,
      unit: unit ?? "sqft",
      basePrice: String(basePrice),
      description,
      pixelPitch,
      resolution,
      brightness,
      application,
      isActive: isActive !== false,
    })
    .returning();
  await logAction(req, "CREATE", "product", p.id, `Created product ${name}`);
  res.status(201).json(formatProduct(p));
});

productsRouter.get("/products/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const [p] = await db
    .select()
    .from(productsTable)
    .where(and(eq(productsTable.id, Number(req.params.id)), eq(productsTable.organizationId, orgId)));
  if (!p) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(formatProduct(p));
});

productsRouter.patch("/products/:id", requireAuth, requireAdmin, async (req, res) => {
  const orgId = req.user!.organizationId;
  const updates: Record<string, unknown> = {};
  const fields = [
    "name",
    "category",
    "unit",
    "description",
    "pixelPitch",
    "resolution",
    "brightness",
    "application",
    "isActive",
  ] as const;
  for (const f of fields) if (req.body?.[f] !== undefined) updates[f] = req.body[f];
  if (req.body?.basePrice !== undefined) updates.basePrice = String(req.body.basePrice);
  const [p] = await db
    .update(productsTable)
    .set(updates)
    .where(and(eq(productsTable.id, Number(req.params.id)), eq(productsTable.organizationId, orgId)))
    .returning();
  if (!p) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  await logAction(req, "UPDATE", "product", p.id);
  res.json(formatProduct(p));
});

productsRouter.delete("/products/:id", requireAuth, requireAdmin, async (req, res) => {
  const orgId = req.user!.organizationId;
  await db
    .delete(productsTable)
    .where(and(eq(productsTable.id, Number(req.params.id)), eq(productsTable.organizationId, orgId)));
  await logAction(req, "DELETE", "product", Number(req.params.id));
  res.json({ message: "Product deleted" });
});

export default productsRouter;
