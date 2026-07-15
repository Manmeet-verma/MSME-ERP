import { Router } from "express";
import { getDb } from "../lib/firebase";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { logAction } from "../lib/auditLog";
import { recalcQuotation } from "../lib/recalcQuotation";

const quotationsRouter = Router();

const db = () => getDb();

function genQuotationNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `QT-${y}${m}-${rand}`;
}

function formatItem(item: any, productName?: string | null, itemName?: string | null) {
  return {
    id: item.id,
    quotationId: item.quotationId,
    productId: item.productId ?? null,
    productName: productName ?? null,
    itemId: item.itemId ?? null,
    itemName: itemName ?? null,
    description: item.description,
    widthFt: item.widthFt !== null && item.widthFt !== undefined ? Number(item.widthFt) : null,
    heightFt: item.heightFt !== null && item.heightFt !== undefined ? Number(item.heightFt) : null,
    areaSqFt: item.areaSqFt !== null && item.areaSqFt !== undefined ? Number(item.areaSqFt) : null,
    quantity: item.quantity,
    unitPrice: Number(item.unitPrice),
    totalPrice: Number(item.totalPrice),
    notes: item.notes ?? null,
  };
}

function formatAddon(a: any, addonName?: string | null) {
  return {
    id: a.id,
    quotationId: a.quotationId,
    addonId: a.addonId ?? null,
    addonName: addonName ?? null,
    description: a.description,
    quantity: a.quantity,
    price: Number(a.price),
    totalPrice: Number(a.totalPrice),
  };
}

async function formatQuotation(q: any) {
  const clientSnap = q.clientId
    ? await db().collection("clients").doc(q.clientId).get()
    : null;
  const client = clientSnap?.exists ? clientSnap.data() : null;

  const creatorSnap = q.createdById
    ? await db().collection("users").doc(q.createdById).get()
    : null;
  const creator = creatorSnap?.exists ? creatorSnap.data() : null;

  const itemsSnap = await db()
    .collection("quotation_items")
    .where("quotationId", "==", q.id)
    .get();
  const itemCount = itemsSnap.size;

  return {
    id: q.id,
    quotationNumber: q.quotationNumber,
    clientId: q.clientId ?? null,
    clientName: client?.name ?? null,
    clientCompany: client?.company ?? null,
    createdByName: creator?.name ?? null,
    status: q.status,
    validUntil: q.validUntil ?? null,
    subtotal: Number(q.subtotal),
    discountAmount: Number(q.discountAmount),
    discountPercent: Number(q.discountPercent),
    taxAmount: Number(q.taxAmount),
    taxPercent: Number(q.taxPercent),
    total: Number(q.total),
    notes: q.notes ?? null,
    terms: q.terms ?? null,
    itemCount,
    createdAt: q.createdAt,
    updatedAt: q.updatedAt,
  };
}

async function loadOrgQuotation(orgId: string, id: string) {
  const snap = await db().collection("quotations").doc(id).get();
  if (!snap.exists) return null;
  const data = snap.data()!;
  if (data.organizationId !== orgId) return null;
  return { id: snap.id, ...data };
}

quotationsRouter.get("/quotations", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId as string;
  const { status, clientId, search } = req.query;
  const snap = await db()
    .collection("quotations")
    .where("organizationId", "==", orgId)
    .get();
  let rows = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  if (status) rows = rows.filter((q: any) => q.status === status);
  if (clientId) rows = rows.filter((q: any) => q.clientId === String(clientId));

  const result = await Promise.all(rows.map((q: any) => formatQuotation(q)));

  if (search && typeof search === "string") {
    const s = search.toLowerCase();
    res.json(
      result.filter(
        (q) =>
          q.quotationNumber.toLowerCase().includes(s) ||
          (q.clientName ?? "").toLowerCase().includes(s) ||
          (q.clientCompany ?? "").toLowerCase().includes(s),
      ),
    );
    return;
  }
  res.json(result);
});

