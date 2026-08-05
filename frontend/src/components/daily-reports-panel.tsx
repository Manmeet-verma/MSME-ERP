"use client";

import { useEffect, useMemo, useState } from "react";
import { getApiBase } from "@/lib/utils";
import { getToken } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ClipboardCheck,
  CalendarRange,
  Loader2,
  PhoneCall,
  FileText,
  CalendarClock,
  ShoppingCart,
  BellRing,
} from "lucide-react";

function todayStr(): string {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function toLocalStr(d: Date): string {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function weekRange(): { from: string; to: string } {
  const today = new Date();
  const day = today.getDay();
  const diffToMonday = (day === 0 ? 7 : day) - 1;
  const monday = addDays(today, -diffToMonday);
  return { from: toLocalStr(monday), to: todayStr() };
}

function monthRange(): { from: string; to: string } {
  const today = new Date();
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  return { from: toLocalStr(first), to: todayStr() };
}

interface CrmChecklist {
  callsUpdated: boolean;
  quotationsUpdated: boolean;
  followupsScheduled: boolean;
  customerNotesUpdated: boolean;
  noFollowupMissed: boolean;
}

interface OrderRow {
  customer: string;
  amount: number | string;
  status: string;
}

interface DailyReportRow {
  id?: string;
  userId?: string;
  userName?: string;
  date?: string;
  callsMade?: number;
  quotationsSent?: number;
  meetingsScheduled?: number;
  ordersReceived?: number;
  paymentReminders?: number;
  afterSalesFollowup?: number;
  crmChecklist?: Partial<CrmChecklist>;
  ordersClosed?: OrderRow[];
  pendingFollowups?: string;
  issuesSupport?: string;
  tomorrowPriority?: string;
  status?: string;
}

const PRESETS = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
];

export default function DailyReportsPanel({
  title = "Daily Reports",
}: {
  title?: string;
}) {
  const [from, setFrom] = useState<string>(todayStr());
  const [to, setTo] = useState<string>(todayStr());
  const [rows, setRows] = useState<DailyReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!from || !to || from > to) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    const qp = new URLSearchParams({ from, to });
    fetch(`${getApiBase()}/api/daily-reports-summary?${qp.toString()}`, {
      headers: { Authorization: `Bearer ${getToken() ?? ""}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load daily reports");
        const data = (await res.json()) as DailyReportRow[];
        if (!cancelled) setRows(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [from, to]);

  const totals = useMemo(() => {
    const t = {
      callsMade: 0,
      quotationsSent: 0,
      meetingsScheduled: 0,
      ordersReceived: 0,
      paymentReminders: 0,
      afterSalesFollowup: 0,
      ordersClosedValue: 0,
      ordersClosedCount: 0,
    };
    for (const r of rows) {
      t.callsMade += Number(r.callsMade) || 0;
      t.quotationsSent += Number(r.quotationsSent) || 0;
      t.meetingsScheduled += Number(r.meetingsScheduled) || 0;
      t.ordersReceived += Number(r.ordersReceived) || 0;
      t.paymentReminders += Number(r.paymentReminders) || 0;
      t.afterSalesFollowup += Number(r.afterSalesFollowup) || 0;
      if (Array.isArray(r.ordersClosed)) {
        for (const o of r.ordersClosed) {
          if (o && typeof o === "object") {
            t.ordersClosedCount += 1;
            t.ordersClosedValue += Number(o.amount) || 0;
          }
        }
      }
    }
    return t;
  }, [rows]);

  function applyPreset(key: string) {
    if (key === "today") {
      setFrom(todayStr());
      setTo(todayStr());
    } else if (key === "week") {
      const r = weekRange();
      setFrom(r.from);
      setTo(r.to);
    } else if (key === "month") {
      const r = monthRange();
      setFrom(r.from);
      setTo(r.to);
    }
  }

  const miniCards = [
    { icon: PhoneCall, label: "Calls", value: String(totals.callsMade), tint: "bg-cyan-500/15 text-cyan-400" },
    { icon: FileText, label: "Quotes", value: String(totals.quotationsSent), tint: "bg-blue-500/15 text-blue-400" },
    { icon: CalendarClock, label: "Meetings", value: String(totals.meetingsScheduled), tint: "bg-primary/15 text-primary" },
    { icon: ShoppingCart, label: "Orders", value: String(totals.ordersReceived), tint: "bg-emerald-500/15 text-emerald-400" },
    { icon: ClipboardCheck, label: "Orders Closed", value: formatCurrency(totals.ordersClosedValue), tint: "bg-emerald-500/15 text-emerald-400" },
    { icon: BellRing, label: "Reminders", value: String(totals.paymentReminders), tint: "bg-orange-500/15 text-orange-400" },
  ];

  return (
    <div className="bg-card border border-card-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <CalendarRange className="h-4 w-4 text-primary" /> {title}
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => applyPreset(p.key)}
                className="px-2.5 py-1 rounded-md text-xs font-medium bg-secondary text-muted-foreground hover:text-foreground"
              >
                {p.label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-1 text-xs text-muted-foreground">
            From
            <Input
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => setFrom(e.target.value)}
              className="h-8 w-[9.5rem] text-xs"
            />
          </label>
          <label className="flex items-center gap-1 text-xs text-muted-foreground">
            To
            <Input
              type="date"
              value={to}
              min={from || undefined}
              max={todayStr()}
              onChange={(e) => setTo(e.target.value)}
              className="h-8 w-[9.5rem] text-xs"
            />
          </label>
        </div>
      </div>

      {rows.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 px-4 py-3 border-b border-border bg-muted/20">
          {miniCards.map((m) => (
            <div key={m.label} className="flex items-center gap-2">
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${m.tint}`}>
                <m.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground truncate">{m.label}</p>
                <p className="text-sm font-bold truncate">{m.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading reports...
          </div>
        ) : error ? (
          <p className="py-8 text-center text-sm text-destructive">Could not load daily reports</p>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No daily reports found for {formatDateLabel(from)} – {formatDateLabel(to)}.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Employee</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Calls</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Quotes</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Meetings</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Orders</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Orders Closed</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Reminders</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                let closed = "";
                if (Array.isArray(r.ordersClosed) && r.ordersClosed.length > 0) {
                  const val = r.ordersClosed.reduce((s, o) => s + (Number(o?.amount) || 0), 0);
                  closed = `${r.ordersClosed.length} · ${formatCurrency(val)}`;
                } else {
                  closed = "-";
                }
                return (
                  <tr key={r.id ?? r.date} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-2.5 font-medium">{r.date}</td>
                    <td className="px-4 py-2.5">{r.userName ?? "-"}</td>
                    <td className="px-4 py-2.5">{Number(r.callsMade) || 0}</td>
                    <td className="px-4 py-2.5">{Number(r.quotationsSent) || 0}</td>
                    <td className="px-4 py-2.5">{Number(r.meetingsScheduled) || 0}</td>
                    <td className="px-4 py-2.5">{Number(r.ordersReceived) || 0}</td>
                    <td className="px-4 py-2.5">{closed}</td>
                    <td className="px-4 py-2.5">{Number(r.paymentReminders) || 0}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`text-xs uppercase px-1.5 py-0.5 rounded ${
                          r.status === "submitted"
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "bg-yellow-500/15 text-yellow-500"
                        }`}
                      >
                        {r.status ?? "draft"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function formatDateLabel(d: string): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
