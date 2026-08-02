"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCurrentRole, getToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Shield, Plus, Pencil, Trash2, X, Lock, Star,
} from "lucide-react";

const API_BASE = "";

function authHeaders() {
  return { Authorization: `Bearer ${getToken() ?? ""}`, "Content-Type": "application/json" };
}

interface Role {
  id: string;
  organizationId: string;
  key: string;
  name: string;
  description: string;
  isSystem: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function RolesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const role = getCurrentRole();
  const isOwner = role === "owner";

  const [showForm, setShowForm] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: rolesRaw, isLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/roles`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to load roles");
      return res.json() as Promise<Role[]>;
    },
  });
  const roles: Role[] = Array.isArray(rolesRaw) ? rolesRaw : [];

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/roles`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ name: formName, description: formDesc }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Could not create role", description: data.error ?? "Try again", variant: "destructive" });
        return;
      }
      toast({ title: "Role created", description: `"${formName}" has been added` });
      setFormName("");
      setFormDesc("");
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    } catch {
      toast({ title: "Could not create role", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingRole) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/roles/${editingRole.id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ name: formName, description: formDesc }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Could not update role", description: data.error ?? "Try again", variant: "destructive" });
        return;
      }
      toast({ title: "Role updated" });
      setEditingRole(null);
      setFormName("");
      setFormDesc("");
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    } catch {
      toast({ title: "Could not update role", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(r: Role) {
    if (!confirm(`Delete the "${r.name}" role? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/roles/${r.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Could not delete role", description: data.error ?? "Try again", variant: "destructive" });
        return;
      }
      toast({ title: "Role deleted" });
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    } catch {
      toast({ title: "Could not delete role", variant: "destructive" });
    }
  }

  function startEdit(r: Role) {
    setEditingRole(r);
    setFormName(r.name);
    setFormDesc(r.description);
    setShowForm(false);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingRole(null);
    setFormName("");
    setFormDesc("");
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Roles</h1>
          <p className="text-sm text-muted-foreground">
            {roles.length} roles · {roles.filter((r) => r.isSystem).length} system · {roles.filter((r) => !r.isSystem).length} custom
          </p>
        </div>
      </div>

      {/* Add Role Button / Form */}
      {isOwner && !showForm && !editingRole && (
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add New Role
        </Button>
      )}

      {(showForm || editingRole) && (
        <div className="bg-card border border-card-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">{editingRole ? `Edit "${editingRole.name}"` : "Create New Role"}</h2>
            <Button variant="ghost" size="sm" onClick={cancelForm}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <form onSubmit={editingRole ? handleUpdate : handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="rName">Role Name *</Label>
                <Input
                  id="rName"
                  required
                  maxLength={50}
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Junior Sales Executive"
                />
                <p className="text-[11px] text-muted-foreground">
                  A key will be auto-generated: {formName ? formName.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "") : "role_name"}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rDesc">Description</Label>
                <Textarea
                  id="rDesc"
                  rows={3}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="What is this role responsible for?"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingRole ? "Save Changes" : "Create Role"}
              </Button>
              <Button type="button" variant="outline" onClick={cancelForm}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {/* Roles Table */}
      <div className="bg-card border border-card-border rounded-xl">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold">All Roles</h2>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
        ) : roles.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No roles found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 font-medium text-muted-foreground">Role</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Key</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Description</th>
                  <th className="text-center p-4 font-medium text-muted-foreground">Type</th>
                  {(isOwner || role === "admin") && (
                    <th className="text-right p-4 font-medium text-muted-foreground">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {roles.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{r.name}</span>
                        {r.isDefault && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary font-medium">Default</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{r.key}</code>
                    </td>
                    <td className="p-4 text-muted-foreground max-w-xs truncate">{r.description || "—"}</td>
                    <td className="p-4 text-center">
                      {r.isSystem ? (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Lock className="h-3 w-3" /> System
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                          <Star className="h-3 w-3" /> Custom
                        </span>
                      )}
                    </td>
                    {(isOwner || role === "admin") && (
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEdit(r)}
                            title="Edit role"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          {!r.isSystem && isOwner && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(r)}
                              title="Delete role"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-card border border-card-border rounded-xl p-4">
        <h3 className="font-semibold text-sm mb-2">About Roles</h3>
        <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
          <li><strong>System roles</strong> (Owner, Admin, Sales, Sales Executive, Viewer) cannot be deleted but can be renamed by the owner.</li>
          <li><strong>Custom roles</strong> can be created, edited, and deleted by the owner.</li>
          <li>When creating a member, all roles (system + custom) appear in the role dropdown.</li>
          <li>Members using a custom role cannot have that role deleted until reassigned.</li>
        </ul>
      </div>
    </div>
  );
}
