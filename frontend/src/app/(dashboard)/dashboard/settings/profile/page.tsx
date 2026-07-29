"use client";

import { useGetMe } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export default function ProfilePage() {
  const { data: me, isLoading, error } = useGetMe();

  if (isLoading) return <div className="p-6 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Loading...</div>;
  if (error || !me) return <div className="p-6 text-destructive">Failed to load profile.</div>;

  return (
    <div className="p-6 max-w-lg space-y-6">
      <h1 className="text-2xl font-bold">Profile</h1>
      <Card>
        <CardHeader><CardTitle>User Details</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1"><Label>Name</Label><p className="text-sm">{me.user.name}</p></div>
          <div className="space-y-1"><Label>Email</Label><p className="text-sm">{me.user.email}</p></div>
          <div className="space-y-1"><Label>Phone</Label><p className="text-sm">{me.user.phone ?? "—"}</p></div>
        </CardContent>
      </Card>
    </div>
  );
}
