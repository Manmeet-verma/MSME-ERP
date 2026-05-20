import { useState } from "react";
import { useGetReportsCatalog } from "@workspace/api-client-react";
import { getAuthToken } from "@/lib/auth";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, FileSpreadsheet, BarChart3 } from "lucide-react";

type ReportRow = Record<string, unknown>;

const NUM_KEYS = new Set([
  "subtotal", "cgst", "sgst", "igst", "total", "amountPaid", "balance",
  "taxAmount", "current", "days30", "days60", "days90", "daysOver90", "revenue",
]);

function formatCell(key: string, value: unknown): string {
  if (value == null || value === "") return "—";
  if (NUM_KEYS.has(key) && typeof value === "number") return formatCurrency(value);
  if (typeof value === "number") return String(value);
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  return String(value);
}

export default function ReportsPage() {
  const { data: catalog = [], isLoading } = useGetReportsCatalog();
  const [active, setActive] = useState<string | null>(null);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);

  async function loadReport(path: string, key: string) {
    setActive(key);
    setLoadingRows(true);
    try {
      const res = await fetch(`/api${path}`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      const data = (await res.json()) as ReportRow[];
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    } finally {
      setLoadingRows(false);
    }
  }

  async function exportFile(path: string, key: string, format: "csv" | "xlsx" | "pdf") {
    const res = await fetch(`/api${path}?format=${format}`, {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${key}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  const activeReport = catalog.find((c) => c.key === active);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold">Reports</h1>
        <p className="text-sm text-muted-foreground">Sales, purchase, customer ageing, ROI and engagement — exportable as CSV, Excel, or PDF.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
            ))
          : catalog.map((r) => (
              <button
                key={r.key}
                onClick={() => loadReport(r.path, r.key)}
                className={`text-left bg-card border rounded-xl p-4 transition-all ${active === r.key ? "border-primary/50" : "border-card-border hover:border-primary/30"}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-8 w-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                    <BarChart3 className="h-4 w-4" />
                  </div>
                  <h3 className="font-semibold text-sm">{r.label}</h3>
                </div>
                <p className="text-xs text-muted-foreground">{r.description}</p>
              </button>
            ))}
      </div>

      {activeReport && (
        <div className="bg-card border border-card-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between print:hidden">
            <div>
              <h2 className="font-semibold">{activeReport.label}</h2>
              <p className="text-xs text-muted-foreground">{activeReport.description}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="gap-1" onClick={() => exportFile(activeReport.path, activeReport.key, "csv")}>
                <FileSpreadsheet className="h-3 w-3" />CSV
              </Button>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => exportFile(activeReport.path, activeReport.key, "xlsx")}>
                <FileSpreadsheet className="h-3 w-3" />Excel
              </Button>
              <Button size="sm" variant="outline" className="gap-1" onClick={() => exportFile(activeReport.path, activeReport.key, "pdf")}>
                <FileText className="h-3 w-3" />PDF
              </Button>
            </div>
          </div>
          {loadingRows ? (
            <Skeleton className="h-40 w-full" />
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No data.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    {headers.map((h) => (
                      <th key={h} className="text-left py-2 px-2 font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      {headers.map((h) => (
                        <td key={h} className="py-1.5 px-2">{formatCell(h, row[h])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
