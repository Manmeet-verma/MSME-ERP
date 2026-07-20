import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useListItems, useCreateItem, useUpdateItem, useDeleteItem } from "@workspace/api-client-react";
import type { Item } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Boxes, Pencil, Trash2, AlertTriangle, Upload } from "lucide-react";
import { useRef } from "react";
import { formatCurrency } from "@/lib/format";

type Form = {
  sku: string; name: string; category: string; unit: string; hsnCode: string;
  gstRate: number; salePrice: number; purchasePrice: number; openingStock: number; lowStockThreshold: number;
};
const empty: Form = { sku: "", name: "", category: "", unit: "pcs", hsnCode: "", gstRate: 18, salePrice: 0, purchasePrice: 0, openingStock: 0, lowStockThreshold: 0 };

function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cells = line.split(",").map((c) => c.trim());
    const row: Record<string, string> = {};
    header.forEach((h, i) => { row[h] = cells[i] ?? ""; });
    return row;
  });
}

export default function ItemsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: itemsRaw } = useListItems();
  const items = Array.isArray(itemsRaw) ? itemsRaw : [];
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [form, setForm] = useState<Form>(empty);
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["/api/items"] });
  }

  const createMut = useCreateItem({ mutation: { onSuccess() { toast({ title: "Item created" }); invalidate(); setOpen(false); }, onError() { toast({ title: "Failed to create", variant: "destructive" }); } } });
  const updateMut = useUpdateItem({ mutation: { onSuccess() { toast({ title: "Item updated" }); invalidate(); setOpen(false); } } });
  const deleteMut = useDeleteItem({ mutation: { onSuccess() { toast({ title: "Item deleted" }); invalidate(); } } });

  function openCreate() { setEditing(null); setForm(empty); setOpen(true); }
  function openEdit(i: Item) {
    setEditing(i);
    setForm({
      sku: i.sku, name: i.name, category: i.category ?? "", unit: i.unit, hsnCode: i.hsnCode ?? "",
      gstRate: i.gstRate ?? 0, salePrice: i.salePrice ?? 0, purchasePrice: i.purchasePrice ?? 0,
      openingStock: 0, lowStockThreshold: i.lowStockThreshold ?? 0,
    });
    setOpen(true);
  }

  async function handleCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (rows.length === 0) {
        toast({ title: "CSV is empty", variant: "destructive" });
        return;
      }
      let ok = 0;
      let fail = 0;
      for (const r of rows) {
        if (!r.sku || !r.name) { fail++; continue; }
        try {
          await createMut.mutateAsync({
            data: {
              sku: r.sku,
              name: r.name,
              category: r.category || undefined,
              unit: r.unit || "pcs",
              hsnCode: r["hsn"] || r["hsncode"] || undefined,
              gstRate: Number(r["gst"] ?? r["gstrate"] ?? 18),
              salePrice: Number(r["saleprice"] ?? r["sale"] ?? 0),
              purchasePrice: Number(r["purchaseprice"] ?? r["purchase"] ?? 0),
              openingStock: Number(r["openingstock"] ?? r["opening"] ?? 0),
              lowStockThreshold: Number(r["lowstockthreshold"] ?? r["threshold"] ?? 0),
            },
          });
          ok++;
        } catch {
          fail++;
        }
      }
      toast({ title: `Imported ${ok} items` + (fail ? `, ${fail} failed` : "") });
      invalidate();
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const data = {
      sku: form.sku, name: form.name,
      category: form.category || undefined,
      unit: form.unit, hsnCode: form.hsnCode || undefined,
      gstRate: Number(form.gstRate), salePrice: Number(form.salePrice), purchasePrice: Number(form.purchasePrice),
      lowStockThreshold: Number(form.lowStockThreshold),
      ...(editing ? {} : { openingStock: Number(form.openingStock) }),
    };
    if (editing) updateMut.mutate({ id: editing.id, data });
    else createMut.mutate({ data });
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Inventory Items</h1>
          <p className="text-sm text-muted-foreground">{items.length} items</p>
        </div>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".csv" onChange={handleCsv} className="hidden" />
          <Button size="sm" variant="outline" className="gap-2" disabled={importing} onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4" />{importing ? "Importing..." : "Import CSV"}
          </Button>
          <Button size="sm" className="gap-2" onClick={openCreate}><Plus className="h-4 w-4" />Add Item</Button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <Boxes className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No items yet</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-secondary text-muted-foreground">
              <tr>
                <th className="text-left p-3">SKU</th>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Category</th>
                <th className="text-right p-3">Stock</th>
                <th className="text-right p-3">Sale ₹</th>
                <th className="text-right p-3">Avg Cost ₹</th>
                <th className="text-right p-3 w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => {
                const threshold = i.lowStockThreshold ?? 0;
                const stock = i.currentStock ?? 0;
                const low = threshold > 0 && stock <= threshold;
                return (
                  <tr key={i.id} className="border-t border-border hover:bg-secondary/50">
                    <td className="p-3 font-mono text-xs">{i.sku}</td>
                    <td className="p-3 font-medium">{i.name}</td>
                    <td className="p-3 text-muted-foreground">{i.category ?? "—"}</td>
                    <td className="p-3 text-right">
                      <span className={low ? "text-amber-500 font-semibold inline-flex items-center gap-1" : ""}>
                        {low && <AlertTriangle className="h-3 w-3" />}{stock} {i.unit}
                      </span>
                    </td>
                    <td className="p-3 text-right">{formatCurrency(i.salePrice ?? 0)}</td>
                    <td className="p-3 text-right text-muted-foreground">{formatCurrency(i.avgCost ?? 0)}</td>
                    <td className="p-3 text-right">
                      <button onClick={() => openEdit(i)} className="p-1.5 text-muted-foreground hover:text-primary"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => { if (confirm(`Delete ${i.name}?`)) deleteMut.mutate({ id: i.id }); }} className="p-1.5 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit Item" : "Add Item"}</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>SKU *</Label><Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required /></div>
            <div className="space-y-1.5"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="space-y-1.5"><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Unit</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>HSN Code</Label><Input value={form.hsnCode} onChange={(e) => setForm({ ...form, hsnCode: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>GST %</Label><Input type="number" value={form.gstRate} onChange={(e) => setForm({ ...form, gstRate: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>Sale Price ₹</Label><Input type="number" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: Number(e.target.value) })} /></div>
            <div className="space-y-1.5"><Label>Purchase Price ₹</Label><Input type="number" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: Number(e.target.value) })} /></div>
            {!editing && (
              <div className="space-y-1.5"><Label>Opening Stock</Label><Input type="number" value={form.openingStock} onChange={(e) => setForm({ ...form, openingStock: Number(e.target.value) })} /></div>
            )}
            <div className="space-y-1.5"><Label>Low-Stock Threshold</Label><Input type="number" value={form.lowStockThreshold} onChange={(e) => setForm({ ...form, lowStockThreshold: Number(e.target.value) })} /></div>
            <DialogFooter className="col-span-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>{editing ? "Update" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
