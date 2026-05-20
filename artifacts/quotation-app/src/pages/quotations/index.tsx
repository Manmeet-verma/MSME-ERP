import { useState } from "react";

import { useListQuotations, useDeleteQuotation } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Plus, Search, FileText, Trash2 } from "lucide-react";
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

  const quotations = data ?? [];

  return (
    
      <div className="p-6 max-w-7xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">Quotations</h1>
            <p className="text-sm text-muted-foreground">{quotations.length} total quotations</p>
          </div>
          <Link href="/quotations/new">
            <a>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                New Quotation
              </Button>
            </a>
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
          <div className="flex gap-2 flex-wrap">
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

        {/* Table */}
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-card">
              <tr className="border-b border-border">
                <th className="text-left font-medium text-muted-foreground text-xs px-5 py-3">Quote #</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">Client</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">Status</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">Valid Until</th>
                <th className="text-right font-medium text-muted-foreground text-xs px-3 py-3">Total</th>
                <th className="text-right font-medium text-muted-foreground text-xs px-5 py-3">Actions</th>
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
                    <Link href="/quotations/new">
                      <a className="text-xs text-primary hover:underline mt-1 inline-block">Create one</a>
                    </Link>
                  </td>
                </tr>
              ) : (
                quotations.map((q) => (
                  <tr key={q.id} className="border-b border-border/50 hover:bg-card/40 transition-colors">
                    <td className="px-5 py-3">
                      <Link href={`/quotations/${q.id}`}>
                        <a className="font-mono text-xs text-primary hover:underline">{q.quotationNumber}</a>
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
