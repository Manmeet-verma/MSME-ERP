import { useState } from "react";
import { useGetBalanceSheet } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/format";
import { Scale, Download } from "lucide-react";
import { getAuthToken } from "@/lib/auth";

async function downloadReport(asOf: string, format: "csv" | "xlsx") {
  const res = await fetch(`/api/accounting/balance-sheet?asOf=${asOf}&format=${format}`, {
    headers: { Authorization: `Bearer ${getAuthToken() ?? ""}` },
  });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `balance-sheet-${asOf}.${format}`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function BalanceSheetPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [asOf, setAsOf] = useState(today);
  const { data, isLoading } = useGetBalanceSheet({ asOf });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2"><Scale className="h-5 w-5" /> Balance Sheet</h1>
        <p className="text-sm text-muted-foreground">Assets, liabilities and equity — your financial position</p>
      </div>

      <div className="flex gap-3 flex-wrap items-end">
        <div><Label>As of</Label><Input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} /></div>
        <div className="flex gap-2 pb-1 ml-auto">
          <Button size="sm" variant="outline" className="gap-1" onClick={() => downloadReport(asOf, "csv")}><Download className="h-3 w-3" /> CSV</Button>
          <Button size="sm" variant="outline" className="gap-1" onClick={() => downloadReport(asOf, "xlsx")}><Download className="h-3 w-3" /> Excel</Button>
        </div>
      </div>

      {isLoading || !data ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Total Assets" value={formatCurrency(data.totals.assets)} tone="emerald" />
            <Stat label="Total Liabilities" value={formatCurrency(data.totals.liabilities)} tone="red" />
            <Stat label="Total Equity" value={formatCurrency(data.totals.equity)} tone="primary" />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Section title="Assets" rows={data.assets} total={data.totals.assets} totalLabel="Total Assets" />
            <div className="space-y-4">
              <Section title="Liabilities" rows={data.liabilities} total={data.totals.liabilities} totalLabel="Total Liabilities" />
              <Section title="Equity" rows={data.equity} total={data.totals.equity} totalLabel="Total Equity" />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Assets</span>
              <span className="font-mono">{formatCurrency(data.totals.assets)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Liabilities + Equity</span>
              <span className="font-mono">{formatCurrency(data.totals.liabilitiesAndEquity)}</span>
            </div>
            <div className={`flex justify-between font-semibold pt-2 border-t border-border ${Math.abs(data.totals.difference) < 0.01 ? "text-emerald-400" : "text-destructive"}`}>
              <span>{Math.abs(data.totals.difference) < 0.01 ? "Balanced" : "Out of balance"}</span>
              <span className="font-mono">{formatCurrency(data.totals.difference)}</span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <p className="font-semibold mb-3">Equity reconciliation</p>
            <p className="text-xs text-muted-foreground mb-3">FY started {data.equityReconciliation.fyStart}</p>
            <ReconRow label="Opening equity (capital)" value={data.equityReconciliation.openingEquity} />
            <ReconRow label="Retained earnings (prior years)" value={data.equityReconciliation.openingRetainedEarnings} />
            <ReconRow label="Net profit (current period)" value={data.equityReconciliation.periodNetProfit} />
            <div className="flex justify-between font-semibold pt-2 mt-2 border-t border-border">
              <span>Total equity</span><span>{formatCurrency(data.equityReconciliation.totalEquity)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "emerald" | "red" | "primary" }) {
  const color = tone === "emerald" ? "text-emerald-400" : tone === "red" ? "text-red-400" : "text-primary";
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}

function Section({ title, rows, total, totalLabel }: { title: string; rows: Array<{ code: string; name: string; amount: number }>; total: number; totalLabel: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="font-semibold mb-3">{title}</p>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">No {title.toLowerCase()}</p>
      ) : rows.map((r) => (
        <div key={r.code} className="flex justify-between text-sm py-1.5 border-b border-border/40">
          <span>{r.code === "RE" || r.code === "PNL" ? r.name : `${r.code} — ${r.name}`}</span>
          <span className="font-medium">{formatCurrency(r.amount)}</span>
        </div>
      ))}
      <div className="flex justify-between font-semibold pt-2 mt-2 border-t border-border">
        <span>{totalLabel}</span><span>{formatCurrency(total)}</span>
      </div>
    </div>
  );
}

function ReconRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-sm py-1.5 border-b border-border/40">
      <span>{label}</span>
      <span className="font-mono">{formatCurrency(value)}</span>
    </div>
  );
}
