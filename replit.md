# MSME Pro — Business OS

A multi-tenant SaaS ERP foundation for Indian MSMEs. Round 1 of 6 ships tenancy, signup, mobile-first PWA shell, the unified module-card dashboard, and the module-toggle system. Sales/quotations are kept as the first live module; later rounds add Leads + Sales orders + Communication (R2), Inventory + Purchase (R3), Marketing + Social + AI (R4), HR + Payroll + Accounting (R5), and a native mobile app (R6).

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/quotation-app run dev` — run the frontend (port 18991)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate React Query hooks + Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string. `JWT_SECRET` recommended in prod.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, TanStack Query, Wouter, Tailwind CSS v4, shadcn/ui, Recharts
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Auth: JWT with `{userId, email, activeOrgId}` payload, bcryptjs
- API codegen: Orval (from OpenAPI spec in `lib/api-spec/`)
- PWA: hand-rolled manifest + service worker (network-first for `/api`, cache-first for shell)

## Multi-tenancy

- `organizations` table holds tenant rows with `plan`, `limits` (JSONB), `modules` (JSONB)
- `organization_members` links users ↔ orgs with `role` (owner/admin/sales/viewer)
- `invitations` holds pending invites with one-time tokens (Owner/Admin can issue)
- Every tenant-scoped table (`clients`, `products`, `addons`, `quotations`, `audit_logs`) has `organization_id` and is filtered by it in all routes
- A JWT bearer must include `activeOrgId`; the tenant-context middleware (`artifacts/api-server/src/middleware/tenant.ts`) rejects requests missing valid tenancy on every `/api` route except `/auth/*` and `/invitations/:token`
- Switching orgs issues a new JWT (`POST /api/auth/switch-org`)

## Where things live

- `artifacts/quotation-app/src/`
  - `pages/login.tsx`, `signup.tsx`, `onboarding.tsx`, `accept-invite.tsx` — auth + org bootstrap
  - `pages/dashboard.tsx` — unified module-card grid
  - `pages/settings/{organization,members,modules}.tsx` — org admin
  - `pages/{clients,products,addons,quotations,reports,audit-logs}` — Sales module screens
  - `components/layout.tsx` — sidebar + mobile bottom nav, role-gated nav
  - `lib/auth.ts` — JWT + cached user/org/role in localStorage (`saas_*`)
  - `lib/modules.ts` — `ModuleKey`, `DEFAULT_MODULES`, `DEFAULT_LIMITS`, `getModules`, `getLimits`
  - `lib/format.ts` — Indian currency & date formatters (`formatCurrency`, `formatDate`)
  - `public/manifest.webmanifest`, `public/sw.js`, `public/icons/` — PWA assets
- `artifacts/api-server/src/routes/` — Express route handlers (auth, organizations, members, invitations, clients, products, addons, quotations, dashboard, reports, audit-logs)
- `lib/api-spec/` — OpenAPI spec (source of truth for contracts)
- `lib/api-client-react/src/generated/` — Orval-generated React Query hooks + types
- `lib/api-zod/src/` — Zod schemas (re-exported from generated)
- `lib/db/src/schema.ts` — Drizzle ORM schema

## Architecture decisions

- Contract-first API: OpenAPI spec → Orval generates React Query hooks and Zod schemas
- JWT carries `activeOrgId`; switching orgs re-issues a JWT
- Role-based access enforced at API layer (`requireRole('owner'|'admin'|…)`)
- Module toggles live on `organizations.modules` (JSONB); sidebar + dashboard read them via `getModules(org)`
- Free-tier limits live on `organizations.limits` (JSONB); helpers fall back to `DEFAULT_LIMITS`
- Indian Rupee with Indian comma notation throughout
- E-invoicing / e-way bill explicitly skipped

## Product (Round 1)

- Email/password signup creates an Owner user + an Organization in one transaction
- Invite teammates by email; one-time accept link; Owner can change roles and remove members
- Unified dashboard: 8 module cards (Sales, Leads, Inventory, Purchase, Marketing, Social, HR, Accounting) with KPIs for enabled modules and empty-state CTAs for the rest
- Settings → Modules: Owner toggles modules; sidebar + dashboard react live
- Settings → Members: invite, change role, remove, list pending invitations
- Settings → Organization: name, GSTIN, state, address, phone
- Sales module (Round-1 carry-over): Clients, Products, Add-ons, Quotations, Reports, Audit Logs — all tenant-scoped

## PWA

- `index.html` links `manifest.webmanifest`, theme-color `#050816`, apple-touch-icon, viewport with `viewport-fit=cover`
- `sw.js` registered from `main.tsx` in production only
- Network-first for `/api/*` (offline → 503 JSON), cache-first with network update for shell

## Round 2 — Sales, Leads & Communication

Live in addition to Round 1:

- **Leads** (`/leads`) — manual entry + IndiaMart sync via Settings → Integrations. Rule-based + AI scoring (hot/warm/cold + `nextAction`). Convert lead → client + draft quotation.
- **Lead detail** (`/leads/:id`) — timeline (activities + calls + emails), click-to-call (Twilio dials agent first, then lead), AI-drafted email send, quick notes, status workflow.
- **Tasks** (`/tasks`) — generic to-do list (linkable to leads/clients in future); open/done filter, priority, due dates.
- **Sales orders** (`/sales-orders`) — promoted from quotations; `/sales-orders/:id` can be promoted to invoice.
- **Invoices** (`/invoices`) — GST split based on seller state (org.state) vs buyer state: same-state ⇒ CGST + SGST (rate/2 each); different/missing ⇒ IGST (full rate). Status auto-derives from payments. Print view.
- **Payments** — record partial/full payments on invoices; invoice status auto-updates (`paid` / `partial` / `overdue` based on amount + due date).
- **Campaigns** (`/campaigns`) — bulk email to a segment (leads filtered by priority/status, or all clients).
- **Integrations** (`/settings/integrations`) — per-org IndiaMart API key; Twilio + Anthropic noted as workspace-level.
- **AI**: Anthropic Claude (`claude-haiku-4-5`) via `@workspace/integrations-anthropic-ai` for lead scoring, email drafting, call summaries.
- **Dashboard** — Live KPI strip: new leads today, hot leads, calls this week, emails sent, unpaid invoices, revenue, quotes sent, overdue ₹, open tasks (`GET /api/dashboard/widgets`).

### New API routes
- `/api/leads` + `/:id/activities`, `/convert`, `/score`
- `/api/tasks`
- `/api/calls`, `/calls/initiate`, `/calls/webhook` (Twilio status callback)
- `/api/emails`, `/emails/draft` (AI)
- `/api/campaigns`, `/campaigns/:id/send`
- `/api/sales-orders`, `/sales-orders/from-quotation/:quotationId`
- `/api/invoices`, `/invoices/from-sales-order/:salesOrderId`, `/invoices/:id/status`
- `/api/payments`
- `/api/integrations`
- `/api/integrations/indiamart/sync`
- `/api/dashboard/widgets`

### New DB tables
`leads, lead_activities, tasks, calls, emails, campaigns, campaign_recipients, sales_orders, sales_order_items, invoices, invoice_items, payments, integrations`.

## Round 3 — Inventory & Purchase

Live in addition to Rounds 1–2:

- **Items** (`/items`) — SKU, name, category, unit, HSN, GST rate, sale/purchase price, opening stock, low-stock threshold. Tracks `currentStock` (sum across warehouses) and `avgCost` (moving average; updated on every IN movement).
- **Warehouses** (`/warehouses`) — multi-location stock; one default warehouse auto-created via `ensureDefaultWarehouse`.
- **Vendors** (`/vendors`) — GST, contact, address, `paymentTermsDays`.
- **Purchase Orders** (`/purchase-orders`, `/purchase-orders/:id`) — draft → sent → partial → received → cancelled. Line items optionally link to inventory items (`itemId`). PO totals computed from items × GST.
- **GRN (Goods Receipt Note)** — created from a PO; receiving N units triggers a stock-IN movement (reason `purchase`) at the GRN's unit cost, updates the PO item's `receivedQuantity`, and rolls the PO status to `partial` or `received`. Refreshes item `avgCost` via moving average.
- **Vendor Bills** (`/vendor-bills`, `/vendor-bills/:id`) — record vendor invoices against a PO (auto-fills items) or standalone. Status (`open` / `partial` / `paid` / `overdue`) derives from `amountPaid` vs `total` and due date; payments recorded by patching `amountPaid`.
- **Inventory** (`/inventory`) — four tabs: **Levels** (qty + value per item/warehouse), **Movements** (full ledger), **Valuation** (total + by-warehouse + by-category breakdown), **Low-Stock** (current ≤ threshold). New-movement dialog supports adjustment / opening / purchase / sale / transfer / return.
- **Sales-Order stock integration** — when an SO is patched to `confirmed | in_production | delivered`, `dispatchStockForSO` writes OUT movements (reason `sale`) for each line by matching `description` to `item.name` against the SO's warehouse. Reversing to `draft | cancelled` deletes those movements. SO items without a matching inventory item are skipped with a server warning.
- **Stock-movement engine** (`stockEngine.ts`) — `recordMovement` is the single entry-point (also updates `avgCost` on IN); `getStockLevel`, `dispatchStockForSO`, `reverseStockForSO`, `ensureDefaultWarehouse`.
- **Dashboard** — extra KPIs: `lowStockItems`, `openPurchaseOrders`, `stockValue` (`GET /api/dashboard/widgets`). Inventory + Purchase module cards now show live data.

### New API routes
- `/api/items` (CRUD)
- `/api/warehouses` (CRUD)
- `/api/vendors` (CRUD)
- `/api/purchase-orders` (list/create/get/update — no delete)
- `/api/grn` (list with `?purchaseOrderId=`, create — auto stock-IN + PO update)
- `/api/vendor-bills` (list/create/get/update — no delete; auto-status from payments)
- `/api/inventory/stock-levels`, `/stock-movements` (GET + POST with `transfer_out` paired to `transfer_in`), `/valuation`, `/low-stock`

### New DB tables
`items, warehouses, stock_movements, vendors, purchase_orders, po_items, grn, grn_items, vendor_bills, vendor_bill_items`. Item `avgCost` is global (not per-warehouse); stock levels computed via `SUM(IN - OUT)` per (item, warehouse).

### Round-3 gotchas
- Sales orders now carry an optional `warehouseId` and SO line items an optional `itemId`. SO→stock dispatch uses these explicitly — lines without `itemId` are skipped (logged) and no description matching is used.
- Cancelling/draft-reverting a confirmed SO writes compensating `in` movements (reason `return`) rather than deleting prior `sale` movements — preserves the ledger.
- A PO whose lines already have `receivedQuantity > 0` cannot have its line items edited (returns 409); cancel + recreate instead.
- Quotation→Sales-Order promotion carries description/qty/price but `itemId` is null (quotation items don't link to inventory yet).
- `Item.currentStock` returned by the API is denormalized (sum of all warehouses); the authoritative ledger is `stock_movements`.
- Receiving a GRN line requires the PO item to be linked (`itemId`); unlinked lines are shown as "(not linked)" in the receive dialog.
- All Round 3 nav/dashboard cards are gated by `org.modules.inventory` and `org.modules.purchase` — toggle them in Settings → Modules.

## Round 4 — Social, Marketing & AI Reports

Live in addition to Rounds 1–3:

- **Social composer** (`/social`) — Compose posts for Facebook Page, Instagram Business, LinkedIn Page. AI drafts a base post + per-platform variants (LinkedIn long-form, IG/FB shorter) and supports tone rewrites (professional, casual, festive, urgent, playful). Schedule or post immediately; drafts/scheduled/published tabs and a chronological calendar of upcoming + recent posts.
- **Social accounts** — Configured in Settings → Integrations. Each org stores `accessToken` + `externalId` per platform. The scheduler tick (every 60s in `lib/scheduler.ts`) publishes due posts to Meta Graph API (FB Pages `/feed`, IG `/media`+`/media_publish`) and LinkedIn (`/ugcPosts`). Failures captured per platform in `social_post_results`.
- **Drip sequences** (`/marketing/drips`) — Multi-step email automations targeting leads (with optional priority filter) or clients. Each step has a `delayDays` offset; the scheduler tick (`tickDrips`) sends due steps respecting the suppression list. Pause/resume per sequence; enroll button bulk-adds matching contacts.
- **Suppression list** (`/marketing/suppressions`) — Per-org list of emails that will never receive campaigns or drips. Auto-populated when a recipient confirms unsubscribe.
- **Unsubscribe page** (`/unsubscribe/:token`) — Public, no auth. One-time HMAC-derived token per recipient; confirming adds the email to suppressions.
- **Campaigns A/B** — `campaigns.subjectB`/`bodyB`/`abEnabled`/`abSplitPercent` extend Round-2 campaigns. Send-time splits the recipient list deterministically into variant `a`/`b`. UI toggle in the New Campaign dialog.
- **AI dashboard** — `GET /api/ai/insights` returns cached daily insights (headline + bullets + suggestions) per org per day (`ai_insights` table). The dashboard shows them in a "Today's AI insights" panel.
- **Natural-language search** — `POST /api/ai/nl-search` accepts a query, plans an entity + filter set against a whitelist (`invoices`, `leads`, `clients`, `quotations`, `purchase_orders`), and returns matching rows. Inline in the dashboard "Ask anything" box.
- **Reports area** (`/reports`) — Catalog-driven (`GET /api/reports/catalog`). Reports: sales register, purchase register, customer ageing, top items, lead-source ROI, social engagement, email performance. CSV export via `?format=csv`; PDF via browser print.
- **AI provider** — Anthropic Claude `claude-haiku-4-5` via `@workspace/integrations-anthropic-ai`, wrapped in `lib/ai.ts` (drafting, per-platform variants, tone rewrites, daily insights, NL-search planner).

### New API routes
- `/api/social/accounts` (list / connect / disconnect — provider-side revoke on disconnect), `/api/social/oauth/config|start|callback` (Meta + LinkedIn OAuth; Meta short→long-lived token exchange; LinkedIn Pages resolved via `/v2/organizationAcls`, falls back to personal `urn:li:person:`), `/api/social/posts` (list / create / delete), `/api/social/posts/:id/publish`, `/api/social/posts/:id/refresh-metrics` (pulls FB likes/comments/shares/reactions, IG like_count/comments_count + impressions/reach insights, LinkedIn `/v2/socialActions` likes+comments), `/api/social/draft`, `/api/social/rewrite`, `/api/uploads` (multipart image upload → served from `/api/uploads/*` static)
- `/api/marketing/suppressions` (list / create / delete)
- `/api/marketing/drips` (list / create / patch), `/api/marketing/drips/:id/enroll`
- `/api/unsubscribe/:token` (public GET + POST)
- `/api/ai/insights`, `/api/ai/nl-search`
- `/api/reports/catalog`, `/api/reports/{sales-register,purchase-register,customer-ageing,top-items,lead-source-roi,social-engagement,email-performance}` (each supports `?format=csv`)

### New DB tables
`social_accounts, social_posts, social_post_results, email_suppressions, drip_sequences, drip_steps, drip_enrollments, ai_insights`. `campaigns` extended with `subject_b, body_b, ab_enabled, ab_split_percent, winner_variant`; `campaign_recipients` extended with `variant`.

### Round-4 gotchas
- Scheduler runs every 60s from `artifacts/api-server/src/index.ts`. It publishes due social posts and ticks drip enrollments; suppressed emails are skipped.
- Social access tokens are stored per-org. Connecting a Page/Business account currently uses a long-lived token entered by the owner — full OAuth handshake is deferred.
- NL-search is whitelist-only: queries against tables/columns outside the whitelist return an empty plan with an explanation. Treat it as a search aid, not a SQL console.
- Daily insights are cached per `(organizationId, date)`; the first request of the day computes them, subsequent ones return `cached: true`.
- Sidebar entries for Social and Drips/Suppressions are gated by `org.modules.social` and `org.modules.marketing` — toggle them in Settings → Modules.
- The CampaignRecipient `variant` enum is lowercase (`a`/`b`) at the DB level.

## Round 5 — HR, Payroll & Accounting

Live in addition to Rounds 1–4:

- **Employees** (`/employees`) — CRUD with salary structure (basic, HRA, allowances, otherDeductions), PF/ESI flags, bank/PAN, status (active/inactive/terminated), per-employee leave balances JSONB.
- **Attendance** (`/attendance`) — Mobile-first daily marking grid. Statuses: present, half, leave, absent, holiday, weekoff. `POST /api/attendance/bulk` upserts an entire day. Leaves consume `employee.leaveBalances`. `GET /api/leaves/balances` returns per-employee used totals.
- **Payroll** (`/payroll`, `/payroll/:id`) — `POST /api/payroll-runs` with `{periodMonth, periodYear}` computes payslips: gross = basic + HRA + allowances; LOP = (basic+HRA+allowances) × (1 − daysWorked/daysInMonth); PF = 12% basic; ESI = 0.75% of (basic+HRA+allowances) if gross < 21000; deductions sum PF + ESI + otherDeductions + LOP. `POST /:id/mark-paid` flips status, sets `paidAt`, marks payslips paid, and auto-posts a journal (Dr 5000 / Cr 2100 PF / Cr 2110 ESI / Cr 1010 Bank). PDFs streamed via `GET /api/payslips/:id/pdf` (PDFKit).
- **Expenses** (`/expenses`) — Categories CRUD with optional `accountCode` link. Expenses with GST, payment method, optional receipt (uses `/api/uploads`). Auto-posts: Dr expenseAccount + Dr 1300 (GST input) / Cr 1000 cash or 1010 bank.
- **Chart of accounts** — `ensureChartOfAccounts(orgId)` seeds 18 system accounts on first use (1000 Cash, 1010 Bank, 1100 AR, 1200 Inventory, 1300 GST Input, 2000 AP, 2100 PF Payable, 2110 ESI Payable, 2200 CGST Output, 2210 SGST Output, 2220 IGST Output, 4000 Sales, 5000 Salaries, 5100 Rent, 5200 Utilities, 5300 Travel, 5400 Office, 5900 Other expenses).
- **Auto-postings** (`lib/accounting.ts`):
  - Invoices: `recalcInvoice` (Dr 1100 AR / Cr 4000 Sales / Cr CGST + SGST or IGST output).
  - Payments: `repostPayment` (Dr 1000/1010 / Cr 1100 AR).
  - Vendor bills: Dr 1200 + Dr 1300 / Cr 2000 AP.
  - Expenses: as above.
  - Payroll: on mark-paid.
  - All sources use `reverseAndRepost(orgId, sourceType, sourceId, …)` so repeated updates stay idempotent.
- **Ledger** (`/accounting/ledger`) — Per-account running balance. `GET /api/accounting/ledger?accountId=&from=&to=` returns lines with debit/credit/running balance.
- **P&L** (`/accounting/pnl`) — `GET /api/accounting/pnl?from=&to=&compare=true` returns `{current, previous}` sections; previous matches range length immediately prior.
- **GST reports** (`/accounting/gst`) — `GET /api/accounting/gstr1` returns `{b2b, b2c, summary}` (B2B = client with GSTIN); `GET /api/accounting/gstr3b` returns outward supplies + ITC (from vendor bills + expense GST). Both accept `?format=csv|xlsx` (ExcelJS).
- **Vendor ageing** (`/accounting/vendor-ageing`) — 0-30/31-60/61-90/90+ buckets from unpaid vendor bills.

### New API routes
- `/api/employees` (CRUD), `/api/attendance` (list/create/bulk), `/api/leaves`, `/api/leaves/balances`
- `/api/leave-requests` (list/create), `/api/leave-requests/:id/{approve,reject}` — apply/approve workflow. Approval auto-creates `leave` attendance rows for each day in the range and decrements the matching key in `employees.leaveBalances`.
- `/api/payroll-runs` (list/create/get), `/api/payroll-runs/:id/mark-paid`, `/api/payslips/:id/pdf`
- `/api/payroll-runs/:id/payslips.pdf` — single PDF containing every payslip in the run (one slip per page). `/api/payroll-runs/:id/payments.csv` — bank-friendly CSV (employee code, name, bank, account, IFSC, PAN, net) for bulk salary transfer.
- `/api/expense-categories` (CRUD), `/api/expenses` (CRUD)
- `/api/accounts` (list/create), `/api/journal-entries` (list/create — manual)
- `/api/accounting/ledger`, `/api/accounting/pnl`, `/api/accounting/gstr1`, `/api/accounting/gstr3b`, `/api/accounting/vendor-ageing`

### New DB tables
`employees, attendance, leave_requests, payroll_runs, payslips, accounts, journal_entries, journal_lines, expense_categories, expenses`. Each tenant-scoped. `accounts.is_system=true` for the seeded 18 accounts. Journal lines store `debit/credit` as decimal(14,2).

### Round-5 gotchas
- Nav + dashboard gating: HR pages require `org.modules.hr`; expenses/accounting require `org.modules.accounting`. Toggle in Settings → Modules.
- Payroll compute treats employees with **no** attendance records for the month as full-month present (daysWorked = daysInMonth). Attendance must be marked **before** running payroll for LOP to apply.
- `reverseAndRepost` deletes prior journal entries for a `(sourceType, sourceId)` and re-posts a fresh balanced entry. If rebuild() returns null (e.g. draft invoice), prior entries are removed and nothing is posted. Both `postJournal` and `reverseAndRepost` run inside `db.transaction(...)` and pre-validate every account code + balance before touching the DB, so a bad source can never leave half-written entries behind.
- GSTR-1 B2B vs B2C is split by presence of `client.gstNumber`. Same-state vs different-state still drives CGST+SGST vs IGST (set on the invoice at creation time).
- ExcelJS xlsx export is server-side; browser downloads via authenticated fetch + blob URL.
- Payslip PDFs are generated on demand (not stored). Re-generated each request.

## User preferences

- Currency: Indian Rupees (₹) with Indian comma system
- Dark theme: background ~#050816, primary blue, cyan accent
- Mobile-first: bottom nav under sm, sidebar from md+

## Gotchas

- Auth login expects `email`; JWT must carry `activeOrgId`
- `AuthResponse` returns `{ token, user, activeOrgId, organizations: OrgSummary[] }` — `OrgSummary` only has `{id,name,slug,role}`; full org (`limits`, `modules`) comes from `GET /api/organizations/current`
- `setCurrentOrg` accepts `OrgSummary | Organization`; Layout/Settings re-fetch the full org and refresh the cache
- `acceptInvitation` returns `SwitchOrgResponse {token, activeOrgId, role}` — clear cached org so Dashboard re-fetches
- Product price field is `basePrice`; Addon uses `price` + `priceType` (`fixed`|`percentage`)
- `ModulesInput` is flat (`sales?, leads?, ...`), not wrapped in `{modules: ...}`
- `InvitationInputRole` excludes `owner` (only `admin|sales|viewer` can be invited)
- Run `pnpm --filter @workspace/api-spec run codegen` after any OpenAPI spec changes
- API server auto-rebuilds on restart (esbuild)

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- Round task plans live in `.local/tasks/round-{2..6}-*.md`
