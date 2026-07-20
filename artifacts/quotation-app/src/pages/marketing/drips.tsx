import { useState } from "react";
import {
  useListDripSequences,
  useCreateDripSequence,
  useUpdateDripSequence,
  useEnrollDripSequence,
} from "@workspace/api-client-react";
import type { DripSequence } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Play, Pause, UserPlus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface StepDraft { delayDays: number; subject: string; body: string }

const emptyForm = {
  name: "",
  description: "",
  fromEmail: "",
  entity: "leads" as "leads" | "clients",
  filterPriority: "" as "" | "hot" | "warm" | "cold",
  steps: [{ delayDays: 0, subject: "", body: "" }] as StepDraft[],
};

export default function DripsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: sequencesRaw } = useListDripSequences();
  const sequences = Array.isArray(sequencesRaw) ? sequencesRaw : [];
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["/api/marketing/drips"] });

  const createMut = useCreateDripSequence({
    mutation: {
      onSuccess() {
        invalidate(); setOpen(false); setForm(emptyForm);
        toast({ title: "Drip sequence created" });
      },
    },
  });
  const updateMut = useUpdateDripSequence({
    mutation: { onSuccess() { invalidate(); } },
  });
  const enrollMut = useEnrollDripSequence({
    mutation: {
      onSuccess(r) { invalidate(); toast({ title: `Enrolled ${r.enrolled} contacts` }); },
    },
  });

  function addStep() {
    setForm((f) => ({ ...f, steps: [...f.steps, { delayDays: 1, subject: "", body: "" }] }));
  }
  function removeStep(idx: number) {
    setForm((f) => ({ ...f, steps: f.steps.filter((_, i) => i !== idx) }));
  }
  function updateStep(idx: number, patch: Partial<StepDraft>) {
    setForm((f) => ({ ...f, steps: f.steps.map((s, i) => (i === idx ? { ...s, ...patch } : s)) }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    createMut.mutate({
      data: {
        name: form.name,
        description: form.description || null,
        fromEmail: form.fromEmail,
        trigger: {
          entity: form.entity,
          filters: form.filterPriority ? { priority: form.filterPriority } : {},
        },
        steps: form.steps.map((s, i) => ({ stepOrder: i, delayDays: Number(s.delayDays), subject: s.subject, body: s.body })),
      },
    });
  }

  function togglePause(seq: DripSequence) {
    updateMut.mutate({ id: seq.id, data: { status: seq.status === "active" ? "paused" : "active" } });
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Drip sequences</h1>
          <p className="text-sm text-muted-foreground">Automated email follow-ups for leads and clients.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-1"><Plus className="h-4 w-4" />New sequence</Button>
      </div>

      <div className="grid gap-3">
        {sequences.map((s) => (
          <div key={s.id} className="bg-card border border-card-border rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">{s.name}</h3>
                <p className="text-xs text-muted-foreground">
                  Target: {s.trigger.entity}{s.trigger.filters?.priority ? ` · ${s.trigger.filters.priority}` : ""} · From {s.fromEmail}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] px-2 py-0.5 rounded ${s.status === "active" ? "bg-emerald-500/15 text-emerald-400" : "bg-muted"}`}>{s.status}</span>
                <Button size="sm" variant="outline" onClick={() => togglePause(s)}>
                  {s.status === "active" ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                </Button>
                <Button size="sm" className="gap-1" onClick={() => enrollMut.mutate({ id: s.id })}>
                  <UserPlus className="h-3 w-3" />Enroll
                </Button>
              </div>
            </div>
            <ol className="mt-3 space-y-1 text-xs text-muted-foreground">
              {(Array.isArray(s.steps) ? s.steps : []).map((st, i) => (
                <li key={st.id ?? i}>Step {i + 1} · Day +{st.delayDays} · {st.subject}</li>
              ))}
            </ol>
          </div>
        ))}
        {sequences.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-10 border border-dashed border-border rounded-xl">
            No drip sequences yet.
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>New drip sequence</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>From email</Label>
                <Input required type="email" value={form.fromEmail} onChange={(e) => setForm({ ...form, fromEmail: e.target.value })} />
              </div>
              <div>
                <Label>Target</Label>
                <select className="w-full bg-input border border-border rounded-md h-9 px-2 text-sm"
                  value={form.entity} onChange={(e) => setForm({ ...form, entity: e.target.value as "leads" | "clients" })}>
                  <option value="leads">Leads</option>
                  <option value="clients">Clients</option>
                </select>
              </div>
            </div>
            {form.entity === "leads" && (
              <div>
                <Label>Filter by priority (optional)</Label>
                <select className="w-full bg-input border border-border rounded-md h-9 px-2 text-sm"
                  value={form.filterPriority}
                  onChange={(e) => setForm({ ...form, filterPriority: e.target.value as typeof form.filterPriority })}>
                  <option value="">All</option>
                  <option value="hot">Hot</option>
                  <option value="warm">Warm</option>
                  <option value="cold">Cold</option>
                </select>
              </div>
            )}
            <div>
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Steps</Label>
                <Button type="button" size="sm" variant="outline" onClick={addStep}><Plus className="h-3 w-3" /></Button>
              </div>
              {form.steps.map((step, i) => (
                <div key={i} className="border border-border rounded-md p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">Step {i + 1}</span>
                    {form.steps.length > 1 && (
                      <button type="button" className="text-xs text-red-400" onClick={() => removeStep(i)}>Remove</button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label>Delay (days)</Label>
                      <Input type="number" min={0} value={step.delayDays} onChange={(e) => updateStep(i, { delayDays: Number(e.target.value) })} />
                    </div>
                    <div className="col-span-2">
                      <Label>Subject</Label>
                      <Input value={step.subject} onChange={(e) => updateStep(i, { subject: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label>Body</Label>
                    <Textarea rows={3} value={step.body} onChange={(e) => updateStep(i, { body: e.target.value })} />
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createMut.isPending}>Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
