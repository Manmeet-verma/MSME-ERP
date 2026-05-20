import { useParams, useLocation, Link } from "wouter";
import { useGetSalesOrder, usePromoteSalesOrderToInvoice } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, FileText } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";

export default function SalesOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { data: order } = useGetSalesOrder(id);
  const promoteMut = usePromoteSalesOrderToInvoice({
    mutation: {
      onSuccess(inv) {
        toast({ title: "Invoice created" });
        navigate(`/invoices/${inv.id}`);
      },
    },
  });
  if (!order) return <div className="p-6">Loading...</div>;
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <Link href="/sales-orders"><a className="text-sm text-muted-foreground flex items-center gap-1 hover:text-foreground"><ArrowLeft className="h-4 w-4" />Back</a></Link>
      <div className="bg-card border border-card-border rounded-xl p-5">
        <div className="flex justify-between items-start flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold">{order.orderNumber}</h1>
            <p className="text-sm text-muted-foreground">{order.clientName ?? "No client"} · {formatDate(order.createdAt)}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{formatCurrency(order.total)}</p>
            <p className="text-xs text-muted-foreground capitalize">{order.status}</p>
          </div>
        </div>
        <Button size="sm" className="mt-4 gap-1" onClick={() => promoteMut.mutate({ salesOrderId: id })}>
          <FileText className="h-4 w-4" />Generate Invoice
        </Button>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-muted-foreground">
            <tr><th className="text-left p-3">Item</th><th className="text-right p-3">Qty</th><th className="text-right p-3">Price</th><th className="text-right p-3">Total</th></tr>
          </thead>
          <tbody>
            {(order.items ?? []).map((it) => (
              <tr key={it.id} className="border-t border-border">
                <td className="p-3">{it.description}</td>
                <td className="p-3 text-right">{it.quantity}</td>
                <td className="p-3 text-right">{formatCurrency(it.unitPrice)}</td>
                <td className="p-3 text-right">{formatCurrency(it.totalPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
