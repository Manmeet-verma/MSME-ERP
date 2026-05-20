import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useListWarehouses, useCreateWarehouse, useUpdateWarehouse, useDeleteWarehouse } from "@workspace/api-client-react";
import type { Warehouse } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Warehouse as WIcon, Pencil, Trash2 } from "lucide-react";

type Form = { name: string; code: string; city: string; state: string; address: string; isDefault: boolean };
const empty: Form = { name: "", code: "", city: "", state: "", address: "", isDefault: false };

export default function WarehousesPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: warehouses = [] } = useListWarehouses();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [form, setForm] = useState<Form>(empty);

  function invalidate() { qc.invalidateQueries({ queryKey: ["/api/warehouses"] }); }
  const createMut = useCreateWarehouse({ mutation: { onSuccess() { toast({ title: "Warehouse created" }); invalidate(); setOpen(false); } } });
  const updateMut = useUpdateWarehouse({ mutation: { onSuccess() { toast({ title: "Updated" }); invalidate(); setOpen(false); } } });
  const deleteMut = useDeleteWarehouse({ mutation: { onSuccess() { toast({ title: "Deleted" }); invalidate(); } } });

  function openCreate() { setEditing(null); setForm(empty); setOpen(true); }
  function openEdit(w: Warehouse) {
    setEditing(w);
    setForm({ name: w.name, code: w.code ?? "", city: w.city ?? "", state: w.state ?? "", address: w.address ?? "", isDefault: w.isDefault });
    setOpen(true);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (editing) updateMut.mutate({ id: editing.id, data: form });
    else createMut.mutate({ data: form });
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Warehouses</h1>
          <p className="text-sm text-muted-foreground">{warehouses.length} locations</p>
        </div>
        <Button size="sm" className="gap-2" onClick={openCreate}><Plus className="h-4 w-4" />Add Warehouse</Button>
      </div>
      {warehouses.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <WIcon className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No warehouses yet</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {warehouses.map((w) => (
            <div key={w.id} className="rounded-xl border border-border bg-card p-5 hover:border-primary/30 group">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold flex items-center gap-2">{w.name} {w.isDefault && <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded">Default</span>}</p>
                  {w.code && <p className="text-xs text-muted-foreground font-mono">{w.code}</p>}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                  <button onClick={() => openEdit(w)} className="p-1.5 text-muted-foreground hover:text-primary"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => { if (confirm(`Delete ${w.name}?`)) deleteMut.mutate({ id: w.id }); }} className="p-1.5 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                {w.city && <p>{w.city}, {w.state ?? ""}</p>}
                {w.address && <p className="line-clamp-2">{w.address}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Warehouse" : "Add Warehouse"}</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Code</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              <div className="space-y-1.5 col-span-2"><Label>State</Label><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
              <div className="space-y-1.5 col-span-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} />Default warehouse</label>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">{editing ? "Update" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
