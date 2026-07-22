import "server-only";
import { cookies } from "next/headers";
import type { Space } from "@continuum/contracts";

const COOKIE = "continuum_space";

/**
 * Resolve the active Space from the cookie, falling back to the first available
 * Space. Returns null when the user has no Spaces yet. Never returns a Space the
 * user can't see (the caller passes only the user's own Spaces).
 */
export async function getActiveSpace(spaces: Space[]): Promise<Space | null> {
  if (spaces.length === 0) return null;
  const cookieValue = (await cookies()).get(COOKIE)?.value;
  return spaces.find((s) => s.id === cookieValue) ?? spaces[0]!;
}

/** Server action: set the active Space cookie. */
export async function setActiveSpaceCookie(spaceId: string): Promise<void> {
  (await cookies()).set(COOKIE, spaceId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
