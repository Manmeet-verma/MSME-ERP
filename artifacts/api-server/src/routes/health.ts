import { Router, type IRouter } from "express";
import { getFirebaseStatus } from "../lib/firebase";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const firebase = getFirebaseStatus();
  res.json({
    status: firebase.configured ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    firebase: {
      configured: firebase.configured,
      projectId: firebase.projectId ?? null,
      error: firebase.error ?? null,
    },
  });
});

export default router;
