import { Router } from "express";
import { db, quotationsTable, quotationItemsTable, quotationAddonsTable, clientsTable, usersTable, productsTable } from "@workspace/db";
import { eq, and, ilike, or, count, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { logAction } from "../lib/auditLog";
import { recalcQuotation } from "../lib/recalcQuotation";

const quotationsRouter = Router();

function genQuotationNumber(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `QT-${y}${m}-${rand}`;
}

function formatItem(item: typeof quotationItemsTable.$inferSelect, productName?: string | null) {
  return {
    id: item.id,
    quotationId: item.quotationId,
    productId: item.productId ?? null,
    productName: productName ?? null,
    description: item.description,
    widthFt: item.widthFt !== null ? Number(item.widthFt) : null,
    heightFt: item.heightFt !== null ? Number(item.heightFt) : null,
    areaSqFt: item.areaSqFt !== null ? Number(item.areaSqFt) : null,
    quantity: item.quantity,
    unitPrice: Number(item.unitPrice),
    totalPrice: Number(item.totalPrice),
    notes: item.notes ?? null,
  };
}

function formatAddon(a: typeof quotationAddonsTable.$inferSelect, addonName?: string | null) {
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

async function formatQuotation(q: typeof quotationsTable.$inferSelect) {
  const client = q.clientId ? (await db.select().from(clientsTable).where(eq(clientsTable.id, q.clientId)))[0] : null;
  const creator = q.createdById ? (await db.select().from(usersTable).where(eq(usersTable.id, q.createdById)))[0] : null;
  const [itemCount] = await db.select({ count: count() }).from(quotationItemsTable).where(eq(quotationItemsTable.quotationId, q.id));

  return {
    id: q.id,
    quotationNumber: q.quotationNumber,
    clientId: q.clientId ?? null,
    clientName: client?.name ?? null,
    clientCompany: client?.company ?? null,
    createdByName: creator?.username ?? null,
    status: q.status,
    validUntil: q.validUntil?.toISOString() ?? null,
    subtotal: Number(q.subtotal),
    discountAmount: Number(q.discountAmount),
    discountPercent: Number(q.discountPercent),
    taxAmount: Number(q.taxAmount),
    taxPercent: Number(q.taxPercent),
    total: Number(q.total),
    notes: q.notes ?? null,
    terms: q.terms ?? null,
    itemCount: Number(itemCount?.count ?? 0),
    createdAt: q.createdAt.toISOString(),
    updatedAt: q.updatedAt.toISOString(),
  };
}

quotationsRouter.get("/quotations", requireAuth, async (req, res) => {
  const { status, clientId, search } = req.query;
  let rows = await db.select().from(quotationsTable).orderBy(sql`${quotationsTable.createdAt} DESC`);
  if (status) rows = rows.filter(q => q.status === status);
  if (clientId) rows = rows.filter(q => q.clientId === Number(clientId));

  const result = await Promise.all(rows.map(q => formatQuotation(q)));

  if (search && typeof search === "string") {
    const s = search.toLowerCase();
    return res.json(result.filter(q =>
      q.quotationNumber.toLowerCase().includes(s) ||
      (q.clientName ?? "").toLowerCase().includes(s) ||
      (q.clientCompany ?? "").toLowerCase().includes(s)
    ));
  }
  res.json(result);
});

quotationsRouter.post("/quotations", requireAuth, async (req, res) => {
  const { clientId, validUntil, notes, terms, discountPercent, taxPercent } = req.body;
  const quotationNumber = genQuotationNumber();
  const [quotation] = await db.insert(quotationsTable).values({
    quotationNumber,
    clientId: clientId ?? null,
    createdById: req.user!.userId,
    validUntil: validUntil ? new Date(validUntil) : null,
    notes: notes ?? null,
    terms: terms ?? "Payment due within 30 days of invoice. Prices valid for 30 days.",
    discountPercent: String(discountPercent ?? 0),
    taxPercent: String(taxPercent ?? 18),
  }).returning();
  await logAction(req, "CREATE", "quotation", quotation.id, `Created quotation ${quotationNumber}`);
  res.status(201).json(await formatQuotation(quotation));
});

quotationsRouter.get("/quotations/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const [q] = await db.select().from(quotationsTable).where(eq(quotationsTable.id, id));
  if (!q) { res.status(404).json({ error: "Quotation not found" }); return; }

  const client = q.clientId ? (await db.select().from(clientsTable).where(eq(clientsTable.id, q.clientId)))[0] : null;
  const creator = q.createdById ? (await db.select().from(usersTable).where(eq(usersTable.id, q.createdById)))[0] : null;
  const items = await db.select().from(quotationItemsTable).where(eq(quotationItemsTable.quotationId, id));
  const addons = await db.select().from(quotationAddonsTable).where(eq(quotationAddonsTable.quotationId, id));

  const productIds = items.map(i => i.productId).filter(Boolean) as number[];
  const products = productIds.length > 0
    ? await db.select().from(productsTable).where(sql`${productsTable.id} = ANY(ARRAY[${sql.raw(productIds.join(","))}])`)
    : [];
  const productMap = new Map(products.map(p => [p.id, p.name]));

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
    createdByName: creator?.username ?? null,
    status: q.status,
    validUntil: q.validUntil?.toISOString() ?? null,
    subtotal: Number(q.subtotal),
    discountAmount: Number(q.discountAmount),
    discountPercent: Number(q.discountPercent),
    taxAmount: Number(q.taxAmount),
    taxPercent: Number(q.taxPercent),
    total: Number(q.total),
    notes: q.notes ?? null,
    terms: q.terms ?? null,
    items: items.map(i => formatItem(i, productMap.get(i.productId ?? -1) ?? null)),
    addons: addons.map(a => formatAddon(a)),
    createdAt: q.createdAt.toISOString(),
    updatedAt: q.updatedAt.toISOString(),
  });
});

