import { redirect } from "next/navigation";
import type { Memory, Suggestion } from "@continuum/contracts";
import { requireActor } from "@/lib/actor";
import { googleConnectorConfigured } from "@/lib/env";
import { getEnv, getOnboarding } from "@/lib/services";
import {
  createFirstProject,
  createFirstSpace,
  finishOnboarding,
  goBack,
  goToImport,
  goToProject,
  importFirstSource,
  reviewSuggestion,
  savePersona,
  saveProfile,
} from "./actions";
import { Stepper } from "./stepper";

export const dynamic = "force-dynamic";
export const metadata = { title: "Get started" };

const STEP_TITLES = [
  "Welcome",
  "Your profile",
  "Your first Space",
  "Connect a source",
  "Import context",
  "Review memory",
  "Your first Project",
  "Your first result",
];

const FIELD =
  "w-full rounded-(--cn-radius-md) border border-(--cn-border-strong) bg-(--cn-bg) px-3 py-2 text-sm";

const BACK_BUTTON_CLASS = "text-sm text-(--cn-text-secondary) underline-offset-2 hover:underline";

/** Standalone Back button — wraps its own <form>. Use only where there is NO
 *  enclosing <form> already (nesting <form> inside <form> is invalid HTML and
 *  breaks React hydration — see BackSubmit for the in-form case). `step` is
 *  bound into the action (Next's documented pattern for extra args), not
 *  carried via a hidden input. */
function BackButton({ step }: { step: number }) {
  return (
    <form action={goBack.bind(null, step)}>
      <button type="submit" className={BACK_BUTTON_CLASS}>
        ← Back
      </button>
    </form>
  );
}

/** In-form Back button — NO <form> of its own. Submits the form it's placed
 *  inside, but routes to `goBack` via `formAction`. `step` is bound into the
 *  action rather than passed as a name/value pair: a <button formAction={fn}>
 *  where `fn` is a function reference can't also carry its own name/value —
 *  React reserves that encoding for identifying the action itself. Use INSIDE
 *  an existing <form>. */
function BackSubmit({ step }: { step: number }) {
  return (
    <button type="submit" formAction={goBack.bind(null, step)} className={BACK_BUTTON_CLASS}>
      ← Back
    </button>
  );
}

