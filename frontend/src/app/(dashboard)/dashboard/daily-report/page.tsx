"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, getCurrentRole, getToken, canSubmitDailyReport } from "@/lib/auth";
import { getApiBase } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Loader2, Save, Send, Trash2, Plus, ClipboardCheck, ChevronDown, ChevronUp } from "lucide-react";

interface CrmChecklist {
  callsUpdated: boolean;
  quotationsUpdated: boolean;
  followupsScheduled: boolean;
  customerNotesUpdated: boolean;
  noFollowupMissed: boolean;
}

interface OrderRow {
  customer: string;
  amount: string;
  status: "Confirmed" | "Pending";
}

interface CallDetail {
  customerName: string;
  phone: string;
  callType: "inbound" | "outbound";
  duration: string;
  outcome: string;
  notes: string;
  callDate: string;
}

interface QuotationDetail {
  customerName: string;
  quotationNumber: string;
  amount: string;
  products: string;
  validityDate: string;
  status: "draft" | "sent" | "approved" | "rejected" | "expired";
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
  amount: string;
  products: string;
  status: "Confirmed" | "Pending" | "Delivered";
  notes: string;
}

interface PaymentFollowupDetail {
  customerName: string;
  invoiceNumber: string;
  amountDue: string;
  followupDate: string;
  status: "Pending" | "Completed" | "Overdue";
  notes: string;
}

interface AfterSalesFollowupDetail {
  customerName: string;
  orderReference: string;
  type: "satisfaction" | "check-in" | "support";
  notes: string;
  followupDate: string;
}

