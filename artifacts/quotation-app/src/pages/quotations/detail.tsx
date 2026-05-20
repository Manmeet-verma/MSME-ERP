
import { useGetQuotation, useUpdateQuotationStatus, useSendQuotationSms } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useParams } from "wouter";
import { ChevronLeft, Printer, Send, CheckCircle2, XCircle, Share2, MessageSquare, QrCode, Download } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import QRCode from "react-qr-code";
import { useState, useRef } from "react";

const STATUS_COLORS: Record<string, string> = {
  draft: "#6b7280", sent: "#3b82f6", approved: "#22c55e", rejected: "#ef4444",
};

function buildWhatsAppMessage(q: {
  quotationNumber: string;
  clientName?: string | null;
  total: number;
  validUntil?: string | null;
  quotationUrl: string;
}) {
  return (
    `Hello ${q.clientName ?? "there"},\n\n` +
    `Here is your quotation *${q.quotationNumber}* from *Techon LED Displays*.\n\n` +
    `💰 *Grand Total: ${formatCurrency(q.total)}*\n` +
    (q.validUntil ? `📅 Valid until: ${formatDate(q.validUntil)}\n` : "") +
    `\n🔗 View your quotation:\n${q.quotationUrl}\n\n` +
    `Please feel free to reach out for any questions.`
  );
}

function buildSmsMessage(q: {
  quotationNumber: string;
  clientName?: string | null;
  total: number;
  quotationUrl: string;
}) {
  return (
    `Hi ${q.clientName ?? "there"}, your quotation ${q.quotationNumber} from Techon LED Displays is ready. ` +
    `Total: ${formatCurrency(q.total)}. View: ${q.quotationUrl}`
  );
}