quotationsRouter.post("/quotations", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId as string;
  const userId = req.user!.userId as string;
  const { clientId, validUntil, notes, terms, discountPercent, taxPercent } = req.body ?? {};
  if (clientId) {
    const cSnap = await db().collection("clients").doc(String(clientId)).get();
    if (!cSnap.exists || cSnap.data()!.organizationId !== orgId) {
      res.status(400).json({ error: "Invalid client" });
      return;
    }
  }
  const quotationNumber = genQuotationNumber();
  const now = new Date().toISOString();
  const docRef = await db().collection("quotations").add({
    organizationId: orgId,
    quotationNumber,
    clientId: clientId ?? null,
    createdById: userId,
    status: "draft",
    validUntil: validUntil ?? null,
    notes: notes ?? null,
    terms: terms ?? "Payment due within 30 days of invoice. Prices valid for 30 days.",
    discountPercent: String(discountPercent ?? 0),
    discountAmount: "0",
    taxPercent: String(taxPercent ?? 18),
    taxAmount: "0",
    subtotal: "0",
    total: "0",
    createdAt: now,
    updatedAt: now,
  });
  const qSnap = await docRef.get();
  const q = { id: qSnap.id, ...qSnap.data()! };
  await logAction(req, "CREATE", "quotation", q.id, `Created quotation ${quotationNumber}`);
  res.status(201).json(await formatQuotation(q));
});

quotationsRouter.get("/quotations/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId as string;
  const id = req.params.id;
  const q = await loadOrgQuotation(orgId, id);
  if (!q) {
    res.status(404).json({ error: "Quotation not found" });
    return;
  }
  const clientSnap = q.clientId
    ? await db().collection("clients").doc(q.clientId).get()
    : null;
  const client = clientSnap?.exists ? clientSnap.data() : null;

  const creatorSnap = q.createdById
    ? await db().collection("users").doc(q.createdById).get()
    : null;
  const creator = creatorSnap?.exists ? creatorSnap.data() : null;

  const itemsSnap = await db()
    .collection("quotation_items")
    .where("quotationId", "==", id)
    .get();
  const items = itemsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  const addonsSnap = await db()
    .collection("quotation_addons")
    .where("quotationId", "==", id)
    .get();
  const addons = addonsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  const productIds = items.map((i: any) => i.productId).filter(Boolean) as string[];
  const productMap = new Map<string, string>();
  for (const pid of productIds) {
    const pSnap = await db().collection("products").doc(pid).get();
    if (pSnap.exists) productMap.set(pid, pSnap.data()!.name);
  }

  const linkedItemIds = items.map((i: any) => i.itemId).filter(Boolean) as string[];
  const itemMap = new Map<string, string>();
  for (const lid of linkedItemIds) {
    const itSnap = await db().collection("items").doc(lid).get();
    if (itSnap.exists) itemMap.set(lid, itSnap.data()!.name);
  }

  const addonIds = addons.map((a: any) => a.addonId).filter(Boolean) as string[];
  const addonMap = new Map<string, string>();
  for (const aid of addonIds) {
    const aSnap = await db().collection("addons").doc(aid).get();
    if (aSnap.exists) addonMap.set(aid, aSnap.data()!.name);
  }

  res.json({
    id: q.id,
    quotationNumber: q.quotationNumber,
    clientId: q.clientId ?? null,
    clientName: client?.name ?? null,
    clientCompany: client?.company ?? null,
    clientEmail: client?.email ?? null,
    clientPhone: client?.phone ?? null,
    clientAddress: client?.address ?? null,
    clientGstNumber: client?.gstNumber ?? null,
    createdByName: creator?.name ?? null,
    status: q.status,
    validUntil: q.validUntil ?? null,
    subtotal: Number(q.subtotal),
    discountAmount: Number(q.discountAmount),
    discountPercent: Number(q.discountPercent),
    taxAmount: Number(q.taxAmount),
    taxPercent: Number(q.taxPercent),
    total: Number(q.total),
    notes: q.notes ?? null,
    terms: q.terms ?? null,
    items: items.map((i: any) =>
      formatItem(i, productMap.get(i.productId ?? "") ?? null, itemMap.get(i.itemId ?? "") ?? null),
    ),
    quotationAddons: addons.map((a: any) =>
      formatAddon(a, addonMap.get(a.addonId ?? "") ?? null),
    ),
    createdAt: q.createdAt,
    updatedAt: q.updatedAt,
  });
});

