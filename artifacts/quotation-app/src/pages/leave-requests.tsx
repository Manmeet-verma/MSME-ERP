import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListLeaveRequests,
  useCreateLeaveRequest,
  useApproveLeaveRequest,
  useRejectLeaveRequest,
  useListEmployees,
  useGetLeaveBalances,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getCurrentRole } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { Plane, Plus, Check, X, Clock } from "lucide-react";

const LEAVE_TYPES = ["casual", "sick", "earned", "unpaid"];

function StatusBadge({ status }: { status: string }) {
  if (status === "approved") return <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">Approved</Badge>;
  if (status === "rejected") return <Badge className="bg-red-500/20 text-red-300 border-red-500/30">Rejected</Badge>;
  return <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">Pending</Badge>;
}

export default function LeaveRequestsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const role = getCurrentRole();
  const isApprover = role === "owner" || role === "admin";

  const { data: requests = [] } = useListLeaveRequests();
  const { data: employees = [] } = useListEmployees();
  const { data: balances = [] } = useGetLeaveBalances();

  const empMap = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);
  const balMap = useMemo(() => new Map(balances.map((b) => [b.employeeId, b])), [balances]);

  const pending = requests.filter((r) => r.status === "pending");
  const decided = requests.filter((r) => r.status !== "pending");

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    employeeId: "",
    leaveType: "casual",
    fromDate: new Date().toISOString().slice(0, 10),
    toDate: new Date().toISOString().slice(0, 10),
    reason: "",
  });

  function refresh() {
    qc.invalidateQueries({ queryKey: ["/api/leave-requests"] });
    qc.invalidateQueries({ queryKey: ["/api/leaves/balances"] });
    qc.invalidateQueries({ queryKey: ["/api/attendance"] });
  }

  const createMut = useCreateLeaveRequest({
    mutation: {
      onSuccess() {
        toast({ title: "Leave request submitted" });
        setOpen(false);
        setForm({ ...form, reason: "" });
        refresh();
      },
      onError(err: unknown) {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Could not submit";
        toast({ title: msg, variant: "destructive" });
      },
    },
  });
  const approveMut = useApproveLeaveRequest({
    mutation: {
      onSuccess() { toast({ title: "Leave approved" }); refresh(); },
      onError() { toast({ title: "Could not approve", variant: "destructive" }); },
    },
  });
  const rejectMut = useRejectLeaveRequest({
    mutation: {
      onSuccess() { toast({ title: "Leave rejected" }); refresh(); },
      onError() { toast({ title: "Could not reject", variant: "destructive" }); },
    },
  });

  function submit() {
    if (!form.fromDate || !form.toDate) {
      toast({ title: "Pick dates", variant: "destructive" });
      return;
    }
    if (isApprover && !form.employeeId) {
      toast({ title: "Pick an employee", variant: "destructive" });
      return;
    }
    const from = new Date(form.fromDate);
    const to = new Date(form.toDate);
    if (to < from) {
      toast({ title: "End date is before start date", variant: "destructive" });
      return;
    }
    const days = Math.round((to.getTime() - from.getTime()) / 86400000) + 1;
    createMut.mutate({
      data: {
        ...(form.employeeId ? { employeeId: Number(form.employeeId) } : {}),
        leaveType: form.leaveType,
        fromDate: form.fromDate,
        toDate: form.toDate,
        days,
        reason: form.reason || null,
      },
    });
  }

  function renderRow(r: typeof requests[number]) {
    const emp = empMap.get(r.employeeId);
    const bal = balMap.get(r.employeeId);
    const balance = bal?.balances?.[r.leaveType];
    return (
      <div key={r.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{emp?.name ?? `Employee #${r.employeeId}`}</p>
            <p className="text-[11px] text-muted-foreground font-mono">{emp?.employeeCode}</p>
          </div>
          <StatusBadge status={r.status} />
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-muted-foreground">Type</p>
            <p className="capitalize font-medium">{r.leaveType}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Days</p>
            <p className="font-medium">{r.days}</p>
          </div>
          <div className="col-span-2">
            <p className="text-muted-foreground">When</p>
            <p className="font-medium">{formatDate(r.fromDate)} → {formatDate(r.toDate)}</p>
          </div>
          {r.reason && (
            <div className="col-span-2">
              <p className="text-muted-foreground">Reason</p>
              <p>{r.reason}</p>
            </div>
          )}
          {balance != null && (
            <div className="col-span-2 text-[11px] text-muted-foreground">
              Balance left for {r.leaveType}: {balance}
            </div>
          )}
          {r.decisionNote && (
            <div className="col-span-2">
              <p className="text-muted-foreground">Decision note</p>
              <p>{r.decisionNote}</p>
            </div>
          )}
        </div>
        {isApprover && r.status === "pending" && (
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              className="flex-1 bg-emerald-600 hover:bg-emerald-500"
              onClick={() => approveMut.mutate({ id: r.id, data: { note: null } })}
              disabled={approveMut.isPending || rejectMut.isPending}
            >
              <Check className="h-4 w-4 mr-1" /> Approve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="flex-1"
              onClick={() => rejectMut.mutate({ id: r.id, data: { note: null } })}
              disabled={approveMut.isPending || rejectMut.isPending}
            >
              <X className="h-4 w-4 mr-1" /> Reject
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Plane className="h-5 w-5" /> Leave requests</h1>
          <p className="text-sm text-muted-foreground">Apply for leave and track approvals</p>
        </div>
        <Button onClick={() => setOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Request leave
        </Button>
      </div>

      <Tabs defaultValue={isApprover ? "queue" : "all"}>
        <TabsList className="w-full sm:w-auto">
          {isApprover && (
            <TabsTrigger value="queue" className="flex-1 sm:flex-none">
              <Clock className="h-3.5 w-3.5 mr-1" /> Pending ({pending.length})
            </TabsTrigger>
          )}
          <TabsTrigger value="all" className="flex-1 sm:flex-none">All ({requests.length})</TabsTrigger>
          <TabsTrigger value="decided" className="flex-1 sm:flex-none">Decided ({decided.length})</TabsTrigger>
        </TabsList>

        {isApprover && (
          <TabsContent value="queue" className="mt-4 space-y-3">
            {pending.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-border rounded-xl text-muted-foreground text-sm">
                Nothing waiting for approval.
              </div>
            ) : pending.map(renderRow)}
          </TabsContent>
        )}
        <TabsContent value="all" className="mt-4 space-y-3">
          {requests.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-border rounded-xl text-muted-foreground text-sm">
              No leave requests yet. Tap “Request leave” to file one.
            </div>
          ) : requests.map(renderRow)}
        </TabsContent>
        <TabsContent value="decided" className="mt-4 space-y-3">
          {decided.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-border rounded-xl text-muted-foreground text-sm">
              No decided requests yet.
            </div>
          ) : decided.map(renderRow)}
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request leave</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {isApprover ? (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Employee</label>
                <Select value={form.employeeId} onValueChange={(v) => setForm({ ...form, employeeId: v })}>
                  <SelectTrigger><SelectValue placeholder="Pick employee" /></SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={String(e.id)}>{e.name} ({e.employeeCode})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                You're filing this request for yourself. An admin will review it.
              </p>
            )}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Leave type</label>
              <Select value={form.leaveType} onValueChange={(v) => setForm({ ...form, leaveType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEAVE_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">From</label>
                <Input type="date" value={form.fromDate} onChange={(e) => setForm({ ...form, fromDate: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">To</label>
                <Input type="date" value={form.toDate} onChange={(e) => setForm({ ...form, toDate: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Reason</label>
              <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Optional note for your manager" rows={3} />
            </div>
            {form.employeeId && (() => {
              const bal = balMap.get(Number(form.employeeId));
              const left = bal?.balances?.[form.leaveType];
              if (left == null) return null;
              return <p className="text-[11px] text-muted-foreground">Balance left for {form.leaveType}: <span className="font-mono">{left}</span></p>;
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={createMut.isPending}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
