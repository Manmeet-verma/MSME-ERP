import { Router } from "express";
import bcrypt from "bcryptjs";
import { getDb } from "../lib/firebase";
import { signToken, requireUser, requireAuth } from "../middlewares/auth";

const authRouter = Router();
const db = () => getDb();

const DEFAULT_LIMITS = { members: 3, leadsPerMonth: 50, emailsPerMonth: 100, storageMB: 100 };
const DEFAULT_MODULES = {
  sales: true, leads: true, inventory: false, purchase: false,
  marketing: false, hr: false, accounting: false, social: false,
};

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
    const snap = await db().collection("organizations").where("slug", "==", slug).limit(1).get();
    if (snap.empty) return slug;
    i += 1;
    slug = `${base}-${i}`;
  }
}

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
  const existing = await db().collection("users").where("email", "==", normalizedEmail).limit(1).get();
  if (!existing.empty) {
    const existingUser = existing.docs[0].data();
    const ok = await bcrypt.compare(password, existingUser.passwordHash);
    if (ok) {
      const userDoc = existing.docs[0];
      await userDoc.ref.update({ lastLogin: new Date().toISOString() });
      const memberSnap = await db().collection("organization_members").where("userId", "==", userDoc.id).get();
      let activeOrgId: string | null = null;
      const orgs: Array<{ id: string; name: string; slug: string; role: string }> = [];
      for (const mDoc of memberSnap.docs) {
        const m = mDoc.data();
        const orgSnap = await db().collection("organizations").doc(m.organizationId).get();
        if (orgSnap.exists) {
          const org = orgSnap.data()!;
          orgs.push({ id: m.organizationId, name: org.name, slug: org.slug, role: m.role });
          if (!activeOrgId) activeOrgId = m.organizationId;
        }
      }
      const token = signToken({ userId: userDoc.id, email: normalizedEmail, activeOrgId });
      res.json({ token, user: { id: userDoc.id, name: existingUser.name, email: normalizedEmail }, activeOrgId, organizations: orgs });
      return;
    }
    res.status(409).json({ error: "An account with this email already exists" });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const userRef = await db().collection("users").add({
    name,
    email: normalizedEmail,
    passwordHash,
    phone: null,
    isActive: true,
    lastLogin: null,
    createdAt: new Date().toISOString(),
  });
  const token = signToken({ userId: userRef.id, email: normalizedEmail, activeOrgId: null });
  res.status(201).json({
    token,
    user: { id: userRef.id, name, email: normalizedEmail },
    activeOrgId: null,
    organizations: [],
  });
});

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
  const existing = await db().collection("users").where("email", "==", normalizedEmail).limit(1).get();
  if (!existing.empty) {
    const existingUser = existing.docs[0].data();
    const ok = await bcrypt.compare(password, existingUser.passwordHash);
    if (ok) {
      const userDoc = existing.docs[0];
      await userDoc.ref.update({ lastLogin: new Date().toISOString() });
      const memberSnap = await db().collection("organization_members").where("userId", "==", userDoc.id).get();
      let activeOrgId: string | null = null;
      const orgs: Array<{ id: string; name: string; slug: string; role: string }> = [];
      for (const mDoc of memberSnap.docs) {
        const m = mDoc.data();
        const orgSnap = await db().collection("organizations").doc(m.organizationId).get();
        if (orgSnap.exists) {
          const org = orgSnap.data()!;
          orgs.push({ id: m.organizationId, name: org.name, slug: org.slug, role: m.role });
          if (!activeOrgId) activeOrgId = m.organizationId;
        }
      }
      const token = signToken({ userId: userDoc.id, email: normalizedEmail, activeOrgId });
      res.json({ token, user: { id: userDoc.id, name: existingUser.name, email: normalizedEmail }, activeOrgId, organizations: orgs });
      return;
    }
    res.status(409).json({ error: "An account with this email already exists" });
    return;
  }

  const batch = db().batch();
  const passwordHash = await bcrypt.hash(password, 10);
  const userRef = db().collection("users").doc();
  batch.set(userRef, {
    name, email: normalizedEmail, passwordHash, phone: null,
    isActive: true, lastLogin: null, createdAt: new Date().toISOString(),
  });

  const slug = await ensureUniqueSlug(slugify(organizationName));
  const orgRef = db().collection("organizations").doc();
  batch.set(orgRef, {
    name: organizationName, slug, plan: "free", industry: industry ?? null,
    limits: { ...DEFAULT_LIMITS }, modules: { ...DEFAULT_MODULES },
    salesSettings: { allowOverselling: false, reserveStockOnDraft: false },
    payrollSettings: { autoRunEnabled: false, autoRunDay: 1, emailPayslips: false },
    gstNumber: null, state: null, address: null, phone: null,
    createdById: userRef.id, createdAt: new Date().toISOString(),
  });

  const memberRef = db().collection("organization_members").doc();
  batch.set(memberRef, {
    organizationId: orgRef.id, userId: userRef.id, role: "owner",
    invitedById: null, joinedAt: new Date().toISOString(),
  });

  await batch.commit();

  const token = signToken({ userId: userRef.id, email: normalizedEmail, activeOrgId: orgRef.id });
  res.status(201).json({
    token,
    user: { id: userRef.id, name, email: normalizedEmail },
    activeOrgId: orgRef.id,
    organizations: [{ id: orgRef.id, name: organizationName, slug, role: "owner" }],
  });
});

