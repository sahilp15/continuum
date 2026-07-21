import Link from "next/link";
import { demoSpaces, fizzpopMemories, northbankMemories } from "@continuum/testing";

/**
 * Landing page. The narrative is carried by "the thread" — one continuous
 * line that connects scattered tools into Continuum and out to every AI
 * surface. The centerpiece demo renders the real Northbank/FizzPop fixtures:
 * the same product data the tests, evals, and MCP server run on.
 */

const SCATTERED_TOOLS = ["Gmail", "Slack", "Drive", "Notion", "Calendar", "GitHub"];
const AI_SURFACES = ["ChatGPT", "Claude", "Gemini", "Your API"];

function ThreadDivider() {
  return (
    <div aria-hidden className="flex justify-center py-2">
      <svg width="2" height="96" viewBox="0 0 2 96">
        <path className="thread-path" d="M1 0 V96" pathLength={1} />
      </svg>
    </div>
  );
}

function SectionHeading(props: { kicker: string; title: string; lede?: string }) {
  return (
    <div className="reveal mx-auto max-w-2xl text-center">
      <p className="font-data uppercase tracking-[0.2em] text-(--cn-accent)">{props.kicker}</p>
      <h2 className="font-display mt-3 text-3xl sm:text-4xl text-balance">{props.title}</h2>
      {props.lede ? (
        <p className="mt-4 text-lg leading-relaxed text-(--cn-text-secondary)">{props.lede}</p>
      ) : null}
    </div>
  );
}

