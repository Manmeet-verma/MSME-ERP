import { getDb } from "./firebase";
import { FieldValue } from "firebase-admin/firestore";
import type { Request } from "express";

const db = () => getDb();

export async function logAction(
  req: Request,
  action: string,
  entity: string,
  entityId?: string,
  details?: string,
): Promise<void> {
  if (!req.user?.organizationId) return;
  await db().collection("auditLogs").add({
    organizationId: req.user.organizationId,
    userId: req.user?.userId ?? null,
    action,
    entity,
    entityId: entityId ?? null,
    details: details ?? null,
    ipAddress: req.ip ?? null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}
