import { Link, useLocation } from "wouter";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useListPurchaseOrders, useCreatePurchaseOrder, useListVendors, useListWarehouses, useListItems } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/format";
import { Plus, FileBox, Trash2 } from "lucide-react";

type Line = { itemId?: number; description: string; quantity: number; unitPrice: number };

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-secondary text-muted-foreground",
  sent: "bg-blue-500/15 text-blue-400",
  partial: "bg-amber-500/15 text-amber-400",
  received: "bg-emerald-500/15 text-emerald-400",
  cancelled: "bg-destructive/15 text-destructive",
};

export default function PurchaseOrdersPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const { data: pos = [] } = useListPurchaseOrders();
  const { data: vendors = [] } = useListVendors();
  const { data: warehouses = [] } = useListWarehouses();
  const { data: items = [] } = useListItems();
  const [open, setOpen] = useState(false);
  const [vendorId, setVendorId] = useState<number | "">("");
  const [warehouseId, setWarehouseId] = useState<number | "">("");
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([{ description: "", quantity: 1, unitPrice: 0 }]);

  const createMut = useCreatePurchaseOrder({
    mutation: {
      onSuccess(data) {
        toast({ title: "Purchase order created" });
        qc.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
        setOpen(false);
        navigate(`/purchase-orders/${data.id}`);
      },
    },
  });

  function addLine() { setLines([...lines, { description: "", quantity: 1, unitPrice: 0 }]); }
  function updateLine(i: number, patch: Partial<Line>) {
    setLines(lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function removeLine(i: number) { setLines(lines.filter((_, idx) => idx !== i)); }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    createMut.mutate({
      data: {
        vendorId: vendorId === "" ? undefined : Number(vendorId),
        warehouseId: warehouseId === "" ? undefined : Number(warehouseId),
        expectedDate: expectedDate || undefined,
        notes: notes || undefined,
        status: "draft",
        items: lines.filter((l) => l.description && l.quantity > 0).map((l) => ({
          itemId: l.itemId,
          description: l.description,
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice),
        })),
      },
    });
  }

  function openCreate() {
    setVendorId(""); setWarehouseId(""); setExpectedDate(""); setNotes("");
    setLines([{ description: "", quantity: 1, unitPrice: 0 }]);
    setOpen(true);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Purchase Orders</h1>
          <p className="text-sm text-muted-foreground">{pos.length} orders</p>
        </div>
        <Button size="sm" className="gap-2" onClick={openCreate}><Plus className="h-4 w-4" />New PO</Button>
      </div>
      {pos.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <FileBox className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No purchase orders yet</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-muted-foreground">
              <tr>
                <th className="text-left p-3">PO #</th>
                <th className="text-left p-3">Vendor</th>
                <th className="text-left p-3">Status</th>
                <th className="text-right p-3">Total</th>
                <th className="text-left p-3">Expected</th>
              </tr>
            </thead>
            <tbody>
              {pos.map((p) => (
                <tr key={p.id} className="border-t border-border hover:bg-secondary/50">
                  <td className="p-3 font-medium"><Link href={`/purchase-orders/${p.id}`}><a className="text-primary">{p.poNumber}</a></Link></td>
                  <td className="p-3">{p.vendorName ?? "—"}</td>
                  <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[p.status] ?? ""}`}>{p.status}</span></td>
                  <td className="p-3 text-right">{formatCurrency(p.total)}</td>
                  <td className="p-3 text-muted-foreground">{p.expectedDate ? formatDate(p.expectedDate) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>New Purchase Order</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Vendor</Label>
                <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={vendorId} onChange={(e) => setVendorId(e.target.value ? Number(e.target.value) : "")}>
                  <option value="">— Select vendor —</option>
                  {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Warehouse</Label>
                <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value ? Number(e.target.value) : "")}>
                  <option value="">— Select warehouse —</option>
                  {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5"><Label>Expected Date</Label><Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} /></div>
              <div className="space-y-1.5 col-span-2"><Label>Notes</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Items</Label>
                <Button type="button" size="sm" variant="outline" onClick={addLine}>Add line</Button>
              </div>
              <div className="space-y-2">
                {lines.map((l, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      <select
                        className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                        value={l.itemId ?? ""}
                        onChange={(e) => {
                          const id = e.target.value ? Number(e.target.value) : undefined;
                          const it = items.find((x) => x.id === id);
                          updateLine(i, { itemId: id, description: it?.name ?? l.description, unitPrice: it?.purchasePrice ?? l.unitPrice });
                        }}>
                        <option value="">— Item —</option>
                        {items.map((it) => <option key={it.id} value={it.id}>{it.name}</option>)}
                      </select>
                      <Input className="mt-1" placeholder="Description" value={l.description} onChange={(e) => updateLine(i, { description: e.target.value })} required />
                    </div>
                    <div className="col-span-2"><Input type="number" placeholder="Qty" value={l.quantity} onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })} /></div>
                    <div className="col-span-4"><Input type="number" placeholder="Unit ₹" value={l.unitPrice} onChange={(e) => updateLine(i, { unitPrice: Number(e.target.value) })} /></div>
                    <div className="col-span-1"><button type="button" onClick={() => removeLine(i)} className="p-1.5 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button></div>
                  </div>
                ))}
              </div>
            </div>

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
