import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useListVendors, useCreateVendor, useUpdateVendor, useDeleteVendor } from "@workspace/api-client-react";
import type { Vendor } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Truck, Pencil, Trash2, Mail, Phone } from "lucide-react";

type Form = { name: string; contactName: string; email: string; phone: string; address: string; city: string; state: string; gstNumber: string; paymentTermsDays: number };
const empty: Form = { name: "", contactName: "", email: "", phone: "", address: "", city: "", state: "", gstNumber: "", paymentTermsDays: 30 };

export default function VendorsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: vendors = [] } = useListVendors();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [form, setForm] = useState<Form>(empty);

  function invalidate() { qc.invalidateQueries({ queryKey: ["/api/vendors"] }); }
  const createMut = useCreateVendor({ mutation: { onSuccess() { toast({ title: "Vendor created" }); invalidate(); setOpen(false); } } });
  const updateMut = useUpdateVendor({ mutation: { onSuccess() { toast({ title: "Updated" }); invalidate(); setOpen(false); } } });
  const deleteMut = useDeleteVendor({ mutation: { onSuccess() { toast({ title: "Deleted" }); invalidate(); } } });

  function openCreate() { setEditing(null); setForm(empty); setOpen(true); }
  function openEdit(v: Vendor) {
    setEditing(v);
    setForm({
      name: v.name, contactName: v.contactName ?? "", email: v.email ?? "", phone: v.phone ?? "",
      address: v.address ?? "", city: v.city ?? "", state: v.state ?? "", gstNumber: v.gstNumber ?? "",
      paymentTermsDays: v.paymentTermsDays,
    });
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
          <h1 className="text-xl font-bold">Vendors</h1>
          <p className="text-sm text-muted-foreground">{vendors.length} vendors</p>
        </div>
        <Button size="sm" className="gap-2" onClick={openCreate}><Plus className="h-4 w-4" />Add Vendor</Button>
      </div>
      {vendors.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <Truck className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No vendors yet</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {vendors.map((v) => (
            <div key={v.id} className="rounded-xl border border-border bg-card p-5 hover:border-primary/30 group">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{v.name}</p>
                  {v.contactName && <p className="text-xs text-muted-foreground">{v.contactName}</p>}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                  <button onClick={() => openEdit(v)} className="p-1.5 text-muted-foreground hover:text-primary"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => { if (confirm(`Delete ${v.name}?`)) deleteMut.mutate({ id: v.id }); }} className="p-1.5 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                {v.email && <p className="flex items-center gap-1.5"><Mail className="h-3 w-3" />{v.email}</p>}
                {v.phone && <p className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{v.phone}</p>}
                {v.gstNumber && <p className="font-mono text-[10px] bg-secondary px-2 py-0.5 rounded w-fit">GST: {v.gstNumber}</p>}
                <p>Payment terms: {v.paymentTermsDays} days</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit Vendor" : "Add Vendor"}</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="space-y-1.5"><Label>Contact Person</Label><Input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>GST Number</Label><Input value={form.gstNumber} onChange={(e) => setForm({ ...form, gstNumber: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>State</Label><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
            <div className="space-y-1.5 col-span-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Payment Terms (days)</Label><Input type="number" value={form.paymentTermsDays} onChange={(e) => setForm({ ...form, paymentTermsDays: Number(e.target.value) })} /></div>
            <DialogFooter className="col-span-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">{editing ? "Update" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
