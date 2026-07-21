import { describe, expect, it } from "vitest";
import { createLogger } from "@continuum/observability";
import { createInMemoryJobQueue, runPendingJobs, type JobHandler } from "./queue.js";

const logger = createLogger({ name: "test", sink: () => undefined });

describe("job queue", () => {
  it("processes jobs and marks them succeeded", async () => {
    const queue = createInMemoryJobQueue();
    const seen: string[] = [];
    const job = await queue.enqueue("sync", { installationId: "cin_x" });
    const handlers = new Map<string, JobHandler>([
      [
        "sync",
        (j) => {
          seen.push(j.id);
          return Promise.resolve();
        },
      ],
    ]);
    const processed = await runPendingJobs(queue, handlers, logger);
    expect(processed).toBe(1);
    expect(seen).toEqual([job.id]);
    expect((await queue.get(job.id))?.status).toBe("succeeded");
  });

  it("retries with backoff and never duplicates completed work", async () => {
    const queue = createInMemoryJobQueue();
    let calls = 0;
    const job = await queue.enqueue("flaky", {});
    const handlers = new Map<string, JobHandler>([
      [
        "flaky",
        () => {
          calls += 1;
          return calls < 2 ? Promise.reject(new Error("boom")) : Promise.resolve();
        },
      ],
    ]);

    const t0 = new Date("2026-03-12T12:00:00.000Z");
    await runPendingJobs(queue, handlers, logger, () => t0);
    expect((await queue.get(job.id))?.status).toBe("queued");

    // Before the backoff elapses the job is not runnable.
    await runPendingJobs(queue, handlers, logger, () => t0);
    expect(calls).toBe(1);

    const t1 = new Date(t0.getTime() + 10_000);
    await runPendingJobs(queue, handlers, logger, () => t1);
    expect(calls).toBe(2);
    expect((await queue.get(job.id))?.status).toBe("succeeded");
  });

  it("dead-letters after max attempts", async () => {
    const queue = createInMemoryJobQueue();
    const job = await queue.enqueue("always-fails", {});
    const handlers = new Map<string, JobHandler>([
      ["always-fails", () => Promise.reject(new Error("nope"))],
    ]);
    let clock = new Date("2026-03-12T12:00:00.000Z").getTime();
    for (let i = 0; i < 10; i += 1) {
      await runPendingJobs(queue, handlers, logger, () => new Date(clock));
      clock += 60_000;
    }
    expect((await queue.get(job.id))?.status).toBe("dead");
  });
});
