import { Router } from "express";
import {
  db,
  quotationsTable,
  quotationItemsTable,
  quotationAddonsTable,
  clientsTable,
  usersTable,
  productsTable,
  addonsTable,
  itemsTable,
} from "@workspace/db";
import { eq, and, sql, count } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";
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

function formatItem(item: typeof quotationItemsTable.$inferSelect, productName?: string | null, itemName?: string | null) {
  return {
    id: item.id,
    quotationId: item.quotationId,
    productId: item.productId ?? null,
    productName: productName ?? null,
    itemId: item.itemId ?? null,
    itemName: itemName ?? null,
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
  const client = q.clientId
    ? (await db.select().from(clientsTable).where(eq(clientsTable.id, q.clientId)))[0]
    : null;
  const creator = q.createdById
    ? (await db.select().from(usersTable).where(eq(usersTable.id, q.createdById)))[0]
    : null;
  const [itemCount] = await db
    .select({ count: count() })
    .from(quotationItemsTable)
    .where(eq(quotationItemsTable.quotationId, q.id));

  return {
    id: q.id,
    quotationNumber: q.quotationNumber,
    clientId: q.clientId ?? null,
    clientName: client?.name ?? null,
    clientCompany: client?.company ?? null,
    createdByName: creator?.name ?? null,
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

/** Ensures the quotation belongs to the user's org; returns it or null. */
async function loadOrgQuotation(orgId: number, id: number) {
  const [q] = await db
    .select()
    .from(quotationsTable)
    .where(and(eq(quotationsTable.id, id), eq(quotationsTable.organizationId, orgId)));
  return q ?? null;
}

quotationsRouter.get("/quotations", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const { status, clientId, search } = req.query;
  let rows = await db
    .select()
    .from(quotationsTable)
    .where(eq(quotationsTable.organizationId, orgId))
    .orderBy(sql`${quotationsTable.createdAt} DESC`);
  if (status) rows = rows.filter((q) => q.status === status);
  if (clientId) rows = rows.filter((q) => q.clientId === Number(clientId));

  const result = await Promise.all(rows.map((q) => formatQuotation(q)));

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
  const orgId = req.user!.organizationId;
  const { clientId, validUntil, notes, terms, discountPercent, taxPercent } = req.body ?? {};
  // Verify client belongs to org
  if (clientId) {
    const [c] = await db
      .select()
      .from(clientsTable)
      .where(and(eq(clientsTable.id, Number(clientId)), eq(clientsTable.organizationId, orgId)));
    if (!c) {
      res.status(400).json({ error: "Invalid client" });
      return;
    }
  }
  const quotationNumber = genQuotationNumber();
  const [q] = await db
    .insert(quotationsTable)
    .values({
      organizationId: orgId,
      quotationNumber,
      clientId: clientId ?? null,
      createdById: req.user!.userId,
      validUntil: validUntil ? new Date(validUntil) : null,
      notes: notes ?? null,
      terms: terms ?? "Payment due within 30 days of invoice. Prices valid for 30 days.",
      discountPercent: String(discountPercent ?? 0),
      taxPercent: String(taxPercent ?? 18),
    })
    .returning();
  await logAction(req, "CREATE", "quotation", q.id, `Created quotation ${quotationNumber}`);
  res.status(201).json(await formatQuotation(q));
});

quotationsRouter.get("/quotations/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = Number(req.params.id);
  const q = await loadOrgQuotation(orgId, id);
  if (!q) {
    res.status(404).json({ error: "Quotation not found" });
    return;
  }
  const client = q.clientId
    ? (await db.select().from(clientsTable).where(eq(clientsTable.id, q.clientId)))[0]
    : null;
  const creator = q.createdById
    ? (await db.select().from(usersTable).where(eq(usersTable.id, q.createdById)))[0]
    : null;
  const items = await db.select().from(quotationItemsTable).where(eq(quotationItemsTable.quotationId, id));
  const addons = await db.select().from(quotationAddonsTable).where(eq(quotationAddonsTable.quotationId, id));
  const productIds = items.map((i) => i.productId).filter(Boolean) as number[];
  const products =
    productIds.length > 0
      ? await db
          .select()
          .from(productsTable)
          .where(sql`${productsTable.id} = ANY(ARRAY[${sql.raw(productIds.join(","))}])`)
      : [];
  const productMap = new Map(products.map((p) => [p.id, p.name]));
  const itemIds = items.map((i) => i.itemId).filter(Boolean) as number[];
  const linkedItems =
    itemIds.length > 0
      ? await db
          .select()
          .from(itemsTable)
          .where(sql`${itemsTable.id} = ANY(ARRAY[${sql.raw(itemIds.join(","))}])`)
      : [];
  const itemMap = new Map(linkedItems.map((it) => [it.id, it.name]));
  const addonIds = addons.map((a) => a.addonId).filter(Boolean) as number[];
  const addonRows =
    addonIds.length > 0
      ? await db
          .select()
          .from(addonsTable)
          .where(sql`${addonsTable.id} = ANY(ARRAY[${sql.raw(addonIds.join(","))}])`)
      : [];
  const addonMap = new Map(addonRows.map((a) => [a.id, a.name]));
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
    validUntil: q.validUntil?.toISOString() ?? null,
    subtotal: Number(q.subtotal),
    discountAmount: Number(q.discountAmount),
    discountPercent: Number(q.discountPercent),
    taxAmount: Number(q.taxAmount),
    taxPercent: Number(q.taxPercent),
    total: Number(q.total),
    notes: q.notes ?? null,
    terms: q.terms ?? null,
    items: items.map((i) => formatItem(i, productMap.get(i.productId ?? -1) ?? null, itemMap.get(i.itemId ?? -1) ?? null)),
    quotationAddons: addons.map((a) => formatAddon(a, addonMap.get(a.addonId ?? -1) ?? null)),
    createdAt: q.createdAt.toISOString(),
    updatedAt: q.updatedAt.toISOString(),
  });
});

