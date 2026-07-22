export * as schema from "./schema/index.js";
export {
  createDatabase,
  createTestDatabase,
  type ContinuumDatabase,
  type DatabaseHandle,
  type CreateDatabaseOptions,
  type DbDriver,
} from "./client.js";
export { parseDbEnv, type DbEnv } from "./env.js";

// Persistence layer: Drizzle-backed stores, tenancy repos, audit sink, and the
// fully-wired DB environment (production counterpart to createDemoEnvironment).
export { createDrizzleMemoryStore } from "./stores/memory-store.js";
export { createDrizzleAuthStore } from "./stores/auth-store.js";
export { createDbAuditSink, type DbAuditSink } from "./audit.js";
export {
  createTenancyRepository,
  type TenancyRepository,
  type CreateSpaceInput,
  type CreateProjectInput,
  type UpsertProfileInput,
} from "./repositories/tenancy.js";
export {
  createOnboardingRepository,
  type OnboardingRepository,
  type OnboardingState,
} from "./repositories/onboarding.js";
export {
  createDbEnvironment,
  type DbEnvironment,
  type ImportSourceInput,
  type ImportSourceResult,
} from "./environment.js";
export {
  listUserOrganizationIds,
  listUserProjects,
  recentContextActivity,
  recentAuditActivity,
  deleteSessionByToken,
  type ContextActivity,
  type ActivityEvent,
} from "./queries.js";
