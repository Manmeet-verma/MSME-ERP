import { Router } from "express";
import { db, pushTokensTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { sendPushToOrg, sendPushToUser } from "../lib/push";

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
  const [existing] = await db
    .select()
    .from(pushTokensTable)
    .where(eq(pushTokensTable.token, token));
  if (existing) {
    await db
      .update(pushTokensTable)
      .set({ userId, organizationId: orgId, platform: plat, deviceName: deviceName ?? null, lastUsedAt: new Date() })
      .where(eq(pushTokensTable.id, existing.id));
    res.json({ id: existing.id, token, platform: plat });
    return;
  }
  const [row] = await db
    .insert(pushTokensTable)
    .values({ userId, organizationId: orgId, token, platform: plat, deviceName: deviceName ?? null })
    .returning();
  res.status(201).json({ id: row.id, token: row.token, platform: row.platform });
});

pushRouter.delete("/push/register", requireAuth, async (req, res) => {
  const { token } = req.body ?? {};
  if (typeof token !== "string") {
    res.status(400).json({ error: "token is required" });
    return;
  }
  await db.delete(pushTokensTable).where(eq(pushTokensTable.token, token));
  res.json({ message: "Token unregistered" });
});

pushRouter.get("/push/tokens", requireAuth, async (req, res) => {
  const orgId = req.user!.organizationId;
  const rows = await db
    .select()
    .from(pushTokensTable)
    .where(eq(pushTokensTable.organizationId, orgId));
  res.json(
    rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      platform: r.platform,
      deviceName: r.deviceName ?? null,
      createdAt: r.createdAt.toISOString(),
      lastUsedAt: r.lastUsedAt.toISOString(),
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
