import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const appDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(appDir, "../..");

process.env.PORT = process.env.PORT || "5173";
process.env.BASE_PATH = process.env.BASE_PATH || "/";
process.env.NODE_ENV = "production";

console.log("Building frontend from:", appDir);

const cmds = [
  `node ${resolve(appDir, "node_modules/.bin/vite")} build --config vite.config.ts`,
  `node ${resolve(rootDir, "node_modules/.bin/vite")} build --config vite.config.ts`,
  `node ${resolve(rootDir, "node_modules/vite/bin/vite.js")} build --config vite.config.ts`,
  `npx vite build --config vite.config.ts`,
];

for (const cmd of cmds) {
  try {
    console.log("Trying:", cmd);
    execSync(cmd, { cwd: appDir, stdio: "inherit", env: process.env });
    console.log("Build successful!");
    process.exit(0);
  } catch (e) {
    console.log("Failed, trying next...");
  }
}

console.error("All build commands failed!");
process.exit(1);
