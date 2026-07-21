import Link from "next/link";
import { getDemoActor, getDemoEnvironment } from "@/lib/demo";

export const metadata = { title: "Home" };
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const env = getDemoEnvironment();
  const actor = getDemoActor();

  const spaces = [];
  for (const space of env.data.spaces) {
    const memories = await env.memoryService.listSpaceMemories(actor, space.id).catch(() => null);
    if (!memories) continue;
    const suggestions = await env.memoryService.listSuggestions(actor, space.id);
    spaces.push({
      space,
      approved: memories.filter((m) => m.status === "approved").length,
      pending: suggestions.length,
      projects: env.data.projects.filter((p) => p.spaceId === space.id),
    });
  }
  const totalPending = spaces.reduce((n, s) => n + s.pending, 0);

  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-3xl">Good to see you.</h1>
      <p className="mt-2 text-(--cn-text-secondary)">
        {totalPending > 0
          ? `${totalPending} memory suggestion${totalPending === 1 ? "" : "s"} waiting for review.`
          : "Everything is reviewed. Your context is current."}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {spaces.map(({ space, approved, pending, projects }) => (
          <Link
            key={space.id}
            href={`/spaces/${space.id}`}
            className="panel block p-5 transition-shadow hover:shadow-(--cn-shadow-md)"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl">{space.name}</h2>
              {pending > 0 ? <span className="chip chip-accent">{pending} to review</span> : null}
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-(--cn-text-secondary)">
              {space.description}
            </p>
            <p className="font-data mt-4 text-(--cn-text-tertiary)">
              {approved} approved memories · {projects.length} project
              {projects.length === 1 ? "" : "s"}
            </p>
          </Link>
        ))}
      </div>

      <div className="panel mt-8 flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <h2 className="font-semibold">Next actions</h2>
          <p className="mt-1 text-sm text-(--cn-text-secondary)">
            Review pending suggestions, or generate a context package with a receipt.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/inbox" className="btn-secondary text-sm">
            Open inbox
          </Link>
          <Link href="/receipts" className="btn-primary text-sm">
            Generate context
          </Link>
        </div>
      </div>
    </div>
  );
}
