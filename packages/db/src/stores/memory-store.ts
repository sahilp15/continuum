import {
  memorySchema,
  newId,
  sourceSchema,
  suggestionSchema,
  type Memory,
  type Source,
  type Suggestion,
} from "@continuum/contracts";
import type { MemoryStore } from "@continuum/memory";
import { and, eq, inArray } from "drizzle-orm";
import type { ContinuumDatabase } from "../client.js";
import {
  memories,
  memoryRelations,
  memorySources,
  memoryVersions,
  sources,
  suggestions,
} from "../schema/index.js";

/** Timestamp helpers: contracts use ISO strings, Drizzle uses Date. */
const toIso = (d: Date | null): string | null => (d ? d.toISOString() : null);
const fromIso = (s: string | null | undefined): Date | null => (s ? new Date(s) : null);

type MemoryRow = typeof memories.$inferSelect;
type SuggestionRow = typeof suggestions.$inferSelect;
type SourceRow = typeof sources.$inferSelect;

/**
 * Drizzle-backed {@link MemoryStore}. Every read is Space-scoped by construction
 * (no list-all API), preserving Space isolation at the store level. `sourceIds`
 * and `contradictsMemoryIds` live in the `memory_sources` / `memory_relations`
 * join tables and are hydrated per row.
 */
