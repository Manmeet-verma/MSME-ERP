export function calcGst(taxableAmount: number, taxRate: number, sellerState?: string | null, buyerState?: string | null) {
  const tax = (taxableAmount * taxRate) / 100;
  const sameState =
    sellerState && buyerState && sellerState.trim().toLowerCase() === buyerState.trim().toLowerCase();
  if (sameState) {
    const half = tax / 2;
    return { cgst: round2(half), sgst: round2(half), igst: 0, total: round2(tax) };
  }
  return { cgst: 0, sgst: 0, igst: round2(tax), total: round2(tax) };
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
