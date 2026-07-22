import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentActor } from "@/lib/actor";

/** Calm, branded shell for authentication pages. */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  // Already signed in? Skip the form. This is the ONLY "authenticated → /home"
  // redirect for auth pages, and it is gated on the REAL session (a DB lookup),
  // not cookie presence — so a stale cookie can never bounce us here and loop
  // against the server-side gate on /home. See middleware.ts for the rationale.
  if (await getCurrentActor()) redirect("/home");

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
