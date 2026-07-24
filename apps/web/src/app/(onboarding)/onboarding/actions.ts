"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Space } from "@continuum/contracts";
import { requireActor } from "@/lib/actor";
import { getEnv, getOnboarding } from "@/lib/services";

const str = (fd: FormData, key: string): string => String(fd.get(key) ?? "").trim();

export async function savePersona(formData: FormData): Promise<void> {
  const actor = await requireActor();
  const persona = str(formData, "persona") || "other";
  await getOnboarding().save(actor.userId, { persona, step: 1 });
  revalidatePath("/onboarding");
}

export async function saveProfile(formData: FormData): Promise<void> {
  const actor = await requireActor();
  const env = getEnv();
  const displayName = str(formData, "displayName");
  const role = str(formData, "role");
  const writingStyle = str(formData, "writingStyle");
  const outputs = str(formData, "outputs");
  const preferences = [
    writingStyle && `Writing style: ${writingStyle}`,
    outputs && `Common outputs: ${outputs}`,
  ].filter((v): v is string => Boolean(v));
  await env.tenancy.upsertProfile({
    userId: actor.userId,
    displayName,
    background: role,
    preferences,
  });
  await getOnboarding().save(actor.userId, { step: 2, data: { displayName } });
  revalidatePath("/onboarding");
}

export async function createFirstSpace(formData: FormData): Promise<void> {
  const actor = await requireActor();
  const env = getEnv();
  const name = str(formData, "name") || "My Space";
  const kind = (str(formData, "kind") || "client") as Space["kind"];
  const description = str(formData, "description");
  const organizationId = await env.tenancy.getOrCreatePersonalOrg(actor.userId);
  const space = await env.tenancy.createSpace({ organizationId, name, kind, description });
  await getOnboarding().save(actor.userId, {
    step: 3,
    data: { spaceId: space.id, spaceName: space.name, organizationId },
  });
  revalidatePath("/onboarding");
}

export async function goToImport(): Promise<void> {
  const actor = await requireActor();
  await getOnboarding().save(actor.userId, { step: 4 });
  revalidatePath("/onboarding");
}

export async function importFirstSource(formData: FormData): Promise<void> {
  const actor = await requireActor();
  const env = getEnv();
  const state = await getOnboarding().get(actor.userId);
  const spaceId = String(state.data.spaceId ?? "");
  const organizationId = String(state.data.organizationId ?? "");
  if (!spaceId || !organizationId) {
    // Space wasn't created — send back to that step rather than failing.
    await getOnboarding().save(actor.userId, { step: 2 });
    revalidatePath("/onboarding");
    return;
  }
  const title = str(formData, "title") || "Pasted notes";
  const content = str(formData, "content");
  if (content.length < 2) {
    revalidatePath("/onboarding");
    return;
  }
  const { source, suggestions } = await env.importSource(actor, {
    organizationId,
    spaceId,
    kind: "pasted_text",
    title,
    content,
  });
  await getOnboarding().save(actor.userId, {
    step: 5,
    data: { sourceId: source.id, suggestionCount: suggestions.length },
  });
  revalidatePath("/onboarding");
}

export async function reviewSuggestion(formData: FormData): Promise<void> {
  const actor = await requireActor();
  const env = getEnv();
  const suggestionId = str(formData, "suggestionId");
  const action = str(formData, "action");
  if (!suggestionId) return;
  if (action === "accept" || action === "reject" || action === "keep_temporary") {
    await env.memoryService.resolveSuggestion(actor, suggestionId, { action });
  }
  revalidatePath("/onboarding");
}

export async function goToProject(): Promise<void> {
  const actor = await requireActor();
  await getOnboarding().save(actor.userId, { step: 6 });
  revalidatePath("/onboarding");
}

export async function createFirstProject(formData: FormData): Promise<void> {
  const actor = await requireActor();
  const env = getEnv();
  const state = await getOnboarding().get(actor.userId);
  const spaceId = String(state.data.spaceId ?? "");
  const organizationId = String(state.data.organizationId ?? "");
  const name = str(formData, "name") || "First project";
  const objective = str(formData, "objective");
  const task =
    str(formData, "task") || objective || `Get started in ${state.data.spaceName ?? "this Space"}`;
  if (!spaceId || !organizationId) {
    await getOnboarding().save(actor.userId, { step: 2 });
    revalidatePath("/onboarding");
    return;
  }
  const project = await env.tenancy.createProject({ organizationId, spaceId, name, objective });
  // Generate the first real context bundle + receipt from approved memory.
  const bundle = await env.generateContext(actor, {
    organizationId,
    spaceId,
    projectId: project.id,
    requestingIntegration: "web_app",
    taskDescription: task,
  });
  await getOnboarding().save(actor.userId, {
    step: 7,
    data: {
      projectId: project.id,
      projectName: project.name,
      receipt: bundle.receipt as unknown as Record<string, unknown>,
      renderedText: bundle.renderedText,
    },
  });
  revalidatePath("/onboarding");
}

/**
 * Bound server action: callers pass `step` via `goBack.bind(null, step)` (Next's
 * documented pattern for extra args on a form/formAction). Deliberately NOT a
 * plain `(formData)` handler reading a hidden `step` field — a <button
 * formAction={fn}> where `fn` is a function reference can't also carry a
 * `name`/`value` pair (React reserves the button's encoding for the action
 * itself), so binding is the only way to pass `step` to an in-form Back button.
 */
export async function goBack(step: number, _formData: FormData): Promise<void> {
  const actor = await requireActor();
  await getOnboarding().save(actor.userId, { step: Math.max(0, step - 1) });
  revalidatePath("/onboarding");
}

export async function finishOnboarding(): Promise<void> {
  const actor = await requireActor();
  await getOnboarding().complete(actor.userId);
  redirect("/home");
}
