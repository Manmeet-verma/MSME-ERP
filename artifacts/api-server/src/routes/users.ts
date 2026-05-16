import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { logAction } from "../lib/auditLog";

const usersRouter = Router();

function formatUser(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    lastLogin: u.lastLogin?.toISOString() ?? null,
    createdAt: u.createdAt.toISOString(),
  };
}

usersRouter.get("/users", requireAuth, requireAdmin, async (req, res) => {
  const users = await db.select().from(usersTable).orderBy(usersTable.createdAt);
  res.json(users.map(formatUser));
});

usersRouter.post("/users", requireAuth, requireAdmin, async (req, res) => {
  const { username, email, password, role } = req.body;
  if (!username || !email || !password || !role) {
    res.status(400).json({ error: "All fields required" });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db.insert(usersTable).values({ username, email, passwordHash, role }).returning();
  await logAction(req, "CREATE", "user", user.id, `Created user ${username}`);
  res.status(201).json(formatUser(user));
});

usersRouter.get("/users/:id", requireAuth, requireAdmin, async (req, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, Number(req.params.id)));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(formatUser(user));
});

usersRouter.patch("/users/:id", requireAuth, requireAdmin, async (req, res) => {
  const { email, role, isActive, password } = req.body;
  const updates: Record<string, unknown> = {};
  if (email !== undefined) updates.email = email;
  if (role !== undefined) updates.role = role;
  if (isActive !== undefined) updates.isActive = isActive;
  if (password) updates.passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, Number(req.params.id))).returning();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  await logAction(req, "UPDATE", "user", user.id, `Updated user ${user.username}`);
  res.json(formatUser(user));
});

usersRouter.delete("/users/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user!.userId) {
    res.status(400).json({ error: "Cannot delete yourself" });
    return;
  }
  await db.delete(usersTable).where(eq(usersTable.id, id));
  await logAction(req, "DELETE", "user", id);
  res.json({ message: "User deleted" });
});

export default usersRouter;
