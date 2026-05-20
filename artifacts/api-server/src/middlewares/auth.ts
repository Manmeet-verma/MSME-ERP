import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db, organizationMembersTable, organizationsTable, usersTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const JWT_EXPIRES_IN = "7d";

export type MemberRole = "owner" | "admin" | "sales" | "viewer";

export interface AuthContext {
  userId: number;
  email: string;
  activeOrgId: number | null;
  organizationId: number;
  role: MemberRole;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthContext;
    }
  }
}

export function signToken(payload: { userId: number; email: string; activeOrgId: number | null }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): { userId: number; email: string; activeOrgId: number | null } {
  return jwt.verify(token, JWT_SECRET) as { userId: number; email: string; activeOrgId: number | null };
}

/** Auth without requiring an active org (used by signup-completion, org creation, list-my-orgs). */
export async function requireUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Missing auth token" });
      return;
    }
    const token = header.slice(7);
    const decoded = verifyToken(token);

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, decoded.userId));
    if (!user || !user.isActive) {
      res.status(401).json({ error: "User not found or inactive" });
      return;
    }

    req.user = {
      userId: user.id,
      email: user.email,
      activeOrgId: decoded.activeOrgId,
      organizationId: decoded.activeOrgId ?? 0,
      role: "viewer",
    };
    next();
  } catch {
    res.status(401).json({ error: "Invalid auth token" });
  }
}

/** Full tenant-aware auth: requires a valid active org and an active membership. */
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

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, decoded.userId));
    if (!user || !user.isActive) {
      res.status(401).json({ error: "User not found or inactive" });
      return;
    }

    const [member] = await db
      .select()
      .from(organizationMembersTable)
      .where(
        and(
          eq(organizationMembersTable.userId, decoded.userId),
          eq(organizationMembersTable.organizationId, decoded.activeOrgId),
        ),
      );
    if (!member) {
      res.status(403).json({ error: "You are not a member of this organization." });
      return;
    }

    const [org] = await db
      .select()
      .from(organizationsTable)
      .where(eq(organizationsTable.id, decoded.activeOrgId));
    if (!org) {
      res.status(404).json({ error: "Organization not found" });
      return;
    }

    req.user = {
      userId: user.id,
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
