import Link from "next/link";
import { demoUsers } from "@continuum/testing";

const NAV = [
  { href: "/home", label: "Home" },
  { href: "/spaces", label: "Spaces" },
  { href: "/inbox", label: "Memory Inbox" },
  { href: "/check", label: "Check" },
  { href: "/receipts", label: "Receipts" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-7xl">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-(--cn-border) px-4 py-6 sm:flex">
        <Link href="/" className="flex items-center gap-2 px-2">
          <svg width="22" height="22" viewBox="0 0 26 26" aria-hidden>
            <path
              d="M13 4 C 20 4, 22 10, 18 13 C 22 16, 20 22, 13 22 C 6 22, 4 16, 8 13 C 4 10, 6 4, 13 4 Z"
              fill="none"
              stroke="var(--cn-accent)"
              strokeWidth="2.2"
            />
          </svg>
          <span className="font-display text-lg">Continuum</span>
        </Link>
        <nav className="mt-8 flex flex-col gap-1" aria-label="Primary">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-(--cn-radius-sm) px-3 py-2 text-sm font-medium text-(--cn-text-secondary) hover:bg-(--cn-surface) hover:text-(--cn-text)"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto px-3 text-xs text-(--cn-text-tertiary)">
          <p className="font-semibold text-(--cn-text-secondary)">{demoUsers.freelancer.name}</p>
          <p className="mt-0.5">Demo mode · local fixtures</p>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-6 py-8">
        <nav
          className="mb-6 flex gap-4 overflow-x-auto text-sm font-medium sm:hidden"
          aria-label="Primary (mobile)"
        >
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap text-(--cn-text-secondary)"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        {children}
      </main>
    </div>
  );
}
