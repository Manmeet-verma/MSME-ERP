import { Link, useLocation } from "wouter";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useListVendorBills, useCreateVendorBill, useListVendors, useListPurchaseOrders } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/format";
import { Plus, Receipt } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-secondary text-muted-foreground",
  open: "bg-blue-500/15 text-blue-400",
  partial: "bg-amber-500/15 text-amber-400",
  paid: "bg-emerald-500/15 text-emerald-400",
  overdue: "bg-destructive/15 text-destructive",
  cancelled: "bg-secondary text-muted-foreground",
};

export default function VendorBillsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const { data: bills = [] } = useListVendorBills();
  const { data: vendors = [] } = useListVendors();
  const { data: pos = [] } = useListPurchaseOrders();
  const [open, setOpen] = useState(false);
  const [vendorId, setVendorId] = useState<number | "">("");
  const [poId, setPoId] = useState<number | "">("");
  const [billNumber, setBillNumber] = useState("");
  const [dueDate, setDueDate] = useState("");

  const createMut = useCreateVendorBill({
    mutation: {
      onSuccess(data) {
        toast({ title: "Bill created" });
        qc.invalidateQueries({ queryKey: ["/api/vendor-bills"] });
        setOpen(false);
        navigate(`/vendor-bills/${data.id}`);
      },
    },
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    createMut.mutate({
      data: {
        vendorId: vendorId === "" ? undefined : Number(vendorId),
        purchaseOrderId: poId === "" ? undefined : Number(poId),
        billNumber: billNumber || undefined,
        dueDate: dueDate || undefined,
      },
    });
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Vendor Bills</h1>
          <p className="text-sm text-muted-foreground">{bills.length} bills</p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => { setVendorId(""); setPoId(""); setBillNumber(""); setDueDate(""); setOpen(true); }}><Plus className="h-4 w-4" />New Bill</Button>
      </div>
      {bills.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <Receipt className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No vendor bills yet</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-muted-foreground">
              <tr>
                <th className="text-left p-3">Bill #</th>
                <th className="text-left p-3">Vendor</th>
                <th className="text-left p-3">Status</th>
                <th className="text-right p-3">Total</th>
                <th className="text-right p-3">Paid</th>
                <th className="text-left p-3">Due</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((b) => (
                <tr key={b.id} className="border-t border-border hover:bg-secondary/50">
                  <td className="p-3 font-medium"><Link href={`/vendor-bills/${b.id}`}><a className="text-primary">{b.billNumber}</a></Link></td>
                  <td className="p-3">{b.vendorName ?? "—"}</td>
                  <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[b.status] ?? ""}`}>{b.status}</span></td>
                  <td className="p-3 text-right">{formatCurrency(b.total)}</td>
                  <td className="p-3 text-right">{formatCurrency(b.amountPaid)}</td>
                  <td className="p-3 text-muted-foreground">{b.dueDate ? formatDate(b.dueDate) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Vendor Bill</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Vendor</Label>
              <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={vendorId} onChange={(e) => setVendorId(e.target.value ? Number(e.target.value) : "")}>
                <option value="">— Select vendor —</option>
                {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Link to Purchase Order (auto-fills items)</Label>
              <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={poId} onChange={(e) => setPoId(e.target.value ? Number(e.target.value) : "")}>
                <option value="">— None —</option>
                {pos.map((p) => <option key={p.id} value={p.id}>{p.poNumber} · {p.vendorName ?? ""}</option>)}
              </select>
            </div>
            <div className="space-y-1.5"><Label>Bill # (vendor's)</Label><Input value={billNumber} onChange={(e) => setBillNumber(e.target.value)} placeholder="Auto-generated if blank" /></div>
            <div className="space-y-1.5"><Label>Due Date</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMut.isPending}>Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
