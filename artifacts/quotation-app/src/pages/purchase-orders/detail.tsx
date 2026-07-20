import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetPurchaseOrder, useUpdatePurchaseOrder, useListGrn, useCreateGrn,
  useListWarehouses,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/format";
import { ArrowLeft, Truck, Printer } from "lucide-react";

export default function PurchaseOrderDetailPage() {
  const [, params] = useRoute("/purchase-orders/:id");
  const id = Number(params?.id);
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: po } = useGetPurchaseOrder(id);
  const { data: grnsRaw } = useListGrn({ purchaseOrderId: id });
  const grns = Array.isArray(grnsRaw) ? grnsRaw : [];
  const { data: warehousesRaw } = useListWarehouses();
  const warehouses = Array.isArray(warehousesRaw) ? warehousesRaw : [];

  const [grnOpen, setGrnOpen] = useState(false);
  const [whId, setWhId] = useState<number | "">("");
  const [receiveQty, setReceiveQty] = useState<Record<number, number>>({});

  const updateMut = useUpdatePurchaseOrder({
    mutation: {
      onSuccess() {
        toast({ title: "Updated" });
        qc.invalidateQueries({ queryKey: [`/api/purchase-orders/${id}`] });
        qc.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      },
    },
  });

  const createGrnMut = useCreateGrn({
    mutation: {
      onSuccess() {
        toast({ title: "Goods received" });
        qc.invalidateQueries({ queryKey: [`/api/purchase-orders/${id}`] });
        qc.invalidateQueries({ queryKey: ["/api/grn"] });
        qc.invalidateQueries({ queryKey: ["/api/items"] });
        setGrnOpen(false);
      },
      onError(err: unknown) {
        toast({ title: (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed", variant: "destructive" });
      },
    },
  });

  if (!po) return <div className="p-6">Loading...</div>;

  function setStatus(status: "draft" | "sent" | "partial" | "received" | "cancelled") {
    updateMut.mutate({ id, data: { status } });
  }

  function openGrn() {
    const def = (Array.isArray(warehouses) ? warehouses : []).find((w) => w.isDefault) ?? warehouses[0];
    setWhId(def?.id ?? "");
    const initial: Record<number, number> = {};
    for (const it of (Array.isArray(po?.items) ? po.items : [])) {
      initial[it.id] = Math.max(0, (it.quantity ?? 0) - (it.receivedQuantity ?? 0));
    }
    setReceiveQty(initial);
    setGrnOpen(true);
  }

  function submitGrn(e: React.FormEvent) {
    e.preventDefault();
    if (!whId) {
      toast({ title: "Select a warehouse", variant: "destructive" });
      return;
    }
    const items = (Array.isArray(po?.items) ? po.items : [])
      .filter((it) => it.itemId && (receiveQty[it.id] ?? 0) > 0)
      .map((it) => ({
        poItemId: it.id,
        itemId: it.itemId as number,
        quantity: receiveQty[it.id] ?? 0,
        unitCost: it.unitPrice ?? 0,
      }));
    if (items.length === 0) {
      toast({ title: "Nothing to receive (items must be linked to inventory items)", variant: "destructive" });
      return;
    }
    createGrnMut.mutate({
      data: {
        purchaseOrderId: id,
        warehouseId: Number(whId),
        items,
      },
    });
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <Link href="/purchase-orders"><span className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1"><ArrowLeft className="h-3 w-3" />Back to purchase orders</span></Link>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">{po.poNumber}</h1>
          <p className="text-sm text-muted-foreground">{po.vendorName ?? "—"} · <span className="capitalize">{po.status}</span></p>
        </div>
        <div className="flex gap-2 print:hidden">
          {po.status === "draft" && <Button size="sm" onClick={() => setStatus("sent")}>Send</Button>}
          {(po.status === "sent" || po.status === "partial" || po.status === "draft") && (
            <Button size="sm" className="gap-2" onClick={openGrn}><Truck className="h-4 w-4" />Receive Goods</Button>
          )}
          <Button size="sm" variant="outline" className="gap-2" onClick={() => window.print()}><Printer className="h-4 w-4" />Print</Button>
          {po.status !== "cancelled" && po.status !== "received" && <Button size="sm" variant="outline" onClick={() => setStatus("cancelled")}>Cancel</Button>}
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 text-sm">
        <div className="rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground">Subtotal</p><p className="font-semibold">{formatCurrency(po.subtotal ?? 0)}</p></div>
        <div className="rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground">Tax</p><p className="font-semibold">{formatCurrency(po.taxAmount ?? 0)}</p></div>
        <div className="rounded-lg border border-border p-3"><p className="text-xs text-muted-foreground">Total</p><p className="font-semibold">{formatCurrency(po.total ?? 0)}</p></div>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-muted-foreground">
            <tr>
              <th className="text-left p-3">Item</th>
              <th className="text-right p-3">Qty</th>
              <th className="text-right p-3">Received</th>
              <th className="text-right p-3">Unit ₹</th>
              <th className="text-right p-3">Total</th>
            </tr>
          </thead>
          <tbody>
            {(Array.isArray(po.items) ? po.items : []).map((i) => (
              <tr key={i.id} className="border-t border-border">
                <td className="p-3">
                  <p>{i.description}</p>
                  {i.itemSku && <p className="text-xs text-muted-foreground font-mono">{i.itemSku}</p>}
                </td>
                <td className="p-3 text-right">{i.quantity}</td>
                <td className="p-3 text-right">{i.receivedQuantity}</td>
                <td className="p-3 text-right">{formatCurrency(i.unitPrice ?? 0)}</td>
                <td className="p-3 text-right">{formatCurrency(i.totalPrice ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="text-sm font-semibold mb-2">Goods Receipts ({grns.length})</h2>
        {grns.length === 0 ? (
          <p className="text-sm text-muted-foreground">No goods received yet</p>
        ) : (
          <div className="space-y-2">
            {grns.map((g) => (
              <div key={g.id} className="rounded-lg border border-border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{g.grnNumber}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(g.receivedAt)}</p>
                </div>
                <p className="text-xs text-muted-foreground">{g.warehouseName} · {(Array.isArray(g.items) ? g.items : []).length} items</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={grnOpen} onOpenChange={setGrnOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Receive Goods</DialogTitle></DialogHeader>
          <form onSubmit={submitGrn} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Warehouse</Label>
              <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={whId} onChange={(e) => setWhId(e.target.value ? Number(e.target.value) : "")} required>
                <option value="">— Select warehouse —</option>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              {(Array.isArray(po.items) ? po.items : []).map((it) => {
                const pending = Math.max(0, (it.quantity ?? 0) - (it.receivedQuantity ?? 0));
                return (
                  <div key={it.id} className="grid grid-cols-3 gap-2 items-center text-sm">
                    <div className="col-span-2">
                      <p>{it.description}</p>
                      <p className="text-xs text-muted-foreground">Pending: {pending} {!it.itemId && <span className="text-amber-500">(not linked)</span>}</p>
                    </div>
                    <Input type="number" disabled={!it.itemId} value={receiveQty[it.id] ?? 0} onChange={(e) => setReceiveQty({ ...receiveQty, [it.id]: Number(e.target.value) })} />
                  </div>
                );
              })}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setGrnOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createGrnMut.isPending}>Receive</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
