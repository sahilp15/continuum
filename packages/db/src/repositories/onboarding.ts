import { eq } from "drizzle-orm";
import type { ContinuumDatabase } from "../client.js";
import { onboardingState, users } from "../schema/index.js";

export interface OnboardingState {
  userId: string;
  step: number;
  persona: string | null;
  data: Record<string, unknown>;
}

/**
 * Persisted onboarding progress so the guided flow is resumable across refreshes
 * and sessions. Mirrors `users.onboardingStatus` for the gate (not_started →
 * in_progress → complete).
 */
export function createOnboardingRepository(db: ContinuumDatabase) {
  return {
    async get(userId: string): Promise<OnboardingState> {
      const rows = await db
        .select()
        .from(onboardingState)
        .where(eq(onboardingState.userId, userId))
        .limit(1);
      const row = rows[0];
      return row
        ? { userId: row.userId, step: row.step, persona: row.persona, data: row.data }
        : { userId, step: 0, persona: null, data: {} };
    },

    /** Upsert progress and flip the user's onboarding status to in_progress. */
    async save(
      userId: string,
      patch: { step?: number; persona?: string | null; data?: Record<string, unknown> },
    ): Promise<void> {
      const current = await this.get(userId);
      const next = {
        userId,
        step: patch.step ?? current.step,
        persona: patch.persona !== undefined ? patch.persona : current.persona,
        data: patch.data ? { ...current.data, ...patch.data } : current.data,
        updatedAt: new Date(),
      };
      await db
        .insert(onboardingState)
        .values(next)
        .onConflictDoUpdate({
          target: onboardingState.userId,
          set: {
            step: next.step,
            persona: next.persona,
            data: next.data,
            updatedAt: next.updatedAt,
          },
        });
      await db
        .update(users)
        .set({ onboardingStatus: "in_progress", updatedAt: new Date() })
        .where(eq(users.id, userId));
    },

    async complete(userId: string): Promise<void> {
      await db
        .update(users)
        .set({ onboardingStatus: "complete", updatedAt: new Date() })
        .where(eq(users.id, userId));
    },

    async getStatus(userId: string): Promise<"not_started" | "in_progress" | "complete"> {
      const rows = await db
        .select({ status: users.onboardingStatus })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      return rows[0]?.status ?? "not_started";
    },
  };
}

export type OnboardingRepository = ReturnType<typeof createOnboardingRepository>;
