import { Router } from "express";
import { db, productsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
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
  const { category, isActive } = req.query;
  let products = await db.select().from(productsTable).orderBy(productsTable.name);
  if (category) products = products.filter(p => p.category === category);
  if (isActive !== undefined) products = products.filter(p => p.isActive === (isActive === "true"));
  res.json(products.map(formatProduct));
});

productsRouter.post("/products", requireAuth, requireAdmin, async (req, res) => {
  const { name, category, unit, basePrice, description, pixelPitch, resolution, brightness, application, isActive } = req.body;
  if (!name || !category || !basePrice) { res.status(400).json({ error: "Name, category, basePrice required" }); return; }
  const [product] = await db.insert(productsTable).values({
    name, category, unit: unit ?? "sqft", basePrice: String(basePrice),
    description, pixelPitch, resolution, brightness, application,
    isActive: isActive !== false,
  }).returning();
  await logAction(req, "CREATE", "product", product.id, `Created product ${name}`);
  res.status(201).json(formatProduct(product));
});

productsRouter.get("/products/:id", requireAuth, async (req, res) => {
  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, Number(req.params.id)));
  if (!product) { res.status(404).json({ error: "Product not found" }); return; }
  res.json(formatProduct(product));
});

productsRouter.patch("/products/:id", requireAuth, requireAdmin, async (req, res) => {
  const { name, category, unit, basePrice, description, pixelPitch, resolution, brightness, application, isActive } = req.body;
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (category !== undefined) updates.category = category;
  if (unit !== undefined) updates.unit = unit;
  if (basePrice !== undefined) updates.basePrice = String(basePrice);
  if (description !== undefined) updates.description = description;
  if (pixelPitch !== undefined) updates.pixelPitch = pixelPitch;
  if (resolution !== undefined) updates.resolution = resolution;
  if (brightness !== undefined) updates.brightness = brightness;
  if (application !== undefined) updates.application = application;
  if (isActive !== undefined) updates.isActive = isActive;
  const [product] = await db.update(productsTable).set(updates).where(eq(productsTable.id, Number(req.params.id))).returning();
  if (!product) { res.status(404).json({ error: "Product not found" }); return; }
  await logAction(req, "UPDATE", "product", product.id);
  res.json(formatProduct(product));
});

productsRouter.delete("/products/:id", requireAuth, requireAdmin, async (req, res) => {
  await db.delete(productsTable).where(eq(productsTable.id, Number(req.params.id)));
  await logAction(req, "DELETE", "product", Number(req.params.id));
  res.json({ message: "Product deleted" });
});

export default productsRouter;
