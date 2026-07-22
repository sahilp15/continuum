"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

/** Signed-in identity + logout. Session tokens stay in HttpOnly cookies. */
export function UserMenu({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onLogout() {
    setPending(true);
    await authClient.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <div className="px-3">
      <p className="truncate font-semibold text-(--cn-text-secondary)">{name}</p>
      <p className="truncate text-(--cn-text-tertiary)">{email}</p>
      <button
        type="button"
        onClick={onLogout}
        disabled={pending}
        className="mt-2 text-xs font-medium text-(--cn-text-secondary) underline underline-offset-2 hover:text-(--cn-text) disabled:opacity-60"
      >
        {pending ? "Signing out…" : "Sign out"}
      </button>
    </div>
  );
}
