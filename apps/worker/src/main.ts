import { createLogger } from "@continuum/observability";
import { createInMemoryJobQueue, runPendingJobs, type JobHandler } from "./queue.js";

/**
 * Worker entry point. In mock mode (the default) it runs an in-memory queue
 * with demo handlers so the full loop is exercised locally. The Postgres-
 * backed queue lands with Phase 2 ingestion jobs.
 */
const logger = createLogger({ name: "continuum-worker" });

const handlers = new Map<string, JobHandler>([
  [
    "noop",
    () => {
      return Promise.resolve();
    },
  ],
]);

async function main(): Promise<void> {
  const queue = createInMemoryJobQueue();
  await queue.enqueue("noop", { hello: "world" });
  const processed = await runPendingJobs(queue, handlers, logger);
  logger.info("worker drained queue", { processed });
}

main().catch((error) => {
  logger.error("worker crashed", { error: String(error) });
  process.exit(1);
});
