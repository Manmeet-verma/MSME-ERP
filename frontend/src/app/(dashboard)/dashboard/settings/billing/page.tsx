"use client";

import { useGetCurrentOrganization } from "@workspace/api-client-react";
import { getLimits } from "@/lib/modules";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export default function BillingPage() {
  const { data: org, isLoading, error } = useGetCurrentOrganization();
  const limits = org ? getLimits(org) : null;

  if (isLoading) return <div className="p-6 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Loading...</div>;
  if (error || !org) return <div className="p-6 text-destructive">Failed to load organization.</div>;

  return (
    <div className="p-6 max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">Plan & Billing</h1>
      <Card>
        <CardHeader><CardTitle>Current Plan</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div className="space-y-1"><Label>Plan</Label><p className="text-sm capitalize">{org.plan ?? "free"}</p></div>
          <div className="space-y-1"><Label>Status</Label><p className="text-sm text-muted-foreground">Active</p></div>
        </CardContent>
      </Card>
      {limits && (
        <Card>
          <CardHeader><CardTitle>Limits</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><Label>Team members</Label><p className="text-sm">{limits.members}</p></div>
            <div className="space-y-1"><Label>Leads / month</Label><p className="text-sm">{limits.leadsPerMonth}</p></div>
            <div className="space-y-1"><Label>Emails / month</Label><p className="text-sm">{limits.emailsPerMonth}</p></div>
            <div className="space-y-1"><Label>Storage</Label><p className="text-sm">{limits.storageMB} MB</p></div>
          </CardContent>
        </Card>
      )}
      <p className="text-sm text-muted-foreground">Contact support to upgrade your plan.</p>
    </div>
  );
}
