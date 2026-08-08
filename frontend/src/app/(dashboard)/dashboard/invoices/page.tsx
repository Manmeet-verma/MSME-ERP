"use client";

import { useState } from "react";
import Link from "next/link";
import { useListInvoices } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { Receipt } from "lucide-react";
import { DraggableTh } from "@/components/draggable-th";
import { useColumnReorder } from "@/hooks/use-column-reorder";
import ExcelExportButton from "@/components/excel-export-button";

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
  const colReorder = useColumnReorder();
  const { data: invoicesRaw } = useListInvoices(status === "all" ? undefined : { status });
  const invoices = Array.isArray(invoicesRaw) ? invoicesRaw : [];
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold">Invoices</h1>
          <p className="text-sm text-muted-foreground">{invoices.length} invoices</p>
        </div>
        <ExcelExportButton
          rows={invoices.map((v) => ({
            "Invoice #": v.invoiceNumber, Client: v.clientName ?? "", Status: v.status,
            "Issue Date": v.issueDate ?? "", "Due Date": v.dueDate ?? "", Subtotal: v.subtotal ?? 0,
            Discount: v.discountAmount ?? 0, Taxable: v.taxableAmount ?? 0, Total: v.total ?? 0,
            Paid: v.amountPaid ?? 0, CGST: v.cgst ?? 0, SGST: v.sgst ?? 0, IGST: v.igst ?? 0,
          }))}
          columns={["Invoice #", "Client", "Status", "Issue Date", "Due Date", "Subtotal", "Discount", "Taxable", "CGST", "SGST", "IGST", "Total", "Paid"]}
          filename="invoices"
          amountKeys={["Subtotal", "Discount", "Taxable", "CGST", "SGST", "IGST", "Total", "Paid"]}
        />
      </div>
      <div className="flex gap-2 flex-wrap overflow-x-auto scrollbar-hide pb-1">
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize whitespace-nowrap ${status === s ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
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
        <>
          <p className="text-[11px] text-muted-foreground">Drag column headers to reorder</p>
          {/* Desktop table */}
          <div className="hidden sm:block rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary text-muted-foreground">
                  <tr>
                    <DraggableTh idx={0} {...colReorder} className="text-left p-3">Invoice #</DraggableTh>
                    <DraggableTh idx={1} {...colReorder} className="text-left p-3">Client</DraggableTh>
                    <DraggableTh idx={2} {...colReorder} className="text-left p-3">Status</DraggableTh>
                    <DraggableTh idx={3} {...colReorder} className="text-right p-3">Total</DraggableTh>
                    <DraggableTh idx={4} {...colReorder} className="text-right p-3">Paid</DraggableTh>
                    <DraggableTh idx={5} {...colReorder} className="text-left p-3">Issued</DraggableTh>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((i) => (
                    <tr key={i.id} className="border-t border-border hover:bg-secondary/50">
                      <td className="p-3 font-medium"><Link href={`/dashboard/invoices/${i.id}`}><span className="text-primary">{i.invoiceNumber}</span></Link></td>
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
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {invoices.map((i) => (
              <Link key={i.id} href={`/dashboard/invoices/${i.id}`}>
                <div className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 active:bg-muted/50">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold text-primary">{i.invoiceNumber}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{i.clientName ?? "—"}</p>
                    </div>
                    <span className={`text-[10px] uppercase px-2 py-0.5 rounded ${STATUS_COLORS[i.status]}`}>{i.status}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{formatDate(i.issueDate)}</span>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(i.total ?? 0)}</p>
                      {(i.amountPaid ?? 0) > 0 && (
                        <p className="text-muted-foreground text-[10px]">Paid: {formatCurrency(i.amountPaid ?? 0)}</p>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
