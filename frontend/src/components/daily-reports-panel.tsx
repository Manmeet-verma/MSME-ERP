"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getApiBase } from "@/lib/utils";
import { getToken } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import DateRangeFilter from "@/components/date-range-filter";
import { todayStr, formatDateLabel } from "@/lib/dates";
import {
  ClipboardCheck,
  CalendarRange,
  Loader2,
  PhoneCall,
  FileText,
  CalendarClock,
  ShoppingCart,
  BellRing,
  Wrench,
} from "lucide-react";
import DailyReportDetailModal from "@/components/daily-report-detail-modal";
import DailyReportExcelModal from "@/components/daily-report-excel-modal";
import type { MetricKey } from "@/components/daily-report-excel-modal";

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

interface CallDetail {
  customerName: string;
  phone: string;
  callType: "inbound" | "outbound";
  duration: number;
  outcome: string;
  notes: string;
  callDate: string;
}

interface QuotationDetail {
  customerName: string;
  quotationNumber: string;
  amount: number;
  products: string;
  validityDate: string;
  status: string;
  notes: string;
}

interface MeetingDetail {
  customerName: string;
  meetingDate: string;
  type: "video" | "call" | "in-person";
  agenda: string;
  attendees: string;
  notes: string;
}

interface OrderDetail {
  customerName: string;
  orderNumber: string;
  amount: number;
  products: string;
  status: string;
  notes: string;
}

interface PaymentFollowupDetail {
  customerName: string;
  invoiceNumber: string;
  amountDue: number;
  followupDate: string;
  status: string;
  notes: string;
}

interface AfterSalesFollowupDetail {
  customerName: string;
  orderReference: string;
  type: "satisfaction" | "check-in" | "support";
  notes: string;
  followupDate: string;
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
  callDetails?: CallDetail[];
  quotationDetails?: QuotationDetail[];
  meetingDetails?: MeetingDetail[];
  orderDetails?: OrderDetail[];
  paymentFollowupDetails?: PaymentFollowupDetail[];
  afterSalesFollowupDetails?: AfterSalesFollowupDetail[];
}

