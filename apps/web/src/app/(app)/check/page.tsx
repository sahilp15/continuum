import type { PreflightResult } from "@continuum/contracts";
import { requireActor } from "@/lib/actor";
import { getEnv } from "@/lib/services";

export const metadata = { title: "Preflight Check" };
export const dynamic = "force-dynamic";

const SEVERITY_STYLE: Record<string, string> = {
  blocker: "border-(--cn-error) text-(--cn-error)",
  error: "border-(--cn-error) text-(--cn-error)",
  warning: "border-(--cn-warning) text-(--cn-warning)",
  info: "border-(--cn-info) text-(--cn-info)",
};

export default async function CheckPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const env = getEnv();
  const actor = await requireActor();

  const visibleSpaces = await env.tenancy.listUserSpaces(actor.userId);

  const spaceId = typeof params.spaceId === "string" ? params.spaceId : "";
  const content = typeof params.content === "string" ? params.content : "";
  let result: PreflightResult | null = null;
  if (spaceId && content && visibleSpaces.some((s) => s.id === spaceId)) {
    result = await env.preflight(actor, spaceId, content);
  }

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-3xl">Preflight</h1>
      <p className="mt-2 text-(--cn-text-secondary)">
        Check a draft against a Space&apos;s approved rules before it ships. Deterministic checks
        only — nothing here is a legal or compliance conclusion.
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
          <label htmlFor="content" className="text-sm font-semibold">
            Draft content
          </label>
          <textarea
            id="content"
            name="content"
            rows={6}
            defaultValue={content}
            placeholder="Paste the draft you want to check…"
            className="mt-1 w-full rounded-(--cn-radius-md) border border-(--cn-border-strong) bg-(--cn-surface) px-3 py-2 text-sm leading-relaxed"
          />
        </div>
        <button type="submit" className="btn-primary text-sm">
          Run preflight
        </button>
      </form>

      {result ? (
        <section className="mt-8" aria-live="polite">
          <div
            className={`panel flex items-center justify-between p-5 ${
              result.passed ? "" : "border-(--cn-error)"
            }`}
          >
            <div>
              <h2 className="font-display text-xl">
                {result.passed ? "Clear for takeoff" : "Findings need attention"}
              </h2>
              <p className="mt-1 text-sm text-(--cn-text-secondary)">
                {result.findings.length} finding{result.findings.length === 1 ? "" : "s"} ·{" "}
                {new Date(result.checkedAt).toLocaleTimeString()}
              </p>
            </div>
            <span className={`chip ${result.passed ? "chip-accent" : ""}`}>
              {result.passed ? "passed" : "action required"}
            </span>
          </div>
          <ul className="mt-4 space-y-3">
            {result.findings.map((finding, index) => (
              <li
                key={index}
                className={`panel border-l-4 p-4 ${SEVERITY_STYLE[finding.severity] ?? ""}`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-data uppercase">{finding.severity}</span>
                  <span className="chip">{finding.category.replace(/_/g, " ")}</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-(--cn-text)">
                  {finding.explanation}
                </p>
                {finding.excerpt ? (
                  <p className="font-data mt-2 rounded bg-(--cn-bg) p-2 text-(--cn-text-secondary)">
                    {finding.excerpt}
                  </p>
                ) : null}
                {finding.suggestedCorrection ? (
                  <p className="mt-2 text-sm text-(--cn-success)">
                    Suggestion: {finding.suggestedCorrection}
                  </p>
                ) : null}
                {finding.violatedRuleText ? (
                  <p className="mt-2 text-xs text-(--cn-text-tertiary)">
                    Rule: {finding.violatedRuleText}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
