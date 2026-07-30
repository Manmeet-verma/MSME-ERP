"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  LayoutDashboard, Users, TrendingUp, FileText, ShoppingCart,
  Receipt, Package, Boxes, Warehouse, Truck, Briefcase,
  CalendarCheck, Wallet, Megaphone, Share2, BookOpen, BarChart3,
  Settings, ChevronRight, ChevronLeft, BookOpenCheck, Sparkles,
  CheckCircle2, Lightbulb, ArrowRight,
} from "lucide-react";

interface Step {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  highlight: string;
  description: string;
  tips: string[];
  link?: string;
}

const STEPS: Step[] = [
  {
    id: "dashboard",
    icon: LayoutDashboard,
    title: "Dashboard",
    highlight: "Your command center",
    description:
      "The Dashboard gives you a real-time overview of your entire business. See KPIs, AI insights, module stats, and low-stock alerts at a glance.",
    tips: [
      "View live KPIs: leads, tasks, revenue, unpaid invoices",
      "Read AI-powered daily insights and suggestions",
      "Use the 'Ask anything' search bar for natural language queries",
      "Quickly access any module from the module cards",
      "Check low-stock items and create purchase orders directly",
    ],
  },
  {
    id: "clients",
    icon: Users,
    title: "Clients",
    highlight: "Manage your customer base",
    description:
      "Keep all client information in one place — name, company, email, phone, GST number, and address. Search and filter clients instantly.",
    tips: [
      "Click 'Add Client' to create a new client record",
      "Search clients by name, company, or email",
      "Edit or delete clients with the buttons on each card",
      "Client data auto-fills when creating quotations and invoices",
      "Keep GST numbers updated for tax-compliant invoicing",
    ],
    link: "/dashboard/clients",
  },
  {
    id: "leads",
    icon: TrendingUp,
    title: "Leads",
    highlight: "Capture and convert opportunities",
    description:
      "Track every potential customer from first contact to conversion. Score leads, call them via Twilio, send AI-drafted emails, and convert them into clients with a single click.",
    tips: [
      "Create leads manually or sync from IndiaMart",
      "Filter by priority (Hot / Warm / Cold) and status",
      "Use 'Re-score' to let AI re-evaluate lead quality",
      "Click 'Call' to initiate a Twilio-powered click-to-call",
      "Click 'Email' to draft and send AI-generated emails",
      "Convert a lead to a client + quotation in one step",
    ],
    link: "/dashboard/leads",
  },
  {
    id: "quotations",
    icon: FileText,
    title: "Quotations",
    highlight: "Create, send, and track quotes",
    description:
      "Build professional quotations with line items, dimensions, add-ons, GST, and discounts. Share via WhatsApp, SMS, or QR code.",
    tips: [
      "Click 'New Quotation' to start building a quote",
      "Select existing clients or create new ones on the fly",
      "Add products with width/height dimensions (auto-calculates area)",
      "Attach services and add-ons to the quotation",
      "Share via WhatsApp, SMS, or download a QR code",
      "Track status: Draft → Sent → Approved / Rejected",
      "Print or download as PDF for your records",
    ],
    link: "/dashboard/quotations",
  },
  {
    id: "sales-orders",
    icon: ShoppingCart,
    title: "Sales Orders",
    highlight: "Confirmed orders from approved quotes",
    description:
      "Once a quotation is approved, it becomes a Sales Order. Track order status, fulfillment, and delivery.",
    tips: [
      "Sales orders auto-create from approved quotations",
      "Track order status through the fulfillment pipeline",
      "Link sales orders to inventory for stock deduction",
      "View order details and line items",
    ],
    link: "/dashboard/sales-orders",
  },
  {
    id: "invoices",
    icon: Receipt,
    title: "Invoices",
    highlight: "Generate GST-compliant invoices",
    description:
      "Create tax invoices with automatic CGST/SGST/IGST calculations. Track payments, balances, and overdue amounts.",
    tips: [
      "Invoices auto-calculate CGST, SGST, and IGST",
      "Record payments via UPI, bank transfer, cash, cheque, or card",
      "Track partial payments and outstanding balances",
      "Change invoice status: Draft → Sent → Partial → Paid / Overdue",
      "Print invoices for your records or send to clients",
    ],
    link: "/dashboard/invoices",
  },
  {
    id: "products",
    icon: Package,
    title: "Products",
    highlight: "Your product catalog",
    description:
      "Define products with pricing, dimensions, and unit rates. These auto-populate when creating quotations and invoices.",
    tips: [
      "Add products with name, unit price, and unit of measure",
      "Products appear in the quotation builder dropdown",
      "Set pricing once, reuse across all quotations",
    ],
    link: "/dashboard/products",
  },
  {
    id: "items",
    icon: Boxes,
    title: "Inventory Items",
    highlight: "Track stock levels in real-time",
    description:
      "Manage raw materials and finished goods. Track stock across warehouses, set low-stock thresholds, and monitor movements.",
    tips: [
      "Create items with SKU, unit, cost price, and low-stock threshold",
      "View current stock levels per warehouse",
      "Record stock movements (inward/outward/transfer)",
      "Get alerts when items drop below threshold",
    ],
    link: "/dashboard/items",
  },
  {
    id: "warehouses",
    icon: Warehouse,
    title: "Warehouses",
    highlight: "Multi-location inventory",
    description:
      "Set up warehouses to track inventory across multiple locations. One warehouse is marked as default.",
    tips: [
      "Create warehouses for each physical location",
      "Set one warehouse as default for new stock movements",
      "Transfer stock between warehouses",
    ],
    link: "/dashboard/warehouses",
  },
  {
    id: "inventory",
    icon: Boxes,
    title: "Stock Ledger",
    highlight: "Full audit trail of stock movements",
    description:
      "View every stock movement — inward, outward, and transfers. Filter by item, warehouse, or date range.",
    tips: [
      "Log stock inward when receiving materials",
      "Log stock outward when dispatching orders",
      "Transfer stock between warehouses",
      "Every movement is recorded with a timestamp",
    ],
    link: "/dashboard/inventory",
  },
  {
    id: "vendors",
    icon: Truck,
    title: "Vendors",
    highlight: "Your supplier directory",
    description:
      "Keep vendor details organized. Link vendors to purchase orders and vendor bills.",
    tips: [
      "Add vendors with contact info and GST details",
      "Use vendor info when creating purchase orders",
    ],
    link: "/dashboard/vendors",
  },
  {
    id: "purchase-orders",
    icon: ShoppingCart,
    title: "Purchase Orders",
    highlight: "Order from suppliers",
    description:
      "Create purchase orders to restock inventory. Track order status and receive goods.",
    tips: [
      "Create POs linked to specific inventory items",
      "Track PO status through the fulfillment cycle",
      "Receive goods and auto-update stock levels",
    ],
    link: "/dashboard/purchase-orders",
  },
  {
    id: "employees",
    icon: Briefcase,
    title: "Employees",
    highlight: "Manage your team",
    description:
      "Keep employee records including designation, department, salary, and contact info.",
    tips: [
      "Add employees with role, salary, and join date",
      "Track attendance and leave requests",
      "Run payroll from the payroll module",
    ],
    link: "/dashboard/employees",
  },
  {
    id: "attendance",
    icon: CalendarCheck,
    title: "Attendance",
    highlight: "Daily attendance tracking",
    description:
      "Mark and track employee attendance. View attendance summaries by month.",
    tips: [
      "Mark attendance as Present / Absent / Half-day / Leave",
      "View monthly attendance summary per employee",
    ],
    link: "/dashboard/attendance",
  },
  {
    id: "leave-requests",
    icon: CalendarCheck,
    title: "Leave Requests",
    highlight: "Approve or reject leave",
    description:
      "Employees can request leave. Admins review and approve or reject requests.",
    tips: [
      "Review leave requests with date range and reason",
      "Approve or reject with one click",
      "Approved leaves auto-update attendance",
    ],
    link: "/dashboard/leave-requests",
  },
  {
    id: "payroll",
    icon: Wallet,
    title: "Payroll",
    highlight: "Run monthly payroll",
    description:
      "Generate payslips with salary, deductions, and net pay. Track payroll history.",
    tips: [
      "Run payroll for a specific month",
      "Auto-calculates deductions and net pay",
      "View and download payslips",
    ],
    link: "/dashboard/payroll",
  },
  {
    id: "expenses",
    icon: Receipt,
    title: "Expenses",
    highlight: "Track business spending",
    description:
      "Record and categorize all business expenses. Filter by category, date, or vendor.",
    tips: [
      "Add expenses with amount, category, and date",
      "Categorize expenses for P&L reporting",
      "Attach receipts for record-keeping",
    ],
    link: "/dashboard/expenses",
  },
  {
    id: "accounting",
    icon: BookOpen,
    title: "Accounting",
    highlight: "Financial reports and ledger",
    description:
      "Access general ledger, profit & loss, balance sheet, GST reports, and vendor ageing — all auto-generated from your transactions.",
    tips: [
      "View General Ledger for all journal entries",
      "Check P&L statement for revenue vs expenses",
      "Download GST reports for filing returns",
      "Review vendor ageing to track outstanding payments",
      "View balance sheet for financial health",
    ],
    link: "/dashboard/accounting/ledger",
  },
  {
    id: "campaigns",
    icon: Megaphone,
    title: "Marketing Campaigns",
    highlight: "Run email and SMS campaigns",
    description:
      "Create and manage marketing campaigns. Send bulk emails and track open rates.",
    tips: [
      "Create campaigns with target audience and content",
      "Send bulk emails to client lists",
      "Track delivery and open rates",
    ],
    link: "/dashboard/campaigns",
  },
  {
    id: "social",
    icon: Share2,
    title: "Social Media",
    highlight: "Manage social presence",
    description:
      "Connect and manage social media accounts. Schedule posts and track engagement.",
    tips: [
      "Connect Facebook, Instagram, LinkedIn accounts",
      "Schedule and publish posts across platforms",
      "Track engagement metrics",
    ],
    link: "/dashboard/social",
  },
  {
    id: "reports",
    icon: BarChart3,
    title: "Reports",
    highlight: "Business intelligence",
    description:
      "Generate detailed reports on sales, clients, inventory, and financial performance.",
    tips: [
      "Generate sales reports by period",
      "View client-wise revenue breakdown",
      "Analyze inventory turnover",
    ],
    link: "/dashboard/reports",
  },
  {
    id: "settings",
    icon: Settings,
    title: "Settings",
    highlight: "Customize your workspace",
    description:
      "Manage your organization profile, team members, module toggles, integrations, and billing.",
    tips: [
      "Update organization name, GST, and address",
      "Invite team members and assign roles",
      "Enable/disable modules you don't need",
      "Connect third-party integrations",
      "Manage your subscription plan",
    ],
    link: "/dashboard/settings/organization",
  },
];

