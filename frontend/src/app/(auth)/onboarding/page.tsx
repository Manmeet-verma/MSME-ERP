"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCreateOrganization } from "@workspace/api-client-react";
import { setAuthToken, setCurrentOrg, setCurrentRole, isAuthenticated, hasOrg } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Building2, Loader2 } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", gstNumber: "" });
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
    } else if (hasOrg()) {
      router.replace("/");
    } else {
      setChecked(true);
    }
  }, [router]);

  const createOrg = useCreateOrganization({
    mutation: {
      onSuccess(data) {
        setAuthToken(data.token);
        setCurrentOrg(data.organization);
        setCurrentRole(data.role);
        toast({ title: "Workspace created", description: `Welcome to ${data.organization.name}` });
        router.push("/");
      },
      onError(err) {
        toast({
          title: "Could not create",
          description: (err as { data?: { error?: string } })?.data?.error ?? "Try again",
          variant: "destructive",
        });
      },
    },
  });

  if (!checked) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/20 border border-primary/30 mb-4">
            <Building2 className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Tell us about your business</h1>
          <p className="text-sm text-muted-foreground mt-1">You can invite teammates after this</p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-6 shadow-lg">
          <form onSubmit={(e) => { e.preventDefault(); createOrg.mutate({ data: { name: form.name, gstNumber: form.gstNumber || undefined } }); }} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Business name</Label>
              <Input id="name" value={form.name} required autoFocus
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gst">GST number (optional)</Label>
              <Input id="gst" value={form.gstNumber}
                onChange={(e) => setForm((f) => ({ ...f, gstNumber: e.target.value }))} />
            </div>
            <Button type="submit" className="w-full" disabled={createOrg.isPending}>
              {createOrg.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create workspace
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
