/**
 * Design token names as TypeScript constants, so components reference tokens
 * by name instead of hardcoding values. The CSS lives in `tokens.css`.
 */
export const tokens = {
  color: {
    bg: "var(--cn-bg)",
    surface: "var(--cn-surface)",
    surfaceRaised: "var(--cn-surface-raised)",
    text: "var(--cn-text)",
    textSecondary: "var(--cn-text-secondary)",
    textTertiary: "var(--cn-text-tertiary)",
    border: "var(--cn-border)",
    borderStrong: "var(--cn-border-strong)",
    accent: "var(--cn-accent)",
    accentHover: "var(--cn-accent-hover)",
    accentMuted: "var(--cn-accent-muted)",
    success: "var(--cn-success)",
    warning: "var(--cn-warning)",
    error: "var(--cn-error)",
    info: "var(--cn-info)",
  },
  radius: {
    sm: "var(--cn-radius-sm)",
    md: "var(--cn-radius-md)",
    lg: "var(--cn-radius-lg)",
  },
  motion: {
    ease: "var(--cn-ease)",
    fast: "var(--cn-duration-fast)",
    base: "var(--cn-duration-base)",
    slow: "var(--cn-duration-slow)",
  },
} as const;
