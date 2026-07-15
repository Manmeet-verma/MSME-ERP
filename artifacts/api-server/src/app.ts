import express, { type Express, type Request, type Response } from "express";
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
app.use(cors());
app.use(
  express.json({
    verify: (req, _res, buf) => {
      // Capture raw body bytes so WhatsApp webhook can verify HMAC.
      (req as unknown as { rawBody?: Buffer }).rawBody = Buffer.from(buf);
    },
  }),
);
app.use(express.urlencoded({ extended: true }));

// Serve uploaded social media files publicly so providers (Meta/LinkedIn)
// can fetch them when publishing.
app.use("/api/uploads", express.static("uploads", { maxAge: "30d" }));

app.use("/api", router);

export default app;
