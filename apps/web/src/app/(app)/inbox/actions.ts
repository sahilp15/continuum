"use server";

import { revalidatePath } from "next/cache";
import { getDemoActor, getDemoEnvironment } from "@/lib/demo";

export async function acceptSuggestion(formData: FormData): Promise<void> {
  const suggestionId = String(formData.get("suggestionId") ?? "");
  if (!suggestionId) return;
  const env = getDemoEnvironment();
  await env.memoryService.resolveSuggestion(getDemoActor(), suggestionId, { action: "accept" });
  revalidatePath("/inbox");
}

export async function rejectSuggestion(formData: FormData): Promise<void> {
  const suggestionId = String(formData.get("suggestionId") ?? "");
  if (!suggestionId) return;
  const env = getDemoEnvironment();
  await env.memoryService.resolveSuggestion(getDemoActor(), suggestionId, { action: "reject" });
  revalidatePath("/inbox");
}

export async function keepTemporary(formData: FormData): Promise<void> {
  const suggestionId = String(formData.get("suggestionId") ?? "");
  if (!suggestionId) return;
  const env = getDemoEnvironment();
  await env.memoryService.resolveSuggestion(getDemoActor(), suggestionId, {
    action: "keep_temporary",
  });
  revalidatePath("/inbox");
}
