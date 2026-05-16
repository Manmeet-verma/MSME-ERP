import { Layout } from "@/components/layout";
import { useGetQuotation, useUpdateQuotationStatus } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useParams } from "wouter";
import { ChevronLeft, Printer, Send, CheckCircle2, XCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const STATUS_COLORS: Record<string, string> = {
  draft: "#6b7280", sent: "#3b82f6", approved: "#22c55e", rejected: "#ef4444",
};

export default function QuotationDetailPage() {
  const params = useParams<{ id: string }>();
  const qId = parseInt(params.id ?? "0");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: quotation, isLoading } = useGetQuotation(qId);
  const statusMutation = useUpdateQuotationStatus({
    mutation: {
      onSuccess() {
        toast({ title: "Status updated" });
        qc.invalidateQueries({ queryKey: [`/api/quotations/${qId}`] });
      },
      onError() { toast({ title: "Failed to update status", variant: "destructive" }); },
    },
  });

  function updateStatus(status: "draft" | "sent" | "approved" | "rejected") {
    statusMutation.mutate({ id: qId, data: { status } });
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="p-6 max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Layout>
    );
  }

  if (!quotation) {
    return (
      <Layout>
        <div className="p-6 max-w-4xl mx-auto text-center py-16">
          <p className="text-muted-foreground">Quotation not found</p>
          <button onClick={() => navigate("/quotations")} className="text-primary text-sm hover:underline mt-2">← Back to quotations</button>
        </div>
      </Layout>
    );
  }

  const q = quotation as typeof quotation & {
    clientName?: string; clientCompany?: string; clientEmail?: string; clientPhone?: string; clientAddress?: string; clientGstNumber?: string;
    items?: Array<{ id: number; description: string; widthFt?: number; heightFt?: number; areaSqFt?: number; quantity: number; unitPrice: number; totalPrice: number; productName?: string }>;
    addons?: Array<{ id: number; description: string; quantity: number; price: number; totalPrice: number; addonName?: string }>;
  };

  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/quotations")} className="text-muted-foreground hover:text-foreground">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold font-mono">{q.quotationNumber}</h1>
                <Badge
                  variant="outline"
                  className="text-xs capitalize"
                  style={{ color: STATUS_COLORS[q.status], borderColor: STATUS_COLORS[q.status] + "40" }}
                >
                  {q.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">Valid until {formatDate(q.validUntil)}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <Button variant="outline" size="sm" className="gap-2 no-print" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5" /> Print
            </Button>
            {q.status === "draft" && (
              <Button size="sm" className="gap-2 no-print" onClick={() => updateStatus("sent")}>
                <Send className="h-3.5 w-3.5" /> Mark Sent
              </Button>
            )}
            {q.status === "sent" && (
              <>
                <Button size="sm" variant="outline" className="gap-2 text-green-400 border-green-400/40 hover:bg-green-400/10 no-print" onClick={() => updateStatus("approved")}>
                  <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                </Button>
                <Button size="sm" variant="outline" className="gap-2 text-destructive border-destructive/40 hover:bg-destructive/10 no-print" onClick={() => updateStatus("rejected")}>
                  <XCircle className="h-3.5 w-3.5" /> Reject
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Client & info */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">Client</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              <p className="font-semibold">{q.clientName ?? "—"}</p>
              {q.clientCompany && <p className="text-sm text-muted-foreground">{q.clientCompany}</p>}
              {q.clientEmail && <p className="text-xs text-muted-foreground">{q.clientEmail}</p>}
              {q.clientPhone && <p className="text-xs text-muted-foreground">{q.clientPhone}</p>}
              {q.clientAddress && <p className="text-xs text-muted-foreground">{q.clientAddress}</p>}
              {q.clientGstNumber && <p className="text-xs font-mono bg-secondary px-2 py-0.5 rounded w-fit">GST: {q.clientGstNumber}</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">Quotation Info</CardTitle></CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground text-xs">Created</span><span className="text-xs">{formatDate(q.createdAt)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground text-xs">Valid Until</span><span className="text-xs">{formatDate(q.validUntil)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground text-xs">GST</span><span className="text-xs">{q.taxPercent}%</span></div>
              {(q.discountPercent ?? 0) > 0 && (
                <div className="flex justify-between"><span className="text-muted-foreground text-xs">Discount</span><span className="text-xs text-green-400">{q.discountPercent}%</span></div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Line items */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Products</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-card/50">
                    <th className="text-left font-medium text-muted-foreground px-5 py-2">Description</th>
                    <th className="text-right font-medium text-muted-foreground px-3 py-2">Dimensions</th>
                    <th className="text-right font-medium text-muted-foreground px-3 py-2">Qty</th>
                    <th className="text-right font-medium text-muted-foreground px-3 py-2">Unit Price</th>
                    <th className="text-right font-medium text-muted-foreground px-5 py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(q.items ?? []).map((item) => (
                    <tr key={item.id} className="border-b border-border/50">
                      <td className="px-5 py-2.5">
                        <p className="font-medium">{item.description}</p>
                        {item.productName && item.productName !== item.description && (
                          <p className="text-[10px] text-muted-foreground">{item.productName}</p>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right text-muted-foreground">
                        {item.widthFt && item.heightFt
                          ? `${item.widthFt}ft × ${item.heightFt}ft = ${item.areaSqFt ?? item.widthFt * item.heightFt} sqft`
                          : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right">{item.quantity}</td>
                      <td className="px-3 py-2.5 text-right">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-5 py-2.5 text-right font-semibold">{formatCurrency(item.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Add-ons */}
        {(q.addons ?? []).length > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Services & Add-ons</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-card/50">
                    <th className="text-left font-medium text-muted-foreground px-5 py-2">Service</th>
                    <th className="text-right font-medium text-muted-foreground px-3 py-2">Qty</th>
                    <th className="text-right font-medium text-muted-foreground px-3 py-2">Unit Price</th>
                    <th className="text-right font-medium text-muted-foreground px-5 py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(q.addons ?? []).map((a) => (
                    <tr key={a.id} className="border-b border-border/50">
                      <td className="px-5 py-2.5 font-medium">{a.description}</td>
                      <td className="px-3 py-2.5 text-right">{a.quantity}</td>
                      <td className="px-3 py-2.5 text-right">{formatCurrency(a.price)}</td>
                      <td className="px-5 py-2.5 text-right font-semibold">{formatCurrency(a.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {/* Totals */}
        <Card>
          <CardContent className="p-5">
            <div className="max-w-xs ml-auto space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatCurrency(q.subtotal)}</span>
              </div>
              {(q.discountPercent ?? 0) > 0 && (
                <div className="flex justify-between text-green-400">
                  <span>Discount ({q.discountPercent}%)</span>
                  <span>−{formatCurrency(q.discountAmount ?? 0)}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>GST ({q.taxPercent}%)</span>
                <span>+{formatCurrency(q.taxAmount ?? 0)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-base font-bold text-primary">
                <span>Grand Total</span>
                <span>{formatCurrency(q.total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        {(q.notes || q.terms) && (
          <div className="grid sm:grid-cols-2 gap-4">
            {q.notes && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">Notes</CardTitle></CardHeader>
                <CardContent><p className="text-sm text-muted-foreground">{q.notes}</p></CardContent>
              </Card>
            )}
            {q.terms && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">Terms & Conditions</CardTitle></CardHeader>
                <CardContent><p className="text-sm text-muted-foreground">{q.terms}</p></CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
