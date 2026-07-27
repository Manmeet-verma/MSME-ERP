import { Router } from "express";
import crypto from "node:crypto";
import { getDb } from "../lib/firebase";
import { requireAuth, requireUser, requireOwner, requireAdmin, signToken } from "../middlewares/auth";
import { logAction } from "../lib/auditLog";

const db = () => getDb();

const orgRouter = Router();

const DEFAULT_LIMITS = {
  clients: 100,
  products: 100,
  quotations: 100,
  addons: 100,
};

const DEFAULT_MODULES = {
  sales: true,
  inventory: true,
  payroll: false,
  reports: true,
};

const DEFAULT_PAYROLL_SETTINGS = {
  autoRunDay: 1,
  autoRunEnabled: false,
  emailPayslips: false,
};

type OrgModules = Partial<typeof DEFAULT_MODULES>;
type OrgPayrollSettings = Partial<typeof DEFAULT_PAYROLL_SETTINGS>;

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
    const snap = await db().collection("organizations").where("slug", "==", slug).get();
    if (snap.empty) return slug;
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
  const orgData = {
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
    salesSettings: {},
    payrollSettings: { ...DEFAULT_PAYROLL_SETTINGS },
    createdById: req.user!.userId,
    createdAt: new Date().toISOString(),
  };
  const orgRef = await db().collection("organizations").add(orgData);
  await db().collection("organization_members").add({
    organizationId: orgRef.id,
    userId: req.user!.userId,
    role: "owner",
    joinedAt: new Date().toISOString(),
  });
  const token = signToken({
    userId: req.user!.userId,
    email: req.user!.email,
    activeOrgId: orgRef.id,
  });
  res.status(201).json({
    token,
    organization: formatOrg({ id: orgRef.id, ...orgData }),
    role: "owner",
  });
});

function formatOrg(o: any) {
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
    salesSettings: o.salesSettings,
    payrollSettings: { ...DEFAULT_PAYROLL_SETTINGS, ...(o.payrollSettings ?? {}) },
    createdAt: o.createdAt,
  };
}

orgRouter.get("/organizations/current", requireAuth, async (req, res) => {
  const snap = await db().collection("organizations").doc(req.user!.organizationId).get();
  if (!snap.exists) {
    res.status(404).json({ error: "Organization not found" });
    return;
  }
  res.json(formatOrg({ id: snap.id, ...snap.data() }));
});

orgRouter.patch("/organizations/current", requireAuth, requireAdmin, async (req, res) => {
  const { name, industry, gstNumber, state, address, phone, salesSettings, payrollSettings } = req.body ?? {};
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (industry !== undefined) updates.industry = industry;
  if (gstNumber !== undefined) updates.gstNumber = gstNumber;
  if (state !== undefined) updates.state = state;
  if (address !== undefined) updates.address = address;
  if (phone !== undefined) updates.phone = phone;
  if (salesSettings !== undefined && typeof salesSettings === "object" && salesSettings !== null) {
    const currentSnap = await db().collection("organizations").doc(req.user!.organizationId).get();
    const current = currentSnap.data();
    updates.salesSettings = {
      ...(current?.salesSettings ?? {}),
      ...(salesSettings as Record<string, boolean>),
    };
  }
  if (payrollSettings !== undefined && typeof payrollSettings === "object" && payrollSettings !== null) {
    const currentSnap = await db().collection("organizations").doc(req.user!.organizationId).get();
    const current = currentSnap.data();
    const incoming = payrollSettings as Partial<OrgPayrollSettings>;
    const merged: OrgPayrollSettings = {
      ...DEFAULT_PAYROLL_SETTINGS,
      ...(current?.payrollSettings ?? {}),
      ...incoming,
    };
    // Clamp autoRunDay to 1–28 to avoid month-edge cases.
    const day = Math.round(Number(merged.autoRunDay));
    merged.autoRunDay = Number.isFinite(day) ? Math.min(28, Math.max(1, day)) : 1;
    merged.autoRunEnabled = Boolean(merged.autoRunEnabled);
    merged.emailPayslips = Boolean(merged.emailPayslips);
    updates.payrollSettings = merged;
  }
  await db().collection("organizations").doc(req.user!.organizationId).update(updates);
  const updatedSnap = await db().collection("organizations").doc(req.user!.organizationId).get();
  const org = { id: updatedSnap.id, ...updatedSnap.data() };
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
  const currentSnap = await db().collection("organizations").doc(req.user!.organizationId).get();
  const current = currentSnap.data();
  const merged: OrgModules = { ...current?.modules, ...modules };
  await db().collection("organizations").doc(req.user!.organizationId).update({ modules: merged });
  const updatedSnap = await db().collection("organizations").doc(req.user!.organizationId).get();
  const org = { id: updatedSnap.id, ...updatedSnap.data() };
  await logAction(req, "UPDATE", "organization_modules", org.id, JSON.stringify(modules));
  res.json(formatOrg(org));
});

