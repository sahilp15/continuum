import { createDrizzleInstallationStore, listUserOrganizationIds } from "@continuum/db";
import type { ConnectorInstallation } from "@continuum/contracts";
import { requireActor } from "@/lib/actor";
import { credentialVaultConfigured, googleConnectorConfigured } from "@/lib/env";
import { getEnv } from "@/lib/services";

export const metadata = { title: "Connectors" };
export const dynamic = "force-dynamic";

/**
 * Connector directory. Honest states only — nothing shows "Connected" until a
 * real OAuth + retrieval flow is verified end to end. The user's real
 * installations are read from the database; the catalog below is the honest
 * roadmap. Google Workspace needs its own OAuth app + the credential vault
 * (Phase 6); the rest are Coming soon.
 */
const CATALOG = [
  {
    name: "Google Workspace",
    category: "Email · Documents · Calendar",
    state: "setup_required",
    detail:
      "Gmail, Drive, and Calendar via one authorization. Needs a connector OAuth app and the credential vault.",
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

const CATALOG_LABEL: Record<string, string> = {
  setup_required: "Setup required",
  coming_soon: "Coming soon",
};

// Real installation status → human label (never a bare boolean).
const INSTALL_LABEL: Record<ConnectorInstallation["status"], string> = {
  connected: "Connected",
  mock: "Demo (mock)",
  error: "Needs attention",
  revoked: "Disconnected",
};

export default async function ConnectorsPage() {
  const actor = await requireActor();
  const env = getEnv();
  const orgIds = await listUserOrganizationIds(env.db, actor.userId);
  const installStore = createDrizzleInstallationStore(env.db);
  const installations = (
    await Promise.all(orgIds.map((orgId) => installStore.listByOrganization(orgId)))
  ).flat();

  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-3xl">Connectors</h1>
      <p className="mt-2 max-w-2xl text-(--cn-text-secondary)">
        Connect the apps you already use so Continuum can import real information — with your
        permission. Nothing is imported or remembered without your approval, and a connector is
        never shown as connected until its authorization and data retrieval are verified.
      </p>

      {/* Credential-vault readiness — honest, no fake success. */}
      <div className="panel mt-6 flex items-center justify-between gap-4 p-4">
        <div>
          <h2 className="font-semibold">Credential vault</h2>
          <p className="mt-1 text-sm text-(--cn-text-secondary)">
            {credentialVaultConfigured
              ? "Configured. Connector credentials are encrypted at rest (AES-256-GCM)."
              : "Not configured. Set CONTINUUM_CREDENTIAL_KEYS to enable encrypted connector credentials."}
          </p>
        </div>
        <span className="chip">{credentialVaultConfigured ? "Ready" : "Setup required"}</span>
      </div>

      {/* Real installations from the database. */}
      <section className="mt-8">
        <h2 className="font-display text-xl">Your connections</h2>
        {installations.length === 0 ? (
          <div className="panel mt-3 p-6 text-center">
            <p className="text-(--cn-text-secondary)">No connections yet.</p>
            <p className="mt-1 text-sm text-(--cn-text-tertiary)">
              Once a connector is set up, the apps you authorize will appear here with their live
              status.
            </p>
          </div>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {installations.map((inst) => (
              <li key={inst.id} className="panel flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="font-medium">{inst.connectorId}</p>
                  <p className="font-data text-xs text-(--cn-text-tertiary)">
                    {inst.grantedScopes.join(" · ") || "no scopes"}
                  </p>
                </div>
                <span className="chip">{INSTALL_LABEL[inst.status]}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Honest catalog / roadmap. */}
      <section className="mt-10">
        <h2 className="font-display text-xl">Available to add</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {CATALOG.map((c) => {
            const label =
              c.name === "Google Workspace" && googleConnectorConfigured
                ? "Ready to connect"
                : CATALOG_LABEL[c.state];
            return (
              <div key={c.name} className="panel flex flex-col gap-2 p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg">{c.name}</h3>
                  <span className="chip">{label}</span>
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
                      ? "Requires a connector OAuth app and the credential vault"
                      : "Not yet available"
                  }
                >
                  {label}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <p className="mt-6 text-xs text-(--cn-text-tertiary)">
        In the meantime, you can import context by pasting text or notes from the Memory Inbox.
      </p>
    </div>
  );
}
