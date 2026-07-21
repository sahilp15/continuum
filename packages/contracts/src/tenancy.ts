import { z } from "zod";
import { organizationIdSchema, projectIdSchema, spaceIdSchema, userIdSchema } from "./ids.js";

export const isoDateTimeSchema = z.string().datetime({ offset: true });

export const organizationRoleSchema = z.enum(["owner", "admin", "member"]);
export type OrganizationRole = z.infer<typeof organizationRoleSchema>;

export const spaceRoleSchema = z.enum(["admin", "editor", "viewer"]);
export type SpaceRole = z.infer<typeof spaceRoleSchema>;

export const userSchema = z.object({
  id: userIdSchema,
  email: z.string().email(),
  name: z.string().min(1).max(200),
  createdAt: isoDateTimeSchema,
});
export type User = z.infer<typeof userSchema>;

export const organizationSchema = z.object({
  id: organizationIdSchema,
  name: z.string().min(1).max(200),
  createdAt: isoDateTimeSchema,
});
export type Organization = z.infer<typeof organizationSchema>;

/**
 * A Space is a strict security and retrieval boundary (spec §4.2).
 * Information from one Space must never appear in another Space unless the
 * user explicitly authorizes a relationship or copies the information.
 */
export const spaceSchema = z.object({
  id: spaceIdSchema,
  organizationId: organizationIdSchema,
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(80),
  kind: z.enum(["client", "company", "class", "personal", "team", "other"]),
  description: z.string().max(2000).default(""),
  createdAt: isoDateTimeSchema,
  deletedAt: isoDateTimeSchema.nullable().default(null),
});
export type Space = z.infer<typeof spaceSchema>;

/** A Project belongs to exactly one Space in the MVP (spec §4.3). */
export const projectSchema = z.object({
  id: projectIdSchema,
  organizationId: organizationIdSchema,
  spaceId: spaceIdSchema,
  name: z.string().min(1).max(200),
  objective: z.string().max(2000).default(""),
  status: z.enum(["active", "paused", "done", "archived"]).default("active"),
  createdAt: isoDateTimeSchema,
  deletedAt: isoDateTimeSchema.nullable().default(null),
});
export type Project = z.infer<typeof projectSchema>;

/**
 * User-level information that may follow the person across compatible Spaces
 * (spec §4.1). Personal preferences never override stricter Space rules.
 */
export const personalProfileSchema = z.object({
  userId: userIdSchema,
  displayName: z.string().max(200).default(""),
  background: z.string().max(4000).default(""),
  preferences: z.array(z.string().max(1000)).default([]),
  defaultLanguage: z.string().max(32).default("en"),
  updatedAt: isoDateTimeSchema,
});
export type PersonalProfile = z.infer<typeof personalProfileSchema>;
