import { useParams, useLocation, Link } from "wouter";
import { useGetSalesOrder, usePromoteSalesOrderToInvoice, useUpdateSalesOrder, useListItems, useListWarehouses, getGetSalesOrderQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, FileText, AlertTriangle, CheckCircle2, CheckCircle, XCircle, Undo2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";

export default function SalesOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: order } = useGetSalesOrder(id);
  const { data: items = [] } = useListItems();
  const { data: warehouses = [] } = useListWarehouses();
  const promoteMut = usePromoteSalesOrderToInvoice({
    mutation: {
      onSuccess(inv) {
        toast({ title: "Invoice created" });
        navigate(`/invoices/${inv.id}`);
      },
    },
  });
  const updateMut = useUpdateSalesOrder({
    mutation: {
      onSuccess() {
        qc.invalidateQueries({ queryKey: getGetSalesOrderQueryKey(id) });
      },
      onError(err: unknown) {
        const e = err as { response?: { data?: { error?: string; shortages?: Array<{ itemId: number; needed: number; available: number }>; unlinkedLines?: Array<{ description: string }> } } };
        const data = e?.response?.data;
        if (data?.shortages?.length) {
          const lines = data.shortages
            .map((s) => {
              const it = items.find((i) => i.id === s.itemId);
              return `${it?.name ?? `Item #${s.itemId}`}: need ${s.needed}, have ${s.available}`;
            })
            .join("; ");
          toast({ title: "Insufficient stock", description: lines, variant: "destructive" });
        } else if (data?.unlinkedLines?.length) {
          toast({
            title: "Link inventory items first",
            description: data.unlinkedLines.map((u) => u.description).join(", "),
            variant: "destructive",
          });
        } else {
          toast({ title: "Update failed", description: data?.error ?? "Unknown error", variant: "destructive" });
        }
      },
    },
  });
  function setStatus(status: "draft" | "confirmed" | "cancelled", warehouseId?: number | null) {
    const body: { status: typeof status; warehouseId?: number | null } = { status };
    if (warehouseId !== undefined) body.warehouseId = warehouseId;
    updateMut.mutate({ id, data: body });
  }
  function linkLineItem(lineId: number, itemId: number | null) {
    if (!order?.items) return;
    // When the user picks an inventory item, auto-fill description and unit
    // price from that item (matches the PO form UX). When clearing the link,
    // leave description and price as-is.
    const picked = itemId ? items.find((i) => i.id === itemId) : null;
    updateMut.mutate({
      id,
      data: {
        items: order.items.map((it) => {
          if (it.id !== lineId) {
            return {
              itemId: it.itemId ?? null,
              description: it.description,
              quantity: it.quantity,
              unitPrice: Number(it.unitPrice),
            };
          }
          return {
            itemId,
            description: picked?.name ?? it.description,
            quantity: it.quantity,
            unitPrice: picked?.salePrice ?? Number(it.unitPrice),
          };
        }),
      },
    });
  }
  if (!order) return <div className="p-6">Loading...</div>;
  const itemMap = new Map(items.map((i) => [i.id, i]));
  const orderWhId = order.warehouseId ?? null;
  // Detect oversell up front so the confirm button can be visually warned.
  const oversellLines = (order.items ?? []).filter((it) => {
    if (!it.itemId) return false;
    const av = it.availability?.find((a) => orderWhId ? a.warehouseId === orderWhId : a.isOrderWarehouse);
    return av ? av.available < it.quantity : false;
  });
  const hasOversell = oversellLines.length > 0;
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <Link href="/sales-orders"><span className="text-sm text-muted-foreground flex items-center gap-1 hover:text-foreground"><ArrowLeft className="h-4 w-4" />Back</span></Link>
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
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {order.status === "draft" && (
            <>
              <select
                aria-label="Warehouse"
                className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                value={order.warehouseId ?? ""}
                onChange={(e) => setStatus("draft", e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Default warehouse</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
              <Button
                size="sm"
                className="gap-1"
                variant={hasOversell ? "destructive" : "default"}
                disabled={updateMut.isPending}
                onClick={() => setStatus("confirmed")}
                title={hasOversell ? "Some lines exceed stock — server will block unless overselling is allowed" : undefined}
              >
                <CheckCircle className="h-4 w-4" />
                {hasOversell ? "Confirm anyway" : "Confirm & deduct stock"}
              </Button>
              <Button size="sm" variant="outline" className="gap-1" disabled={updateMut.isPending} onClick={() => setStatus("cancelled")}>
                <XCircle className="h-4 w-4" />Cancel
              </Button>
            </>
          )}
          {["confirmed", "in_production", "delivered"].includes(order.status) && (
            <>
              <Button size="sm" variant="outline" className="gap-1" disabled={updateMut.isPending} onClick={() => setStatus("draft")}>
                <Undo2 className="h-4 w-4" />Revert to draft (restore stock)
              </Button>
              <Button size="sm" className="gap-1" onClick={() => promoteMut.mutate({ salesOrderId: id })}>
                <FileText className="h-4 w-4" />Generate Invoice
              </Button>
            </>
          )}
          {order.status === "cancelled" && (
            <Button size="sm" variant="outline" className="gap-1" disabled={updateMut.isPending} onClick={() => setStatus("draft")}>
              <Undo2 className="h-4 w-4" />Reopen as draft
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-muted-foreground">
            <tr>
              <th className="text-left p-3">Item</th>
              <th className="text-right p-3">Qty</th>
              <th className="text-left p-3">Stock by warehouse</th>
              <th className="text-right p-3">Price</th>
              <th className="text-right p-3">Total</th>
            </tr>
          </thead>
          <tbody>
            {(order.items ?? []).map((it) => {
              const linked = it.itemId ? itemMap.get(it.itemId) : null;
              const availability = it.availability ?? [];
              const orderAv = availability.find((a) => orderWhId ? a.warehouseId === orderWhId : a.isOrderWarehouse);
              const oversell = orderAv != null && orderAv.available < it.quantity;
              const editable = order.status === "draft";
              return (
                <tr key={it.id} className={`border-t border-border ${oversell ? "bg-destructive/5" : ""}`}>
                  <td className="p-3 align-top">
                    <div>{it.description}</div>
                    {editable && (
                      <select
                        aria-label={`Link inventory item for ${it.description}`}
                        className="mt-1 h-7 rounded-md border border-input bg-background px-1 text-xs"
                        value={it.itemId ?? ""}
                        onChange={(e) => linkLineItem(it.id, e.target.value ? Number(e.target.value) : null)}
                      >
                        <option value="">— Unlinked —</option>
                        {items.map((opt) => (
                          <option key={opt.id} value={opt.id}>{opt.name} ({opt.sku})</option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="p-3 text-right align-top">{it.quantity}</td>
                  <td className="p-3 align-top">
                    {linked == null ? (
                      <span className="text-xs text-amber-500 inline-flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Unlinked
                      </span>
                    ) : availability.length === 0 ? (
                      <span className="text-xs text-muted-foreground">No warehouses</span>
                    ) : (
                      <ul className="space-y-0.5">
                        {availability.map((a) => {
                          const enough = a.available >= it.quantity;
                          const isOrderWh = orderWhId ? a.warehouseId === orderWhId : a.isOrderWarehouse;
                          return (
                            <li
                              key={a.warehouseId}
                              className={`text-xs inline-flex items-center gap-1 whitespace-nowrap ${isOrderWh ? "font-medium" : "text-muted-foreground"} ${isOrderWh && !enough ? "text-destructive" : isOrderWh && enough ? "text-emerald-500" : ""}`}
                            >
                              {isOrderWh && (enough ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />)}
                              <span>{a.warehouseName}:</span>
                              <span>{a.available} {linked.unit}</span>
                              {a.reserved > 0 && (
                                <span className="text-muted-foreground">({a.onHand} on hand · {a.reserved} held)</span>
                              )}
                              <span className="ml-1 flex-shrink-0 inline-block">{isOrderWh ? <span className="text-[10px] uppercase tracking-wide opacity-70">order wh</span> : null}</span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </td>
                  <td className="p-3 text-right align-top">{formatCurrency(it.unitPrice)}</td>
                  <td className="p-3 text-right align-top">{formatCurrency(it.totalPrice)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {hasOversell && order.status === "draft" && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 text-destructive text-sm p-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-medium">{oversellLines.length} line{oversellLines.length === 1 ? "" : "s"} exceed available stock in this warehouse.</div>
            <div className="text-xs mt-0.5 opacity-90">Confirming will be blocked unless an owner enables “Allow overselling” in Settings → Organization.</div>
          </div>
        </div>
      )}
    </div>
  );
}
