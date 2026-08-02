"use client";

import Link from "next/link";
import {
  useGetDashboardWidgets,
  useListQuotations,
  useListInvoices,
  useListSalesOrders,
} from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  FileText,
  ShoppingCart,
  Receipt,
  TrendingUp,
  ArrowRight,
  Flame,
  AlertTriangle,
  Loader2,
} from "lucide-react";

function StatCard({
  icon: Icon,
  label,
  value,
  tint,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tint: string;
  href?: string;
}) {
  const TINT: Record<string, string> = {
    cyan: "bg-cyan-500/15 text-cyan-400",
    red: "bg-red-500/15 text-red-400",
    blue: "bg-blue-500/15 text-blue-400",
    emerald: "bg-emerald-500/15 text-emerald-400",
    yellow: "bg-yellow-500/15 text-yellow-400",
    primary: "bg-primary/15 text-primary",
  };
  const card = (
    <div className="bg-card border border-card-border rounded-xl p-4 hover:border-primary/40 transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <div
          className={`h-8 w-8 rounded-lg flex items-center justify-center ${TINT[tint] ?? TINT.primary}`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
      </div>
      <p className="text-xl font-bold">{value}</p>
      {href && (
        <Link
          href={href}
          className="text-xs text-primary mt-2 inline-flex items-center gap-1 hover:underline"
        >
          View details <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}

function RecentTable({
  title,
  columns,
  rows,
  emptyMessage,
}: {
  title: string;
  columns: { key: string; label: string }[];
  rows: Record<string, unknown>[];
  emptyMessage: string;
}) {
  return (
    <div className="bg-card border border-card-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      {rows.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className="text-left px-4 py-2 font-medium text-muted-foreground"
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-border last:border-0 hover:bg-muted/20"
                >
                  {columns.map((c) => (
                    <td key={c.key} className="px-4 py-2.5">
                      {String(row[c.key] ?? "-")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function SalesDashboardPage() {
  const { data: widgets, isLoading: widgetsLoading } = useGetDashboardWidgets();
  const { data: quotationsRaw, isLoading: quotesLoading } = useListQuotations();
  const { data: invoicesRaw, isLoading: invoicesLoading } = useListInvoices();
  const { data: salesOrdersRaw, isLoading: soLoading } = useListSalesOrders();

  const quotations = Array.isArray(quotationsRaw) ? quotationsRaw : [];
  const invoices = Array.isArray(invoicesRaw) ? invoicesRaw : [];
  const salesOrders = Array.isArray(salesOrdersRaw) ? salesOrdersRaw : [];

  const isLoading = widgetsLoading || quotesLoading || invoicesLoading || soLoading;

  const pendingQuotes = quotations.filter(
    (q: any) => q.status === "draft" || q.status === "sent",
  );
  const approvedQuotes = quotations.filter((q: any) => q.status === "approved");
  const wonQuotes = quotations.filter((q: any) => q.status === "won");
  const totalQuoteValue = quotations.reduce(
    (s: number, q: any) => s + Number(q.total ?? q.grandTotal ?? 0),
    0,
  );

  const unpaidInvoices = invoices.filter(
    (i: any) => i.status !== "paid" && i.status !== "cancelled" && i.status !== "draft",
  );
  const overdueInvoices = invoices.filter((i: any) => i.status === "overdue");
  const totalOverdue = overdueInvoices.reduce(
    (s: number, i: any) => s + (Number(i.total) - Number(i.amountPaid ?? 0)),
    0,
  );

  const recentQuotations = quotations
    .slice()
    .sort((a: any, b: any) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
    .slice(0, 8)
    .map((q: any) => ({
      number: q.quotationNumber ?? q.number ?? "-",
      client: q.clientName ?? "-",
      status: q.status ?? "-",
      total: formatCurrency(Number(q.total ?? q.grandTotal ?? 0)),
      date: formatDate(q.createdAt),
      _id: q.id,
    }));

  const recentInvoices = invoices
    .slice()
    .sort((a: any, b: any) => (b.issueDate ?? b.createdAt ?? "").localeCompare(a.issueDate ?? a.createdAt ?? ""))
    .slice(0, 8)
    .map((i: any) => ({
      number: i.invoiceNumber ?? "-",
      client: i.clientName ?? "-",
      status: i.status ?? "-",
      total: formatCurrency(Number(i.total ?? 0)),
      balance: formatCurrency(Number(i.total ?? 0) - Number(i.amountPaid ?? 0)),
      date: formatDate(i.issueDate ?? i.createdAt),
      _id: i.id,
    }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Sales Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of your sales pipeline and revenue
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          icon={FileText}
          label="Total quotes"
          value={String(quotations.length)}
          tint="blue"
          href="/dashboard/quotations"
        />
        <StatCard
          icon={Flame}
          label="Pending quotes"
          value={String(pendingQuotes.length)}
          tint="yellow"
          href="/dashboard/quotations"
        />
        <StatCard
          icon={TrendingUp}
          label="Quote value"
          value={formatCurrency(totalQuoteValue)}
          tint="primary"
        />
        <StatCard
          icon={TrendingUp}
          label="Won deals"
          value={String(wonQuotes.length)}
          tint="emerald"
          href="/dashboard/quotations"
        />
        <StatCard
          icon={ShoppingCart}
          label="Sales orders"
          value={String(salesOrders.length)}
          tint="cyan"
          href="/dashboard/sales-orders"
        />
        <StatCard
          icon={Receipt}
          label="Total invoices"
          value={String(invoices.length)}
          tint="blue"
          href="/dashboard/invoices"
        />
        <StatCard
          icon={Receipt}
          label="Unpaid invoices"
          value={String(unpaidInvoices.length)}
          tint="yellow"
          href="/dashboard/invoices"
        />
        <StatCard
          icon={AlertTriangle}
          label="Overdue"
          value={formatCurrency(totalOverdue)}
          tint="red"
          href="/dashboard/invoices"
        />
      </div>

      {/* Revenue KPIs from widgets */}
      {widgets && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-card border border-card-border rounded-xl p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Revenue (this month)
            </p>
            <p className="text-xl font-bold mt-1">
              {formatCurrency(widgets.revenueThisMonth)}
            </p>
          </div>
          <div className="bg-card border border-card-border rounded-xl p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Quotes sent (week)
            </p>
            <p className="text-xl font-bold mt-1">
              {widgets.quotationsSentThisWeek}
            </p>
          </div>
          <div className="bg-card border border-card-border rounded-xl p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Hot leads
            </p>
            <p className="text-xl font-bold mt-1">{widgets.hotLeads}</p>
          </div>
          <div className="bg-card border border-card-border rounded-xl p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              New leads (today)
            </p>
            <p className="text-xl font-bold mt-1">{widgets.newLeadsToday}</p>
          </div>
        </div>
      )}

      {/* Recent tables */}
      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <RecentTable
          title="Recent Quotations"
          columns={[
            { key: "number", label: "Quote #" },
            { key: "client", label: "Client" },
            { key: "status", label: "Status" },
            { key: "total", label: "Total" },
            { key: "date", label: "Date" },
          ]}
          rows={recentQuotations}
          emptyMessage="No quotations yet"
        />
        <RecentTable
          title="Recent Invoices"
          columns={[
            { key: "number", label: "Invoice #" },
            { key: "client", label: "Client" },
            { key: "status", label: "Status" },
            { key: "total", label: "Total" },
            { key: "balance", label: "Balance" },
            { key: "date", label: "Date" },
          ]}
          rows={recentInvoices}
          emptyMessage="No invoices yet"
        />
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/dashboard/quotations/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <FileText className="h-4 w-4" /> New Quotation
        </Link>
        <Link
          href="/dashboard/sales-orders"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
        >
          <ShoppingCart className="h-4 w-4" /> Sales Orders
        </Link>
        <Link
          href="/dashboard/invoices"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
        >
          <Receipt className="h-4 w-4" /> Invoices
        </Link>
      </div>
    </div>
  );
}
