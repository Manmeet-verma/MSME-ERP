import { useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useListPayrollRuns, useCreatePayrollRun } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/format";
import { Plus, Wallet, ChevronRight } from "lucide-react";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function PayrollPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: runsRaw, isLoading } = useListPayrollRuns();
  const runs = Array.isArray(runsRaw) ? runsRaw : [];
  const [open, setOpen] = useState(false);
  const now = new Date();
  const [periodMonth, setPeriodMonth] = useState(now.getMonth() + 1);
  const [periodYear, setPeriodYear] = useState(now.getFullYear());

  const createMut = useCreatePayrollRun({
    mutation: {
      onSuccess() {
        toast({ title: "Payroll computed" });
        qc.invalidateQueries({ queryKey: ["/api/payroll-runs"] });
        setOpen(false);
      },
      onError(err: unknown) {
        const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
        toast({ title: msg ?? "Failed", variant: "destructive" });
      },
    },
  });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Wallet className="h-5 w-5" /> Payroll</h1>
          <p className="text-sm text-muted-foreground">{runs.length} payroll runs</p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New payroll run</Button>
      </div>

      {isLoading ? <div className="text-muted-foreground">Loading…</div> : runs.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <Wallet className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No payroll runs yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {runs.map((r) => (
            <Link key={r.id} href={`/payroll/${r.id}`}>
              <span className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:border-primary/30 transition-colors">
                <div>
                  <p className="font-semibold text-sm">{MONTHS[r.periodMonth - 1]} {r.periodYear}</p>
                  <p className="text-xs text-muted-foreground capitalize">{r.status}{r.paidAt ? ` · paid ${new Date(r.paidAt).toLocaleDateString()}` : ""}</p>
                </div>
                <div className="flex items-center gap-6 text-xs">
                  <div><span className="text-muted-foreground">Gross</span> <span className="font-semibold ml-1">{formatCurrency(r.totalGross)}</span></div>
                  <div><span className="text-muted-foreground">Deductions</span> <span className="font-semibold ml-1">{formatCurrency(r.totalDeductions)}</span></div>
                  <div><span className="text-muted-foreground">Net</span> <span className="font-semibold ml-1 text-primary">{formatCurrency(r.totalNet)}</span></div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </span>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New payroll run</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Month</Label>
                <select className="w-full h-10 px-3 rounded-md border border-input bg-background" value={periodMonth}
                  onChange={(e) => setPeriodMonth(Number(e.target.value))}>
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div><Label>Year</Label><Input type="number" value={periodYear} onChange={(e) => setPeriodYear(Number(e.target.value))} /></div>
            </div>
            <p className="text-xs text-muted-foreground">Salaries will be computed from attendance + employee structure. Employees with no attendance records are treated as full month present.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={createMut.isPending} onClick={() => createMut.mutate({ data: { periodMonth, periodYear } })}>Compute</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
