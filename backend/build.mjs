import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import esbuildPluginPino from "esbuild-plugin-pino";
import { rm } from "node:fs/promises";

globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));

const external = [
  // Native / binary / platform-specific packages that cannot be bundled and
  // are never imported by this app's source. They stay as require() calls.
  "*.node",
  "sharp",
  "better-sqlite3",
  "sqlite3",
  "canvas",
  "argon2",
  "fsevents",
  "re2",
  "bufferutil",
  "utf-8-validate",
  "ssh2",
  "cpu-features",
  "dtrace-provider",
  "isolated-vm",
  "lightningcss",
  "pg-native",
  "oracledb",
  "mongodb-client-encryption",
  "onnxruntime-node",
  "@tensorflow/*",
  "@prisma/client",
  "@mikro-orm/*",
  "@swc/*",
  "@parcel/watcher",
  "@sentry/profiling-node",
  "@tree-sitter/*",
  "aws-sdk",
  "classic-level",
  "dd-trace",
  "ffi-napi",
  "grpc",
  "hiredis",
  "leveldown",
  "miniflare",
  "mysql2",
  "newrelic",
  "odbc",
  "piscina",
  "realm",
  "ref-napi",
  "rocksdb",
  "sass-embedded",
  "sequelize",
  "serialport",
  "snappy",
  "tinypool",
  "usb",
  "workerd",
  "wrangler",
  "zeromq",
  "zeromq-prebuilt",
  "playwright",
  "puppeteer",
  "puppeteer-core",
  "electron",
  "nodemailer",
  "handlebars",
  "knex",
  "typeorm",
  // pino transport chain: only loaded when a transport is configured,
  // which never happens on Vercel (see src/lib/logger.ts). Kept external
  // because transports are resolved via dynamic require() at runtime.
  "pino-pretty",
  "thread-stream",
  "sonic-boom",
  "fast-redact",
  "on-exit-leak-free",
];

// Externalize only bare specifiers that Node cannot resolve (so esbuild
// bundles everything else into the single-file serverless bundle). This
// makes api/index.cjs self-contained and independent of node_modules at
// runtime on Vercel.
const externalizeMissingPlugin = {
  name: "externalize-missing",
  setup(build) {
    build.onResolve({ filter: /^[^./]/ }, (args) => {
      // Don't externalize entry points or anything without an importer
      if (!args.importer) return null;
      // Don't externalize relative workspace imports
      if (args.path.startsWith("@workspace/")) return null;
      try {
        createRequire(args.importer).resolve(args.path);
        return null; // resolvable via node — let esbuild bundle it
      } catch {
        return { path: args.path, external: true };
      }
    });
  },
};

async function buildAll() {
  const distDir = path.resolve(artifactDir, "dist");
  await rm(distDir, { recursive: true, force: true });

  // ESM build for Render deployment
  await esbuild({
    entryPoints: [
      path.resolve(artifactDir, "src/index.ts"),
      path.resolve(artifactDir, "src/app.ts"),
    ],
    platform: "node",
    bundle: true,
    format: "esm",
    outdir: distDir,
    outExtension: { ".js": ".mjs" },
    external,
    sourcemap: "linked",
    plugins: [
      externalizeMissingPlugin,
      esbuildPluginPino({ transports: ["pino-pretty"] }),
    ],
    banner: {
      js: `import { createRequire as __bannerCrReq } from 'node:module';
import __bannerPath from 'node:path';
import __bannerUrl from 'node:url';

globalThis.require = __bannerCrReq(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);
      `,
    },
  });

  // CJS build for Vercel — bundles all our source code into one file
  // npm packages are left as require() calls (resolved from node_modules at runtime)
  await esbuild({
    entryPoints: [
      path.resolve(artifactDir, "src/app.ts"),
    ],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: path.resolve(artifactDir, "api/index.cjs"),
    sourcemap: "linked",
    plugins: [externalizeMissingPlugin],
    footer: {
      js: `
// Vercel @vercel/node compatibility
if (module.exports && module.exports.default && typeof module.exports.default === "function" && module.exports.default.use) {
  module.exports = module.exports.default;
}
`,
    },
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
