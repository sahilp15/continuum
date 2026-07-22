import { listUserProjects } from "@continuum/db";
import { requireActor } from "@/lib/actor";
import { getEnv } from "@/lib/services";
import { createProject } from "./actions";

export const metadata = { title: "Projects" };
export const dynamic = "force-dynamic";

const FIELD =
  "w-full rounded-(--cn-radius-md) border border-(--cn-border-strong) bg-(--cn-bg) px-3 py-2 text-sm";

export default async function ProjectsPage() {
  const actor = await requireActor();
  const env = getEnv();
  const spaces = await env.tenancy.listUserSpaces(actor.userId);
  const projects = await listUserProjects(env.db, actor.userId);
  const spaceName = new Map(spaces.map((s) => [s.id, s.name]));

  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-3xl">Projects</h1>
      <p className="mt-2 text-(--cn-text-secondary)">Projects organize work inside a Space.</p>

      {projects.length > 0 ? (
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {projects.map((p) => (
            <div key={p.id} className="panel p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-medium">{p.name}</h2>
                <span className="chip">{p.status}</span>
              </div>
              <p className="font-data mt-1 text-xs text-(--cn-text-tertiary)">
                {spaceName.get(p.spaceId) ?? "Space"}
              </p>
              {p.objective ? (
                <p className="mt-2 text-sm text-(--cn-text-secondary)">{p.objective}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-8 text-sm text-(--cn-text-tertiary)">No projects yet.</p>
      )}

      {spaces.length > 0 ? (
        <form action={createProject} className="panel mt-8 flex flex-col gap-4 p-5">
          <h2 className="font-semibold">Create a Project</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Space</span>
              <select name="spaceId" className={FIELD} defaultValue={spaces[0]!.id}>
                {spaces.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Name</span>
              <input name="name" className={FIELD} placeholder="e.g. Q2 campaign" required />
            </label>
          </div>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Goal (optional)</span>
            <input
              name="objective"
              className={FIELD}
              placeholder="What are you trying to achieve?"
            />
          </label>
          <button type="submit" className="btn-primary w-fit text-sm">
            Create Project
          </button>
        </form>
      ) : (
        <p className="mt-8 text-sm text-(--cn-text-tertiary)">
          Create a Space first, then add Projects to it.
        </p>
      )}
    </div>
  );
}
