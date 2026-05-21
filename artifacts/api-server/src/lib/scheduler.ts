import { db, socialPostsTable } from "@workspace/db";
import { and, eq, lte, isNotNull } from "drizzle-orm";
import { logger } from "./logger";
import { publishPost } from "../routes/social";
import { tickDrips } from "../routes/marketing";
import { tickNotifications } from "./notifications";

let started = false;
let timer: NodeJS.Timeout | null = null;
let running = false;

async function tick() {
  if (running) return;
  running = true;
  try {
    // Social: publish any scheduled post whose time has arrived.
    const due = await db
      .select()
      .from(socialPostsTable)
      .where(
        and(
          eq(socialPostsTable.status, "scheduled"),
          isNotNull(socialPostsTable.scheduledAt),
          lte(socialPostsTable.scheduledAt, new Date()),
        ),
      )
      .limit(10);
    for (const post of due) {
      try {
        await publishPost(post.organizationId, post.id);
      } catch (err) {
        logger.error({ err, postId: post.id }, "Scheduled social publish failed");
      }
    }
    // Drips
    try {
      const r = await tickDrips();
      if (r.sent > 0) logger.info({ sent: r.sent }, "Drip tick sent emails");
    } catch (err) {
      logger.error({ err }, "Drip tick failed");
    }
    // Push notifications (Round 6)
    await tickNotifications();
  } catch (err) {
    logger.error({ err }, "Scheduler tick failed");
  } finally {
    running = false;
  }
}

export function startScheduler(): void {
  if (started) return;
  started = true;
  // Run every 60 seconds.
  timer = setInterval(() => {
    void tick();
  }, 60_000);
  // Kick once shortly after boot.
  setTimeout(() => void tick(), 5_000);
  logger.info("Round 4 scheduler started (social + drips)");
}

export function stopScheduler(): void {
  if (timer) clearInterval(timer);
  timer = null;
  started = false;
}
