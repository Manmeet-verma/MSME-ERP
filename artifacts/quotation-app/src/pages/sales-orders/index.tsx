import { Link } from "wouter";
import { useListSalesOrders } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { ShoppingCart } from "lucide-react";

export default function SalesOrdersPage() {
  const { data: ordersRaw } = useListSalesOrders();
  const orders = Array.isArray(ordersRaw) ? ordersRaw : [];
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold">Sales Orders</h1>
        <p className="text-sm text-muted-foreground">{orders.length} orders</p>
      </div>
      {orders.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <ShoppingCart className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No sales orders yet. Promote a quotation to create one.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-muted-foreground">
              <tr>
                <th className="text-left p-3">Order #</th>
                <th className="text-left p-3">Client</th>
                <th className="text-left p-3">Status</th>
                <th className="text-right p-3">Total</th>
                <th className="text-left p-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-border hover:bg-secondary/50">
                  <td className="p-3 font-medium"><Link href={`/sales-orders/${o.id}`}><span className="text-primary">{o.orderNumber}</span></Link></td>
                  <td className="p-3">{o.clientName ?? "—"}</td>
                  <td className="p-3 capitalize">{o.status}</td>
                  <td className="p-3 text-right">{formatCurrency(o.total)}</td>
                  <td className="p-3 text-muted-foreground">{formatDate(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