quotationsRouter.patch("/quotations/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const { clientId, validUntil, notes, terms, discountPercent, taxPercent } = req.body;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (clientId !== undefined) updates.clientId = clientId;
  if (validUntil !== undefined) updates.validUntil = validUntil ? new Date(validUntil) : null;
  if (notes !== undefined) updates.notes = notes;
  if (terms !== undefined) updates.terms = terms;
  if (discountPercent !== undefined) updates.discountPercent = String(discountPercent);
  if (taxPercent !== undefined) updates.taxPercent = String(taxPercent);
  const [q] = await db.update(quotationsTable).set(updates).where(eq(quotationsTable.id, id)).returning();
  if (!q) { res.status(404).json({ error: "Quotation not found" }); return; }
  if (discountPercent !== undefined || taxPercent !== undefined) {
    await recalcQuotation(id);
  }
  await logAction(req, "UPDATE", "quotation", id);
  res.json(await formatQuotation(q));
});

quotationsRouter.delete("/quotations/:id", requireAuth, async (req, res) => {
  await db.delete(quotationsTable).where(eq(quotationsTable.id, Number(req.params.id)));
  await logAction(req, "DELETE", "quotation", Number(req.params.id));
  res.json({ message: "Quotation deleted" });
});

quotationsRouter.patch("/quotations/:id/status", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body;
  const valid = ["draft", "sent", "approved", "rejected", "expired"];
  if (!valid.includes(status)) { res.status(400).json({ error: "Invalid status" }); return; }
  const [q] = await db.update(quotationsTable).set({ status, updatedAt: new Date() }).where(eq(quotationsTable.id, id)).returning();
  if (!q) { res.status(404).json({ error: "Not found" }); return; }
  await logAction(req, "STATUS_CHANGE", "quotation", id, `Status changed to ${status}`);
  res.json(await formatQuotation(q));
});

quotationsRouter.post("/quotations/:id/duplicate", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const [original] = await db.select().from(quotationsTable).where(eq(quotationsTable.id, id));
  if (!original) { res.status(404).json({ error: "Not found" }); return; }
  const items = await db.select().from(quotationItemsTable).where(eq(quotationItemsTable.quotationId, id));
  const addons = await db.select().from(quotationAddonsTable).where(eq(quotationAddonsTable.quotationId, id));

  const quotationNumber = genQuotationNumber();
  const [newQ] = await db.insert(quotationsTable).values({
    quotationNumber,
    clientId: original.clientId,
    createdById: req.user!.userId,
    status: "draft",
    validUntil: null,
    notes: original.notes,
    terms: original.terms,
    discountPercent: original.discountPercent,
    taxPercent: original.taxPercent,
    subtotal: original.subtotal,
    discountAmount: original.discountAmount,
    taxAmount: original.taxAmount,
    total: original.total,
  }).returning();

  if (items.length > 0) {
    await db.insert(quotationItemsTable).values(items.map(i => ({
      quotationId: newQ.id,
      productId: i.productId,
      description: i.description,
      widthFt: i.widthFt,
      heightFt: i.heightFt,
      areaSqFt: i.areaSqFt,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      totalPrice: i.totalPrice,
      notes: i.notes,
    })));
  }
  if (addons.length > 0) {
    await db.insert(quotationAddonsTable).values(addons.map(a => ({
      quotationId: newQ.id,
      addonId: a.addonId,
      description: a.description,
      quantity: a.quantity,
      price: a.price,
      totalPrice: a.totalPrice,
    })));
  }
  await logAction(req, "DUPLICATE", "quotation", newQ.id, `Duplicated from ${original.quotationNumber}`);
  res.status(201).json(await formatQuotation(newQ));
});

