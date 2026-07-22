import type { ContextBundle } from "@continuum/contracts";
import { requireActor } from "@/lib/actor";
import { getEnv } from "@/lib/services";

export const metadata = { title: "Context & Receipts" };
export const dynamic = "force-dynamic";

export default async function ReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const env = getEnv();
  const actor = await requireActor();

  const visibleSpaces = await env.tenancy.listUserSpaces(actor.userId);

  const spaceId = typeof params.spaceId === "string" ? params.spaceId : "";
  const task = typeof params.task === "string" ? params.task : "";
  const selectedSpace = visibleSpaces.find((s) => s.id === spaceId);

  let bundle: ContextBundle | null = null;
  let error: string | null = null;
  if (selectedSpace && task) {
    try {
      bundle = await env.generateContext(actor, {
        organizationId: selectedSpace.organizationId,
        spaceId: selectedSpace.id,
        requestingIntegration: "web_app",
        taskDescription: task,
      });
    } catch {
      error = "Context generation failed. Your data is safe — try again.";
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-3xl">Context & Receipts</h1>
      <p className="mt-2 text-(--cn-text-secondary)">
        Compile the smallest trustworthy context package for a task, then inspect exactly what was
        included — and what was deliberately left out.
      </p>

      <form method="GET" className="panel mt-8 space-y-4 p-5">
        <div>
          <label htmlFor="spaceId" className="text-sm font-semibold">
            Space
          </label>
          <select
            id="spaceId"
            name="spaceId"
            defaultValue={spaceId || visibleSpaces[0]?.id}
            className="mt-1 w-full rounded-(--cn-radius-md) border border-(--cn-border-strong) bg-(--cn-surface) px-3 py-2 text-sm"
          >
            {visibleSpaces.map((space) => (
              <option key={space.id} value={space.id}>
                {space.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="task" className="text-sm font-semibold">
            What are you working on?
          </label>
          <input
            id="task"
            name="task"
            type="text"
            defaultValue={task}
            placeholder="e.g. Write the March newsletter"
            className="mt-1 w-full rounded-(--cn-radius-md) border border-(--cn-border-strong) bg-(--cn-surface) px-3 py-2 text-sm"
          />
        </div>
        <button type="submit" className="btn-primary text-sm">
          Generate context
        </button>
      </form>

      {error ? (
        <div className="panel mt-8 border-(--cn-error) p-5 text-sm text-(--cn-error)">{error}</div>
      ) : null}

      {bundle ? (
        <section className="mt-8 space-y-6" aria-live="polite">
          <div className="panel p-5">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-display text-xl">Context package</h2>
              <span className="font-data text-(--cn-text-tertiary)">
                ~{bundle.receipt.totalEstimatedTokens} tokens
              </span>
            </div>
            <pre className="mt-4 overflow-x-auto rounded-(--cn-radius-md) bg-(--cn-bg) p-4 text-xs leading-relaxed whitespace-pre-wrap">
              {bundle.renderedText}
            </pre>
            <p className="mt-2 text-xs text-(--cn-text-tertiary)">
              Copy this block into any AI surface — or connect via MCP and skip the paste.
            </p>
          </div>

          <div className="panel p-5">
            <h2 className="font-display text-xl">Context Receipt</h2>
            <p className="font-data mt-1 text-(--cn-text-tertiary)">
              {bundle.receipt.bundleId} · {bundle.receipt.requestingIntegration} ·{" "}
              {new Date(bundle.receipt.generatedAt).toLocaleString()}
            </p>
            <dl className="mt-4 space-y-4 text-sm">
              <ReceiptGroup label="Rules used" items={bundle.receipt.rules.map((r) => r.text)} />
              <ReceiptGroup
                label="Audience & voice"
                items={bundle.receipt.audienceAndVoice.map((r) => r.text)}
              />
              <ReceiptGroup
                label="Facts & decisions"
                items={bundle.receipt.facts.map((r) => r.text)}
              />
              <ReceiptGroup label="Sources" items={bundle.receipt.sources.map((s) => s.title)} />
              <div>
                <dt className="font-semibold text-(--cn-warning)">Excluded</dt>
                {bundle.receipt.excluded.length === 0 ? (
                  <dd className="mt-1 text-(--cn-text-secondary)">Nothing was excluded.</dd>
                ) : (
                  <dd>
                    <ul className="mt-1 space-y-1">
                      {bundle.receipt.excluded.map((exclusion, index) => (
                        <li key={index} className="text-(--cn-text-secondary)">
                          <span className="font-data">{exclusion.reason}</span> — {exclusion.title}
                        </li>
                      ))}
                    </ul>
                  </dd>
                )}
              </div>
            </dl>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ReceiptGroup({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <dt className="font-semibold">{label}</dt>
      <dd>
        <ul className="mt-1 space-y-1">
          {items.map((item, index) => (
            <li key={index} className="text-(--cn-text-secondary)">
              {item}
            </li>
          ))}
        </ul>
      </dd>
    </div>
  );
}
