"use client";

import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListExpenses,
  useListExpenseCategories,
  useCreateExpense,
  useDeleteExpense,
  useCreateExpenseCategory,
} from "@workspace/api-client-react";
import type { Expense, ExpensePaymentMethod } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/lib/format";
import { Plus, Receipt, Trash2, Tag, Upload } from "lucide-react";
import { DraggableTh } from "@/components/draggable-th";
import { useColumnReorder } from "@/hooks/use-column-reorder";
import { getAuthToken } from "@/lib/auth";

type Form = {
  expenseDate: string; categoryId: number | null;
  vendorName: string; description: string; amount: number; gstRate: number;
  paymentMethod: ExpensePaymentMethod;
  receiptUrl: string; notes: string;
};
const today = () => new Date().toISOString().slice(0, 10);
const empty = (): Form => ({
  expenseDate: today(), categoryId: null, vendorName: "", description: "",
  amount: 0, gstRate: 0, paymentMethod: "cash", receiptUrl: "", notes: "",
});

export default function ExpensesPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: expensesRaw } = useListExpenses();
  const expenses = Array.isArray(expensesRaw) ? expensesRaw : [];
  const { data: categoriesRaw } = useListExpenseCategories();
  const categories = Array.isArray(categoriesRaw) ? categoriesRaw : [];
  const [open, setOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [form, setForm] = useState<Form>(empty);
  const [catName, setCatName] = useState("");
  const [catCode, setCatCode] = useState("5900");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const colReorder = useColumnReorder();

  const inv = () => qc.invalidateQueries({ queryKey: ["/api/expenses"] });
  const createMut = useCreateExpense({
    mutation: {
      onSuccess() { toast({ title: "Expense added" }); inv(); setOpen(false); setForm(empty()); },
      onError() { toast({ title: "Failed to add expense", variant: "destructive" }); },
    },
  });
  const deleteMut = useDeleteExpense({
    mutation: {
      onSuccess() { toast({ title: "Expense deleted" }); inv(); },
      onError() { toast({ title: "Failed to delete expense", variant: "destructive" }); },
    },
  });
  const createCat = useCreateExpenseCategory({
    mutation: { onSuccess() {
      qc.invalidateQueries({ queryKey: ["/api/expense-categories"] });
      setCatOpen(false); setCatName("");
      toast({ title: "Category created" });
    }, onError() { toast({ title: "Failed to create category", variant: "destructive" }); } },
  });

  async function uploadReceipt(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/uploads", {
        method: "POST",
        headers: { Authorization: `Bearer ${getAuthToken() ?? ""}` },
        body: fd,
      });
      const j = await res.json();
      if (j.url) {
        setForm((f) => ({ ...f, receiptUrl: j.url }));
        toast({ title: "Receipt uploaded" });
      } else {
        toast({ title: "Upload failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  const catMap = new Map(categories.map((c) => [c.id, c]));
  const total = expenses.reduce((s, e) => s + e.total, 0);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Receipt className="h-5 w-5" /> Expenses</h1>
          <p className="text-sm text-muted-foreground">{expenses.length} expenses · {formatCurrency(total)} total</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-2" onClick={() => setCatOpen(true)}><Tag className="h-4 w-4" /> Categories</Button>
          <Button size="sm" className="gap-2" onClick={() => { setForm(empty()); setOpen(true); }}><Plus className="h-4 w-4" /> Add expense</Button>
        </div>
      </div>

      {expenses.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <Receipt className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No expenses yet</p>
        </div>
      ) : (
        <>
          <p className="text-[11px] text-muted-foreground">Drag column headers to reorder</p>
          <div className="rounded-xl border border-border bg-card overflow-x-auto hidden sm:block">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground border-b border-border">
                <tr>
                  <DraggableTh idx={0} {...colReorder} className="p-3">Date</DraggableTh>
                  <DraggableTh idx={1} {...colReorder} className="p-3">Category</DraggableTh>
                  <DraggableTh idx={2} {...colReorder} className="p-3">Description</DraggableTh>
                  <DraggableTh idx={3} {...colReorder} className="p-3">Vendor</DraggableTh>
                  <DraggableTh idx={4} {...colReorder} className="p-3 text-right">Amount</DraggableTh>
                  <DraggableTh idx={5} {...colReorder} className="p-3 text-right">GST</DraggableTh>
                  <DraggableTh idx={6} {...colReorder} className="p-3 text-right">Total</DraggableTh>
                  <DraggableTh idx={7} {...colReorder} className="p-3"></DraggableTh>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e: Expense) => (
                  <tr key={e.id} className="border-b border-border/50 hover:bg-secondary/30">
                    <td className="p-3">{formatDate(e.expenseDate)}</td>
                    <td className="p-3 text-xs">{e.categoryId ? catMap.get(e.categoryId)?.name ?? "—" : "—"}</td>
                    <td className="p-3 text-xs">{e.description ?? "—"}</td>
                    <td className="p-3 text-xs">{e.vendorName ?? "—"}</td>
                    <td className="p-3 text-right">{formatCurrency(e.amount)}</td>
                    <td className="p-3 text-right text-xs">{formatCurrency(e.gstAmount)}</td>
                    <td className="p-3 text-right font-semibold">{formatCurrency(e.total)}</td>
                    <td className="p-3 text-right">
                      {e.receiptUrl && <a href={e.receiptUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline mr-2">Receipt</a>}
                      <button onClick={() => { if (confirm("Delete this expense?")) deleteMut.mutate({ id: e.id }); }} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="sm:hidden space-y-3">
            {expenses.map((e: Expense) => (
              <div key={e.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{formatDate(e.expenseDate)}</span>
                  <span className="text-xs text-muted-foreground">{e.categoryId ? catMap.get(e.categoryId)?.name ?? "—" : "—"}</span>
                </div>
                <p className="text-sm font-medium">{e.description ?? "—"}</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{e.vendorName ?? "—"}</span>
                  <span className="font-semibold">{formatCurrency(e.total)}</span>
                </div>
                <div className="flex items-center justify-end gap-2">
                  {e.receiptUrl && <a href={e.receiptUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">Receipt</a>}
                  <button onClick={() => { if (confirm("Delete this expense?")) deleteMut.mutate({ id: e.id }); }} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add expense</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createMut.mutate({ data: form }); }} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>Date</Label><Input type="date" value={form.expenseDate} onChange={(e) => setForm((f) => ({ ...f, expenseDate: e.target.value }))} /></div>
              <div><Label>Category</Label>
                <select className="w-full h-10 px-3 rounded-md border border-input bg-background" value={form.categoryId ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value ? Number(e.target.value) : null }))}>
                  <option value="">(none)</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="col-span-2"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></div>
              <div><Label>Vendor</Label><Input value={form.vendorName} onChange={(e) => setForm((f) => ({ ...f, vendorName: e.target.value }))} /></div>
              <div><Label>Payment</Label>
                <select className="w-full h-10 px-3 rounded-md border border-input bg-background" value={form.paymentMethod}
                  onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value as ExpensePaymentMethod }))}>
                  {(["cash", "bank", "upi", "card", "cheque", "other"] as const).map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div><Label>Amount (₹)</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))} required /></div>
              <div><Label>GST %</Label><Input type="number" step="0.01" value={form.gstRate} onChange={(e) => setForm((f) => ({ ...f, gstRate: Number(e.target.value) }))} /></div>
              <div className="col-span-2">
                <Label>Receipt</Label>
                <div className="flex gap-2 items-center">
                  <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadReceipt(f); }} />
                  <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}><Upload className="h-3 w-3 mr-1" />{uploading ? "Uploading…" : "Upload photo"}</Button>
                  {form.receiptUrl && <a href={form.receiptUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">View attached</a>}
                </div>
              </div>
              <div className="col-span-2"><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></div>
            </div>
            <div className="rounded-md bg-secondary/40 p-2 text-xs text-muted-foreground flex justify-between">
              <span>GST amount</span>
              <span>{formatCurrency(form.amount * form.gstRate / 100)}</span>
            </div>
            <div className="rounded-md bg-primary/10 p-2 text-sm flex justify-between font-semibold">
              <span>Total</span>
              <span>{formatCurrency(form.amount + form.amount * form.gstRate / 100)}</span>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMut.isPending}>Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={catOpen} onOpenChange={setCatOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Expense categories</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {categories.map((c) => (
              <div key={c.id} className="flex justify-between items-center text-sm p-2 border-b border-border">
                <span>{c.name}{c.isSystem ? " (system)" : ""}</span>
                <span className="text-[10px] text-muted-foreground font-mono">{c.accountCode}</span>
              </div>
            ))}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); if (catName) createCat.mutate({ data: { name: catName, accountCode: catCode } }); }} className="space-y-2 border-t border-border pt-3">
            <Label>New category</Label>
            <div className="flex gap-2">
              <Input placeholder="Name" value={catName} onChange={(e) => setCatName(e.target.value)} />
              <Input placeholder="Acct code" className="w-24" value={catCode} onChange={(e) => setCatCode(e.target.value)} />
              <Button size="sm" type="submit">Add</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
