import { Layout } from "@/components/layout";
import { useGetDashboardSummary, useGetMonthlyStats, useGetPipelineStats } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend
} from "recharts";
import {
  FileText, Users, TrendingUp, IndianRupee, ArrowUpRight,
  CheckCircle2, Clock, XCircle, Send
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  draft: "#6b7280",
  sent: "#3b82f6",
  approved: "#22c55e",
  rejected: "#ef4444",
};

const STATUS_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  draft: Clock,
  sent: Send,
  approved: CheckCircle2,
  rejected: XCircle,
};

function StatCard({
  title, value, icon: Icon, sub, color = "primary",
}: {
  title: string; value: string; icon: React.ComponentType<{ className?: string }>;
  sub?: string; color?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={`h-10 w-10 rounded-xl bg-${color}/15 flex items-center justify-center`}>
            <Icon className={`h-5 w-5 text-${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data: summary, isLoading } = useGetDashboardSummary();
  const { data: monthly } = useGetMonthlyStats();
  const { data: pipeline } = useGetPipelineStats();

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Welcome back — here's what's happening</p>
          </div>
          <Link href="/quotations/new">
            <a className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors">
              <FileText className="h-4 w-4" />
              New Quotation
            </a>
          </Link>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent></Card>
            ))
          ) : (
            <>
              <StatCard
                title="Total Quotations"
                value={String(summary?.totalQuotations ?? 0)}
                icon={FileText}
                sub="All time"
              />
              <StatCard
                title="Total Revenue"
                value={formatCurrency(summary?.totalRevenue ?? 0)}
                icon={IndianRupee}
                sub="Approved"
                color="accent"
              />
              <StatCard
                title="Total Clients"
                value={String(summary?.totalClients ?? 0)}
                icon={Users}
                sub="Active clients"
                color="chart-2"
              />
              <StatCard
                title="Conversion Rate"
                value={`${summary?.conversionRate ?? 0}%`}
                icon={TrendingUp}
                sub="Approved / total"
                color="chart-3"
              />
            </>
          )}
        </div>

        {/* Charts row */}
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Monthly revenue */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Monthly Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthly ?? []} barSize={20}>
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#6b7280" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `₹${Math.round(v / 1000)}k`}
                  />
                  <Tooltip
                    formatter={(v: number) => [formatCurrency(v), "Revenue"]}
                    contentStyle={{ background: "hsl(222 40% 9%)", border: "1px solid hsl(220 20% 18%)", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "#e2e8f0" }}
                  />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]} fill="hsl(217 91% 60%)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Pipeline */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Quotation Pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={pipeline ?? []}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                  >
                    {(pipeline ?? []).map((entry) => (
                      <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? "#6b7280"} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v, name) => [v, name]}
                    contentStyle={{ background: "hsl(222 40% 9%)", border: "1px solid hsl(220 20% 18%)", borderRadius: 8, fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-1.5">
                {(pipeline ?? []).map((p) => {
                  const Icon = STATUS_ICONS[p.status] ?? Clock;
                  return (
                    <div key={p.status} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5" style={{ color: STATUS_COLORS[p.status] }} />
                        <span className="capitalize text-muted-foreground">{p.status}</span>
                      </div>
                      <span className="font-medium">{p.count}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent quotations */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Recent Quotations</CardTitle>
              <Link href="/quotations">
                <a className="text-xs text-primary flex items-center gap-1 hover:underline">
                  View all <ArrowUpRight className="h-3 w-3" />
                </a>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Quote #</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-3 py-3">Client</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-3 py-3">Status</th>
                    <th className="text-right text-xs font-medium text-muted-foreground px-6 py-3">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(summary?.recentQuotations ?? []).map((q) => (
                    <tr key={q.id} className="border-b border-border/50 hover:bg-card/50 transition-colors">
                      <td className="px-6 py-3">
                        <Link href={`/quotations/${q.id}`}>
                          <a className="font-mono text-xs text-primary hover:underline">{q.quotationNumber}</a>
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">{(q as { clientName?: string }).clientName ?? "—"}</td>
                      <td className="px-3 py-3">
                        <Badge
                          variant="outline"
                          className="text-[10px] capitalize"
                          style={{ color: STATUS_COLORS[q.status], borderColor: STATUS_COLORS[q.status] + "40" }}
                        >
                          {q.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 text-right font-medium text-xs">{formatCurrency(q.total)}</td>
                    </tr>
                  ))}
                  {(summary?.recentQuotations ?? []).length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center text-muted-foreground text-xs py-8">No quotations yet</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
