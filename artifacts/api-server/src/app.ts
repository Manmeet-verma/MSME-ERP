import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

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

const corsMiddleware = cors({
  origin: true,
  credentials: true,
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
  maxAge: 86400,
});
app.use(corsMiddleware);

// Explicitly handle ALL OPTIONS preflight requests before any other middleware.
// This prevents 405 errors when browsers send OPTIONS before POST/PUT/PATCH/DELETE.
app.options("*", corsMiddleware);

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
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api", router);

// Catch-all for unmatched /api routes — return proper 405 instead of defaulting to HTML
app.all("/api/*", (req: Request, res: Response) => {
  res.status(405).json({ error: `Method ${req.method} not allowed on ${req.path}` });
});

// Global error handler — last resort, prevents crashes
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Internal server error" });
});

export default app;
