import { useState, useEffect } from "react";
import { useListIntegrations, useUpsertIntegration, useSyncIndiamartLeads } from "@workspace/api-client-react";
import type { Integration } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Plug, RefreshCw } from "lucide-react";

export default function IntegrationsSettingsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: integrations = [] } = useListIntegrations();
  const upsertMut = useUpsertIntegration({
    mutation: {
      onSuccess() {
        toast({ title: "Integration saved" });
        qc.invalidateQueries({ queryKey: ["/api/integrations"] });
      },
      onError() { toast({ title: "Save failed", variant: "destructive" }); },
    },
  });
  const syncMut = useSyncIndiamartLeads({
    mutation: {
      onSuccess(d) { toast({ title: d.message }); qc.invalidateQueries({ queryKey: ["/api/leads"] }); },
      onError(err: unknown) {
        const e = (err as { response?: { data?: { message?: string } } })?.response?.data;
        toast({ title: e?.message ?? "Sync failed", variant: "destructive" });
      },
    },
  });

  const indiamart = integrations.find((i) => i.provider === "indiamart");
  const [imKey, setImKey] = useState("");
  useEffect(() => { setImKey(indiamart?.config?.apiKey ?? ""); }, [indiamart?.config?.apiKey]);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold">Integrations</h1>
        <p className="text-sm text-muted-foreground">Connect external sources for leads and communication.</p>
      </div>

      <div className="bg-card border border-card-border rounded-xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center"><Plug className="h-5 w-5" /></div>
          <div>
            <h2 className="font-semibold">IndiaMart</h2>
            <p className="text-xs text-muted-foreground">Import buyer leads from IndiaMart Lead Manager.</p>
          </div>
        </div>
        <Label>API key (CRM Listing v2)</Label>
        <Input value={imKey} onChange={(e) => setImKey(e.target.value)} placeholder="glusr_crm_key" />
        {indiamart?.lastSyncedAt && (
          <p className="text-[11px] text-muted-foreground mt-2">
            Last sync: {new Date(indiamart.lastSyncedAt).toLocaleString()} · {indiamart.lastSyncStatus} · {indiamart.lastSyncMessage ?? ""}
          </p>
        )}
        <div className="flex gap-2 mt-3">
          <Button size="sm"
            onClick={() => upsertMut.mutate({ provider: "indiamart", data: { enabled: true, config: { apiKey: imKey } } })}
            disabled={!imKey || upsertMut.isPending}>
            Save
          </Button>
          <Button size="sm" variant="outline" className="gap-1"
            onClick={() => syncMut.mutate()} disabled={!indiamart?.enabled || syncMut.isPending}>
            <RefreshCw className="h-3 w-3" />Sync now
          </Button>
        </div>
      </div>

      <div className="bg-card border border-card-border rounded-xl p-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center"><Plug className="h-5 w-5" /></div>
          <div>
            <h2 className="font-semibold">Twilio (click-to-call)</h2>
            <p className="text-xs text-muted-foreground">Twilio is configured via the workspace connector — no per-org setup needed.</p>
          </div>
        </div>
      </div>

      <div className="bg-card border border-card-border rounded-xl p-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-cyan-500/15 text-cyan-400 flex items-center justify-center"><Plug className="h-5 w-5" /></div>
          <div>
            <h2 className="font-semibold">Anthropic AI</h2>
            <p className="text-xs text-muted-foreground">AI lead scoring, email drafting, and call summaries are powered by the built-in AI integration.</p>
          </div>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        Configured integrations: {integrations.map((i: Integration) => i.provider).join(", ") || "none"}
      </div>
    </div>
  );
}
