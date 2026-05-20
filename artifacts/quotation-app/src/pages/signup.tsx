import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useSignupWithOrg } from "@workspace/api-client-react";
import { setAuthToken, setCurrentUser, setCurrentOrg, setCurrentRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Rocket, Loader2 } from "lucide-react";

export default function SignupPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", password: "", organizationName: "" });

  const signup = useSignupWithOrg({
    mutation: {
      onSuccess(data) {
        setAuthToken(data.token);
        setCurrentUser(data.user);
        const active = data.organizations.find((o) => o.id === data.activeOrgId) ?? data.organizations[0];
        if (active) {
          setCurrentOrg(active);
          setCurrentRole(active.role);
          navigate("/");
        } else {
          navigate("/onboarding");
        }
      },
      onError(err) {
        toast({
          title: "Signup failed",
          description: (err as { data?: { error?: string } })?.data?.error ?? "Could not create account",
          variant: "destructive",
        });
      },
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    signup.mutate({ data: form });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      </div>
      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/20 border border-primary/30 mb-4">
            <Rocket className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Start your workspace</h1>
          <p className="text-sm text-muted-foreground mt-1">Free forever for small teams</p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-6 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Your name</Label>
              <Input id="name" value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="organizationName">Business / organization</Label>
              <Input id="organizationName" value={form.organizationName}
                onChange={(e) => setForm((f) => ({ ...f, organizationName: e.target.value }))}
                required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Work email</Label>
              <Input id="email" type="email" value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password (min 8 chars)</Label>
              <Input id="password" type="password" minLength={8} value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                required />
            </div>
            <Button type="submit" className="w-full" disabled={signup.isPending}>
              {signup.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create workspace
            </Button>
          </form>
          <p className="text-center text-xs text-muted-foreground mt-5">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
