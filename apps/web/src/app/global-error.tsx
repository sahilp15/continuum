"use client";

import { useEffect } from "react";
import "./globals.css";

/**
 * Root error boundary — catches failures in the root layout itself, so it must
 * render its own <html>/<body>. Kept dependency-free and token-styled.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <main
          role="alert"
          aria-live="assertive"
          className="mx-auto flex min-h-screen max-w-lg flex-col items-start justify-center px-6"
        >
          <span className="chip">Application error</span>
          <h1 className="font-display mt-4 text-3xl">Continuum couldn&rsquo;t load this page.</h1>
          <p className="mt-3 text-(--cn-text-secondary)">
            Your data is safe. This is a display error, not a data error. Try reloading — if it
            persists, it&rsquo;s on our side and reconnecting later will fix it.
          </p>
          <div className="mt-8">
            <button type="button" onClick={reset} className="btn-primary text-sm">
              Reload
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
