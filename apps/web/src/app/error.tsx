"use client";

import { useEffect } from "react";

/**
 * Route-segment error boundary. Continuum errors say: what happened, whether
 * your data is safe, and what to do next — never a raw stack trace (see UX.md).
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface for error monitoring; the observability sink wires in later phases.
    console.error("Route error:", error);
  }, [error]);

  return (
    <main
      role="alert"
      aria-live="assertive"
      className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-start justify-center px-6"
    >
      <span className="chip">Something went wrong</span>
      <h1 className="font-display mt-4 text-3xl">This page hit an error.</h1>
      <p className="mt-3 text-(--cn-text-secondary)">
        Your data is safe — nothing was changed by this error. You can try again, and if it keeps
        happening, head back home and reopen the page.
      </p>
      {error.digest ? (
        <p className="font-data mt-4 text-(--cn-text-tertiary)">Reference: {error.digest}</p>
      ) : null}
      <div className="mt-8 flex gap-3">
        <button type="button" onClick={reset} className="btn-primary text-sm">
          Try again
        </button>
        <a href="/home" className="btn-secondary text-sm">
          Go home
        </a>
      </div>
    </main>
  );
}
