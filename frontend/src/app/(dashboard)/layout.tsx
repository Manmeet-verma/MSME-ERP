"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect, forwardRef, type ReactNode } from "react";
import Link from "next/link";
import { clearAuth, getCurrentOrg, getCurrentUser, getCurrentRole, setCurrentOrg, setCurrentRole, setAuthToken } from "@/lib/auth";
import { getModules, type ModuleKey } from "@/lib/modules";
import {
  LayoutDashboard, FileText, Users, Package, Puzzle,
  BarChart3, ShieldCheck, LogOut, Sparkles, Menu, X, Settings,
  UserPlus, Building2, Check, ChevronsUpDown,
  TrendingUp, CheckSquare, ShoppingCart, Receipt, Megaphone,
  Boxes, Warehouse, Truck, ClipboardList, FileBox,
  Share2, Mail, Ban,
  UserCircle2, CalendarCheck, Wallet, BookOpen, Scale, Plane, Loader2,
  ClipboardCheck,
  ExternalLink,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetMe, useSwitchOrg, getCurrentOrganization } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  module?: ModuleKey;
  external?: boolean;
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/sales-dashboard", label: "Sales Dashboard", icon: ClipboardCheck },
  { href: "/dashboard/clients", label: "Clients", icon: Users, module: "sales" },
  { href: "/dashboard/products", label: "Products", icon: Package, module: "sales" },
  { href: "/dashboard/leads", label: "Leads", icon: TrendingUp, module: "leads" },
  { href: "/dashboard/quotations", label: "Quotations", icon: FileText, module: "sales" },
  { href: "/dashboard/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/dashboard/sales-orders", label: "Sales Orders", icon: ShoppingCart, module: "sales" },
  { href: "/dashboard/invoices", label: "Invoices", icon: Receipt, module: "sales" },
  { href: "/dashboard/addons", label: "Add-ons", icon: Puzzle, module: "sales" },
  { href: "/dashboard/items", label: "Items", icon: Boxes, module: "inventory" },
  { href: "/dashboard/warehouses", label: "Warehouses", icon: Warehouse, module: "inventory" },
  { href: "/dashboard/inventory", label: "Stock Ledger", icon: ClipboardList, module: "inventory" },
  { href: "/dashboard/vendors", label: "Vendors", icon: Truck, module: "purchase" },
  { href: "/dashboard/purchase-orders", label: "Purchase Orders", icon: FileBox, module: "purchase" },
  { href: "/dashboard/vendor-bills", label: "Vendor Bills", icon: Receipt, module: "purchase" },
  { href: "/dashboard/employees", label: "Employees", icon: UserCircle2, module: "hr" },
  { href: "/dashboard/attendance", label: "Attendance", icon: CalendarCheck, module: "hr" },
  { href: "/dashboard/leave-requests", label: "Leave requests", icon: Plane, module: "hr" },
  { href: "/dashboard/payroll", label: "Payroll", icon: Wallet, module: "hr" },
  { href: "/dashboard/expenses", label: "Expenses", icon: Receipt, module: "accounting" },
  { href: "/dashboard/campaigns", label: "Campaigns", icon: Megaphone, module: "marketing" },
  { href: "/dashboard/marketing/drips", label: "Drip sequences", icon: Mail, module: "marketing" },
  { href: "/dashboard/marketing/suppressions", label: "Suppressions", icon: Ban, module: "marketing" },
  { href: "/dashboard/social", label: "Social", icon: Share2, module: "social" },
  { href: "/dashboard/accounting/ledger", label: "Ledger", icon: BookOpen, module: "accounting" },
  { href: "/dashboard/accounting/pnl", label: "P&L", icon: TrendingUp, module: "accounting" },
  { href: "/dashboard/accounting/gst", label: "GST reports", icon: FileText, module: "accounting" },
  { href: "/dashboard/accounting/vendor-ageing", label: "Vendor ageing", icon: Truck, module: "accounting" },
  { href: "/dashboard/accounting/balance-sheet", label: "Balance sheet", icon: Scale, module: "accounting" },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3, module: "sales" },
  { href: "/dashboard/audit-logs", label: "Audit Logs", icon: ShieldCheck },
  { href: "http://expense-manage-alpha.vercel.app", label: "Expense Manager", icon: ExternalLink, external: true },
  { href: "https://gate-keeper-ashy.vercel.app", label: "Gate Keeper", icon: ExternalLink, external: true },
  { href: "https://build-career-virid.vercel.app", label: "Build Career", icon: ExternalLink, external: true },
];

