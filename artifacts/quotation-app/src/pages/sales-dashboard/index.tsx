import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCurrentUser, getCurrentRole, getAuthToken, getCurrentOrg } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Phone, FileText, Calendar, ShoppingCart, CreditCard, RefreshCw,
  Save, Send, Loader2, BarChart3, CheckCircle2, Clock,
  TrendingUp,
} from "lucide-react";

const today = () => new Date().toISOString().slice(0, 10);

interface CrmChecklist {
  callsUpdated: boolean;
  quotationsUpdated: boolean;
  followupsScheduled: boolean;
  customerNotesUpdated: boolean;
  noFollowupMissed: boolean;
}

interface OrderClosed {
  customer: string;
  amount: number;
  status: string;
}

interface DailyReport {
  id?: string;
  date: string;
  callsMade: number;
  quotationsSent: number;
  meetingsScheduled: number;
  ordersReceived: number;
  paymentReminders: number;
  afterSalesFollowup: number;
  crmChecklist: CrmChecklist;
  ordersClosed: OrderClosed[];
  pendingFollowups: string;
  issuesSupport: string;
  tomorrowPriority: string;
  status: string;
}

const emptyReport = (date: string): DailyReport => ({
  date,
  callsMade: 0,
  quotationsSent: 0,
  meetingsScheduled: 0,
  ordersReceived: 0,
  paymentReminders: 0,
  afterSalesFollowup: 0,
  crmChecklist: {
    callsUpdated: false,
    quotationsUpdated: false,
    followupsScheduled: false,
    customerNotesUpdated: false,
    noFollowupMissed: false,
  },
  ordersClosed: [
    { customer: "", amount: 0, status: "Confirmed" },
    { customer: "", amount: 0, status: "Pending" },
  ],
  pendingFollowups: "",
  issuesSupport: "",
  tomorrowPriority: "",
  status: "draft",
});

const API_BASE = import.meta.env.DEV
  ? ""
  : "https://msme-erp-api-3s11.onrender.com";

function authHeaders() {
  return { Authorization: `Bearer ${getAuthToken() ?? ""}`, "Content-Type": "application/json" };
}

