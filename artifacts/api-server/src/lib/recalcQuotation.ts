import { getDb } from "./firebase";
import { FieldValue } from "firebase-admin/firestore";

const db = () => getDb();

export async function recalcQuotation(quotationId: string): Promise<void> {
  const itemsSnap = await db()
    .collection("quotationItems")
    .where("quotationId", "==", quotationId)
    .get();
  const addonsSnap = await db()
    .collection("quotationAddons")
    .where("quotationId", "==", quotationId)
    .get();

  const itemsTotal = itemsSnap.docs.reduce((sum: number, doc: FirebaseFirestore.QueryDocumentSnapshot) => sum + Number(doc.data().totalPrice), 0);
  const addonsTotal = addonsSnap.docs.reduce((sum: number, doc: FirebaseFirestore.QueryDocumentSnapshot) => sum + Number(doc.data().totalPrice), 0);
  const subtotal = itemsTotal + addonsTotal;

  const quotSnap = await db()
    .collection("quotations")
    .doc(quotationId)
    .get();
  if (!quotSnap.exists) return;
  const quotation = quotSnap.data()!;

  const discountPercent = Number(quotation.discountPercent);
  const taxPercent = Number(quotation.taxPercent);
  const discountAmount = subtotal * (discountPercent / 100);
  const taxAmount = (subtotal - discountAmount) * (taxPercent / 100);
  const total = subtotal - discountAmount + taxAmount;

  await db().collection("quotations").doc(quotationId).update({
    subtotal: subtotal.toFixed(2),
    discountAmount: discountAmount.toFixed(2),
    taxAmount: taxAmount.toFixed(2),
    total: total.toFixed(2),
    updatedAt: FieldValue.serverTimestamp(),
  });
}
