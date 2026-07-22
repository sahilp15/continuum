import {
  newId,
  personalProfileSchema,
  projectSchema,
  spaceSchema,
  type PersonalProfile,
  type Project,
  type Space,
} from "@continuum/contracts";
import { and, eq, isNull } from "drizzle-orm";
import type { ContinuumDatabase } from "../client.js";
import {
  organizationMembers,
  organizations,
  personalProfiles,
  projects,
  spaces,
} from "../schema/index.js";

const toIso = (d: Date | null): string | null => (d ? d.toISOString() : null);

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || "space";
}

export interface CreateSpaceInput {
  organizationId: string;
  name: string;
  kind: Space["kind"];
  description?: string;
}

export interface CreateProjectInput {
  organizationId: string;
  spaceId: string;
  name: string;
  objective?: string;
  status?: Project["status"];
}

export interface UpsertProfileInput {
  userId: string;
  displayName?: string;
  background?: string;
  preferences?: string[];
  defaultLanguage?: string;
}

/**
 * Tenancy CRUD (organizations, Spaces, Projects, personal profiles). This is the
 * runtime create/list layer the app needs — previously only the seed wrote these
 * rows. Every tenant-scoped table references an organization; a new user gets a
 * personal organization on first use.
 */
export function createTenancyRepository(db: ContinuumDatabase) {
  function rowToSpace(row: typeof spaces.$inferSelect): Space {
    return spaceSchema.parse({
      id: row.id,
      organizationId: row.organizationId,
      name: row.name,
      slug: row.slug,
      kind: row.kind,
      description: row.description,
      createdAt: toIso(row.createdAt)!,
      deletedAt: toIso(row.deletedAt),
    });
  }
  function rowToProject(row: typeof projects.$inferSelect): Project {
    return projectSchema.parse({
      id: row.id,
      organizationId: row.organizationId,
      spaceId: row.spaceId,
      name: row.name,
      objective: row.objective,
      status: row.status,
      createdAt: toIso(row.createdAt)!,
      deletedAt: toIso(row.deletedAt),
    });
  }

  const repo = {
    /** The user's primary organization, creating a personal one on first use. */
    async getOrCreatePersonalOrg(userId: string, orgName = "Personal"): Promise<string> {
      const existing = await db
        .select({ organizationId: organizationMembers.organizationId })
        .from(organizationMembers)
        .where(eq(organizationMembers.userId, userId))
        .limit(1);
      if (existing[0]) return existing[0].organizationId;

      const organizationId = newId("org");
      await db.insert(organizations).values({ id: organizationId, name: orgName });
      await db.insert(organizationMembers).values({
        id: newId("orm"),
        organizationId,
        userId,
        role: "owner",
      });
      return organizationId;
    },

    async createSpace(input: CreateSpaceInput): Promise<Space> {
      const base = slugify(input.name);
      const clash = await db
        .select({ id: spaces.id })
        .from(spaces)
        .where(and(eq(spaces.organizationId, input.organizationId), eq(spaces.slug, base)))
        .limit(1);
      const slug = clash[0] ? `${base}-${newId("s", 4).split("_")[1]}` : base;

      const row = {
        id: newId("spc"),
        organizationId: input.organizationId,
        name: input.name,
        slug,
        kind: input.kind,
        description: input.description ?? "",
      };
      await db.insert(spaces).values(row);
      const inserted = await db.select().from(spaces).where(eq(spaces.id, row.id)).limit(1);
      return rowToSpace(inserted[0]!);
    },

    async getSpace(spaceId: string): Promise<Space | null> {
      const rows = await db.select().from(spaces).where(eq(spaces.id, spaceId)).limit(1);
      return rows[0] ? rowToSpace(rows[0]) : null;
    },

    /** Spaces in every organization the user belongs to (active only). */
    async listUserSpaces(userId: string): Promise<Space[]> {
      const rows = await db
        .select()
        .from(spaces)
        .innerJoin(
          organizationMembers,
          eq(organizationMembers.organizationId, spaces.organizationId),
        )
        .where(and(eq(organizationMembers.userId, userId), isNull(spaces.deletedAt)));
      return rows.map((r) => rowToSpace(r.spaces));
    },

    async createProject(input: CreateProjectInput): Promise<Project> {
      const row = {
        id: newId("prj"),
        organizationId: input.organizationId,
        spaceId: input.spaceId,
        name: input.name,
        objective: input.objective ?? "",
        status: input.status ?? ("active" as const),
      };
      await db.insert(projects).values(row);
      const inserted = await db.select().from(projects).where(eq(projects.id, row.id)).limit(1);
      return rowToProject(inserted[0]!);
    },

    async getProject(projectId: string): Promise<Project | null> {
      const rows = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
      return rows[0] ? rowToProject(rows[0]) : null;
    },

    async listSpaceProjects(spaceId: string): Promise<Project[]> {
      const rows = await db
        .select()
        .from(projects)
        .where(and(eq(projects.spaceId, spaceId), isNull(projects.deletedAt)));
      return rows.map(rowToProject);
    },

    async getProfile(userId: string): Promise<PersonalProfile | null> {
      const rows = await db
        .select()
        .from(personalProfiles)
        .where(eq(personalProfiles.userId, userId))
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      return personalProfileSchema.parse({
        userId: row.userId,
        displayName: row.displayName,
        background: row.background,
        preferences: row.preferences,
        defaultLanguage: row.defaultLanguage,
        updatedAt: toIso(row.updatedAt)!,
      });
    },

    async upsertProfile(input: UpsertProfileInput): Promise<PersonalProfile> {
      const now = new Date();
      const values = {
        userId: input.userId,
        displayName: input.displayName ?? "",
        background: input.background ?? "",
        preferences: input.preferences ?? [],
        defaultLanguage: input.defaultLanguage ?? "en",
        updatedAt: now,
      };
      await db
        .insert(personalProfiles)
        .values(values)
        .onConflictDoUpdate({
          target: personalProfiles.userId,
          set: {
            displayName: values.displayName,
            background: values.background,
            preferences: values.preferences,
            defaultLanguage: values.defaultLanguage,
            updatedAt: now,
          },
        });
      const profile = await repo.getProfile(input.userId);
      return profile!;
    },
  };

  return repo;
}

export type TenancyRepository = ReturnType<typeof createTenancyRepository>;
