import type { SiteAdapter } from "./types.js";

function insertIntoEditable(document: Document, selector: string, text: string): boolean {
  const element = document.querySelector<HTMLElement>(selector);
  if (!element) return false;
  if (element instanceof HTMLTextAreaElement) {
    element.value = `${element.value}${element.value ? "\n\n" : ""}${text}`;
    element.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  }
  if (element.isContentEditable) {
    element.textContent = `${element.textContent ?? ""}${element.textContent ? "\n\n" : ""}${text}`;
    element.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  }
  return false;
}

function readSelection(document: Document): string | null {
  const selection = document.defaultView?.getSelection()?.toString().trim();
  return selection ? selection : null;
}

/**
 * Selectors are best-effort snapshots of each site's DOM and are expected to
 * break; the runtime treats a failed insert as "site changed" and falls back
 * to the clipboard with a visible warning (spec §23.2).
 */
export const chatgptAdapter: SiteAdapter = {
  id: "chatgpt",
  displayName: "ChatGPT",
  hostPatterns: ["https://chatgpt.com/*"],
  inputSelector: "#prompt-textarea",
  insertText: (doc, text) => insertIntoEditable(doc, "#prompt-textarea", text),
  readSelection,
};

export const claudeAdapter: SiteAdapter = {
  id: "claude",
  displayName: "Claude",
  hostPatterns: ["https://claude.ai/*"],
  inputSelector: "div.ProseMirror[contenteditable='true']",
  insertText: (doc, text) =>
    insertIntoEditable(doc, "div.ProseMirror[contenteditable='true']", text),
  readSelection,
};

export const geminiAdapter: SiteAdapter = {
  id: "gemini",
  displayName: "Gemini",
  hostPatterns: ["https://gemini.google.com/*"],
  inputSelector: "div.ql-editor[contenteditable='true']",
  insertText: (doc, text) => insertIntoEditable(doc, "div.ql-editor[contenteditable='true']", text),
  readSelection,
};

export const allAdapters: SiteAdapter[] = [chatgptAdapter, claudeAdapter, geminiAdapter];
