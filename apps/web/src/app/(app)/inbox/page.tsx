import { requireActor } from "@/lib/actor";
import { getActiveSpace } from "@/lib/active-space";
import { getEnv } from "@/lib/services";
import { acceptSuggestion, importToActiveSpace, keepTemporary, rejectSuggestion } from "./actions";

export const metadata = { title: "Memory Inbox" };
export const dynamic = "force-dynamic";

const FIELD =
  "w-full rounded-(--cn-radius-md) border border-(--cn-border-strong) bg-(--cn-bg) px-3 py-2 text-sm";

export default async function InboxPage() {
  const actor = await requireActor();
  const env = getEnv();
  const spaces = await env.tenancy.listUserSpaces(actor.userId);
  const active = await getActiveSpace(spaces);

  const pending: Array<{
    spaceName: string;
    suggestion: Awaited<ReturnType<typeof env.memoryService.listSuggestions>>[number];
  }> = [];
  for (const space of spaces) {
    const suggestions = await env.memoryService.listSuggestions(actor, space.id).catch(() => []);
    for (const suggestion of suggestions) pending.push({ spaceName: space.name, suggestion });
  }

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-3xl">Memory Inbox</h1>
      <p className="mt-2 text-(--cn-text-secondary)">
        Nothing becomes permanent memory until you approve it here.
      </p>

      {/* Import a source into the active Space */}
      <form action={importToActiveSpace} className="panel mt-6 flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Import a source</h2>
          <span className="font-data text-xs text-(--cn-text-tertiary)">
            {active ? `into ${active.name}` : "no active Space"}
          </span>
        </div>
        <input name="title" className={FIELD} placeholder="Title (e.g. Brand guide)" />
        <textarea
          name="content"
          className={`${FIELD} min-h-28 font-data`}
          placeholder={
            "Paste text — a brief, brand guide, or notes.\nVoice: precise, calm\nDeadline: March 21."
          }
        />
        <button type="submit" className="btn-secondary w-fit text-sm" disabled={!active}>
          Extract candidates
        </button>
      </form>

      {pending.length === 0 ? (
        <div className="panel mt-6 p-8 text-center">
          <p className="font-display text-xl">Inbox zero.</p>
          <p className="mt-2 text-sm text-(--cn-text-secondary)">
            Import a source above, or when Continuum spots a durable fact, deadline, or rule it will
            appear here for review.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {pending.map(({ spaceName, suggestion }) => (
            <li key={suggestion.id} className="panel p-5">
              <div className="flex items-center justify-between gap-4">
                <p className="font-data text-(--cn-text-tertiary)">
                  {spaceName} · {suggestion.memoryType}
                </p>
                <span className="chip">{Math.round(suggestion.confidence * 100)}% confident</span>
              </div>
              <h2 className="mt-2 font-semibold">{suggestion.title}</h2>
              <p className="mt-1 text-sm leading-relaxed">{suggestion.proposedText}</p>

              {suggestion.previousValueText ? (
                <div className="mt-3 rounded-(--cn-radius-md) border border-(--cn-warning)/40 bg-(--cn-bg) p-3 text-sm">
                  <p className="font-data text-(--cn-warning)">Conflicts with approved memory</p>
                  <p className="mt-1 text-(--cn-text-secondary) line-through">
                    {suggestion.previousValueText}
                  </p>
                </div>
              ) : null}

              {suggestion.sourceExcerpt ? (
                <blockquote className="mt-3 border-l-2 border-(--cn-border-strong) pl-3 text-sm text-(--cn-text-secondary)">
                  &ldquo;{suggestion.sourceExcerpt}&rdquo;
                </blockquote>
              ) : null}
              <p className="mt-2 text-xs text-(--cn-text-tertiary)">{suggestion.rationale}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                <form action={acceptSuggestion}>
                  <input type="hidden" name="suggestionId" value={suggestion.id} />
                  <button type="submit" className="btn-primary text-sm">
                    Approve
                  </button>
                </form>
                <form action={keepTemporary}>
                  <input type="hidden" name="suggestionId" value={suggestion.id} />
                  <button type="submit" className="btn-secondary text-sm">
                    Keep temporary
                  </button>
                </form>
                <form action={rejectSuggestion}>
                  <input type="hidden" name="suggestionId" value={suggestion.id} />
                  <button type="submit" className="btn-secondary text-sm">
                    Reject
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