quotationsRouter.patch("/quotations/:id", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = Number(req.params.id);
  const existing = await loadOrgQuotation(orgId, id);
  if (!existing) {
    res.status(404).json({ error: "Quotation not found" });
    return;
  }
  const { clientId, validUntil, notes, terms, discountPercent, taxPercent } = req.body ?? {};
  if (clientId !== undefined && clientId !== null) {
    const [c] = await db
      .select()
      .from(clientsTable)
      .where(and(eq(clientsTable.id, Number(clientId)), eq(clientsTable.organizationId, orgId)));
    if (!c) {
      res.status(400).json({ error: "Invalid client" });
      return;
    }
  }
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (clientId !== undefined) updates.clientId = clientId;
  if (validUntil !== undefined) updates.validUntil = validUntil ? new Date(validUntil) : null;
  if (notes !== undefined) updates.notes = notes;
  if (terms !== undefined) updates.terms = terms;
  if (discountPercent !== undefined) updates.discountPercent = String(discountPercent);
  if (taxPercent !== undefined) updates.taxPercent = String(taxPercent);
  const [q] = await db.update(quotationsTable).set(updates).where(eq(quotationsTable.id, id)).returning();
  if (discountPercent !== undefined || taxPercent !== undefined) {
    await recalcQuotation(id);
  }
  await logAction(req, "UPDATE", "quotation", id);
  res.json(await formatQuotation(q));
});

quotationsRouter.delete("/quotations/:id", requireAuth, requireAdmin, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = Number(req.params.id);
  const existing = await loadOrgQuotation(orgId, id);
  if (!existing) {
    res.status(404).json({ error: "Quotation not found" });
    return;
  }
  await db.delete(quotationsTable).where(eq(quotationsTable.id, id));
  await logAction(req, "DELETE", "quotation", id);
  res.json({ message: "Quotation deleted" });
});

quotationsRouter.patch("/quotations/:id/status", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = Number(req.params.id);
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
  const [q] = await db
    .update(quotationsTable)
    .set({ status, updatedAt: new Date() })
    .where(eq(quotationsTable.id, id))
    .returning();
  await logAction(req, "STATUS_CHANGE", "quotation", id, `Status changed to ${status}`);
  res.json(await formatQuotation(q));
});

quotationsRouter.post("/quotations/:id/duplicate", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const id = Number(req.params.id);
  const original = await loadOrgQuotation(orgId, id);
  if (!original) {
    res.status(404).json({ error: "Quotation not found" });
    return;
  }
  const items = await db.select().from(quotationItemsTable).where(eq(quotationItemsTable.quotationId, id));
  const addons = await db.select().from(quotationAddonsTable).where(eq(quotationAddonsTable.quotationId, id));
  const quotationNumber = genQuotationNumber();
  const [newQ] = await db
    .insert(quotationsTable)
    .values({
      organizationId: orgId,
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
    })
    .returning();
  if (items.length > 0) {
    await db.insert(quotationItemsTable).values(
      items.map((i) => ({
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
      })),
    );
  }
  if (addons.length > 0) {
    await db.insert(quotationAddonsTable).values(
      addons.map((a) => ({
        quotationId: newQ.id,
        addonId: a.addonId,
        description: a.description,
        quantity: a.quantity,
        price: a.price,
        totalPrice: a.totalPrice,
      })),
    );
  }
  await logAction(req, "DUPLICATE", "quotation", newQ.id, `Duplicated from ${original.quotationNumber}`);
  res.status(201).json(await formatQuotation(newQ));
});

