import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetStockLevels, useListStockMovements, useGetStockValuation, useGetLowStock,
  useCreateStockMovement, useListItems, useListWarehouses,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/format";
import { ClipboardList, ArrowDown, ArrowUp, AlertTriangle, Plus } from "lucide-react";

type Tab = "levels" | "movements" | "valuation" | "low-stock";

export default function InventoryPage() {
  const [tab, setTab] = useState<Tab>("levels");
  const { data: levels = [] } = useGetStockLevels();
  const { data: movements = [] } = useListStockMovements();
  const { data: valuation } = useGetStockValuation();
  const { data: low = [] } = useGetLowStock();
  const { data: items = [] } = useListItems();
  const { data: warehousesRaw } = useListWarehouses();
  const warehouses = Array.isArray(warehousesRaw) ? warehousesRaw : [];
  const { toast } = useToast();
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    itemId: 0, warehouseId: 0, transferToWarehouseId: 0,
    direction: "in" as "in" | "out", quantity: 0, unitCost: 0,
    reason: "adjustment" as "opening" | "purchase" | "sale" | "adjustment" | "transfer_in" | "transfer_out" | "return",
    notes: "",
  });

  const createMut = useCreateStockMovement({
    mutation: {
      onSuccess() {
        toast({ title: "Movement recorded" });
        qc.invalidateQueries();
        setOpen(false);
      },
      onError(err: unknown) {
        toast({ title: (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed", variant: "destructive" });
      },
    },
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const dir = form.reason === "transfer_out" ? "out" : form.reason === "transfer_in" ? "in" : form.direction;
    createMut.mutate({
      data: {
        itemId: form.itemId,
        warehouseId: form.warehouseId,
        direction: dir,
        quantity: form.quantity,
        unitCost: form.unitCost || undefined,
        reason: form.reason,
        notes: form.notes || undefined,
        transferToWarehouseId: form.reason === "transfer_out" && form.transferToWarehouseId ? form.transferToWarehouseId : undefined,
      },
    });
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Inventory</h1>
          <p className="text-sm text-muted-foreground">Stock levels, movements & valuation</p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setOpen(true)}><Plus className="h-4 w-4" />New Movement</Button>
      </div>

      <div className="flex gap-1 border-b border-border">
        {(["levels", "movements", "valuation", "low-stock"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm border-b-2 -mb-px capitalize ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
            {t.replace("-", " ")}
          </button>
        ))}
      </div>

      {tab === "levels" && (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-muted-foreground">
              <tr><th className="text-left p-3">Item</th><th className="text-left p-3">Warehouse</th><th className="text-right p-3">Qty</th><th className="text-right p-3">Avg Cost</th><th className="text-right p-3">Value</th></tr>
            </thead>
            <tbody>
              {levels.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No stock yet</td></tr>
              ) : levels.map((l, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="p-3"><p>{l.itemName}</p><p className="text-xs text-muted-foreground font-mono">{l.itemSku}</p></td>
                  <td className="p-3">{l.warehouseName}</td>
                  <td className="p-3 text-right">{l.quantity} {l.unit}</td>
                  <td className="p-3 text-right text-muted-foreground">{formatCurrency(l.avgCost ?? 0)}</td>
                  <td className="p-3 text-right">{formatCurrency(l.value ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "movements" && (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-muted-foreground">
              <tr><th className="text-left p-3">Date</th><th className="text-left p-3">Item</th><th className="text-left p-3">Warehouse</th><th className="text-left p-3">Reason</th><th className="text-right p-3">Qty</th><th className="text-right p-3">Unit Cost</th></tr>
            </thead>
            <tbody>
              {movements.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No movements yet</td></tr>
              ) : movements.map((m) => (
                <tr key={m.id} className="border-t border-border">
                  <td className="p-3 text-muted-foreground text-xs">{formatDate(m.createdAt)}</td>
                  <td className="p-3"><p>{m.itemName}</p><p className="text-xs text-muted-foreground font-mono">{m.itemSku}</p></td>
                  <td className="p-3">{m.warehouseName}</td>
                  <td className="p-3 capitalize">{m.reason.replace("_", " ")}</td>
                  <td className={`p-3 text-right font-medium ${m.direction === "in" ? "text-emerald-400" : "text-amber-400"}`}>
                    <span className="inline-flex items-center gap-1">{m.direction === "in" ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />}{m.quantity}</span>
                  </td>
                  <td className="p-3 text-right text-muted-foreground">{formatCurrency(m.unitCost ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "valuation" && valuation && (
        <div className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="rounded-lg border border-border p-4"><p className="text-xs text-muted-foreground">Total Stock Value</p><p className="text-2xl font-bold">{formatCurrency(valuation.totalValue)}</p></div>
            <div className="rounded-lg border border-border p-4"><p className="text-xs text-muted-foreground">Items in stock</p><p className="text-2xl font-bold">{valuation.totalItems}</p></div>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-2">By Warehouse</h3>
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-secondary text-muted-foreground"><tr><th className="text-left p-3">Warehouse</th><th className="text-right p-3">Items</th><th className="text-right p-3">Value</th></tr></thead>
                <tbody>
                  {(Array.isArray(valuation.byWarehouse) ? valuation.byWarehouse : []).map((w) => (
                    <tr key={w.warehouseId} className="border-t border-border"><td className="p-3">{w.warehouseName}</td><td className="p-3 text-right">{w.items}</td><td className="p-3 text-right">{formatCurrency(w.value)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-2">By Category</h3>
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-secondary text-muted-foreground"><tr><th className="text-left p-3">Category</th><th className="text-right p-3">Items</th><th className="text-right p-3">Value</th></tr></thead>
                <tbody>
                  {(Array.isArray(valuation.byCategory) ? valuation.byCategory : []).map((c, i) => (
                    <tr key={i} className="border-t border-border"><td className="p-3">{c.category}</td><td className="p-3 text-right">{c.items}</td><td className="p-3 text-right">{formatCurrency(c.value)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === "low-stock" && (
        low.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-xl">
            <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No low-stock items</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-muted-foreground"><tr><th className="text-left p-3">Item</th><th className="text-right p-3">Current</th><th className="text-right p-3">Threshold</th><th className="text-right p-3 w-28">Action</th></tr></thead>
              <tbody>
                {low.map((l) => (
                  <tr key={l.itemId} className="border-t border-border">
                    <td className="p-3"><p className="flex items-center gap-2"><AlertTriangle className="h-3 w-3 text-amber-500" />{l.itemName}</p><p className="text-xs text-muted-foreground font-mono">{l.itemSku}</p></td>
                    <td className="p-3 text-right text-amber-500 font-semibold">{l.currentStock} {l.unit}</td>
                    <td className="p-3 text-right text-muted-foreground">{l.lowStockThreshold}</td>
                    <td className="p-3 text-right">
                      <a href={`/purchase-orders?createForItem=${l.itemId}`} className="text-xs text-primary hover:underline">Create PO</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Stock Movement</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label>Item *</Label>
              <select required className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={form.itemId || ""} onChange={(e) => setForm({ ...form, itemId: Number(e.target.value) })}>
                <option value="">— Select item —</option>
                {items.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.sku})</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Warehouse *</Label>
              <select required className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={form.warehouseId || ""} onChange={(e) => setForm({ ...form, warehouseId: Number(e.target.value) })}>
                <option value="">—</option>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={form.reason} onChange={(e) => {
                const reason = e.target.value as typeof form.reason;
                const dir = reason === "purchase" || reason === "opening" || reason === "return" || reason === "transfer_in" ? "in" : reason === "sale" || reason === "transfer_out" ? "out" : form.direction;
                setForm({ ...form, reason, direction: dir });
              }}>
                <option value="adjustment">Adjustment</option>
                <option value="opening">Opening</option>
                <option value="purchase">Purchase</option>
                <option value="sale">Sale</option>
                <option value="transfer_out">Transfer Out</option>
                <option value="return">Return</option>
              </select>
            </div>
            {form.reason === "adjustment" && (
              <div className="space-y-1.5 col-span-2">
                <Label>Direction</Label>
                <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value as "in" | "out" })}>
                  <option value="in">IN (add stock)</option>
                  <option value="out">OUT (remove stock)</option>
                </select>
              </div>
            )}
            {form.reason === "transfer_out" && (
              <div className="space-y-1.5 col-span-2">
                <Label>Transfer To *</Label>
                <select required className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={form.transferToWarehouseId || ""} onChange={(e) => setForm({ ...form, transferToWarehouseId: Number(e.target.value) })}>
                  <option value="">—</option>
                  {warehouses.filter((w) => w.id !== form.warehouseId).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
            )}
            <div className="space-y-1.5"><Label>Quantity</Label><Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} required /></div>
            <div className="space-y-1.5"><Label>Unit Cost (optional)</Label><Input type="number" value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: Number(e.target.value) })} /></div>
            <div className="space-y-1.5 col-span-2"><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <DialogFooter className="col-span-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMut.isPending}>Record</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
