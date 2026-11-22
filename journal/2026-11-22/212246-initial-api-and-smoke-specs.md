# Journal — Initial scaffold, HTTP contract suite and fresh-browser smoke suite

**Date**: 2026-11-22 (updated 2026-11-23 for contract version 2026-11-23)
**Task**: Scaffold Playwright and write the first specs, scoped to what the contract supports.
**Branch**: `test/initial-ui-specs` (off `docs/e2e-ui-contract`)
**Reporter**: E2E testing session
**Target environment**: Windows 11, Node 24, installed Google Chrome (`E2E_BROWSER_CHANNEL=chrome`)

## Summary

Added the Playwright project (`package.json`, `playwright.config.ts`, `tsconfig.json`), contract helpers, and two suites: an
HTTP contract suite (`api-contract.spec.ts`, 47 tests) and a browser smoke suite for a fresh browser in a contract run
(`ui-smoke.spec.ts`, 4 tests). The first version followed contract 2026-11-22; on 2026-11-23 both specs were corrected to the
refreshed contract (see "Update 2026-11-23"). On 2026-11-23 the full suite was run against the real application through its
`e2e:serve` harness: **51 passed, 0 failed, 0 skipped** (47 api, 4 ui), in about 7 seconds.

## Changes

| File / area | Change | Why |
|-------------|--------|-----|
| `package.json`, `package-lock.json` | `@playwright/test` pinned to 1.65.1, `typescript` and `@types/node` for type-checking; scripts `test`, `test:api`, `test:smoke`, `list`, `typecheck` | README says Playwright is a project dependency |
| `playwright.config.ts` | Two projects: `api` (no browser) and `ui` (Chromium, optional `E2E_BROWSER_CHANNEL`); `baseURL` from `E2E_BASE_URL`; one worker; no trace, video or screenshot; `outputDir` in the OS temp folder | Contract section 1: the harness sets the address; repository is public and sits in OneDrive |
| `tests/support/global-setup.ts` | Fails plainly if a harness variable is missing or the address is not loopback; polls `/healthz` until `{ "status": "ok" }` | Contract section 1 (ready signal) and ground rule 6 |
| `tests/support/{env,people,api,seed,screens}.ts` | `E2E_AUTH_*` headers, request helpers with fresh `requestId`, fixed error vocabulary, seed summary reader, `byTestId` and `screen` | Contract sections 3 to 5 |
| `tests/api-contract.spec.ts` | See "Update 2026-11-23" | Contract sections 3 and 4 |
| `tests/ui-smoke.spec.ts` | See "Update 2026-11-23" | Contract sections 2 and 5.1 |
| `README.md` | "Running the tests" section; status line | Handover |
| `AGENTS.md` | New "No AI attribution" rule | Owner's instruction |
| `docs/contract/e2e-contract.md` | Refreshed to version 2026-11-23 (arrived in the working tree; to be committed with the specs once green) | Contract correction |

## Update 2026-11-23 (contract version 2026-11-23)

| Spec | Change |
|------|--------|
| `api-contract.spec.ts` | Every `sync/pull` sends both `after` and `limit` (`after=0&limit=500` for a first page; later pages use the returned cursor). New negative tests: no `after`, no `limit`, neither, `limit=0`, negative or non-numeric `after` or `limit` all answer `400 BAD_REQUEST`; `after=0` is valid and answers 200 |
| | Order of checks (contract section 4): role before shape (an admin with a malformed query is `NOT_ALLOWED`), shape before device (a foreign device with a malformed query is `BAD_REQUEST`); the device-mismatch test now sends a well-formed request |
| | Seed summary: invoice statuses are upper case, `ISSUED` and `DRAFT`; roles and `plays` stay lower case |
| | People routes: assert `person.userId` and that `person` has no `id`; the admin list is `{ people }` with `userId`, `displayName`, `role`, `active` per row and no `id`; add, rename, role, switch off and switch on assert the returned person (`userId`, `displayName`, `role`, `active`) |
| | Pull: asserts `role`, a whole-number `cursor`, `hasMore`, `serverTime` and `minAppRelease` are present (not `drafts`, `editing`, `reviewCount`); the seeded order numbers and the issued invoice number are found as text in what a manager and a viewer read from `after=0` to the end |
| `ui-smoke.spec.ts` | Replaced the picker and set-up-code tests. A fresh browser in a contract run is asserted on exactly `screen-setup`, `setup-problem` and `setup-try-again`: opens at `/`, title "Set up PotatoFlow here", problem sentence present (its words are not asserted), "Try again" enabled and gives the same result, plain wording. `setup-code`, `setup-back`, the picker and tiles are neither required nor asserted absent |

