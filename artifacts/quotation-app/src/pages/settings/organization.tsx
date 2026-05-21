import { useEffect, useState } from "react";
import {
  useGetCurrentOrganization, useUpdateCurrentOrganization,
  getGetCurrentOrganizationQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { setCurrentOrg, getCurrentRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Building2 } from "lucide-react";

export default function OrganizationSettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: org } = useGetCurrentOrganization();
  const role = getCurrentRole();
  const canEdit = role === "owner" || role === "admin";

  const [form, setForm] = useState({
    name: "",
    gstNumber: "",
    phone: "",
    address: "",
    allowOverselling: false,
    reserveStockOnDraft: false,
    payrollAutoRunEnabled: false,
    payrollAutoRunDay: 1,
    payrollEmailPayslips: false,
  });

  useEffect(() => {
    if (org) {
      setForm({
        name: org.name ?? "",
        gstNumber: org.gstNumber ?? "",
        phone: org.phone ?? "",
        address: org.address ?? "",
        allowOverselling: org.salesSettings?.allowOverselling ?? false,
        reserveStockOnDraft: org.salesSettings?.reserveStockOnDraft ?? false,
        payrollAutoRunEnabled: org.payrollSettings?.autoRunEnabled ?? false,
        payrollAutoRunDay: org.payrollSettings?.autoRunDay ?? 1,
        payrollEmailPayslips: org.payrollSettings?.emailPayslips ?? false,
      });
      setCurrentOrg(org);
    }
  }, [org]);

  const update = useUpdateCurrentOrganization({
    mutation: {
      onSuccess(data) {
        setCurrentOrg(data);
        queryClient.invalidateQueries({ queryKey: getGetCurrentOrganizationQueryKey() });
        toast({ title: "Saved", description: "Organization updated" });
      },
      onError() {
        toast({ title: "Save failed", variant: "destructive" });
      },
    },
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Organization</h1>
          <p className="text-sm text-muted-foreground">Your workspace details</p>
        </div>
      </div>

      <div className="bg-card border border-card-border rounded-xl p-6">
        <form onSubmit={(e) => { e.preventDefault(); if (canEdit) update.mutate({ data: { name: form.name, gstNumber: form.gstNumber || undefined, phone: form.phone || undefined, address: form.address || undefined, salesSettings: { allowOverselling: form.allowOverselling, reserveStockOnDraft: form.reserveStockOnDraft }, payrollSettings: { autoRunEnabled: form.payrollAutoRunEnabled, autoRunDay: form.payrollAutoRunDay, emailPayslips: form.payrollEmailPayslips } } }); }} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Business name</Label>
            <Input id="name" value={form.name} disabled={!canEdit}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gst">GST number</Label>
            <Input id="gst" value={form.gstNumber} disabled={!canEdit}
              onChange={(e) => setForm((f) => ({ ...f, gstNumber: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={form.phone} disabled={!canEdit}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="address">Address</Label>
            <Input id="address" value={form.address} disabled={!canEdit}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Plan</Label>
            <p className="text-sm text-muted-foreground capitalize">{org?.plan ?? "free"}</p>
          </div>

          <div className="pt-2 border-t border-border space-y-3">
            <div>
              <h3 className="text-sm font-semibold">Stock controls</h3>
              <p className="text-xs text-muted-foreground">Applies to all sales orders for this organization.</p>
            </div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4"
                disabled={!canEdit}
                checked={form.allowOverselling}
                onChange={(e) => setForm((f) => ({ ...f, allowOverselling: e.target.checked }))}
              />
              <div>
                <div className="text-sm font-medium">Allow overselling</div>
                <div className="text-xs text-muted-foreground">When off, confirming a sales order is blocked if any line exceeds available stock.</div>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4"
                disabled={!canEdit}
                checked={form.reserveStockOnDraft}
                onChange={(e) => setForm((f) => ({ ...f, reserveStockOnDraft: e.target.checked }))}
              />
              <div>
                <div className="text-sm font-medium">Reserve stock on draft</div>
                <div className="text-xs text-muted-foreground">Soft-holds stock as soon as a draft sales order is saved so concurrent quotes can't double-book it.</div>
              </div>
            </label>
          </div>
          <div className="pt-2 border-t border-border space-y-3">
            <div>
              <h3 className="text-sm font-semibold">Payroll automation</h3>
              <p className="text-xs text-muted-foreground">Optional: have the system draft last month's payroll for you each month and email payslips to staff when you mark it paid.</p>
            </div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4"
                disabled={!canEdit}
                checked={form.payrollAutoRunEnabled}
                onChange={(e) => setForm((f) => ({ ...f, payrollAutoRunEnabled: e.target.checked }))}
              />
              <div>
                <div className="text-sm font-medium">Auto-create monthly payroll run</div>
                <div className="text-xs text-muted-foreground">On the chosen day of every month, a draft payroll run for the previous month is created automatically and waits in Payroll for your review.</div>
              </div>
            </label>
            <div className="space-y-1.5 pl-7">
              <Label htmlFor="payrollDay">Run on day of month (1–28)</Label>
              <Input
                id="payrollDay"
                type="number"
                min={1}
                max={28}
                className="max-w-[120px]"
                disabled={!canEdit || !form.payrollAutoRunEnabled}
                value={form.payrollAutoRunDay}
                onChange={(e) => {
                  const n = Math.min(28, Math.max(1, Math.round(Number(e.target.value) || 1)));
                  setForm((f) => ({ ...f, payrollAutoRunDay: n }));
                }}
              />
            </div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4"
                disabled={!canEdit}
                checked={form.payrollEmailPayslips}
                onChange={(e) => setForm((f) => ({ ...f, payrollEmailPayslips: e.target.checked }))}
              />
              <div>
                <div className="text-sm font-medium">Email payslips when marking a run paid</div>
                <div className="text-xs text-muted-foreground">Sends each employee (with an email on file) their payslip link as soon as you mark the payroll run paid.</div>
              </div>
            </label>
          </div>

          {canEdit && (
            <Button type="submit" disabled={update.isPending}>
              {update.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save changes
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}