export function createDrizzleMemoryStore(db: ContinuumDatabase): MemoryStore {
  async function hydrateMemories(rows: MemoryRow[]): Promise<Memory[]> {
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.id);
    const srcRows = await db
      .select()
      .from(memorySources)
      .where(inArray(memorySources.memoryId, ids));
    const relRows = await db
      .select()
      .from(memoryRelations)
      .where(
        and(
          inArray(memoryRelations.fromMemoryId, ids),
          eq(memoryRelations.relation, "contradicts"),
        ),
      );
    const sourceIdsByMemory = new Map<string, string[]>();
    for (const s of srcRows) {
      const list = sourceIdsByMemory.get(s.memoryId) ?? [];
      list.push(s.sourceId);
      sourceIdsByMemory.set(s.memoryId, list);
    }
    const contradictsByMemory = new Map<string, string[]>();
    for (const r of relRows) {
      const list = contradictsByMemory.get(r.fromMemoryId) ?? [];
      list.push(r.toMemoryId);
      contradictsByMemory.set(r.fromMemoryId, list);
    }
    return rows.map((row) =>
      memorySchema.parse({
        id: row.id,
        organizationId: row.organizationId,
        spaceId: row.spaceId,
        projectId: row.projectId,
        type: row.type,
        title: row.title,
        canonicalText: row.canonicalText,
        structuredValue: row.structuredValue ?? null,
        status: row.status,
        priority: row.priority,
        confidence: row.confidence,
        sensitivity: row.sensitivity,
        sourceAuthority: row.sourceAuthority,
        validFrom: toIso(row.validFrom),
        validUntil: toIso(row.validUntil),
        createdBy: row.createdBy,
        approvedBy: row.approvedBy,
        approvedAt: toIso(row.approvedAt),
        supersedesMemoryId: row.supersedesMemoryId,
        contradictsMemoryIds: contradictsByMemory.get(row.id) ?? [],
        sourceIds: sourceIdsByMemory.get(row.id) ?? [],
        version: row.version,
        createdAt: toIso(row.createdAt)!,
        updatedAt: toIso(row.updatedAt)!,
        deletedAt: toIso(row.deletedAt),
      }),
    );
  }

  function memoryToRow(m: Memory): typeof memories.$inferInsert {
    return {
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
      validFrom: fromIso(m.validFrom),
      validUntil: fromIso(m.validUntil),
      createdBy: m.createdBy,
      approvedBy: m.approvedBy,
      approvedAt: fromIso(m.approvedAt),
      supersedesMemoryId: m.supersedesMemoryId,
      version: m.version,
      createdAt: new Date(m.createdAt),
      updatedAt: new Date(m.updatedAt),
      deletedAt: fromIso(m.deletedAt),
    };
  }

  async function writeVersionSnapshot(m: Memory): Promise<void> {
    await db.insert(memoryVersions).values({
      id: newId("mver"),
      memoryId: m.id,
      version: m.version,
      snapshot: m as unknown as Record<string, unknown>,
      changedBy: m.approvedBy ?? m.createdBy,
    });
  }

  function suggestionToRow(s: Suggestion): typeof suggestions.$inferInsert {
    return {
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
      suggestedExpiresAt: fromIso(s.suggestedExpiresAt),
      status: s.status,
      createdAt: new Date(s.createdAt),
      resolvedAt: fromIso(s.resolvedAt),
      resolvedBy: s.resolvedBy,
    };
  }

  function rowToSuggestion(row: SuggestionRow): Suggestion {
    return suggestionSchema.parse({
      id: row.id,
      organizationId: row.organizationId,
      spaceId: row.spaceId,
      projectId: row.projectId,
      memoryType: row.memoryType,
      title: row.title,
      proposedText: row.proposedText,
      structuredValue: row.structuredValue ?? null,
      conflictsWithMemoryId: row.conflictsWithMemoryId,
      previousValueText: row.previousValueText,
      sourceId: row.sourceId,
      sourceExcerpt: row.sourceExcerpt,
      confidence: row.confidence,
      rationale: row.rationale,
      suggestedExpiresAt: toIso(row.suggestedExpiresAt),
      status: row.status,
      createdAt: toIso(row.createdAt)!,
      resolvedAt: toIso(row.resolvedAt),
      resolvedBy: row.resolvedBy,
    });
  }

  function rowToSource(row: SourceRow): Source {
    return sourceSchema.parse({
      id: row.id,
      organizationId: row.organizationId,
      spaceId: row.spaceId,
      kind: row.kind,
      title: row.title,
      content: row.content,
      externalUrl: row.externalUrl,
      connectorInstallationId: row.connectorInstallationId,
      authority: row.authority,
      sensitivity: row.sensitivity,
      contentHash: row.contentHash,
      importedBy: row.importedBy,
      createdAt: toIso(row.createdAt)!,
      deletedAt: toIso(row.deletedAt),
    });
  }

  return {
    async getMemory(memoryId) {
      const rows = await db.select().from(memories).where(eq(memories.id, memoryId)).limit(1);
      if (rows.length === 0) return null;
      const [hydrated] = await hydrateMemories(rows);
      return hydrated ?? null;
    },
    async listSpaceMemories(spaceId) {
      const rows = await db.select().from(memories).where(eq(memories.spaceId, spaceId));
      return hydrateMemories(rows);
    },
    async insertMemory(memory) {
      await db.insert(memories).values(memoryToRow(memory));
      if (memory.sourceIds.length > 0) {
        await db.insert(memorySources).values(
          memory.sourceIds.map((sourceId) => ({
            id: newId("msc"),
            memoryId: memory.id,
            sourceId,
          })),
        );
      }
      if (memory.contradictsMemoryIds.length > 0) {
        await db.insert(memoryRelations).values(
          memory.contradictsMemoryIds.map((toMemoryId) => ({
            id: newId("mrel"),
            fromMemoryId: memory.id,
            toMemoryId,
            relation: "contradicts" as const,
          })),
        );
      }
      await writeVersionSnapshot(memory);
    },
    async updateMemory(memory) {
      await db.update(memories).set(memoryToRow(memory)).where(eq(memories.id, memory.id));
      await writeVersionSnapshot(memory);
    },

    async getSuggestion(suggestionId) {
      const rows = await db
        .select()
        .from(suggestions)
        .where(eq(suggestions.id, suggestionId))
        .limit(1);
      return rows[0] ? rowToSuggestion(rows[0]) : null;
    },
    async listSpaceSuggestions(spaceId, status) {
      const where = status
        ? and(eq(suggestions.spaceId, spaceId), eq(suggestions.status, status))
        : eq(suggestions.spaceId, spaceId);
      const rows = await db.select().from(suggestions).where(where);
      return rows.map(rowToSuggestion);
    },
    async insertSuggestion(suggestion) {
      await db.insert(suggestions).values(suggestionToRow(suggestion));
    },
    async updateSuggestion(suggestion) {
      await db
        .update(suggestions)
        .set(suggestionToRow(suggestion))
        .where(eq(suggestions.id, suggestion.id));
    },

    async getSource(sourceId) {
      const rows = await db.select().from(sources).where(eq(sources.id, sourceId)).limit(1);
      return rows[0] ? rowToSource(rows[0]) : null;
    },
    async listSpaceSources(spaceId) {
      const rows = await db.select().from(sources).where(eq(sources.spaceId, spaceId));
      return rows.map(rowToSource);
    },
    async insertSource(source) {
      await db.insert(sources).values({
        id: source.id,
        organizationId: source.organizationId,
        spaceId: source.spaceId,
        kind: source.kind,
        title: source.title,
        content: source.content,
        externalUrl: source.externalUrl,
        connectorInstallationId: source.connectorInstallationId,
        authority: source.authority,
        sensitivity: source.sensitivity,
        contentHash: source.contentHash,
        importedBy: source.importedBy,
        createdAt: new Date(source.createdAt),
        deletedAt: fromIso(source.deletedAt),
      });
    },
  };
}
