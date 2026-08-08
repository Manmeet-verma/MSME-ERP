"use client";

import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, ArrowUp, ArrowDown, Download } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { DailyReportRow } from "@/components/daily-report-detail-modal";

type MetricKey = "calls" | "quotations" | "meetings" | "orders" | "ordersClosed" | "payments" | "afterSales";

export type { MetricKey };

const METRICS: Record<MetricKey, { label: string; details: (r: DailyReportRow) => Record<string, unknown>[] }> = {
  calls: { label: "Calls", details: (r) => (r.callDetails ?? []).map((d) => ({ ...d })) },
  quotations: { label: "Quotations", details: (r) => (r.quotationDetails ?? []).map((d) => ({ ...d })) },
  meetings: { label: "Meetings", details: (r) => (r.meetingDetails ?? []).map((d) => ({ ...d })) },
  orders: { label: "Orders", details: (r) => (r.orderDetails ?? []).map((d) => ({ ...d })) },
  ordersClosed: { label: "Orders Closed", details: (r) => (r.ordersClosed ?? []).map((d) => ({ ...d })) },
  payments: { label: "Payment Follow-ups", details: (r) => (r.paymentFollowupDetails ?? []).map((d) => ({ ...d })) },
  afterSales: { label: "After Sales", details: (r) => (r.afterSalesFollowupDetails ?? []).map((d) => ({ ...d })) },
};

function formatCell(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "number") return value.toLocaleString("en-IN");
  return String(value);
}

function isAmountKey(key: string): boolean {
  return /amount|price|value|due/i.test(key);
}

export default function DailyReportExcelModal({
  rows,
  metric,
  open,
  onOpenChange,
}: {
  rows: DailyReportRow[];
  metric: MetricKey;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const { label, allRows, columns, total } = useMemo(() => {
    const meta = METRICS[metric];
    const combined: Record<string, unknown>[] = [];
    for (const r of rows) {
      const details = meta.details(r);
      for (const d of details) {
        combined.push({
          Date: r.date ?? "-",
          Employee: r.userName ?? "-",
          Status: r.status ?? "draft",
          ...d,
        });
      }
    }
    const colSet: string[] = [];
    for (const row of combined) {
      for (const k of Object.keys(row)) {
        if (!colSet.includes(k)) colSet.push(k);
      }
    }
    const ordered = ["Date", "Employee", ...colSet.filter((k) => k !== "Date" && k !== "Employee")];
    let totalVal = 0;
    for (const row of combined) {
      for (const k of Object.keys(row)) {
        if (isAmountKey(k)) totalVal += Number(row[k]) || 0;
      }
    }
    return { label: meta.label, allRows: combined, columns: ordered, total: totalVal };
  }, [rows, metric]);

  const sortedRows = useMemo(() => {
    if (!sortKey) return allRows;
    return [...allRows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      let cmp = 0;
      if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
      else cmp = String(av ?? "").localeCompare(String(bv ?? ""));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [allRows, sortKey, sortDir]);

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function exportCsv() {
    const esc = (v: unknown) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = columns.map(esc).join(",");
    const lines = sortedRows.map((r) => columns.map((c) => esc(r[c])).join(","));
    const csv = [header, ...lines].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `daily-report-${label.replace(/\s+/g, "-").toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            {label} - All Details
            <span className="text-xs font-normal text-muted-foreground">
              {sortedRows.length} rows{total > 0 ? ` · Total ${formatCurrency(total)}` : ""}
            </span>
          </DialogTitle>
        </DialogHeader>
        <div className="mb-3 flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={exportCsv} disabled={sortedRows.length === 0} className="gap-1">
            <Download className="h-3.5 w-3.5" /> Export Excel (CSV)
          </Button>
          <p className="text-[11px] text-muted-foreground">Click column headers to sort · Row count: {sortedRows.length}</p>
        </div>
        {sortedRows.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No {label.toLowerCase()} recorded for the selected date range.</p>
        ) : (
          <ScrollArea className="flex-1 border border-border rounded-lg">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-card">
                <tr className="border-b border-border">
                  {columns.map((c) => (
                    <th
                      key={c}
                      onClick={() => toggleSort(c)}
                      className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-primary whitespace-nowrap select-none"
                    >
                      <span className="inline-flex items-center gap-1">
                        {c.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
                        {sortKey === c ? (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row, i) => (
                  <tr key={i} className={`border-b border-border/50 last:border-0 ${i % 2 === 1 ? "bg-muted/30" : ""}`}>
                    {columns.map((c) => (
                      <td key={c} className={`px-3 py-2 whitespace-nowrap ${isAmountKey(c) ? "text-right font-medium tabular-nums" : "text-xs"}`}>
                        {isAmountKey(c) && typeof row[c] === "number" ? formatCurrency(Number(row[c])) : formatCell(row[c])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
