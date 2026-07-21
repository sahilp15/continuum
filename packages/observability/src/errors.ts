/**
 * Error monitoring abstraction. Production wires this to a real provider
 * (e.g. Sentry) behind the same interface; local development logs to console.
 */
export interface ErrorMonitor {
  captureException(error: unknown, context?: Record<string, unknown>): void;
  captureMessage(message: string, context?: Record<string, unknown>): void;
}

export const consoleErrorMonitor: ErrorMonitor = {
  captureException(error, context) {
    console.error("[error-monitor]", error, context ?? {});
  },
  captureMessage(message, context) {
    console.error("[error-monitor]", message, context ?? {});
  },
};
