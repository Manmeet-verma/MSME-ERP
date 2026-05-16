import { useState } from "react";
import { useLocation } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { setAuthToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Monitor, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [form, setForm] = useState({ email: "", password: "" });

  const loginMutation = useLogin({
    mutation: {
      onSuccess(data) {
        setAuthToken(data.token);
        localStorage.setItem("led_user", JSON.stringify(data.user));
        navigate("/");
      },
      onError(err) {
        toast({
          title: "Login failed",
          description: (err as { data?: { error?: string } })?.data?.error ?? "Invalid credentials",
          variant: "destructive",
        });
      },
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    loginMutation.mutate({ data: form });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/20 border border-primary/30 mb-4">
            <Monitor className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Techon LED</h1>
          <p className="text-sm text-muted-foreground mt-1">Quotation Pro — Sign in to continue</p>
        </div>

        {/* Card */}
        <div className="bg-card border border-card-border rounded-xl p-6 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@techonled.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Sign in
            </Button>
          </form>

          <div className="mt-5 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground text-center mb-2">Demo credentials</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Admin", email: "admin@techonled.com" },
                { label: "Sales", email: "rajesh@techonled.com" },
                { label: "Viewer", email: "priya@techonled.com" },
              ].map((u) => (
                <button
                  key={u.email}
                  type="button"
                  onClick={() => setForm({ email: u.email, password: "admin123" })}
                  className="text-[11px] text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-md py-1.5 px-2 transition-colors"
                >
                  {u.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          © {new Date().getFullYear()} Techon LED Displays. All rights reserved.
        </p>
      </div>
    </div>
  );
}
