import { useState } from "react";

import { useListClients, useCreateClient, useUpdateClient, useDeleteClient } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Users, Pencil, Trash2, Building2, Phone, Mail } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useQueryClient } from "@tanstack/react-query";
import type { Client } from "@workspace/api-client-react";

type ClientForm = { name: string; company: string; email: string; phone: string; address: string; gstNumber: string };
const emptyForm: ClientForm = { name: "", company: "", email: "", phone: "", address: "", gstNumber: "" };

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState<ClientForm>(emptyForm);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useListClients();
  const allClients = data ?? [];
  const clients = search
    ? allClients.filter((c) => `${c.name} ${c.company ?? ""} ${c.email ?? ""}`.toLowerCase().includes(search.toLowerCase()))
    : allClients;

  const createMutation = useCreateClient({
    mutation: {
      onSuccess() {
        toast({ title: "Client created" });
        qc.invalidateQueries({ queryKey: ["/api/clients"] });
        setOpen(false);
        setForm(emptyForm);
      },
      onError(err: unknown) {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
        toast({ title: msg ?? "Failed to create client", variant: "destructive" });
      },
    },
  });

  const updateMutation = useUpdateClient({
    mutation: {
      onSuccess() {
        toast({ title: "Client updated" });
        qc.invalidateQueries({ queryKey: ["/api/clients"] });
        setOpen(false);
        setEditing(null);
      },
      onError() { toast({ title: "Failed to update client", variant: "destructive" }); },
    },
  });

  const deleteMutation = useDeleteClient({
    mutation: {
      onSuccess() {
        toast({ title: "Client deleted" });
        qc.invalidateQueries({ queryKey: ["/api/clients"] });
      },
      onError() { toast({ title: "Failed to delete client", variant: "destructive" }); },
    },
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(c: Client) {
    setEditing(c);
    setForm({
      name: c.name,
      company: c.company ?? "",
      email: c.email ?? "",
      phone: c.phone ?? "",
      address: c.address ?? "",
      gstNumber: c.gstNumber ?? "",
    });
    setOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form });
    } else {
      createMutation.mutate({ data: form });
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <div className="p-6 max-w-7xl mx-auto space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">Clients</h1>
            <p className="text-sm text-muted-foreground">{clients.length} clients</p>
          </div>
          <Button size="sm" className="gap-2" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Client
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-5">
                <Skeleton className="h-5 w-32 mb-3" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))
          ) : clients.length === 0 ? (
            <div className="col-span-3 text-center py-16">
              <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No clients yet</p>
              <button onClick={openCreate} className="text-xs text-primary hover:underline mt-1">Add your first client</button>
            </div>
          ) : (
            clients.map((c) => (
              <div key={c.id} className="rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-colors group">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-sm">{c.name}</p>
                    {c.company && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Building2 className="h-3 w-3" /> {c.company}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(c)} className="p-1.5 text-muted-foreground hover:text-primary rounded-md hover:bg-primary/10">
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
                          <AlertDialogTitle>Delete client?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete {c.name}. This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate({ id: c.id })}
                            className="bg-destructive text-white hover:bg-destructive/90"
                          >Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  {c.email && <p className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> {c.email}</p>}
                  {c.phone && <p className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {c.phone}</p>}
                  {c.gstNumber && <p className="font-mono text-[10px] bg-secondary px-2 py-0.5 rounded w-fit">GST: {c.gstNumber}</p>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create/Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Client" : "Add Client"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label>Name *</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Company</Label>
                <Input value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Address</Label>
                <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>GST Number</Label>
                <Input value={form.gstNumber} onChange={(e) => setForm((f) => ({ ...f, gstNumber: e.target.value }))} />
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
