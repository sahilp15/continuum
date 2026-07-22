import "server-only";
import { createDatabase, type ContinuumDatabase, type DatabaseHandle } from "@continuum/db";

/**
 * One database handle per server process (survives Next dev hot-reload via a
 * global). Migrations are applied on first init so the app is runnable with zero
 * manual setup: PGlite by default (persist with CONTINUUM_PGLITE_DIR), or
 * node-postgres when CONTINUUM_DB_DRIVER=postgres / NODE_ENV=production.
 */
const globalStore = globalThis as unknown as { __continuumDbHandle?: Promise<DatabaseHandle> };

async function init(): Promise<DatabaseHandle> {
  // `next build` runs as production and collects route config by importing this
  // module — but never queries the DB. Use a throwaway in-memory PGlite during
  // the build phase so a real DATABASE_URL isn't required to build.
  const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
  const handle = await createDatabase(
    isBuildPhase
      ? { driver: "pglite", dataDir: "memory://" }
      : {
          // In dev, an in-memory PGlite (single process instance) is the most
          // reliable choice — file-backed PGlite can lock-contend and abort the
          // WASM under concurrent requests. Data survives HMR (globalThis
          // singleton) but resets on a full restart; set CONTINUUM_PGLITE_DIR to
          // a path to opt into persistence. Production uses DATABASE_URL.
          dataDir: process.env.CONTINUUM_PGLITE_DIR ?? "memory://",
        },
  );
  await handle.migrate();
  return handle;
}

const handlePromise = (globalStore.__continuumDbHandle ??= init());

/** The shared, migrated database client. */
export const db: ContinuumDatabase = (await handlePromise).db;
