import { Router } from "express";
import crypto from "node:crypto";
import {
  db,
  organizationsTable,
  organizationMembersTable,
  invitationsTable,
  usersTable,
  DEFAULT_LIMITS,
  DEFAULT_MODULES,
  type OrgModules,
} from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { requireAuth, requireUser, requireOwner, requireAdmin, signToken } from "../middlewares/auth";
import { logAction } from "../lib/auditLog";

const orgRouter = Router();

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

/** Create a new organization (any signed-in user can; becomes owner). */
orgRouter.post("/organizations", requireUser, async (req, res) => {
  const { name, industry, gstNumber, state, address, phone } = req.body ?? {};
  if (!name) {
    res.status(400).json({ error: "name required" });
    return;
  }
  const slug = await ensureUniqueSlug(slugify(name));
  const [org] = await db
    .insert(organizationsTable)
    .values({
      name,
      slug,
      plan: "free",
      industry: industry ?? null,
      gstNumber: gstNumber ?? null,
      state: state ?? null,
      address: address ?? null,
      phone: phone ?? null,
      limits: { ...DEFAULT_LIMITS },
      modules: { ...DEFAULT_MODULES },
      createdById: req.user!.userId,
    })
    .returning();
  await db.insert(organizationMembersTable).values({
    organizationId: org.id,
    userId: req.user!.userId,
    role: "owner",
  });
  const token = signToken({
    userId: req.user!.userId,
    email: req.user!.email,
    activeOrgId: org.id,
  });
  res.status(201).json({
    token,
    organization: formatOrg(org),
    role: "owner",
  });
});

function formatOrg(o: typeof organizationsTable.$inferSelect) {
  return {
    id: o.id,
    name: o.name,
    slug: o.slug,
    plan: o.plan,
    industry: o.industry ?? null,
    gstNumber: o.gstNumber ?? null,
    state: o.state ?? null,
    address: o.address ?? null,
    phone: o.phone ?? null,
    limits: o.limits,
    modules: o.modules,
    createdAt: o.createdAt.toISOString(),
  };
}

orgRouter.get("/organizations/current", requireAuth, async (req, res) => {
  const [org] = await db
    .select()
    .from(organizationsTable)
    .where(eq(organizationsTable.id, req.user!.organizationId));
  if (!org) {
    res.status(404).json({ error: "Organization not found" });
    return;
  }
  res.json(formatOrg(org));
});

orgRouter.patch("/organizations/current", requireAuth, requireAdmin, async (req, res) => {
  const { name, industry, gstNumber, state, address, phone } = req.body ?? {};
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (industry !== undefined) updates.industry = industry;
  if (gstNumber !== undefined) updates.gstNumber = gstNumber;
  if (state !== undefined) updates.state = state;
  if (address !== undefined) updates.address = address;
  if (phone !== undefined) updates.phone = phone;
  const [org] = await db
    .update(organizationsTable)
    .set(updates)
    .where(eq(organizationsTable.id, req.user!.organizationId))
    .returning();
  await logAction(req, "UPDATE", "organization", org.id, "Updated organization profile");
  res.json(formatOrg(org));
});

/** Update which modules are enabled. */
orgRouter.put("/organizations/current/modules", requireAuth, requireOwner, async (req, res) => {
  const modules = req.body as Partial<OrgModules>;
  if (!modules || typeof modules !== "object") {
    res.status(400).json({ error: "modules object required" });
    return;
  }
  const [current] = await db
    .select()
    .from(organizationsTable)
    .where(eq(organizationsTable.id, req.user!.organizationId));
  const merged: OrgModules = { ...current.modules, ...modules };
  const [org] = await db
    .update(organizationsTable)
    .set({ modules: merged })
    .where(eq(organizationsTable.id, req.user!.organizationId))
    .returning();
  await logAction(req, "UPDATE", "organization_modules", org.id, JSON.stringify(modules));
  res.json(formatOrg(org));
});

// ── Members ────────────────────────────────────────────────────────────────

