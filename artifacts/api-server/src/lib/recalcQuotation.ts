import { db, quotationItemsTable, quotationAddonsTable, quotationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export async function recalcQuotation(quotationId: number): Promise<void> {
  const items = await db.select().from(quotationItemsTable).where(eq(quotationItemsTable.quotationId, quotationId));
  const addons = await db.select().from(quotationAddonsTable).where(eq(quotationAddonsTable.quotationId, quotationId));

  const itemsTotal = items.reduce((sum, item) => sum + Number(item.totalPrice), 0);
  const addonsTotal = addons.reduce((sum, a) => sum + Number(a.totalPrice), 0);
  const subtotal = itemsTotal + addonsTotal;

  const [quotation] = await db.select().from(quotationsTable).where(eq(quotationsTable.id, quotationId));
  if (!quotation) return;

  const discountPercent = Number(quotation.discountPercent);
  const taxPercent = Number(quotation.taxPercent);
  const discountAmount = subtotal * (discountPercent / 100);
  const taxAmount = (subtotal - discountAmount) * (taxPercent / 100);
  const total = subtotal - discountAmount + taxAmount;

  await db.update(quotationsTable)
    .set({
      subtotal: subtotal.toFixed(2),
      discountAmount: discountAmount.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      total: total.toFixed(2),
      updatedAt: new Date(),
    })
    .where(eq(quotationsTable.id, quotationId));
}
