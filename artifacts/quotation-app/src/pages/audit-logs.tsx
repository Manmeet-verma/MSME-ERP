import { useListAuditLogs } from "@workspace/api-client-react";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck } from "lucide-react";

const ACTION_COLORS: Record<string, string> = {
  create: "#22c55e",
  update: "#3b82f6",
  delete: "#ef4444",
  login: "#f59e0b",
  status_change: "#8b5cf6",
};

export default function AuditLogsPage() {
  const { data, isLoading } = useListAuditLogs({ limit: 50 });
  const logs = Array.isArray(data) ? data : [];

  return (
    
      <div className="p-6 max-w-5xl mx-auto space-y-5">
        <div>
          <h1 className="text-xl font-bold">Audit Logs</h1>
          <p className="text-sm text-muted-foreground">Complete history of all system actions</p>
        </div>

        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-card">
              <tr className="border-b border-border">
                <th className="text-left font-medium text-muted-foreground text-xs px-5 py-3">Time</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">User</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">Action</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-3 py-3">Entity</th>
                <th className="text-left font-medium text-muted-foreground text-xs px-5 py-3">Details</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    {Array.from({ length: 5 }).map((__, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12">
                    <ShieldCheck className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">No audit logs yet</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-b border-border/50 hover:bg-card/40 transition-colors">
                    <td className="px-5 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                      {log.createdAt ? new Date(log.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-xs">{(log as { userName?: string }).userName ?? `#${log.userId}`}</td>
                    <td className="px-3 py-2.5">
                      <Badge
                        variant="outline"
                        className="text-[10px] capitalize"
                        style={{ color: ACTION_COLORS[log.action] ?? "#6b7280", borderColor: (ACTION_COLORS[log.action] ?? "#6b7280") + "40" }}
                      >
                        {log.action}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground capitalize">{log.entity}{log.entityId ? ` #${log.entityId}` : ""}</td>
                    <td className="px-5 py-2.5 text-xs text-muted-foreground max-w-xs truncate">{log.details ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    
  );
}
