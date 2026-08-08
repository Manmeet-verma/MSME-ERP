"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  PhoneCall, FileText, CalendarClock, ShoppingCart, BellRing, Wrench,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { useState } from "react";

export interface CallDetail {
  customerName: string;
  phone: string;
  callType: "inbound" | "outbound";
  duration: number;
  outcome: string;
  notes: string;
  callDate: string;
}

export interface QuotationDetail {
  customerName: string;
  quotationNumber: string;
  amount: number;
  products: string;
  validityDate: string;
  status: string;
  notes: string;
}

export interface MeetingDetail {
  customerName: string;
  meetingDate: string;
  type: "video" | "call" | "in-person";
  agenda: string;
  attendees: string;
  notes: string;
}

export interface OrderDetail {
  customerName: string;
  orderNumber: string;
  amount: number;
  products: string;
  status: string;
  notes: string;
}

export interface PaymentFollowupDetail {
  customerName: string;
  invoiceNumber: string;
  amountDue: number;
  followupDate: string;
  status: string;
  notes: string;
}

export interface AfterSalesFollowupDetail {
  customerName: string;
  orderReference: string;
  type: "satisfaction" | "check-in" | "support";
  notes: string;
  followupDate: string;
}

export interface OrderRow {
  customer: string;
  amount: number | string;
  status: string;
}

export interface DailyReportRow {
  id?: string;
  userId?: string;
  userName?: string;
  date?: string;
  callsMade?: number;
  quotationsSent?: number;
  meetingsScheduled?: number;
  ordersReceived?: number;
  paymentReminders?: number;
  afterSalesFollowup?: number;
  ordersClosed?: OrderRow[];
  callDetails?: CallDetail[];
  quotationDetails?: QuotationDetail[];
  meetingDetails?: MeetingDetail[];
  orderDetails?: OrderDetail[];
  paymentFollowupDetails?: PaymentFollowupDetail[];
  afterSalesFollowupDetails?: AfterSalesFollowupDetail[];
  status?: string;
}

function CollapsibleSection({
  title, icon: Icon, count, details, emptyMessage,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  count: number;
  details: any[];
  emptyMessage: string;
}) {
  const [open, setOpen] = useState(false);
  if (count === 0 && details.length === 0) return null;
  return (
    <div className="border border-border rounded-lg overflow-hidden mb-3">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">{title}</span>
          <span className="text-xs text-muted-foreground">({count})</span>
        </div>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && (
        <div className="p-0">
          {details.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground text-center">{emptyMessage}</p>
          ) : (
            <ScrollArea className="max-h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20">
                    {Object.keys(details[0]).map((key) => (
                      <TableHead key={key} className="text-xs uppercase text-muted-foreground">
                        {key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {details.map((d, i) => (
                    <TableRow key={i} className="border-b border-border last:border-0">
                      {Object.values(d).map((v, j) => (
                        <TableCell key={j} className="text-xs">
                          {v === null || v === undefined ? "-" : String(v)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </div>
      )}
    </div>
  );
}

export default function DailyReportDetailModal({
  report,
  open,
  onOpenChange,
}: {
  report: DailyReportRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Daily Report Detail
          </DialogTitle>
        </DialogHeader>
        <div className="mb-4 flex flex-wrap gap-3 text-sm">
          <span className="text-muted-foreground">Date: <strong>{report.date ?? "-"}</strong></span>
          <span className="text-muted-foreground">Employee: <strong>{report.userName ?? "-"}</strong></span>
          <span className="text-muted-foreground">Status:
            <span className={`ml-1 text-xs font-medium px-1.5 py-0.5 rounded ${report.status === "submitted" ? "bg-emerald-500/15 text-emerald-400" : "bg-yellow-500/15 text-yellow-500"}`}>
              {report.status ?? "draft"}
            </span>
          </span>
        </div>
        <ScrollArea className="max-h-[60vh] pr-2">
          <CollapsibleSection title="Calls Made" icon={PhoneCall} count={report.callsMade ?? 0} details={report.callDetails ?? []} emptyMessage="No call details recorded" />
          <CollapsibleSection title="Quotations Sent" icon={FileText} count={report.quotationsSent ?? 0} details={report.quotationDetails ?? []} emptyMessage="No quotation details recorded" />
          <CollapsibleSection title="Meetings Scheduled" icon={CalendarClock} count={report.meetingsScheduled ?? 0} details={report.meetingDetails ?? []} emptyMessage="No meeting details recorded" />
          <CollapsibleSection title="Orders Received" icon={ShoppingCart} count={report.ordersReceived ?? 0} details={report.orderDetails ?? []} emptyMessage="No order details recorded" />
          <CollapsibleSection title="Payment Follow-ups" icon={BellRing} count={report.paymentReminders ?? 0} details={report.paymentFollowupDetails ?? []} emptyMessage="No payment follow-up details recorded" />
          <CollapsibleSection title="After Sales Follow-ups" icon={Wrench} count={report.afterSalesFollowup ?? 0} details={report.afterSalesFollowupDetails ?? []} emptyMessage="No after-sales follow-up details recorded" />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}