import { useEffect, useState } from "react";
import {
  useGetCurrentOrganization, useUpdateOrganizationModules,
  getGetCurrentOrganizationQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { setCurrentOrg, getCurrentRole } from "@/lib/auth";
import { getModules, MODULE_LABELS, MODULE_DESCRIPTIONS, type ModuleKey, DEFAULT_MODULES } from "@/lib/modules";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Puzzle } from "lucide-react";

export default function ModulesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const role = getCurrentRole();
  const { data: org } = useGetCurrentOrganization();
  const [modules, setModules] = useState<Record<ModuleKey, boolean>>(DEFAULT_MODULES);

  useEffect(() => {
    if (org) {
      setCurrentOrg(org);
      setModules(getModules(org));
    }
  }, [org]);

  const update = useUpdateOrganizationModules({
    mutation: {
      onSuccess(data) {
        setCurrentOrg(data);
        setModules(getModules(data));
        queryClient.invalidateQueries({ queryKey: getGetCurrentOrganizationQueryKey() });
        toast({ title: "Modules updated" });
      },
      onError() {
        toast({ title: "Update failed", variant: "destructive" });
      },
    },
  });

  function toggle(key: ModuleKey, value: boolean) {
    if (role !== "owner") return;
    const next = { ...modules, [key]: value };
    setModules(next);
    update.mutate({ data: next });
  }

  const keys = Object.keys(MODULE_LABELS) as ModuleKey[];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
          <Puzzle className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Modules</h1>
          <p className="text-sm text-muted-foreground">Turn features on or off for your workspace</p>
        </div>
      </div>

      {role !== "owner" && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4 text-xs text-amber-500">
          Only the workspace Owner can change module settings.
        </div>
      )}

      <div className="bg-card border border-card-border rounded-xl divide-y divide-border">
        {keys.map((key) => (
          <div key={key} className="p-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-medium">{MODULE_LABELS[key]}</p>
              <p className="text-xs text-muted-foreground">{MODULE_DESCRIPTIONS[key]}</p>
            </div>
            <Switch checked={modules[key]} disabled={role !== "owner"} onCheckedChange={(v) => toggle(key, v)} />
          </div>
        ))}
      </div>
    </div>
  );
}
