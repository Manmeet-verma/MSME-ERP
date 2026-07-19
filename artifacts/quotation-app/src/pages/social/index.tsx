import { useState } from "react";
import {
  useListSocialPosts,
  useListSocialAccounts,
  useCreateSocialPost,
  useDeleteSocialPost,
  usePublishSocialPost,
  useDraftSocialPost,
  useRewriteSocialPost,
} from "@workspace/api-client-react";
import type { SocialPost } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sparkles, Send, Trash2, Calendar, Plus, Facebook, Instagram, Linkedin, Wand2, ImagePlus, X, BarChart3 } from "lucide-react";
import { getAuthToken } from "@/lib/auth";

type Platform = "facebook" | "instagram" | "linkedin";
const PLATFORMS: { key: Platform; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "facebook", label: "Facebook", icon: Facebook },
  { key: "instagram", label: "Instagram", icon: Instagram },
  { key: "linkedin", label: "LinkedIn", icon: Linkedin },
];
const TONES = ["professional", "casual", "festive", "urgent", "playful"];

export default function SocialPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: posts = [] } = useListSocialPosts();
  const { data: accounts = [] } = useListSocialAccounts();

  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [content, setContent] = useState("");
  const [variants, setVariants] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Platform[]>(["facebook", "linkedin"]);
  const [tone, setTone] = useState("professional");
  const [scheduledAt, setScheduledAt] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const resp = await fetch("/api/uploads", {
        method: "POST",
        body: fd,
        headers: { Authorization: `Bearer ${getAuthToken() ?? ""}` },
      });
      if (!resp.ok) throw new Error(await resp.text());
      const data = (await resp.json()) as { url: string };
      setMediaUrls((u) => [...u, data.url]);
      toast({ title: "Image attached" });
    } catch (e) {
      toast({ title: "Upload failed", description: (e as Error).message.slice(0, 120), variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  async function refreshMetrics(id: number) {
    try {
      const resp = await fetch(`/api/social/posts/${id}/refresh-metrics`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getAuthToken() ?? ""}` },
      });
      if (!resp.ok) throw new Error(await resp.text());
      invalidate();
      toast({ title: "Metrics refreshed" });
    } catch (e) {
      toast({ title: "Metrics refresh failed", description: (e as Error).message.slice(0, 120), variant: "destructive" });
    }
  }

  const invalidate = () => qc.invalidateQueries({ queryKey: ["/api/social/posts"] });

  const draftMut = useDraftSocialPost({
    mutation: {
      onSuccess(d) {
        setContent(d.base);
        setVariants(d.variants ?? {});
        toast({ title: "AI draft ready" });
      },
      onError() { toast({ title: "AI draft failed", variant: "destructive" }); },
    },
  });
  const rewriteMut = useRewriteSocialPost({
    mutation: { onSuccess(d) { setContent(d.text); toast({ title: "Rewritten" }); } },
  });
  const createMut = useCreateSocialPost({
    mutation: {
      onSuccess() {
        invalidate();
        setOpen(false);
        setPrompt(""); setContent(""); setVariants({});
        toast({ title: "Post saved" });
      },
    },
  });
  const deleteMut = useDeleteSocialPost({
    mutation: { onSuccess() { invalidate(); toast({ title: "Deleted" }); } },
  });
  const publishMut = usePublishSocialPost({
    mutation: { onSuccess() { invalidate(); toast({ title: "Publish complete" }); } },
  });

  function togglePlatform(p: Platform) {
    setSelected((s) => (s.includes(p) ? s.filter((x) => x !== p) : [...s, p]));
  }

  function save(asScheduled: boolean) {
    if (!content || selected.length === 0) {
      toast({ title: "Add content and select a platform", variant: "destructive" });
      return;
    }
    createMut.mutate({
      data: {
        content,
        platforms: selected,
        variants,
        mediaUrls,
        scheduledAt: asScheduled && scheduledAt ? new Date(scheduledAt).toISOString() : null,
        status: asScheduled && scheduledAt ? "scheduled" : "draft",
      },
    });
    setMediaUrls([]);
  }

  const scheduled = posts.filter((p) => p.status === "scheduled");
  const published = posts.filter((p) => p.status === "posted" || p.status === "partial" || p.status === "failed");
  const drafts = posts.filter((p) => p.status === "draft");

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Social Composer</h1>
          <p className="text-sm text-muted-foreground">Draft, schedule, and publish across Facebook, Instagram, and LinkedIn.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-1"><Plus className="h-4 w-4" />New post</Button>
      </div>

      <div className="bg-card border border-card-border rounded-xl p-4">
        <h2 className="font-semibold text-sm mb-3">Connected accounts</h2>
        {accounts.length === 0 ? (
          <p className="text-xs text-muted-foreground">No accounts yet. Connect Facebook, Instagram, or LinkedIn in <a href="/settings/integrations" className="text-primary underline">Settings → Integrations</a>.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {accounts.map((a) => (
              <span key={a.id} className="text-xs px-2 py-1 rounded-md bg-muted">
                {a.platform} · {a.accountName}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Section title="Drafts" posts={drafts} onPublish={(id) => publishMut.mutate({ id })} onDelete={(id) => deleteMut.mutate({ id })} onRefresh={refreshMetrics} />
        <Section title="Scheduled" posts={scheduled} onPublish={(id) => publishMut.mutate({ id })} onDelete={(id) => deleteMut.mutate({ id })} onRefresh={refreshMetrics} />
        <Section title="Published" posts={published} onPublish={(id) => publishMut.mutate({ id })} onDelete={(id) => deleteMut.mutate({ id })} onRefresh={refreshMetrics} />
      </div>

      <div className="bg-card border border-card-border rounded-xl p-4">
        <h2 className="font-semibold text-sm flex items-center gap-2 mb-3"><Calendar className="h-4 w-4" />Calendar</h2>
        <ul className="space-y-2 text-sm">
          {[...scheduled, ...published]
            .slice()
            .sort((a, b) => (a.scheduledAt ?? a.publishedAt ?? "") < (b.scheduledAt ?? b.publishedAt ?? "") ? 1 : -1)
            .slice(0, 12)
            .map((p) => (
              <li key={p.id} className="flex items-start gap-3 border-b border-border pb-2 last:border-0">
                <span className="text-[11px] text-muted-foreground w-32 shrink-0">
                  {(p.scheduledAt ?? p.publishedAt) ? new Date(p.scheduledAt ?? p.publishedAt!).toLocaleString("en-IN") : "—"}
                </span>
                <span className="flex-1 truncate">{p.content}</span>
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-muted">{p.status}</span>
              </li>
            ))}
          {scheduled.length + published.length === 0 && <li className="text-xs text-muted-foreground">Nothing scheduled yet.</li>}
        </ul>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>New social post</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Platforms</Label>
              <div className="flex gap-2 mt-1">
                {PLATFORMS.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => togglePlatform(key)}
                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded border ${selected.includes(key) ? "bg-primary/15 border-primary/40 text-primary" : "border-border"}`}
                  >
                    <Icon className="h-3 w-3" />{label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>AI prompt</Label>
              <div className="flex gap-2 mt-1">
                <Input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g. Diwali festive 10% off on LED panels" />
                <select className="bg-input border border-border rounded-md px-2 text-sm" value={tone} onChange={(e) => setTone(e.target.value)}>
                  {TONES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  disabled={!prompt || selected.length === 0 || draftMut.isPending}
                  onClick={() => draftMut.mutate({ data: { prompt, platforms: selected, tone } })}
                >
                  <Sparkles className="h-3 w-3" />Draft with AI
                </Button>
              </div>
            </div>
            <div>
              <Label>Content</Label>
              <Textarea rows={5} value={content} onChange={(e) => { setContent(e.target.value); }} placeholder="Write your post or generate with AI" />
              {content && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {TONES.map((t) => (
                    <Button key={t} type="button" size="sm" variant="ghost" className="text-xs gap-1"
                      onClick={() => rewriteMut.mutate({ data: { text: content, tone: t } })}
                      disabled={rewriteMut.isPending}>
                      <Wand2 className="h-3 w-3" />{t}
                    </Button>
                  ))}
                </div>
              )}
            </div>
            {Object.keys(variants).length > 0 && (
              <div className="bg-muted/30 rounded-md p-3 space-y-2 text-xs">
                <p className="font-semibold">Per-platform variants</p>
                {Object.entries(variants).map(([p, v]) => (
                  <div key={p}>
                    <p className="font-medium uppercase text-[10px] text-muted-foreground">{p}</p>
                    <Textarea rows={2} value={v} onChange={(e) => setVariants({ ...variants, [p]: e.target.value })} className="text-xs" />
                  </div>
                ))}
              </div>
            )}
            <div>
              <Label>Images (required for Instagram)</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {mediaUrls.map((u) => (
                  <div key={u} className="relative">
                    <img src={u} alt="" className="h-16 w-16 object-cover rounded border border-border" />
                    <button
                      type="button"
                      onClick={() => setMediaUrls((arr) => arr.filter((x) => x !== u))}
                      className="absolute -top-1 -right-1 bg-black/70 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <label className={`flex items-center gap-1 text-xs px-2 py-1 rounded border border-dashed cursor-pointer ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
                  <ImagePlus className="h-3 w-3" />{uploading ? "Uploading…" : "Add image"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUpload(f);
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
              </div>
              {selected.includes("instagram") && mediaUrls.length === 0 && (
                <p className="text-[11px] text-amber-400 mt-1">Instagram requires at least one image to publish.</p>
              )}
            </div>
            <div>
              <Label>Schedule (optional)</Label>
              <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => save(false)} disabled={createMut.isPending}>Save draft</Button>
            <Button onClick={() => save(true)} disabled={createMut.isPending || !scheduledAt} className="gap-1">
              <Send className="h-3 w-3" />Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Section({
  title,
  posts,
  onPublish,
  onDelete,
  onRefresh,
}: {
  title: string;
  posts: SocialPost[];
  onPublish: (id: number) => void;
  onDelete: (id: number) => void;
  onRefresh: (id: number) => void;
}) {
  return (
    <div className="bg-card border border-card-border rounded-xl p-4">
      <h3 className="font-semibold text-sm mb-3">{title} <span className="text-muted-foreground">({posts.length})</span></h3>
      <ul className="space-y-3">
        {posts.slice(0, 8).map((p) => (
          <li key={p.id} className="border-b border-border pb-2 last:border-0">
            <p className="text-sm line-clamp-2">{p.content}</p>
            <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{(Array.isArray(p.platforms) ? p.platforms : []).join(", ")}</span>
              <div className="flex gap-1">
                <button onClick={() => onPublish(p.id)} title="Publish now" className="hover:text-primary"><Send className="h-3 w-3" /></button>
                <button onClick={() => onRefresh(p.id)} title="Refresh metrics" className="hover:text-primary"><BarChart3 className="h-3 w-3" /></button>
                <button onClick={() => onDelete(p.id)} title="Delete" className="hover:text-red-400"><Trash2 className="h-3 w-3" /></button>
              </div>
            </div>
            {p.results && p.results.length > 0 && (
              <div className="mt-1 text-[11px] space-y-0.5">
                {p.results.map((r) => {
                  const m = (r.metrics ?? {}) as Record<string, number>;
                  const summary = Object.keys(m).length
                    ? " · " + Object.entries(m).map(([k, v]) => `${k} ${v}`).join(" / ")
                    : "";
                  return (
                    <div key={r.id} className={r.status === "posted" ? "text-emerald-400" : "text-red-400"}>
                      {r.platform}: {r.status}{r.error ? ` — ${r.error.slice(0, 60)}` : ""}{summary}
                    </div>
                  );
                })}
              </div>
            )}
          </li>
        ))}
        {posts.length === 0 && <li className="text-xs text-muted-foreground">Empty</li>}
      </ul>
    </div>
  );
}
