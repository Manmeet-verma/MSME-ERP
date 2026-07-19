import { Link } from "wouter";
import { useState } from "react";
import {
  useGetDashboardSummary, useGetDashboardWidgets, useListMembers, useGetLowStock,
  useGetAiInsights, useAiNlSearch,
} from "@workspace/api-client-react";
import { getCurrentOrg } from "@/lib/auth";
import { getModules, getLimits, MODULE_LABELS, MODULE_DESCRIPTIONS, type ModuleKey } from "@/lib/modules";
import { formatCurrency } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  FileText, Users, TrendingUp, Megaphone, Boxes, ShoppingCart,
  Briefcase, BookOpen, Share2, ArrowRight, Sparkles, Flame, Phone, Mail,
  Receipt, AlertTriangle, CheckSquare, PackageOpen, Warehouse, Search, Lightbulb,
} from "lucide-react";

const MODULE_ICONS: Record<ModuleKey, React.ComponentType<{ className?: string }>> = {
  sales: FileText,
  leads: TrendingUp,
  inventory: Boxes,
  purchase: ShoppingCart,
  marketing: Megaphone,
  hr: Briefcase,
  accounting: BookOpen,
  social: Share2,
};

const MODULE_LINKS: Partial<Record<ModuleKey, string>> = {
  sales: "/quotations",
  leads: "/leads",
  marketing: "/campaigns",
  inventory: "/inventory",
  purchase: "/purchase-orders",
};

