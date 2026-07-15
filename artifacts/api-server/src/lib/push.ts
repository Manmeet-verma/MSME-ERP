import { getDb } from "./firebase";
import { FieldValue } from "firebase-admin/firestore";
import { logger } from "./logger";

const db = () => getDb();

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  channelId?: string;
  sound?: string;
}

interface ExpoTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
}

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

async function sendExpoBatch(tokens: string[], payload: PushPayload): Promise<{ sent: number; failed: number; invalidTokens: string[] }> {
  if (tokens.length === 0) return { sent: 0, failed: 0, invalidTokens: [] };
  const messages = tokens.map((to) => ({
    to,
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
    sound: payload.sound ?? "default",
    channelId: payload.channelId ?? "default",
    priority: "high" as const,
  }));
  try {
    const resp = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(messages),
      signal: AbortSignal.timeout(15_000),
    });
    if (!resp.ok) {
      logger.warn({ status: resp.status }, "Expo push HTTP error");
      return { sent: 0, failed: tokens.length, invalidTokens: [] };
    }
    const data = (await resp.json()) as { data?: ExpoTicket[] };
    const tickets = Array.isArray(data.data) ? data.data : [];
    let sent = 0;
    let failed = 0;
    const invalidTokens: string[] = [];
    tickets.forEach((t, i) => {
      if (t.status === "ok") sent++;
      else {
        failed++;
        if (t.details?.error === "DeviceNotRegistered") {
          invalidTokens.push(tokens[i]);
        }
      }
    });
    return { sent, failed, invalidTokens };
  } catch (err) {
    logger.error({ err }, "Expo push send failed");
    return { sent: 0, failed: tokens.length, invalidTokens: [] };
  }
}

export async function sendPushToTokens(tokens: string[], payload: PushPayload): Promise<{ sent: number; failed: number }> {
  if (tokens.length === 0) return { sent: 0, failed: 0 };
  let sent = 0;
  let failed = 0;
  const invalid: string[] = [];
  for (let i = 0; i < tokens.length; i += 100) {
    const batch = tokens.slice(i, i + 100);
    const r = await sendExpoBatch(batch, payload);
    sent += r.sent;
    failed += r.failed;
    invalid.push(...r.invalidTokens);
  }
  if (invalid.length > 0) {
    try {
      const writeBatch = db().batch();
      for (const token of invalid) {
        const snap = await db()
          .collection("pushTokens")
          .where("token", "==", token)
          .get();
        for (const doc of snap.docs) {
          writeBatch.delete(doc.ref);
        }
      }
      await writeBatch.commit();
    } catch (err) {
      logger.warn({ err }, "Failed to prune invalid push tokens");
    }
  }
  return { sent, failed };
}

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<{ sent: number; failed: number }> {
  const snap = await db()
    .collection("pushTokens")
    .where("userId", "==", userId)
    .get();
  return sendPushToTokens(snap.docs.map((d: FirebaseFirestore.QueryDocumentSnapshot) => d.data().token as string), payload);
}

export async function sendPushToOrg(orgId: string, payload: PushPayload): Promise<{ sent: number; failed: number }> {
  const snap = await db()
    .collection("pushTokens")
    .where("organizationId", "==", orgId)
    .get();
  return sendPushToTokens(snap.docs.map((d: FirebaseFirestore.QueryDocumentSnapshot) => d.data().token as string), payload);
}
