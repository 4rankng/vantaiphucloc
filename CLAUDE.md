## Tool Integration — Priority Order for Codebase Navigation

When exploring code, follow this priority order (fastest/cheapest first):

1. **codegraph MCP tools** — `codegraph_search`, `codegraph_context`, `codegraph_node`, `codegraph_callers`, `codegraph_callees` for symbol-level lookups (instant, indexed)
2. **graphify CLI** — `graphify query "<question>"` for cross-file relationship questions, `graphify path "A" "B"` for dependency chains, `graphify explain "<concept>"` for focused summaries
3. **rtk-filtered Bash** — `rg`, `grep`, `find` are auto-rewritten by rtk hook for token savings
4. **Raw Read/Edit** — only when you know the exact file path

### graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists
- Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context

### codegraph

.codegraph/ is initialized (6,916 nodes, 17,955 edges). Use it for:
- `codegraph_context "<task>"` — build comprehensive context for a task (replaces multiple grep/read calls)
- `codegraph_search "<symbol>"` — find symbol by name
- `codegraph_callers/callees "<func>"` — trace call chains
- `codegraph_impact "<symbol>"` — assess change blast radius before editing
- `codegraph_files` — project structure from index (faster than filesystem scanning)

Before making changes to a symbol, run `codegraph_impact` to understand blast radius.

### rtk

All Bash commands are auto-filtered through rtk (93%+ token savings). The hook runs transparently — no action needed.
Project-specific filters are in `.rtk.toml`. Run `rtk gain` to see savings analytics.

### claude-mem

Use claude-mem MCP tools for:
- `observation_context "<query>"` — inject relevant past decisions/context into current session
- `observation_add content="<decision>" kind="decision"` — record architectural decisions
- `observation_add content="<pattern>" kind="discovery"` — record codebase discoveries
- `search "<query>"` — find past observations
- `timeline anchor=<ID>` — get context around a specific observation

Record observations when:
- Making architectural decisions (kind: "decision")
- Discovering non-obvious code patterns (kind: "discovery")
- Fixing bugs with non-trivial root causes (kind: "bugfix")
- Completing significant refactors (kind: "refactor")

## Automatic Sync

On session stop, the following auto-sync:
- **codegraph sync-if-dirty** — syncs codegraph index after any Edit/Write
- **graphify update** — rebuilds graph (AST-only, no API cost)
- Edit/Write operations auto-mark codegraph dirty via PostToolUse hook