const bottomNavItems: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/dashboard/quotations", label: "Quotes", icon: FileText, module: "sales" },
  { href: "/dashboard/clients", label: "Clients", icon: Users, module: "sales" },
  { href: "/dashboard/settings/organization", label: "Settings", icon: Settings },
];

const NavLink = forwardRef<HTMLAnchorElement, { href: string; label: string; icon: NavItem["icon"]; external?: boolean; onClick?: () => void }>(
  function NavLink({ href, label, icon: Icon, external, onClick }, ref) {
    const pathname = usePathname();
    const active = !external && (pathname === href || (href !== "/dashboard" && pathname.startsWith(href)));
    const Comp = external ? "a" : Link;
    const extraProps = external ? { target: "_blank", rel: "noopener noreferrer" } : {};
    return (
      <Comp ref={ref} href={href} onClick={onClick} {...extraProps}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all min-h-[44px]",
          active
            ? "bg-primary/15 text-primary border border-primary/30"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
        )}>
        <Icon className="h-4 w-4 shrink-0" />
        {label}
      </Comp>
    );
  },
);

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [org, setOrg] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [orgVersion, setOrgVersion] = useState(0);

  useEffect(() => {
    setHydrated(true);
    if (!getCurrentUser()) {
      router.replace("/login");
      return;
    }
    if (!getCurrentOrg()) {
      router.replace("/onboarding");
      return;
    }
    refreshState();
  }, []);

  function refreshState() {
    setUser(getCurrentUser());
    setOrg(getCurrentOrg());
    setRole(getCurrentRole());
  }

  useEffect(() => {
    if (!org || (org as any).modules) return;
    let cancelled = false;
    getCurrentOrganization()
      .then((full: any) => {
        if (cancelled) return;
        setCurrentOrg(full);
        setOrgVersion((v) => v + 1);
        refreshState();
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [org?.id]);

  const { data: me } = useGetMe();
  const memberships = Array.isArray(me?.organizations) ? me.organizations : [];

  const switchMutation = useSwitchOrg({
    mutation: {
      async onSuccess(data: any) {
        setAuthToken(data.token);
        setCurrentRole(data.role);
        try {
          const full = await getCurrentOrganization();
          setCurrentOrg(full);
        } catch {
          setCurrentOrg(null);
        }
        await queryClient.invalidateQueries();
        setOrgVersion((v) => v + 1);
        refreshState();
        toast({ title: "Switched workspace" });
        router.push("/dashboard");
      },
      onError() {
        toast({ title: "Could not switch workspace", variant: "destructive" });
      },
    },
  });

  void orgVersion;

  const modules = getModules(org);
  const visibleNav = navItems.filter((i) => !i.module || modules[i.module]);
  const visibleBottom = bottomNavItems.filter((i) => !i.module || modules[i.module]);

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-background overflow-hidden">
        {sidebarOpen && (
          <div className="fixed inset-0 z-20 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        <aside className={cn(
          "fixed inset-y-0 left-0 z-30 w-64 flex flex-col bg-sidebar border-r border-sidebar-border transition-transform duration-200 lg:relative lg:translate-x-0",
          collapsed && "w-16",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}>
          {/* Logo + Workspace Switcher */}
          <div className="flex items-center gap-2 px-3 h-14 border-b border-sidebar-border shrink-0">
            {!collapsed && (
              <>
                <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex-1 min-w-0 flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-sidebar-accent text-left">
                      <div className="leading-tight flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{org?.name ?? "Workspace"}</p>
                        <p className="text-xs text-muted-foreground capitalize">{org?.plan ?? "free"} plan</p>
                      </div>
                      <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    <DropdownMenuLabel className="text-xs">Workspaces</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {memberships.map((m: any) => (
                      <DropdownMenuItem
                        key={m.id}
                        disabled={switchMutation.isPending}
                        onClick={() => {
                          if (m.id === org?.id) return;
                          switchMutation.mutate({ data: { organizationId: m.id } });
                        }}
                      >
                        <span className="flex-1 truncate">{m.name}</span>
                        {m.id === org?.id && <Check className="h-3.5 w-3.5 text-primary ml-2" />}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push("/onboarding")}>
                      <Building2 className="h-4 w-4 mr-2" /> Create workspace
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
            {collapsed && (
              <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center shrink-0 mx-auto">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
            )}
            <button className="lg:hidden text-muted-foreground hover:text-foreground shrink-0 p-2 -mr-2 min-w-[44px] min-h-[44px] flex items-center justify-center" onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {visibleNav.map((item) => (
              <Tooltip key={item.href} delayDuration={0}>
                <TooltipTrigger asChild>
                  <NavLink
                    href={item.href}
                    label={collapsed ? "" : item.label}
                    icon={item.icon}
                    external={item.external}
                    onClick={() => setSidebarOpen(false)}
                  />
                </TooltipTrigger>
                {collapsed && <TooltipContent side="right"><p>{item.label}</p></TooltipContent>}
              </Tooltip>
            ))}
            <div className="pt-3 mt-3 border-t border-sidebar-border space-y-1">
              {!collapsed && (
                <p className="px-3 pb-1 text-xs uppercase tracking-wider text-muted-foreground">Settings</p>
              )}
              <NavLink href="/dashboard/settings/organization" label={collapsed ? "" : "Organization"} icon={Building2} onClick={() => setSidebarOpen(false)} />
              <NavLink href="/dashboard/settings/members" label={collapsed ? "" : "Members"} icon={UserPlus} onClick={() => setSidebarOpen(false)} />
              <NavLink href="/dashboard/settings/modules" label={collapsed ? "" : "Modules"} icon={Puzzle} onClick={() => setSidebarOpen(false)} />
              <NavLink href="/dashboard/settings/integrations" label={collapsed ? "" : "Integrations"} icon={Sparkles} onClick={() => setSidebarOpen(false)} />
            </div>
          </nav>

          {/* User Menu */}
          <div className="p-3 border-t border-sidebar-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-sidebar-accent transition-colors text-left min-h-[44px]">
                  <div className="h-7 w-7 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
                  </div>
                  {!collapsed && (
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{user?.name ?? "User"}</p>
                      <p className="text-xs text-muted-foreground capitalize truncate">{role ?? ""}</p>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuLabel className="text-xs">{user?.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/dashboard/settings/organization")}>
                  <Settings className="h-4 w-4 mr-2" /> Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { clearAuth(); router.replace("/login"); }} className="text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4 mr-2" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Mobile Header */}
          <header className="h-14 border-b border-border flex items-center gap-3 px-4 lg:hidden shrink-0">
            <button onClick={() => setSidebarOpen(true)} className="text-muted-foreground hover:text-foreground p-2 -ml-2 min-w-[44px] min-h-[44px] flex items-center justify-center">
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center shrink-0">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-sm font-bold truncate">{org?.name ?? "Workspace"}</span>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
            {children}
          </main>

          {/* Mobile Bottom Nav */}
          <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-sidebar border-t border-sidebar-border flex items-center justify-around z-10">
            {visibleBottom.map((item) => {
              const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[11px]",
                    active ? "text-primary" : "text-muted-foreground"
                  )}>
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </TooltipProvider>
  );
}
