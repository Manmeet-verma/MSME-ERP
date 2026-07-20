import { useState } from "react";
import {
  useListMembers, useListInvitations, useCreateInvitation,
  useRevokeInvitation, useUpdateMemberRole, useRemoveMember,
  getListMembersQueryKey, getListInvitationsQueryKey,
  type MemberRole, type InvitationInputRole,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getCurrentRole, getCurrentUser } from "@/lib/auth";
import { getLimits } from "@/lib/modules";
import { getCurrentOrg } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, Copy, Trash2, Mail } from "lucide-react";
import { formatDate } from "@/lib/format";

const ROLES: MemberRole[] = ["owner", "admin", "sales", "viewer"];
const INVITE_ROLES: InvitationInputRole[] = ["admin", "sales", "viewer"];

export default function MembersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const role = getCurrentRole();
  const me = getCurrentUser();
  const org = getCurrentOrg();
  const limits = getLimits(org);
  const canManage = role === "owner" || role === "admin";

  const { data: membersRaw } = useListMembers();
  const members = Array.isArray(membersRaw) ? membersRaw : [];
  const { data: invitesRaw } = useListInvitations();
  const invites = Array.isArray(invitesRaw) ? invitesRaw : [];

  const [form, setForm] = useState<{ email: string; role: InvitationInputRole }>({ email: "", role: "sales" });
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);

  const createInvite = useCreateInvitation({
    mutation: {
      onSuccess(data) {
        setLastInviteUrl(data.acceptUrl ?? null);
        setForm({ email: "", role: "sales" });
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
        <div>
          <h1 className="text-xl font-bold">Members</h1>
          <p className="text-sm text-muted-foreground">{members.length} active · {pendingInvites.length} pending · limit {limits.members}</p>
        </div>
      </div>

      {canManage && (
        <div className="bg-card border border-card-border rounded-xl p-6">
          <h2 className="font-semibold mb-4">Invite a teammate</h2>
          {atLimit && (
            <p className="text-xs text-amber-500 mb-3">You've reached your free-tier limit of {limits.members} seats.</p>
          )}
          <form onSubmit={(e) => { e.preventDefault(); createInvite.mutate({ data: form }); }} className="grid grid-cols-1 sm:grid-cols-[1fr_140px_auto] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="invEmail">Email</Label>
              <Input id="invEmail" type="email" required value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v as InvitationInputRole }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INVITE_ROLES.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
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
                    <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="ghost" onClick={() => { if (confirm("Remove this member?")) removeMember.mutate({ userId: m.userId }); }}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </>
              ) : (
                <span className="text-xs capitalize px-2 py-1 rounded bg-muted">{m.role}</span>
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
                  <p className="text-xs text-muted-foreground">Role: {i.role} · expires {formatDate(i.expiresAt)}</p>
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
