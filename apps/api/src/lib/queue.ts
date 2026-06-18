import {
  Queue,
  Worker,
  QueueEvents,
  type ConnectionOptions,
  type Job,
  type Processor,
} from "bullmq";

export function getRedisConnection(url: string): ConnectionOptions {
  const parsed = new URL(url);
  const db = parsed.pathname.length > 1 ? Number(parsed.pathname.slice(1)) : 0;

  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 6379,
    username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    db: Number.isFinite(db) ? db : 0,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    ...(parsed.protocol === "rediss:" ? { tls: {} } : {}),
  };
}

export type QueueName =
  | "detection-eval"
  | "sla-watch"
  | "report-gen"
  | "scheduled-reports"
  | "webhook-deliver"
  | "cloud-sync"
  | "cve-feed"
  | "embeddings-index"
  | "notification-fanout"
  | "retention-purge";

const queues = new Map<string, Queue>();

export function getQueue(name: QueueName, redisUrl: string): Queue {
  if (!queues.has(name)) {
    const connection = getRedisConnection(redisUrl);
    queues.set(name, new Queue(name, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 500 },
      },
    }));
  }
  return queues.get(name)!;
}

export function createWorker<T = unknown, R = unknown>(
  name: QueueName,
  redisUrl: string,
  processor: Processor<T, R>,
  concurrency = 5,
): Worker<T, R> {
  const connection = getRedisConnection(redisUrl);
  const worker = new Worker<T, R>(name, processor, { connection, concurrency });

  worker.on("failed", (job: Job<T> | undefined, err: Error) => {
    console.error(`[queue:${name}] job ${job?.id} failed:`, err.message);
  });

  worker.on("completed", (job: Job<T>) => {
    console.log(`[queue:${name}] job ${job.id} completed`);
  });

  return worker;
}

export function createQueueEvents(name: QueueName, redisUrl: string): QueueEvents {
  const connection = getRedisConnection(redisUrl);
  return new QueueEvents(name, { connection });
}

export async function enqueue<T>(
  name: QueueName,
  redisUrl: string,
  jobName: string,
  data: T,
  opts?: { delay?: number; jobId?: string; priority?: number },
): Promise<string> {
  const queue = getQueue(name, redisUrl);
  const job = await queue.add(jobName, data, opts);
  return job.id ?? "";
}

export async function closeAllQueues(): Promise<void> {
  await Promise.all([...queues.values()].map((q) => q.close()));
  queues.clear();
}
