import { useState } from "react";
import { Layout } from "@/components/layout";
import { useListUsers, useCreateUser, useUpdateUser, useDeleteUser } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, ShieldCheck, Pencil, Trash2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useQueryClient } from "@tanstack/react-query";
import type { User } from "@workspace/api-client-react";

type UserForm = { name: string; email: string; password: string; role: string };
const emptyForm: UserForm = { name: "", email: "", password: "", role: "sales" };

const ROLE_COLORS: Record<string, string> = {
  admin: "#ef4444", sales: "#3b82f6", viewer: "#6b7280",
};

export default function UsersPage() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useListUsers();
  const users = data ?? [];

  const createMutation = useCreateUser({
    mutation: {
      onSuccess() {
        toast({ title: "User created" });
        qc.invalidateQueries({ queryKey: ["/api/users"] });
        setOpen(false); setForm(emptyForm);
      },
      onError(err) {
        const msg = (err as { data?: { error?: string } })?.data?.error ?? "Failed to create user";
        toast({ title: msg, variant: "destructive" });
      },
    },
  });

  const updateMutation = useUpdateUser({
    mutation: {
      onSuccess() {
        toast({ title: "User updated" });
        qc.invalidateQueries({ queryKey: ["/api/users"] });
        setOpen(false); setEditing(null);
      },
      onError() { toast({ title: "Failed to update user", variant: "destructive" }); },
    },
  });

  const deleteMutation = useDeleteUser({
    mutation: {
      onSuccess() {
        toast({ title: "User deleted" });
        qc.invalidateQueries({ queryKey: ["/api/users"] });
      },
      onError() { toast({ title: "Failed to delete", variant: "destructive" }); },
    },
  });

  function openCreate() { setEditing(null); setForm(emptyForm); setOpen(true); }
  function openEdit(u: User) {
    setEditing(u);
    setForm({ name: u.name, email: u.email, password: "", role: u.role });
    setOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editing) {
      const { password, ...rest } = form;
      updateMutation.mutate({ id: editing.id, data: password ? form : rest });
    } else {
      createMutation.mutate({ data: form });
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;
  const currentUser = (() => { try { return JSON.parse(localStorage.getItem("led_user") ?? "{}"); } catch { return {}; } })();

  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">Users</h1>
            <p className="text-sm text-muted-foreground">{users.length} team members</p>
          </div>
          {currentUser.role === "admin" && (
            <Button size="sm" className="gap-2" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Add User
            </Button>
          )}
        </div>

        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-card">
              <tr className="border-b border-border">
                <th className="text-left font-medium text-muted-foreground text-xs px-5 py-3">User</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">Role</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">Status</th>
                {currentUser.role === "admin" && (
                  <th className="text-right font-medium text-muted-foreground text-xs px-5 py-3">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="px-5 py-4"><Skeleton className="h-4 w-40" /></td>
                    <td className="px-3 py-4"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-3 py-4"><Skeleton className="h-4 w-12" /></td>
                    {currentUser.role === "admin" && <td className="px-5 py-4"><Skeleton className="h-4 w-16 ml-auto" /></td>}
                  </tr>
                ))
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-b border-border/50 hover:bg-card/40 transition-colors group">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-xs">{u.name}</p>
                          <p className="text-[10px] text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <Badge
                        variant="outline"
                        className="text-[10px] capitalize gap-1"
                        style={{ color: ROLE_COLORS[u.role], borderColor: ROLE_COLORS[u.role] + "40" }}
                      >
                        <ShieldCheck className="h-3 w-3" />
                        {u.role}
                      </Badge>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`text-[10px] font-medium ${u.isActive ? "text-green-400" : "text-muted-foreground"}`}>
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    {currentUser.role === "admin" && (
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(u)} className="p-1.5 text-muted-foreground hover:text-primary rounded-md hover:bg-primary/10">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          {u.id !== currentUser.id && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button className="p-1.5 text-muted-foreground hover:text-destructive rounded-md hover:bg-destructive/10">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete user?</AlertDialogTitle>
                                  <AlertDialogDescription>Delete {u.name}? This cannot be undone.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteMutation.mutate({ id: u.id })} className="bg-destructive text-white hover:bg-destructive/90">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editing ? "Edit User" : "Add User"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>{editing ? "New Password (leave blank to keep)" : "Password *"}</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required={!editing} />
            </div>
            <div className="space-y-1.5">
              <Label>Role *</Label>
              <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} className="w-full h-9 rounded-md border border-input bg-input px-3 text-sm">
                <option value="admin">Admin</option>
                <option value="sales">Sales</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>{editing ? "Update" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