export default function DailyReportsPanel({
  title = "Daily Reports",
  from: fromProp,
  to: toProp,
  onRangeChange,
}: {
  title?: string;
  from?: string;
  to?: string;
  onRangeChange?: (from: string, to: string) => void;
}) {
  const [internalFrom, setInternalFrom] = useState<string>(todayStr());
  const [internalTo, setInternalTo] = useState<string>(todayStr());
  const from = fromProp ?? internalFrom;
  const to = toProp ?? internalTo;
  const [rows, setRows] = useState<DailyReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedReport, setSelectedReport] = useState<DailyReportRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [excelMetric, setExcelMetric] = useState<MetricKey | null>(null);
  const [excelOpen, setExcelOpen] = useState(false);

  function openExcelView(metric: MetricKey) {
    setExcelMetric(metric);
    setExcelOpen(true);
  }

  function setRange(f: string, t: string) {
    if (onRangeChange) {
      onRangeChange(f, t);
    } else {
      setInternalFrom(f);
      setInternalTo(t);
    }
  }

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

  const miniCards = [
    { icon: PhoneCall, label: "Calls", value: String(totals.callsMade), tint: "bg-cyan-500/15 text-cyan-400", key: "calls" },
    { icon: FileText, label: "Quotes", value: String(totals.quotationsSent), tint: "bg-blue-500/15 text-blue-400", key: "quotations" },
    { icon: CalendarClock, label: "Meetings", value: String(totals.meetingsScheduled), tint: "bg-primary/15 text-primary", key: "meetings" },
    { icon: ShoppingCart, label: "Orders", value: String(totals.ordersReceived), tint: "bg-emerald-500/15 text-emerald-400", key: "orders" },
    { icon: ClipboardCheck, label: "Orders Closed", value: formatCurrency(totals.ordersClosedValue), tint: "bg-emerald-500/15 text-emerald-400", key: "ordersClosed" },
    { icon: BellRing, label: "Reminders", value: String(totals.paymentReminders), tint: "bg-orange-500/15 text-orange-400", key: "payments" },
  ];

  function openReportDetail(report: DailyReportRow) {
    setSelectedReport(report);
    setModalOpen(true);
  }

  return (
    <div className="bg-card border border-card-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <CalendarRange className="h-4 w-4 text-primary" /> {title}
        </h3>
        <div className="flex items-center gap-2 flex-wrap">
          {!onRangeChange && <DateRangeFilter from={from} to={to} onChange={setRange} />}
        </div>
      </div>

      {rows.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 px-4 py-3 border-b border-border bg-muted/20">
          {miniCards.map((m) => (
            <div
              key={m.key}
              className="flex items-center gap-2 cursor-pointer hover:bg-muted/40 rounded-lg p-1 transition-colors"
              onClick={() => openExcelView(m.key as MetricKey)}
            >
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
                <th className="text-left px-4 py-2"><span className="text-primary font-medium cursor-pointer hover:underline" onClick={() => openExcelView("calls")}>Calls</span></th>
                <th className="text-left px-4 py-2"><span className="text-primary font-medium cursor-pointer hover:underline" onClick={() => openExcelView("quotations")}>Quotes</span></th>
                <th className="text-left px-4 py-2"><span className="text-primary font-medium cursor-pointer hover:underline" onClick={() => openExcelView("meetings")}>Meetings</span></th>
                <th className="text-left px-4 py-2"><span className="text-primary font-medium cursor-pointer hover:underline" onClick={() => openExcelView("orders")}>Orders</span></th>
                <th className="text-left px-4 py-2"><span className="text-primary font-medium cursor-pointer hover:underline" onClick={() => openExcelView("ordersClosed")}>Orders Closed</span></th>
                <th className="text-left px-4 py-2"><span className="text-primary font-medium cursor-pointer hover:underline" onClick={() => openExcelView("payments")}>Reminders</span></th>
                <th className="text-left px-4 py-2"><span className="text-primary font-medium cursor-pointer hover:underline" onClick={() => openExcelView("afterSales")}>After Sales</span></th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                let closed = "-";
                if (Array.isArray(r.ordersClosed) && r.ordersClosed.length > 0) {
                  const val = r.ordersClosed.reduce((s, o) => s + (Number(o?.amount) || 0), 0);
                  closed = `${r.ordersClosed.length} · ${formatCurrency(val)}`;
                }
                return (
                  <tr
                    key={r.id ?? r.date}
                    className="border-b border-border last:border-0 hover:bg-muted/20 cursor-pointer"
                    onClick={() => openReportDetail(r)}
                  >
                    <td className="px-4 py-2.5 font-medium">{r.date}</td>
                    <td className="px-4 py-2.5">{r.userName ?? "-"}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-primary font-semibold hover:underline">{Number(r.callsMade) || 0}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-primary font-semibold hover:underline">{Number(r.quotationsSent) || 0}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-primary font-semibold hover:underline">{Number(r.meetingsScheduled) || 0}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-primary font-semibold hover:underline">{Number(r.ordersReceived) || 0}</span>
                    </td>
                    <td className="px-4 py-2.5">{closed}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-primary font-semibold hover:underline">{Number(r.paymentReminders) || 0}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-primary font-semibold hover:underline">{Number(r.afterSalesFollowup) || 0}</span>
                    </td>
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

      {selectedReport && (
        <DailyReportDetailModal
          report={selectedReport}
          open={modalOpen}
          onOpenChange={setModalOpen}
        />
      )}

      {excelMetric && rows.length > 0 && (
        <DailyReportExcelModal
          rows={rows}
          metric={excelMetric}
          open={excelOpen}
          onOpenChange={setExcelOpen}
        />
      )}
    </div>
  );
}