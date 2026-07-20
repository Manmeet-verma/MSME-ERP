import { useState } from "react";
import {
  useListEmailSuppressions,
  useCreateEmailSuppression,
  useDeleteEmailSuppression,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus } from "lucide-react";

export default function SuppressionsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: rowsRaw } = useListEmailSuppressions();
  const rows = Array.isArray(rowsRaw) ? rowsRaw : [];
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");

  const invalidate = () => qc.invalidateQueries({ queryKey: ["/api/marketing/suppressions"] });
  const createMut = useCreateEmailSuppression({
    mutation: { onSuccess() { setEmail(""); setReason(""); invalidate(); toast({ title: "Added to suppression list" }); } },
  });
  const deleteMut = useDeleteEmailSuppression({
    mutation: { onSuccess() { invalidate(); toast({ title: "Removed" }); } },
  });

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold">Suppression list</h1>
        <p className="text-sm text-muted-foreground">Emails on this list will never receive campaigns or drips.</p>
      </div>
      <div className="bg-card border border-card-border rounded-xl p-4 flex gap-2 items-end">
        <div className="flex-1">
          <label className="text-xs text-muted-foreground">Email</label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" />
        </div>
        <div className="w-40">
          <label className="text-xs text-muted-foreground">Reason</label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="bounce / manual" />
        </div>
        <Button
          onClick={() => email && createMut.mutate({ data: { email, reason: reason || "manual" } })}
          disabled={!email || createMut.isPending}
          className="gap-1"><Plus className="h-3 w-3" />Add</Button>
      </div>
      <div className="bg-card border border-card-border rounded-xl divide-y divide-border">
        {rows.map((r) => (
          <div key={r.id} className="p-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{r.email}</p>
              <p className="text-[11px] text-muted-foreground">{r.reason} · {new Date(r.createdAt).toLocaleString("en-IN")}</p>
            </div>
            <button onClick={() => deleteMut.mutate({ id: r.id })} className="text-red-400 hover:text-red-300">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {rows.length === 0 && <div className="p-4 text-xs text-muted-foreground text-center">No suppressed emails.</div>}
      </div>
    </div>
  );
}
