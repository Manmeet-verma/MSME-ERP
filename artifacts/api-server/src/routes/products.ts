import { Router } from "express";
import { getDb } from "../lib/firebase";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { logAction } from "../lib/auditLog";

const productsRouter = Router();
const db = () => getDb();

interface ProductDoc {
  organizationId: string;
  name: string;
  category: string;
  description?: string | null;
  unit: string;
  basePrice: string;
  pixelPitch?: string | null;
  resolution?: string | null;
  brightness?: string | null;
  application?: string | null;
  isActive: boolean;
  createdAt: string;
}

function formatProduct(id: string, p: ProductDoc) {
  return {
    id,
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
    createdAt: p.createdAt,
  };
}

productsRouter.get("/products", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const { category, isActive } = req.query;
  let snap = await db().collection("products").where("organizationId", "==", orgId).get();
  let products = snap.docs.map((d) => ({ id: d.id, ...(d.data() as ProductDoc) }));
  if (category) products = products.filter((p) => p.category === category);
  if (isActive !== undefined) products = products.filter((p) => p.isActive === (isActive === "true"));
  res.json(products.map((p) => formatProduct(p.id, p)));
});

productsRouter.post("/products", requireAuth, requireAdmin, async (req, res) => {
  const { name, category, unit, basePrice, description, pixelPitch, resolution, brightness, application, isActive } =
    req.body ?? {};
  if (!name || !category || basePrice === undefined) {
    res.status(400).json({ error: "name, category, basePrice required" });
    return;
  }
  const newProduct: ProductDoc = {
    organizationId: req.user!.organizationId,
    name,
    category,
    unit: unit ?? "sqft",
    basePrice: String(basePrice),
    description: description ?? null,
    pixelPitch: pixelPitch ?? null,
    resolution: resolution ?? null,
    brightness: brightness ?? null,
    application: application ?? null,
    isActive: isActive !== false,
    createdAt: new Date().toISOString(),
  };
  const ref = await db().collection("products").add(newProduct);
  await logAction(req, "CREATE", "product", ref.id, `Created product ${name}`);
  res.status(201).json(formatProduct(ref.id, newProduct));
});

productsRouter.get("/products/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const doc = await db().collection("products").doc(req.params.id).get();
  if (!doc.exists) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  const data = doc.data() as ProductDoc;
  if (data.organizationId !== orgId) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(formatProduct(doc.id, data));
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
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }
  const docRef = db().collection("products").doc(req.params.id);
  const doc = await docRef.get();
  if (!doc.exists || (doc.data() as ProductDoc).organizationId !== orgId) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  await docRef.update(updates);
  const updated = (await docRef.get()).data() as ProductDoc;
  await logAction(req, "UPDATE", "product", req.params.id);
  res.json(formatProduct(req.params.id, updated));
});

productsRouter.delete("/products/:id", requireAuth, requireAdmin, async (req, res) => {
  const orgId = req.user!.organizationId;
  const docRef = db().collection("products").doc(req.params.id);
  const doc = await docRef.get();
  if (!doc.exists || (doc.data() as ProductDoc).organizationId !== orgId) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  await docRef.delete();
  await logAction(req, "DELETE", "product", req.params.id);
  res.json({ message: "Product deleted" });
});

export default productsRouter;
