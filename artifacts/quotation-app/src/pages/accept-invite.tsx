import { useParams, useLocation, Link } from "wouter";
import { useGetInvitation, useAcceptInvitation, getCurrentOrganization } from "@workspace/api-client-react";
import { setAuthToken, setCurrentOrg, setCurrentRole, isAuthenticated } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Mail, Loader2 } from "lucide-react";

export default function AcceptInvitePage() {
  const params = useParams<{ token: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const token = params.token ?? "";
  const { data, isLoading, isError } = useGetInvitation(token);
  const accept = useAcceptInvitation({
    mutation: {
      async onSuccess(data) {
        setAuthToken(data.token);
        setCurrentRole(data.role);
        try {
          const org = await getCurrentOrganization();
          setCurrentOrg(org);
        } catch {
          setCurrentOrg(null);
        }
        toast({ title: "Joined!", description: "You're now part of the workspace" });
        navigate("/");
      },
      onError(err) {
        toast({
          title: "Could not accept",
          description: (err as { data?: { error?: string } })?.data?.error ?? "Try again",
          variant: "destructive",
        });
      },
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-card border border-card-border rounded-xl p-8 shadow-lg text-center">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/20 border border-primary/30 mb-4">
            <Mail className="h-7 w-7 text-primary" />
          </div>
          {isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          ) : isError || !data ? (
            <>
              <h1 className="text-xl font-bold">Invitation not found</h1>
              <p className="text-sm text-muted-foreground mt-2">It may have expired or been revoked.</p>
              <Button asChild className="mt-6"><Link href="/login">Back to sign in</Link></Button>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold">Join {data.organizationName}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Invited as <span className="text-foreground font-medium">{data.email}</span> · role <span className="text-foreground font-medium">{data.role}</span>
              </p>
              {isAuthenticated() ? (
                <Button className="mt-6 w-full" disabled={accept.isPending}
                  onClick={() => accept.mutate({ token })}>
                  {accept.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Accept invitation
                </Button>
              ) : (
                <div className="mt-6 space-y-2">
                  <p className="text-xs text-muted-foreground">Sign in or create an account with {data.email} to accept.</p>
                  <Button asChild className="w-full"><Link href={`/signup`}>Create account</Link></Button>
                  <Button asChild variant="outline" className="w-full"><Link href="/login">Sign in</Link></Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