orgRouter.get("/organizations/current/members", requireAuth, async (req, res) => {
  const rows = await db
    .select({
      id: organizationMembersTable.id,
      userId: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      role: organizationMembersTable.role,
      joinedAt: organizationMembersTable.joinedAt,
      lastLogin: usersTable.lastLogin,
      isActive: usersTable.isActive,
    })
    .from(organizationMembersTable)
    .innerJoin(usersTable, eq(usersTable.id, organizationMembersTable.userId))
    .where(eq(organizationMembersTable.organizationId, req.user!.organizationId));
  res.json(
    rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      name: r.name,
      email: r.email,
      role: r.role,
      isActive: r.isActive,
      lastLogin: r.lastLogin?.toISOString() ?? null,
      joinedAt: r.joinedAt.toISOString(),
    })),
  );
});

orgRouter.patch(
  "/organizations/current/members/:userId",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const { role } = req.body ?? {};
    const targetUserId = Number(req.params.userId);
    if (!role || !["owner", "admin", "sales", "viewer"].includes(role)) {
      res.status(400).json({ error: "Invalid role" });
      return;
    }
    if (role === "owner" && req.user!.role !== "owner") {
      res.status(403).json({ error: "Only the owner can promote to owner" });
      return;
    }
    if (targetUserId === req.user!.userId && req.user!.role === "owner" && role !== "owner") {
      res.status(403).json({ error: "Owner cannot self-demote. Transfer ownership first." });
      return;
    }
    const [existing] = await db
      .select()
      .from(organizationMembersTable)
      .where(
        and(
          eq(organizationMembersTable.organizationId, req.user!.organizationId),
          eq(organizationMembersTable.userId, targetUserId),
        ),
      );
    if (!existing) {
      res.status(404).json({ error: "Member not found" });
      return;
    }
    if (existing.role === "owner" && req.user!.role !== "owner") {
      res.status(403).json({ error: "Only the owner can change the owner's role" });
      return;
    }
    const [member] = await db
      .update(organizationMembersTable)
      .set({ role })
      .where(eq(organizationMembersTable.id, existing.id))
      .returning();
    await logAction(req, "UPDATE", "member", targetUserId, `Role changed to ${role}`);
    res.json({ id: member.id, userId: member.userId, role: member.role });
  },
);

orgRouter.delete(
  "/organizations/current/members/:userId",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const targetUserId = Number(req.params.userId);
    if (targetUserId === req.user!.userId) {
      res.status(400).json({ error: "Cannot remove yourself. Transfer ownership first." });
      return;
    }
    const [target] = await db
      .select()
      .from(organizationMembersTable)
      .where(
        and(
          eq(organizationMembersTable.organizationId, req.user!.organizationId),
          eq(organizationMembersTable.userId, targetUserId),
        ),
      );
    if (!target) {
      res.status(404).json({ error: "Member not found" });
      return;
    }
    if (target.role === "owner") {
      res.status(403).json({ error: "Cannot remove the owner" });
      return;
    }
    await db
      .delete(organizationMembersTable)
      .where(eq(organizationMembersTable.id, target.id));
    await logAction(req, "DELETE", "member", targetUserId, "Removed member");
    res.json({ message: "Member removed" });
  },
);

// ── Invitations ────────────────────────────────────────────────────────────

orgRouter.get("/organizations/current/invitations", requireAuth, requireAdmin, async (req, res) => {
  const rows = await db
    .select()
    .from(invitationsTable)
    .where(eq(invitationsTable.organizationId, req.user!.organizationId));
  res.json(
    rows.map((i) => ({
      id: i.id,
      email: i.email,
      role: i.role,
      token: i.token,
      acceptedAt: i.acceptedAt?.toISOString() ?? null,
      expiresAt: i.expiresAt.toISOString(),
      createdAt: i.createdAt.toISOString(),
    })),
  );
});

