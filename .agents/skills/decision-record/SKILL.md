---
name: decision-record
description: Write or supersede an Architecture Decision Record (ADR) in docs/adr/YYYY-MM-DD/ using the Michael Nygard format (Title, Status, Context, Decision, Consequences) on one page, with HHmmss timestamp filenames that mirror the journal. Use when a choice affects structure, invariants, contracts, tooling, security or process, or when the user says "record this decision".
---

<!-- Managed copy. Do not edit here; edit the master and re-run the sync script. -->

# Decision Record (ADR)

An ADR explains **why** something is the way it is. It is not a log of work (that is the journal,
skill `journal-entry`) and not every small choice needs one. Use the Michael Nygard format, kept to
about one page.

## Write an ADR when

- It changes structure, an invariant, a public contract, a dependency or tool, security posture,
  repo or process rules, or
- Someone new would reasonably ask "why did we do it this way?" and the answer is not obvious, or
- You are reversing or refining an earlier ADR.

Do not write one for tactical, easily reversible choices. Those go in the journal's Decisions section.

## The five sections

| Section | Content |
|---------|---------|
| **Title** | A clean headline naming the decision, e.g. `Use Playwright for end-to-end testing instead of Cypress` |
| **Status** | `Proposed`, `Accepted`, `Rejected`, or `Superseded by <path>` |
| **Context** | The problem, the constraints, and the alternatives evaluated (each with why it lost). Facts, not opinions |
| **Decision** | The explicit action or tool committed to, stated plainly, with the rule that follows |
| **Consequences** | Trade-offs, good and bad: cost, training, speed, risk, follow-ups and open items |

Nothing else is required. Optional single line `Supersedes: <path>` under Status when replacing an
older ADR. Keep it short; if it will not fit on a page, split it into two decisions or move the
operational detail to `docs/` and link to it.

## One path, mirrors the journal

```
docs/adr/YYYY-MM-DD/{HHmmss}-{kebab-case-title}.md
```

- Same flat date folder and `HHmmss` prefix rule as `journal/YYYY-MM-DD/{HHmmss}-name.md`, so a
  decision and the work session around it line up by date and time.
- Prefix is `date +%H%M%S` at creation and never changes. **No ordinals in the title or filename**:
  two people adding "ADR 4" on different branches would collide. The dated path is the identifier;
  refer to an ADR by its path.
- No hand-maintained index (it would conflict on every merge). The folder listing is the index.

## Procedure

1. Check `docs/adr/` for an existing ADR on the topic. If it still holds, do not duplicate it. If it
   is outdated, supersede it (below).
2. Create the file from `template.md` (this skill's directory).
3. Fill the five sections. Follow the repository's visibility rules in `AGENTS.md` (a public
   repository's ADRs are public).
4. Link from the journal: add the ADR path to today's journal entry (see `journal-entry`). The ADR
   itself does not need to link back.

## Superseding

Never rewrite history. Create a new ADR with `Supersedes: <old path>`, and change only the old ADR's
`Status` line to `Superseded by <new path>`.

## Precedence

ADRs and `docs/` win over journal entries when they conflict. If you find a contradiction, add a
correction note to the journal entry pointing to the ADR, or write a superseding ADR.
