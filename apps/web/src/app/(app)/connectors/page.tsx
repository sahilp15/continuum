export const metadata = { title: "Connectors" };

/**
 * Connector directory. Honest states only — nothing shows "Connected" until a
 * real OAuth + retrieval flow is verified end to end. Google Workspace requires
 * developer credentials (Setup required); the rest are Coming soon.
 */
const CONNECTORS = [
  {
    name: "Google Workspace",
    category: "Email · Documents · Calendar",
    state: "setup_required",
    detail:
      "Gmail, Drive, and Calendar via one authorization. Requires developer OAuth credentials.",
  },
  {
    name: "Slack",
    category: "Messaging",
    state: "coming_soon",
    detail: "Import channels and threads as sources.",
  },
  {
    name: "Notion",
    category: "Documents",
    state: "coming_soon",
    detail: "Import pages and databases as sources.",
  },
  {
    name: "GitHub",
    category: "Code",
    state: "coming_soon",
    detail: "Import repositories, issues, and discussions.",
  },
] as const;

const STATE_LABEL: Record<string, string> = {
  setup_required: "Setup required",
  coming_soon: "Coming soon",
};

export default function ConnectorsPage() {
  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-3xl">Connectors</h1>
      <p className="mt-2 max-w-2xl text-(--cn-text-secondary)">
        Connect the apps you already use so Continuum can import real information — with your
        permission. Nothing is imported or remembered without your approval, and a connector is
        never shown as connected until its authorization and data retrieval are verified.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {CONNECTORS.map((c) => (
          <div key={c.name} className="panel flex flex-col gap-2 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg">{c.name}</h2>
              <span className="chip">{STATE_LABEL[c.state]}</span>
            </div>
            <p className="font-data text-xs text-(--cn-text-tertiary)">{c.category}</p>
            <p className="text-sm text-(--cn-text-secondary)">{c.detail}</p>
            <button
              type="button"
              disabled
              aria-disabled="true"
              className="btn-secondary mt-2 w-fit cursor-not-allowed text-sm opacity-60"
              title={
                c.state === "setup_required"
                  ? "Requires developer OAuth credentials"
                  : "Not yet available"
              }
            >
              {c.state === "setup_required" ? "Setup required" : "Coming soon"}
            </button>
          </div>
        ))}
      </div>

      <p className="mt-6 text-xs text-(--cn-text-tertiary)">
        In the meantime, you can import context by pasting text or notes from the Memory Inbox.
      </p>
    </div>
  );
}