// Items
quotationsRouter.post("/quotations/:id/items", requireAuth, async (req, res) => {
  const quotationId = Number(req.params.id);
  const { productId, description, widthFt, heightFt, quantity, unitPrice, notes } = req.body;
  if (!description || !quantity || !unitPrice) { res.status(400).json({ error: "Required fields missing" }); return; }

  let areaSqFt: string | null = null;
  let totalPrice: string;
  if (widthFt && heightFt) {
    const area = Number(widthFt) * Number(heightFt);
    areaSqFt = area.toFixed(2);
    totalPrice = (area * Number(quantity) * Number(unitPrice)).toFixed(2);
  } else {
    totalPrice = (Number(quantity) * Number(unitPrice)).toFixed(2);
  }

  const [item] = await db.insert(quotationItemsTable).values({
    quotationId,
    productId: productId ?? null,
    description,
    widthFt: widthFt ? String(widthFt) : null,
    heightFt: heightFt ? String(heightFt) : null,
    areaSqFt,
    quantity: Number(quantity),
    unitPrice: String(unitPrice),
    totalPrice,
    notes: notes ?? null,
  }).returning();

  await recalcQuotation(quotationId);
  await logAction(req, "ADD_ITEM", "quotation", quotationId);

  let productName: string | null = null;
  if (item.productId) {
    const [p] = await db.select().from(productsTable).where(eq(productsTable.id, item.productId));
    productName = p?.name ?? null;
  }
  res.status(201).json(formatItem(item, productName));
});

quotationsRouter.patch("/quotations/:id/items/:itemId", requireAuth, async (req, res) => {
  const quotationId = Number(req.params.id);
  const itemId = Number(req.params.itemId);
  const { productId, description, widthFt, heightFt, quantity, unitPrice, notes } = req.body;
  const updates: Record<string, unknown> = {};
  if (productId !== undefined) updates.productId = productId;
  if (description !== undefined) updates.description = description;
  if (notes !== undefined) updates.notes = notes;

  const [current] = await db.select().from(quotationItemsTable).where(eq(quotationItemsTable.id, itemId));
  if (!current) { res.status(404).json({ error: "Item not found" }); return; }

  const newWidth = widthFt !== undefined ? Number(widthFt) : Number(current.widthFt ?? 0);
  const newHeight = heightFt !== undefined ? Number(heightFt) : Number(current.heightFt ?? 0);
  const newQty = quantity !== undefined ? Number(quantity) : current.quantity;
  const newPrice = unitPrice !== undefined ? Number(unitPrice) : Number(current.unitPrice);

  if (widthFt !== undefined) updates.widthFt = String(widthFt);
  if (heightFt !== undefined) updates.heightFt = String(heightFt);
  if (quantity !== undefined) updates.quantity = newQty;
  if (unitPrice !== undefined) updates.unitPrice = String(newPrice);

  const hasArea = (widthFt !== undefined || current.widthFt) && (heightFt !== undefined || current.heightFt);
  if (hasArea && (newWidth > 0) && (newHeight > 0)) {
    const area = newWidth * newHeight;
    updates.areaSqFt = area.toFixed(2);
    updates.totalPrice = (area * newQty * newPrice).toFixed(2);
  } else {
    updates.areaSqFt = null;
    updates.totalPrice = (newQty * newPrice).toFixed(2);
  }

  const [item] = await db.update(quotationItemsTable).set(updates).where(eq(quotationItemsTable.id, itemId)).returning();
  await recalcQuotation(quotationId);

  let productName: string | null = null;
  if (item.productId) {
    const [p] = await db.select().from(productsTable).where(eq(productsTable.id, item.productId));
    productName = p?.name ?? null;
  }
  res.json(formatItem(item, productName));
});

quotationsRouter.delete("/quotations/:id/items/:itemId", requireAuth, async (req, res) => {
  const quotationId = Number(req.params.id);
  await db.delete(quotationItemsTable).where(eq(quotationItemsTable.id, Number(req.params.itemId)));
  await recalcQuotation(quotationId);
  res.json({ message: "Item deleted" });
});

// Addons
quotationsRouter.post("/quotations/:id/addons", requireAuth, async (req, res) => {
  const quotationId = Number(req.params.id);
  const { addonId, description, quantity, price } = req.body;
  if (!description || !quantity || price === undefined) { res.status(400).json({ error: "Required fields missing" }); return; }
  const totalPrice = (Number(quantity) * Number(price)).toFixed(2);
  const [addon] = await db.insert(quotationAddonsTable).values({
    quotationId,
    addonId: addonId ?? null,
    description,
    quantity: Number(quantity),
    price: String(price),
    totalPrice,
  }).returning();
  await recalcQuotation(quotationId);
  res.status(201).json(formatAddon(addon));
});

quotationsRouter.delete("/quotations/:id/addons/:addonId", requireAuth, async (req, res) => {
  const quotationId = Number(req.params.id);
  await db.delete(quotationAddonsTable).where(eq(quotationAddonsTable.id, Number(req.params.addonId)));
  await recalcQuotation(quotationId);
  res.json({ message: "Addon removed" });
});

export default quotationsRouter;
