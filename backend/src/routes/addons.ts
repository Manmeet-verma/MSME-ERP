import { Router } from "express";
import { getDb } from "../lib/firebase";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { logAction } from "../lib/auditLog";

const addonsRouter = Router();
const db = () => getDb();

interface AddonDoc {
  organizationId: string;
  name: string;
  description?: string | null;
  price: string;
  priceType: string;
  category: string;
  isActive: boolean;
  createdAt: string;
}

function formatAddon(id: string, a: AddonDoc) {
  return {
    id,
    name: a.name,
    description: a.description ?? null,
    price: Number(a.price),
    priceType: a.priceType,
    category: a.category,
    isActive: a.isActive,
  };
}

addonsRouter.get("/addons", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const snap = await db().collection("addons").where("organizationId", "==", orgId).get();
  const addons = snap.docs.map((d) => ({ id: d.id, ...(d.data() as AddonDoc) }));
  addons.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  res.json(addons.map((a) => formatAddon(a.id, a)));
});

addonsRouter.post("/addons", requireAuth, requireAdmin, async (req, res) => {
  const { name, description, price, priceType, category, isActive } = req.body ?? {};
  if (!name || price === undefined || !priceType || !category) {
    res.status(400).json({ error: "Required fields missing" });
    return;
  }
  const newAddon: AddonDoc = {
    organizationId: req.user!.organizationId,
    name,
    description: description ?? null,
    price: String(price),
    priceType,
    category,
    isActive: isActive !== false,
    createdAt: new Date().toISOString(),
  };
  const ref = await db().collection("addons").add(newAddon);
  await logAction(req, "CREATE", "addon", ref.id, `Created addon ${name}`);
  res.status(201).json(formatAddon(ref.id, newAddon));
});

addonsRouter.patch("/addons/:id", requireAuth, requireAdmin, async (req, res) => {
  const orgId = req.user!.organizationId;
  const updates: Record<string, unknown> = {};
  const fields = ["name", "description", "priceType", "category", "isActive"] as const;
  for (const f of fields) if (req.body?.[f] !== undefined) updates[f] = req.body[f];
  if (req.body?.price !== undefined) updates.price = String(req.body.price);
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }
  const docRef = db().collection("addons").doc(req.params.id);
  const doc = await docRef.get();
  if (!doc.exists || (doc.data() as AddonDoc).organizationId !== orgId) {
    res.status(404).json({ error: "Addon not found" });
    return;
  }
  await docRef.update(updates);
  const updated = (await docRef.get()).data() as AddonDoc;
  await logAction(req, "UPDATE", "addon", req.params.id);
  res.json(formatAddon(req.params.id, updated));
});

addonsRouter.delete("/addons/:id", requireAuth, requireAdmin, async (req, res) => {
  const orgId = req.user!.organizationId;
  const docRef = db().collection("addons").doc(req.params.id);
  const doc = await docRef.get();
  if (!doc.exists || (doc.data() as AddonDoc).organizationId !== orgId) {
    res.status(404).json({ error: "Addon not found" });
    return;
  }
  await docRef.delete();
  await logAction(req, "DELETE", "addon", req.params.id);
  res.json({ message: "Addon deleted" });
});

export default addonsRouter;
