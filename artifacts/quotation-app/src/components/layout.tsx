import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { clearAuth, getCurrentOrg, getCurrentUser, getCurrentRole, setAuthToken, setCurrentOrg, setCurrentRole } from "@/lib/auth";
import { getModules, type ModuleKey } from "@/lib/modules";
import {
  LayoutDashboard, FileText, Users, Package, Puzzle,
  BarChart3, ShieldCheck, LogOut, Sparkles, Menu, X, Settings,
  UserPlus, Building2, Check, ChevronsUpDown,
  TrendingUp, CheckSquare, ShoppingCart, Receipt, Megaphone,
  Boxes, Warehouse, Truck, ClipboardList, FileBox,
  Share2, Mail, Ban,
  UserCircle2, CalendarCheck, Wallet, BookOpen, Scale, Plane,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetMe, useSwitchOrg, getCurrentOrganization } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  module?: ModuleKey;
}

const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: TrendingUp, module: "leads" },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/quotations", label: "Quotations", icon: FileText, module: "sales" },
  { href: "/sales-orders", label: "Sales Orders", icon: ShoppingCart, module: "sales" },
  { href: "/invoices", label: "Invoices", icon: Receipt, module: "sales" },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone, module: "marketing" },
  { href: "/marketing/drips", label: "Drip sequences", icon: Mail, module: "marketing" },
  { href: "/marketing/suppressions", label: "Suppressions", icon: Ban, module: "marketing" },
  { href: "/social", label: "Social", icon: Share2, module: "social" },
  { href: "/clients", label: "Clients", icon: Users, module: "sales" },
  { href: "/products", label: "Products", icon: Package, module: "sales" },
  { href: "/addons", label: "Add-ons", icon: Puzzle, module: "sales" },
  { href: "/items", label: "Items", icon: Boxes, module: "inventory" },
  { href: "/warehouses", label: "Warehouses", icon: Warehouse, module: "inventory" },
  { href: "/inventory", label: "Stock Ledger", icon: ClipboardList, module: "inventory" },
  { href: "/vendors", label: "Vendors", icon: Truck, module: "purchase" },
  { href: "/purchase-orders", label: "Purchase Orders", icon: FileBox, module: "purchase" },
  { href: "/vendor-bills", label: "Vendor Bills", icon: Receipt, module: "purchase" },
  { href: "/employees", label: "Employees", icon: UserCircle2, module: "hr" },
  { href: "/attendance", label: "Attendance", icon: CalendarCheck, module: "hr" },
  { href: "/leave-requests", label: "Leave requests", icon: Plane, module: "hr" },
  { href: "/payroll", label: "Payroll", icon: Wallet, module: "hr" },
  { href: "/expenses", label: "Expenses", icon: Receipt, module: "accounting" },
  { href: "/accounting/ledger", label: "Ledger", icon: BookOpen, module: "accounting" },
  { href: "/accounting/pnl", label: "P&L", icon: TrendingUp, module: "accounting" },
  { href: "/accounting/gst", label: "GST reports", icon: FileText, module: "accounting" },
  { href: "/accounting/vendor-ageing", label: "Vendor ageing", icon: Truck, module: "accounting" },
  { href: "/accounting/balance-sheet", label: "Balance sheet", icon: Scale, module: "accounting" },
  { href: "/reports", label: "Reports", icon: BarChart3, module: "sales" },
  { href: "/audit-logs", label: "Audit Logs", icon: ShieldCheck },
];

const bottomNavItems: NavItem[] = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/quotations", label: "Quotes", icon: FileText, module: "sales" },
  { href: "/clients", label: "Clients", icon: Users, module: "sales" },
  { href: "/settings/organization", label: "Settings", icon: Settings },
];

