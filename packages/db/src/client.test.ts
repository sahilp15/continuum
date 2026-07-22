import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { createTestDatabase, type DatabaseHandle } from "./client.js";
import * as schema from "./schema/index.js";

describe("createTestDatabase (PGlite + migrations)", () => {
  let handle: DatabaseHandle;

  beforeAll(async () => {
    handle = await createTestDatabase();
  });

  afterAll(async () => {
    await handle?.close();
  });

  it("applies all migrations and exposes the schema tables", async () => {
    const rows = await handle.db.execute<{ table_name: string }>(
      sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`,
    );
    const names = rows.rows.map((r) => r.table_name);
    // A representative table from each schema group must exist.
    for (const table of [
      "users",
      "spaces",
      "projects",
      "memories",
      "sources",
      "source_chunks",
      "connector_installations",
      "context_bundles",
      "audit_events",
    ]) {
      expect(names).toContain(table);
    }
  });

  it("has the pgvector extension available for embedding columns", async () => {
    const rows = await handle.db.execute<{ extname: string }>(
      sql`SELECT extname FROM pg_extension WHERE extname = 'vector'`,
    );
    expect(rows.rows.map((r) => r.extname)).toContain("vector");
  });

  it("round-trips a row through a real Drizzle insert/select", async () => {
    await handle.db.insert(schema.users).values({
      id: "usr_test_1",
      email: "round-trip@example.com",
      name: "Round Trip",
    });
    const found = await handle.db
      .select()
      .from(schema.users)
      .where(sql`${schema.users.id} = 'usr_test_1'`);
    expect(found).toHaveLength(1);
    expect(found[0]?.email).toBe("round-trip@example.com");
  });
});
