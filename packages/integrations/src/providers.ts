/**
 * Provider abstractions (spec §26). Every external paid or stateful service
 * sits behind one of these interfaces so the whole product runs locally with
 * deterministic mocks and zero paid API keys.
 */

export interface LLMCompletionRequest {
  system: string;
  prompt: string;
  maxTokens?: number;
}

export interface LLMProvider {
  readonly name: string;
  complete(request: LLMCompletionRequest): Promise<string>;
}

export interface EmbeddingProvider {
  readonly name: string;
  readonly dimensions: number;
  embed(texts: string[]): Promise<number[][]>;
}

export interface ObjectStorageProvider {
  readonly name: string;
  put(key: string, data: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<Uint8Array | null>;
  delete(key: string): Promise<void>;
}

export interface AnalyticsProvider {
  readonly name: string;
  track(event: string, properties?: Record<string, string | number | boolean>): void;
}

export interface BillingProvider {
  readonly name: string;
  isEnabled(): boolean;
}

export interface EmailProvider {
  readonly name: string;
  send(input: { to: string; subject: string; text: string }): Promise<void>;
}

/**
 * Credential vault abstraction. Connector credentials are stored via this
 * interface only — never as plain text in the database or logs (spec §25.6–7).
 */
export interface CredentialVaultProvider {
  readonly name: string;
  store(ref: string, secret: string): Promise<void>;
  retrieve(ref: string): Promise<string | null>;
  revoke(ref: string): Promise<void>;
}

export interface SearchProvider {
  readonly name: string;
  /** Lexical search over indexed text; returns matching document ids with scores. */
  search(
    query: string,
    corpus: Map<string, string>,
    limit?: number,
  ): Promise<Array<{ id: string; score: number }>>;
}
