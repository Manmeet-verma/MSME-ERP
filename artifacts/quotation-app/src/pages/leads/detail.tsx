import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import {
  useGetLead, useUpdateLead, useConvertLead, useScoreLead,
  useInitiateCall, useDraftEmail, useSendEmail,
  useListCalls, useListEmails, useCreateLeadActivity,
} from "@workspace/api-client-react";
import type { LeadActivity, Call, Email } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Phone, Mail, ArrowLeft, Sparkles, MessageSquare, RefreshCw, UserCheck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/format";

const STATUS_OPTIONS = ["new", "contacted", "qualified", "lost", "won"];

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id ?? "";
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: lead } = useGetLead(id);
  const { data: calls = [] } = useListCalls({ leadId: id });
  const { data: emails = [] } = useListEmails({ leadId: id });
  const [callOpen, setCallOpen] = useState(false);
  const [agentNumber, setAgentNumber] = useState("");
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailForm, setEmailForm] = useState({ subject: "", body: "" });
  const [aiPrompt, setAiPrompt] = useState("");

  const updateMut = useUpdateLead({
    mutation: { onSuccess() {
      qc.invalidateQueries({ queryKey: [`/api/leads/${id}`] });
      qc.invalidateQueries({ queryKey: ["/api/leads"] });
    } },
  });
  const convertMut = useConvertLead({
    mutation: {
      onSuccess(d) {
        toast({ title: "Converted to client" });
        if (d.quotationId) navigate(`/quotations/${d.quotationId}`);
        else navigate(`/clients`);
      },
    },
  });
  const scoreMut = useScoreLead({
    mutation: { onSuccess() {
      toast({ title: "Lead re-scored" });
      qc.invalidateQueries({ queryKey: [`/api/leads/${id}`] });
    } },
  });
  const initiateMut = useInitiateCall({
    mutation: {
      onSuccess() {
        toast({ title: "Call initiated. Your phone will ring." });
        setCallOpen(false);
        qc.invalidateQueries({ queryKey: ["/api/calls"] });
      },
      onError() { toast({ title: "Call failed (check Twilio integration)", variant: "destructive" }); },
    },
  });
  const draftMut = useDraftEmail({
    mutation: {
      onSuccess(d) {
        setEmailForm({ subject: d.subject, body: d.body });
        toast({ title: "Draft generated" });
      },
      onError() { toast({ title: "AI draft failed", variant: "destructive" }); },
    },
  });
  const sendMut = useSendEmail({
    mutation: {
      onSuccess() {
        toast({ title: "Email recorded" });
        setEmailOpen(false);
        qc.invalidateQueries({ queryKey: ["/api/emails"] });
      },
    },
  });
  const noteMut = useCreateLeadActivity({
    mutation: { onSuccess() { qc.invalidateQueries({ queryKey: [`/api/leads/${id}`] }); } },
  });

  if (!id) return <div className="p-6 text-center"><p className="text-muted-foreground">Invalid lead ID</p></div>;
  if (!lead) return <div className="p-6">Loading...</div>;

  const activities: LeadActivity[] = lead.activities ?? [];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <Link href="/leads">
        <a className="text-sm text-muted-foreground flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to leads
        </a>
      </Link>

      <div className="bg-card border border-card-border rounded-xl p-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold">{lead.name}</h1>
            {lead.company && <p className="text-sm text-muted-foreground">{lead.company}</p>}
            <div className="flex gap-3 mt-2 text-sm text-muted-foreground flex-wrap">
              {lead.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{lead.phone}</span>}
              {(lead as any).gstin && <span className="font-mono text-xs uppercase">GSTIN: {(lead as any).gstin}</span>}
              {lead.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{lead.email}</span>}
              {lead.city && <span>{lead.city}{lead.state ? `, ${lead.state}` : ""}</span>}
            </div>
          </div>
          <div className="text-right space-y-1">
            <p className="text-xs uppercase text-muted-foreground">Priority</p>
            <p className="text-lg font-bold capitalize">{lead.priority}</p>
            <p className="text-xs text-muted-foreground">Score: {lead.score}/100</p>
            {(lead as any).approxBudget != null && <p className="text-xs">Approx Budget: {formatCurrency((lead as any).approxBudget)}</p>}
            {!(lead as any).approxBudget && lead.budget != null && <p className="text-xs">Budget: {formatCurrency(lead.budget)}</p>}
            {(lead as any).sourceBy && <p className="text-xs text-muted-foreground">Source By: {(lead as any).sourceBy}</p>}
          </div>
        </div>
        {lead.nextAction && <p className="mt-3 text-sm text-primary">→ {lead.nextAction}</p>}

        <div className="flex gap-2 flex-wrap mt-4">
          <select value={lead.status} onChange={(e) => updateMut.mutate({ id, data: { name: lead.name, status: e.target.value as never } })}
            className="px-3 py-1.5 rounded-lg text-xs bg-secondary border border-border">
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <Button size="sm" variant="outline" className="gap-1" onClick={() => scoreMut.mutate({ id })}>
            <RefreshCw className="h-3 w-3" /> Re-score
          </Button>
          {lead.phone && (
            <Button size="sm" variant="outline" className="gap-1" onClick={() => setCallOpen(true)}>
              <Phone className="h-3 w-3" /> Call
            </Button>
          )}
          {lead.email && (
            <Button size="sm" variant="outline" className="gap-1" onClick={() => { setEmailForm({ subject: "", body: "" }); setAiPrompt(""); setEmailOpen(true); }}>
              <Mail className="h-3 w-3" /> Email
            </Button>
          )}
          <Button size="sm" className="gap-1" onClick={() => convertMut.mutate({ id, data: { createQuotation: true } })}>
            <UserCheck className="h-3 w-3" /> Convert to client + quote
          </Button>
        </div>
      </div>

      {/* Quick note */}
      <div className="bg-card border border-card-border rounded-xl p-5">
        <h3 className="font-semibold mb-2">Add note</h3>
        <NoteForm onSubmit={(title, body) => noteMut.mutate({ id, data: { type: "note", title, body } })} pending={noteMut.isPending} />
      </div>

      {/* Timeline */}
      <div className="bg-card border border-card-border rounded-xl p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Timeline</h3>
        {activities.length === 0 && calls.length === 0 && emails.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <ul className="space-y-3">
            {activities.map((a) => (
              <li key={`a-${a.id}`} className="border-l-2 border-primary/40 pl-3">
                <p className="text-sm font-medium">{a.title}</p>
                {a.body && <p className="text-xs text-muted-foreground whitespace-pre-wrap">{a.body}</p>}
                <p className="text-[10px] text-muted-foreground">{new Date(a.createdAt).toLocaleString()} · {a.type}</p>
              </li>
            ))}
            {calls.map((c: Call) => (
              <li key={`c-${c.id}`} className="border-l-2 border-cyan-500/40 pl-3">
                <p className="text-sm font-medium">Call → {c.toNumber} ({c.status})</p>
                {c.aiSummary && <p className="text-xs text-muted-foreground whitespace-pre-wrap"><Sparkles className="inline h-3 w-3 mr-1" />{c.aiSummary}</p>}
                <p className="text-[10px] text-muted-foreground">{new Date(c.createdAt).toLocaleString()}</p>
              </li>
            ))}
            {emails.map((e: Email) => (
              <li key={`e-${e.id}`} className="border-l-2 border-emerald-500/40 pl-3">
                <p className="text-sm font-medium">Email {e.direction}: {e.subject}</p>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3">{e.body}</p>
                <p className="text-[10px] text-muted-foreground">{new Date(e.createdAt).toLocaleString()} · {e.status}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Call dialog */}
      <Dialog open={callOpen} onOpenChange={setCallOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Click-to-call</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Your phone will ring first, then we'll dial the lead.</p>
          <Label className="mt-3">Your phone (with country code)</Label>
          <Input value={agentNumber} onChange={(e) => setAgentNumber(e.target.value)} placeholder="+919876543210" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCallOpen(false)}>Cancel</Button>
            <Button onClick={() => initiateMut.mutate({ data: { toNumber: lead.phone!, agentNumber, leadId: id } })} disabled={!agentNumber || initiateMut.isPending}>
              Call now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email dialog */}
      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Compose email to {lead.email}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input placeholder="Tell AI what to say (e.g. 'introduce ourselves and share pricing')"
                value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} />
              <Button type="button" variant="outline" className="gap-1" disabled={!aiPrompt || draftMut.isPending}
                onClick={() => draftMut.mutate({ data: { purpose: aiPrompt, leadId: id } })}>
                <Sparkles className="h-4 w-4" /> Draft
              </Button>
            </div>
            <Input placeholder="Subject" value={emailForm.subject} onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })} />
            <Textarea rows={10} placeholder="Body" value={emailForm.body} onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailOpen(false)}>Cancel</Button>
            <Button disabled={!emailForm.subject || !emailForm.body || sendMut.isPending}
              onClick={() => sendMut.mutate({ data: { toEmail: lead.email!, subject: emailForm.subject, body: emailForm.body, leadId: id } })}>
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NoteForm({ onSubmit, pending }: { onSubmit: (t: string, b: string) => void; pending: boolean }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(title, body); setTitle(""); setBody(""); }} className="space-y-2">
      <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Textarea rows={2} placeholder="Details (optional)" value={body} onChange={(e) => setBody(e.target.value)} />
      <Button type="submit" size="sm" disabled={!title || pending}>Add note</Button>
    </form>
  );
}
