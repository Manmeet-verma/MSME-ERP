import express, { type Express, type Request, type Response, type NextFunction } from "express";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { cacheStats } from "./lib/ttl-cache";

const app: Express = express();

app.use(
  (pinoHttp as unknown as Function)({
    logger,
    serializers: {
      req(req: Record<string, unknown>) {
        return {
          id: req.id,
          method: req.method,
          url: (req.url as string)?.split("?")[0],
        };
      },
      res(res: Record<string, unknown>) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
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
app.use("/api/uploads", express.static("uploads", { maxAge: "30d" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), cache: cacheStats() });
});

app.use("/api", router);

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
  logger.error({ err }, "Unhandled error");
  res.header("Access-Control-Allow-Origin", _req.headers.origin || "*");
  res.header("Access-Control-Allow-Credentials", "true");
  res.status(500).json({ error: "Internal server error" });
});

export default app;
