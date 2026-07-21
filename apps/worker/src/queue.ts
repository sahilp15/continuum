import { newId } from "@continuum/contracts";
import type { Logger } from "@continuum/observability";

/**
 * Minimal job-queue abstraction (spec §26: PostgreSQL-backed queue initially).
 * The interface is storage-agnostic; `createInMemoryJobQueue` powers tests and
 * local mock mode, and a Drizzle-backed implementation targets the `jobs`
 * table for real deployments (Phase 2+).
 */

export interface Job {
  id: string;
  kind: string;
  payload: Record<string, unknown>;
  status: "queued" | "running" | "succeeded" | "failed" | "dead";
  attempts: number;
  maxAttempts: number;
  runAfter: Date;
  lastError: string | null;
}

export interface JobQueue {
  enqueue(
    kind: string,
    payload: Record<string, unknown>,
    options?: { runAfter?: Date },
  ): Promise<Job>;
  /** Claim the next runnable job, or null when the queue is drained. */
  claim(now: Date): Promise<Job | null>;
  complete(jobId: string): Promise<void>;
  fail(jobId: string, error: string, now: Date): Promise<void>;
  get(jobId: string): Promise<Job | null>;
}

const RETRY_BACKOFF_MS = [2_000, 4_000, 8_000, 16_000, 32_000];

export function createInMemoryJobQueue(): JobQueue {
  const jobs = new Map<string, Job>();
  return {
    enqueue(kind, payload, options) {
      const job: Job = {
        id: newId("job"),
        kind,
        payload,
        status: "queued",
        attempts: 0,
        maxAttempts: 5,
        runAfter: options?.runAfter ?? new Date(0),
        lastError: null,
      };
      jobs.set(job.id, job);
      return Promise.resolve(job);
    },
    claim(now) {
      for (const job of jobs.values()) {
        if (job.status === "queued" && job.runAfter <= now) {
          job.status = "running";
          job.attempts += 1;
          return Promise.resolve(job);
        }
      }
      return Promise.resolve(null);
    },
    complete(jobId) {
      const job = jobs.get(jobId);
      if (job) job.status = "succeeded";
      return Promise.resolve();
    },
    fail(jobId, error, now) {
      const job = jobs.get(jobId);
      if (!job) return Promise.resolve();
      job.lastError = error;
      if (job.attempts >= job.maxAttempts) {
        job.status = "dead";
      } else {
        job.status = "queued";
        const backoff = RETRY_BACKOFF_MS[Math.min(job.attempts - 1, RETRY_BACKOFF_MS.length - 1)];
        job.runAfter = new Date(now.getTime() + (backoff ?? 32_000));
      }
      return Promise.resolve();
    },
    get(jobId) {
      return Promise.resolve(jobs.get(jobId) ?? null);
    },
  };
}

export type JobHandler = (job: Job) => Promise<void>;

/** Drain-style runner used by tests and the polling loop in main.ts. */
export async function runPendingJobs(
  queue: JobQueue,
  handlers: Map<string, JobHandler>,
  logger: Logger,
  now: () => Date = () => new Date(),
): Promise<number> {
  let processed = 0;
  for (;;) {
    const job = await queue.claim(now());
    if (!job) break;
    const handler = handlers.get(job.kind);
    if (!handler) {
      await queue.fail(job.id, `no handler for job kind ${job.kind}`, now());
      continue;
    }
    try {
      await handler(job);
      await queue.complete(job.id);
      processed += 1;
    } catch (error) {
      logger.warn("job failed", { jobId: job.id, kind: job.kind, error: String(error) });
      await queue.fail(job.id, String(error), now());
    }
  }
  return processed;
}
