"use server";

import { revalidatePath } from "next/cache";
import { requireActor } from "@/lib/actor";
import { getEnv } from "@/lib/services";

export async function createProject(formData: FormData): Promise<void> {
  const actor = await requireActor();
  const env = getEnv();
  const spaceId = String(formData.get("spaceId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const objective = String(formData.get("objective") ?? "").trim();
  if (!spaceId || !name) return;
  // Authorize + resolve the org from the Space the user selected.
  const space = await env.tenancy.getSpace(spaceId);
  if (!space) return;
  const role = await env.authz.spaceRole(actor.userId, spaceId);
  if (!role) return; // resource-hiding: not the user's Space
  await env.tenancy.createProject({
    organizationId: space.organizationId,
    spaceId,
    name,
    objective,
  });
  revalidatePath("/projects");
}
