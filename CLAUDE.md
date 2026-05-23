## Tool Priority

1. **codegraph MCP tools** — `codegraph_search`, `codegraph_context`, `codegraph_callers/callees`, `codegraph_impact` (instant, indexed; 6,916 nodes)
2. **graphify CLI** — `graphify query`, `graphify path`, `graphify explain` (cross-file relationships from graphify-out/)
3. **rtk-filtered Bash** — `rg`, `grep`, `find` auto-rewritten by rtk hook (93%+ token savings)
4. **Raw Read/Edit** — only when you know the exact file path

Before making changes to a symbol, run `codegraph_impact` to understand blast radius.

### claude-mem

Use for session observations: `observation_context`, `observation_add`, `search`, `timeline`.
Record when: architectural decisions, non-obvious patterns, non-trivial bugfixes, significant refactors.

## Automatic Sync

On session stop: `codegraph sync-if-dirty`, `graphify update` (AST-only, no API cost).
Edit/Write operations auto-mark codegraph dirty via PostToolUse hook.
