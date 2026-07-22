/** Calm progress indicator for the onboarding flow (non-color status via text). */
export function Stepper({ current, titles }: { current: number; titles: string[] }) {
  return (
    <nav aria-label="Onboarding progress" className="mb-8">
      <p className="font-data text-(--cn-text-tertiary)">
        Step {Math.min(current + 1, titles.length)} of {titles.length} · {titles[current]}
      </p>
      <ol className="mt-3 flex gap-1.5" role="list">
        {titles.map((title, i) => (
          <li
            key={title}
            className="h-1.5 flex-1 rounded-full transition-colors"
            style={{
              background: i <= current ? "var(--cn-accent)" : "var(--cn-border)",
              transitionDuration: "var(--cn-duration-base)",
            }}
            aria-current={i === current ? "step" : undefined}
          >
            <span className="sr-only">
              {title}
              {i < current ? " (done)" : i === current ? " (current)" : ""}
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
