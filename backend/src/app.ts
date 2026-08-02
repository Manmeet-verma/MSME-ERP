import express, { type Express, type Request, type Response, type NextFunction } from "express";
import router from "./routes";
import { cacheStats } from "./lib/ttl-cache";
import { getFirebaseInitError } from "./lib/firebase";

const app: Express = express();

// CORS — must be FIRST so it runs even if later middleware crashes
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Requested-With,Accept,Origin");
  res.header("Access-Control-Max-Age", "86400");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

// pino-http — fail-safe in serverless
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pinoHttp = require("pino-http");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { logger } = require("./lib/logger");
  if (typeof pinoHttp === "function") {
    app.use(
      pinoHttp({
        logger,
        serializers: {
          req(req: Record<string, unknown>) {
            return { id: req.id, method: req.method, url: (req.url as string)?.split("?")[0] };
          },
          res(res: Record<string, unknown>) {
            return { statusCode: res.statusCode };
          },
        },
      }),
    );
  }
} catch {
  // pino-http not available — skip
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as unknown as { rawBody?: Buffer }).rawBody = Buffer.from(buf);
    },
  }),
);
app.use(express.urlencoded({ extended: true }));

// Serve uploaded social media files publicly so providers (Meta/LinkedIn)
// can fetch them when publishing.
app.use("/api/uploads", express.static(process.env.VERCEL ? "/tmp/uploads" : "uploads", { maxAge: "30d" }));

app.get("/api/health", (_req, res) => {
  const fbError = getFirebaseInitError();
  res.json({
    status: fbError ? "degraded" : "ok",
    timestamp: new Date().toISOString(),
    cache: cacheStats(),
    firebase: fbError ? { error: fbError } : { configured: true },
    env: {
      hasProjectId: !!process.env.FIREBASE_PROJECT_ID || !!process.env.GCLOUD_PROJECT,
      hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
      hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
      hasJwtSecret: !!process.env.JWT_SECRET,
    },
  });
});

app.use("/api", router);
app.get("/", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), cache: cacheStats() });
});

// Catch-all for unmatched /api routes — return proper 405 instead of defaulting to HTML
// NOTE: Must NOT match OPTIONS (preflights are already handled above).
app.all("/api/*path", (req: Request, res: Response) => {
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  res.status(405).json({ error: `Method ${req.method} not allowed on ${req.path}` });
});

// Global error handler — last resort, prevents crashes
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[unhandled]", err);
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Credentials", "true");
  res.status(500).json({ error: "Internal server error" });
});

export default app;
