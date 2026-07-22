"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { Space } from "@continuum/contracts";
import { switchSpace } from "./space-actions";

/**
 * Active-Space switcher. The active Space is always visible so the user never
 * mistakes which world is live. Switching is a quick, calm transition.
 */
export function SpaceSwitcher({ spaces, activeId }: { spaces: Space[]; activeId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (spaces.length === 0) return null;

  return (
    <label className="flex items-center gap-2">
      <span className="sr-only">Active Space</span>
      <span
        aria-hidden
        className="h-2 w-2 rounded-full"
        style={{ background: "var(--cn-accent)" }}
      />
      <select
        value={activeId}
        disabled={pending}
        onChange={(e) => {
          const spaceId = e.target.value;
          startTransition(async () => {
            await switchSpace(spaceId);
            router.refresh();
          });
        }}
        className="rounded-(--cn-radius-sm) border border-(--cn-border-strong) bg-(--cn-surface) px-2 py-1 text-sm font-medium"
        aria-label="Active Space"
      >
        {spaces.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </label>
  );
}
