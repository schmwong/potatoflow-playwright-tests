# Journal — {Task name}

**Date**: YYYY-MM-DD
**Task**: {one-line description}
**Branch**: {current branch}
**Reporter**: {agent and model, e.g. Zed agent / Claude}
**Target environment**: {e.g. Chrome desktop, Android 12 tablet, Node backend dev, n/a}

## Summary

2 to 4 sentences: what was set out, what was done, the outcome.

## Changes

| File / area | Change | Why |
|-------------|--------|-----|
| `path/to/file` | {what} | {why} |

## Decisions

- ADR: `docs/adr/YYYY-MM-DD/HHmmss-name.md` *(include ONLY if this work made an architectural change; otherwise delete this line)*
- {Tactical choice that only matters for this task, with a one-line reason.}

## Verification  *(builds, tests, benchmarks; say "not run" and why if so)*

| Command | Log file | Result |
|---------|----------|--------|
| `{command}` | `logs/YYYY-MM-DD-{task}-run1.log` | {pass/fail counts or size budget result} |

## Progress Trend  *(optional, for repeated runs or benchmarks)*

| Iteration | Date | Passed | Failed | Skipped | Notes |
|-----------|------|--------|--------|---------|-------|

## Constraints touched

List any rules from `AGENTS.md` (invariants, guardrails, visibility rules) this work touches and how
they were preserved. Write "none" if none.

## Outstanding Items

- {Open issue, blocker, or follow-up. Unrelated bugs found en route go here, not fixed.}

## Fix Plan  *(optional)*

| # | Issue | Root cause | Files |
|---|-------|-----------|-------|

## Next Steps

1. {First concrete action, with exact command or path.}
2. {...}

## Session Notes  *(optional)*

Observations, measurements, links, code blocks and examples. Follow the repository's visibility
rules in `AGENTS.md`.