quotationsRouter.patch("/quotations/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId as string;
  const id = req.params.id;
  const existing = await loadOrgQuotation(orgId, id);
  if (!existing) {
    res.status(404).json({ error: "Quotation not found" });
    return;
  }
  const { clientId, validUntil, notes, terms, discountPercent, taxPercent } = req.body ?? {};
  if (clientId !== undefined && clientId !== null) {
    const cSnap = await db().collection("clients").doc(String(clientId)).get();
    if (!cSnap.exists || cSnap.data()!.organizationId !== orgId) {
      res.status(400).json({ error: "Invalid client" });
      return;
    }
  }
  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (clientId !== undefined) updates.clientId = clientId;
  if (validUntil !== undefined) updates.validUntil = validUntil ?? null;
  if (notes !== undefined) updates.notes = notes;
  if (terms !== undefined) updates.terms = terms;
  if (discountPercent !== undefined) updates.discountPercent = String(discountPercent);
  if (taxPercent !== undefined) updates.taxPercent = String(taxPercent);
  await db().collection("quotations").doc(id).update(updates);
  if (discountPercent !== undefined || taxPercent !== undefined) {
    await recalcQuotation(id);
  }
  const updatedSnap = await db().collection("quotations").doc(id).get();
  const q = { id: updatedSnap.id, ...updatedSnap.data()! };
  await logAction(req, "UPDATE", "quotation", id);
  res.json(await formatQuotation(q));
});

quotationsRouter.delete("/quotations/:id", requireAuth, requireAdmin, async (req, res) => {
  const orgId = req.user!.organizationId as string;
  const id = req.params.id;
  const existing = await loadOrgQuotation(orgId, id);
  if (!existing) {
    res.status(404).json({ error: "Quotation not found" });
    return;
  }
  await db().collection("quotations").doc(id).delete();
  await logAction(req, "DELETE", "quotation", id);
  res.json({ message: "Quotation deleted" });
});

quotationsRouter.patch("/quotations/:id/status", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId as string;
  const id = req.params.id;
  const { status } = req.body ?? {};
  if (!["draft", "sent", "approved", "rejected", "expired"].includes(status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }
  const existing = await loadOrgQuotation(orgId, id);
  if (!existing) {
    res.status(404).json({ error: "Quotation not found" });
    return;
  }
  await db()
    .collection("quotations")
    .doc(id)
    .update({ status, updatedAt: new Date().toISOString() });
  const updatedSnap = await db().collection("quotations").doc(id).get();
  const q = { id: updatedSnap.id, ...updatedSnap.data()! };
  await logAction(req, "STATUS_CHANGE", "quotation", id, `Status changed to ${status}`);
  res.json(await formatQuotation(q));
});

quotationsRouter.post("/quotations/:id/duplicate", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId as string;
  const userId = req.user!.userId as string;
  const id = req.params.id;
  const original = await loadOrgQuotation(orgId, id);
  if (!original) {
    res.status(404).json({ error: "Quotation not found" });
    return;
  }

  const itemsSnap = await db()
    .collection("quotation_items")
    .where("quotationId", "==", id)
    .get();
  const items = itemsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  const addonsSnap = await db()
    .collection("quotation_addons")
    .where("quotationId", "==", id)
    .get();
  const addons = addonsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  const quotationNumber = genQuotationNumber();
  const now = new Date().toISOString();
  const newDocRef = await db().collection("quotations").add({
    organizationId: orgId,
    quotationNumber,
    clientId: original.clientId ?? null,
    createdById: userId,
    status: "draft",
    validUntil: null,
    notes: original.notes ?? null,
    terms: original.terms ?? null,
    discountPercent: original.discountPercent,
    taxPercent: original.taxPercent,
    subtotal: original.subtotal,
    discountAmount: original.discountAmount,
    taxAmount: original.taxAmount,
    total: original.total,
    createdAt: now,
    updatedAt: now,
  });
  const newQId = newDocRef.id;

  for (const i of items) {
    await db().collection("quotation_items").add({
      quotationId: newQId,
      productId: i.productId ?? null,
      itemId: i.itemId ?? null,
      description: i.description,
      widthFt: i.widthFt ?? null,
      heightFt: i.heightFt ?? null,
      areaSqFt: i.areaSqFt ?? null,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      totalPrice: i.totalPrice,
      notes: i.notes ?? null,
    });
  }

  for (const a of addons) {
    await db().collection("quotation_addons").add({
      quotationId: newQId,
      addonId: a.addonId ?? null,
      description: a.description,
      quantity: a.quantity,
      price: a.price,
      totalPrice: a.totalPrice,
    });
  }

  const newSnap = await db().collection("quotations").doc(newQId).get();
  const newQ = { id: newSnap.id, ...newSnap.data()! };
  await logAction(req, "DUPLICATE", "quotation", newQ.id, `Duplicated from ${original.quotationNumber}`);
  res.status(201).json(await formatQuotation(newQ));
});

