"use server";

import { revalidatePath } from "next/cache";
import { requireActor } from "@/lib/actor";
import { getEnv } from "@/lib/services";

export async function saveSettings(formData: FormData): Promise<void> {
  const actor = await requireActor();
  const env = getEnv();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const background = String(formData.get("background") ?? "").trim();
  const preferences = String(formData.get("preferences") ?? "")
    .split("\n")
    .map((p) => p.trim())
    .filter(Boolean);
  await env.tenancy.upsertProfile({ userId: actor.userId, displayName, background, preferences });
  revalidatePath("/settings");
}
