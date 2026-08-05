# Backend Vercel Deployment Fixes

Chronological list of every crash encountered during Vercel deployment and how it was resolved.

---

## 1. `dist/app.mjs` not found

**Error:** `MODULE_NOT_FOUND` — `api/index.js` tried to import `../dist/app.mjs`, which Vercel never built.

**Root cause:** `@vercel/node` does NOT bundle file-relative imports. Only `node_modules` packages are resolved at runtime.

**Fix:** Switched to a self-contained esbuild CJS bundle at `api/index.cjs` (committed to git) so no file-relative imports exist.

---

## 2. `builds` config skips `buildCommand` and `installCommand`

**Error:** Build logs showed only `npm install`, never `npm run build`, so the bundle was never generated on Vercel.

**Root cause:** When `builds` is present in `vercel.json`, Vercel ignores `buildCommand` and may also skip parts of `installCommand`.

**Fix:** The bundle is built locally via `npm run build` and committed to git. Vercel deploys the committed file directly.

---

## 3. `.js` files are ESM, not CJS

**Error:** Vercel treated `api/index.js` as ESM (because `package.json` has `"type": "module"`), causing `require()` calls to fail.

**Root cause:** `"type": "module"` in `package.json` makes every `.js` file an ES module.

**Fix:** Bundle output renamed to `api/index.cjs`. The `.cjs` extension forces Node to treat it as CommonJS regardless of the package type.

---

## 4. `pino-pretty` transport crash

**Error:** `Error: unable to determine transport target for "pino-pretty"` — pino tried to load `pino-pretty` even on Vercel.

**Root cause:** Vercel **preview** deployments set `NODE_ENV=development`. The logger used `NODE_ENV !== "production"` to decide whether to enable `pino-pretty`.

**Fix (in `src/lib/logger.ts`):**
```ts
const usePrettyTransport =
  process.env.NODE_ENV === "development" && !process.env.VERCEL;
```
Vercel always sets the `VERCEL` env var, so the transport is now skipped on all Vercel deployments.

---

## 5. `ENOENT: mkdir '/var/task/uploads'`

**Error:** `ENOENT: no such file or directory, mkdir '/var/task/uploads'` — top-level `fs.mkdirSync()` crashed at module load time.

**Root cause:** Vercel Lambda filesystem is read-only. `/var/task` is the deployment root and is not writable.

**Fix (in `src/routes/uploads.ts`):**
```ts
const UPLOAD_DIR = process.env.VERCEL ? "/tmp/uploads" : path.resolve("uploads");
try {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
} catch {}
```
`/tmp` is the only writable directory in a Lambda execution environment.

**Also updated `src/app.ts`** static serving path:
```ts
app.use("/api/uploads", express.static(process.env.VERCEL ? "/tmp/uploads" : "uploads", { maxAge: "30d" }));
```

## 6. `FUNCTION_INVOCATION_FAILED` — every request crashes on Vercel (no CORS headers)

**Error:** Browser shows CORS "No 'Access-Control-Allow-Origin' header" on login. Probing the deployed function showed `FUNCTION_INVOCATION_FAILED` for every request, including `GET /api/health`.

**Root cause:** npm workspaces hoist dependencies to the repo-root `node_modules`. The Vercel project root is `backend/` and `outputDirectory` is `"."`, so the deployed function only carries `backend/node_modules` (empty) — top-level `require("express")`, `require("firebase-admin/app")`, etc. failed at module load, crashing the function before any CORS middleware ran.

**Fix (in `build.mjs`):** Made the esbuild CJS bundle fully self-contained:
- The `externalizeMissingPlugin` previously marked *every* bare import as external. It now externalizes only specifiers Node cannot resolve.
- The `external` list was reduced to native/binary packages that are never imported by the app (plus the pino transport chain, which is never loaded on Vercel because `src/lib/logger.ts` skips transports when `VERCEL` is set).
- `api/index.cjs` now inlines express, firebase-admin, etc. (~19 MB single file) and runs with no `node_modules` present.

Verified by running the bundle in an isolated empty directory: `/api/health` 200, preflight 204 with CORS headers, `/api/auth/login` 200.

## 7. CORS `*` + `Access-Control-Allow-Credentials: true` is invalid

**Fix (in `src/app.ts`):** The CORS middleware now echoes the request `Origin` (and only sends `Access-Control-Allow-Credentials` when echoing a concrete origin) instead of sending `*` with credentials, which browsers reject. Static CORS headers were removed from `backend/vercel.json` to avoid duplicate `Access-Control-Allow-Origin` headers between the edge config and the function.

---

## Summary of touched files

| File | Change |
|---|---|
| `src/lib/logger.ts` | Skip `pino-pretty` when `VERCEL` env var is set |
| `src/routes/uploads.ts` | Use `/tmp/uploads` on Vercel; wrap `mkdirSync` in try/catch |
| `src/app.ts` | Static file path switches to `/tmp/uploads` on Vercel; CORS echoes Origin |
| `build.mjs` | Builds self-contained CJS bundle to `api/index.cjs` (no runtime node_modules needed) |
| `api/index.cjs` | Committed to git — the Vercel serverless function entry point |
| `vercel.json` | `builds` points to `api/index.cjs`; `routes` rewrites all traffic there; static CORS headers removed |

---

## Remaining manual steps

1. **Deploy Firestore indexes:**
   ```bash
   npx firebase-tools deploy --only firestore:indexes --project mems-database-a938b
   ```

2. **Set frontend env var** in Vercel project settings:
   ```
   NEXT_PUBLIC_API_URL=https://msme-erp-backend.vercel.app
   ```