// Items
quotationsRouter.post("/quotations/:id/items", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId as string;
  const quotationId = req.params.id;
  const parent = await loadOrgQuotation(orgId, quotationId);
  if (!parent) {
    res.status(404).json({ error: "Quotation not found" });
    return;
  }
  const { productId, itemId, description, widthFt, heightFt, quantity, unitPrice, notes } = req.body ?? {};
  if (!description || !quantity || unitPrice === undefined) {
    res.status(400).json({ error: "Required fields missing" });
    return;
  }
  if (productId) {
    const pSnap = await db().collection("products").doc(String(productId)).get();
    if (!pSnap.exists || pSnap.data()!.organizationId !== orgId) {
      res.status(400).json({ error: "Invalid product" });
      return;
    }
  }
  if (itemId) {
    const itSnap = await db().collection("items").doc(String(itemId)).get();
    if (!itSnap.exists || itSnap.data()!.organizationId !== orgId) {
      res.status(400).json({ error: "Invalid inventory item" });
      return;
    }
  }
  let areaSqFt: string | null = null;
  let totalPrice: string;
  if (widthFt && heightFt) {
    const area = Number(widthFt) * Number(heightFt);
    areaSqFt = area.toFixed(2);
    totalPrice = (area * Number(quantity) * Number(unitPrice)).toFixed(2);
  } else {
    totalPrice = (Number(quantity) * Number(unitPrice)).toFixed(2);
  }
  const docRef = await db().collection("quotation_items").add({
    quotationId,
    productId: productId ?? null,
    itemId: itemId ?? null,
    description,
    widthFt: widthFt ? String(widthFt) : null,
    heightFt: heightFt ? String(heightFt) : null,
    areaSqFt,
    quantity: Number(quantity),
    unitPrice: String(unitPrice),
    totalPrice,
    notes: notes ?? null,
  });
  const itemSnap = await docRef.get();
  const item = { id: itemSnap.id, ...itemSnap.data()! };
  await recalcQuotation(quotationId);
  await logAction(req, "ADD_ITEM", "quotation", quotationId);
  let productName: string | null = null;
  if (item.productId) {
    const pSnap = await db().collection("products").doc(item.productId).get();
    productName = pSnap.exists ? pSnap.data()!.name : null;
  }
  let itemName: string | null = null;
  if (item.itemId) {
    const itSnap = await db().collection("items").doc(item.itemId).get();
    itemName = itSnap.exists ? itSnap.data()!.name : null;
  }
  res.status(201).json(formatItem(item, productName, itemName));
});

