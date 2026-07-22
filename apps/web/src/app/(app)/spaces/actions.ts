"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Space } from "@continuum/contracts";
import { requireActor } from "@/lib/actor";
import { setActiveSpaceCookie } from "@/lib/active-space";
import { getEnv } from "@/lib/services";

export async function createSpace(formData: FormData): Promise<void> {
  const actor = await requireActor();
  const env = getEnv();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    revalidatePath("/spaces");
    return;
  }
  const kind = (String(formData.get("kind") ?? "client").trim() || "client") as Space["kind"];
  const description = String(formData.get("description") ?? "").trim();
  const organizationId = await env.tenancy.getOrCreatePersonalOrg(actor.userId);
  const space = await env.tenancy.createSpace({ organizationId, name, kind, description });
  await setActiveSpaceCookie(space.id);
  revalidatePath("/", "layout");
  redirect(`/spaces/${space.id}`);
}
