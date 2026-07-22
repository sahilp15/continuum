import Link from "next/link";
import { requireActor } from "@/lib/actor";
import { getEnv } from "@/lib/services";
import { createSpace } from "./actions";

export const metadata = { title: "Spaces" };
export const dynamic = "force-dynamic";

const FIELD =
  "w-full rounded-(--cn-radius-md) border border-(--cn-border-strong) bg-(--cn-bg) px-3 py-2 text-sm";

export default async function SpacesPage() {
  const actor = await requireActor();
  const env = getEnv();
  const spaces = await env.tenancy.listUserSpaces(actor.userId);

  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-3xl">Spaces</h1>
      <p className="mt-2 text-(--cn-text-secondary)">
        Each Space is a hard context boundary. Information never crosses Spaces without your
        explicit action.
      </p>

      {spaces.length > 0 ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {spaces.map((space) => (
            <Link
              key={space.id}
              href={`/spaces/${space.id}`}
              className="panel block p-5 transition-shadow hover:shadow-(--cn-shadow-md)"
            >
              <p className="chip">{space.kind}</p>
              <h2 className="font-display mt-3 text-xl">{space.name}</h2>
              <p className="mt-1 line-clamp-2 text-sm text-(--cn-text-secondary)">
                {space.description || "No description"}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <p className="mt-8 text-sm text-(--cn-text-tertiary)">
          You don&rsquo;t have any Spaces yet. Create one below.
        </p>
      )}

      <form action={createSpace} className="panel mt-8 flex flex-col gap-4 p-5">
        <h2 className="font-semibold">Create a Space</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Name</span>
            <input name="name" className={FIELD} placeholder="e.g. FizzPop" required />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Type</span>
            <select name="kind" className={FIELD} defaultValue="client">
              {["client", "company", "class", "personal", "team", "other"].map((k) => (
                <option key={k} value={k}>
                  {k[0]!.toUpperCase() + k.slice(1)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Description (optional)</span>
          <input name="description" className={FIELD} placeholder="What is this Space for?" />
        </label>
        <button type="submit" className="btn-primary w-fit text-sm">
          Create Space
        </button>
      </form>
    </div>
  );
}
