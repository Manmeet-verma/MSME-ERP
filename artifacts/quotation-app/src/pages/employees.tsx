import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListEmployees,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
} from "@workspace/api-client-react";
import type { Employee } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { formatCurrency } from "@/lib/format";

type Form = {
  employeeCode: string; name: string; email: string; phone: string;
  role: string; department: string; dateOfJoining: string;
  status: "active" | "inactive" | "terminated";
  basic: number; hra: number; allowances: number; otherDeductions: number;
  pfEnabled: boolean; esiEnabled: boolean;
  bankName: string; bankAccount: string; ifsc: string; panNumber: string;
};
const empty: Form = {
  employeeCode: "", name: "", email: "", phone: "", role: "", department: "",
  dateOfJoining: "", status: "active",
  basic: 0, hra: 0, allowances: 0, otherDeductions: 0,
  pfEnabled: false, esiEnabled: false,
  bankName: "", bankAccount: "", ifsc: "", panNumber: "",
};

export default function EmployeesPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: employees = [], isLoading } = useListEmployees();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState<Form>(empty);

  const inv = () => qc.invalidateQueries({ queryKey: ["/api/employees"] });
  const createMut = useCreateEmployee({ mutation: { onSuccess() { toast({ title: "Employee added" }); inv(); setOpen(false); } } });
  const updateMut = useUpdateEmployee({ mutation: { onSuccess() { toast({ title: "Updated" }); inv(); setOpen(false); } } });
  const deleteMut = useDeleteEmployee({ mutation: { onSuccess() { toast({ title: "Removed" }); inv(); } } });

  function openCreate() { setEditing(null); setForm(empty); setOpen(true); }
  function openEdit(e: Employee) {
    setEditing(e);
    setForm({
      employeeCode: e.employeeCode, name: e.name, email: e.email ?? "", phone: e.phone ?? "",
      role: e.role ?? "", department: e.department ?? "", dateOfJoining: e.dateOfJoining ?? "",
      status: e.status, basic: e.basic, hra: e.hra, allowances: e.allowances, otherDeductions: e.otherDeductions,
      pfEnabled: e.pfEnabled, esiEnabled: e.esiEnabled,
      bankName: e.bankName ?? "", bankAccount: e.bankAccount ?? "", ifsc: e.ifsc ?? "", panNumber: e.panNumber ?? "",
    });
    setOpen(true);
  }
  function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (editing) updateMut.mutate({ id: editing.id, data: form });
    else createMut.mutate({ data: form });
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Employees</h1>
          <p className="text-sm text-muted-foreground">{employees.length} employees</p>
        </div>
        <Button size="sm" className="gap-2" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Add Employee
        </Button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : employees.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <Users className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No employees yet</p>
          <button onClick={openCreate} className="text-xs text-primary hover:underline mt-1">Add your first employee</button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map((e) => (
            <div key={e.id} className="rounded-xl border border-border bg-card p-5 hover:border-primary/30 group">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-sm">{e.name}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">{e.employeeCode}</p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                  <button onClick={() => openEdit(e)} className="p-1.5 text-muted-foreground hover:text-primary rounded-md hover:bg-primary/10"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => { if (confirm(`Remove ${e.name}?`)) deleteMut.mutate({ id: e.id }); }} className="p-1.5 text-muted-foreground hover:text-destructive rounded-md hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                {e.role && <p>{e.role}{e.department ? ` · ${e.department}` : ""}</p>}
                <p className="text-foreground/80 font-medium">CTC: {formatCurrency(e.basic + e.hra + e.allowances)}</p>
                <p className="text-[10px]">Basic {formatCurrency(e.basic)} · HRA {formatCurrency(e.hra)} · Allow {formatCurrency(e.allowances)}</p>
                <p className="text-[10px] capitalize">Status: {e.status}{e.pfEnabled ? " · PF" : ""}{e.esiEnabled ? " · ESI" : ""}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Employee" : "Add Employee"}</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Code *</Label><Input value={form.employeeCode} onChange={(e) => setForm((f) => ({ ...f, employeeCode: e.target.value }))} required /></div>
              <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></div>
              <div><Label>Role</Label><Input value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} /></div>
              <div><Label>Department</Label><Input value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} /></div>
              <div><Label>Joining date</Label><Input type="date" value={form.dateOfJoining} onChange={(e) => setForm((f) => ({ ...f, dateOfJoining: e.target.value }))} /></div>
              <div><Label>Status</Label>
                <select className="w-full h-10 px-3 rounded-md border border-input bg-background" value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Form["status"] }))}>
                  <option value="active">Active</option><option value="inactive">Inactive</option><option value="terminated">Terminated</option>
                </select>
              </div>
            </div>
            <div className="border-t border-border pt-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Salary structure (monthly)</p>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Basic (₹)</Label><Input type="number" value={form.basic} onChange={(e) => setForm((f) => ({ ...f, basic: Number(e.target.value) }))} /></div>
                <div><Label>HRA (₹)</Label><Input type="number" value={form.hra} onChange={(e) => setForm((f) => ({ ...f, hra: Number(e.target.value) }))} /></div>
                <div><Label>Allowances (₹)</Label><Input type="number" value={form.allowances} onChange={(e) => setForm((f) => ({ ...f, allowances: Number(e.target.value) }))} /></div>
                <div><Label>Other deductions (₹)</Label><Input type="number" value={form.otherDeductions} onChange={(e) => setForm((f) => ({ ...f, otherDeductions: Number(e.target.value) }))} /></div>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.pfEnabled} onChange={(e) => setForm((f) => ({ ...f, pfEnabled: e.target.checked }))} /> PF (12% of basic)</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.esiEnabled} onChange={(e) => setForm((f) => ({ ...f, esiEnabled: e.target.checked }))} /> ESI (0.75% &lt;₹21k)</label>
              </div>
            </div>
            <div className="border-t border-border pt-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Bank & PAN</p>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Bank</Label><Input value={form.bankName} onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))} /></div>
                <div><Label>Account</Label><Input value={form.bankAccount} onChange={(e) => setForm((f) => ({ ...f, bankAccount: e.target.value }))} /></div>
                <div><Label>IFSC</Label><Input value={form.ifsc} onChange={(e) => setForm((f) => ({ ...f, ifsc: e.target.value }))} /></div>
                <div><Label>PAN</Label><Input value={form.panNumber} onChange={(e) => setForm((f) => ({ ...f, panNumber: e.target.value }))} /></div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">{editing ? "Update" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
