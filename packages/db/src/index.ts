import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.js";

export * as schema from "./schema/index.js";

export type ContinuumDatabase = NodePgDatabase<typeof schema>;

/**
 * Create a database client. Callers own the pool lifecycle; services receive
 * the typed client, never a raw connection string.
 */
export function createDatabase(connectionString: string): {
  db: ContinuumDatabase;
  pool: pg.Pool;
} {
  const pool = new pg.Pool({ connectionString });
  const db = drizzle(pool, { schema });
  return { db, pool };
}
