import { notFound } from "next/navigation";
import type { Memory } from "@continuum/contracts";
import { getDemoActor, getDemoEnvironment } from "@/lib/demo";

export const metadata = { title: "Space" };
export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<Memory["status"], string> = {
  approved: "text-(--cn-success)",
  proposed: "text-(--cn-info)",
  rejected: "text-(--cn-text-tertiary) line-through",
  superseded: "text-(--cn-text-tertiary) line-through",
  expired: "text-(--cn-text-tertiary)",
  deleted: "text-(--cn-text-tertiary) line-through",
};

export default async function SpacePage({ params }: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = await params;
  const env = getDemoEnvironment();
  const actor = getDemoActor();

  const space = env.getSpace(spaceId);
  const memories = await env.memoryService.listSpaceMemories(actor, spaceId).catch(() => null);
  // Resource-hiding: unauthorized and nonexistent Spaces look identical.
  if (!space || !memories) notFound();

  const projects = env.data.projects.filter((p) => p.spaceId === spaceId);
  const sources = await env.store.listSpaceSources(spaceId);
  const byType = new Map<string, Memory[]>();
  for (const memory of memories) {
    const list = byType.get(memory.type) ?? [];
    list.push(memory);
    byType.set(memory.type, list);
  }
  const typeOrder = [
    "compliance_rule",
    "hard_rule",
    "terminology",
    "audience",
    "voice",
    "deadline",
    "decision",
    "fact",
    "product",
    "example",
    "preference",
  ];
  const orderedTypes = [...byType.keys()].sort((a, b) => {
    const ia = typeOrder.indexOf(a);
    const ib = typeOrder.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.localeCompare(b);
  });

  return (
    <div className="max-w-4xl">
      <p className="chip">{space.kind}</p>
      <h1 className="font-display mt-3 text-3xl">{space.name}</h1>
      <p className="mt-2 max-w-2xl text-(--cn-text-secondary)">{space.description}</p>

      <section className="mt-8">
        <h2 className="font-semibold">Projects</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {projects.map((project) => (
            <div key={project.id} className="panel p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{project.name}</h3>
                <span className="chip">{project.status}</span>
              </div>
              <p className="mt-1 text-sm text-(--cn-text-secondary)">{project.objective}</p>
            </div>
          ))}
          {projects.length === 0 ? (
            <p className="text-sm text-(--cn-text-tertiary)">No projects yet.</p>
          ) : null}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-semibold">Memory library</h2>
        <p className="mt-1 text-sm text-(--cn-text-secondary)">
          Full lifecycle visibility: superseded and rejected memory stays inspectable but never
          reaches retrieval.
        </p>
        <div className="mt-4 space-y-6">
          {orderedTypes.map((type) => (
            <div key={type}>
              <h3 className="font-data uppercase tracking-wider text-(--cn-text-tertiary)">
                {type.replace(/_/g, " ")}
              </h3>
              <ul className="mt-2 space-y-2">
                {(byType.get(type) ?? []).map((memory) => (
                  <li key={memory.id} className="panel flex items-start justify-between gap-4 p-4">
                    <div>
                      <p className="text-sm font-medium">{memory.title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-(--cn-text-secondary)">
                        {memory.canonicalText}
                      </p>
                    </div>
                    <span className={`font-data shrink-0 ${STATUS_STYLE[memory.status]}`}>
                      {memory.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-semibold">Connected sources</h2>
        <ul className="mt-3 space-y-2">
          {sources.map((source) => (
            <li key={source.id} className="panel flex items-center justify-between gap-4 p-4">
              <div>
                <p className="text-sm font-medium">{source.title}</p>
                <p className="font-data mt-0.5 text-(--cn-text-tertiary)">
                  {source.kind} · {source.authority.replace(/_/g, " ")}
                </p>
              </div>
              <span className="chip">{source.sensitivity}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
