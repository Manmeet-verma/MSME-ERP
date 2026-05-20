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
import { Layout } from "@/components/layout";
import { isAuthenticated, hasOrg } from "@/lib/auth";
import "@/lib/auth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
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
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
