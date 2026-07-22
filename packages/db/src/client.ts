import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite/vector";
import { sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { parseDbEnv } from "./env.js";
import * as schema from "./schema/index.js";

/**
 * A Continuum database client. Store implementations depend on this shared type
 * so a single Drizzle-backed implementation works against either driver:
 *
 * - **PGlite** (in-process WASM Postgres + pgvector) for local dev, automated
 *   integration tests, and sandboxes without a Postgres server.
 * - **node-postgres** against `DATABASE_URL` for production.
 *
 * There is deliberately one schema and one migration history shared by both.
 */
export type ContinuumDatabase = PgDatabase<PgQueryResultHKT, typeof schema>;

export type DbDriver = "pglite" | "postgres";

export interface DatabaseHandle {
  readonly db: ContinuumDatabase;
  readonly driver: DbDriver;
  /** Apply pending migrations (idempotent). Creates the pgvector extension first. */
  migrate(): Promise<void>;
  /** Release the underlying connection/pool. */
  close(): Promise<void>;
}

export interface CreateDatabaseOptions {
  /** Explicit driver; defaults to `CONTINUUM_DB_DRIVER`, else pglite off-prod. */
  driver?: DbDriver;
  /** Postgres connection string (postgres driver only). Defaults to `DATABASE_URL`. */
  url?: string;
  /** PGlite data directory. `"memory://"` (default) is ephemeral; a path persists. */
  dataDir?: string;
}

/** Absolute path to the generated migrations folder (stable across src/dist). */
const migrationsFolder = fileURLToPath(new URL("../drizzle", import.meta.url));

function resolveDriver(opts: CreateDatabaseOptions): DbDriver {
  if (opts.driver) return opts.driver;
  // Validates the DB environment (throws a readable error) and resolves the driver.
  const env = parseDbEnv();
  if (env.CONTINUUM_DB_DRIVER) return env.CONTINUUM_DB_DRIVER;
  return env.NODE_ENV === "production" ? "postgres" : "pglite";
}

/**
 * Create a database client. Callers own the lifecycle and must `close()` it.
 * The concrete driver is hidden behind `ContinuumDatabase` so services never
 * know which store they're on (ADR #1).
 */
export async function createDatabase(opts: CreateDatabaseOptions = {}): Promise<DatabaseHandle> {
  const driver = resolveDriver(opts);

  if (driver === "postgres") {
    const url = opts.url ?? process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        "DATABASE_URL is required for the postgres driver. Set it, or use CONTINUUM_DB_DRIVER=pglite for local development.",
      );
    }
    const pool = new pg.Pool({ connectionString: url });
    const db = drizzlePg(pool, { schema });
    return {
      db,
      driver,
      async migrate() {
        await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector`);
        await migratePg(db, { migrationsFolder });
      },
      async close() {
        await pool.end();
      },
    };
  }

  const dataDir = opts.dataDir ?? process.env.CONTINUUM_PGLITE_DIR ?? "memory://";
  const client = await PGlite.create(dataDir, { extensions: { vector } });
  const db = drizzlePglite(client, { schema });
  return {
    db,
    driver,
    async migrate() {
      await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector`);
      await migratePglite(db, { migrationsFolder });
    },
    async close() {
      await client.close();
    },
  };
}

/**
 * A fresh, isolated in-memory PGlite database with all migrations applied and
 * pgvector available. Reused by integration tests across packages so every test
 * runs against real Postgres SQL with zero external infrastructure.
 */
export async function createTestDatabase(): Promise<DatabaseHandle> {
  const handle = await createDatabase({ driver: "pglite", dataDir: "memory://" });
  await handle.migrate();
  return handle;
}