function LowStockPanel() {
  const { data } = useGetLowStock();
  const rows = Array.isArray(data) ? data : [];
  if (rows.length === 0) return null;
  return (
    <div className="bg-card border border-card-border rounded-xl p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center gap-2">
          <PackageOpen className="h-4 w-4 text-red-400" /> Low-stock items
        </h3>
        <Link href="/inventory">
          <span className="text-xs text-muted-foreground hover:text-foreground">View all</span>
        </Link>
      </div>
      <ul className="divide-y divide-border text-sm">
        {rows.slice(0, 6).map((r) => (
          <li key={r.itemId} className="py-2 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-medium">{r.itemName}</p>
              <p className="text-xs text-muted-foreground">
                {r.currentStock} on hand · threshold {r.lowStockThreshold}
              </p>
            </div>
            <Link href={`/purchase-orders?createForItem=${r.itemId}`}>
              <span className="text-xs font-medium text-primary hover:underline whitespace-nowrap">
                Create PO →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface ModuleCardProps {
  moduleKey: ModuleKey;
  enabled: boolean;
  primary?: string;
  secondary?: string;
}

function ModuleCard({ moduleKey, enabled, primary, secondary }: ModuleCardProps) {
  const Icon = MODULE_ICONS[moduleKey];
  const link = MODULE_LINKS[moduleKey];
  const card = (
    <div className={`bg-card border border-card-border rounded-xl p-5 h-full transition-all ${enabled ? "hover:border-primary/40 hover:shadow-lg" : "opacity-60"}`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${enabled ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
          <Icon className="h-5 w-5" />
        </div>
        {!enabled && <span className="text-[10px] uppercase tracking-wider text-muted-foreground border border-border rounded px-1.5 py-0.5">Off</span>}
      </div>
      <h3 className="font-semibold text-foreground">{MODULE_LABELS[moduleKey]}</h3>
      <p className="text-xs text-muted-foreground mt-0.5">{MODULE_DESCRIPTIONS[moduleKey]}</p>
      {enabled ? (
        <div className="mt-4 pt-3 border-t border-border">
          {primary ? (
            <>
              <p className="text-xl font-bold text-foreground">{primary}</p>
              {secondary && <p className="text-[11px] text-muted-foreground">{secondary}</p>}
            </>
          ) : (
            <p className="text-xs text-muted-foreground">No data yet</p>
          )}
          {link && (
            <div className="text-xs text-primary mt-3 flex items-center gap-1">
              Open <ArrowRight className="h-3 w-3" />
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground">Enable in Settings → Modules</p>
        </div>
      )}
    </div>
  );
  if (link && enabled) return <Link href={link}>{card}</Link>;
  return card;
}

const TINT_CLASSES: Record<string, string> = {
  cyan: "bg-cyan-500/15 text-cyan-400",
  red: "bg-red-500/15 text-red-400",
  blue: "bg-blue-500/15 text-blue-400",
  emerald: "bg-emerald-500/15 text-emerald-400",
  yellow: "bg-yellow-500/15 text-yellow-400",
  primary: "bg-primary/15 text-primary",
};

function KpiCard({ icon: Icon, label, value, tint, href }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string; tint: string; href?: string;
}) {
  const card = (
    <div className="bg-card border border-card-border rounded-xl p-3 hover:border-primary/40 transition-colors">
      <div className="flex items-center gap-2">
        <div className={`h-7 w-7 rounded-md flex items-center justify-center ${TINT_CLASSES[tint] ?? TINT_CLASSES.primary}`}>
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      </div>
      <p className="text-lg font-bold mt-1.5">{value}</p>
    </div>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}

export default function DashboardPage() {
  const org = getCurrentOrg();
  const modules = getModules(org);
  const limits = getLimits(org);
  const { data: summary } = useGetDashboardSummary();
  const { data: widgets } = useGetDashboardWidgets();
  const { data: membersRaw } = useListMembers();
  const members = Array.isArray(membersRaw) ? membersRaw : [];
  const { data: insights } = useGetAiInsights();
  const [query, setQuery] = useState("");
  const nlSearch = useAiNlSearch();

  const moduleOrder: ModuleKey[] = ["sales", "leads", "inventory", "purchase", "marketing", "social", "hr", "accounting"];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">Welcome, {org?.name}</h1>
        </div>
        <p className="text-sm text-muted-foreground">Your workspace overview</p>
      </div>

      {/* AI insights + NL search */}
      <div className="grid lg:grid-cols-3 gap-3 mb-6">
        <div className="lg:col-span-2 bg-card border border-card-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="h-4 w-4 text-yellow-400" />
            <h2 className="font-semibold text-sm">Today's AI insights</h2>
            {insights?.cached && <span className="text-[10px] text-muted-foreground">cached</span>}
          </div>
          {insights?.insights ? (
            <>
              <p className="text-sm font-medium mb-2">{insights.insights.headline ?? "Activity summary"}</p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4 mb-3">
                {(Array.isArray(insights.insights.bullets) ? insights.insights.bullets : []).map((b, i) => <li key={i}>{b}</li>)}
              </ul>
              {Array.isArray(insights.insights.suggestions) && insights.insights.suggestions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {insights.insights.suggestions.map((s, i) => (
                    <span key={i} className="text-[11px] px-2 py-0.5 rounded bg-primary/10 text-primary">{s}</span>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Insights will appear here once you have activity.</p>
          )}
        </div>
        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Search className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-sm">Ask anything</h2>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); if (query) nlSearch.mutate({ data: { query } }); }} className="flex gap-2">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="show me unpaid invoices over ₹50,000" />
            <Button type="submit" size="sm" disabled={!query || nlSearch.isPending}>Go</Button>
          </form>
          {nlSearch.data && (
            <div className="mt-3 text-xs space-y-1">
              <p className="text-muted-foreground italic">{nlSearch.data.plan?.explanation ?? "Search complete"}</p>
              <p className="text-[11px] text-muted-foreground">{Array.isArray(nlSearch.data.results) ? nlSearch.data.results.length : 0} result{(Array.isArray(nlSearch.data.results) ? nlSearch.data.results.length : 0) === 1 ? "" : "s"}</p>
              <ul className="space-y-0.5 max-h-40 overflow-y-auto">
                {(Array.isArray(nlSearch.data.results) ? nlSearch.data.results : []).slice(0, 6).map((r, i) => {
                  const row = r as Record<string, unknown>;
                  return <li key={i} className="truncate">• {Object.entries(row).slice(0, 4).map(([k, v]) => `${k}: ${String(v)}`).join(" · ")}</li>;
                })}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Usage badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-card border border-card-border rounded-lg p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Team</p>
          <p className="text-lg font-bold mt-1">{members?.length ?? 0}<span className="text-sm text-muted-foreground"> / {limits.members}</span></p>
        </div>
        <div className="bg-card border border-card-border rounded-lg p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Leads / mo</p>
          <p className="text-lg font-bold mt-1">0<span className="text-sm text-muted-foreground"> / {limits.leadsPerMonth}</span></p>
        </div>
        <div className="bg-card border border-card-border rounded-lg p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Emails / mo</p>
          <p className="text-lg font-bold mt-1">0<span className="text-sm text-muted-foreground"> / {limits.emailsPerMonth}</span></p>
        </div>
        <div className="bg-card border border-card-border rounded-lg p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Storage</p>
          <p className="text-lg font-bold mt-1">0<span className="text-sm text-muted-foreground"> / {limits.storageMB} MB</span></p>
        </div>
      </div>

      {/* Live KPI widgets */}
      {widgets && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <KpiCard icon={TrendingUp} label="New leads today" value={String(widgets.newLeadsToday)} tint="cyan" href="/leads" />
          <KpiCard icon={Flame} label="Hot leads" value={String(widgets.hotLeads)} tint="red" href="/leads" />
          <KpiCard icon={Phone} label="Calls this week" value={String(widgets.callsThisWeek)} tint="blue" />
          <KpiCard icon={Mail} label="Emails sent (wk)" value={String(widgets.emailsSentThisWeek)} tint="emerald" />
          <KpiCard icon={Receipt} label="Unpaid invoices" value={String(widgets.invoicesUnpaid)} tint="yellow" href="/invoices" />
          <KpiCard icon={Sparkles} label="Revenue this month" value={formatCurrency(widgets.revenueThisMonth)} tint="primary" />
          <KpiCard icon={FileText} label="Quotes sent (wk)" value={String(widgets.quotationsSentThisWeek)} tint="blue" href="/quotations" />
          <KpiCard icon={AlertTriangle} label="Overdue ₹" value={formatCurrency(widgets.overdueAmount)} tint="red" href="/invoices" />
          <KpiCard icon={CheckSquare} label="Open tasks" value={String(widgets.openTasks)} tint="cyan" href="/tasks" />
          {modules.inventory && (
            <KpiCard icon={PackageOpen} label="Low stock" value={String(widgets.lowStockItems ?? 0)} tint="red" href="/inventory" />
          )}
          {modules.purchase && (
            <KpiCard icon={ShoppingCart} label="Open POs" value={String(widgets.openPurchaseOrders ?? 0)} tint="blue" href="/purchase-orders" />
          )}
          {modules.inventory && (
            <KpiCard icon={Warehouse} label="Stock value" value={formatCurrency(widgets.stockValue ?? 0)} tint="emerald" href="/inventory" />
          )}
        </div>
      )}

      {/* Low-stock list with quick "Create PO" links */}
      {modules.inventory && <LowStockPanel />}

      {/* Module cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {moduleOrder.map((key) => {
          let primary: string | undefined;
          let secondary: string | undefined;
          if (key === "sales" && modules.sales && summary) {
            primary = formatCurrency(summary.approvedValue ?? 0);
            secondary = `${summary.totalQuotations ?? 0} quotations`;
          }
          if (key === "leads" && modules.leads && widgets) {
            primary = String(widgets.hotLeads);
            secondary = `${widgets.newLeadsToday} new today`;
          }
          if (key === "inventory" && modules.inventory && widgets) {
            primary = formatCurrency(widgets.stockValue ?? 0);
            secondary = `${widgets.lowStockItems ?? 0} low-stock items`;
          }
          if (key === "purchase" && modules.purchase && widgets) {
            primary = String(widgets.openPurchaseOrders ?? 0);
            secondary = "open purchase orders";
          }
          if (key === "marketing" && modules.marketing && widgets) {
            primary = String(widgets.emailsSentThisWeek);
            secondary = "emails sent this week";
          }
          return <ModuleCard key={key} moduleKey={key} enabled={modules[key]} primary={primary} secondary={secondary} />;
        })}
      </div>
    </div>
  );
}