export default function SalesDashboardPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const user = getCurrentUser();
  const role = getCurrentRole();
  const org = getCurrentOrg();
  const isOwnerOrAdmin = role === "owner" || role === "admin";

  const [selectedDate, setSelectedDate] = useState(today());
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);

  const { data: reportsRaw } = useQuery({
    queryKey: ["daily-reports", selectedDate, viewingUserId],
    queryFn: async () => {
      const params = new URLSearchParams({ date: selectedDate });
      if (viewingUserId) params.set("userId", viewingUserId);
      const res = await fetch(`${API_BASE}/api/daily-reports?${params}`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to load reports");
      return res.json() as Promise<DailyReport[]>;
    },
  });

  const reports: DailyReport[] = Array.isArray(reportsRaw) ? reportsRaw : [];
  const existingReport = reports[0] ?? null;

  const [form, setForm] = useState<DailyReport>(emptyReport(selectedDate));

  useEffect(() => {
    if (existingReport) {
      setForm({
        ...existingReport,
        crmChecklist: existingReport.crmChecklist ?? emptyReport(selectedDate).crmChecklist,
        ordersClosed: Array.isArray(existingReport.ordersClosed) && existingReport.ordersClosed.length > 0
          ? existingReport.ordersClosed
          : emptyReport(selectedDate).ordersClosed,
      });
    } else {
      setForm(emptyReport(selectedDate));
    }
  }, [existingReport, selectedDate]);

  const { data: membersRaw } = useQuery({
    queryKey: ["members"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/organizations/current/members`, { headers: authHeaders() });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isOwnerOrAdmin,
  });
  const members: Array<{ userId: string; name: string; role: string }> = Array.isArray(membersRaw) ? membersRaw : [];

  const saveMut = useMutation({
    mutationFn: async (data: DailyReport) => {
      const res = await fetch(`${API_BASE}/api/daily-reports`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Save failed");
      return res.json();
    },
    onSuccess(saved) {
      toast({ title: "Report saved" });
      setForm((f) => ({ ...f, id: saved.id }));
      qc.invalidateQueries({ queryKey: ["daily-reports", selectedDate] });
    },
    onError() {
      toast({ title: "Could not save report", variant: "destructive" });
    },
  });

  const submitMut = useMutation({
    mutationFn: async (data: DailyReport) => {
      const saveRes = await fetch(`${API_BASE}/api/daily-reports`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ ...data, status: "submitted" }),
      });
      if (!saveRes.ok) throw new Error("Save failed");
      const saved = await saveRes.json();
      const submitRes = await fetch(`${API_BASE}/api/daily-reports/${saved.id}/submit`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (!submitRes.ok) throw new Error("Submit failed");
      return saved;
    },
    onSuccess() {
      toast({ title: "Report submitted successfully!" });
      qc.invalidateQueries({ queryKey: ["daily-reports", selectedDate] });
    },
    onError() {
      toast({ title: "Could not submit report", variant: "destructive" });
    },
  });

  const setFormField = useCallback(<K extends keyof DailyReport>(key: K, value: DailyReport[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  }, []);

  const setCrmCheck = useCallback((key: keyof CrmChecklist, val: boolean) => {
    setForm((f) => ({ ...f, crmChecklist: { ...f.crmChecklist, [key]: val } }));
  }, []);

  const setOrderField = useCallback((idx: number, field: keyof OrderClosed, value: string | number) => {
    setForm((f) => {
      const orders = [...f.ordersClosed];
      orders[idx] = { ...orders[idx], [field]: value };
      return { ...f, ordersClosed: orders };
    });
  }, []);

  const callsPct = Math.min(100, Math.round((form.callsMade / 80) * 100));
  const quotPct = Math.min(100, Math.round((form.quotationsSent / 10) * 100));
  const ordersPct = Math.min(100, Math.round((form.ordersReceived / 2) * 100));
  const crmChecks = Object.values(form.crmChecklist).filter(Boolean).length;
  const crmScore = Math.round((crmChecks / 5) * 100);
  const overallProgress = Math.round((callsPct + quotPct + ordersPct + crmScore) / 4);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="bg-card border border-card-border rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Sales Executive Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Welcome <span className="font-semibold text-foreground">{user?.name ?? "User"}</span>
              {(role === "sales_executive" || role === "sales") && org?.name && (
                <span className="ml-2 text-muted-foreground">({org.name})</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isOwnerOrAdmin && members.length > 0 && (
              <Select value={viewingUserId ?? "all"} onValueChange={(v) => setViewingUserId(v === "all" ? null : v)}>
                <SelectTrigger className="w-48"><SelectValue placeholder="All team members" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All team members</SelectItem>
                  {members.filter((m) => m.role === "sales" || m.role === "sales_executive").map((m) => (
                    <SelectItem key={m.userId} value={m.userId}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="flex items-center gap-2">
              <Label className="text-sm whitespace-nowrap">Date:</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-40"
              />
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
            weekday: "long", year: "numeric", month: "long", day: "numeric",
          })}
          {existingReport?.status === "submitted" && (
            <span className="ml-2 inline-flex items-center gap-1 text-green-600 font-medium">
              <CheckCircle2 className="h-3 w-3" /> Submitted
            </span>
          )}
          {existingReport?.status === "draft" && (
            <span className="ml-2 inline-flex items-center gap-1 text-amber-500 font-medium">
              <Clock className="h-3 w-3" /> Draft
            </span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-lg bg-blue-500/15 text-blue-500 flex items-center justify-center">
              <Phone className="h-4 w-4" />
            </div>
            <p className="text-xs text-muted-foreground">Calls</p>
          </div>
          <p className="text-2xl font-bold">{form.callsMade}<span className="text-sm text-muted-foreground">/80</span></p>
          <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${callsPct}%` }} />
          </div>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
              <FileText className="h-4 w-4" />
            </div>
            <p className="text-xs text-muted-foreground">Quotations</p>
          </div>
          <p className="text-2xl font-bold">{form.quotationsSent}<span className="text-sm text-muted-foreground">/10</span></p>
          <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${quotPct}%` }} />
          </div>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center">
              <ShoppingCart className="h-4 w-4" />
            </div>
            <p className="text-xs text-muted-foreground">Orders</p>
          </div>
          <p className="text-2xl font-bold">{form.ordersReceived}<span className="text-sm text-muted-foreground">/2</span></p>
          <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${ordersPct}%` }} />
          </div>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
            <p className="text-xs text-muted-foreground">CRM Score</p>
          </div>
          <p className="text-2xl font-bold">{crmScore}%</p>
          <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${crmScore}%` }} />
          </div>
        </div>
      </div>

      <div className="bg-card border border-card-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm">Today's Progress</h3>
          <span className="text-sm font-bold">{overallProgress}%</span>
        </div>
        <div className="h-4 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${overallProgress >= 75 ? "bg-emerald-500" : overallProgress >= 50 ? "bg-amber-500" : "bg-red-500"}`}
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      <div className="bg-card border border-card-border rounded-xl">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold flex items-center gap-2">
            <Phone className="h-4 w-4 text-primary" /> Daily Activities
          </h3>
        </div>
        <div className="p-4">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-sm font-medium text-muted-foreground pb-3">Activity</th>
                <th className="text-center text-sm font-medium text-muted-foreground pb-3">Target</th>
                <th className="text-right text-sm font-medium text-muted-foreground pb-3">Achievement</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Calls Made", key: "callsMade" as const, target: 80, icon: Phone },
                { label: "Quotations Sent", key: "quotationsSent" as const, target: 10, icon: FileText },
                { label: "Meetings Scheduled", key: "meetingsScheduled" as const, target: "-", icon: Calendar },
                { label: "Orders Received", key: "ordersReceived" as const, target: 2, icon: ShoppingCart },
                { label: "Payment Reminders", key: "paymentReminders" as const, target: "-", icon: CreditCard },
                { label: "After Sales Follow-up", key: "afterSalesFollowup" as const, target: "-", icon: RefreshCw },
              ].map((row) => (
                <tr key={row.key} className="border-b border-border last:border-0">
                  <td className="py-3 flex items-center gap-2">
                    <row.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{row.label}</span>
                  </td>
                  <td className="py-3 text-center text-sm text-muted-foreground">{row.target}</td>
                  <td className="py-3 text-right">
                    <Input
                      type="number"
                      min={0}
                      value={form[row.key] || ""}
                      onChange={(e) => setFormField(row.key, Number(e.target.value))}
                      className="w-24 text-right inline-block"
                      placeholder="0"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-card border border-card-border rounded-xl">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" /> CRM Checklist
          </h3>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {([
            ["callsUpdated", "Calls Updated"],
            ["quotationsUpdated", "Quotations Updated"],
            ["followupsScheduled", "Follow-ups Scheduled"],
            ["customerNotesUpdated", "Customer Notes Updated"],
            ["noFollowupMissed", "No Follow-up Missed"],
          ] as const).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.crmChecklist[key]}
                onChange={(e) => setCrmCheck(key, e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm">{label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="bg-card border border-card-border rounded-xl">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-primary" /> Today's Orders
          </h3>
        </div>
        <div className="p-4">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-sm font-medium text-muted-foreground pb-3">Customer Name</th>
                <th className="text-right text-sm font-medium text-muted-foreground pb-3">Amount</th>
                <th className="text-center text-sm font-medium text-muted-foreground pb-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {form.ordersClosed.map((order, idx) => (
                <tr key={idx} className="border-b border-border last:border-0">
                  <td className="py-2">
                    <Input
                      value={order.customer}
                      onChange={(e) => setOrderField(idx, "customer", e.target.value)}
                      placeholder="Customer name"
                    />
                  </td>
                  <td className="py-2 text-right">
                    <Input
                      type="number"
                      min={0}
                      value={order.amount || ""}
                      onChange={(e) => setOrderField(idx, "amount", Number(e.target.value))}
                      className="w-32 text-right inline-block"
                      placeholder="0"
                    />
                  </td>
                  <td className="py-2 text-center">
                    <Select value={order.status} onValueChange={(v) => setOrderField(idx, "status", v)}>
                      <SelectTrigger className="w-32 mx-auto"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Confirmed">Confirmed</SelectItem>
                        <SelectItem value="Pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-card border border-card-border rounded-xl">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold">Pending Follow-ups</h3>
        </div>
        <div className="p-4">
          <Textarea
            rows={3}
            value={form.pendingFollowups}
            onChange={(e) => setFormField("pendingFollowups", e.target.value)}
            placeholder="Customer Name - Follow-up Date - Remarks"
          />
        </div>
      </div>

      <div className="bg-card border border-card-border rounded-xl">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold">Issues / Support Required</h3>
        </div>
        <div className="p-4">
          <Textarea
            rows={3}
            value={form.issuesSupport}
            onChange={(e) => setFormField("issuesSupport", e.target.value)}
            placeholder="Describe any issues or support needed..."
          />
        </div>
      </div>

      <div className="bg-card border border-card-border rounded-xl">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold">Tomorrow's Priority</h3>
        </div>
        <div className="p-4">
          <Textarea
            rows={3}
            value={form.tomorrowPriority}
            onChange={(e) => setFormField("tomorrowPriority", e.target.value)}
            placeholder="List priorities for tomorrow..."
          />
        </div>
      </div>

      <div className="flex gap-4">
        <Button
          onClick={() => saveMut.mutate(form)}
          disabled={saveMut.isPending}
          variant="outline"
          className="flex-1 h-12 text-base"
        >
          {saveMut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Report
        </Button>
        <Button
          onClick={() => submitMut.mutate(form)}
          disabled={submitMut.isPending}
          className="flex-1 h-12 text-base"
        >
          {submitMut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
          Submit Report
        </Button>
      </div>
    </div>
  );
}
