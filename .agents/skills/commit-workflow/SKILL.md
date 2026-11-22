---
name: commit-workflow
description: Branch, group changes by subject, assess, then stage explicit paths and commit with the "[Type] Description" format, one commit per subject, never on main. Covers the git hook guardrails and what to do when one blocks. Use only when the user asks to commit, push or prepare a PR.
---

<!-- Managed copy. Do not edit here; edit the master and re-run the sync script. -->

# Commit Workflow

**Only commit when the user asks.** Never push unprompted.

## Hard rules: main is PR-only

1. **Never commit on `main` or `master`.** Work on a feature branch (`git switch -c <type>/<short-name>`,
   e.g. `feat/db-worker`, `docs/adr-guardrails`), and land it through a pull request.
2. **Never push to `main` or `master`, never merge into it locally, never force-push, never
   `--no-verify`, never rewrite published history.** Merging happens only in the GitHub PR, by the user.
3. The repo ships git hooks (`.githooks/`, installed by the sync script) that block commits on main,
   merges on main and pushes to main with a loud banner. **If a hook blocks you: stop, do not work
   around it, quote the banner to the user, and record the attempt in today's journal.** An attempt
   to touch main without a PR is a reportable event, not a retry.
4. The repository host may not enforce protection (free private repos cannot). These rules and hooks
   are the guard. Treat them as mandatory.

First commit in a brand-new repository (no commits yet) is the only exception, and only when the user asks.

## Branch names

- Format `<type>/<short-kebab>` with the same types as commits, lower-case: `feat/`, `fix/`,
  `docs/`, `chore/`, `refactor/`, `test/` (e.g. `feat/push-notifications`).
- **Names are public-safe.** A branch name can be copied into another repository's public CI logs
  and mirrored branch. No customer names, ticket details, secrets or private design detail.
- **Mirrored branches.** When one feature needs changes in both the app repo and the Playwright
  repo, use the **identical** branch name in each, created from that repo's own session. The CI gate
  runs the app PR against the same-named Playwright branch if it exists, else Playwright `main`.
  Create a matching branch only when the feature needs new or changed tests.
- Delete the branch after its PR merges (a lingering branch keeps being picked up by CI).

## One commit per subject

A subject is one coherent change with one purpose (a feature, a fix, a docs batch, a tooling
change). Never mix subjects in one `git add` or `git commit`. If two files would carry different
`[Type]` prefixes, they are different subjects.

## Steps

1. **Check the branch.** `git branch --show-current` must not be `main` or `master`. If it is,
   create a feature branch first (with the user's go-ahead).
2. **Identify subjects.** `git --no-optional-locks status --short`, then group files.
3. **Assess.** If the repo has an `assess-code-changes` skill, run it for each code subject.
   Markdown-only subjects are exempt.

   | Result | Action |
   |--------|--------|
   | SAFE TO MERGE | Proceed |
   | Minor issues | Fix first, do not override |
   | Major or Critical | Do not commit. Fix and re-assess |

4. **Check `.gitignore`.** Never stage ignored files, `node_modules/`, build output, local env
   files, or anything that holds keys, tokens or real customer data.
5. **Stage explicit paths only.** Never `git add .`, `git add -A` or `git add <dir>/` blindly.
   ```bash
   git add path/one path/two
   git diff --cached --stat
   ```
6. **Commit.** Git metadata writes need an unsandboxed terminal call, which the user must approve.
   Run git from inside the repo you are committing in; sibling folders are separate repos.
   ```bash
   GIT_EDITOR=true git commit -m "[Type] Short description"
   ```
7. Repeat for the next subject.

## Pushing

Push only when asked, and only a feature branch. Before any push run `git remote get-url origin`
and confirm it is the expected remote for this repo (never infer it from the folder name). Never
push a private repository's content to a public remote.

## Message format

```
[Type] Short description starting with a capital letter

Optional body: context, bullets, references (journal entry, ADR).
```

| Type | Use for |
|------|---------|
| `[Feat]` | New capability |
| `[Fix]` | Bug fix |
| `[Docs]` | Docs, ADRs, journal entries, skills, instructions |
| `[Chore]` | Config, tooling, dependencies, CI |
| `[Refactor]` | Restructuring without behavior change |
| `[Test]` | Adding or updating tests (fixing a broken test is `[Fix]`) |

Rules: square brackets, Title Case type, capital letter after the tag, no parenthesised scope
(`[Feat]`, not `feat:` or `[Feat](db)`).

## Pull requests

Use `.github/pull_request_template.md` if present. Paste the assessment summary and verdict, link
the journal entry, ADRs and log files, and list any constraints touched. **Complete every section
of the template**, including any cross-repo pairing statement: a section left blank or ticked
without evidence is a defect in the PR. Do not create a PR in another repository unless the user
asks; tell the user what is needed there instead.
