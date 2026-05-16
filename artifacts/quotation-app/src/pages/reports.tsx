import { Layout } from "@/components/layout";
import { useGetDashboardSummary, useGetMonthlyStats, useGetTopProducts } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Cell
} from "recharts";

const COLORS = ["#3b82f6", "#06b6d4", "#22c55e", "#f59e0b", "#8b5cf6", "#ef4444", "#ec4899", "#14b8a6"];

const tooltipStyle = {
  contentStyle: { background: "hsl(222 40% 9%)", border: "1px solid hsl(220 20% 18%)", borderRadius: 8, fontSize: 12 },
  labelStyle: { color: "#e2e8f0" },
};

export default function ReportsPage() {
  const { data: summary, isLoading } = useGetDashboardSummary();
  const { data: monthly } = useGetMonthlyStats();
  const { data: topProducts } = useGetTopProducts();

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold">Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground">Business performance overview</p>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent></Card>
            ))
          ) : (
            [
              { label: "Total Revenue", value: formatCurrency(summary?.totalRevenue ?? 0), sub: "from approved quotes" },
              { label: "Total Quotations", value: String(summary?.totalQuotations ?? 0), sub: "all time" },
              { label: "Active Clients", value: String(summary?.totalClients ?? 0), sub: "in CRM" },
              { label: "Conversion Rate", value: `${summary?.conversionRate ?? 0}%`, sub: "approved / total" },
            ].map((kpi) => (
              <Card key={kpi.label}>
                <CardContent className="p-5">
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <p className="text-2xl font-bold mt-1">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Monthly revenue trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Monthly Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={monthly ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 20% 18%)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [formatCurrency(v), "Revenue"]} />
                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly quotation count */}
        <div className="grid lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Quotations Per Month</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthly ?? []} barSize={20}>
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip {...tooltipStyle} formatter={(v: number) => [v, "Quotations"]} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="hsl(188 90% 45%)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top products */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Top Products by Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topProducts ?? []} layout="vertical" barSize={14}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} />
                  <YAxis type="category" dataKey="productName" tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} width={120} />
                  <Tooltip {...tooltipStyle} formatter={(v: number) => [formatCurrency(v), "Revenue"]} />
                  <Bar dataKey="totalRevenue" radius={[0, 4, 4, 0]}>
                    {(topProducts ?? []).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
