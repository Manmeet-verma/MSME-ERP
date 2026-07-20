import { useState } from "react";
import { useListTasks, useCreateTask, useUpdateTask, useDeleteTask } from "@workspace/api-client-react";
import type { Task } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, CheckCircle2, Circle, Clock, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

import type { TaskInputPriority } from "@workspace/api-client-react";
const empty = { title: "", description: "", dueAt: "", priority: "medium" as TaskInputPriority };

export default function TasksPage() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [filter, setFilter] = useState<"all" | "open" | "done">("open");
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: tasksRaw } = useListTasks();
  const tasks = Array.isArray(tasksRaw) ? tasksRaw : [];
  const filtered = tasks.filter((t) => filter === "all" || t.status === filter);

  const createMut = useCreateTask({
    mutation: { onSuccess() {
      toast({ title: "Task created" });
      qc.invalidateQueries({ queryKey: ["/api/tasks"] });
      setOpen(false); setForm(empty);
    } },
  });
  const updateMut = useUpdateTask({
    mutation: { onSuccess() { qc.invalidateQueries({ queryKey: ["/api/tasks"] }); } },
  });
  const deleteMut = useDeleteTask({
    mutation: { onSuccess() { qc.invalidateQueries({ queryKey: ["/api/tasks"] }); } },
  });

  function toggle(t: Task) {
    updateMut.mutate({ id: t.id, data: { title: t.title, status: t.status === "done" ? "open" : "done" } });
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">Tasks</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} {filter !== "all" ? filter : "total"} tasks</p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setOpen(true)}><Plus className="h-4 w-4" />New task</Button>
      </div>

      <div className="flex gap-2">
        {(["open", "done", "all"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${filter === f ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((t) => (
          <div key={t.id} className="bg-card border border-card-border rounded-xl p-4 flex items-start gap-3">
            <button onClick={() => toggle(t)} className="mt-0.5 text-muted-foreground hover:text-primary">
              {t.status === "done" ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Circle className="h-5 w-5" />}
            </button>
            <div className="flex-1">
              <p className={`font-medium ${t.status === "done" ? "line-through text-muted-foreground" : ""}`}>{t.title}</p>
              {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
              {t.dueAt && (
                <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                  <Clock className="h-3 w-3" />Due {new Date(t.dueAt).toLocaleDateString()}
                </p>
              )}
            </div>
            <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-muted">{t.priority}</span>
            <button onClick={() => deleteMut.mutate({ id: t.id })} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-muted-foreground text-center py-8">No tasks.</p>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New task</DialogTitle></DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            createMut.mutate({
              data: {
                title: form.title,
                description: form.description || undefined,
                priority: form.priority,
                dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : undefined,
              },
            });
          }} className="space-y-3">
            <div><Label>Title *</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Due date</Label><Input type="date" value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} /></div>
              <div>
                <Label>Priority</Label>
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as TaskInputPriority })}
                  className="w-full px-3 py-2 rounded-md bg-background border border-border text-sm">
                  <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={!form.title || createMut.isPending}>Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
