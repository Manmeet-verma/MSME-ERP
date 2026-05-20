import { useState } from "react";

import { useListAddons, useCreateAddon, useUpdateAddon, useDeleteAddon } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Puzzle, Pencil, Trash2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useQueryClient } from "@tanstack/react-query";
import type { Addon } from "@workspace/api-client-react";

type PriceType = "fixed" | "percentage";
type AddonForm = { name: string; description: string; category: string; price: string; priceType: PriceType; isActive: boolean };
const emptyForm: AddonForm = { name: "", description: "", category: "installation", price: "", priceType: "fixed", isActive: true };

const ADDON_CATEGORIES = ["installation", "structure", "content", "warranty", "logistics", "software", "other"];
const CATEGORY_COLORS: Record<string, string> = {
  installation: "#3b82f6", structure: "#f59e0b", content: "#8b5cf6",
  warranty: "#22c55e", logistics: "#06b6d4", software: "#ec4899", other: "#6b7280",
};

export default function AddonsPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Addon | null>(null);
  const [form, setForm] = useState<AddonForm>(emptyForm);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useListAddons();
  const addons = data ?? [];

  const createMutation = useCreateAddon({
    mutation: {
      onSuccess() {
        toast({ title: "Add-on created" });
        qc.invalidateQueries({ queryKey: ["/api/addons"] });
        setOpen(false); setForm(emptyForm);
      },
      onError() { toast({ title: "Failed", variant: "destructive" }); },
    },
  });

  const updateMutation = useUpdateAddon({
    mutation: {
      onSuccess() {
        toast({ title: "Add-on updated" });
        qc.invalidateQueries({ queryKey: ["/api/addons"] });
        setOpen(false); setEditing(null);
      },
      onError() { toast({ title: "Failed", variant: "destructive" }); },
    },
  });

  const deleteMutation = useDeleteAddon({
    mutation: {
      onSuccess() {
        toast({ title: "Add-on deleted" });
        qc.invalidateQueries({ queryKey: ["/api/addons"] });
      },
      onError() { toast({ title: "Failed to delete", variant: "destructive" }); },
    },
  });

  function openCreate() { setEditing(null); setForm(emptyForm); setOpen(true); }
  function openEdit(a: Addon) {
    setEditing(a);
    setForm({ name: a.name, description: a.description ?? "", category: a.category, price: String(a.price), priceType: a.priceType, isActive: a.isActive ?? true });
    setOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = { ...form, price: parseFloat(form.price) };
    if (editing) updateMutation.mutate({ id: editing.id, data: payload });
    else createMutation.mutate({ data: payload });
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  const byCategory = addons.reduce<Record<string, Addon[]>>((acc, a) => {
    (acc[a.category] ??= []).push(a); return acc;
  }, {});

  return (
    <>
      <div className="p-6 max-w-7xl mx-auto space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">Add-ons</h1>
            <p className="text-sm text-muted-foreground">{addons.length} add-ons in {Object.keys(byCategory).length} categories</p>
          </div>
          <Button size="sm" className="gap-2" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Add-on
          </Button>
        </div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-5">
                <Skeleton className="h-5 w-32 mb-3" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </div>
        ) : addons.length === 0 ? (
          <div className="text-center py-16">
            <Puzzle className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No add-ons yet</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(byCategory).map(([category, items]) => (
              <div key={category}>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: CATEGORY_COLORS[category] ?? "#6b7280" }} />
                  {category} ({items.length})
                </h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map((a) => (
                    <div key={a.id} className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-colors group">
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-medium text-sm">{a.name}</p>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(a)} className="p-1.5 text-muted-foreground hover:text-primary rounded-md hover:bg-primary/10">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button className="p-1.5 text-muted-foreground hover:text-destructive rounded-md hover:bg-destructive/10">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete add-on?</AlertDialogTitle>
                                <AlertDialogDescription>Delete "{a.name}"? This cannot be undone.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteMutation.mutate({ id: a.id })} className="bg-destructive text-white hover:bg-destructive/90">Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                      {a.description && <p className="text-xs text-muted-foreground mb-2">{a.description}</p>}
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-primary">{formatCurrency(a.price)}</span>
                        <span className="text-xs text-muted-foreground">/{a.priceType}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Add-on" : "Add Add-on"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category *</Label>
                <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="w-full h-9 rounded-md border border-input bg-input px-3 text-sm">
                  {ADDON_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Unit *</Label>
                <select value={form.priceType} onChange={(e) => setForm((f) => ({ ...f, priceType: e.target.value as PriceType }))} className="w-full h-9 rounded-md border border-input bg-input px-3 text-sm">
                  {["fixed", "sqft", "unit", "day", "month"].map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Unit Price (₹) *</Label>
                <Input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} required />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>{editing ? "Update" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    
    </>
  );
}
