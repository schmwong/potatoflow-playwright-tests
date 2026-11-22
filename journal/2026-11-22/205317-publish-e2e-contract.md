# Journal — E2E contract added to this repository

**Date**: 2026-11-22
**Task**: Add the black-box contract the tests rely on, as one document.
**Branch**: `docs/e2e-ui-contract` (the same name as the application branch it pairs with)
**Reporter**: application development session, at the user's request

## Summary

`docs/contract/e2e-contract.md` is new (contract version 2026-11-22). It covers how a run is started and when it is ready, what exists to seed and reset (and what does not),
the seeded people and data, the HTTP routes, and the screens, `data-testid` values and visible states for sign-in and role visibility, orders (Edit order and its lock
reasons), and invoices (`Name · code` rows, the primary "View or print invoice").

## Checks

| Check | Result |
|-------|--------|
| `sh scripts/check-public.sh` | no findings |

No tests were written or run.

## Outstanding Items

- **Browser-driven tests of orders and invoices are blocked** until the contract says how a browser becomes a seeded person (section 2, "Missing"). Tests of the HTTP routes and the signed-out screens can be written now.
- The seed has no letterhead (Print is disabled), no two same-name customers and no paid or voided order; section 2 lists how to create them through the screens.
- Order cards do not show a customer code, and lists do not refresh after a sync (section 5.4): do not assert either.

## Next Steps

1. Open the pull request for `docs/e2e-ui-contract` (merge the application pull request of the same name first, then this one straight after).
2. Read `docs/contract/e2e-contract.md` before writing any test, and ask the user to have anything missing added to it.
