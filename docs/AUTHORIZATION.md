# Authorization

Centralized in `packages/auth`. No permission checks in route handlers or components.

## Actors

Every service call takes an `Actor` — user id, surface (`web_app`, `browser_extension`,
`mcp`, `api`, `internal`), and a sensitivity allowance for that surface. Services without an
actor parameter don't exist.

## Policies

`canViewOrganization`, `canManageOrganization`, `canViewSpace`, `canEditSpace`,
`canViewProject`, `canApproveMemory`, `canInstallConnector`, `canSearchConnector`,
`canExecuteConnectorAction`, `canViewSensitiveItem`, `canExportData`, `canDeleteData` —
plus assertion helpers (`assertSpaceAccess`, `assertProjectInSpace`,
`assertSensitivityAllowed`).

## Resource hiding

Authorization failures on specific resources throw `ContinuumError("not_found")` —
byte-identical to a genuinely missing resource — so unauthorized users cannot infer that a
Space, Project, memory, or suggestion exists. Tested in `packages/auth` and at the MCP
boundary.

## Role model

- Organization: `owner` / `admin` / `member`. Only owners delete data; owners/admins manage,
  install connectors, export.
- Space: `admin` / `editor` / `viewer` (explicit membership overrides the org-derived
  default: owner/admin → admin, member → editor).
- Approving memory and executing connector actions require editor+.

## Store binding

`AuthorizationStore` is the lookup interface (org role, space role, space→org, project→space).
In-memory implementation for tests/demo; the Drizzle implementation binds to
`organization_members`, `space_members`, `projects` (Phase 1). Database-level constraints
(FKs, unique memberships) back the application checks; RLS is a Phase 1 candidate — record
an ADR when decided.
