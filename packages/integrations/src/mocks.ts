import type {
  AnalyticsProvider,
  BillingProvider,
  CredentialVaultProvider,
  EmailProvider,
  EmbeddingProvider,
  LLMProvider,
  ObjectStorageProvider,
  SearchProvider,
} from "./providers.js";

/** Deterministic string hash used to make mock outputs stable across runs. */
function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export const mockLLMProvider: LLMProvider = {
  name: "mock-llm",
  complete(request) {
    // Deterministic, obviously-mock output so mocked functionality is never
    // mistaken for a live model (spec §48 collaboration rules).
    return Promise.resolve(
      `[mock-llm] response for prompt hash ${hashString(request.prompt).toString(16)}`,
    );
  },
};

export function createMockEmbeddingProvider(dimensions = 64): EmbeddingProvider {
  return {
    name: "mock-embeddings",
    dimensions,
    embed(texts) {
      return Promise.resolve(
        texts.map((text) => {
          const vector: number[] = [];
          for (let d = 0; d < dimensions; d += 1) {
            vector.push(((hashString(`${d}:${text}`) % 2000) - 1000) / 1000);
          }
          return vector;
        }),
      );
    },
  };
}

export function createInMemoryObjectStorage(): ObjectStorageProvider {
  const store = new Map<string, Uint8Array>();
  return {
    name: "mock-object-storage",
    put(key, data) {
      store.set(key, data);
      return Promise.resolve();
    },
    get(key) {
      return Promise.resolve(store.get(key) ?? null);
    },
    delete(key) {
      store.delete(key);
      return Promise.resolve();
    },
  };
}

export function createRecordingAnalytics(): AnalyticsProvider & {
  events: Array<{ event: string; properties?: Record<string, string | number | boolean> }>;
} {
  const events: Array<{
    event: string;
    properties?: Record<string, string | number | boolean>;
  }> = [];
  return {
    name: "mock-analytics",
    events,
    track(event, properties) {
      events.push(properties ? { event, properties } : { event });
    },
  };
}

export const disabledBillingProvider: BillingProvider = {
  name: "mock-billing",
  isEnabled: () => false,
};

export function createRecordingEmailProvider(): EmailProvider & {
  sent: Array<{ to: string; subject: string; text: string }>;
} {
  const sent: Array<{ to: string; subject: string; text: string }> = [];
  return {
    name: "mock-email",
    sent,
    send(input) {
      sent.push(input);
      return Promise.resolve();
    },
  };
}

export function createInMemoryCredentialVault(): CredentialVaultProvider {
  const secrets = new Map<string, string>();
  return {
    name: "mock-credential-vault",
    store(ref, secret) {
      secrets.set(ref, secret);
      return Promise.resolve();
    },
    retrieve(ref) {
      return Promise.resolve(secrets.get(ref) ?? null);
    },
    revoke(ref) {
      secrets.delete(ref);
      return Promise.resolve();
    },
  };
}

/** Simple deterministic lexical scorer: term overlap weighted by term rarity. */
export const mockSearchProvider: SearchProvider = {
  name: "mock-search",
  search(query, corpus, limit = 20) {
    const terms = query.toLowerCase().split(/\W+/).filter(Boolean);
    const results: Array<{ id: string; score: number }> = [];
    for (const [id, text] of corpus) {
      const haystack = text.toLowerCase();
      let score = 0;
      for (const term of terms) {
        if (haystack.includes(term)) score += Math.max(1, term.length / 4);
      }
      if (score > 0) results.push({ id, score });
    }
    results.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
    return Promise.resolve(results.slice(0, limit));
  },
};
