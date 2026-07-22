"use server";

import { revalidatePath } from "next/cache";
import { setActiveSpaceCookie } from "@/lib/active-space";

/** Switch the active Space (persisted in a cookie) and refresh the shell. */
export async function switchSpace(spaceId: string): Promise<void> {
  if (!spaceId) return;
  await setActiveSpaceCookie(spaceId);
  revalidatePath("/", "layout");
}