authRouter.post("/auth/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    res.status(400).json({ error: "email and password required" });
    return;
  }
  const normalizedEmail = String(email).trim().toLowerCase();
  const userSnap = await db().collection("users").where("email", "==", normalizedEmail).limit(1).get();
  if (userSnap.empty) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const userDoc = userSnap.docs[0];
  const user = userDoc.data();
  if (!user.isActive) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  await userDoc.ref.update({ lastLogin: new Date().toISOString() });

  const memberSnap = await db().collection("organization_members").where("userId", "==", userDoc.id).get();
  const memberships: Array<{ orgId: string; role: string; orgName: string; orgSlug: string }> = [];
  for (const mDoc of memberSnap.docs) {
    const m = mDoc.data();
    const orgSnap = await db().collection("organizations").doc(m.organizationId).get();
    if (orgSnap.exists) {
      const org = orgSnap.data()!;
      memberships.push({ orgId: m.organizationId, role: m.role, orgName: org.name, orgSlug: org.slug });
    }
  }

  const activeOrgId = memberships[0]?.orgId ?? null;
  const token = signToken({ userId: userDoc.id, email: user.email, activeOrgId });
  res.json({
    token,
    user: { id: userDoc.id, name: user.name, email: user.email },
    activeOrgId,
    organizations: memberships.map((m) => ({
      id: m.orgId, name: m.orgName, slug: m.orgSlug, role: m.role,
    })),
  });
});

authRouter.get("/auth/me", requireUser, async (req, res) => {
  const userId = req.user!.userId;
  const userSnap = await db().collection("users").doc(userId).get();
  if (!userSnap.exists) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const user = userSnap.data()!;

  const memberSnap = await db().collection("organization_members").where("userId", "==", userId).get();
  const memberships: Array<{ orgId: string; role: string; orgName: string; orgSlug: string }> = [];
  for (const mDoc of memberSnap.docs) {
    const m = mDoc.data();
    const orgSnap = await db().collection("organizations").doc(m.organizationId).get();
    if (orgSnap.exists) {
      const org = orgSnap.data()!;
      memberships.push({ orgId: m.organizationId, role: m.role, orgName: org.name, orgSlug: org.slug });
    }
  }

  res.json({
    user: { id: userId, name: user.name, email: user.email, phone: user.phone ?? null },
    activeOrgId: req.user!.activeOrgId,
    organizations: memberships.map((m) => ({
      id: m.orgId, name: m.orgName, slug: m.orgSlug, role: m.role,
    })),
  });
});

authRouter.post("/auth/switch-org", requireUser, async (req, res) => {
  const { organizationId } = req.body ?? {};
  if (!organizationId) {
    res.status(400).json({ error: "organizationId required" });
    return;
  }
  const memberSnap = await db().collection("organization_members")
    .where("userId", "==", req.user!.userId)
    .where("organizationId", "==", organizationId)
    .limit(1)
    .get();

  if (memberSnap.empty) {
    res.status(403).json({ error: "Not a member of that organization" });
    return;
  }
  const targetMembership = memberSnap.docs[0].data();
  const token = signToken({
    userId: req.user!.userId,
    email: req.user!.email,
    activeOrgId: organizationId,
  });
  res.json({ token, activeOrgId: organizationId, role: targetMembership.role });
});

authRouter.post("/auth/logout", requireAuth, async (_req, res) => {
  res.json({ message: "Logged out" });
});

export default authRouter;
