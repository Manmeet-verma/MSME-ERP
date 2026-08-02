import { Router } from "express";
import { getDb } from "../lib/firebase";
import { requireAuth, requireOwner, requireAdmin } from "../middlewares/auth";
import { logAction } from "../lib/auditLog";

const db = () => getDb();
const rolesRouter = Router();

const DEFAULT_ROLES = [
  { key: "owner", name: "Owner", description: "Full access to everything", isSystem: true, isDefault: false },
  { key: "admin", name: "Admin", description: "Manage members and settings", isSystem: true, isDefault: false },
  { key: "sales", name: "Sales", description: "Standard sales access", isSystem: true, isDefault: false },
  { key: "sales_executive", name: "Sales Executive", description: "Sales with daily report duties", isSystem: true, isDefault: true },
  { key: "viewer", name: "Viewer", description: "Read-only access", isSystem: true, isDefault: false },
];

// Seed default roles for an org if none exist
async function ensureDefaultRoles(orgId: string) {
  const snap = await db().collection("roles").where("organizationId", "==", orgId).limit(1).get();
  if (snap.empty) {
    const batch = db().batch();
    for (const r of DEFAULT_ROLES) {
      const ref = db().collection("roles").doc();
      batch.set(ref, {
        organizationId: orgId,
        key: r.key,
        name: r.name,
        description: r.description,
        isSystem: r.isSystem,
        isDefault: r.isDefault,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    await batch.commit();
  }
}

// List all roles for the organization
rolesRouter.get("/roles", requireAuth, async (req, res) => {
  try {
    const orgId = req.user!.organizationId;
    await ensureDefaultRoles(orgId);
    const snap = await db().collection("roles").where("organizationId", "==", orgId).get();
    const roles = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    // Sort: system roles first, then alphabetically
    roles.sort((a: any, b: any) => {
      if (a.isSystem && !b.isSystem) return -1;
      if (!a.isSystem && b.isSystem) return 1;
      return String(a.name).localeCompare(String(b.name));
    });
    res.json(roles);
  } catch (err) {
    console.error("Failed to fetch roles:", err);
    res.status(500).json({ error: "Failed to fetch roles" });
  }
});

// Create a new custom role (owner/admin only)
rolesRouter.post("/roles", requireAuth, requireAdmin, async (req, res) => {
  try {
    const orgId = req.user!.organizationId;
    const { name, description, isDefault } = req.body ?? {};
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      res.status(400).json({ error: "Role name is required" });
      return;
    }
    const trimmedName = name.trim();
    if (trimmedName.length > 50) {
      res.status(400).json({ error: "Role name must be 50 characters or less" });
      return;
    }
    // Generate key from name
    const key = trimmedName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/(^_|_$)/g, "");

    // Check for duplicate key
    const existingSnap = await db()
      .collection("roles")
      .where("organizationId", "==", orgId)
      .where("key", "==", key)
      .limit(1)
      .get();
    if (!existingSnap.empty) {
      res.status(409).json({ error: `A role with the name "${trimmedName}" already exists` });
      return;
    }

    const roleData = {
      organizationId: orgId,
      key,
      name: trimmedName,
      description: description ?? "",
      isSystem: false,
      isDefault: Boolean(isDefault),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await db().collection("roles").add(roleData);
    await logAction(req, "CREATE", "role", docRef.id, `Created role "${trimmedName}"`);
    res.status(201).json({ id: docRef.id, ...roleData });
  } catch (err) {
    console.error("Failed to create role:", err);
    res.status(500).json({ error: "Failed to create role" });
  }
});

// Update a role (owner only for system roles, admin for custom)
rolesRouter.patch("/roles/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const orgId = req.user!.organizationId;
    const { id } = req.params;
    const { name, description, isDefault } = req.body ?? {};

    const doc = await db().collection("roles").doc(id).get();
    if (!doc.exists) {
      res.status(404).json({ error: "Role not found" });
      return;
    }
    const data = doc.data()!;
    if (data.organizationId !== orgId) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    // System roles can only be edited by owner
    if (data.isSystem && req.user!.role !== "owner") {
      res.status(403).json({ error: "Only the owner can edit system roles" });
      return;
    }

    // Cannot rename owner role
    if (data.key === "owner") {
      res.status(400).json({ error: "Cannot rename the Owner role" });
      return;
    }

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (name !== undefined) {
      const trimmedName = String(name).trim();
      if (trimmedName.length === 0) {
        res.status(400).json({ error: "Role name cannot be empty" });
        return;
      }
      updates.name = trimmedName;
    }
    if (description !== undefined) updates.description = String(description);
    if (isDefault !== undefined) updates.isDefault = Boolean(isDefault);

    await db().collection("roles").doc(id).update(updates);
    await logAction(req, "UPDATE", "role", id, `Updated role "${data.name}"`);
    const updated = await db().collection("roles").doc(id).get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (err) {
    console.error("Failed to update role:", err);
    res.status(500).json({ error: "Failed to update role" });
  }
});

// Delete a custom role (owner only)
rolesRouter.delete("/roles/:id", requireAuth, requireOwner, async (req, res) => {
  try {
    const orgId = req.user!.organizationId;
    const { id } = req.params;

    const doc = await db().collection("roles").doc(id).get();
    if (!doc.exists) {
      res.status(404).json({ error: "Role not found" });
      return;
    }
    const data = doc.data()!;
    if (data.organizationId !== orgId) {
      res.status(403).json({ error: "Access denied" });
      return;
    }
    if (data.isSystem) {
      res.status(400).json({ error: "Cannot delete a system role" });
      return;
    }

    // Check if any member uses this role
    const memberSnap = await db()
      .collection("organization_members")
      .where("organizationId", "==", orgId)
      .where("role", "==", data.key)
      .limit(1)
      .get();
    if (!memberSnap.empty) {
      res.status(400).json({ error: `Cannot delete "${data.name}" — ${memberSnap.size} member(s) currently have this role. Reassign them first.` });
      return;
    }

    await db().collection("roles").doc(id).delete();
    await logAction(req, "DELETE", "role", id, `Deleted role "${data.name}"`);
    res.json({ message: "Role deleted" });
  } catch (err) {
    console.error("Failed to delete role:", err);
    res.status(500).json({ error: "Failed to delete role" });
  }
});

export default rolesRouter;
