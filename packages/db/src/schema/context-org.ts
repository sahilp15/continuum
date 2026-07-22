import { index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { organizations, users } from "./identity.js";

/** Context organization: personal profiles, Spaces, Projects (spec §4, §27). */

/**
 * Onboarding progress, persisted so the guided flow is resumable across
 * refreshes and sessions. `data` holds step answers (profile inputs, chosen
 * Space/Project/source ids) as the user advances.
 */
export const onboardingState = pgTable("onboarding_state", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id),
  step: integer("step").notNull().default(0),
  persona: text("persona"),
  data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const personalProfiles = pgTable("personal_profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id),
  displayName: text("display_name").notNull().default(""),
  background: text("background").notNull().default(""),
  preferences: jsonb("preferences").$type<string[]>().notNull().default([]),
  defaultLanguage: text("default_language").notNull().default("en"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const spaces = pgTable(
  "spaces",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    kind: text("kind", {
      enum: ["client", "company", "class", "personal", "team", "other"],
    }).notNull(),
    description: text("description").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("spaces_org_slug_unique").on(t.organizationId, t.slug),
    index("spaces_org_idx").on(t.organizationId),
  ],
);

export const spaceMembers = pgTable(
  "space_members",
  {
    id: text("id").primaryKey(),
    spaceId: text("space_id")
      .notNull()
      .references(() => spaces.id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    role: text("role", { enum: ["admin", "editor", "viewer"] }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("space_members_unique").on(t.spaceId, t.userId)],
);

export const projects = pgTable(
  "projects",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id),
    // A Project belongs to exactly one Space in the MVP.
    spaceId: text("space_id")
      .notNull()
      .references(() => spaces.id),
    name: text("name").notNull(),
    objective: text("objective").notNull().default(""),
    status: text("status", { enum: ["active", "paused", "done", "archived"] })
      .notNull()
      .default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("projects_space_idx").on(t.spaceId)],
);

export const projectMembers = pgTable(
  "project_members",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    role: text("role", { enum: ["admin", "editor", "viewer"] }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("project_members_unique").on(t.projectId, t.userId)],
);
