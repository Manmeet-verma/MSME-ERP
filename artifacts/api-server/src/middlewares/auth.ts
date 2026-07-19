import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { getDb } from "../lib/firebase";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const JWT_EXPIRES_IN = "30d";

export type MemberRole = "owner" | "admin" | "sales" | "viewer";

export interface AuthContext {
  userId: string;
  email: string;
  activeOrgId: string | null;
  organizationId: string;
  role: MemberRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthContext;
    }
  }
}

export function signToken(payload: { userId: string; email: string; activeOrgId: string | null }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): { userId: string; email: string; activeOrgId: string | null } {
  return jwt.verify(token, JWT_SECRET) as { userId: string; email: string; activeOrgId: string | null };
}

/** Auth without requiring an active org */
export async function requireUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Missing auth token" });
      return;
    }
    const token = header.slice(7);
    const decoded = verifyToken(token);

    const userSnap = await getDb().collection("users").doc(decoded.userId).get();
    const user = userSnap.data();
    if (!user || !user.isActive) {
      res.status(401).json({ error: "User not found or inactive" });
      return;
    }

    req.user = {
      userId: decoded.userId,
      email: user.email,
      activeOrgId: decoded.activeOrgId,
      organizationId: decoded.activeOrgId ?? "",
      role: "viewer",
    };
    next();
  } catch {
    res.status(401).json({ error: "Invalid auth token" });
  }
}

/** Full tenant-aware auth */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Missing auth token" });
      return;
    }
    const token = header.slice(7);
    const decoded = verifyToken(token);

    if (!decoded.activeOrgId) {
      res.status(403).json({ error: "No active organization. Create or select one first." });
      return;
    }

    const userSnap = await getDb().collection("users").doc(decoded.userId).get();
    const user = userSnap.data();
    if (!user || !user.isActive) {
      res.status(401).json({ error: "User not found or inactive" });
      return;
    }

    // Find membership
    const memberSnap = await getDb()
      .collection("organization_members")
      .where("userId", "==", decoded.userId)
      .where("organizationId", "==", decoded.activeOrgId)
      .limit(1)
      .get();

    if (memberSnap.empty) {
      res.status(403).json({ error: "You are not a member of this organization." });
      return;
    }

    const member = memberSnap.docs[0].data();

    const orgSnap = await getDb().collection("organizations").doc(decoded.activeOrgId).get();
    if (!orgSnap.exists) {
      res.status(404).json({ error: "Organization not found" });
      return;
    }

    req.user = {
      userId: decoded.userId,
      email: user.email,
      activeOrgId: decoded.activeOrgId,
      organizationId: decoded.activeOrgId,
      role: member.role as MemberRole,
    };
    next();
  } catch {
    res.status(401).json({ error: "Invalid auth token" });
  }
}

export function requireRole(...roles: MemberRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: `Requires role: ${roles.join(" or ")}` });
      return;
    }
    next();
  };
}

export const requireOwner = requireRole("owner");
export const requireAdmin = requireRole("owner", "admin");
export const requireSales = requireRole("owner", "admin", "sales");
