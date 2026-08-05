"use client";

import { useEffect, useState, useCallback } from "react";
import { getCurrentUser, getCurrentRole, getToken } from "@/lib/auth";
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
import { Loader2, Save, Send, Trash2, Plus, ClipboardCheck } from "lucide-react";

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

export default function DailyReportPage() {
  const { toast } = useToast();
  const me = getCurrentUser();
  const role = getCurrentRole();

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
        } else {
          setReportId(null);
          setStatus("");
          setActivities({ callsMade: 0, quotationsSent: 0, meetingsScheduled: 0, ordersReceived: 0, paymentReminders: 0, afterSalesFollowup: 0 });
          setChecklist({ ...DEFAULT_CHECKLIST });
          setOrders([{ customer: "", amount: "", status: "Confirmed" }]);
          setPendingFollowups("");
          setIssuesSupport("");
          setTomorrowPriority("");
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
    loadReport(date);
  }, [date, loadReport]);

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

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-card border border-card-border rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
            <ClipboardCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Sales Executive Daily Report</h1>
            <p className="text-sm text-muted-foreground">Record your daily sales activities</p>
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

      {/* Today's progress */}
      <div className="bg-card border border-card-border rounded-xl p-5">
        <h2 className="font-semibold mb-3">Today's progress</h2>
        <div className="grid grid-cols-3 gap-3 mb-3">
          {Object.entries(progressValues).map(([key, k]) => (
            <div key={key} className="bg-muted/40 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="text-lg font-bold">
                {k.value}/{k.target}
              </p>
            </div>
          ))}
        </div>
        <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${overallPct}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">{overallPct}% complete</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            saveReport(false);
          }}
        >
          {/* Daily Activities */}
          <div className="bg-card border border-card-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-primary text-primary-foreground font-semibold">
              Daily Activities
            </div>
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
                    <td className="py-2">
                      <Input type="number" min={0} value={activities.callsMade} onChange={(e) => updateActivity("callsMade", e.target.value)} />
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium">Quotations Sent</td>
                    <td className="py-2 pr-4 text-muted-foreground">10</td>
                    <td className="py-2">
                      <Input type="number" min={0} value={activities.quotationsSent} onChange={(e) => updateActivity("quotationsSent", e.target.value)} />
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium">Meetings Scheduled</td>
                    <td className="py-2 pr-4 text-muted-foreground">-</td>
                    <td className="py-2">
                      <Input type="number" min={0} value={activities.meetingsScheduled} onChange={(e) => updateActivity("meetingsScheduled", e.target.value)} />
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium">Orders Received</td>
                    <td className="py-2 pr-4 text-muted-foreground">2</td>
                    <td className="py-2">
                      <Input type="number" min={0} value={activities.ordersReceived} onChange={(e) => updateActivity("ordersReceived", e.target.value)} />
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium">Payment Follow-ups</td>
                    <td className="py-2 pr-4 text-muted-foreground">-</td>
                    <td className="py-2">
                      <Input type="number" min={0} value={activities.paymentReminders} onChange={(e) => updateActivity("paymentReminders", e.target.value)} />
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 font-medium">After Sales Follow-ups</td>
                    <td className="py-2 pr-4 text-muted-foreground">-</td>
                    <td className="py-2">
                      <Input type="number" min={0} value={activities.afterSalesFollowup} onChange={(e) => updateActivity("afterSalesFollowup", e.target.value)} />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* CRM Checklist */}
          <div className="bg-card border border-card-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-primary text-primary-foreground font-semibold">CRM Checklist</div>
            <div className="p-4 grid sm:grid-cols-2 gap-3">
              {CHECKLIST_LABELS.map((item) => (
                <label key={item.key} className="flex items-center gap-3 text-sm cursor-pointer">
                  <Checkbox
                    checked={checklist[item.key]}
                    onCheckedChange={(v) => setChecklist((c) => ({ ...c, [item.key]: v === true }))}
                  />
                  {item.label}
                </label>
              ))}
            </div>
          </div>

          {/* Orders Closed */}
          <div className="bg-card border border-card-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-primary text-primary-foreground font-semibold">Orders Closed</div>
            <div className="p-4 space-y-3">
              {orders.map((o, i) => (
                <div key={i} className="grid grid-cols-[1fr_140px_150px_40px] gap-2 items-center">
                  <Input
                    placeholder="Customer Name"
                    value={o.customer}
                    onChange={(e) => updateOrder(i, { customer: e.target.value })}
                  />
                  <Input
                    type="number"
                    min={0}
                    placeholder="Order Value"
                    value={o.amount}
                    onChange={(e) => updateOrder(i, { amount: e.target.value })}
                  />
                  <Select
                    value={o.status}
                    onValueChange={(v) => updateOrder(i, { status: v as OrderRow["status"] })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Confirmed">Confirmed</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeOrderRow(i)} disabled={orders.length <= 1}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addOrderRow}>
                <Plus className="h-4 w-4 mr-1" /> Add order
              </Button>
            </div>
          </div>

          {/* Pending Follow-ups */}
          <div className="bg-card border border-card-border rounded-xl p-4">
            <Label htmlFor="pendingFollowups" className="text-base font-semibold">Pending Follow-ups</Label>
            <p className="text-xs text-muted-foreground mb-2">Customer Name - Follow-up Date - Remarks</p>
            <Textarea id="pendingFollowups" rows={4} value={pendingFollowups} onChange={(e) => setPendingFollowups(e.target.value)} placeholder="Customer Name - Follow-up Date - Remarks" />
          </div>

          {/* Issues / Support */}
          <div className="bg-card border border-card-border rounded-xl p-4">
            <Label htmlFor="issuesSupport" className="text-base font-semibold">Issues / Support Required</Label>
            <p className="text-xs text-muted-foreground mb-2">Anything you need help with</p>
            <Textarea id="issuesSupport" rows={3} value={issuesSupport} onChange={(e) => setIssuesSupport(e.target.value)} />
          </div>

          {/* Tomorrow's Priority */}
          <div className="bg-card border border-card-border rounded-xl p-4">
            <Label htmlFor="tomorrowPriority" className="text-base font-semibold">Tomorrow&apos;s Priority</Label>
            <p className="text-xs text-muted-foreground mb-2">What you plan to focus on next</p>
            <Textarea id="tomorrowPriority" rows={3} value={tomorrowPriority} onChange={(e) => setTomorrowPriority(e.target.value)} />
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button type="submit" disabled={saving || submitting} className="flex-1">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Report
            </Button>
            <Button type="button" variant="default" disabled={saving || submitting} className="flex-1" onClick={handleSubmit}>
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Submit Report
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