interface DailyReportData {
  id?: string;
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

const DEFAULT_CHECKLIST: CrmChecklist = {
  callsUpdated: false,
  quotationsUpdated: false,
  followupsScheduled: false,
  customerNotesUpdated: false,
  noFollowupMissed: false,
};

const CHECKLIST_LABELS: Array<{ key: keyof CrmChecklist; label: string }> = [
  { key: "callsUpdated", label: "All Calls Updated" },
  { key: "quotationsUpdated", label: "Quotations Updated" },
  { key: "followupsScheduled", label: "Follow-ups Scheduled" },
  { key: "customerNotesUpdated", label: "Customer Notes Updated" },
  { key: "noFollowupMissed", label: "No Follow-up Missed" },
];

function todayStr(): string {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function authHeaders() {
  return { Authorization: `Bearer ${getToken() ?? ""}`, "Content-Type": "application/json" };
}

function emptyCall(): CallDetail {
  return { customerName: "", phone: "", callType: "outbound", duration: "", outcome: "", notes: "", callDate: todayStr() };
}
function emptyQuotation(): QuotationDetail {
  return { customerName: "", quotationNumber: "", amount: "", products: "", validityDate: "", status: "sent", notes: "" };
}
function emptyMeeting(): MeetingDetail {
  return { customerName: "", meetingDate: todayStr(), type: "call", agenda: "", attendees: "", notes: "" };
}
function emptyOrder(): OrderDetail {
  return { customerName: "", orderNumber: "", amount: "", products: "", status: "Pending", notes: "" };
}
function emptyPaymentFollowup(): PaymentFollowupDetail {
  return { customerName: "", invoiceNumber: "", amountDue: "", followupDate: todayStr(), status: "Pending", notes: "" };
}
function emptyAfterSales(): AfterSalesFollowupDetail {
  return { customerName: "", orderReference: "", type: "check-in", notes: "", followupDate: todayStr() };
}

export default function DailyReportPage() {
  const { toast } = useToast();
  const router = useRouter();
  const me = getCurrentUser();
  const role = getCurrentRole();
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!canSubmitDailyReport(role)) {
      setDenied(true);
      router.replace("/dashboard");
    }
  }, [role, router]);

  const [date, setDate] = useState(todayStr());
  const [reportId, setReportId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string>("");

  const [activities, setActivities] = useState({
    callsMade: 0,
    quotationsSent: 0,
    meetingsScheduled: 0,
    ordersReceived: 0,
    paymentReminders: 0,
    afterSalesFollowup: 0,
  });
  const [checklist, setChecklist] = useState<CrmChecklist>({ ...DEFAULT_CHECKLIST });
  const [orders, setOrders] = useState<OrderRow[]>([
    { customer: "", amount: "", status: "Confirmed" },
    { customer: "", amount: "", status: "Pending" },
  ]);
  const [pendingFollowups, setPendingFollowups] = useState("");
  const [issuesSupport, setIssuesSupport] = useState("");
  const [tomorrowPriority, setTomorrowPriority] = useState("");

  const [callDetails, setCallDetails] = useState<CallDetail[]>([]);
  const [quotationDetails, setQuotationDetails] = useState<QuotationDetail[]>([]);
  const [meetingDetails, setMeetingDetails] = useState<MeetingDetail[]>([]);
  const [orderDetails, setOrderDetails] = useState<OrderDetail[]>([]);
  const [paymentFollowupDetails, setPaymentFollowupDetails] = useState<PaymentFollowupDetail[]>([]);
  const [afterSalesFollowupDetails, setAfterSalesFollowupDetails] = useState<AfterSalesFollowupDetail[]>([]);

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    calls: false,
    quotations: false,
    meetings: false,
    orders: false,
    payments: false,
    afterSales: false,
  });

  const loadReport = useCallback(
    async (targetDate: string) => {
      setLoading(true);
      try {
        const res = await fetch(`${getApiBase()}/api/daily-reports?date=${encodeURIComponent(targetDate)}`, {
          headers: authHeaders(),
        });
        if (!res.ok) throw new Error("Failed to load report");
        const rows = (await res.json()) as DailyReportData[];
        const report = rows[0];
        if (report) {
          setReportId(report.id ?? null);
          setStatus(report.status ?? "");
          setActivities({
            callsMade: Number(report.callsMade) || 0,
            quotationsSent: Number(report.quotationsSent) || 0,
            meetingsScheduled: Number(report.meetingsScheduled) || 0,
            ordersReceived: Number(report.ordersReceived) || 0,
            paymentReminders: Number(report.paymentReminders) || 0,
            afterSalesFollowup: Number(report.afterSalesFollowup) || 0,
          });
          setChecklist({ ...DEFAULT_CHECKLIST, ...(report.crmChecklist ?? {}) });
          const savedOrders: OrderRow[] = Array.isArray(report.ordersClosed)
            ? (report.ordersClosed as OrderRow[]).filter((o) => o && typeof o === "object")
            : [];
          setOrders(savedOrders.length > 0 ? savedOrders : [{ customer: "", amount: "", status: "Confirmed" }]);
          setPendingFollowups(report.pendingFollowups ?? "");
          setIssuesSupport(report.issuesSupport ?? "");
          setTomorrowPriority(report.tomorrowPriority ?? "");
          setCallDetails(Array.isArray(report.callDetails) ? report.callDetails : []);
          setQuotationDetails(Array.isArray(report.quotationDetails) ? report.quotationDetails : []);
          setMeetingDetails(Array.isArray(report.meetingDetails) ? report.meetingDetails : []);
          setOrderDetails(Array.isArray(report.orderDetails) ? report.orderDetails : []);
          setPaymentFollowupDetails(Array.isArray(report.paymentFollowupDetails) ? report.paymentFollowupDetails : []);
          setAfterSalesFollowupDetails(Array.isArray(report.afterSalesFollowupDetails) ? report.afterSalesFollowupDetails : []);
        } else {
          setReportId(null);
          setStatus("");
          setActivities({ callsMade: 0, quotationsSent: 0, meetingsScheduled: 0, ordersReceived: 0, paymentReminders: 0, afterSalesFollowup: 0 });
          setChecklist({ ...DEFAULT_CHECKLIST });
          setOrders([{ customer: "", amount: "", status: "Confirmed" }]);
          setPendingFollowups("");
          setIssuesSupport("");
          setTomorrowPriority("");
          setCallDetails([]);
          setQuotationDetails([]);
          setMeetingDetails([]);
          setOrderDetails([]);
          setPaymentFollowupDetails([]);
          setAfterSalesFollowupDetails([]);
        }
      } catch {
        toast({ title: "Could not load report", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    if (denied) return;
    loadReport(date);
  }, [date, loadReport, denied]);

  function updateActivity(key: keyof typeof activities, value: string) {
    const num = Math.max(0, Math.floor(Number(value) || 0));
    setActivities((a) => ({ ...a, [key]: num }));
  }

  function updateOrder(index: number, patch: Partial<OrderRow>) {
    setOrders((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function addOrderRow() {
    setOrders((rows) => [...rows, { customer: "", amount: "", status: "Pending" }]);
  }

  function removeOrderRow(index: number) {
    setOrders((rows) => rows.filter((_, i) => i !== index));
  }

  function updateCallDetail(index: number, patch: Partial<CallDetail>) {
    setCallDetails((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function addCallRow() {
    setCallDetails((rows) => [...rows, emptyCall()]);
  }

  function removeCallRow(index: number) {
    setCallDetails((rows) => rows.filter((_, i) => i !== index));
  }

  function updateQuotationDetail(index: number, patch: Partial<QuotationDetail>) {
    setQuotationDetails((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function addQuotationRow() {
    setQuotationDetails((rows) => [...rows, emptyQuotation()]);
  }

  function removeQuotationRow(index: number) {
    setQuotationDetails((rows) => rows.filter((_, i) => i !== index));
  }

  function updateMeetingDetail(index: number, patch: Partial<MeetingDetail>) {
    setMeetingDetails((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function addMeetingRow() {
    setMeetingDetails((rows) => [...rows, emptyMeeting()]);
  }

  function removeMeetingRow(index: number) {
    setMeetingDetails((rows) => rows.filter((_, i) => i !== index));
  }

  function updateOrderDetail(index: number, patch: Partial<OrderDetail>) {
    setOrderDetails((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function addOrderDetailRow() {
    setOrderDetails((rows) => [...rows, emptyOrder()]);
  }

  function removeOrderDetailRow(index: number) {
    setOrderDetails((rows) => rows.filter((_, i) => i !== index));
  }

  function updatePaymentFollowupDetail(index: number, patch: Partial<PaymentFollowupDetail>) {
    setPaymentFollowupDetails((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function addPaymentFollowupRow() {
    setPaymentFollowupDetails((rows) => [...rows, emptyPaymentFollowup()]);
  }

  function removePaymentFollowupRow(index: number) {
    setPaymentFollowupDetails((rows) => rows.filter((_, i) => i !== index));
  }

  function updateAfterSalesDetail(index: number, patch: Partial<AfterSalesFollowupDetail>) {
    setAfterSalesFollowupDetails((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function addAfterSalesRow() {
    setAfterSalesFollowupDetails((rows) => [...rows, emptyAfterSales()]);
  }

  function removeAfterSalesRow(index: number) {
    setAfterSalesFollowupDetails((rows) => rows.filter((_, i) => i !== index));
  }

  function toggleSection(key: string) {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function buildPayload(statusValue: string) {
    return {
      date,
      callsMade: activities.callsMade,
      quotationsSent: activities.quotationsSent,
      meetingsScheduled: activities.meetingsScheduled,
      ordersReceived: activities.ordersReceived,
      paymentReminders: activities.paymentReminders,
      afterSalesFollowup: activities.afterSalesFollowup,
      crmChecklist: checklist,
      ordersClosed: orders.map((o) => ({
        customer: o.customer.trim(),
        amount: o.amount.trim() === "" ? 0 : Number(o.amount) || 0,
        status: o.status,
      })),
      pendingFollowups,
      issuesSupport,
      tomorrowPriority,
      status: statusValue,
      callDetails: callDetails.map((c) => ({ ...c, duration: Number(c.duration) || 0 })),
      quotationDetails: quotationDetails.map((q) => ({ ...q, amount: Number(q.amount) || 0 })),
      meetingDetails: meetingDetails.map((m) => ({ ...m })),
      orderDetails: orderDetails.map((o) => ({ ...o, amount: Number(o.amount) || 0 })),
      paymentFollowupDetails: paymentFollowupDetails.map((p) => ({ ...p, amountDue: Number(p.amountDue) || 0 })),
      afterSalesFollowupDetails: afterSalesFollowupDetails.map((a) => ({ ...a })),
    };
  }

  async function saveReport(submitAfter = false) {
    setSaving(true);
    try {
      const res = await fetch(`${getApiBase()}/api/daily-reports`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(buildPayload("draft")),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Could not save report", description: data.error ?? "Try again", variant: "destructive" });
        return false;
      }
      setReportId(data.id ?? null);
      if (submitAfter) {
        const id = data.id as string | undefined;
        if (!id) {
          toast({ title: "Could not submit report", variant: "destructive" });
          return false;
        }
        const subRes = await fetch(`${getApiBase()}/api/daily-reports/${id}/submit`, {
          method: "POST",
          headers: authHeaders(),
        });
        const subData = await subRes.json();
        if (!subRes.ok) {
          toast({ title: "Could not submit report", description: subData.error ?? "Try again", variant: "destructive" });
          return false;
        }
        setStatus("submitted");
        toast({ title: "Report submitted", description: `Daily report for ${date} has been submitted.` });
        return true;
      }
      setStatus("draft");
      toast({ title: "Report saved", description: `Saved as draft for ${date}.` });
      return true;
    } catch {
      toast({ title: "Could not save report", variant: "destructive" });
      return false;
    } finally {
      setSaving(false);
      setSubmitting(false);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    await saveReport(true);
  }

  const progressValues = {
    callsMade: { value: activities.callsMade, target: 80, label: "Calls" },
    quotationsSent: { value: activities.quotationsSent, target: 10, label: "Quotations" },
    ordersReceived: { value: activities.ordersReceived, target: 2, label: "Orders" },
  };

  const overall = Object.values(progressValues).reduce((acc, k) => acc + Math.min(1, k.value / k.target), 0);
  const overallPct = Math.round((overall / Object.keys(progressValues).length) * 100);

  if (denied) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-md mx-auto">
        <div className="bg-card border border-card-border rounded-xl p-6 text-center space-y-4">
          <div className="h-12 w-12 mx-auto rounded-lg bg-primary/15 text-primary flex items-center justify-center">
            <ClipboardCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Daily report entry is not available for your role</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Daily reports can be submitted by sales staff. You can view all submitted reports from the Quotations page.
            </p>
          </div>
          <Button onClick={() => router.push("/dashboard/quotations")}>Go to Quotations</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="bg-card border border-card-border rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
            <ClipboardCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Sales Executive Daily Report</h1>
            <p className="text-sm text-muted-foreground">Record your daily sales activities with deep details</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="drDate">Date</Label>
            <Input id="drDate" type="date" value={date} max={todayStr()} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Employee Name</Label>
            <Input value={me?.name ?? ""} readOnly />
          </div>
          <div className="space-y-1.5">
            <Label>Position</Label>
            <Input value={role ? role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : ""} readOnly />
          </div>
        </div>
        {status && (
          <div className="mt-3">
            <span className={`text-xs font-medium px-2 py-1 rounded ${status === "submitted" ? "bg-emerald-500/15 text-emerald-400" : "bg-yellow-500/15 text-yellow-500"}`}>
              {status === "submitted" ? "Submitted" : "Saved as draft"}
            </span>
          </div>
        )}
      </div>

      <div className="bg-card border border-card-border rounded-xl p-5">
        <h2 className="font-semibold mb-3">Today&apos;s progress</h2>
        <div className="grid grid-cols-3 gap-3 mb-3">
          {Object.entries(progressValues).map(([key, k]) => (
            <div key={key} className="bg-muted/40 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="text-lg font-bold">{k.value}/{k.target}</p>
            </div>
          ))}
        </div>
        <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${overallPct}%` }} />
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">{overallPct}% complete</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); saveReport(false); }}>
          <div className="bg-card border border-card-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-primary text-primary-foreground font-semibold">Daily Activities</div>
            <div className="p-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Activity</th>
                    <th className="py-2 pr-4 font-medium">Target</th>
                    <th className="py-2 font-medium">Today&apos;s Achievement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="py-2 pr-4 font-medium">Calls Made</td>
                    <td className="py-2 pr-4 text-muted-foreground">80</td>
                    <td className="py-2"><Input type="number" min={0} value={activities.callsMade} onChange={(e) => updateActivity("callsMade", e.target.value)} /></td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium">Quotations Sent</td>
                    <td className="py-2 pr-4 text-muted-foreground">10</td>
                    <td className="py-2"><Input type="number" min={0} value={activities.quotationsSent} onChange={(e) => updateActivity("quotationsSent", e.target.value)} /></td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium">Meetings Scheduled</td>
                    <td className="py-2 pr-4 text-muted-foreground">-</td>
                    <td className="py-2"><Input type="number" min={0} value={activities.meetingsScheduled} onChange={(e) => updateActivity("meetingsScheduled", e.target.value)} /></td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium">Orders Received</td>
                    <td className="py-2 pr-4 text-muted-foreground">2</td>
                    <td className="py-2"><Input type="number" min={0} value={activities.ordersReceived} onChange={(e) => updateActivity("ordersReceived", e.target.value)} /></td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium">Payment Follow-ups</td>
                    <td className="py-2 pr-4 text-muted-foreground">-</td>
                    <td className="py-2"><Input type="number" min={0} value={activities.paymentReminders} onChange={(e) => updateActivity("paymentReminders", e.target.value)} /></td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium">After Sales Follow-ups</td>
                    <td className="py-2 pr-4 text-muted-foreground">-</td>
                    <td className="py-2"><Input type="number" min={0} value={activities.afterSalesFollowup} onChange={(e) => updateActivity("afterSalesFollowup", e.target.value)} /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-card border border-card-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-primary text-primary-foreground font-semibold flex items-center justify-between cursor-pointer" onClick={() => toggleSection("calls")}>
              <span>Calls Made Details</span>
              {expandedSections.calls ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
            {expandedSections.calls && (
              <div className="p-4 space-y-3">
                {callDetails.map((c, i) => (
                  <div key={i} className="grid grid-cols-[1fr_140px_100px_100px_1fr_80px] gap-2 items-start">
                    <Input placeholder="Customer Name" value={c.customerName} onChange={(e) => updateCallDetail(i, { customerName: e.target.value })} />
                    <Input placeholder="Phone" value={c.phone} onChange={(e) => updateCallDetail(i, { phone: e.target.value })} />
                    <Select value={c.callType} onValueChange={(v) => updateCallDetail(i, { callType: v as CallDetail["callType"] })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="inbound">Inbound</SelectItem><SelectItem value="outbound">Outbound</SelectItem></SelectContent>
                    </Select>
                    <Input placeholder="Duration (min)" type="number" min={0} value={c.duration} onChange={(e) => updateCallDetail(i, { duration: e.target.value })} />
                    <Input placeholder="Outcome" value={c.outcome} onChange={(e) => updateCallDetail(i, { outcome: e.target.value })} />
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeCallRow(i)} disabled={callDetails.length <= 0}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addCallRow}><Plus className="h-4 w-4 mr-1" /> Add call</Button>
              </div>
            )}
          </div>

          <div className="bg-card border border-card-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-primary text-primary-foreground font-semibold flex items-center justify-between cursor-pointer" onClick={() => toggleSection("quotations")}>
              <span>Quotations Sent Details</span>
              {expandedSections.quotations ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
            {expandedSections.quotations && (
              <div className="p-4 space-y-3">
                {quotationDetails.map((q, i) => (
                  <div key={i} className="grid grid-cols-[1fr_120px_100px_1fr_120px_100px] gap-2 items-start">
                    <Input placeholder="Customer Name" value={q.customerName} onChange={(e) => updateQuotationDetail(i, { customerName: e.target.value })} />
                    <Input placeholder="Quote #" value={q.quotationNumber} onChange={(e) => updateQuotationDetail(i, { quotationNumber: e.target.value })} />
                    <Input placeholder="Amount" type="number" min={0} value={q.amount} onChange={(e) => updateQuotationDetail(i, { amount: e.target.value })} />
                    <Input placeholder="Products/Services" value={q.products} onChange={(e) => updateQuotationDetail(i, { products: e.target.value })} />
                    <Input type="date" value={q.validityDate} onChange={(e) => updateQuotationDetail(i, { validityDate: e.target.value })} />
                    <Select value={q.status} onValueChange={(v) => updateQuotationDetail(i, { status: v as QuotationDetail["status"] })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="sent">Sent</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="rejected">Rejected</SelectItem><SelectItem value="expired">Expired</SelectItem></SelectContent>
                    </Select>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addQuotationRow}><Plus className="h-4 w-4 mr-1" /> Add quotation</Button>
              </div>
            )}
          </div>

          <div className="bg-card border border-card-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-primary text-primary-foreground font-semibold flex items-center justify-between cursor-pointer" onClick={() => toggleSection("meetings")}>
              <span>Meetings Scheduled Details</span>
              {expandedSections.meetings ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
            {expandedSections.meetings && (
              <div className="p-4 space-y-3">
                {meetingDetails.map((m, i) => (
                  <div key={i} className="grid grid-cols-[1fr_130px_100px_1fr_1fr] gap-2 items-start">
                    <Input placeholder="Customer Name" value={m.customerName} onChange={(e) => updateMeetingDetail(i, { customerName: e.target.value })} />
                    <Input type="date" value={m.meetingDate} onChange={(e) => updateMeetingDetail(i, { meetingDate: e.target.value })} />
                    <Select value={m.type} onValueChange={(v) => updateMeetingDetail(i, { type: v as MeetingDetail["type"] })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="video">Video</SelectItem><SelectItem value="call">Call</SelectItem><SelectItem value="in-person">In-Person</SelectItem></SelectContent>
                    </Select>
                    <Input placeholder="Agenda" value={m.agenda} onChange={(e) => updateMeetingDetail(i, { agenda: e.target.value })} />
                    <Input placeholder="Attendees" value={m.attendees} onChange={(e) => updateMeetingDetail(i, { attendees: e.target.value })} />
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addMeetingRow}><Plus className="h-4 w-4 mr-1" /> Add meeting</Button>
              </div>
            )}
          </div>

          <div className="bg-card border border-card-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-primary text-primary-foreground font-semibold flex items-center justify-between cursor-pointer" onClick={() => toggleSection("orders")}>
              <span>Orders Received Details</span>
              {expandedSections.orders ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
            {expandedSections.orders && (
              <div className="p-4 space-y-3">
                {orderDetails.map((o, i) => (
                  <div key={i} className="grid grid-cols-[1fr_120px_100px_1fr_100px] gap-2 items-start">
                    <Input placeholder="Customer Name" value={o.customerName} onChange={(e) => updateOrderDetail(i, { customerName: e.target.value })} />
                    <Input placeholder="Order #" value={o.orderNumber} onChange={(e) => updateOrderDetail(i, { orderNumber: e.target.value })} />
                    <Input placeholder="Amount" type="number" min={0} value={o.amount} onChange={(e) => updateOrderDetail(i, { amount: e.target.value })} />
                    <Input placeholder="Products" value={o.products} onChange={(e) => updateOrderDetail(i, { products: e.target.value })} />
                    <Select value={o.status} onValueChange={(v) => updateOrderDetail(i, { status: v as OrderDetail["status"] })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="Confirmed">Confirmed</SelectItem><SelectItem value="Pending">Pending</SelectItem><SelectItem value="Delivered">Delivered</SelectItem></SelectContent>
                    </Select>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addOrderDetailRow}><Plus className="h-4 w-4 mr-1" /> Add order</Button>
              </div>
            )}
          </div>

          <div className="bg-card border border-card-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-primary text-primary-foreground font-semibold flex items-center justify-between cursor-pointer" onClick={() => toggleSection("payments")}>
              <span>Payment Follow-ups Details</span>
              {expandedSections.payments ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
            {expandedSections.payments && (
              <div className="p-4 space-y-3">
                {paymentFollowupDetails.map((p, i) => (
                  <div key={i} className="grid grid-cols-[1fr_120px_100px_130px_100px] gap-2 items-start">
                    <Input placeholder="Customer Name" value={p.customerName} onChange={(e) => updatePaymentFollowupDetail(i, { customerName: e.target.value })} />
                    <Input placeholder="Invoice #" value={p.invoiceNumber} onChange={(e) => updatePaymentFollowupDetail(i, { invoiceNumber: e.target.value })} />
                    <Input placeholder="Amount Due" type="number" min={0} value={p.amountDue} onChange={(e) => updatePaymentFollowupDetail(i, { amountDue: e.target.value })} />
                    <Input type="date" value={p.followupDate} onChange={(e) => updatePaymentFollowupDetail(i, { followupDate: e.target.value })} />
                    <Select value={p.status} onValueChange={(v) => updatePaymentFollowupDetail(i, { status: v as PaymentFollowupDetail["status"] })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="Pending">Pending</SelectItem><SelectItem value="Completed">Completed</SelectItem><SelectItem value="Overdue">Overdue</SelectItem></SelectContent>
                    </Select>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addPaymentFollowupRow}><Plus className="h-4 w-4 mr-1" /> Add follow-up</Button>
              </div>
            )}
          </div>

          <div className="bg-card border border-card-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-primary text-primary-foreground font-semibold flex items-center justify-between cursor-pointer" onClick={() => toggleSection("afterSales")}>
              <span>After Sales Follow-ups Details</span>
              {expandedSections.afterSales ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
            {expandedSections.afterSales && (
              <div className="p-4 space-y-3">
                {afterSalesFollowupDetails.map((a, i) => (
                  <div key={i} className="grid grid-cols-[1fr_120px_120px_1fr_130px] gap-2 items-start">
                    <Input placeholder="Customer Name" value={a.customerName} onChange={(e) => updateAfterSalesDetail(i, { customerName: e.target.value })} />
                    <Input placeholder="Order Ref" value={a.orderReference} onChange={(e) => updateAfterSalesDetail(i, { orderReference: e.target.value })} />
                    <Select value={a.type} onValueChange={(v) => updateAfterSalesDetail(i, { type: v as AfterSalesFollowupDetail["type"] })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="satisfaction">Satisfaction</SelectItem><SelectItem value="check-in">Check-in</SelectItem><SelectItem value="support">Support</SelectItem></SelectContent>
                    </Select>
                    <Input placeholder="Notes" value={a.notes} onChange={(e) => updateAfterSalesDetail(i, { notes: e.target.value })} />
                    <Input type="date" value={a.followupDate} onChange={(e) => updateAfterSalesDetail(i, { followupDate: e.target.value })} />
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addAfterSalesRow}><Plus className="h-4 w-4 mr-1" /> Add follow-up</Button>
              </div>
            )}
          </div>

          <div className="bg-card border border-card-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-primary text-primary-foreground font-semibold">CRM Checklist</div>
            <div className="p-4 grid sm:grid-cols-2 gap-3">
              {CHECKLIST_LABELS.map((item) => (
                <label key={item.key} className="flex items-center gap-3 text-sm cursor-pointer">
                  <Checkbox checked={checklist[item.key]} onCheckedChange={(v) => setChecklist((c) => ({ ...c, [item.key]: v === true }))} />
                  {item.label}
                </label>
              ))}
            </div>
          </div>

          <div className="bg-card border border-card-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-primary text-primary-foreground font-semibold">Orders Closed</div>
            <div className="p-4 space-y-3">
              {orders.map((o, i) => (
                <div key={i} className="grid grid-cols-[1fr_140px_150px_40px] gap-2 items-center">
                  <Input placeholder="Customer Name" value={o.customer} onChange={(e) => updateOrder(i, { customer: e.target.value })} />
                  <Input type="number" min={0} placeholder="Order Value" value={o.amount} onChange={(e) => updateOrder(i, { amount: e.target.value })} />
                  <Select value={o.status} onValueChange={(v) => updateOrder(i, { status: v as OrderRow["status"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Confirmed">Confirmed</SelectItem><SelectItem value="Pending">Pending</SelectItem></SelectContent>
                  </Select>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeOrderRow(i)} disabled={orders.length <= 1}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addOrderRow}><Plus className="h-4 w-4 mr-1" /> Add order</Button>
            </div>
          </div>

          <div className="bg-card border border-card-border rounded-xl p-4">
            <Label htmlFor="pendingFollowups" className="text-base font-semibold">Pending Follow-ups</Label>
            <p className="text-xs text-muted-foreground mb-2">Customer Name - Follow-up Date - Remarks</p>
            <Textarea id="pendingFollowups" rows={4} value={pendingFollowups} onChange={(e) => setPendingFollowups(e.target.value)} placeholder="Customer Name - Follow-up Date - Remarks" />
          </div>

          <div className="bg-card border border-card-border rounded-xl p-4">
            <Label htmlFor="issuesSupport" className="text-base font-semibold">Issues / Support Required</Label>
            <p className="text-xs text-muted-foreground mb-2">Anything you need help with</p>
            <Textarea id="issuesSupport" rows={3} value={issuesSupport} onChange={(e) => setIssuesSupport(e.target.value)} />
          </div>

          <div className="bg-card border border-card-border rounded-xl p-4">
            <Label htmlFor="tomorrowPriority" className="text-base font-semibold">Tomorrow&apos;s Priority</Label>
            <p className="text-xs text-muted-foreground mb-2">What you plan to focus on next</p>
            <Textarea id="tomorrowPriority" rows={3} value={tomorrowPriority} onChange={(e) => setTomorrowPriority(e.target.value)} />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button type="submit" disabled={saving || submitting} className="flex-1">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}Save Report
            </Button>
            <Button type="button" variant="default" disabled={saving || submitting} className="flex-1" onClick={handleSubmit}>
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}Submit Report
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}