orgRouter.post("/organizations/current/invitations", requireAuth, requireAdmin, async (req, res) => {
  const { email, role } = req.body ?? {};
  if (!email || !role) {
    res.status(400).json({ error: "email and role required" });
    return;
  }
  if (!["admin", "sales", "viewer"].includes(role)) {
    res.status(400).json({ error: "Invalid role" });
    return;
  }
  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const [inv] = await db
    .insert(invitationsTable)
    .values({
      organizationId: req.user!.organizationId,
      email: String(email).trim().toLowerCase(),
      role,
      token,
      invitedById: req.user!.userId,
      expiresAt,
    })
    .returning();
  await logAction(req, "CREATE", "invitation", inv.id, `Invited ${email} as ${role}`);
  res.status(201).json({
    id: inv.id,
    email: inv.email,
    role: inv.role,
    token: inv.token,
    acceptUrl: `/accept-invite/${inv.token}`,
    expiresAt: inv.expiresAt.toISOString(),
    createdAt: inv.createdAt.toISOString(),
  });
});

orgRouter.delete(
  "/organizations/current/invitations/:id",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    await db
      .delete(invitationsTable)
      .where(
        and(
          eq(invitationsTable.id, Number(req.params.id)),
          eq(invitationsTable.organizationId, req.user!.organizationId),
        ),
      );
    res.json({ message: "Invitation revoked" });
  },
);

/** Public: look up an invitation by token (used by the accept-invite page). */
orgRouter.get("/invitations/:token", async (req, res) => {
  const [inv] = await db
    .select({
      id: invitationsTable.id,
      email: invitationsTable.email,
      role: invitationsTable.role,
      token: invitationsTable.token,
      acceptedAt: invitationsTable.acceptedAt,
      expiresAt: invitationsTable.expiresAt,
      organizationId: invitationsTable.organizationId,
      organizationName: organizationsTable.name,
    })
    .from(invitationsTable)
    .innerJoin(organizationsTable, eq(organizationsTable.id, invitationsTable.organizationId))
    .where(eq(invitationsTable.token, String(req.params.token)));
  if (!inv) {
    res.status(404).json({ error: "Invitation not found" });
    return;
  }
  res.json({
    email: inv.email,
    role: inv.role,
    organizationId: inv.organizationId,
    organizationName: inv.organizationName,
    accepted: !!inv.acceptedAt,
    expired: inv.expiresAt < new Date(),
    expiresAt: inv.expiresAt.toISOString(),
  });
});

/** Accept an invitation; requires the user to be signed in. */
orgRouter.post("/invitations/:token/accept", requireUser, async (req, res) => {
  const [inv] = await db
    .select()
    .from(invitationsTable)
    .where(eq(invitationsTable.token, String(req.params.token)));
  if (!inv) {
    res.status(404).json({ error: "Invitation not found" });
    return;
  }
  if (inv.acceptedAt) {
    res.status(400).json({ error: "Invitation already accepted" });
    return;
  }
  if (inv.expiresAt < new Date()) {
    res.status(400).json({ error: "Invitation expired" });
    return;
  }
  if (inv.email.toLowerCase() !== req.user!.email.toLowerCase()) {
    res.status(403).json({ error: "This invitation is for a different email address" });
    return;
  }
  // Idempotent: if already a member, just mark accepted.
  const [existing] = await db
    .select()
    .from(organizationMembersTable)
    .where(
      and(
        eq(organizationMembersTable.organizationId, inv.organizationId),
        eq(organizationMembersTable.userId, req.user!.userId),
      ),
    );
  if (!existing) {
    await db.insert(organizationMembersTable).values({
      organizationId: inv.organizationId,
      userId: req.user!.userId,
      role: inv.role,
      invitedById: inv.invitedById ?? null,
    });
  }
  await db
    .update(invitationsTable)
    .set({ acceptedAt: new Date() })
    .where(eq(invitationsTable.id, inv.id));

  const token = signToken({
    userId: req.user!.userId,
    email: req.user!.email,
    activeOrgId: inv.organizationId,
  });
  res.json({ token, activeOrgId: inv.organizationId, role: inv.role });
});

export default orgRouter;
