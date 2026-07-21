import type { Memory, Source, Suggestion } from "@continuum/contracts";

/**
 * Persistence boundary for the memory engine. The production implementation
 * is backed by @continuum/db; tests and local mock mode use the in-memory
 * implementation below. Every read is Space-scoped by construction — there is
 * deliberately no "list all memories" API (spec §25.1–3).
 */
export interface MemoryStore {
  getMemory(memoryId: string): Promise<Memory | null>;
  listSpaceMemories(spaceId: string): Promise<Memory[]>;
  insertMemory(memory: Memory): Promise<void>;
  updateMemory(memory: Memory): Promise<void>;

  getSuggestion(suggestionId: string): Promise<Suggestion | null>;
  listSpaceSuggestions(spaceId: string, status?: Suggestion["status"]): Promise<Suggestion[]>;
  insertSuggestion(suggestion: Suggestion): Promise<void>;
  updateSuggestion(suggestion: Suggestion): Promise<void>;

  getSource(sourceId: string): Promise<Source | null>;
  listSpaceSources(spaceId: string): Promise<Source[]>;
  insertSource(source: Source): Promise<void>;
}

export function createInMemoryMemoryStore(seed?: {
  memories?: Memory[];
  suggestions?: Suggestion[];
  sources?: Source[];
}): MemoryStore {
  const memories = new Map<string, Memory>((seed?.memories ?? []).map((m) => [m.id, { ...m }]));
  const suggestions = new Map<string, Suggestion>(
    (seed?.suggestions ?? []).map((s) => [s.id, { ...s }]),
  );
  const sources = new Map<string, Source>((seed?.sources ?? []).map((s) => [s.id, { ...s }]));

  return {
    getMemory: (id) => Promise.resolve(memories.get(id) ?? null),
    listSpaceMemories: (spaceId) =>
      Promise.resolve([...memories.values()].filter((m) => m.spaceId === spaceId)),
    insertMemory: (memory) => {
      memories.set(memory.id, { ...memory });
      return Promise.resolve();
    },
    updateMemory: (memory) => {
      memories.set(memory.id, { ...memory });
      return Promise.resolve();
    },
    getSuggestion: (id) => Promise.resolve(suggestions.get(id) ?? null),
    listSpaceSuggestions: (spaceId, status) =>
      Promise.resolve(
        [...suggestions.values()].filter(
          (s) => s.spaceId === spaceId && (status === undefined || s.status === status),
        ),
      ),
    insertSuggestion: (suggestion) => {
      suggestions.set(suggestion.id, { ...suggestion });
      return Promise.resolve();
    },
    updateSuggestion: (suggestion) => {
      suggestions.set(suggestion.id, { ...suggestion });
      return Promise.resolve();
    },
    getSource: (id) => Promise.resolve(sources.get(id) ?? null),
    listSpaceSources: (spaceId) =>
      Promise.resolve([...sources.values()].filter((s) => s.spaceId === spaceId)),
    insertSource: (source) => {
      sources.set(source.id, { ...source });
      return Promise.resolve();
    },
  };
}
