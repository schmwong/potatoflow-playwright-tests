# PotatoFlow Playwright tests (public)

End-to-end tests for the PotatoFlow PWA, written with Playwright. The application under test is
developed in a separate private repository; these tests reach it only through the contract in
`docs/contract/`. **Status: setup phase, no tests yet.**

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

## Check your setup

```bash
git --version
node --version && npm --version
npx playwright --version         # after npm install
```
