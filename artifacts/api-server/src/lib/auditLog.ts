import { db, auditLogsTable } from "@workspace/db";
import { Request } from "express";

export async function logAction(
  req: Request,
  action: string,
  entity: string,
  entityId?: number,
  details?: string
): Promise<void> {
  await db.insert(auditLogsTable).values({
    userId: req.user?.userId ?? null,
    action,
    entity,
    entityId: entityId ?? null,
    details: details ?? null,
    ipAddress: req.ip ?? null,
  });
}
