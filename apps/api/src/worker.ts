import { loadEnv } from "./config/env.js";
import { createDb } from "@nexus/db";
import { createWorker, closeAllQueues } from "./lib/queue.js";
import { safeFetch } from "./lib/ssrf-guard.js";
import type { QueueName } from "./lib/queue.js";

const env = loadEnv();
const { db, client } = createDb(env.DATABASE_URL);

console.log("[worker] starting NEXUS background worker");

// ── SLA breach watcher ──────────────────────────────────────────────────────
// Checks every minute for incidents where sla_breach_at <= now()
createWorker("sla-watch" as QueueName, env.REDIS_URL, async (job) => {
  const { orgId } = job.data as { orgId: string };
  const { IncidentsService } = await import("./modules/incidents/incidents.service.js");
  const svc = new IncidentsService(db, client);
  const breached = await svc.checkSlaBreach(orgId);
  return { breached };
}, 2);

// ── Notification fanout ─────────────────────────────────────────────────────
createWorker("notification-fanout" as QueueName, env.REDIS_URL, async (job) => {
  const { type, orgId, userId, title, body, resourceType, resourceId, actionUrl } =
    job.data as {
      type: string; orgId: string; userId?: string;
      title: string; body?: string;
      resourceType?: string; resourceId?: string; actionUrl?: string;
    };
  const { eq } = await import("drizzle-orm");
  const { notifications } = await import("@nexus/db/schema");
  await db.insert(notifications).values({
    organizationId: orgId,
    userId,
    type,
    title,
    body,
    resourceType,
    resourceId,
    actionUrl,
    isRead: false,
    createdAt: new Date(),
  });
  return { sent: true };
}, 10);

// ── Webhook delivery ────────────────────────────────────────────────────────
createWorker("webhook-deliver" as QueueName, env.REDIS_URL, async (job) => {
  const { webhookId, payload, deliveryId } = job.data as {
    webhookId: string;
    payload: Record<string, unknown>;
    deliveryId: string;
  };
  // Minimal webhook delivery — full HMAC/retry in Phase 2
  const { eq } = await import("drizzle-orm");
  const { webhooks, webhookDeliveries } = await import("@nexus/db/schema");
  const [hook] = await db.select().from(webhooks).where(eq(webhooks.id, webhookId)).limit(1);
  if (!hook || !hook.isActive) return { skipped: true };

  const start = Date.now();
  let statusCode = 0;
  let responseBody = "";
  try {
    const resp = await safeFetch(hook.endpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Nexus-Event": String(payload.event ?? "unknown"),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
    statusCode = resp.status;
    responseBody = await resp.text().catch(() => "");
  } catch (err) {
    statusCode = 0;
    responseBody = String(err);
  }

  const success = statusCode >= 200 && statusCode < 300;
  await db.update(webhookDeliveries).set({
    responseStatus: statusCode,
    responseBody: responseBody.slice(0, 500),
    deliveryTimeMs: Date.now() - start,
    success,
  }).where(eq(webhookDeliveries.id, deliveryId));

  if (!success) throw new Error(`Webhook delivery failed: ${statusCode}`);
  return { success, statusCode };
}, 5);

// ── Retention purge ─────────────────────────────────────────────────────────
createWorker("retention-purge" as QueueName, env.REDIS_URL, async (job) => {
  const { orgId, retentionDays } = job.data as { orgId: string; retentionDays: number };
  const { eq, and, lt } = await import("drizzle-orm");
  const { securityEvents, copilotMessages, webhookDeliveries, copilotSessions } = await import("@nexus/db/schema");
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  const [eventsResult] = await db
    .delete(securityEvents)
    .where(and(eq(securityEvents.organizationId, orgId), lt(securityEvents.eventTimestamp, cutoff)))
    .returning({ id: securityEvents.id });

  return { purged: eventsResult ? 1 : 0 };
}, 1);

// ── Graceful shutdown ───────────────────────────────────────────────────────
async function shutdown() {
  console.log("[worker] shutting down…");
  await closeAllQueues();
  await client.end();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

console.log("[worker] registered workers: sla-watch, notification-fanout, webhook-deliver, retention-purge");
