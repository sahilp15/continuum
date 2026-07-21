import Link from "next/link";
import { getDemoActor, getDemoEnvironment } from "@/lib/demo";

export const metadata = { title: "Spaces" };
export const dynamic = "force-dynamic";

export default async function SpacesPage() {
  const env = getDemoEnvironment();
  const actor = getDemoActor();

  const visible = [];
  for (const space of env.data.spaces) {
    const ok = await env.memoryService.listSpaceMemories(actor, space.id).catch(() => null);
    if (ok) visible.push(space);
  }

  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-3xl">Spaces</h1>
      <p className="mt-2 text-(--cn-text-secondary)">
        Each Space is a hard context boundary. Information never crosses Spaces without your
        explicit action.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {visible.map((space) => (
          <Link
            key={space.id}
            href={`/spaces/${space.id}`}
            className="panel block p-5 transition-shadow hover:shadow-(--cn-shadow-md)"
          >
            <p className="chip">{space.kind}</p>
            <h2 className="font-display mt-3 text-xl">{space.name}</h2>
            <p className="mt-1 line-clamp-2 text-sm text-(--cn-text-secondary)">
              {space.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
