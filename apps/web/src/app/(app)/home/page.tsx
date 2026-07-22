import Link from "next/link";
import {
  listUserOrganizationIds,
  listUserProjects,
  recentAuditActivity,
  recentContextActivity,
} from "@continuum/db";
import { requireActor } from "@/lib/actor";
import { getActiveSpace } from "@/lib/active-space";
import { getEnv } from "@/lib/services";

export const metadata = { title: "Home" };
export const dynamic = "force-dynamic";

const ACTION_LABELS: Record<string, string> = {
  "memory.approve": "Memory approved",
  "memory.propose": "Memory proposed",
  "memory.supersede": "Memory superseded",
  "memory.reject": "Memory rejected",
  "suggestion.accept": "Suggestion approved",
  "suggestion.reject": "Suggestion rejected",
  "suggestion.keep_temporary": "Suggestion kept temporary",
  "source.import": "Source imported",
  "context.compile": "Context generated",
};

export default async function HomePage() {
  const actor = await requireActor();
  const env = getEnv();

  const spaces = await env.tenancy.listUserSpaces(actor.userId);
  const activeSpace = await getActiveSpace(spaces);
  const orgIds = await listUserOrganizationIds(env.db, actor.userId);
  const projects = await listUserProjects(env.db, actor.userId);
  const activity = await recentContextActivity(env.db, orgIds, 5);
  const changes = await recentAuditActivity(env.db, orgIds, 8);

  // Per-Space stats (authorized reads).
  const spaceStats = await Promise.all(
    spaces.map(async (space) => {
      const memories = await env.memoryService.listSpaceMemories(actor, space.id).catch(() => []);
      const suggestions = await env.memoryService.listSuggestions(actor, space.id).catch(() => []);
      return {
        space,
        approved: memories.filter((m) => m.status === "approved").length,
        pending: suggestions.length,
        projects: projects.filter((p) => p.spaceId === space.id).length,
      };
    }),
  );
  const totalPending = spaceStats.reduce((n, s) => n + s.pending, 0);

  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-3xl">Good to see you.</h1>
      <p className="mt-2 text-(--cn-text-secondary)">
        {activeSpace ? (
          <>
            Working in <strong>{activeSpace.name}</strong>.{" "}
          </>
        ) : null}
        {totalPending > 0
          ? `${totalPending} memory suggestion${totalPending === 1 ? "" : "s"} waiting for review.`
          : "Everything is reviewed. Your context is current."}
      </p>

      {/* Attention required */}
      {totalPending > 0 ? (
        <div className="panel mt-6 flex items-center justify-between gap-4 p-4">
          <div>
            <h2 className="font-semibold">Needs your attention</h2>
            <p className="mt-1 text-sm text-(--cn-text-secondary)">
              {totalPending} suggestion{totalPending === 1 ? "" : "s"} awaiting approval.
            </p>
          </div>
          <Link href="/inbox" className="btn-primary text-sm">
            Review inbox
          </Link>
        </div>
      ) : null}

      {/* Quick actions */}
      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/spaces" className="btn-secondary text-sm">
          Create Space
        </Link>
        <Link href="/projects" className="btn-secondary text-sm">
          Create Project
        </Link>
        <Link href="/inbox" className="btn-secondary text-sm">
          Import source
        </Link>
        <Link href="/receipts" className="btn-primary text-sm">
          Generate context
        </Link>
        <Link href="/check" className="btn-secondary text-sm">
          Run preflight
        </Link>
      </div>

      {/* Spaces */}
      <section className="mt-10">
        <h2 className="font-display text-xl">Your Spaces</h2>
        {spaceStats.length === 0 ? (
          <div className="panel mt-3 p-6 text-center">
            <p className="text-(--cn-text-secondary)">You don&rsquo;t have any Spaces yet.</p>
            <Link href="/spaces" className="btn-primary mt-4 inline-flex text-sm">
              Create your first Space
            </Link>
          </div>
        ) : (
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {spaceStats.map(({ space, approved, pending, projects: projectCount }) => (
              <Link
                key={space.id}
                href={`/spaces/${space.id}`}
                className="panel block p-5 transition-shadow hover:shadow-(--cn-shadow-md)"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg">{space.name}</h3>
                  {pending > 0 ? (
                    <span className="chip chip-accent">{pending} to review</span>
                  ) : null}
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-(--cn-text-secondary)">
                  {space.description || `${space.kind} Space`}
                </p>
                <p className="font-data mt-4 text-(--cn-text-tertiary)">
                  {approved} approved · {projectCount} project{projectCount === 1 ? "" : "s"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Recent context activity */}
      <section className="mt-10 grid gap-6 sm:grid-cols-2">
        <div>
          <h2 className="font-display text-xl">Recent context</h2>
          {activity.length === 0 ? (
            <p className="mt-3 text-sm text-(--cn-text-tertiary)">No context requested yet.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {activity.map((a) => (
                <li
                  key={a.requestId}
                  className="rounded-(--cn-radius-md) border border-(--cn-border) p-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{a.spaceName}</span>
                    <span className="font-data text-xs text-(--cn-text-tertiary)">
                      {a.requestingIntegration}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-1 text-(--cn-text-secondary)">
                    {a.taskDescription || "Context package"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h2 className="font-display text-xl">Recent changes</h2>
          {changes.length === 0 ? (
            <p className="mt-3 text-sm text-(--cn-text-tertiary)">No recent changes.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-1.5 text-sm">
              {changes.map((c) => (
                <li key={c.id} className="flex items-center gap-2 text-(--cn-text-secondary)">
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: "var(--cn-accent)" }}
                  />
                  {ACTION_LABELS[c.action] ?? c.action}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
