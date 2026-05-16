# Techon LED Quotation Pro

A full-stack LED display board quotation management system for Techon LED Displays — multi-role, with CRM, analytics, and print-ready quotes.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/quotation-app run dev` — run the frontend (port 18991)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, TanStack Query, Wouter, Tailwind CSS v4, shadcn/ui, Recharts
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Auth: JWT (7-day expiry), bcryptjs
- API codegen: Orval (from OpenAPI spec in `lib/api-spec/`)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/quotation-app/src/` — React frontend
  - `pages/` — Login, Dashboard, Quotations (list/new/detail), Clients, Products, Addons, Reports, Users, Audit Logs
  - `components/layout.tsx` — Sidebar navigation
  - `lib/auth.ts` — JWT token management (localStorage `led_token`)
  - `lib/format.ts` — Indian currency & date formatters
- `artifacts/api-server/src/routes/` — Express route handlers
- `lib/api-spec/` — OpenAPI spec (source of truth for contracts)
- `lib/api-client-react/src/generated/` — Orval-generated React Query hooks
- `lib/db/src/schema.ts` — Drizzle ORM schema

## Architecture decisions

- Contract-first API: OpenAPI spec → Orval generates React Query hooks and Zod schemas
- JWT auth: token stored in localStorage, injected via `setAuthTokenGetter` in custom-fetch
- Role-based access: admin / sales / viewer (enforced at API layer)
- Quotation recalc: area = widthFt × heightFt, total = (items + addons − discount) + GST
- Indian Rupee currency with Indian comma notation throughout

## Product

- JWT login with role-based access (admin/sales/viewer)
- Dashboard with revenue charts, pipeline donut, recent quotations
- Quotation builder: select products by area (WxH sqft) + add-on services, live total preview
- Quotation detail: status workflow (draft → sent → approved/rejected), print view
- Client CRM: create/edit/delete clients with GST number support
- Product catalog: LED panels with category, pixel pitch, brightness
- Add-on catalog: installation, structure, warranty, logistics services
- Reports: monthly revenue trend, quotation count bar chart, top products
- Users management (admin only)
- Audit logs

## User preferences

- Currency: Indian Rupees (₹) with Indian comma system
- Dark theme: background ~#050816, primary blue, cyan accent
- All users default password: `admin123`

## Gotchas

- Auth login expects `email` field (not `username`), matched against `users.email` OR `users.username`
- Demo users: `admin@techonled.com`, `rajesh@techonled.com`, `priya@techonled.com` — all password `admin123`
- `useGetQuotation` takes `id: number` as first positional arg (not `{ id }`)
- After seeding, if bcrypt hashes need reset: `node -e "require('bcryptjs').hash('admin123',10).then(console.log)"` then UPDATE users SET password_hash = '...'
- Run `pnpm --filter @workspace/api-spec run codegen` after any OpenAPI spec changes
- API server auto-rebuilds on restart (esbuild), ~500ms build time

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