## Decisions

- No custom server launcher and no port or database variables: the run comes from `npm run e2e:serve -- <test command>`; the tests only read `E2E_BASE_URL` and the other documented variables.
- `workers: 1`: one database per run and some specs add or change people in it.
- Response bodies are never printed: assertions compare statuses, codes and booleans (ground rule 4).
- Where the contract is vague the assertion is deliberately loose: `UNAUTHENTICATED` or `DEVICE_UNKNOWN` for any turned-away request; `NOT_ALLOWED` or `LAST_ADMIN` for the admin switching themself off.
- The request was to test that "zero `after`" is refused; the contract says `after=0` is valid (it reads from the start), so only a missing `after`, a missing `limit`, `limit=0` and negative or non-numeric values are tested as `400 BAD_REQUEST`.

## Verification

| Command | Log file | Result |
|---------|----------|--------|
| `npm install` | `logs/2026-11-22-npm-install-run1.log` | ok, 0 vulnerabilities |
| `playwright install --dry-run chromium` | `logs/2026-11-22-pw-install-dryrun-run1.log` | cached `chromium-1248` is **not** compatible (1.65.1 wants build 1255); not downloaded, installed Chrome used instead |
| `tsc --noEmit` (after the update) | `logs/2026-11-23-typecheck-run1.log` | pass |
| `playwright test --list` (after the update) | `logs/2026-11-23-list-run1.log` | 51 tests in 2 files listed (47 api, 4 ui) |
| `playwright test` with no harness variables, and with a non-loopback address | `logs/2026-11-22-guard-*-run1.log` | each stops at once with a plain message |
| subset against a local stand-in server (not the app): readiness, seed summary, refusals, fresh-browser screen | `logs/2026-11-23-stub-subset-run1.log` | 12 passed, 0 failed, 0 skipped |
| `sh scripts/check-public.sh` | `logs/2026-11-23-check-public-run1.log` | no findings |

| full suite via the application's `e2e:serve` harness, installed Chrome (`E2E_BROWSER_CHANNEL=chrome`) | console, run by the repository owner | 51 passed, 0 failed, 0 skipped (47 api, 4 ui) |

Not covered: orders, invoices and print views through the browser (see Outstanding Items).

## Constraints touched

- Public repository: no response bodies, traces, videos or reports are printed or kept; `logs/` stays local. Preserved.
- Black box: nothing was read from outside this repository; the contract is the only description of the app used.
- No AI attribution (new `AGENTS.md` rule): no attribution line or tool name in code, docs, journals or commits. The managed journal template still shows a tool name in its Reporter example; the `AGENTS.md` rule says it does not apply.
- `main` untouched; work is on `test/initial-ui-specs`; nothing committed.

## Outstanding Items

- **Orders and invoices are not covered through the browser** (contract section 2, "Missing"): Edit-order lock reasons, duplicate-party `Alan Tan · ALT` rows and invoice print navigation need a browser to become a seeded person, and a contract run cannot show the set-up number at all. The second customer, letterhead and paid or voided order must be made through the screens.
- **No HTTP route writes orders or invoices**, so the order and invoice rules are only checked via the seed summary and `sync/pull`.
- The first live run is done and green (51 of 51). One run, one worker: flakiness has not been measured yet, so repeat the run a few times before relying on it as a gate.

## Next Steps

1. Review and commit by subject: scaffold and config, helpers, API suite, UI suite, README, `AGENTS.md` rule, the contract file, journal. Rebase `test/initial-ui-specs` on `main` first if the contract PR has merged.
2. Repeat the live run a couple of times to check for flakiness. Read any failure from a log file, not the console, and record test name, contract item and observed versus expected in contract terms only.
4. Ask for the browser sign-in piece (contract section 2) so the orders and invoices specs can be written.
