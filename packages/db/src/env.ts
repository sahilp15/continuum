import { z } from "zod";

/**
 * Deterministic, fail-fast validation of the database-related environment.
 *
 * This is the pattern the apps extend as features land (auth keys in Phase 2,
 * connector credential keys in Phase 5). Validation throws a single, readable
 * error listing every problem instead of failing deep inside a driver.
 */
const dbEnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    CONTINUUM_DB_DRIVER: z.enum(["pglite", "postgres"]).optional(),
    DATABASE_URL: z.string().url().optional(),
    CONTINUUM_PGLITE_DIR: z.string().min(1).optional(),
  })
  .superRefine((env, ctx) => {
    const driver =
      env.CONTINUUM_DB_DRIVER ?? (env.NODE_ENV === "production" ? "postgres" : "pglite");
    if (driver === "postgres" && !env.DATABASE_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["DATABASE_URL"],
        message:
          "DATABASE_URL is required when the postgres driver is selected (CONTINUUM_DB_DRIVER=postgres or NODE_ENV=production). Use CONTINUUM_DB_DRIVER=pglite for local development.",
      });
    }
  });

export type DbEnv = z.infer<typeof dbEnvSchema>;

/** Parse and validate the DB environment, throwing a readable aggregate error. */
export function parseDbEnv(source: NodeJS.ProcessEnv = process.env): DbEnv {
  const result = dbEnvSchema.safeParse(source);
  if (!result.success) {
    const details = result.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid database environment:\n${details}`);
  }
  return result.data;
}
