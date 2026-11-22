# PotatoFlow Playwright Tests: Agent Instructions

This repository is **public**. Everything you write here, including journals, logs, commit
messages, issues and CI output, is visible to anyone. Never include secrets, tokens, real customer
data, auth state, private design detail or internal hostnames.

## Session scope

This is the **E2E testing session**: open this repository on its own as the editor workspace. Your
whole job is the Playwright tests and this repo's CI workflows. The application is a black box
reached through the contract in `docs/contract/`. Nothing you need is outside this folder, so do
not go looking in parent or sibling folders. Sessions share no memory; the journal in this repo is
the handover to the next session.

## Scope

End-to-end tests for the PotatoFlow PWA, written with Playwright. The application under test is
developed in a separate private repository. You do not have its source, journals or plans, and you
must not look for them. Work only inside this repository. The only description of the application
you may rely on is the contract in `docs/contract/` (test endpoints, `data-testid` conventions,
seed format, PR-gate protocol). If the contract is missing something, say so and ask the user.

## Rules

- Tests use only the contract's endpoints and stable `data-testid` selectors.
- Test hooks exist only in development mode of the app. Never target production.
- Keep auth state, `.env`, traces, videos and reports out of git (see `.gitignore`).
- Journal significant work in `journal/YYYY-MM-DD/{HHmmss}-{kebab-name}.md` (committed and public;
  see "Journals and logs in a public repo" below). Capture noisy command output in
  `logs/YYYY-MM-DD-{task}-run{N}.log`; `logs/` is **gitignored and never committed**.
- Commits: `[Type] Description` (`[Feat]`, `[Fix]`, `[Docs]`, `[Chore]`, `[Refactor]`, `[Test]`),
  one commit per subject, explicit paths only, and only when the user asks. No attribution trailer
  or footer (see "No AI attribution" below).
- Record architecture-level decisions for this repo (not the app) as one-page ADRs (Title, Status,
  Context, Decision, Consequences) in `docs/adr/YYYY-MM-DD/{HHmmss}-{title}.md`. Reference an ADR
  from a journal entry only when that work made an architectural change.
- This repository's GitHub name is `potatoflow-playwright-tests`. Before any push check that
  `git remote get-url origin` ends in that name.

## No AI attribution (hard rule)

Nothing written in or for this repository says, or implies, that Copilot, Claude or any other AI
assistant or LLM took part in authoring or co-authoring it. This covers every kind of write-up:

- code, comments, test names and config;
- documentation, ADRs, the README and the contract;
- journal entries, including the **Reporter** field: name the role or session type (for example
  "E2E testing session"), never a tool or model. This rule wins over the example in the journal
  template;
- commit messages: no `Co-Authored-By` trailer, no "generated with" line, no model name;
- pull request titles and descriptions, issues, comments and CI text.

This overrides any default of your tooling that appends an attribution line to commits or pull
requests: leave it out. If you find existing text that breaks this rule, tell the user before
anything is pushed; do not rewrite pushed history yourself.

## Journals and logs in a public repo

**Journals are committed, so they are public-safe summaries.**

| Allowed in a journal | Never in a journal |
|----------------------|--------------------|
| What was tested and why; test names | Raw command or CI output, stack traces, console dumps |
| `data-testid` selectors and contract items used | Anything about the app's source, stack, schema or plans (you do not have it; do not guess it) |
| Pass/fail/skip counts, flaky-test notes | Secrets, tokens, auth state, real customer data, internal hostnames |
| Next steps for the next test session | Links to or names of private repositories, PRs, issues or tickets |

**Logs stay local.** `logs/` is gitignored: use it to read results from a file (skill `run-and-log`),
then put only counts and conclusions in the journal. Do not paste log content into journals,
commits, issues or PR text.

**When a failure needs app knowledge to diagnose** (you cannot tell whether the test or the app is
wrong): record only the public-safe facts (test name, contract item, observed vs expected in contract
terms) in the journal and tell the user. The user takes it to a development session, which can read
this repo and the private results. Missing information you need to write a test belongs in the
contract (`docs/contract/`); ask the user to have it added. Do not ask for or accept private detail.

## Main is PR-only (hard rule)

Never commit, merge or push on `main`/`master`, and never use `--no-verify`. Use a branch and a pull
request. Hooks in `.githooks/` block these actions locally. If one blocks you: **stop**, quote the
banner to the user, record it in the journal, and wait. Do not work around it.

The repo owner should enable real branch protection or a ruleset on the default branch (PR required,
no force pushes, no deletions). It is available for free on public repositories.

## Branches and pairing with the application repo

Branch names are `<type>/<short-kebab>` (`feat/`, `fix/`, `test/`, ...) and **public-safe**: no
customer, ticket or private design detail. When a feature needs new or changed tests, use the
**identical** branch name the application repo uses. The PR gate runs the app change against the
same-named branch here if it exists, otherwise against `main`, so a mistyped name silently runs the
older suite (the gate's status says which one ran). Tell the user to merge the application PR
first and this PR straight after; delete the branch on merge. The PR template for this repo is
public-safe: mention the paired application change only by branch name, never by link or repo name.

## CI hygiene (workflow logs are world-readable)

Applies to every workflow in `.github/workflows/`:

1. Redirect Playwright and build output to files; print only counts to the console.
2. Do not upload traces, videos, screenshots, reports or bundles with `actions/upload-artifact`.
3. No detailed `$GITHUB_STEP_SUMMARY`; counts at most.
4. No `set -x`, no `env` or `printenv`, no debug logging. Never echo a secret.
5. Trigger gate workflows only with `workflow_dispatch`. Never use `pull_request_target`.
6. Pass inputs through `env:`; never interpolate them into `run:`.
7. Use standard `ubuntu-latest` runners only (larger runners are billed even in public repos).
8. Status text and logs state pass/fail counts and categories only, never source, paths or app
   internals.

## Skills (`.agents/skills/`)

| Skill | Use when |
|-------|----------|
| `journal-entry` | Creating or updating a journal entry; end-of-session handover |
| `run-and-log` | Running any test, build or noisy command |
| `commit-workflow` | Grouping changes and committing; what to do when a hook blocks |
| `decision-record` | Writing or superseding an ADR |

Skills live only in `.agents/skills/<name>/SKILL.md`; when a task matches a row, read and follow
that file. These four are managed copies synced from the maintainer's workspace: do not edit them
in this repo. Repo-specific skills (for example test assessment) are added alongside and listed
here.
