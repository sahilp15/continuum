# MCP server

`apps/mcp` — built on the official `@modelcontextprotocol/sdk` (`McpServer` +
`registerTool`), stdio transport today; remote HTTP transport with standards-based OAuth is
the Phase 5 exit gate.

## Tools

| Tool                                                           | Purpose                                            |
| -------------------------------------------------------------- | -------------------------------------------------- |
| `continuum_list_spaces`                                        | Spaces the actor can access (others are invisible) |
| `continuum_list_projects`                                      | Projects in a Space                                |
| `continuum_get_context`                                        | Compile a context bundle + Context Receipt         |
| `continuum_search_memory`                                      | Search approved memory in one Space                |
| `continuum_list_suggestions`                                   | Pending candidates in a Space                      |
| `continuum_propose_memory`                                     | Propose memory (always requires human approval)    |
| `continuum_approve_suggestion` / `continuum_reject_suggestion` | Resolve candidates                                 |
| `continuum_check_output`                                       | Deterministic preflight on draft content           |
| `continuum_forget_memory`                                      | Soft-delete a memory                               |

Every tool validates inputs with Zod, routes through the same policy layer as the web app,
returns structured JSON, and reports failures as structured `code: message` text with
`isError` — resource-hiding included (unauthorized Spaces yield `not_found`).

## Authentication

Local development: `CONTINUUM_MCP_DEV_TOKEN` (≥12 chars) maps to the demo user. The dev
path **hard-fails when `NODE_ENV=production`** regardless of configuration — there is no
flag that re-enables it (tested). Production remote MCP uses OAuth per current MCP
authorization guidance; verify the spec's current revision when implementing Phase 5.

## Running

```bash
echo 'CONTINUUM_MCP_DEV_TOKEN=local-dev-token-123' >> .env
pnpm --filter @continuum/app-mcp dev
```

Claude Desktop / MCP client config:

```json
{
  "mcpServers": {
    "continuum": {
      "command": "node",
      "args": ["--experimental-strip-types", "<repo>/apps/mcp/src/main.ts"],
      "env": { "CONTINUUM_MCP_DEV_TOKEN": "local-dev-token-123" }
    }
  }
}
```

Integration tests (`src/server.test.ts`) run a real MCP client against the server over an
in-memory transport, covering authorized context retrieval, isolation, and preflight.
