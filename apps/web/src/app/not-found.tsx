import Link from "next/link";

export const metadata = { title: "Not found" };

/** 404 boundary — calm, on-brand, and points the user somewhere useful. */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-start justify-center px-6">
      <span className="chip">404</span>
      <h1 className="font-display mt-4 text-3xl">We couldn&rsquo;t find that page.</h1>
      <p className="mt-3 text-(--cn-text-secondary)">
        The link may be old, or the page may have moved. Your Spaces and memory are unaffected.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/home" className="btn-primary text-sm">
          Go home
        </Link>
        <Link href="/" className="btn-secondary text-sm">
          About Continuum
        </Link>
      </div>
    </main>
  );
}
