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
