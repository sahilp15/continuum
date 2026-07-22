import { getSession, requireActor } from "@/lib/actor";
import { getEnv } from "@/lib/services";
import { saveSettings } from "./actions";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

const FIELD =
  "w-full rounded-(--cn-radius-md) border border-(--cn-border-strong) bg-(--cn-bg) px-3 py-2 text-sm";

export default async function SettingsPage() {
  const actor = await requireActor();
  const env = getEnv();
  const profile = await env.tenancy.getProfile(actor.userId);
  const session = await getSession();

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-3xl">Settings</h1>
      <p className="mt-2 text-(--cn-text-secondary)">
        Your profile preferences travel with you across compatible Spaces.
      </p>

      <div className="panel mt-6 p-5">
        <h2 className="font-semibold">Account</h2>
        <dl className="font-data mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm text-(--cn-text-secondary)">
          <dt>Name</dt>
          <dd>{session?.user?.name ?? "—"}</dd>
          <dt>Email</dt>
          <dd>{session?.user?.email ?? "—"}</dd>
        </dl>
      </div>

      <form action={saveSettings} className="panel mt-6 flex flex-col gap-4 p-5">
        <h2 className="font-semibold">Profile</h2>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Display name</span>
          <input name="displayName" className={FIELD} defaultValue={profile?.displayName ?? ""} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Role / background</span>
          <input name="background" className={FIELD} defaultValue={profile?.background ?? ""} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Working preferences (one per line)</span>
          <textarea
            name="preferences"
            className={`${FIELD} min-h-28`}
            defaultValue={(profile?.preferences ?? []).join("\n")}
            placeholder={"Writing style: precise, calm\nCommon outputs: newsletters, briefs"}
          />
        </label>
        <button type="submit" className="btn-primary w-fit text-sm">
          Save profile
        </button>
      </form>
    </div>
  );
}
