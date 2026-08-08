"use client";

import Link from "next/link";
import { useListSalesOrders } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { ShoppingCart } from "lucide-react";
import { DraggableTh } from "@/components/draggable-th";
import { useColumnReorder } from "@/hooks/use-column-reorder";
import DailyReportsPanel from "@/components/daily-reports-panel";
import ExcelExportButton from "@/components/excel-export-button";

export default function SalesOrdersPage() {
  const { data: ordersRaw } = useListSalesOrders();
  const orders = Array.isArray(ordersRaw) ? ordersRaw : [];
  const colReorder = useColumnReorder();
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold">Sales Orders</h1>
          <p className="text-sm text-muted-foreground">{orders.length} orders</p>
        </div>
        <ExcelExportButton
          rows={orders.map((o) => ({
            "Order #": o.orderNumber, Client: o.clientName ?? "", Status: o.status,
            Subtotal: o.subtotal, Discount: o.discountAmount ?? 0, Tax: o.taxAmount ?? 0,
            Total: o.total, "Expected Delivery": o.expectedDeliveryAt ?? "",
            Notes: o.notes ?? "", Created: o.createdAt ?? "",
          }))}
          columns={["Order #", "Client", "Status", "Subtotal", "Discount", "Tax", "Total", "Expected Delivery", "Notes", "Created"]}
          filename="sales-orders"
          amountKeys={["Subtotal", "Discount", "Tax", "Total"]}
        />
      </div>
      {orders.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <ShoppingCart className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No sales orders yet. Promote a quotation to create one.</p>
        </div>
      ) : (
        <>
          <p className="text-[11px] text-muted-foreground">Drag column headers to reorder</p>
          <div className="rounded-xl border border-border overflow-x-auto hidden sm:block">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-muted-foreground">
                <tr>
                  <DraggableTh idx={0} {...colReorder} className="text-left p-3">Order #</DraggableTh>
                  <DraggableTh idx={1} {...colReorder} className="text-left p-3">Client</DraggableTh>
                  <DraggableTh idx={2} {...colReorder} className="text-left p-3">Status</DraggableTh>
                  <DraggableTh idx={3} {...colReorder} className="text-right p-3">Total</DraggableTh>
                  <DraggableTh idx={4} {...colReorder} className="text-left p-3">Date</DraggableTh>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-t border-border hover:bg-secondary/50">
                    <td className="p-3 font-medium"><Link href={`/dashboard/sales-orders/${o.id}`}><span className="text-primary">{o.orderNumber}</span></Link></td>
                    <td className="p-3">{o.clientName ?? "—"}</td>
                    <td className="p-3 capitalize">{o.status}</td>
                    <td className="p-3 text-right">{formatCurrency(o.total)}</td>
                    <td className="p-3 text-muted-foreground">{formatDate(o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="sm:hidden space-y-3">
            {orders.map((o) => (
              <Link key={o.id} href={`/dashboard/sales-orders/${o.id}`} className="block rounded-xl border border-border bg-card p-4 space-y-2 hover:border-primary/30">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-primary">{o.orderNumber}</span>
                  <span className="text-xs capitalize">{o.status}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{o.clientName ?? "—"}</span>
                  <span className="font-semibold">{formatCurrency(o.total)}</span>
                </div>
                <p className="text-xs text-muted-foreground">{formatDate(o.createdAt)}</p>
              </Link>
            ))}
          </div>
        </>
      )}

      <DailyReportsPanel title="Daily Reports" />
    </div>
  );
}
