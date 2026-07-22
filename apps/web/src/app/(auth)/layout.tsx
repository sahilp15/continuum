import Link from "next/link";

/** Calm, branded shell for authentication pages. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <svg width="24" height="24" viewBox="0 0 26 26" aria-hidden>
          <path
            d="M13 4 C 20 4, 22 10, 18 13 C 22 16, 20 22, 13 22 C 6 22, 4 16, 8 13 C 4 10, 6 4, 13 4 Z"
            fill="none"
            stroke="var(--cn-accent)"
            strokeWidth="2.2"
          />
        </svg>
        <span className="font-display text-xl">Continuum</span>
      </Link>
      {children}
    </div>
  );
}
