import { useState, useEffect } from "react";
import {
  useListIntegrations, useUpsertIntegration, useSyncIndiamartLeads,
  useListSocialAccounts, useConnectSocialAccount, useDisconnectSocialAccount,
} from "@workspace/api-client-react";
import type { Integration } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Plug, RefreshCw, Facebook, Instagram, Linkedin, Trash2 } from "lucide-react";
import { getAuthToken } from "@/lib/auth";

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

      <SocialAccountsPanel />

      <div className="text-xs text-muted-foreground">
        Configured integrations: {integrations.map((i: Integration) => i.provider).join(", ") || "none"}
      </div>
    </div>
  );
}

const SOCIAL_PROVIDERS: { key: "facebook" | "instagram" | "linkedin"; label: string; icon: React.ComponentType<{ className?: string }>; tint: string }[] = [
  { key: "facebook", label: "Facebook Page", icon: Facebook, tint: "bg-blue-500/15 text-blue-400" },
  { key: "instagram", label: "Instagram Business", icon: Instagram, tint: "bg-pink-500/15 text-pink-400" },
  { key: "linkedin", label: "LinkedIn Page", icon: Linkedin, tint: "bg-cyan-500/15 text-cyan-400" },
];

function SocialAccountsPanel() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: accounts = [] } = useListSocialAccounts();
  const [oauthCfg, setOauthCfg] = useState<{ facebook: boolean; instagram: boolean; linkedin: boolean }>({ facebook: false, instagram: false, linkedin: false });
  useEffect(() => {
    fetch("/api/social/oauth/config", { headers: { Authorization: `Bearer ${getAuthToken()}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setOauthCfg(d); })
      .catch(() => undefined);
    function onMsg(e: MessageEvent) {
      if (e.data?.type === "social-oauth-done") {
        toast({ title: "Connected via OAuth" });
        qc.invalidateQueries({ queryKey: ["/api/social/accounts"] });
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [qc, toast]);

  async function startOauth(platform: "facebook" | "instagram" | "linkedin") {
    const r = await fetch(`/api/social/oauth/${platform}/start`, {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      toast({ title: d.error ?? "Could not start OAuth", variant: "destructive" });
      return;
    }
    const { authorizeUrl } = (await r.json()) as { authorizeUrl: string };
    window.open(authorizeUrl, "social-oauth", "width=600,height=720");
  }
  const upsertMut = useConnectSocialAccount({
    mutation: {
      onSuccess() {
        toast({ title: "Account connected" });
        qc.invalidateQueries({ queryKey: ["/api/social/accounts"] });
      },
    },
  });
  const disconnectMut = useDisconnectSocialAccount({
    mutation: {
      onSuccess() {
        toast({ title: "Disconnected" });
        qc.invalidateQueries({ queryKey: ["/api/social/accounts"] });
      },
    },
  });

  return (
    <div className="bg-card border border-card-border rounded-xl p-5 space-y-3">
      <div>
        <h2 className="font-semibold">Social accounts</h2>
        <p className="text-xs text-muted-foreground">Connect Facebook Page, Instagram Business, and LinkedIn Page to publish from the composer.</p>
      </div>
      {SOCIAL_PROVIDERS.map(({ key, label, icon: Icon, tint }) => {
        const existing = accounts.find((a) => a.platform === key);
        return (
          <SocialRow
            key={key}
            platform={key}
            label={label}
            tint={tint}
            icon={Icon}
            existing={existing}
            oauthAvailable={oauthCfg[key]}
            onStartOauth={() => startOauth(key)}
            onSave={(form) => upsertMut.mutate({ data: {
              platform: key,
              accessToken: form.accessToken,
              accountName: form.accountName,
              externalId: form.accountId ?? "",
            } })}
            onDisconnect={() => existing && disconnectMut.mutate({ id: existing.id })}
            saving={upsertMut.isPending}
          />
        );
      })}
    </div>
  );
}

function SocialRow({
  platform, label, tint, icon: Icon, existing, oauthAvailable, onStartOauth, onSave, onDisconnect, saving,
}: {
  platform: "facebook" | "instagram" | "linkedin";
  label: string;
  tint: string;
  icon: React.ComponentType<{ className?: string }>;
  existing?: { id: number; accountName: string; externalId?: string | null };
  oauthAvailable: boolean;
  onStartOauth: () => void;
  onSave: (form: { accessToken: string; accountName: string; accountId?: string }) => void;
  onDisconnect: () => void;
  saving: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountId, setAccountId] = useState("");

  return (
    <div className="border border-border rounded-lg p-3">
      <div className="flex items-center gap-3">
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${tint}`}><Icon className="h-4 w-4" /></div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{label}</p>
          <p className="text-[11px] text-muted-foreground truncate">
            {existing ? `Connected · ${existing.accountName}` : "Not connected"}
          </p>
        </div>
        {existing ? (
          <Button size="sm" variant="ghost" onClick={onDisconnect} className="text-red-400"><Trash2 className="h-3 w-3" /></Button>
        ) : oauthAvailable ? (
          <div className="flex gap-1">
            <Button size="sm" onClick={onStartOauth}>Connect with {platform === "linkedin" ? "LinkedIn" : "Facebook"}</Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen((o) => !o)}>{open ? "Cancel" : "Manual"}</Button>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setOpen((o) => !o)}>{open ? "Cancel" : "Connect (manual)"}</Button>
        )}
      </div>
      {!existing && !oauthAvailable && !open && (
        <p className="text-[11px] text-muted-foreground mt-2">
          Tip: set <code>{platform === "linkedin" ? "LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET" : "META_APP_ID / META_APP_SECRET"}</code> to enable one-click OAuth.
        </p>
      )}
      {open && !existing && (
        <div className="mt-3 grid sm:grid-cols-3 gap-2">
          <div className="sm:col-span-3">
            <Label className="text-xs">Access token</Label>
            <Input value={accessToken} onChange={(e) => setAccessToken(e.target.value)} placeholder="long-lived token from Meta/LinkedIn developer console" />
          </div>
          <div>
            <Label className="text-xs">Account name</Label>
            <Input value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="My Business Page" />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">{platform === "facebook" ? "Page ID" : platform === "instagram" ? "IG Business Account ID" : "Organization URN"}</Label>
            <Input value={accountId} onChange={(e) => setAccountId(e.target.value)} />
          </div>
          <div className="sm:col-span-3 flex justify-end">
            <Button size="sm"
              disabled={!accessToken || !accountName || saving}
              onClick={() => {
                onSave({ accessToken, accountName, accountId: accountId || undefined });
                setOpen(false); setAccessToken(""); setAccountName(""); setAccountId("");
              }}>Save</Button>
          </div>
        </div>
      )}
    </div>
  );
}
