import { useState } from "react";
import { useParams, Link } from "wouter";
import {
  useGetInvoice, useSetInvoiceStatus, useCreatePayment, useDeletePayment,
} from "@workspace/api-client-react";
type InvoiceStatus = "draft" | "sent" | "partial" | "paid" | "overdue" | "cancelled";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Printer, Trash2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const STATUS_OPTIONS: InvoiceStatus[] = ["draft", "sent", "partial", "paid", "overdue", "cancelled"];

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: inv } = useGetInvoice(id);
  const [payOpen, setPayOpen] = useState(false);
  const [payForm, setPayForm] = useState({ amount: "", method: "bank_transfer", reference: "" });

  const statusMut = useSetInvoiceStatus({
    mutation: { onSuccess() { qc.invalidateQueries({ queryKey: [`/api/invoices/${id}`] }); } },
  });
  const payMut = useCreatePayment({
    mutation: {
      onSuccess() {
        toast({ title: "Payment recorded" });
        qc.invalidateQueries({ queryKey: [`/api/invoices/${id}`] });
        setPayOpen(false);
        setPayForm({ amount: "", method: "bank_transfer", reference: "" });
      },
    },
  });
  const delPayMut = useDeletePayment({
    mutation: { onSuccess() { qc.invalidateQueries({ queryKey: [`/api/invoices/${id}`] }); } },
  });

  if (!inv) return <div className="p-6">Loading...</div>;
  const total = inv.total ?? 0;
  const paid = inv.amountPaid ?? 0;
  const subtotal = inv.subtotal ?? 0;
  const discountAmount = inv.discountAmount ?? 0;
  const taxableAmount = inv.taxableAmount ?? 0;
  const cgst = inv.cgst ?? 0;
  const sgst = inv.sgst ?? 0;
  const igst = inv.igst ?? 0;
  const taxRate = inv.taxRate ?? 0;
  const balance = total - paid;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex justify-between items-center print:hidden">
        <Link href="/invoices"><span className="text-sm text-muted-foreground flex items-center gap-1"><ArrowLeft className="h-4 w-4" />Back</span></Link>
        <div className="flex gap-2 flex-wrap">
          <select value={inv.status} onChange={(e) => statusMut.mutate({ id, data: { status: e.target.value as InvoiceStatus } })}
            className="px-3 py-1.5 rounded-lg text-sm bg-secondary border border-border">
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <Button size="sm" variant="outline" className="gap-1" onClick={() => window.print()}><Printer className="h-4 w-4" />Print</Button>
          {balance > 0 && <Button size="sm" onClick={() => { setPayForm({ amount: String(balance), method: "bank_transfer", reference: "" }); setPayOpen(true); }}>Record payment</Button>}
        </div>
      </div>

      <div className="bg-card border border-card-border rounded-xl p-6">
        <div className="flex justify-between items-start flex-wrap gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Tax Invoice</h1>
            <p className="text-sm text-muted-foreground">{inv.invoiceNumber}</p>
            <p className="text-sm text-muted-foreground">Issued: {formatDate(inv.issueDate)}{inv.dueDate ? ` · Due: ${formatDate(inv.dueDate)}` : ""}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase text-muted-foreground">Bill to</p>
            <p className="font-semibold">{inv.clientName ?? "—"}</p>
            {inv.buyerState && <p className="text-xs text-muted-foreground">State: {inv.buyerState}</p>}
          </div>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-secondary text-muted-foreground">
            <tr><th className="text-left p-3">Item</th><th className="text-right p-3">Qty</th><th className="text-right p-3">Unit ₹</th><th className="text-right p-3">Total ₹</th></tr>
          </thead>
          <tbody>
            {(Array.isArray(inv.items) ? inv.items : []).map((it) => (
              <tr key={it.id} className="border-t border-border">
                <td className="p-3">{it.description}</td>
                <td className="p-3 text-right">{it.quantity}</td>
                <td className="p-3 text-right">{formatCurrency(it.unitPrice)}</td>
                <td className="p-3 text-right">{formatCurrency(it.totalPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 ml-auto max-w-sm text-sm space-y-1">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
          {discountAmount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>-{formatCurrency(discountAmount)}</span></div>}
          <div className="flex justify-between"><span className="text-muted-foreground">Taxable</span><span>{formatCurrency(taxableAmount)}</span></div>
          {cgst > 0 && <div className="flex justify-between"><span className="text-muted-foreground">CGST @{(taxRate / 2).toFixed(2)}%</span><span>{formatCurrency(cgst)}</span></div>}
          {sgst > 0 && <div className="flex justify-between"><span className="text-muted-foreground">SGST @{(taxRate / 2).toFixed(2)}%</span><span>{formatCurrency(sgst)}</span></div>}
          {igst > 0 && <div className="flex justify-between"><span className="text-muted-foreground">IGST @{taxRate}%</span><span>{formatCurrency(igst)}</span></div>}
          <div className="flex justify-between font-bold border-t border-border pt-2"><span>Total</span><span>{formatCurrency(total)}</span></div>
          <div className="flex justify-between text-muted-foreground"><span>Paid</span><span>{formatCurrency(paid)}</span></div>
          <div className="flex justify-between font-semibold"><span>Balance</span><span>{formatCurrency(balance)}</span></div>
        </div>

        {inv.terms && <p className="text-xs text-muted-foreground mt-6 border-t border-border pt-3">{inv.terms}</p>}
      </div>

      <div className="bg-card border border-card-border rounded-xl p-5 print:hidden">
        <h3 className="font-semibold mb-3">Payments</h3>
        {!Array.isArray(inv.payments) || inv.payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments recorded.</p>
        ) : (
          <ul className="space-y-2">
            {inv.payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between border-b border-border pb-2 text-sm">
                <div>
                  <p>{formatCurrency(p.amount ?? 0)} · {p.method}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(p.paidAt)}{p.reference ? ` · Ref: ${p.reference}` : ""}</p>
                </div>
                <button onClick={() => delPayMut.mutate({ id: p.id })} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record payment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Amount (₹)</Label><Input type="number" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} /></div>
            <div>
              <Label>Method</Label>
              <select value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value })}
                className="w-full px-3 py-2 rounded-md bg-background border border-border text-sm">
                <option value="bank_transfer">Bank transfer</option>
                <option value="upi">UPI</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
                <option value="card">Card</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div><Label>Reference</Label><Input value={payForm.reference} onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)}>Cancel</Button>
            <Button disabled={!payForm.amount || payMut.isPending}
              onClick={() => payMut.mutate({ data: {
                invoiceId: id,
                amount: Number(payForm.amount),
                method: payForm.method as never,
                reference: payForm.reference || undefined,
              } })}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
