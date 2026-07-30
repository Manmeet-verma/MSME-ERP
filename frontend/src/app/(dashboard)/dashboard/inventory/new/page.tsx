"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCreateItem } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";

const empty = { sku: "", name: "", category: "", unit: "pcs", hsnCode: "", gstRate: 18, salePrice: 0, purchasePrice: 0, openingStock: 0, lowStockThreshold: 0 };

export default function NewItemPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState(empty);
  const createMut = useCreateItem({
    mutation: {
      onSuccess() {
        toast({ title: "Item created" });
        router.push("/dashboard/items");
      },
      onError() { toast({ title: "Failed to create item", variant: "destructive" }); },
    },
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    createMut.mutate({
      data: {
        sku: form.sku, name: form.name,
        category: form.category || undefined,
        unit: form.unit, hsnCode: form.hsnCode || undefined,
        gstRate: Number(form.gstRate), salePrice: Number(form.salePrice),
        purchasePrice: Number(form.purchasePrice),
        openingStock: Number(form.openingStock),
        lowStockThreshold: Number(form.lowStockThreshold),
      } as any,
    });
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-lg mx-auto">
      <button onClick={() => router.push("/dashboard/items")} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to items
      </button>
      <h1 className="text-2xl font-bold mb-6">New Item</h1>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label>SKU *</Label>
          <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required placeholder="SKU-001" />
        </div>
        <div className="space-y-2">
          <Label>Name *</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Item name" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Category</Label>
            <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Category" />
          </div>
          <div className="space-y-2">
            <Label>Unit</Label>
            <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="pcs" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>HSN Code</Label>
          <Input value={form.hsnCode} onChange={(e) => setForm({ ...form, hsnCode: e.target.value })} placeholder="HSN code" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>GST %</Label>
            <Input type="number" value={form.gstRate} onChange={(e) => setForm({ ...form, gstRate: Number(e.target.value) })} />
          </div>
          <div className="space-y-2">
            <Label>Low-Stock Threshold</Label>
            <Input type="number" value={form.lowStockThreshold} onChange={(e) => setForm({ ...form, lowStockThreshold: Number(e.target.value) })} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Sale Price ₹</Label>
            <Input type="number" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: Number(e.target.value) })} />
          </div>
          <div className="space-y-2">
            <Label>Purchase Price ₹</Label>
            <Input type="number" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: Number(e.target.value) })} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Opening Stock</Label>
          <Input type="number" value={form.openingStock} onChange={(e) => setForm({ ...form, openingStock: Number(e.target.value) })} />
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={createMut.isPending} className="gap-2">
            {createMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Item
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/dashboard/items")}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
