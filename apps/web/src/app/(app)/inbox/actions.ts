"use server";

import { revalidatePath } from "next/cache";
import { requireActor } from "@/lib/actor";
import { getActiveSpace } from "@/lib/active-space";
import { getEnv } from "@/lib/services";

async function resolve(
  formData: FormData,
  action: "accept" | "reject" | "keep_temporary",
): Promise<void> {
  const actor = await requireActor();
  const suggestionId = String(formData.get("suggestionId") ?? "").trim();
  if (!suggestionId) return;
  await getEnv().memoryService.resolveSuggestion(actor, suggestionId, { action });
  revalidatePath("/inbox");
}

export async function acceptSuggestion(formData: FormData): Promise<void> {
  await resolve(formData, "accept");
}
export async function rejectSuggestion(formData: FormData): Promise<void> {
  await resolve(formData, "reject");
}
export async function keepTemporary(formData: FormData): Promise<void> {
  await resolve(formData, "keep_temporary");
}

/** Import a pasted source into the active Space and extract candidates. */
export async function importToActiveSpace(formData: FormData): Promise<void> {
  const actor = await requireActor();
  const env = getEnv();
  const content = String(formData.get("content") ?? "").trim();
  if (content.length < 2) return;
  const title = String(formData.get("title") ?? "").trim() || "Pasted notes";
  const spaces = await env.tenancy.listUserSpaces(actor.userId);
  const active = await getActiveSpace(spaces);
  if (!active) return;
  await env.importSource(actor, {
    organizationId: active.organizationId,
    spaceId: active.id,
    kind: "pasted_text",
    title,
    content,
  });
  revalidatePath("/inbox");
}
