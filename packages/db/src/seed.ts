/**
 * Seed the local database with the Northbank/FizzPop demo dataset.
 * Run with: pnpm db:seed  (requires docker compose up + migrations applied)
 */
import { createDemoDataset, demoOrganizations, demoUsers } from "@continuum/testing";
import { createDatabase } from "./index.js";
import * as schema from "./schema/index.js";

async function main(): Promise<void> {
  const url =
    process.env.DATABASE_URL ??
    "postgres://continuum:continuum_dev_password@localhost:5432/continuum";
  const { db, pool } = createDatabase(url);
  const data = createDemoDataset();

  try {
    await db
      .insert(schema.users)
      .values(data.users.map((u) => ({ id: u.id, email: u.email, name: u.name })))
      .onConflictDoNothing();

    await db
      .insert(schema.organizations)
      .values(data.organizations.map((o) => ({ id: o.id, name: o.name })))
      .onConflictDoNothing();

    await db
      .insert(schema.organizationMembers)
      .values([
        {
          id: "orm_seed_freelancer1",
          organizationId: demoOrganizations.studio.id,
          userId: demoUsers.freelancer.id,
          role: "owner" as const,
        },
        {
          id: "orm_seed_outsider001",
          organizationId: demoOrganizations.other.id,
          userId: demoUsers.outsider.id,
          role: "owner" as const,
        },
      ])
      .onConflictDoNothing();

    await db
      .insert(schema.personalProfiles)
      .values({
        userId: data.profile.userId,
        displayName: data.profile.displayName,
        background: data.profile.background,
        preferences: data.profile.preferences,
        defaultLanguage: data.profile.defaultLanguage,
      })
      .onConflictDoNothing();

    await db
      .insert(schema.spaces)
      .values(
        data.spaces.map((s) => ({
          id: s.id,
          organizationId: s.organizationId,
          name: s.name,
          slug: s.slug,
          kind: s.kind,
          description: s.description,
        })),
      )
      .onConflictDoNothing();

    await db
      .insert(schema.projects)
      .values(
        data.projects.map((p) => ({
          id: p.id,
          organizationId: p.organizationId,
          spaceId: p.spaceId,
          name: p.name,
          objective: p.objective,
          status: p.status,
        })),
      )
      .onConflictDoNothing();

    await db
      .insert(schema.sources)
      .values(
        data.sources.map((s) => ({
          id: s.id,
          organizationId: s.organizationId,
          spaceId: s.spaceId,
          kind: s.kind,
          title: s.title,
          content: s.content,
          externalUrl: s.externalUrl,
          authority: s.authority,
          sensitivity: s.sensitivity,
          importedBy: s.importedBy,
        })),
      )
      .onConflictDoNothing();

    await db
      .insert(schema.memories)
      .values(
        data.memories.map((m) => ({
          id: m.id,
          organizationId: m.organizationId,
          spaceId: m.spaceId,
          projectId: m.projectId,
          type: m.type,
          title: m.title,
          canonicalText: m.canonicalText,
          structuredValue: m.structuredValue,
          status: m.status,
          priority: m.priority,
          confidence: m.confidence,
          sensitivity: m.sensitivity,
          sourceAuthority: m.sourceAuthority,
          validFrom: m.validFrom ? new Date(m.validFrom) : null,
          validUntil: m.validUntil ? new Date(m.validUntil) : null,
          createdBy: m.createdBy,
          approvedBy: m.approvedBy,
          approvedAt: m.approvedAt ? new Date(m.approvedAt) : null,
          supersedesMemoryId: m.supersedesMemoryId,
          version: m.version,
        })),
      )
      .onConflictDoNothing();

    await db
      .insert(schema.suggestions)
      .values(
        data.suggestions.map((s) => ({
          id: s.id,
          organizationId: s.organizationId,
          spaceId: s.spaceId,
          projectId: s.projectId,
          memoryType: s.memoryType,
          title: s.title,
          proposedText: s.proposedText,
          structuredValue: s.structuredValue,
          conflictsWithMemoryId: s.conflictsWithMemoryId,
          previousValueText: s.previousValueText,
          sourceId: s.sourceId,
          sourceExcerpt: s.sourceExcerpt,
          confidence: s.confidence,
          rationale: s.rationale,
          status: s.status,
        })),
      )
      .onConflictDoNothing();

    console.log("Seeded Northbank and FizzPop demo data.");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exitCode = 1;
});