// Items
quotationsRouter.post("/quotations/:id/items", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const quotationId = Number(req.params.id);
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
    const [p] = await db
      .select()
      .from(productsTable)
      .where(and(eq(productsTable.id, Number(productId)), eq(productsTable.organizationId, orgId)));
    if (!p) {
      res.status(400).json({ error: "Invalid product" });
      return;
    }
  }
  if (itemId) {
    const [it] = await db
      .select()
      .from(itemsTable)
      .where(and(eq(itemsTable.id, Number(itemId)), eq(itemsTable.organizationId, orgId)));
    if (!it) {
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
  const [item] = await db
    .insert(quotationItemsTable)
    .values({
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
    })
    .returning();
  await recalcQuotation(quotationId);
  await logAction(req, "ADD_ITEM", "quotation", quotationId);
  let productName: string | null = null;
  if (item.productId) {
    const [p] = await db.select().from(productsTable).where(eq(productsTable.id, item.productId));
    productName = p?.name ?? null;
  }
  let itemName: string | null = null;
  if (item.itemId) {
    const [it] = await db.select().from(itemsTable).where(eq(itemsTable.id, item.itemId));
    itemName = it?.name ?? null;
  }
  res.status(201).json(formatItem(item, productName, itemName));
});

quotationsRouter.patch("/quotations/:id/items/:itemId", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const quotationId = Number(req.params.id);
  const itemId = Number(req.params.itemId);
  const parent = await loadOrgQuotation(orgId, quotationId);
  if (!parent) {
    res.status(404).json({ error: "Quotation not found" });
    return;
  }
  const [current] = await db.select().from(quotationItemsTable).where(eq(quotationItemsTable.id, itemId));
  if (!current || current.quotationId !== quotationId) {
    res.status(404).json({ error: "Item not found" });
    return;
  }
  const { productId, itemId: linkedItemId, description, widthFt, heightFt, quantity, unitPrice, notes } = req.body ?? {};
  if (productId) {
    const [p] = await db
      .select()
      .from(productsTable)
      .where(and(eq(productsTable.id, Number(productId)), eq(productsTable.organizationId, orgId)));
    if (!p) {
      res.status(400).json({ error: "Invalid product" });
      return;
    }
  }
  if (linkedItemId) {
    const [it] = await db
      .select()
      .from(itemsTable)
      .where(and(eq(itemsTable.id, Number(linkedItemId)), eq(itemsTable.organizationId, orgId)));
    if (!it) {
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
  const [item] = await db.update(quotationItemsTable).set(updates).where(eq(quotationItemsTable.id, itemId)).returning();
  await recalcQuotation(quotationId);
  let productName: string | null = null;
  if (item.productId) {
    const [p] = await db.select().from(productsTable).where(eq(productsTable.id, item.productId));
    productName = p?.name ?? null;
  }
  let itemName: string | null = null;
  if (item.itemId) {
    const [it] = await db.select().from(itemsTable).where(eq(itemsTable.id, item.itemId));
    itemName = it?.name ?? null;
  }
  res.json(formatItem(item, productName, itemName));
});

quotationsRouter.delete("/quotations/:id/items/:itemId", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const quotationId = Number(req.params.id);
  const itemId = Number(req.params.itemId);
  const parent = await loadOrgQuotation(orgId, quotationId);
  if (!parent) {
    res.status(404).json({ error: "Quotation not found" });
    return;
  }
  const deleted = await db
    .delete(quotationItemsTable)
    .where(and(eq(quotationItemsTable.id, itemId), eq(quotationItemsTable.quotationId, quotationId)))
    .returning({ id: quotationItemsTable.id });
  if (deleted.length === 0) {
    res.status(404).json({ error: "Item not found" });
    return;
  }
  await recalcQuotation(quotationId);
  res.json({ message: "Item deleted" });
});

// Addons
quotationsRouter.post("/quotations/:id/addons", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const quotationId = Number(req.params.id);
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
    const [a] = await db
      .select()
      .from(addonsTable)
      .where(and(eq(addonsTable.id, Number(addonId)), eq(addonsTable.organizationId, orgId)));
    if (!a) {
      res.status(400).json({ error: "Invalid add-on" });
      return;
    }
  }
  const totalPrice = (Number(quantity) * Number(price)).toFixed(2);
  const [addon] = await db
    .insert(quotationAddonsTable)
    .values({
      quotationId,
      addonId: addonId ?? null,
      description,
      quantity: Number(quantity),
      price: String(price),
      totalPrice,
    })
    .returning();
  await recalcQuotation(quotationId);
  res.status(201).json(formatAddon(addon));
});

quotationsRouter.delete("/quotations/:id/addons/:addonId", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const quotationId = Number(req.params.id);
  const parent = await loadOrgQuotation(orgId, quotationId);
  if (!parent) {
    res.status(404).json({ error: "Quotation not found" });
    return;
  }
  const deleted = await db
    .delete(quotationAddonsTable)
    .where(and(
      eq(quotationAddonsTable.id, Number(req.params.addonId)),
      eq(quotationAddonsTable.quotationId, quotationId),
    ))
    .returning({ id: quotationAddonsTable.id });
  if (deleted.length === 0) {
    res.status(404).json({ error: "Addon not found" });
    return;
  }
  await recalcQuotation(quotationId);
  res.json({ message: "Addon removed" });
});

export default quotationsRouter;
