import { useState } from "react";
import { Link } from "wouter";
import { useListLeads, useCreateLead, useDeleteLead, useSyncIndiamartLeads } from "@workspace/api-client-react";
import type { Lead, LeadInput } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Phone, Mail, Building2, Download, Flame, Trash2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatCurrency } from "@/lib/format";

const emptyForm = {
  name: "", email: "", phone: "", company: "", city: "", state: "",
  source: "manual" as LeadInput["source"], budget: "", product: "", notes: "",
};

const PRIORITY_COLORS: Record<string, string> = {
  hot: "bg-red-500/15 text-red-400 border border-red-500/30",
  warm: "bg-orange-500/15 text-orange-400 border border-orange-500/30",
  cold: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
};
const STATUS_COLORS: Record<string, string> = {
  new: "bg-cyan-500/15 text-cyan-400",
  contacted: "bg-blue-500/15 text-blue-400",
  qualified: "bg-green-500/15 text-green-400",
  lost: "bg-gray-500/15 text-gray-400",
  won: "bg-emerald-500/15 text-emerald-400",
};

export default function LeadsPage() {
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data, isLoading } = useListLeads();
  const leads = (data ?? [])
    .filter((l) => priorityFilter === "all" || l.priority === priorityFilter)
    .filter((l) =>
      !search
        ? true
        : `${l.name} ${l.company ?? ""} ${l.email ?? ""} ${l.phone ?? ""}`.toLowerCase().includes(search.toLowerCase()),
    );

  const createMut = useCreateLead({
    mutation: {
      onSuccess() {
        toast({ title: "Lead created" });
        qc.invalidateQueries({ queryKey: ["/api/leads"] });
        setOpen(false);
        setForm(emptyForm);
      },
      onError() { toast({ title: "Failed to create lead", variant: "destructive" }); },
    },
  });
  const deleteMut = useDeleteLead({
    mutation: {
      onSuccess() {
        toast({ title: "Lead deleted" });
        qc.invalidateQueries({ queryKey: ["/api/leads"] });
      },
    },
  });
  const syncMut = useSyncIndiamartLeads({
    mutation: {
      onSuccess(d) {
        toast({ title: d.message ?? `Imported ${d.imported} leads` });
        qc.invalidateQueries({ queryKey: ["/api/leads"] });
      },
      onError(err: unknown) {
        const msg = (err as { response?: { data?: { message?: string; error?: string } } })?.response?.data;
        toast({ title: msg?.message ?? msg?.error ?? "IndiaMart sync failed", variant: "destructive" });
      },
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: LeadInput = {
      name: form.name,
      email: form.email || undefined,
      phone: form.phone || undefined,
      company: form.company || undefined,
      city: form.city || undefined,
      state: form.state || undefined,
      source: form.source,
      product: form.product || undefined,
      notes: form.notes || undefined,
      budget: form.budget ? Number(form.budget) : undefined,
    };
    createMut.mutate({ data: payload });
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold">Leads</h1>
          <p className="text-sm text-muted-foreground">{leads.length} leads</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => syncMut.mutate()} disabled={syncMut.isPending} className="gap-2">
            <Download className="h-4 w-4" /> Sync IndiaMart
          </Button>
          <Button size="sm" className="gap-2" onClick={() => { setForm(emptyForm); setOpen(true); }}>
            <Plus className="h-4 w-4" /> New Lead
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search leads..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2">
          {["all", "hot", "warm", "cold"].map((p) => (
            <button key={p}
              onClick={() => setPriorityFilter(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${priorityFilter === p ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading...</div>
      ) : leads.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <Flame className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No leads yet. Add one or sync from IndiaMart.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {leads.map((l: Lead) => (
            <div key={l.id} className="bg-card border border-card-border rounded-xl p-4 hover:border-primary/40 transition-all">
              <div className="flex items-start justify-between mb-2">
                <Link href={`/leads/${l.id}`}>
                  <a className="font-semibold text-foreground hover:text-primary">{l.name}</a>
                </Link>
                <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${PRIORITY_COLORS[l.priority]}`}>{l.priority}</span>
              </div>
              {l.company && <p className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="h-3 w-3" />{l.company}</p>}
              <div className="flex flex-col gap-1 mt-2 text-xs text-muted-foreground">
                {l.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{l.phone}</span>}
                {l.email && <span className="flex items-center gap-1 truncate"><Mail className="h-3 w-3" />{l.email}</span>}
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded ${STATUS_COLORS[l.status] ?? STATUS_COLORS.new}`}>{l.status}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Score {l.score}</span>
                  {l.budget != null && <span className="text-xs">{formatCurrency(l.budget)}</span>}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete lead?</AlertDialogTitle>
                        <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteMut.mutate({ id: l.id })}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              {l.nextAction && (
                <p className="mt-2 text-[11px] text-primary/80">→ {l.nextAction}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New lead</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div><Label>Name *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div><Label>Company</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              <div><Label>State</Label><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Budget (₹)</Label><Input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} /></div>
              <div><Label>Product interest</Label><Input value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} /></div>
            </div>
            <div><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
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