export default async function OnboardingPage() {
  const actor = await requireActor();
  const onboarding = getOnboarding();
  if ((await onboarding.getStatus(actor.userId)) === "complete") redirect("/home");

  const state = await onboarding.get(actor.userId);
  const step = Math.min(Math.max(state.step, 0), 7);
  const data = state.data as Record<string, string | number | undefined>;

  // The review step needs the Space's pending suggestions + approved memory.
  let suggestions: Suggestion[] = [];
  let approved: Memory[] = [];
  if (step === 5 && typeof data.spaceId === "string") {
    const env = getEnv();
    suggestions = await env.memoryService.listSuggestions(actor, data.spaceId).catch(() => []);
    approved = (
      await env.memoryService.listSpaceMemories(actor, data.spaceId).catch(() => [])
    ).filter((m) => m.status === "approved");
  }

  return (
    <div>
      <Stepper current={step} titles={STEP_TITLES} />
      <div className="panel p-6 sm:p-8">
        {step === 0 && (
          <form action={savePersona} className="flex flex-col gap-5">
            <div>
              <h1 className="font-display text-3xl">Welcome to Continuum.</h1>
              <p className="mt-2 text-(--cn-text-secondary)">
                Continuum gives your AI tools and apps one shared understanding of who you are and
                what you&rsquo;re working on — so you never brief an AI twice.
              </p>
            </div>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">What best describes you?</span>
              <select name="persona" className={FIELD} defaultValue="freelancer">
                {[
                  "Freelancer",
                  "Agency",
                  "Consultant",
                  "Creator",
                  "Student",
                  "Developer",
                  "Other",
                ].map((p) => (
                  <option key={p} value={p.toLowerCase()}>
                    {p}
                  </option>
                ))}
              </select>
              <span className="text-xs text-(--cn-text-tertiary)">
                We use this only to personalize your setup.
              </span>
            </label>
            <button type="submit" className="btn-primary w-fit text-sm">
              Get started
            </button>
          </form>
        )}

        {step === 1 && (
          <form action={saveProfile} className="flex flex-col gap-5">
            <div>
              <h1 className="font-display text-3xl">A little about you.</h1>
              <p className="mt-2 text-(--cn-text-secondary)">
                A few preferences your AI can carry across every Space.
              </p>
            </div>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Name</span>
              <input
                name="displayName"
                className={FIELD}
                defaultValue={String(data.displayName ?? "")}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Role</span>
              <input name="role" className={FIELD} placeholder="e.g. Freelance copywriter" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Preferred writing style</span>
              <input
                name="writingStyle"
                className={FIELD}
                placeholder="e.g. Precise, calm, evidence-led"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Common output types</span>
              <input
                name="outputs"
                className={FIELD}
                placeholder="e.g. Newsletters, briefs, proposals"
              />
            </label>
            <div className="flex items-center justify-between">
              <BackSubmit step={step} />
              <button type="submit" className="btn-primary text-sm">
                Continue
              </button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form action={createFirstSpace} className="flex flex-col gap-5">
            <div>
              <h1 className="font-display text-3xl">Create your first Space.</h1>
              <p className="mt-2 text-(--cn-text-secondary)">
                Spaces keep different worlds completely separate — a client, a company, a class, or
                a personal project. Nothing leaks between them.
              </p>
            </div>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Space name</span>
              <input name="name" className={FIELD} placeholder="e.g. Northbank" required />
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
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Short description (optional)</span>
              <input name="description" className={FIELD} placeholder="What is this Space for?" />
            </label>
            <div className="flex items-center justify-between">
              <BackSubmit step={step} />
              <button type="submit" className="btn-primary text-sm">
                Create Space
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-5">
            <div>
              <h1 className="font-display text-3xl">Bring in some context.</h1>
              <p className="mt-2 text-(--cn-text-secondary)">
                Continuum learns from sources you choose — with your permission, nothing is
                remembered without your approval. Paste or upload now to keep moving — you can
                connect a live app afterward from Connectors.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  name: "Google Workspace",
                  note: "Gmail · Drive · Calendar",
                  ready: googleConnectorConfigured,
                },
                { name: "Slack", note: "Channels · messages", ready: false },
                { name: "Notion", note: "Pages · databases", ready: false },
                { name: "GitHub", note: "Repos · issues", ready: false },
              ].map((c) => (
                <div
                  key={c.name}
                  className="rounded-(--cn-radius-md) border border-(--cn-border) p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{c.name}</span>
                    <span className="chip">
                      {c.ready ? "Connect after this step" : "Coming soon"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-(--cn-text-tertiary)">{c.note}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <BackButton step={step} />
              <form action={goToImport}>
                <button type="submit" className="btn-primary text-sm">
                  Paste or upload instead
                </button>
              </form>
            </div>
          </div>
        )}

        {step === 4 && (
          <form action={importFirstSource} className="flex flex-col gap-5">
            <div>
              <h1 className="font-display text-3xl">Import your first source.</h1>
              <p className="mt-2 text-(--cn-text-secondary)">
                Paste a brief, brand guide, or notes. Continuum will suggest candidate memories for
                you to review — it never saves anything without your approval.
              </p>
            </div>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Title</span>
              <input name="title" className={FIELD} placeholder="e.g. Brand guide" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Content</span>
              <textarea
                name="content"
                className={`${FIELD} min-h-40 font-data`}
                placeholder={
                  "Voice: precise, calm, professional\nAudience: small-business CFOs\nThe newsletter launches March 21."
                }
                required
              />
            </label>
            <div className="flex items-center justify-between">
              <BackSubmit step={step} />
              <button type="submit" className="btn-primary text-sm">
                Extract candidates
              </button>
            </div>
          </form>
        )}

        {step === 5 && (
          <div className="flex flex-col gap-5">
            <div>
              <h1 className="font-display text-3xl">Review suggested memory.</h1>
              <p className="mt-2 text-(--cn-text-secondary)">
                Continuum found these candidates. Approve what&rsquo;s right, reject what
                isn&rsquo;t. Nothing becomes permanent memory without your approval.
              </p>
            </div>
            {suggestions.length === 0 ? (
              <p className="rounded-(--cn-radius-md) border border-(--cn-border) p-4 text-sm text-(--cn-text-secondary)">
                {approved.length > 0
                  ? "All candidates reviewed. You approved " + approved.length + " so far."
                  : "No candidates were extracted from that source. You can continue — you can always import more later."}
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {suggestions.map((s) => (
                  <li
                    key={s.id}
                    className="rounded-(--cn-radius-md) border border-(--cn-border) p-4"
                  >
                    <div className="flex items-center gap-2">
                      <span className="chip chip-accent">{s.memoryType}</span>
                      <span className="text-sm font-medium">{s.title}</span>
                    </div>
                    <p className="mt-2 text-sm text-(--cn-text-secondary)">{s.proposedText}</p>
                    <div className="mt-3 flex gap-2">
                      {(["accept", "keep_temporary", "reject"] as const).map((action) => (
                        <form action={reviewSuggestion} key={action}>
                          <input type="hidden" name="suggestionId" value={s.id} />
                          <input type="hidden" name="action" value={action} />
                          <button
                            type="submit"
                            className={
                              action === "accept" ? "btn-primary text-xs" : "btn-secondary text-xs"
                            }
                          >
                            {action === "accept"
                              ? "Approve"
                              : action === "keep_temporary"
                                ? "Keep temporary"
                                : "Reject"}
                          </button>
                        </form>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex items-center justify-between">
              <BackButton step={step} />
              <form action={goToProject}>
                <button type="submit" className="btn-primary text-sm">
                  Continue
                </button>
              </form>
            </div>
          </div>
        )}

        {step === 6 && (
          <form action={createFirstProject} className="flex flex-col gap-5">
            <div>
              <h1 className="font-display text-3xl">Create your first Project.</h1>
              <p className="mt-2 text-(--cn-text-secondary)">
                Projects organize work inside a Space. We&rsquo;ll generate your first context
                package from what you approved.
              </p>
            </div>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Project name</span>
              <input name="name" className={FIELD} placeholder="e.g. March newsletter" required />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Goal (optional)</span>
              <input
                name="objective"
                className={FIELD}
                placeholder="What are you trying to achieve?"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">First task for your AI</span>
              <input
                name="task"
                className={FIELD}
                placeholder="e.g. Draft the March newsletter intro"
              />
            </label>
            <div className="flex items-center justify-between">
              <BackSubmit step={step} />
              <button type="submit" className="btn-primary text-sm">
                Generate first context
              </button>
            </div>
          </form>
        )}

        {step === 7 && <FirstResult data={data} />}
      </div>
    </div>
  );
}

function FirstResult({ data }: { data: Record<string, string | number | undefined> }) {
  const receipt = (data.receipt ?? null) as {
    spaceName?: string;
    projectName?: string;
    rules?: unknown[];
    facts?: unknown[];
    audienceAndVoice?: unknown[];
    sources?: { title: string }[];
    totalEstimatedTokens?: number;
  } | null;
  const rendered = String(data.renderedText ?? "");

  return (
    <div className="flex flex-col gap-5">
      <div>
        <span className="chip chip-accent">Setup complete</span>
        <h1 className="font-display mt-3 text-3xl">Your first context package.</h1>
        <p className="mt-2 text-(--cn-text-secondary)">
          Generated from the memory you approved in{" "}
          <strong>{String(data.spaceName ?? "your Space")}</strong>. This is what an AI would
          receive — with a Context Receipt showing exactly what was used.
        </p>
      </div>

      {rendered ? (
        <pre className="font-data max-h-64 overflow-auto whitespace-pre-wrap rounded-(--cn-radius-md) border border-(--cn-border) bg-(--cn-surface) p-4 text-xs">
          {rendered}
        </pre>
      ) : null}

      {receipt ? (
        <div className="rounded-(--cn-radius-md) border border-(--cn-border) p-4">
          <h2 className="font-semibold">Context Receipt</h2>
          <dl className="font-data mt-2 grid grid-cols-2 gap-y-1 text-xs text-(--cn-text-secondary)">
            <dt>Space</dt>
            <dd>{receipt.spaceName ?? "—"}</dd>
            <dt>Project</dt>
            <dd>{receipt.projectName ?? "—"}</dd>
            <dt>Rules</dt>
            <dd>{receipt.rules?.length ?? 0}</dd>
            <dt>Facts</dt>
            <dd>{receipt.facts?.length ?? 0}</dd>
            <dt>Voice / audience</dt>
            <dd>{receipt.audienceAndVoice?.length ?? 0}</dd>
            <dt>Sources</dt>
            <dd>{receipt.sources?.map((s) => s.title).join(", ") || "—"}</dd>
            <dt>Est. tokens</dt>
            <dd>{receipt.totalEstimatedTokens ?? 0}</dd>
          </dl>
        </div>
      ) : null}

      <form action={finishOnboarding}>
        <button type="submit" className="btn-primary text-sm">
          Go to your dashboard
        </button>
      </form>
    </div>
  );
}
