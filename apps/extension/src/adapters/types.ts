/**
 * Site adapter contract (spec §23.2). All site-specific DOM knowledge lives in
 * adapters — nothing else in the extension may touch a host page's DOM.
 *
 * Hard restrictions carried by every adapter:
 * - Never silently capture whole conversations.
 * - Never press Send on the user's behalf.
 * - Always provide the clipboard fallback when insertion is unavailable.
 */
export interface SiteAdapter {
  id: "chatgpt" | "claude" | "gemini";
  displayName: string;
  /** Host patterns the adapter is allowed to run on (minimal permissions). */
  hostPatterns: string[];
  /** CSS selector for the prompt input, checked at runtime. */
  inputSelector: string;
  /**
   * Insert text into the page's prompt input. Returns false when the site's
   * DOM has changed and insertion is unavailable — the caller must then show
   * the clipboard fallback with a clear warning.
   */
  insertText(document: Document, text: string): boolean;
  /** Read the user's current selection for "save as candidate memory". */
  readSelection(document: Document): string | null;
}

/** Active Space/Project scope is per-tab, so two tabs can safely use two Spaces. */
export interface TabScope {
  tabId: number;
  spaceId: string | null;
  projectId: string | null;
}
