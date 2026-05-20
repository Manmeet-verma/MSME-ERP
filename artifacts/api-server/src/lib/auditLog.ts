import { db, auditLogsTable } from "@workspace/db";
import type { Request } from "express";

export async function logAction(
  req: Request,
  action: string,
  entity: string,
  entityId?: number,
  details?: string,
): Promise<void> {
  if (!req.user?.organizationId) return;
  await db.insert(auditLogsTable).values({
    organizationId: req.user.organizationId,
    userId: req.user?.userId ?? null,
    action,
    entity,
    entityId: entityId ?? null,
    details: details ?? null,
    ipAddress: req.ip ?? null,
  });
}
