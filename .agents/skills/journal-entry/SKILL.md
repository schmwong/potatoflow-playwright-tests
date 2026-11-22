---
name: journal-entry
description: Create or update a dated journal entry in journal/YYYY-MM-DD/ after any significant action (code changes, builds/tests, bug diagnosis, contract changes) and for end-of-session handovers. Enforces the single path, HHmmss timestamp filenames, required sections, and the journal-versus-ADR boundary.
---

<!-- Managed copy. Do not edit here; edit the master and re-run the sync script. -->

# Journal Entry

The journal is the chronological record of **work done**, so context survives between sessions and
agents. Write it as if the reader has zero memory of today.

## Journal vs ADR (do not duplicate)

| | Journal (`journal/`) | ADR (`docs/adr/`, skill `decision-record`) |
|-|----------------------|--------------------------------------------|
| Answers | What did we do, what happened, what next | Why is it this way |
| Shape | Per session or task; steps, commands, results, code blocks | Per decision: context, decision, consequences |
| Lifetime | Append-only history | Durable; superseded, not rewritten |
| Wins on conflict | No | Yes (docs over journal) |

Rule: a durable or architecture-level decision lives **only** in an ADR. Add an ADR pointer to the
journal **only if this work made an architectural change** (structure, invariant, contract, tool,
security or process rule); if nothing architectural changed, omit the ADR line entirely and do not
invent one. The Decisions section then holds a one-line pointer
(`ADR: docs/adr/YYYY-MM-DD/HHmmss-name.md`), never the reasoning. Small tactical choices that matter
only for this task stay in the journal. If you make an architectural decision while working, write
the ADR in the same session and reference it from the entry.

## When a journal entry is required

| Action | Journal? |
|--------|----------|
| Created or modified files, code, schema | Yes |
| Ran builds, tests, benchmarks (see `run-and-log`) | Yes, record results |
| Diagnosed or fixed a bug | Yes, record root cause and fix |
| Wrote a plan or made a decision | Yes; add an ADR pointer only if the decision is architectural |
| Changed a published contract or interface | Yes |
| Ran a code assessment | Yes, record verdict |
| A git hook or guard blocked an action | Yes, record what was attempted and why |
| Read or researched only, nothing changed | No |

## One path, no exceptions

```
journal/YYYY-MM-DD/{HHmmss}-{kebab-case-name}.md
```

- Flat date folder. Never `journal/YYYY/MM/DD/`. Never anywhere else (not `docs/`).
- `{HHmmss}` is the 6-digit local time when the file is created (`153042` = 15:30:42). Entries sort
  chronologically and cannot collide when several people or agents write on the same day. No
  ordinals, no checking for a free number.
- `{kebab-case-name}` describes the task.
- Example: `journal/2026-03-29/153042-registration-e2e-step1-fix.md`.

Generate the prefix, never guess it:

```bash
date +%H%M%S
```

## Procedure

1. List `journal/<today>/` (create the folder if missing) to find an entry for the same task.
2. If one exists for the **same logical task**, update it: append a section or revise the relevant
   one. Do not create a duplicate.
3. Otherwise create a new file named with the current `date +%H%M%S`. One entry per logical task;
   unrelated work gets its own entry. The prefix is the creation time and stays fixed when you
   later update the file.
4. Fill `template.md` (in this skill's directory). Drop a section only where it is marked optional.
   Prefer tables to prose for results.
5. Reference evidence by path (`logs/...`, ADRs, changed files).
6. Respect the repository's visibility rules in `AGENTS.md`. In a **public** repository never
   write secrets, tokens, key material, real customer data, or private design detail.
7. Do not commit the entry unless the user asks (see `commit-workflow`). Journal-only changes are
   their own `[Docs]` subject.

## Handover entries

When the user says "handover", ends a session, or work is blocked, make **Next Steps** concrete:
exact commands, file paths and the first thing to do. A cold reader must be able to resume from
that section alone.

## Conflicts

If a journal entry contradicts an ADR or `docs/`, the ADR or `docs/` wins unless the entry links a
docs update. Newer entries win over older journal entries.
