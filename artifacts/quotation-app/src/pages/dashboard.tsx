import { Link } from "wouter";
import { useGetDashboardSummary, useListMembers } from "@workspace/api-client-react";
import { getCurrentOrg } from "@/lib/auth";
import { getModules, getLimits, MODULE_LABELS, MODULE_DESCRIPTIONS, type ModuleKey } from "@/lib/modules";
import { formatCurrency } from "@/lib/format";
import {
  FileText, Users, TrendingUp, Megaphone, Boxes, ShoppingCart,
  Briefcase, BookOpen, Share2, ArrowRight, Sparkles
} from "lucide-react";

const MODULE_ICONS: Record<ModuleKey, React.ComponentType<{ className?: string }>> = {
  sales: FileText,
  leads: TrendingUp,
  inventory: Boxes,
  purchase: ShoppingCart,
  marketing: Megaphone,
  hr: Briefcase,
  accounting: BookOpen,
  social: Share2,
};

const MODULE_LINKS: Partial<Record<ModuleKey, string>> = {
  sales: "/quotations",
};

interface ModuleCardProps {
  moduleKey: ModuleKey;
  enabled: boolean;
  primary?: string;
  secondary?: string;
}

function ModuleCard({ moduleKey, enabled, primary, secondary }: ModuleCardProps) {
  const Icon = MODULE_ICONS[moduleKey];
  const link = MODULE_LINKS[moduleKey];
  const card = (
    <div className={`bg-card border border-card-border rounded-xl p-5 h-full transition-all ${enabled ? "hover:border-primary/40 hover:shadow-lg" : "opacity-60"}`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${enabled ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
          <Icon className="h-5 w-5" />
        </div>
        {!enabled && <span className="text-[10px] uppercase tracking-wider text-muted-foreground border border-border rounded px-1.5 py-0.5">Off</span>}
      </div>
      <h3 className="font-semibold text-foreground">{MODULE_LABELS[moduleKey]}</h3>
      <p className="text-xs text-muted-foreground mt-0.5">{MODULE_DESCRIPTIONS[moduleKey]}</p>
      {enabled ? (
        <div className="mt-4 pt-3 border-t border-border">
          {primary ? (
            <>
              <p className="text-xl font-bold text-foreground">{primary}</p>
              {secondary && <p className="text-[11px] text-muted-foreground">{secondary}</p>}
            </>
          ) : (
            <p className="text-xs text-muted-foreground">No data yet</p>
          )}
          {link && (
            <div className="text-xs text-primary mt-3 flex items-center gap-1">
              Open <ArrowRight className="h-3 w-3" />
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground">Enable in Settings → Modules</p>
        </div>
      )}
    </div>
  );
  if (link && enabled) return <Link href={link}>{card}</Link>;
  return card;
}

export default function DashboardPage() {
  const org = getCurrentOrg();
  const modules = getModules(org);
  const limits = getLimits(org);
  const { data: summary } = useGetDashboardSummary();
  const { data: members } = useListMembers();

  const moduleOrder: ModuleKey[] = ["sales", "leads", "inventory", "purchase", "marketing", "social", "hr", "accounting"];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">Welcome, {org?.name}</h1>
        </div>
        <p className="text-sm text-muted-foreground">Your workspace overview</p>
      </div>

      {/* Usage badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-card border border-card-border rounded-lg p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Team</p>
          <p className="text-lg font-bold mt-1">{members?.length ?? 0}<span className="text-sm text-muted-foreground"> / {limits.members}</span></p>
        </div>
        <div className="bg-card border border-card-border rounded-lg p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Leads / mo</p>
          <p className="text-lg font-bold mt-1">0<span className="text-sm text-muted-foreground"> / {limits.leadsPerMonth}</span></p>
        </div>
        <div className="bg-card border border-card-border rounded-lg p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Emails / mo</p>
          <p className="text-lg font-bold mt-1">0<span className="text-sm text-muted-foreground"> / {limits.emailsPerMonth}</span></p>
        </div>
        <div className="bg-card border border-card-border rounded-lg p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Storage</p>
          <p className="text-lg font-bold mt-1">0<span className="text-sm text-muted-foreground"> / {limits.storageMB} MB</span></p>
        </div>
      </div>

      {/* Module cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {moduleOrder.map((key) => {
          let primary: string | undefined;
          let secondary: string | undefined;
          if (key === "sales" && modules.sales && summary) {
            primary = formatCurrency(summary.approvedValue ?? 0);
            secondary = `${summary.totalQuotations ?? 0} quotations`;
          }
          return <ModuleCard key={key} moduleKey={key} enabled={modules[key]} primary={primary} secondary={secondary} />;
        })}
      </div>
    </div>
  );
}