function ShareDialog({ quotation }: {
  quotation: {
    id: number;
    quotationNumber: string;
    clientName?: string | null;
    clientPhone?: string | null;
    total: number;
    validUntil?: string | null;
  };
}) {
  const { toast } = useToast();
  const smsMutation = useSendQuotationSms();

  const quotationUrl = `${window.location.origin}/quotations/${quotation.id}`;
  const whatsappMessage = buildWhatsAppMessage({ ...quotation, quotationUrl });
  const defaultSmsMessage = buildSmsMessage({ ...quotation, quotationUrl });

  const [smsPhone, setSmsPhone] = useState(quotation.clientPhone ?? "");
  const [smsMessage, setSmsMessage] = useState(defaultSmsMessage);
  const qrRef = useRef<HTMLDivElement>(null);

  function openWhatsApp() {
    const phone = (quotation.clientPhone ?? "").replace(/\D/g, "");
    const url = phone
      ? `https://wa.me/${phone.startsWith("91") ? phone : "91" + phone}?text=${encodeURIComponent(whatsappMessage)}`
      : `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;
    window.open(url, "_blank");
  }

  function downloadQR() {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width + 40;
      canvas.height = img.height + 40;
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 20, 20);
      }
      const link = document.createElement("a");
      link.download = `QR-${quotation.quotationNumber}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  }

  function sendSms() {
    if (!smsPhone.trim()) {
      toast({ title: "Please enter a phone number", variant: "destructive" });
      return;
    }
    smsMutation.mutate(
      { id: quotation.id, data: { phone: smsPhone.trim(), message: smsMessage } },
      {
        onSuccess() {
          toast({ title: "SMS sent successfully!", description: `Message sent to ${smsPhone}` });
        },
        onError(err: unknown) {
          const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? "Failed to send SMS";
          toast({ title: "SMS failed", description: msg, variant: "destructive" });
        },
      }
    );
  }

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Share2 className="h-4 w-4" />
          Share Quotation {quotation.quotationNumber}
        </DialogTitle>
      </DialogHeader>

      <Tabs defaultValue="qr">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="qr" className="gap-1.5 text-xs">
            <QrCode className="h-3.5 w-3.5" /> QR Code
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="gap-1.5 text-xs">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            WhatsApp
          </TabsTrigger>
          <TabsTrigger value="sms" className="gap-1.5 text-xs">
            <MessageSquare className="h-3.5 w-3.5" /> SMS
          </TabsTrigger>
        </TabsList>

        {/* QR Code Tab */}
        <TabsContent value="qr" className="space-y-4 pt-2">
          <p className="text-xs text-muted-foreground text-center">
            Scan to open this quotation on any device
          </p>
          <div ref={qrRef} className="flex justify-center p-4 bg-white rounded-lg">
            <QRCode
              value={quotationUrl}
              size={200}
              style={{ height: "auto", maxWidth: "100%", width: "200px" }}
            />
          </div>
          <div className="flex items-center gap-2 bg-secondary/50 rounded px-3 py-2">
            <span className="text-xs text-muted-foreground truncate flex-1">{quotationUrl}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs shrink-0"
              onClick={() => { navigator.clipboard.writeText(quotationUrl); toast({ title: "Link copied!" }); }}
            >
              Copy
            </Button>
          </div>
          <Button variant="outline" size="sm" className="w-full gap-2" onClick={downloadQR}>
            <Download className="h-3.5 w-3.5" /> Download QR Code
          </Button>
        </TabsContent>

        {/* WhatsApp Tab */}
        <TabsContent value="whatsapp" className="space-y-4 pt-2">
          <p className="text-xs text-muted-foreground">
            Opens WhatsApp with a pre-filled message
            {quotation.clientPhone ? ` to ${quotation.clientPhone}` : ""}
          </p>
          <div className="bg-[#128C7E]/10 border border-[#128C7E]/20 rounded-lg p-3">
            <p className="text-xs whitespace-pre-wrap text-muted-foreground leading-relaxed">{whatsappMessage}</p>
          </div>
          <Button
            className="w-full gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white"
            onClick={openWhatsApp}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Open in WhatsApp
          </Button>
        </TabsContent>

        {/* SMS Tab */}
        <TabsContent value="sms" className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Phone Number</Label>
            <Input
              value={smsPhone}
              onChange={e => setSmsPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="text-sm"
            />
            <p className="text-[11px] text-muted-foreground">Indian numbers without +91 prefix are accepted</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Message</Label>
            <Textarea
              value={smsMessage}
              onChange={e => setSmsMessage(e.target.value)}
              rows={4}
              className="text-xs resize-none"
            />
            <p className="text-[11px] text-muted-foreground text-right">{smsMessage.length} chars</p>
          </div>
          <Button
            className="w-full gap-2"
            onClick={sendSms}
            disabled={smsMutation.isPending}
          >
            <MessageSquare className="h-4 w-4" />
            {smsMutation.isPending ? "Sending..." : "Send SMS"}
          </Button>
        </TabsContent>
      </Tabs>
    </DialogContent>
  );
}

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
      
        <div className="p-6 max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      
    );
  }

  if (!quotation) {
    return (
      
        <div className="p-6 max-w-4xl mx-auto text-center py-16">
          <p className="text-muted-foreground">Quotation not found</p>
          <button onClick={() => navigate("/quotations")} className="text-primary text-sm hover:underline mt-2">← Back to quotations</button>
        </div>
      
    );
  }

  const q = quotation as typeof quotation & {
    clientName?: string; clientCompany?: string; clientEmail?: string; clientPhone?: string; clientAddress?: string; clientGstNumber?: string;
    items?: Array<{ id: number; description: string; widthFt?: number; heightFt?: number; areaSqFt?: number; quantity: number; unitPrice: number; totalPrice: number; productName?: string }>;
    addons?: Array<{ id: number; description: string; quantity: number; price: number; totalPrice: number; addonName?: string }>;
    quotationAddons?: Array<{ id: number; description: string; quantity: number; price: number; totalPrice: number; addonName?: string | null }>;
  };

  return (
    
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

            {/* Share Button */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 no-print">
                  <Share2 className="h-3.5 w-3.5" /> Share
                </Button>
              </DialogTrigger>
              <ShareDialog
                quotation={{
                  id: q.id,
                  quotationNumber: q.quotationNumber,
                  clientName: q.clientName,
                  clientPhone: q.clientPhone,
                  total: q.total,
                  validUntil: q.validUntil,
                }}
              />
            </Dialog>

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
        {(q.quotationAddons ?? q.addons ?? []).length > 0 && (
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
                  {(q.quotationAddons ?? q.addons ?? []).map((a) => (
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
    
  );
}