export default function TutorialButton() {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const step = STEPS[currentStep];
  const StepIcon = step.icon;
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  function goNext() {
    setCompletedSteps((prev) => new Set(prev).add(currentStep));
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    }
  }

  function goPrev() {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  }

  function handleClose() {
    setOpen(false);
    setTimeout(() => {
      setCurrentStep(0);
      setCompletedSteps(new Set());
    }, 300);
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => setOpen(true)}
      >
        <BookOpenCheck className="h-4 w-4" />
        <span className="hidden sm:inline">How to Use</span>
        <span className="sm:hidden">Guide</span>
      </Button>

      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto sm:rounded-lg p-0">
          {/* Progress bar */}
          <div className="w-full bg-secondary h-1 rounded-t-lg">
            <div
              className="bg-primary h-1 rounded-t-lg transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="p-5 sm:p-6">
            <DialogHeader className="mb-4">
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-primary" />
                MSME Pro Tutorial
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                Step {currentStep + 1} of {STEPS.length} · {completedSteps.size} completed
              </p>
            </DialogHeader>

            {/* Step content */}
            <div className="space-y-4">
              {/* Step header */}
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                  <StepIcon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{step.title}</h3>
                  <p className="text-sm text-primary font-medium">{step.highlight}</p>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-muted-foreground leading-relaxed">
                {step.description}
              </p>

              {/* Tips - highlighted */}
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                    Key Steps
                  </span>
                </div>
                <ul className="space-y-2">
                  {step.tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Step dots */}
              <div className="flex items-center gap-1.5 flex-wrap justify-center py-2">
                {STEPS.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => setCurrentStep(i)}
                    className={`h-2 rounded-full transition-all ${
                      i === currentStep
                        ? "w-6 bg-primary"
                        : completedSteps.has(i)
                        ? "w-2 bg-primary/60"
                        : "w-2 bg-muted-foreground/30"
                    }`}
                    title={s.title}
                  />
                ))}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goPrev}
                  disabled={currentStep === 0}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>

                {currentStep < STEPS.length - 1 ? (
                  <Button size="sm" onClick={goNext} className="gap-1">
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button size="sm" onClick={handleClose} className="gap-1 bg-green-600 hover:bg-green-700">
                    <CheckCircle2 className="h-4 w-4" /> Finish
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
