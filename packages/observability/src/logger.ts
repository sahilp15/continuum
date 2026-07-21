export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_RANK: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

/**
 * Keys whose values are always redacted before a log line is emitted.
 * Secrets, OAuth tokens, and raw credentials must never reach logs (spec §25, §39).
 */
const SENSITIVE_KEY_PATTERN =
  /(secret|token|password|credential|authorization|api[_-]?key|cookie|refresh)/i;

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[depth-limited]";
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value)) {
      out[key] = SENSITIVE_KEY_PATTERN.test(key) ? "[redacted]" : redact(v, depth + 1);
    }
    return out;
  }
  return value;
}

export interface Logger {
  debug(message: string, fields?: Record<string, unknown>): void;
  info(message: string, fields?: Record<string, unknown>): void;
  warn(message: string, fields?: Record<string, unknown>): void;
  error(message: string, fields?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): Logger;
}

export interface LoggerOptions {
  name: string;
  level?: LogLevel;
  bindings?: Record<string, unknown>;
  /** Injectable sink so tests can capture output. Defaults to stdout JSON lines. */
  sink?: (line: string) => void;
}

export function createLogger(options: LoggerOptions): Logger {
  const level = options.level ?? "info";
  const sink = options.sink ?? ((line: string) => process.stdout.write(`${line}\n`));
  const bindings = options.bindings ?? {};

  function emit(logLevel: LogLevel, message: string, fields?: Record<string, unknown>): void {
    if (LEVEL_RANK[logLevel] < LEVEL_RANK[level]) return;
    const entry = {
      level: logLevel,
      logger: options.name,
      time: new Date().toISOString(),
      message,
      ...(redact(bindings) as Record<string, unknown>),
      ...(fields ? (redact(fields) as Record<string, unknown>) : {}),
    };
    sink(JSON.stringify(entry));
  }

  return {
    debug: (m, f) => emit("debug", m, f),
    info: (m, f) => emit("info", m, f),
    warn: (m, f) => emit("warn", m, f),
    error: (m, f) => emit("error", m, f),
    child: (childBindings) =>
      createLogger({
        ...options,
        bindings: { ...bindings, ...childBindings },
      }),
  };
}
