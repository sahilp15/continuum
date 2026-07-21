import { getDemoActor, getDemoEnvironment } from "@/lib/demo";
import { acceptSuggestion, keepTemporary, rejectSuggestion } from "./actions";

export const metadata = { title: "Memory Inbox" };
export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const env = getDemoEnvironment();
  const actor = getDemoActor();

  const pending = [];
  for (const space of env.data.spaces) {
    const suggestions = await env.memoryService.listSuggestions(actor, space.id).catch(() => []);
    for (const suggestion of suggestions) {
      pending.push({ space, suggestion });
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-3xl">Memory Inbox</h1>
      <p className="mt-2 text-(--cn-text-secondary)">
        Nothing becomes permanent memory until you approve it here.
      </p>

      {pending.length === 0 ? (
        <div className="panel mt-8 p-8 text-center">
          <p className="font-display text-xl">Inbox zero.</p>
          <p className="mt-2 text-sm text-(--cn-text-secondary)">
            When Continuum spots a durable fact, deadline, or rule change, it will appear here for
            review.
          </p>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {pending.map(({ space, suggestion }) => (
            <li key={suggestion.id} className="panel p-5">
              <div className="flex items-center justify-between gap-4">
                <p className="font-data text-(--cn-text-tertiary)">
                  {space.name}
                  {suggestion.projectId ? " · project" : ""} · {suggestion.memoryType}
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
                  “{suggestion.sourceExcerpt}”
                </blockquote>
              ) : null}
              <p className="mt-2 text-xs text-(--cn-text-tertiary)">{suggestion.rationale}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                <form action={acceptSuggestion}>
                  <input type="hidden" name="suggestionId" value={suggestion.id} />
                  <button type="submit" className="btn-primary text-sm">
                    Save change
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
