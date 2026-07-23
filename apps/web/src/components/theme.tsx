"use client";

import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { useEffect, useState } from "react";

/**
 * Theme system: next-themes stamps `data-theme` on <html>, which activates the
 * dark token block in packages/ui/src/tokens.css. `enableSystem` follows the
 * OS preference until the user picks explicitly (persisted in localStorage).
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}

const ORDER = ["system", "light", "dark"] as const;
const LABEL: Record<(typeof ORDER)[number], string> = {
  system: "System theme",
  light: "Light theme",
  dark: "Dark theme",
};

/** Cycles system → light → dark. Icon + accessible label; no color-only cue. */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // Avoid a hydration mismatch: theme is unknowable on the server.
  if (!mounted) {
    return <span aria-hidden className="inline-block h-8 w-8" />;
  }
  const current = (ORDER as readonly string[]).includes(theme ?? "")
    ? (theme as (typeof ORDER)[number])
    : "system";
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length]!;
  const glyph = current === "dark" ? "☾" : current === "light" ? "☀" : "◑";
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      className="flex h-8 w-8 items-center justify-center rounded-(--cn-radius-sm) border border-(--cn-border) text-sm text-(--cn-text-secondary) hover:bg-(--cn-surface) hover:text-(--cn-text)"
      title={`${LABEL[current]} — click for ${LABEL[next].toLowerCase()}`}
      aria-label={`Theme: ${LABEL[current]}. Switch to ${LABEL[next]}.`}
    >
      <span aria-hidden>{glyph}</span>
    </button>
  );
}
