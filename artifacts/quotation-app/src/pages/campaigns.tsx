import { useState } from "react";
import { useListCampaigns, useCreateCampaign, useSendCampaign } from "@workspace/api-client-react";
import type { Campaign, CampaignInput } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Send, Megaphone } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const empty = {
  name: "", subject: "", body: "", fromEmail: "",
  entity: "leads" as "leads" | "clients",
  segPriority: "" as "" | "hot" | "warm" | "cold",
  segStatus: "" as string,
};

export default function CampaignsPage() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: campaigns = [] } = useListCampaigns();
  const createMut = useCreateCampaign({
    mutation: { onSuccess() {
      toast({ title: "Campaign created" });
      qc.invalidateQueries({ queryKey: ["/api/campaigns"] });
      setOpen(false); setForm(empty);
    } },
  });
  const sendMut = useSendCampaign({
    mutation: { onSuccess(c) {
      toast({ title: `Sent to ${c.stats?.sent ?? 0}` });
      qc.invalidateQueries({ queryKey: ["/api/campaigns"] });
    } },
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const filters: Record<string, string> = {};
    if (form.segPriority) filters.priority = form.segPriority;
    if (form.segStatus) filters.status = form.segStatus;
    const payload: CampaignInput = {
      name: form.name,
      subject: form.subject,
      body: form.body,
      fromEmail: form.fromEmail,
      segment: { entity: form.entity, filters } as CampaignInput["segment"],
    };
    createMut.mutate({ data: payload });
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">Email campaigns</h1>
          <p className="text-sm text-muted-foreground">{campaigns.length} campaigns</p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setOpen(true)}><Plus className="h-4 w-4" />New campaign</Button>
      </div>

      {campaigns.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <Megaphone className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No campaigns yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c: Campaign) => (
            <div key={c.id} className="bg-card border border-card-border rounded-xl p-4">
              <div className="flex justify-between items-start gap-3 flex-wrap">
                <div className="flex-1">
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.subject}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">From: {c.fromEmail} · Status: {c.status}</p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>Total: {c.stats?.total ?? 0}</p>
                  <p>Sent: {c.stats?.sent ?? 0}</p>
                  <p>Opened: {c.stats?.opened ?? 0}</p>
                </div>
                {c.status !== "sent" && (
                  <Button size="sm" className="gap-1" onClick={() => sendMut.mutate({ id: c.id })}>
                    <Send className="h-3 w-3" />Send now
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>New campaign</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div><Label>Name *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>From email *</Label><Input required type="email" value={form.fromEmail} onChange={(e) => setForm({ ...form, fromEmail: e.target.value })} /></div>
            <div><Label>Subject *</Label><Input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></div>
            <div><Label>Body *</Label><Textarea required rows={8} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label>Send to</Label>
                <select value={form.entity} onChange={(e) => setForm({ ...form, entity: e.target.value as "leads" | "clients" })}
                  className="w-full px-3 py-2 rounded-md bg-background border border-border text-sm">
                  <option value="leads">Leads</option><option value="clients">Clients</option>
                </select>
              </div>
              {form.entity === "leads" && (
                <>
                  <div>
                    <Label>Priority</Label>
                    <select value={form.segPriority} onChange={(e) => setForm({ ...form, segPriority: e.target.value as typeof form.segPriority })}
                      className="w-full px-3 py-2 rounded-md bg-background border border-border text-sm">
                      <option value="">Any</option><option value="hot">Hot</option><option value="warm">Warm</option><option value="cold">Cold</option>
                    </select>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <select value={form.segStatus} onChange={(e) => setForm({ ...form, segStatus: e.target.value })}
                      className="w-full px-3 py-2 rounded-md bg-background border border-border text-sm">
                      <option value="">Any</option><option value="new">New</option><option value="contacted">Contacted</option><option value="qualified">Qualified</option>
                    </select>
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMut.isPending}>Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
