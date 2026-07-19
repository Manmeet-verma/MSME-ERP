import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import SignupPage from "@/pages/signup";
import OnboardingPage from "@/pages/onboarding";
import AcceptInvitePage from "@/pages/accept-invite";
import DashboardPage from "@/pages/dashboard";
import QuotationsPage from "@/pages/quotations";
import NewQuotationPage from "@/pages/quotations/new";
import QuotationDetailPage from "@/pages/quotations/detail";
import ClientsPage from "@/pages/clients";
import ProductsPage from "@/pages/products";
import AddonsPage from "@/pages/addons";
import ReportsPage from "@/pages/reports";
import AuditLogsPage from "@/pages/audit-logs";
import OrganizationSettingsPage from "@/pages/settings/organization";
import MembersPage from "@/pages/settings/members";
import ModulesPage from "@/pages/settings/modules";
import IntegrationsSettingsPage from "@/pages/settings/integrations";
import LeadsPage from "@/pages/leads";
import LeadDetailPage from "@/pages/leads/detail";
import TasksPage from "@/pages/tasks";
import SalesOrdersPage from "@/pages/sales-orders";
import SalesOrderDetailPage from "@/pages/sales-orders/detail";
import InvoicesPage from "@/pages/invoices";
import InvoiceDetailPage from "@/pages/invoices/detail";
import CampaignsPage from "@/pages/campaigns";
import ItemsPage from "@/pages/items";
import WarehousesPage from "@/pages/warehouses";
import VendorsPage from "@/pages/vendors";
import PurchaseOrdersPage from "@/pages/purchase-orders";
import PurchaseOrderDetailPage from "@/pages/purchase-orders/detail";
import VendorBillsPage from "@/pages/vendor-bills";
import VendorBillDetailPage from "@/pages/vendor-bills/detail";
import InventoryPage from "@/pages/inventory";
import SocialPage from "@/pages/social";
import DripsPage from "@/pages/marketing/drips";
import SuppressionsPage from "@/pages/marketing/suppressions";
import UnsubscribePage from "@/pages/unsubscribe";
import EmployeesPage from "@/pages/employees";
import AttendancePage from "@/pages/attendance";
import LeaveRequestsPage from "@/pages/leave-requests";
import PayrollPage from "@/pages/payroll";
import PayrollDetailPage from "@/pages/payroll/detail";
import ExpensesPage from "@/pages/expenses";
import LedgerPage from "@/pages/accounting/ledger";
import PnlPage from "@/pages/accounting/pnl";
import GstPage from "@/pages/accounting/gst";
import VendorAgeingPage from "@/pages/accounting/vendor-ageing";
import BalanceSheetPage from "@/pages/accounting/balance-sheet";
import { Layout } from "@/components/layout";
import { ErrorBoundary } from "@/components/error-boundary";
import { isAuthenticated, hasOrg } from "@/lib/auth";
import "@/lib/auth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 60_000, gcTime: 300_000, refetchOnWindowFocus: false },
  },
});

function Guard({ component: Component }: { component: React.ComponentType }) {
  if (!isAuthenticated()) return <Redirect to="/login" />;
  if (!hasOrg()) return <Redirect to="/onboarding" />;
  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/signup" component={SignupPage} />
      <Route path="/onboarding" component={OnboardingPage} />
      <Route path="/accept-invite/:token" component={AcceptInvitePage} />
      <Route path="/unsubscribe/:token" component={UnsubscribePage} />
      <Route path="/" component={() => <Guard component={DashboardPage} />} />
      <Route path="/quotations" component={() => <Guard component={QuotationsPage} />} />
      <Route path="/quotations/new" component={() => <Guard component={NewQuotationPage} />} />
      <Route path="/quotations/:id" component={() => <Guard component={QuotationDetailPage} />} />
      <Route path="/clients" component={() => <Guard component={ClientsPage} />} />
      <Route path="/products" component={() => <Guard component={ProductsPage} />} />
      <Route path="/addons" component={() => <Guard component={AddonsPage} />} />
      <Route path="/reports" component={() => <Guard component={ReportsPage} />} />
      <Route path="/audit-logs" component={() => <Guard component={AuditLogsPage} />} />
      <Route path="/settings/organization" component={() => <Guard component={OrganizationSettingsPage} />} />
      <Route path="/settings/members" component={() => <Guard component={MembersPage} />} />
      <Route path="/settings/modules" component={() => <Guard component={ModulesPage} />} />
      <Route path="/settings/integrations" component={() => <Guard component={IntegrationsSettingsPage} />} />
      <Route path="/leads" component={() => <Guard component={LeadsPage} />} />
      <Route path="/leads/:id" component={() => <Guard component={LeadDetailPage} />} />
      <Route path="/tasks" component={() => <Guard component={TasksPage} />} />
      <Route path="/sales-orders" component={() => <Guard component={SalesOrdersPage} />} />
      <Route path="/sales-orders/:id" component={() => <Guard component={SalesOrderDetailPage} />} />
      <Route path="/invoices" component={() => <Guard component={InvoicesPage} />} />
      <Route path="/invoices/:id" component={() => <Guard component={InvoiceDetailPage} />} />
      <Route path="/campaigns" component={() => <Guard component={CampaignsPage} />} />
      <Route path="/items" component={() => <Guard component={ItemsPage} />} />
      <Route path="/warehouses" component={() => <Guard component={WarehousesPage} />} />
      <Route path="/vendors" component={() => <Guard component={VendorsPage} />} />
      <Route path="/purchase-orders" component={() => <Guard component={PurchaseOrdersPage} />} />
      <Route path="/purchase-orders/:id" component={() => <Guard component={PurchaseOrderDetailPage} />} />
      <Route path="/vendor-bills" component={() => <Guard component={VendorBillsPage} />} />
      <Route path="/vendor-bills/:id" component={() => <Guard component={VendorBillDetailPage} />} />
      <Route path="/inventory" component={() => <Guard component={InventoryPage} />} />
      <Route path="/social" component={() => <Guard component={SocialPage} />} />
      <Route path="/marketing/drips" component={() => <Guard component={DripsPage} />} />
      <Route path="/marketing/suppressions" component={() => <Guard component={SuppressionsPage} />} />
      <Route path="/employees" component={() => <Guard component={EmployeesPage} />} />
      <Route path="/attendance" component={() => <Guard component={AttendancePage} />} />
      <Route path="/leave-requests" component={() => <Guard component={LeaveRequestsPage} />} />
      <Route path="/payroll" component={() => <Guard component={PayrollPage} />} />
      <Route path="/payroll/:id" component={() => <Guard component={PayrollDetailPage} />} />
      <Route path="/expenses" component={() => <Guard component={ExpensesPage} />} />
      <Route path="/accounting/ledger" component={() => <Guard component={LedgerPage} />} />
      <Route path="/accounting/pnl" component={() => <Guard component={PnlPage} />} />
      <Route path="/accounting/gst" component={() => <Guard component={GstPage} />} />
      <Route path="/accounting/vendor-ageing" component={() => <Guard component={VendorAgeingPage} />} />
      <Route path="/accounting/balance-sheet" component={() => <Guard component={BalanceSheetPage} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
