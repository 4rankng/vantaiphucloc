## Tool Priority (follows global Tool-First Rule in ~/.claude/CLAUDE.md)

**Indexed:** 7,734 nodes (codegraph) | 177.6 MB graph (graphify)
**Rule:** codegraph → graphify → rtk-filtered bash → Read (only when path known)

Before changing any symbol → `codegraph_impact` to understand blast radius.

### claude-mem

Use for session observations: `observation_context`, `observation_add`, `search`, `timeline`.
Record when: architectural decisions, non-obvious patterns, non-trivial bugfixes, significant refactors.

## Automatic Sync

On session stop: `codegraph sync-if-dirty`, `graphify update` (AST-only, no API cost).
Edit/Write operations auto-mark codegraph dirty via PostToolUse hook.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
