"use client";

import { useState } from "react";

import { useListQuotations, useDeleteQuotation } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { Plus, Search, FileText, Trash2 } from "lucide-react";
import { DraggableTh } from "@/components/draggable-th";
import { useColumnReorder } from "@/hooks/use-column-reorder";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useQueryClient } from "@tanstack/react-query";

const STATUS_COLORS: Record<string, string> = {
  draft: "#6b7280",
  sent: "#3b82f6",
  approved: "#22c55e",
  rejected: "#ef4444",
};

export default function QuotationsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const colReorder = useColumnReorder();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useListQuotations({
    ...(search ? { clientName: search } : {}),
    ...(status !== "all" ? { status: status as "draft" | "sent" | "approved" | "rejected" } : {}),
  });

  const deleteMutation = useDeleteQuotation({
    mutation: {
      onSuccess() {
        toast({ title: "Quotation deleted" });
        qc.invalidateQueries({ queryKey: ["/api/quotations"] });
      },
      onError() {
        toast({ title: "Failed to delete", variant: "destructive" });
      },
    },
  });

  const quotations = Array.isArray(data) ? data : [];

  return (
    
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">Quotations</h1>
            <p className="text-sm text-muted-foreground">{quotations.length} total quotations</p>
          </div>
          <Link href="/dashboard/quotations/new">
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              New Quotation
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2 flex-wrap overflow-x-auto scrollbar-hide pb-1">
            {["all", "draft", "sent", "approved", "rejected"].map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                  status === s
                    ? "bg-primary text-white"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {s === "all" ? "All" : s}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile Cards */}
        <div className="sm:hidden space-y-3">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-3 w-32" />
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            ))
          ) : quotations.length === 0 ? (
            <div className="text-center py-12 rounded-xl border border-border">
              <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No quotations found</p>
              <Link href="/dashboard/quotations/new">
                <span className="text-xs text-primary hover:underline mt-1 inline-block">Create one</span>
              </Link>
            </div>
          ) : (
            quotations.map((q) => (
              <Link key={q.id} href={`/dashboard/quotations/${q.id}`}>
                <div className="rounded-xl border border-border p-4 space-y-2 hover:bg-card/40 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-primary">{q.quotationNumber}</span>
                    <Badge
                      variant="outline"
                      className="text-[10px] capitalize"
                      style={{ color: STATUS_COLORS[q.status], borderColor: STATUS_COLORS[q.status] + "40" }}
                    >
                      {q.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {(q as { clientName?: string }).clientName ?? "—"}
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-muted-foreground">Valid until {formatDate(q.validUntil)}</span>
                    <span className="text-xs font-semibold">{formatCurrency(q.total)}</span>
                  </div>
                  <div className="flex justify-end pt-1">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          onClick={(e) => e.preventDefault()}
                          className="text-muted-foreground hover:text-destructive transition-colors p-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete quotation?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete {q.quotationNumber}. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate({ id: q.id })}
                            className="bg-destructive text-white hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>

        <p className="text-[11px] text-muted-foreground">Drag column headers to reorder</p>
        {/* Table */}
        <div className="hidden sm:block rounded-xl border border-border overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-card">
              <tr className="border-b border-border">
                <DraggableTh idx={0} {...colReorder} className="text-left font-medium text-muted-foreground text-xs px-5 py-3">Quote #</DraggableTh>
                <DraggableTh idx={1} {...colReorder} className="text-left font-medium text-muted-foreground text-xs px-3 py-3">Client</DraggableTh>
                <DraggableTh idx={2} {...colReorder} className="text-left font-medium text-muted-foreground text-xs px-3 py-3">Status</DraggableTh>
                <DraggableTh idx={3} {...colReorder} className="text-left font-medium text-muted-foreground text-xs px-3 py-3">Valid Until</DraggableTh>
                <DraggableTh idx={4} {...colReorder} className="text-right font-medium text-muted-foreground text-xs px-3 py-3">Total</DraggableTh>
                <DraggableTh idx={5} {...colReorder} className="text-right font-medium text-muted-foreground text-xs px-5 py-3">Actions</DraggableTh>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="px-5 py-3"><Skeleton className="h-4 w-28" /></td>
                    <td className="px-3 py-3"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-3 py-3"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-3 py-3"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-3 py-3"><Skeleton className="h-4 w-20 ml-auto" /></td>
                    <td className="px-5 py-3"><Skeleton className="h-4 w-12 ml-auto" /></td>
                  </tr>
                ))
              ) : quotations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">No quotations found</p>
                    <Link href="/dashboard/quotations/new">
                      <span className="text-xs text-primary hover:underline mt-1 inline-block">Create one</span>
                    </Link>
                  </td>
                </tr>
              ) : (
                quotations.map((q) => (
                  <tr key={q.id} className="border-b border-border/50 hover:bg-card/40 transition-colors">
                    <td className="px-5 py-3">
                      <Link href={`/dashboard/quotations/${q.id}`}>
                        <span className="font-mono text-xs text-primary hover:underline">{q.quotationNumber}</span>
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">
                      {(q as { clientName?: string }).clientName ?? "—"}
                    </td>
                    <td className="px-3 py-3">
                      <Badge
                        variant="outline"
                        className="text-[10px] capitalize"
                        style={{ color: STATUS_COLORS[q.status], borderColor: STATUS_COLORS[q.status] + "40" }}
                      >
                        {q.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">{formatDate(q.validUntil)}</td>
                    <td className="px-3 py-3 text-right text-xs font-semibold">{formatCurrency(q.total)}</td>
                    <td className="px-5 py-3 text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button className="text-muted-foreground hover:text-destructive transition-colors p-1">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete quotation?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete {q.quotationNumber}. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate({ id: q.id })}
                              className="bg-destructive text-white hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    
  );
}
