import { useState } from "react";
import { Link } from "wouter";
import { useListInvoices } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { Receipt } from "lucide-react";

const STATUSES = ["all", "draft", "sent", "partial", "paid", "overdue", "cancelled"] as const;
type StatusFilter = (typeof STATUSES)[number];
const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-500/15 text-gray-300",
  sent: "bg-blue-500/15 text-blue-400",
  partial: "bg-yellow-500/15 text-yellow-400",
  paid: "bg-green-500/15 text-green-400",
  overdue: "bg-red-500/15 text-red-400",
  cancelled: "bg-gray-500/15 text-gray-400",
};

export default function InvoicesPage() {
  const [status, setStatus] = useState<StatusFilter>("all");
  const { data: invoicesRaw } = useListInvoices(status === "all" ? undefined : { status });
  const invoices = Array.isArray(invoicesRaw) ? invoicesRaw : [];
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold">Invoices</h1>
        <p className="text-sm text-muted-foreground">{invoices.length} invoices</p>
      </div>
      <div className="flex gap-2 flex-wrap">
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${status === s ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
            {s}
          </button>
        ))}
      </div>
      {invoices.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <Receipt className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No invoices.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-muted-foreground">
              <tr>
                <th className="text-left p-3">Invoice #</th>
                <th className="text-left p-3">Client</th>
                <th className="text-left p-3">Status</th>
                <th className="text-right p-3">Total</th>
                <th className="text-right p-3">Paid</th>
                <th className="text-left p-3">Issued</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.id} className="border-t border-border hover:bg-secondary/50">
                  <td className="p-3 font-medium"><Link href={`/invoices/${i.id}`}><span className="text-primary">{i.invoiceNumber}</span></Link></td>
                  <td className="p-3">{i.clientName ?? "—"}</td>
                  <td className="p-3"><span className={`text-[10px] uppercase px-2 py-0.5 rounded ${STATUS_COLORS[i.status]}`}>{i.status}</span></td>
                  <td className="p-3 text-right">{formatCurrency(i.total ?? 0)}</td>
                  <td className="p-3 text-right text-muted-foreground">{formatCurrency(i.amountPaid ?? 0)}</td>
                  <td className="p-3 text-muted-foreground">{formatDate(i.issueDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
