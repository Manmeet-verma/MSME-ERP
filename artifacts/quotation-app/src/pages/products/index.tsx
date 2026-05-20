import { useState } from "react";

import { useListProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Package, Pencil, Trash2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useQueryClient } from "@tanstack/react-query";
import type { Product } from "@workspace/api-client-react";

type ProdForm = {
  name: string; description: string; category: string;
  pixelPitch: string; brightness: string; resolution: string;
  basePrice: string; unit: string; isActive: boolean;
};
const emptyForm: ProdForm = {
  name: "", description: "", category: "indoor",
  pixelPitch: "", brightness: "", resolution: "",
  basePrice: "", unit: "sqft", isActive: true,
};

const CATEGORIES = ["indoor", "outdoor", "flexible", "transparent", "rental", "creative"];

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProdForm>(emptyForm);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useListProducts();
  const allProducts = data ?? [];
  const products = search
    ? allProducts.filter((p) => `${p.name} ${p.category}`.toLowerCase().includes(search.toLowerCase()))
    : allProducts;

  const createMutation = useCreateProduct({
    mutation: {
      onSuccess() {
        toast({ title: "Product created" });
        qc.invalidateQueries({ queryKey: ["/api/products"] });
        setOpen(false);
        setForm(emptyForm);
      },
      onError() { toast({ title: "Failed", variant: "destructive" }); },
    },
  });

  const updateMutation = useUpdateProduct({
    mutation: {
      onSuccess() {
        toast({ title: "Product updated" });
        qc.invalidateQueries({ queryKey: ["/api/products"] });
        setOpen(false);
        setEditing(null);
      },
      onError() { toast({ title: "Failed", variant: "destructive" }); },
    },
  });

  const deleteMutation = useDeleteProduct({
    mutation: {
      onSuccess() {
        toast({ title: "Product deleted" });
        qc.invalidateQueries({ queryKey: ["/api/products"] });
      },
      onError() { toast({ title: "Failed to delete", variant: "destructive" }); },
    },
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({
      name: p.name,
      description: p.description ?? "",
      category: p.category,
      pixelPitch: p.pixelPitch ?? "",
      brightness: p.brightness ?? "",
      resolution: p.resolution ?? "",
      basePrice: String(p.basePrice),
      unit: p.unit,
      isActive: p.isActive ?? true,
    });
    setOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      ...form,
      basePrice: parseFloat(form.basePrice),
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      createMutation.mutate({ data: payload });
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  const CATEGORY_COLOR: Record<string, string> = {
    indoor: "hsl(217 91% 60%)", outdoor: "hsl(142 71% 45%)",
    flexible: "hsl(38 92% 50%)", transparent: "hsl(188 90% 45%)",
    rental: "hsl(271 91% 65%)", creative: "hsl(0 72% 51%)",
  };

  return (
    <>
      <div className="p-6 max-w-7xl mx-auto space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">Products</h1>
            <p className="text-sm text-muted-foreground">{products.length} products in catalog</p>
          </div>
          <Button size="sm" className="gap-2" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Product
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-card">
              <tr className="border-b border-border">
                <th className="text-left font-medium text-muted-foreground text-xs px-5 py-3">Product</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">Category</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">Pitch / Brightness</th>
                <th className="text-right font-medium text-muted-foreground text-xs px-3 py-3">Unit Price</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">Unit</th>
                <th className="text-right font-medium text-muted-foreground text-xs px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <Package className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">No products yet</p>
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-card/40 transition-colors group">
                    <td className="px-5 py-3">
                      <p className="font-medium text-xs">{p.name}</p>
                      {p.description && <p className="text-[10px] text-muted-foreground mt-0.5 max-w-xs truncate">{p.description}</p>}
                    </td>
                    <td className="px-3 py-3">
                      <Badge
                        variant="outline"
                        className="text-[10px] capitalize"
                        style={{ color: CATEGORY_COLOR[p.category], borderColor: CATEGORY_COLOR[p.category] + "40" }}
                      >
                        {p.category}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">
                      {p.pixelPitch && <span className="mr-2">P{p.pixelPitch}</span>}
                      {p.brightness && <span>{p.brightness} nits</span>}
                    </td>
                    <td className="px-3 py-3 text-right text-xs font-semibold">{formatCurrency(p.basePrice)}</td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">/{p.unit}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(p)} className="p-1.5 text-muted-foreground hover:text-primary rounded-md hover:bg-primary/10">
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
                              <AlertDialogTitle>Delete product?</AlertDialogTitle>
                              <AlertDialogDescription>Delete "{p.name}"? This cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate({ id: p.id })}
                                className="bg-destructive text-white hover:bg-destructive/90"
                              >Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Product" : "Add Product"}</DialogTitle>
          </DialogHeader>
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
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full h-9 rounded-md border border-input bg-input px-3 text-sm"
                >
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Unit *</Label>
                <select
                  value={form.unit}
                  onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                  className="w-full h-9 rounded-md border border-input bg-input px-3 text-sm"
                >
                  <option value="sqft">sqft</option>
                  <option value="sqm">sqm</option>
                  <option value="piece">piece</option>
                  <option value="panel">panel</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Unit Price (₹) *</Label>
                <Input type="number" min="0" step="0.01" value={form.basePrice} onChange={(e) => setForm((f) => ({ ...f, basePrice: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>Min Order</Label>
              </div>
              <div className="space-y-1.5">
                <Label>Pixel Pitch</Label>
                <Input placeholder="e.g. 3" value={form.pixelPitch} onChange={(e) => setForm((f) => ({ ...f, pixelPitch: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Brightness (nits)</Label>
                <Input placeholder="e.g. 1000" value={form.brightness} onChange={(e) => setForm((f) => ({ ...f, brightness: e.target.value }))} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Resolution</Label>
                <Input placeholder="e.g. 192×192 per module" value={form.resolution} onChange={(e) => setForm((f) => ({ ...f, resolution: e.target.value }))} />
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
