import { useRoute, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useGetPayrollRun, useMarkPayrollPaid } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/format";
import { ArrowLeft, Download } from "lucide-react";
import { getAuthToken } from "@/lib/auth";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

async function downloadPayslip(id: number) {
  const res = await fetch(`/api/payslips/${id}/pdf`, {
    headers: { Authorization: `Bearer ${getAuthToken() ?? ""}` },
  });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
}

export default function PayrollDetailPage() {
  const [, params] = useRoute<{ id: string }>("/payroll/:id");
  const id = Number(params?.id);
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: run, isLoading } = useGetPayrollRun(id, { query: { queryKey: [`/api/payroll-runs/${id}`], enabled: !!id } });
  const markMut = useMarkPayrollPaid({
    mutation: {
      onSuccess() {
        toast({ title: "Marked paid + posted to ledger" });
        qc.invalidateQueries({ queryKey: [`/api/payroll-runs/${id}`] });
        qc.invalidateQueries({ queryKey: ["/api/payroll-runs"] });
      },
    },
  });

  if (isLoading || !run) return <div className="p-6 text-muted-foreground">Loading…</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div>
        <Link href="/payroll"><a className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><ArrowLeft className="h-3 w-3" /> Back</a></Link>
        <div className="flex items-center justify-between mt-2 gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold">Payroll · {MONTHS[run.periodMonth - 1]} {run.periodYear}</h1>
            <p className="text-sm text-muted-foreground capitalize">Status: {run.status}{run.paidAt ? ` · paid ${new Date(run.paidAt).toLocaleDateString()}` : ""}</p>
          </div>
          {run.status !== "paid" && (
            <Button size="sm" onClick={() => markMut.mutate({ id })} disabled={markMut.isPending}>
              Mark all paid
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Total gross</p><p className="text-lg font-bold mt-1">{formatCurrency(run.totalGross)}</p></div>
        <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Deductions</p><p className="text-lg font-bold mt-1">{formatCurrency(run.totalDeductions)}</p></div>
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4"><p className="text-xs text-muted-foreground">Net payable</p><p className="text-lg font-bold mt-1 text-primary">{formatCurrency(run.totalNet)}</p></div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground border-b border-border">
            <tr>
              <th className="p-3">Employee</th>
              <th className="p-3 text-right">Days</th>
              <th className="p-3 text-right">Gross</th>
              <th className="p-3 text-right">PF</th>
              <th className="p-3 text-right">ESI</th>
              <th className="p-3 text-right">Other</th>
              <th className="p-3 text-right">Net</th>
              <th className="p-3 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {run.payslips?.map((s) => (
              <tr key={s.id} className="border-b border-border/50 hover:bg-secondary/30">
                <td className="p-3">
                  <p className="font-medium">{s.employeeName ?? "Employee"}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{s.employeeCode ?? ""}</p>
                </td>
                <td className="p-3 text-right text-xs">{s.daysWorked}/{s.daysInMonth}</td>
                <td className="p-3 text-right">{formatCurrency(s.gross)}</td>
                <td className="p-3 text-right text-xs">{formatCurrency(s.pfAmount)}</td>
                <td className="p-3 text-right text-xs">{formatCurrency(s.esiAmount)}</td>
                <td className="p-3 text-right text-xs">{formatCurrency(s.otherDeductions)}</td>
                <td className="p-3 text-right font-semibold text-primary">{formatCurrency(s.net)}</td>
                <td className="p-3 text-right">
                  <button onClick={() => downloadPayslip(s.id)} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                    <Download className="h-3 w-3" /> Slip
                  </button>
                </td>
              </tr>
            ))}
            {(!run.payslips || run.payslips.length === 0) && (
              <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No payslips generated</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
