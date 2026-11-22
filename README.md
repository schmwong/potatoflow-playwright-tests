# PotatoFlow Playwright tests (public)

End-to-end tests for the PotatoFlow PWA, written with Playwright. The application under test is
developed in a separate private repository; these tests reach it only through the contract in
`docs/contract/`. **Status: first suites written (HTTP contract and signed-out screens); browser tests of
orders and invoices are blocked on the contract, see `docs/contract/e2e-contract.md` section 2.**

This repository is public. Never commit secrets, tokens, auth state, customer data, traces or videos.

GitHub repo: `potatoflow-playwright-tests`. Suggested local folder name: `playwright-tests`:

```bash
git clone https://github.com/<owner>/potatoflow-playwright-tests.git playwright-tests
```

## Working in this repo

Open **this folder on its own** as the editor workspace. Start with `AGENTS.md`. `main` is PR-only;
activate the local hooks with:

```bash
git config core.hooksPath .githooks
```

## Prerequisites (scoped to this repo)

Install the system tools below. Playwright itself is a project dependency (`@playwright/test` in
`package.json`) installed with `npm install` once the scaffold exists; do not install it globally.

| Tool | Needed for | Windows | macOS | Linux |
|------|-----------|---------|-------|-------|
| Git 2.24+ | version control, hooks | `winget install Git.Git` | `brew install git` | distro package |
| Node.js (current LTS) + npm | running Playwright | `winget install OpenJS.NodeJS.LTS` | `brew install node` | distro package, `nvm`, or NodeSource |
| Playwright browsers | running the tests | `npx playwright install` | `npx playwright install` | `npx playwright install --with-deps` |

Notes:
- Run the browser install **inside the repo after `npm install`**, so the browser versions match the
  locked Playwright version. On Linux, `--with-deps` also installs operating-system libraries and
  needs administrator rights (`sudo`).
- Chromium is the primary target (PWA behaviour). WebKit and Firefox can be added later.
- Not needed here: the application's source or toolchain. A running development instance of
  the app is the system under test; its address and test endpoints are in `docs/contract/`.
- Windows and macOS commands come from the tools' public package catalogues and have not been run on
  this project; confirm with `<tool> --version`.

## Running the tests

The tests never start the app. A run is one throw-away server and database, started by the
application's own harness, which sets `E2E_BASE_URL` (a free loopback port per run, so it never
collides with a local UAT server), `E2E_AUTH_*` and the other variables the tests read. In the
**application repository** (after its `npm ci` and `npm run build`; see the contract, section 1):

```bash
npm run e2e:serve -- npm --prefix <path-to-this-repo> test
```

| Command (in this repo) | What it runs |
|------------------------|--------------|
| `npm test` | everything |
| `npm run test:api` | HTTP contract suite only (no browser) |
| `npm run test:smoke` | browser smoke suite (`@smoke`) |
| `npm run list` | lists the tests without a server |
| `npm run typecheck` | type-checks the specs |

Without `E2E_BASE_URL` the run stops at once with a plain message, and a non-loopback address is
refused. Set `E2E_BROWSER_CHANNEL=chrome` (or `msedge`) to use the installed browser instead of the
Playwright Chromium download. Output goes to the OS temp folder, not this folder; keep logs in
`logs/` (gitignored).

## Check your setup

```bash
git --version
node --version && npm --version
npx playwright --version         # after npm install
```