quotationsRouter.patch("/quotations/:id/items/:itemId", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId as string;
  const quotationId = req.params.id;
  const itemId = req.params.itemId;
  const parent = await loadOrgQuotation(orgId, quotationId);
  if (!parent) {
    res.status(404).json({ error: "Quotation not found" });
    return;
  }
  const itemSnap = await db().collection("quotation_items").doc(itemId).get();
  if (!itemSnap.exists || itemSnap.data()!.quotationId !== quotationId) {
    res.status(404).json({ error: "Item not found" });
    return;
  }
  const current = { id: itemSnap.id, ...itemSnap.data()! };
  const { productId, itemId: linkedItemId, description, widthFt, heightFt, quantity, unitPrice, notes } = req.body ?? {};
  if (productId) {
    const pSnap = await db().collection("products").doc(String(productId)).get();
    if (!pSnap.exists || pSnap.data()!.organizationId !== orgId) {
      res.status(400).json({ error: "Invalid product" });
      return;
    }
  }
  if (linkedItemId) {
    const itSnap = await db().collection("items").doc(String(linkedItemId)).get();
    if (!itSnap.exists || itSnap.data()!.organizationId !== orgId) {
      res.status(400).json({ error: "Invalid inventory item" });
      return;
    }
  }
  const updates: Record<string, unknown> = {};
  if (productId !== undefined) updates.productId = productId;
  if (linkedItemId !== undefined) updates.itemId = linkedItemId;
  if (description !== undefined) updates.description = description;
  if (notes !== undefined) updates.notes = notes;
  const newWidth = widthFt !== undefined ? Number(widthFt) : Number(current.widthFt ?? 0);
  const newHeight = heightFt !== undefined ? Number(heightFt) : Number(current.heightFt ?? 0);
  const newQty = quantity !== undefined ? Number(quantity) : current.quantity;
  const newPrice = unitPrice !== undefined ? Number(unitPrice) : Number(current.unitPrice);
  if (widthFt !== undefined) updates.widthFt = String(widthFt);
  if (heightFt !== undefined) updates.heightFt = String(heightFt);
  if (quantity !== undefined) updates.quantity = newQty;
  if (unitPrice !== undefined) updates.unitPrice = String(newPrice);
  const hasArea =
    (widthFt !== undefined || current.widthFt) && (heightFt !== undefined || current.heightFt);
  if (hasArea && newWidth > 0 && newHeight > 0) {
    const area = newWidth * newHeight;
    updates.areaSqFt = area.toFixed(2);
    updates.totalPrice = (area * newQty * newPrice).toFixed(2);
  } else {
    updates.areaSqFt = null;
    updates.totalPrice = (newQty * newPrice).toFixed(2);
  }
  await db().collection("quotation_items").doc(itemId).update(updates);
  const updatedItemSnap = await db().collection("quotation_items").doc(itemId).get();
  const item = { id: updatedItemSnap.id, ...updatedItemSnap.data()! };
  await recalcQuotation(quotationId);
  let productName: string | null = null;
  if (item.productId) {
    const pSnap = await db().collection("products").doc(item.productId).get();
    productName = pSnap.exists ? pSnap.data()!.name : null;
  }
  let itemName: string | null = null;
  if (item.itemId) {
    const itSnap = await db().collection("items").doc(item.itemId).get();
    itemName = itSnap.exists ? itSnap.data()!.name : null;
  }
  res.json(formatItem(item, productName, itemName));
});

quotationsRouter.delete("/quotations/:id/items/:itemId", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId as string;
  const quotationId = req.params.id;
  const itemId = req.params.itemId;
  const parent = await loadOrgQuotation(orgId, quotationId);
  if (!parent) {
    res.status(404).json({ error: "Quotation not found" });
    return;
  }
  const itemSnap = await db().collection("quotation_items").doc(itemId).get();
  if (!itemSnap.exists || itemSnap.data()!.quotationId !== quotationId) {
    res.status(404).json({ error: "Item not found" });
    return;
  }
  await db().collection("quotation_items").doc(itemId).delete();
  await recalcQuotation(quotationId);
  res.json({ message: "Item deleted" });
});

// Addons
quotationsRouter.post("/quotations/:id/addons", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId as string;
  const quotationId = req.params.id;
  const parent = await loadOrgQuotation(orgId, quotationId);
  if (!parent) {
    res.status(404).json({ error: "Quotation not found" });
    return;
  }
  const { addonId, description, quantity, price } = req.body ?? {};
  if (!description || !quantity || price === undefined) {
    res.status(400).json({ error: "Required fields missing" });
    return;
  }
  if (addonId) {
    const aSnap = await db().collection("addons").doc(String(addonId)).get();
    if (!aSnap.exists || aSnap.data()!.organizationId !== orgId) {
      res.status(400).json({ error: "Invalid add-on" });
      return;
    }
  }
  const totalPrice = (Number(quantity) * Number(price)).toFixed(2);
  const docRef = await db().collection("quotation_addons").add({
    quotationId,
    addonId: addonId ?? null,
    description,
    quantity: Number(quantity),
    price: String(price),
    totalPrice,
  });
  const addonSnap = await docRef.get();
  const addon = { id: addonSnap.id, ...addonSnap.data()! };
  await recalcQuotation(quotationId);
  res.status(201).json(formatAddon(addon));
});

quotationsRouter.delete("/quotations/:id/addons/:addonId", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId as string;
  const quotationId = req.params.id;
  const parent = await loadOrgQuotation(orgId, quotationId);
  if (!parent) {
    res.status(404).json({ error: "Quotation not found" });
    return;
  }
  const addonSnap = await db().collection("quotation_addons").doc(req.params.addonId).get();
  if (!addonSnap.exists || addonSnap.data()!.quotationId !== quotationId) {
    res.status(404).json({ error: "Addon not found" });
    return;
  }
  await db().collection("quotation_addons").doc(req.params.addonId).delete();
  await recalcQuotation(quotationId);
  res.json({ message: "Addon removed" });
});

export default quotationsRouter;
