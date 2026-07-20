import { useGetVendorAgeing } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/format";
import { Truck } from "lucide-react";

export default function VendorAgeingPage() {
  const { data, isLoading } = useGetVendorAgeing();
  const rows = Array.isArray(data) ? data : [];
  const totals = rows.reduce(
    (s, r) => ({
      current: s.current + r.current,
      days30: s.days30 + r.days30,
      days60: s.days60 + r.days60,
      days90: s.days90 + r.days90,
      daysOver90: s.daysOver90 + r.daysOver90,
      total: s.total + r.total,
    }),
    { current: 0, days30: 0, days60: 0, days90: 0, daysOver90: 0, total: 0 },
  );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2"><Truck className="h-5 w-5" /> Vendor ageing</h1>
        <p className="text-sm text-muted-foreground">Outstanding vendor bills bucketed by age</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Current" value={formatCurrency(totals.current)} />
        <Stat label="1-30" value={formatCurrency(totals.days30)} />
        <Stat label="31-60" value={formatCurrency(totals.days60)} />
        <Stat label="61-90" value={formatCurrency(totals.days90)} />
        <Stat label="90+" value={formatCurrency(totals.daysOver90)} />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground border-b border-border">
            <tr><th className="p-3">Vendor</th><th className="p-3 text-right">Current</th><th className="p-3 text-right">1-30</th><th className="p-3 text-right">31-60</th><th className="p-3 text-right">61-90</th><th className="p-3 text-right">90+</th><th className="p-3 text-right">Total</th></tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Loading…</td></tr> :
             rows.length === 0 ? <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No outstanding bills</td></tr> :
             rows.map((r) => (
              <tr key={r.vendorId} className="border-b border-border/50 hover:bg-secondary/30">
                <td className="p-3 font-medium">{r.vendorName}</td>
                <td className="p-3 text-right">{formatCurrency(r.current)}</td>
                <td className="p-3 text-right">{formatCurrency(r.days30)}</td>
                <td className="p-3 text-right">{formatCurrency(r.days60)}</td>
                <td className="p-3 text-right">{formatCurrency(r.days90)}</td>
                <td className="p-3 text-right text-red-400">{formatCurrency(r.daysOver90)}</td>
                <td className="p-3 text-right font-bold">{formatCurrency(r.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-border bg-card p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="text-sm font-bold mt-1">{value}</p></div>;
}
