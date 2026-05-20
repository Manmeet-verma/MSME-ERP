import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListEmployees,
  useListAttendance,
  useBulkAttendance,
  useGetLeaveBalances,
} from "@workspace/api-client-react";
import type { AttendanceStatus } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { CalendarCheck, CheckCircle2, XCircle, Clock4, Plane, Sun } from "lucide-react";

const STATUSES: Array<{ key: AttendanceStatus; label: string; icon: typeof CheckCircle2; color: string }> = [
  { key: "present", label: "P", icon: CheckCircle2, color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  { key: "half", label: "½", icon: Clock4, color: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  { key: "leave", label: "L", icon: Plane, color: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  { key: "absent", label: "A", icon: XCircle, color: "bg-red-500/15 text-red-300 border-red-500/30" },
  { key: "holiday", label: "H", icon: Sun, color: "bg-purple-500/15 text-purple-300 border-purple-500/30" },
  { key: "weekoff", label: "W", icon: Sun, color: "bg-slate-500/15 text-slate-300 border-slate-500/30" },
];

export default function AttendancePage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const { data: employees = [] } = useListEmployees();
  const { data: attendance = [] } = useListAttendance({ from: date, to: date });
  const { data: balances = [] } = useGetLeaveBalances();

  const existing = useMemo(() => {
    const map = new Map<number, AttendanceStatus>();
    for (const a of attendance) map.set(a.employeeId, a.status);
    return map;
  }, [attendance]);

  const [local, setLocal] = useState<Map<number, AttendanceStatus>>(new Map());
  const merged = useMemo(() => {
    const m = new Map(existing);
    for (const [k, v] of local) m.set(k, v);
    return m;
  }, [existing, local]);

  const bulkMut = useBulkAttendance({
    mutation: {
      onSuccess() {
        toast({ title: "Attendance saved" });
        qc.invalidateQueries({ queryKey: ["/api/attendance"] });
        qc.invalidateQueries({ queryKey: ["/api/leaves/balances"] });
        setLocal(new Map());
      },
      onError() { toast({ title: "Save failed", variant: "destructive" }); },
    },
  });

  function pick(empId: number, st: AttendanceStatus) {
    setLocal((l) => { const n = new Map(l); n.set(empId, st); return n; });
  }
  function markAll(st: AttendanceStatus) {
    const n = new Map<number, AttendanceStatus>();
    for (const e of employees) n.set(e.id, st);
    setLocal(n);
  }
  function save() {
    const entries = employees.map((e) => ({
      employeeId: e.id,
      status: (merged.get(e.id) ?? "absent") as AttendanceStatus,
    }));
    bulkMut.mutate({ data: { date, entries } });
  }

  const balMap = new Map(balances.map((b) => [b.employeeId, b]));

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><CalendarCheck className="h-5 w-5" /> Attendance</h1>
          <p className="text-sm text-muted-foreground">Mark daily status for each employee</p>
        </div>
        <div className="flex gap-2 items-center">
          <Input type="date" value={date} onChange={(e) => { setDate(e.target.value); setLocal(new Map()); }} className="w-44" />
          <Button size="sm" variant="outline" onClick={() => markAll("present")}>All present</Button>
          <Button size="sm" onClick={save} disabled={bulkMut.isPending}>Save</Button>
        </div>
      </div>

      {employees.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl text-muted-foreground">
          Add employees first to mark attendance.
        </div>
      ) : (
        <div className="space-y-2">
          {employees.map((e) => {
            const current = merged.get(e.id);
            const bal = balMap.get(e.id);
            return (
              <div key={e.id} className="rounded-xl border border-border bg-card p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{e.name}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">{e.employeeCode}</p>
                  {bal && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Leaves used: {Object.entries(bal.used).map(([k, v]) => `${k}:${v}`).join(" · ") || "0"}
                    </p>
                  )}
                </div>
                <div className="flex gap-1 flex-wrap">
                  {STATUSES.map((s) => {
                    const active = current === s.key;
                    return (
                      <button key={s.key} onClick={() => pick(e.id, s.key)}
                        className={`h-9 w-9 rounded-md border text-xs font-bold transition-all ${active ? s.color : "bg-secondary border-border text-muted-foreground hover:border-primary/40"}`}
                        title={s.key}>
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="text-xs text-muted-foreground flex flex-wrap gap-3 pt-3 border-t border-border">
        <span>P = Present</span><span>½ = Half-day</span><span>L = Leave</span><span>A = Absent</span><span>H = Holiday</span><span>W = Week-off</span>
      </div>
    </div>
  );
}
