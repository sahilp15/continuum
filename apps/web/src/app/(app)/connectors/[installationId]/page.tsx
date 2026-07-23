import Link from "next/link";
import { notFound } from "next/navigation";
import { listUserOrganizationIds } from "@continuum/db";
import type { NormalizedExternalItem } from "@continuum/contracts";
import { requireActor } from "@/lib/actor";
import { getConnectorRuntime } from "@/lib/connectors";
import { getEnv } from "@/lib/services";
import { importConnectorItem } from "../actions";

export const metadata = { title: "Browse connector" };
export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  document: "Document",
  folder: "Folder",
  email: "Email",
  event: "Event",
};

/**
 * Live, readonly browse over one connector installation. Search runs through
 * the capability-enforced Gateway (results are NOT persisted); importing a
 * result stores it as a `connector_item` source and produces pending
 * suggestions to review in the inbox — nothing is remembered automatically.
 * Unauthorized installation ids 404 (resource hiding).
 */
export default async function BrowseConnectorPage({
  params,
  searchParams,
}: {
  params: Promise<{ installationId: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const actor = await requireActor();
  const { installationId } = await params;
  const { q } = await searchParams;

  const runtimePromise = getConnectorRuntime();
  if (!runtimePromise) notFound();
  const runtime = await runtimePromise;

  const installation = await runtime.installations.get(installationId);
  const orgIds = await listUserOrganizationIds(getEnv().db, actor.userId);
  if (!installation || !orgIds.includes(installation.organizationId)) notFound();
  if (installation.status !== "connected") notFound();

  let items: NormalizedExternalItem[] = [];
  let searchError: string | null = null;
  if (q) {
    try {
      const result = await runtime.gateway.search(installationId, { query: q, limit: 10 });
      items = result.items;
    } catch (error) {
      searchError =
        error instanceof Error && /unauthorized|reconnect/i.test(error.message)
          ? "Google rejected the connector's authorization. Disconnect and reconnect to continue."
          : "The search request failed. Your data is safe — try again in a moment.";
    }
  }

  return (
    <div className="max-w-3xl">
      <Link href="/connectors" className="text-sm text-(--cn-text-secondary) hover:underline">
        ← Connectors
      </Link>
      <h1 className="font-display mt-2 text-3xl">Browse Google Workspace</h1>
      <p className="mt-2 text-(--cn-text-secondary)">
        Search your Drive, Gmail, and Calendar live. Nothing is stored until you import an item —
        and imported text only ever becomes <em>pending</em> suggestions for your review.
      </p>

      <form className="mt-6 flex gap-2" action="" method="get">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search files, emails, events…"
          aria-label="Search connected Google Workspace"
          className="w-full rounded-(--cn-radius-sm) border border-(--cn-border-strong) bg-(--cn-surface) px-3 py-2 text-sm"
        />
        <button type="submit" className="btn-primary text-sm">
          Search
        </button>
      </form>

      {searchError ? (
        <p
          role="alert"
          className="panel mt-4 p-3 text-sm"
          style={{ borderColor: "var(--cn-error)" }}
        >
          {searchError}
        </p>
      ) : null}

      {q && !searchError ? (
        items.length === 0 ? (
          <p className="mt-6 text-sm text-(--cn-text-tertiary)">
            No results for “{q}”. Live search is readonly and Space-scoped.
          </p>
        ) : (
          <ul className="mt-6 flex flex-col gap-2">
            {items.map((item) => (
              <li
                key={item.externalId}
                className="panel flex items-center justify-between gap-4 p-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="chip">{TYPE_LABEL[item.type] ?? item.type}</span>
                    <p className="truncate font-medium">{item.title || item.externalId}</p>
                  </div>
                  {item.content ? (
                    <p className="mt-1 line-clamp-2 text-sm text-(--cn-text-secondary)">
                      {item.content}
                    </p>
                  ) : null}
                </div>
                <form action={importConnectorItem.bind(null, installationId, item.externalId)}>
                  <button type="submit" className="btn-secondary shrink-0 text-sm">
                    Import
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )
      ) : null}

      {!q ? (
        <p className="mt-6 text-sm text-(--cn-text-tertiary)">
          Try searching for a project name, a client, or a date — results come straight from Google,
          scoped to what you authorized.
        </p>
      ) : null}
    </div>
  );
}
