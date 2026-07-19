import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useGetVendorBill, useUpdateVendorBill } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/lib/format";
import { ArrowLeft } from "lucide-react";

export default function VendorBillDetailPage() {
  const [, params] = useRoute("/vendor-bills/:id");
  const id = Number(params?.id);
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: bill } = useGetVendorBill(id);
  const [paidAmt, setPaidAmt] = useState("");

  const updateMut = useUpdateVendorBill({
    mutation: {
      onSuccess() {
        toast({ title: "Updated" });
        qc.invalidateQueries({ queryKey: [`/api/vendor-bills/${id}`] });
        qc.invalidateQueries({ queryKey: ["/api/vendor-bills"] });
      },
    },
  });

  if (!bill) return <div className="p-6">Loading...</div>;

  function recordPayment() {
    const add = Number(paidAmt);
    if (!add || add <= 0) return;
    updateMut.mutate({ id, data: { amountPaid: ((bill?.amountPaid ?? 0)) + add } });
    setPaidAmt("");
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <Link href="/vendor-bills"><span className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1"><ArrowLeft className="h-3 w-3" />Back</span></Link>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">{bill.billNumber}</h1>
          <p className="text-sm text-muted-foreground">{bill.vendorName ?? "—"} · <span className="capitalize">{bill.status}</span></p>
        </div>
        <div className="text-right text-sm">
          <p className="text-muted-foreground">Issued {formatDate(bill.issueDate)}</p>
          {bill.dueDate && <p className="text-muted-foreground">Due {formatDate(bill.dueDate)}</p>}
        </div>
      </div>

      <div className="grid sm:grid-cols-4 gap-3 text-sm">
        <div className="rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground">Subtotal</p><p className="font-semibold">{formatCurrency(bill.subtotal ?? 0)}</p></div>
        <div className="rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground">Tax</p><p className="font-semibold">{formatCurrency(bill.taxAmount ?? 0)}</p></div>
        <div className="rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground">Total</p><p className="font-semibold">{formatCurrency(bill.total ?? 0)}</p></div>
        <div className="rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground">Paid</p><p className="font-semibold">{formatCurrency(bill.amountPaid ?? 0)}</p></div>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-muted-foreground">
            <tr>
              <th className="text-left p-3">Description</th>
              <th className="text-right p-3">Qty</th>
              <th className="text-right p-3">Unit ₹</th>
              <th className="text-right p-3">Total</th>
            </tr>
          </thead>
          <tbody>
            {(bill.items ?? []).map((i) => (
              <tr key={i.id} className="border-t border-border">
                <td className="p-3">{i.description}</td>
                <td className="p-3 text-right">{i.quantity}</td>
                <td className="p-3 text-right">{formatCurrency(i.unitPrice ?? 0)}</td>
                <td className="p-3 text-right">{formatCurrency(i.totalPrice ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {bill.status !== "paid" && bill.status !== "cancelled" && (
        <div className="rounded-xl border border-border p-4 space-y-2">
          <p className="text-sm font-semibold">Record Payment</p>
          <div className="flex items-center gap-2">
            <Input type="number" placeholder="Amount ₹" value={paidAmt} onChange={(e) => setPaidAmt(e.target.value)} className="max-w-xs" />
            <Button size="sm" onClick={recordPayment} disabled={updateMut.isPending}>Add Payment</Button>
          </div>
          <p className="text-xs text-muted-foreground">Outstanding: {formatCurrency((bill.total ?? 0) - (bill.amountPaid ?? 0))}</p>
        </div>
      )}
    </div>
  );
}
