import { useState } from "react";
import {
  useListMembers, useListInvitations, useCreateInvitation,
  useRevokeInvitation, useUpdateMemberRole, useRemoveMember,
  getListMembersQueryKey, getListInvitationsQueryKey,
  type MemberRole, type InvitationInputRole,
} from "@workspace/api-client-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { getCurrentRole, getCurrentUser, getAuthToken } from "@/lib/auth";
import { getLimits } from "@/lib/modules";
import { getCurrentOrg } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, Copy, Trash2, Mail, UserCog, Link as LinkIcon } from "lucide-react";
import { formatDate } from "@/lib/format";

const API_BASE = import.meta.env.DEV
  ? ""
  : "https://msme-erp-api-3s11.onrender.com";

function authHeaders() {
  return { Authorization: `Bearer ${getAuthToken() ?? ""}`, "Content-Type": "application/json" };
}

interface ApiRole {
  id: string;
  key: string;
  name: string;
  description: string;
  isSystem: boolean;
  isDefault: boolean;
}

export default function MembersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const role = getCurrentRole();
  const me = getCurrentUser();
  const org = getCurrentOrg();
  const limits = getLimits(org);
  const canManage = role === "owner" || role === "admin";

  // Fetch roles from API
  const { data: rolesRaw } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/roles`, { headers: authHeaders() });
      if (!res.ok) return [];
      return res.json() as Promise<ApiRole[]>;
    },
  });
  const apiRoles: ApiRole[] = Array.isArray(rolesRaw) ? rolesRaw : [];
  // Build display map and lists from API data
  const ROLE_DISPLAY: Record<string, string> = {};
  for (const r of apiRoles) ROLE_DISPLAY[r.key] = r.name;
  const ALL_ROLE_KEYS = apiRoles.map((r) => r.key);
  // Exclude owner from invite/create options
  const INVITE_ROLE_KEYS = apiRoles.filter((r) => r.key !== "owner").map((r) => r.key);
  // For the existing role dropdown on member list, allow all roles
  const MEMBER_ROLE_KEYS = ALL_ROLE_KEYS;

  const { data: membersRaw } = useListMembers();
  const members = Array.isArray(membersRaw) ? membersRaw : [];
  const { data: invitesRaw } = useListInvitations();
  const invites = Array.isArray(invitesRaw) ? invitesRaw : [];

  const defaultRole = apiRoles.find((r) => r.isDefault)?.key ?? "sales_executive";
  const [form, setForm] = useState<{ email: string; role: string }>({ email: "", role: defaultRole });
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState({ name: "", email: "", password: "", role: defaultRole });
  const [creating, setCreating] = useState(false);

  const createInvite = useCreateInvitation({
    mutation: {
      onSuccess(data) {
        setLastInviteUrl(data.acceptUrl ?? null);
        setForm({ email: "", role: defaultRole });
        queryClient.invalidateQueries({ queryKey: getListInvitationsQueryKey() });
        toast({ title: "Invitation created", description: "Share the link with your teammate" });
      },
      onError(err) {
        toast({
          title: "Could not invite",
          description: (err as { data?: { error?: string } })?.data?.error ?? "Try again",
          variant: "destructive",
        });
      },
    },
  });

  const revokeInvite = useRevokeInvitation({
    mutation: {
      onSuccess() {
        queryClient.invalidateQueries({ queryKey: getListInvitationsQueryKey() });
      },
    },
  });

  async function handleCreateMember(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch(`${API_BASE}/api/organizations/current/members`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Could not create member", description: data.error ?? "Try again", variant: "destructive" });
        return;
      }
      toast({ title: "Member created", description: `${createForm.name} has been added as ${ROLE_DISPLAY[createForm.role] ?? createForm.role}` });
      setCreateForm({ name: "", email: "", password: "", role: defaultRole });
      queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
    } catch {
      toast({ title: "Could not create member", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  }

  const updateRole = useUpdateMemberRole({
    mutation: {
      onSuccess() {
        queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
      },
    },
  });

  const removeMember = useRemoveMember({
    mutation: {
      onSuccess() {
        queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
      },
    },
  });

  const pendingInvites = invites.filter((i) => !i.acceptedAt);
  const teamCount = members.length + pendingInvites.length;
  const atLimit = teamCount >= limits.members;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
          <UserPlus className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Members</h1>
          <p className="text-sm text-muted-foreground">{members.length} active · {pendingInvites.length} pending · limit {limits.members}</p>
        </div>
        {canManage && (
          <a href="/settings/roles" className="text-xs text-primary hover:underline flex items-center gap-1">
            Manage Roles <LinkIcon className="h-3 w-3" />
          </a>
        )}
      </div>

      {canManage && (
        <div className="bg-card border border-card-border rounded-xl p-6">
          <h2 className="font-semibold mb-4">Invite a teammate</h2>
          {atLimit && (
            <p className="text-xs text-amber-500 mb-3">You've reached your free-tier limit of {limits.members} seats.</p>
          )}
          <form onSubmit={(e) => { e.preventDefault(); createInvite.mutate({ data: { email: form.email, role: form.role as any } }); }} className="grid grid-cols-1 sm:grid-cols-[1fr_140px_auto] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="invEmail">Email</Label>
              <Input id="invEmail" type="email" required value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INVITE_ROLE_KEYS.map((k) => <SelectItem key={k} value={k}>{ROLE_DISPLAY[k] ?? k}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={createInvite.isPending || atLimit} className="w-full sm:w-auto">
                {createInvite.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Send invite
              </Button>
            </div>
          </form>
          {lastInviteUrl && (
            <div className="mt-4 p-3 bg-primary/10 border border-primary/30 rounded-lg flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary shrink-0" />
              <code className="text-xs flex-1 truncate">{lastInviteUrl}</code>
              <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(lastInviteUrl); toast({ title: "Copied" }); }}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      )}

      {canManage && (
        <div className="bg-card border border-card-border rounded-xl p-6">
          <h2 className="font-semibold mb-1 flex items-center gap-2">
            <UserCog className="h-4 w-4 text-primary" /> Create member directly
          </h2>
          <p className="text-xs text-muted-foreground mb-4">Create an account and add them to your organization immediately. They can log in with the credentials you set.</p>
          <form onSubmit={handleCreateMember} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_140px_auto] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cName">Full Name</Label>
              <Input id="cName" required value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Rupinder Singh" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cEmail">Email</Label>
              <Input id="cEmail" type="email" required value={createForm.email}
                onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))} placeholder="rupinder@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cPassword">Password</Label>
              <Input id="cPassword" type="password" required minLength={8} value={createForm.password}
                onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))} placeholder="Min 8 characters" />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={createForm.role} onValueChange={(v) => setCreateForm((f) => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INVITE_ROLE_KEYS.map((k) => <SelectItem key={k} value={k}>{ROLE_DISPLAY[k] ?? k}</SelectItem>)}
                </SelectContent>
              </Select>
              {canManage && (
                <p className="text-[11px] text-muted-foreground">
                  Need a new role? <a href="/settings/roles" className="text-primary hover:underline">Create one in Roles settings</a>
                </p>
              )}
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={creating} className="w-full sm:w-auto">
                {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Account
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-card border border-card-border rounded-xl">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold">Active members</h2>
        </div>
        <div className="divide-y divide-border">
          {members.map((m) => (
            <div key={m.userId} className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                {m.name?.charAt(0)?.toUpperCase() ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{m.name} {me?.id === m.userId && <span className="text-xs text-muted-foreground">(you)</span>}</p>
                <p className="text-xs text-muted-foreground truncate">{m.email}</p>
              </div>
              {canManage && me?.id !== m.userId ? (
                <>
                  <Select value={m.role} onValueChange={(v) => updateRole.mutate({ userId: m.userId, data: { role: v as MemberRole } })} disabled={m.role === "owner"}>
                    <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MEMBER_ROLE_KEYS.map((k) => <SelectItem key={k} value={k}>{ROLE_DISPLAY[k] ?? k}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="ghost" onClick={() => { if (confirm("Remove this member?")) removeMember.mutate({ userId: m.userId }); }}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </>
              ) : (
                <span className="text-xs px-2 py-1 rounded bg-muted">{ROLE_DISPLAY[m.role] ?? m.role}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {pendingInvites.length > 0 && (
        <div className="bg-card border border-card-border rounded-xl">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold">Pending invitations</h2>
          </div>
          <div className="divide-y divide-border">
            {pendingInvites.map((i) => (
              <div key={i.id} className="p-4 flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{i.email}</p>
                  <p className="text-xs text-muted-foreground">Role: {ROLE_DISPLAY[i.role] ?? i.role} · expires {formatDate(i.expiresAt)}</p>
                </div>
                {canManage && (
                  <Button size="sm" variant="ghost" onClick={() => revokeInvite.mutate({ id: i.id })}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
