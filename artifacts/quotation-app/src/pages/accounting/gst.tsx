import { useState } from "react";
import { useGetGstr1, useGetGstr3b } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/format";
import { FileText, Download } from "lucide-react";
import { getAuthToken } from "@/lib/auth";

async function downloadReport(path: string, format: "csv" | "xlsx", filename: string) {
  const res = await fetch(`/api${path}&format=${format}`, {
    headers: { Authorization: `Bearer ${getAuthToken() ?? ""}` },
  });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${filename}.${format}`; a.click();
  URL.revokeObjectURL(url);
}

export default function GstPage() {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const end = today.toISOString().slice(0, 10);
  const [from, setFrom] = useState(start);
  const [to, setTo] = useState(end);
  const [tab, setTab] = useState<"gstr1" | "gstr3b">("gstr1");

  const { data: g1 } = useGetGstr1({ from, to });
  const { data: g3 } = useGetGstr3b({ from, to });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2"><FileText className="h-5 w-5" /> GST reports</h1>
        <p className="text-sm text-muted-foreground">Summary data for GSTR-1 and GSTR-3B — not for direct filing</p>
      </div>

      <div className="flex gap-3 flex-wrap items-end">
        <div><Label>From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><Label>To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        <div className="flex gap-1 pb-2 ml-auto">
          <button onClick={() => setTab("gstr1")} className={`px-3 py-1.5 rounded-md text-sm ${tab === "gstr1" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>GSTR-1</button>
          <button onClick={() => setTab("gstr3b")} className={`px-3 py-1.5 rounded-md text-sm ${tab === "gstr3b" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>GSTR-3B</button>
        </div>
      </div>

      {tab === "gstr1" && g1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Stat label="Invoices" value={String(g1.summary.invoices)} />
            <Stat label="Taxable" value={formatCurrency(g1.summary.taxableValue)} />
            <Stat label="CGST" value={formatCurrency(g1.summary.cgst)} />
            <Stat label="SGST" value={formatCurrency(g1.summary.sgst)} />
            <Stat label="IGST" value={formatCurrency(g1.summary.igst)} />
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-1" onClick={() => downloadReport(`/accounting/gstr1?from=${from}&to=${to}`, "csv", `gstr1-${from}_${to}`)}><Download className="h-3 w-3" /> CSV</Button>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => downloadReport(`/accounting/gstr1?from=${from}&to=${to}`, "xlsx", `gstr1-${from}_${to}`)}><Download className="h-3 w-3" /> Excel</Button>
          </div>
          <SectionTable title={`B2B (${g1.b2b.length})`} rows={g1.b2b} />
          <SectionTable title={`B2C (${g1.b2c.length})`} rows={g1.b2c} />
        </div>
      )}

      {tab === "gstr3b" && g3 && (
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="font-semibold mb-3">3.1 Outward supplies</p>
              <Row label="Taxable value" value={g3.outwardSupplies.taxable} />
              <Row label="CGST" value={g3.outwardSupplies.cgst} />
              <Row label="SGST" value={g3.outwardSupplies.sgst} />
              <Row label="IGST" value={g3.outwardSupplies.igst} />
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="font-semibold mb-3">4. ITC available</p>
              <Row label="CGST/SGST inputs" value={g3.itc.cgstSgstInputs} />
              <Row label="IGST inputs" value={g3.itc.igstInputs} />
              <Row label="Total ITC" value={g3.itc.total} bold />
            </div>
          </div>
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex justify-between items-center">
            <span className="font-semibold">Net tax payable</span>
            <span className="text-xl font-bold text-primary">{formatCurrency(g3.netTaxPayable)}</span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-1" onClick={() => downloadReport(`/accounting/gstr3b?from=${from}&to=${to}`, "csv", `gstr3b-${from}_${to}`)}><Download className="h-3 w-3" /> CSV</Button>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => downloadReport(`/accounting/gstr3b?from=${from}&to=${to}`, "xlsx", `gstr3b-${from}_${to}`)}><Download className="h-3 w-3" /> Excel</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-border bg-card p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="text-sm font-bold mt-1">{value}</p></div>;
}
function Row({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return <div className={`flex justify-between text-sm py-1.5 border-b border-border/40 ${bold ? "font-semibold" : ""}`}><span>{label}</span><span>{formatCurrency(value)}</span></div>;
}
function SectionTable({ title, rows }: { title: string; rows: Array<{ invoiceNumber: string; invoiceDate: string; clientName: string; gstin?: string; taxableValue: number; cgst: number; sgst: number; igst: number; invoiceTotal: number }> }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-x-auto">
      <p className="p-3 font-semibold border-b border-border text-sm">{title}</p>
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-muted-foreground border-b border-border">
          <tr><th className="p-3">Invoice</th><th className="p-3">Date</th><th className="p-3">Client</th><th className="p-3">GSTIN</th><th className="p-3 text-right">Taxable</th><th className="p-3 text-right">CGST</th><th className="p-3 text-right">SGST</th><th className="p-3 text-right">IGST</th><th className="p-3 text-right">Total</th></tr>
        </thead>
        <tbody>
          {rows.length === 0 ? <tr><td colSpan={9} className="p-4 text-center text-muted-foreground">No data</td></tr> :
            rows.map((r) => (
              <tr key={r.invoiceNumber} className="border-b border-border/50">
                <td className="p-3 text-xs font-mono">{r.invoiceNumber}</td>
                <td className="p-3 text-xs">{r.invoiceDate}</td>
                <td className="p-3 text-xs">{r.clientName}</td>
                <td className="p-3 text-[10px] font-mono">{r.gstin}</td>
                <td className="p-3 text-right">{formatCurrency(r.taxableValue)}</td>
                <td className="p-3 text-right text-xs">{formatCurrency(r.cgst)}</td>
                <td className="p-3 text-right text-xs">{formatCurrency(r.sgst)}</td>
                <td className="p-3 text-right text-xs">{formatCurrency(r.igst)}</td>
                <td className="p-3 text-right font-semibold">{formatCurrency(r.invoiceTotal)}</td>
              </tr>
            ))
          }
        </tbody>
      </table>
    </div>
  );
}
