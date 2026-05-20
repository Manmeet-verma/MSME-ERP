import { Router } from "express";
import bcrypt from "bcryptjs";
import {
  db,
  usersTable,
  organizationsTable,
  organizationMembersTable,
  DEFAULT_LIMITS,
  DEFAULT_MODULES,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken, requireUser, requireAuth } from "../middlewares/auth";

const authRouter = Router();

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40) || "org"
  );
}

async function ensureUniqueSlug(base: string): Promise<string> {
  let slug = base;
  let i = 1;
  while (true) {
    const [row] = await db.select().from(organizationsTable).where(eq(organizationsTable.slug, slug));
    if (!row) return slug;
    i += 1;
    slug = `${base}-${i}`;
  }
}

/** Sign up a new user (does not create an org yet). */
authRouter.post("/auth/signup", async (req, res) => {
  const { name, email, password } = req.body ?? {};
  if (!name || !email || !password) {
    res.status(400).json({ error: "name, email, password required" });
    return;
  }
  if (typeof password !== "string" || password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }
  const normalizedEmail = String(email).trim().toLowerCase();
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, normalizedEmail));
  if (existing) {
    res.status(409).json({ error: "An account with this email already exists" });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db
    .insert(usersTable)
    .values({ name, email: normalizedEmail, passwordHash, isActive: true })
    .returning();
  const token = signToken({ userId: user.id, email: user.email, activeOrgId: null });
  res.status(201).json({
    token,
    user: { id: user.id, name: user.name, email: user.email },
    activeOrgId: null,
    organizations: [],
  });
});

/** Sign up a user and immediately create an organization (one-shot onboarding). */
authRouter.post("/auth/signup-with-org", async (req, res) => {
  const { name, email, password, organizationName, industry } = req.body ?? {};
  if (!name || !email || !password || !organizationName) {
    res.status(400).json({ error: "name, email, password, organizationName required" });
    return;
  }
  if (typeof password !== "string" || password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }
  const normalizedEmail = String(email).trim().toLowerCase();
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, normalizedEmail));
  if (existing) {
    res.status(409).json({ error: "An account with this email already exists" });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db
    .insert(usersTable)
    .values({ name, email: normalizedEmail, passwordHash, isActive: true })
    .returning();
  const slug = await ensureUniqueSlug(slugify(organizationName));
  const [org] = await db
    .insert(organizationsTable)
    .values({
      name: organizationName,
      slug,
      plan: "free",
      industry: industry ?? null,
      limits: { ...DEFAULT_LIMITS },
      modules: { ...DEFAULT_MODULES },
      createdById: user.id,
    })
    .returning();
  await db.insert(organizationMembersTable).values({
    organizationId: org.id,
    userId: user.id,
    role: "owner",
  });
  const token = signToken({ userId: user.id, email: user.email, activeOrgId: org.id });
  res.status(201).json({
    token,
    user: { id: user.id, name: user.name, email: user.email },
    activeOrgId: org.id,
    organizations: [{ id: org.id, name: org.name, slug: org.slug, role: "owner" }],
  });
});

authRouter.post("/auth/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    res.status(400).json({ error: "email and password required" });
    return;
  }
  const normalizedEmail = String(email).trim().toLowerCase();
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, normalizedEmail));
  if (!user || !user.isActive) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  await db.update(usersTable).set({ lastLogin: new Date() }).where(eq(usersTable.id, user.id));

  const memberships = await db
    .select({
      orgId: organizationMembersTable.organizationId,
      role: organizationMembersTable.role,
      orgName: organizationsTable.name,
      orgSlug: organizationsTable.slug,
    })
    .from(organizationMembersTable)
    .innerJoin(organizationsTable, eq(organizationsTable.id, organizationMembersTable.organizationId))
    .where(eq(organizationMembersTable.userId, user.id));

  const activeOrgId = memberships[0]?.orgId ?? null;
  const token = signToken({ userId: user.id, email: user.email, activeOrgId });
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email },
    activeOrgId,
    organizations: memberships.map((m) => ({
      id: m.orgId,
      name: m.orgName,
      slug: m.orgSlug,
      role: m.role,
    })),
  });
});

authRouter.get("/auth/me", requireUser, async (req, res) => {
  const userId = req.user!.userId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const memberships = await db
    .select({
      orgId: organizationMembersTable.organizationId,
      role: organizationMembersTable.role,
      orgName: organizationsTable.name,
      orgSlug: organizationsTable.slug,
    })
    .from(organizationMembersTable)
    .innerJoin(organizationsTable, eq(organizationsTable.id, organizationMembersTable.organizationId))
    .where(eq(organizationMembersTable.userId, userId));

  res.json({
    user: { id: user.id, name: user.name, email: user.email, phone: user.phone ?? null },
    activeOrgId: req.user!.activeOrgId,
    organizations: memberships.map((m) => ({
      id: m.orgId,
      name: m.orgName,
      slug: m.orgSlug,
      role: m.role,
    })),
  });
});

/** Switch the active organization in the user's session (returns a new token). */
authRouter.post("/auth/switch-org", requireUser, async (req, res) => {
  const { organizationId } = req.body ?? {};
  if (!organizationId) {
    res.status(400).json({ error: "organizationId required" });
    return;
  }
  const memberships = await db
    .select()
    .from(organizationMembersTable)
    .where(eq(organizationMembersTable.userId, req.user!.userId));
  const targetMembership = memberships.find((m) => m.organizationId === Number(organizationId));
  if (!targetMembership) {
    res.status(403).json({ error: "Not a member of that organization" });
    return;
  }
  const token = signToken({
    userId: req.user!.userId,
    email: req.user!.email,
    activeOrgId: Number(organizationId),
  });
  res.json({ token, activeOrgId: Number(organizationId), role: targetMembership.role });
});

authRouter.post("/auth/logout", requireAuth, async (_req, res) => {
  res.json({ message: "Logged out" });
});

export default authRouter;
