import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentActor, getSession } from "@/lib/actor";
import { getActiveSpace } from "@/lib/active-space";
import { getEnv, getOnboarding } from "@/lib/services";
import { SpaceSwitcher } from "./space-switcher";
import { UserMenu } from "./user-menu";

const NAV = [
  { href: "/home", label: "Home" },
  { href: "/spaces", label: "Spaces" },
  { href: "/projects", label: "Projects" },
  { href: "/inbox", label: "Memory Inbox" },
  { href: "/check", label: "Preflight" },
  { href: "/receipts", label: "Context Receipts" },
  { href: "/connectors", label: "Connectors" },
  { href: "/settings", label: "Settings" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Server-side gate: unauthenticated → sign-in; not-yet-onboarded → onboarding.
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in?returnTo=/home");
  const onboarding = getOnboarding();
  if ((await onboarding.getStatus(actor.userId)) !== "complete") {
    redirect("/onboarding");
  }

  const env = getEnv();
  const spaces = await env.tenancy.listUserSpaces(actor.userId);
  const activeSpace = await getActiveSpace(spaces);
  const profile = await env.tenancy.getProfile(actor.userId);
  const session = await getSession();
  const displayName = profile?.displayName || session?.user?.name || "Your account";
  const email = session?.user?.email ?? "";

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-(--cn-border) px-4 py-6 sm:flex">
        <Link href="/home" className="flex items-center gap-2 px-2">
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
        <div className="mt-auto">
          <UserMenu name={displayName} email={email} />
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        <header className="flex items-center justify-between gap-4 border-b border-(--cn-border) px-6 py-3">
          <div className="flex items-center gap-3">
            {activeSpace ? (
              <SpaceSwitcher spaces={spaces} activeId={activeSpace.id} />
            ) : (
              <span className="text-sm text-(--cn-text-tertiary)">No Space yet</span>
            )}
          </div>
          <nav
            className="flex gap-3 overflow-x-auto text-xs font-medium sm:hidden"
            aria-label="Primary (mobile)"
          >
            {NAV.slice(0, 5).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap text-(--cn-text-secondary)"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <div className="px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
