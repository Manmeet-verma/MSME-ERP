import { Router } from "express";
import { getDb } from "../lib/firebase";
import { requireAuth } from "../middlewares/auth";
import { sendPushToOrg, sendPushToUser } from "../lib/push";

const db = () => getDb();

const pushRouter = Router();

pushRouter.post("/push/register", requireAuth, async (req, res) => {
  const { token, platform, deviceName } = req.body ?? {};
  if (typeof token !== "string" || !token) {
    res.status(400).json({ error: "token is required" });
    return;
  }
  const plat = ["ios", "android", "web"].includes(platform) ? platform : "android";
  const userId = req.user!.userId;
  const orgId = req.user!.organizationId;
  const existingSnap = await db().collection("push_tokens").where("token", "==", token).limit(1).get();
  if (!existingSnap.empty) {
    const doc = existingSnap.docs[0];
    await doc.ref.update({ userId, organizationId: orgId, platform: plat, deviceName: deviceName ?? null, lastUsedAt: new Date().toISOString() });
    res.json({ id: doc.id, token, platform: plat });
    return;
  }
  const ref = await db().collection("push_tokens").add({ userId, organizationId: orgId, token, platform: plat, deviceName: deviceName ?? null, createdAt: new Date().toISOString(), lastUsedAt: new Date().toISOString() });
  res.status(201).json({ id: ref.id, token, platform: plat });
});

pushRouter.delete("/push/register", requireAuth, async (req, res) => {
  const { token } = req.body ?? {};
  if (typeof token !== "string") {
    res.status(400).json({ error: "token is required" });
    return;
  }
  const snap = await db().collection("push_tokens").where("token", "==", token).get();
  for (const doc of snap.docs) {
    await doc.ref.delete();
  }
  res.json({ message: "Token unregistered" });
});

pushRouter.get("/push/tokens", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const snap = await db().collection("push_tokens").where("organizationId", "==", orgId).get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Record<string, unknown>));
  res.json(
    rows.map((r: Record<string, unknown>) => ({
      id: r.id,
      userId: r.userId,
      platform: r.platform,
      deviceName: r.deviceName ?? null,
      createdAt: r.createdAt as string,
      lastUsedAt: r.lastUsedAt as string,
    })),
  );
});

pushRouter.post("/push/test", requireAuth, async (req, res) => {
  const userId = req.user!.userId;
  const { title, body } = req.body ?? {};
  const result = await sendPushToUser(userId, {
    title: typeof title === "string" ? title : "MSME Pro test",
    body: typeof body === "string" ? body : "Push notifications are working.",
    data: { type: "test" },
  });
  res.json(result);
});

export { sendPushToOrg };
export default pushRouter;
