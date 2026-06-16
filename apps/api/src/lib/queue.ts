import { Queue, Worker, QueueEvents, type Job, type Processor } from "bullmq";
import IORedis from "ioredis";

let redisConnection: IORedis | null = null;

export function getRedisConnection(url: string): IORedis {
  if (!redisConnection) {
    redisConnection = new IORedis(url, {
      maxRetriesPerRequest: null, // required by BullMQ
      enableReadyCheck: false,
    });
  }
  return redisConnection;
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
  if (redisConnection) {
    await redisConnection.quit();
    redisConnection = null;
  }
}