export default function LandingPage() {
  const northbankRules = [
    northbankMemories.noJokes!,
    northbankMemories.noGuarantees!,
    northbankMemories.productName!,
  ];
  const fizzpopRules = [fizzpopMemories.voice!, fizzpopMemories.emojis!];

  return (
    <div className="grain">
      {/* Header */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2.5">
          <ContinuumMark />
          <span className="font-display text-xl">Continuum</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium text-(--cn-text-secondary)">
          <a href="#how" className="hidden sm:inline hover:text-(--cn-text)">
            How it works
          </a>
          <a href="#demo" className="hidden sm:inline hover:text-(--cn-text)">
            Demo
          </a>
          <a href="#security" className="hidden sm:inline hover:text-(--cn-text)">
            Security
          </a>
          <Link href="/home" className="btn-primary text-sm">
            Open the app
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pt-16 pb-8 text-center sm:pt-24">
        <p className="chip chip-accent mx-auto">Never brief an AI twice</p>
        <h1 className="font-display mt-6 text-5xl leading-[1.05] text-balance sm:text-7xl">
          Your context, everywhere.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-(--cn-text-secondary) sm:text-xl">
          Continuum gives ChatGPT, Claude, Gemini, and the tools you already use one shared,
          user-controlled understanding of who you are and what you&apos;re working on.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/home" className="btn-primary">
            Build your Continuum
          </Link>
          <a href="#demo" className="btn-secondary">
            See the demo
          </a>
        </div>
      </section>

      {/* Thread: scattered tools converge */}
      <section className="mx-auto max-w-5xl px-6 py-12" aria-label="How information flows">
        <div className="flex flex-wrap items-center justify-center gap-3">
          {SCATTERED_TOOLS.map((tool, i) => (
            <span
              key={tool}
              className="chip reveal"
              style={{ transform: `rotate(${((i % 3) - 1) * 2}deg)` }}
            >
              {tool}
            </span>
          ))}
        </div>
        <ThreadDivider />
        <div className="reveal mx-auto flex max-w-md items-center justify-center gap-3 rounded-full border border-(--cn-accent) bg-(--cn-surface) px-6 py-3 shadow-(--cn-shadow-md)">
          <ContinuumMark />
          <span className="font-display text-lg">One approved context layer</span>
        </div>
        <ThreadDivider />
        <div className="flex flex-wrap items-center justify-center gap-3">
          {AI_SURFACES.map((surface) => (
            <span key={surface} className="chip chip-accent reveal">
              {surface}
            </span>
          ))}
        </div>
      </section>

      {/* Problem */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <SectionHeading
          kicker="The problem"
          title="Stop re-explaining yourself."
          lede="Your tools remember fragments. Every new chat starts from zero, deadlines go stale mid-project, and one client's voice bleeds into another's work."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {[
            {
              title: "Repeated briefings",
              body: "You explain the same client, tone, and constraints to ChatGPT, then again to Claude, then again next week.",
            },
            {
              title: "Stale facts",
              body: "The deadline moved in Slack on Tuesday. Your AI is still confidently writing March 14.",
            },
            {
              title: "Crossed wires",
              body: "A playful soda brand and a regulated financial client cannot share one undifferentiated memory pool.",
            },
          ].map((card) => (
            <div key={card.title} className="panel reveal p-6">
              <h3 className="font-display text-xl">{card.title}</h3>
              <p className="mt-3 leading-relaxed text-(--cn-text-secondary)">{card.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-y border-(--cn-border) bg-(--cn-surface) py-20">
        <div className="mx-auto max-w-6xl px-6">
          <SectionHeading
            kicker="How it works"
            title="Evidence in. Approved memory out."
            lede="Continuum never treats a document as truth. Sources become candidates; you approve what becomes memory; only approved memory reaches your AIs."
          />
          <ol className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-3">
            {[
              {
                step: "01",
                title: "Sources",
                body: "Connect Drive, Slack, Gmail, Notion — or paste text. Everything imported is treated as untrusted evidence.",
              },
              {
                step: "02",
                title: "Candidates",
                body: "Continuum extracts possible facts, deadlines, and rules, and shows you exactly where each one came from.",
              },
              {
                step: "03",
                title: "Approved memory",
                body: "You approve, edit, or reject. Only approved memory is canonical — and every use comes with a receipt.",
              },
            ].map((item) => (
              <li key={item.step} className="reveal">
                <p className="font-data text-(--cn-accent)">{item.step}</p>
                <h3 className="font-display mt-2 text-xl">{item.title}</h3>
                <p className="mt-2 leading-relaxed text-(--cn-text-secondary)">{item.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Signature demo: Northbank vs FizzPop */}
      <section id="demo" className="mx-auto max-w-6xl px-6 py-20">
        <SectionHeading
          kicker="Keep every world separate"
          title="Same request. Two clients. Zero bleed."
          lede='Ask for "a post about the launch" in two tabs. Each Space carries its own binding rules — and they never mix.'
        />
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {/* Northbank panel */}
          <article className="panel reveal overflow-hidden">
            <div className="border-b border-(--cn-border) bg-[#f4f6f8] px-6 py-4 dark:bg-[#1a2025]">
              <p className="font-data text-(--cn-text-tertiary)">Space</p>
              <h3 className="font-display text-2xl">{demoSpaces.northbank.name}</h3>
              <p className="mt-1 text-sm text-(--cn-text-secondary)">
                Financial services · audience: small-business CFOs
              </p>
            </div>
            <div className="space-y-3 px-6 py-5">
              {northbankRules.map((rule) => (
                <div key={rule.id} className="flex items-start gap-3">
                  <span className="chip mt-0.5 shrink-0">rule</span>
                  <p className="text-sm leading-relaxed">{rule.canonicalText}</p>
                </div>
              ))}
              <div className="mt-4 rounded-(--cn-radius-md) border border-(--cn-border) bg-(--cn-bg) p-4">
                <p className="font-data text-(--cn-text-tertiary)">Compiled output tone</p>
                <p className="mt-2 text-sm leading-relaxed">
                  “Northbank Flex gives small-business CFOs precise cash-flow visibility. The March
                  newsletter launches on March 21.”
                </p>
              </div>
            </div>
          </article>

          {/* FizzPop panel */}
          <article className="panel reveal overflow-hidden">
            <div className="border-b border-(--cn-border) bg-[#fdf3f0] px-6 py-4 dark:bg-[#261c1a]">
              <p className="font-data text-(--cn-text-tertiary)">Space</p>
              <h3 className="font-display text-2xl">{demoSpaces.fizzpop.name}</h3>
              <p className="mt-1 text-sm text-(--cn-text-secondary)">
                Beverage brand · audience: college students
              </p>
            </div>
            <div className="space-y-3 px-6 py-5">
              {fizzpopRules.map((rule) => (
                <div key={rule.id} className="flex items-start gap-3">
                  <span className="chip mt-0.5 shrink-0">voice</span>
                  <p className="text-sm leading-relaxed">{rule.canonicalText}</p>
                </div>
              ))}
              <div className="mt-4 rounded-(--cn-radius-md) border border-(--cn-border) bg-(--cn-bg) p-4">
                <p className="font-data text-(--cn-text-tertiary)">Compiled output tone</p>
                <p className="mt-2 text-sm leading-relaxed">
                  “Cherry Blast just dropped 🍒 Grab one before your 8am lecture.”
                </p>
              </div>
            </div>
          </article>
        </div>
        <p className="reveal mx-auto mt-8 max-w-xl text-center text-sm text-(--cn-text-secondary)">
          These panels render the actual demo fixtures that Continuum&apos;s isolation tests run
          against. Cross-Space contamination in retrieval is a release-blocking test failure.
        </p>
      </section>

      {/* Receipts */}
      <section className="border-y border-(--cn-border) bg-(--cn-surface) py-20">
        <div className="mx-auto max-w-6xl px-6">
          <SectionHeading
            kicker="Context Receipts"
            title="See exactly what your AI knew."
            lede="Every context package comes with a receipt: what was used, where it came from, and what conflicting information was deliberately excluded."
          />
          <div className="panel reveal mx-auto mt-12 max-w-2xl p-6">
            <p className="font-data text-(--cn-text-tertiary)">Context used from Northbank</p>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="font-semibold">Rules</dt>
                <dd className="text-(--cn-text-secondary)">
                  No jokes or slang · Never guarantee financial returns · Use “Northbank Flex”
                  exactly
                </dd>
              </div>
              <div>
                <dt className="font-semibold">Project</dt>
                <dd className="text-(--cn-text-secondary)">
                  March Newsletter · launch deadline March 21 · compliance review March 17
                </dd>
              </div>
              <div>
                <dt className="font-semibold">Sources</dt>
                <dd className="text-(--cn-text-secondary)">
                  Northbank Brand Guide v4 · Slack message from Priya
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-(--cn-warning)">Excluded</dt>
                <dd className="text-(--cn-text-secondary)">
                  Old March 14 deadline (superseded) · unapproved draft claim (rejected)
                </dd>
              </div>
            </dl>
            <div className="mt-5 border-t border-(--cn-border) pt-4">
              <Link href="/receipts" className="text-sm font-semibold text-(--cn-accent)">
                Generate a live receipt in the app →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="mx-auto max-w-6xl px-6 py-20">
        <SectionHeading
          kicker="Security & privacy"
          title="It remembers with permission."
          lede="Trust is the product. Continuum is built so that a cross-Space leak is a release-blocking failure, not a bug report."
        />
        <ul className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-2">
          {[
            "Spaces are hard retrieval boundaries, enforced before any search runs.",
            "Nothing becomes permanent memory without your explicit approval.",
            "Imported documents are data, never instructions — prompt injection is tested for.",
            "Every sensitive operation is audited; connector credentials live in a vault, never logs.",
          ].map((line) => (
            <li key={line} className="panel reveal flex items-start gap-3 p-5">
              <span aria-hidden className="mt-1 size-2 shrink-0 rounded-full bg-(--cn-accent)" />
              <span className="text-sm leading-relaxed text-(--cn-text-secondary)">{line}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* CTA */}
      <section className="border-t border-(--cn-border) bg-(--cn-surface) py-20">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="font-display text-4xl text-balance">One context layer. Every AI.</h2>
          <p className="mt-4 text-lg text-(--cn-text-secondary)">
            Switch tools without starting over.
          </p>
          <Link href="/home" className="btn-primary mt-8">
            Build your Continuum
          </Link>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-10 text-sm text-(--cn-text-tertiary)">
        <div className="flex items-center gap-2">
          <ContinuumMark />
          <span>Continuum · Your context, everywhere.</span>
        </div>
        <p>Demo build — running on deterministic local fixtures.</p>
      </footer>
    </div>
  );
}

/** The Continuum mark: an unbroken loop crossing itself — continuity. */
function ContinuumMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden className="shrink-0">
      <path
        d="M13 4 C 20 4, 22 10, 18 13 C 22 16, 20 22, 13 22 C 6 22, 4 16, 8 13 C 4 10, 6 4, 13 4 Z"
        fill="none"
        stroke="var(--cn-accent)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
