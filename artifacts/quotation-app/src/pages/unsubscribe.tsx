import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { getUnsubscribe, confirmUnsubscribe } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Mail, CheckCircle2 } from "lucide-react";

export default function UnsubscribePage() {
  const { token } = useParams<{ token: string }>();
  const [email, setEmail] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "done" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    getUnsubscribe(token)
      .then((d) => { if (!cancelled) { setEmail(d.email); setStatus("ready"); } })
      .catch(() => { if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; };
  }, [token]);

  async function submit() {
    try {
      await confirmUnsubscribe(token);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="bg-card border border-card-border rounded-xl p-8 max-w-md w-full text-center">
        <div className="h-12 w-12 mx-auto rounded-full bg-primary/15 text-primary flex items-center justify-center mb-3">
          {status === "done" ? <CheckCircle2 className="h-6 w-6" /> : <Mail className="h-6 w-6" />}
        </div>
        {status === "loading" && <p className="text-sm text-muted-foreground">Loading…</p>}
        {status === "error" && (
          <>
            <h1 className="text-lg font-semibold mb-1">Link invalid</h1>
            <p className="text-sm text-muted-foreground">This unsubscribe link is no longer valid.</p>
          </>
        )}
        {status === "ready" && email && (
          <>
            <h1 className="text-lg font-semibold mb-1">Unsubscribe</h1>
            <p className="text-sm text-muted-foreground mb-4">
              Remove <span className="font-medium text-foreground">{email}</span> from all marketing emails?
            </p>
            <Button onClick={submit}>Confirm unsubscribe</Button>
          </>
        )}
        {status === "done" && (
          <>
            <h1 className="text-lg font-semibold mb-1">You're unsubscribed</h1>
            <p className="text-sm text-muted-foreground">You will no longer receive marketing emails.</p>
          </>
        )}
      </div>
    </div>
  );
}
