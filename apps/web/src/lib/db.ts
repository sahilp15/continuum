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
          // Dev default: in-memory PGlite — the reliable choice. File-backed
          // PGlite can abort the WASM when reopening a populated data dir, so we
          // don't persist by default. Data resets on a full server restart (a
          // stale cookie then lands you back on sign-in — handled gracefully by
          // requireActor). For durable data set DATABASE_URL to a real Postgres
          // (what production uses); CONTINUUM_PGLITE_DIR can point at a path but
          // file-backed persistence is best-effort only.
          dataDir: process.env.CONTINUUM_PGLITE_DIR ?? "memory://",
        },
  );
  await handle.migrate();
  return handle;
}

const handlePromise = (globalStore.__continuumDbHandle ??= init());

/** The shared, migrated database client. */
export const db: ContinuumDatabase = (await handlePromise).db;