// ── Members ────────────────────────────────────────────────────────────────

orgRouter.get("/organizations/current/members", requireAuth, async (req, res) => {
  const memberSnap = await db()
    .collection("organization_members")
    .where("organizationId", "==", req.user!.organizationId)
    .get();
  const members = memberSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const rows = await Promise.all(
    members.map(async (m: any) => {
      const userSnap = await db().collection("users").doc(m.userId).get();
      const user = userSnap.data();
      return {
        id: m.id,
        userId: m.userId,
        name: user?.name ?? null,
        email: user?.email ?? null,
        role: m.role,
        isActive: user?.isActive ?? null,
        lastLogin: user?.lastLogin ?? null,
        joinedAt: m.joinedAt,
      };
    }),
  );
  res.json(
    rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      name: r.name,
      email: r.email,
      role: r.role,
      isActive: r.isActive,
      lastLogin: r.lastLogin ?? null,
      joinedAt: r.joinedAt,
    })),
  );
});

orgRouter.patch(
  "/organizations/current/members/:userId",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const { role } = req.body ?? {};
    const targetUserId = req.params.userId;
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
    const existingSnap = await db()
      .collection("organization_members")
      .where("organizationId", "==", req.user!.organizationId)
      .where("userId", "==", targetUserId)
      .get();
    if (existingSnap.empty) {
      res.status(404).json({ error: "Member not found" });
      return;
    }
    const existingDoc = existingSnap.docs[0];
    const existing = existingDoc.data();
    if (existing.role === "owner" && req.user!.role !== "owner") {
      res.status(403).json({ error: "Only the owner can change the owner's role" });
      return;
    }
    await db().collection("organization_members").doc(existingDoc.id).update({ role });
    res.json({ id: existingDoc.id, userId: targetUserId, role });
  },
);

orgRouter.delete(
  "/organizations/current/members/:userId",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const targetUserId = String(req.params.userId);
    if (targetUserId === req.user!.userId) {
      res.status(400).json({ error: "Cannot remove yourself. Transfer ownership first." });
      return;
    }
    const targetSnap = await db()
      .collection("organization_members")
      .where("organizationId", "==", req.user!.organizationId)
      .where("userId", "==", targetUserId)
      .get();
    if (targetSnap.empty) {
      res.status(404).json({ error: "Member not found" });
      return;
    }
    const targetDoc = targetSnap.docs[0];
    const target = targetDoc.data();
    if (target.role === "owner") {
      res.status(403).json({ error: "Cannot remove the owner" });
      return;
    }
    await db().collection("organization_members").doc(targetDoc.id).delete();
    await logAction(req, "DELETE", "member", targetUserId, "Removed member");
    res.json({ message: "Member removed" });
  },
);

// ── Invitations ────────────────────────────────────────────────────────────

