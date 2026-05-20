import type { Organization } from "@workspace/api-client-react";

type OrgLike = Partial<Pick<Organization, "modules" | "limits">> | null | undefined;

export type ModuleKey =
  | "sales"
  | "leads"
  | "inventory"
  | "purchase"
  | "marketing"
  | "hr"
  | "accounting"
  | "social";

export const MODULE_LABELS: Record<ModuleKey, string> = {
  sales: "Sales & Quotations",
  leads: "Leads & CRM",
  inventory: "Inventory",
  purchase: "Purchase",
  marketing: "Marketing",
  hr: "HR & Payroll",
  accounting: "Accounting",
  social: "Social Media",
};

export const MODULE_DESCRIPTIONS: Record<ModuleKey, string> = {
  sales: "Quotations, clients, products, add-ons",
  leads: "Capture and nurture leads",
  inventory: "Stock and warehouse management",
  purchase: "Vendor orders and bills",
  marketing: "Email, SMS, campaigns",
  hr: "Employees, attendance, payroll",
  accounting: "Books, taxes, GST",
  social: "Social posts and scheduling",
};

export const DEFAULT_MODULES: Record<ModuleKey, boolean> = {
  sales: true,
  leads: true,
  inventory: false,
  purchase: false,
  marketing: false,
  hr: false,
  accounting: false,
  social: false,
};

export function getModules(org: OrgLike): Record<ModuleKey, boolean> {
  const fromOrg = (org?.modules as Record<string, boolean> | undefined) ?? {};
  return { ...DEFAULT_MODULES, ...fromOrg } as Record<ModuleKey, boolean>;
}

export function isModuleOn(org: OrgLike, key: ModuleKey) {
  return getModules(org)[key] === true;
}

export interface OrgLimits {
  members: number;
  leadsPerMonth: number;
  emailsPerMonth: number;
  storageMB: number;
}

export const DEFAULT_LIMITS: OrgLimits = {
  members: 3,
  leadsPerMonth: 50,
  emailsPerMonth: 100,
  storageMB: 100,
};

export function getLimits(org: OrgLike): OrgLimits {
  const fromOrg = (org?.limits as Partial<OrgLimits> | undefined) ?? {};
  return { ...DEFAULT_LIMITS, ...fromOrg };
}
