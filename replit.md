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