orgRouter.get("/organizations/current/invitations", requireAuth, requireAdmin, async (req, res) => {
  const snap = await db()
    .collection("invitations")
    .where("organizationId", "==", req.user!.organizationId)
    .get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  res.json(
    rows.map((i: any) => ({
      id: i.id,
      email: i.email,
      role: i.role,
      token: i.token,
      acceptedAt: i.acceptedAt ?? null,
      expiresAt: i.expiresAt,
      createdAt: i.createdAt,
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
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const invData = {
    organizationId: req.user!.organizationId,
    email: String(email).trim().toLowerCase(),
    role,
    token,
    invitedById: req.user!.userId,
    expiresAt,
    acceptedAt: null,
    createdAt: new Date().toISOString(),
  };
  const invRef = await db().collection("invitations").add(invData);
  await logAction(req, "CREATE", "invitation", invRef.id, `Invited ${email} as ${role}`);
  res.status(201).json({
    id: invRef.id,
    email: invData.email,
    role: invData.role,
    token: invData.token,
    acceptUrl: `/accept-invite/${invData.token}`,
    expiresAt: invData.expiresAt,
    createdAt: invData.createdAt,
  });
});

orgRouter.delete(
  "/organizations/current/invitations/:id",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const invSnap = await db()
      .collection("invitations")
      .where("organizationId", "==", req.user!.organizationId)
      .get();
    const invDoc = invSnap.docs.find((d) => d.id === req.params.id);
    if (invDoc) {
      await db().collection("invitations").doc(invDoc.id).delete();
    }
    res.json({ message: "Invitation revoked" });
  },
);

/** Public: look up an invitation by token (used by the accept-invite page). */
orgRouter.get("/invitations/:token", async (req, res) => {
  const invSnap = await db()
    .collection("invitations")
    .where("token", "==", String(req.params.token))
    .get();
  if (invSnap.empty) {
    res.status(404).json({ error: "Invitation not found" });
    return;
  }
  const invDoc = invSnap.docs[0];
  const inv = invDoc.data();
  const orgSnap = await db().collection("organizations").doc(inv.organizationId).get();
  const org = orgSnap.data();
  res.json({
    email: inv.email,
    role: inv.role,
    organizationId: inv.organizationId,
    organizationName: org?.name ?? null,
    accepted: !!inv.acceptedAt,
    expired: new Date(inv.expiresAt) < new Date(),
    expiresAt: inv.expiresAt,
  });
});

/** Accept an invitation; requires the user to be signed in. */
orgRouter.post("/invitations/:token/accept", requireUser, async (req, res) => {
  const invSnap = await db()
    .collection("invitations")
    .where("token", "==", String(req.params.token))
    .get();
  if (invSnap.empty) {
    res.status(404).json({ error: "Invitation not found" });
    return;
  }
  const invDoc = invSnap.docs[0];
  const inv = invDoc.data();
  if (inv.acceptedAt) {
    res.status(400).json({ error: "Invitation already accepted" });
    return;
  }
  if (new Date(inv.expiresAt) < new Date()) {
    res.status(400).json({ error: "Invitation expired" });
    return;
  }
  if (inv.email.toLowerCase() !== req.user!.email.toLowerCase()) {
    res.status(403).json({ error: "This invitation is for a different email address" });
    return;
  }
  // Idempotent: if already a member, just mark accepted.
  const existingSnap = await db()
    .collection("organization_members")
    .where("organizationId", "==", inv.organizationId)
    .where("userId", "==", req.user!.userId)
    .get();
  if (existingSnap.empty) {
    await db().collection("organization_members").add({
      organizationId: inv.organizationId,
      userId: req.user!.userId,
      role: inv.role,
      invitedById: inv.invitedById ?? null,
      joinedAt: new Date().toISOString(),
    });
  }
  await db().collection("invitations").doc(invDoc.id).update({ acceptedAt: new Date().toISOString() });

  const token = signToken({
    userId: req.user!.userId,
    email: req.user!.email,
    activeOrgId: inv.organizationId,
  });
  res.json({ token, activeOrgId: inv.organizationId, role: inv.role });
});

export default orgRouter;
