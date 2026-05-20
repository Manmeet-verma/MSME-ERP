import { useState } from "react";
import { useGetPnl } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/format";
import { TrendingUp } from "lucide-react";

export default function PnlPage() {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today.toISOString().slice(0, 10));
  const [compare, setCompare] = useState(true);

  const { data, isLoading } = useGetPnl({ from, to, compare: compare ? "true" : "false" });

  function delta(curr: number, prev: number | null | undefined) {
    if (!prev) return null;
    const d = curr - prev;
    const pct = prev !== 0 ? Math.round((d / Math.abs(prev)) * 100) : 0;
    return { d, pct };
  }

  const cur = data?.current;
  const prev = data?.previous;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2"><TrendingUp className="h-5 w-5" /> Profit &amp; Loss</h1>
        <p className="text-sm text-muted-foreground">Income vs expenses for any period</p>
      </div>

      <div className="flex gap-3 flex-wrap items-end">
        <div><Label>From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><Label>To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        <label className="flex items-center gap-2 text-sm pb-2">
          <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} />
          Compare vs previous period
        </label>
      </div>

      {isLoading || !cur ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Income</p><p className="text-lg font-bold mt-1 text-emerald-400">{formatCurrency(cur.totalIncome)}</p>
              {prev && <p className="text-[10px] text-muted-foreground mt-1">Prev: {formatCurrency(prev.totalIncome)} ({delta(cur.totalIncome, prev.totalIncome)?.pct ?? 0}%)</p>}
            </div>
            <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Expense</p><p className="text-lg font-bold mt-1 text-red-400">{formatCurrency(cur.totalExpense)}</p>
              {prev && <p className="text-[10px] text-muted-foreground mt-1">Prev: {formatCurrency(prev.totalExpense)} ({delta(cur.totalExpense, prev.totalExpense)?.pct ?? 0}%)</p>}
            </div>
            <div className={`rounded-xl border p-4 ${cur.netProfit >= 0 ? "border-primary/30 bg-primary/5" : "border-destructive/30 bg-destructive/5"}`}>
              <p className="text-xs text-muted-foreground">Net profit</p>
              <p className={`text-lg font-bold mt-1 ${cur.netProfit >= 0 ? "text-primary" : "text-destructive"}`}>{formatCurrency(cur.netProfit)}</p>
              {prev && <p className="text-[10px] text-muted-foreground mt-1">Prev: {formatCurrency(prev.netProfit)}</p>}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="font-semibold mb-3">Income</p>
              {cur.income.length === 0 ? <p className="text-xs text-muted-foreground">No income</p> : cur.income.map((r) => (
                <div key={r.code} className="flex justify-between text-sm py-1.5 border-b border-border/40">
                  <span>{r.code} — {r.name}</span>
                  <span className="font-medium">{formatCurrency(r.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between font-semibold pt-2 mt-2 border-t border-border">
                <span>Total income</span><span>{formatCurrency(cur.totalIncome)}</span>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="font-semibold mb-3">Expense</p>
              {cur.expense.length === 0 ? <p className="text-xs text-muted-foreground">No expenses</p> : cur.expense.map((r) => (
                <div key={r.code} className="flex justify-between text-sm py-1.5 border-b border-border/40">
                  <span>{r.code} — {r.name}</span>
                  <span className="font-medium">{formatCurrency(r.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between font-semibold pt-2 mt-2 border-t border-border">
                <span>Total expense</span><span>{formatCurrency(cur.totalExpense)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
