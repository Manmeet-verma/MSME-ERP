import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "../..");

process.env.PORT = process.env.PORT || "5173";
process.env.BASE_PATH = process.env.BASE_PATH || "/";
process.env.NODE_ENV = "production";

console.log("Building frontend...");
execSync("npx vite build --config vite.config.ts", {
  cwd: __dirname,
  stdio: "inherit",
  env: process.env,
});
console.log("Frontend build complete!");