function NavLink({ href, label, icon: Icon, onClick }: { href: string; label: string; icon: NavItem["icon"]; onClick?: () => void }) {
  const [location] = useLocation();
  const active = location === href || (href !== "/" && location.startsWith(href));
  return (
    <Link href={href} onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all min-h-[44px]",
        active
          ? "bg-primary/15 text-primary border border-primary/30"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
      )}>
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [, navigate] = useLocation();
  const [location] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [orgVersion, setOrgVersion] = useState(0);

  function handleLogout() {
    clearAuth();
    navigate("/login");
  }

  const user = getCurrentUser();
  const org = getCurrentOrg();
  const role = getCurrentRole();
  const modules = getModules(org);

  const { data: me } = useGetMe();
  const memberships = me?.organizations ?? [];

  useEffect(() => {
    if (org && (org as { modules?: unknown }).modules) return;
    let cancelled = false;
    getCurrentOrganization()
      .then((full) => {
        if (cancelled) return;
        setCurrentOrg(full);
        setOrgVersion((v) => v + 1);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [org?.id]);

  const switchMutation = useSwitchOrg({
    mutation: {
      async onSuccess(data) {
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
        toast({ title: "Switched workspace" });
        navigate("/");
      },
      onError() {
        toast({ title: "Could not switch workspace", variant: "destructive" });
      },
    },
  });

  void orgVersion;

  const visibleNav = navItems.filter((i) => !i.module || modules[i.module]);
  const visibleBottom = bottomNavItems.filter((i) => !i.module || modules[i.module]);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-30 w-64 flex flex-col bg-sidebar border-r border-sidebar-border transition-transform duration-200 lg:relative lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center gap-2 px-3 h-14 border-b border-sidebar-border shrink-0">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex-1 min-w-0 flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-sidebar-accent text-left">
                <div className="leading-tight flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{org?.name ?? "Workspace"}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{org?.plan ?? "free"} plan</p>
                </div>
                <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel className="text-xs">Workspaces</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {memberships.map((m) => (
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
              <DropdownMenuItem onClick={() => navigate("/onboarding")}>
                <Building2 className="h-4 w-4 mr-2" /> Create workspace
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button className="lg:hidden text-muted-foreground hover:text-foreground shrink-0" onClick={() => setSidebarOpen(false)}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {visibleNav.map((item) => (
            <NavLink key={item.href} {...item} onClick={() => setSidebarOpen(false)} />
          ))}
          <div className="pt-3 mt-3 border-t border-sidebar-border space-y-1">
            <p className="px-3 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Settings</p>
            <NavLink href="/settings/organization" label="Organization" icon={Building2} onClick={() => setSidebarOpen(false)} />
            {(role === "owner" || role === "admin") && (
              <NavLink href="/settings/members" label="Members" icon={UserPlus} onClick={() => setSidebarOpen(false)} />
            )}
            {role === "owner" && (
              <NavLink href="/settings/modules" label="Modules" icon={Puzzle} onClick={() => setSidebarOpen(false)} />
            )}
            {(role === "owner" || role === "admin") && (
              <NavLink href="/settings/integrations" label="Integrations" icon={Sparkles} onClick={() => setSidebarOpen(false)} />
            )}
          </div>
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-sidebar-accent transition-colors text-left min-h-[44px]">
                <div className="h-7 w-7 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                  {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{user?.name ?? "User"}</p>
                  <p className="text-[10px] text-muted-foreground capitalize truncate">{role ?? ""}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-56">
              <DropdownMenuLabel className="text-xs">{user?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/settings/organization")}>
                <Settings className="h-4 w-4 mr-2" /> Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                <LogOut className="h-4 w-4 mr-2" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 border-b border-border flex items-center gap-3 px-4 lg:hidden shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="text-muted-foreground hover:text-foreground p-2 -ml-2">
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

        {/* Mobile bottom nav */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-sidebar border-t border-sidebar-border flex items-center justify-around z-10">
          {visibleBottom.map((item) => {
            const active = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[10px]",
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
  );
}
