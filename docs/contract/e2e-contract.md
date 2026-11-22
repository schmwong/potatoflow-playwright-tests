# PotatoFlow end-to-end contract

**Contract version 2026-11-22.** Black-box interface only: how a run is started, what is seeded, the HTTP routes tests may call, and the screens, test ids and
visible states a browser test can drive. It holds no source, schema, secrets or private design detail. If a test needs something that is not here, say so and ask
the user to have it added; do not look for it elsewhere.

Status of the pieces: the run harness, the HTTP routes and the screens below exist today. **Browser-driven tests of orders and invoices are blocked by one missing
piece** (section 2, "Missing"): a browser cannot yet become a seeded person.

## Ground rules

1. **No reset endpoint exists, anywhere.** Isolation comes from a new throw-away server and database per run, not from a route that wipes data.
2. **Never real data.** Every database a test sees is built from synthetic seed data and deleted when the run ends.
3. Tests do not share state across runs and must not assume seed ids are the same as another run's. Use the identities below and read anything else from the server's answers.
4. Tests print nothing but pass, fail and counts: no server output and no response bodies (this repository is public).
5. The product's rule is plain words for seniors, so tests assert plain behaviour: a screen never shows an error code, a table name or a stack trace.
6. Test hooks exist only in a test or development run. Never point a test at production.

## 1. Starting a run

A run is one throw-away server and one fresh database, with the built app and `/api` on **one address**. The application's pipeline starts it; a developer can start
the same run locally. Run these in the **root folder of the application repository**:

| Step | Command | Notes |
|---|---|---|
| once | `npm ci` | installs the pinned tools |
| after any change | `npm run build` | makes the static app the run serves. Without it the run stops with `BUILD_MISSING` (unless `--api-only`) |
| a run | `npm run e2e:serve -- <test command>` | starts the run, runs your command with the variables below set, stops the run, and exits with your command's exit code |

Options before the command: `--api-only` (no app, API routes only) and `--build-dir <folder>` (serve another build, for example a candidate). With no command it prints
the variables as JSON and serves until Ctrl+C. `KEEP=1` keeps the run's folder for a developer (never in CI).

| Question | Answer |
|---|---|
| Port | A free port on the loopback address, chosen per run. **There is no port variable to set**: read `E2E_BASE_URL` |
| Database | A fresh copy per run in a temporary folder, deleted when the run ends. **There is no path variable to set**; the seed's contents are in the file named by `E2E_SEED_SUMMARY` |
| Ready | The command prints `ready at <E2E_BASE_URL>` to standard error, then `GET <E2E_BASE_URL>/healthz` answers `200` with `{ "status": "ok" }` (`503` with `"unhealthy"` if the database fails). Poll it before the first test |
| Variables | `E2E_BASE_URL` (one origin for the app and `/api`), `E2E_APP_RELEASE` and `E2E_SCHEMA_VERSION` (send them as `appRelease` and `schemaVersion`), `E2E_SEED_SUMMARY` (path of a small JSON file; read it, never write it), and one `E2E_AUTH_<PERSON>` per seeded person: a ready-made `Authorization` header value, used unchanged |
| Failures | Exit code `2` with `e2e <run id>: <fixed code>` on standard error. Nothing else is printed |

A developer running the app by hand (not a test, not the gate): the backend listens on `127.0.0.1:3000` and answers `GET /healthz` the same way; `PORT` changes the
port. The app is at `http://localhost:5173/` and forwards `/api` to the backend. Do not use that setup in a test.

## 2. Seeding and resetting: what exists, what does not

| Need | Today |
|---|---|
| A fresh, isolated server and database for every run | **Exists** (section 1) |
| Known data to start from | **Exists**: the fixed world in section 3, with its summary file |
| Reset or reseed a running server | **Does not exist, on purpose** (ground rule 1). Start a new run |
| `/api/test/*` endpoints, or any HTTP seed route | **Do not exist.** Do not write a test that calls one |
| A command-line seed hook for tests | **Does not exist** beyond the run itself |

What the seed does **not** contain, so a UI test has to create it through the screens or ask for it:

- **No letterhead.** Until one is saved, Print is disabled on every paper view (`print-notice` is shown, `print-button` is disabled). Navigation, Edit order and Edit invoice are unaffected.
- **No two customers with the same name.** The disambiguation in section 5.3 shows only after a test adds a second customer of the same name (the order form's inline "new customer").
- **No order on a paid invoice, no voided order, no order on a second draft.** Make them through the screens.

**Missing for browser-driven tests (an app-side decision; nothing is promised):** a browser cannot *be* a seeded person. The `E2E_AUTH_<PERSON>` headers work for HTTP
calls only; in a browser the app signs in through its own set-up (section 5.1), which needs one step at the server's console that a test cannot do. A test-only way to
enrol a browser as a seeded person, or a richer seed, would be an app-side addition (and, if it were an endpoint, would need the owner to relax ground rule 1).
**Until then, browser-driven tests of orders and invoices cannot be written against this contract.** Tests of the HTTP routes, and of the signed-out screens, can.

## 3. The seeded world

| Variable suffix | Person id | Role | Device id the header belongs to |
|---|---|---|---|
| `ADMIN` | `e2e-admin` | `account_admin` | `e2e-dev-admin` |
| `MANAGER_ANNA` | `e2e-anna` | `manager` | `e2e-dev-1` |
| `MANAGER_BEN` | `e2e-ben` | `manager` | `e2e-dev-2` |
| `VIEWER_VIC` | `e2e-vic` | `viewer` | `e2e-dev-1` |

Roles are `viewer`, `manager` and `account_admin`; there is no super admin. An `account_admin` never touches orders or invoices (every such route answers `NOT_ALLOWED`);
a `viewer` reads but does not change business records. Anna and Vic share a device; Ben has his own, so two-device behaviour can be tested.

| What | Contents |
|---|---|
| Billed parties (they pay) | `ACME` (Acme Trading), `BETA` (Beta Foods) |
| Receivers (they get the goods) | `STALL` (Chen Hawker Stall), `TEMPLE` (Lian Shan Temple). A temple only receives; it is never billed |
| Delivery orders (all submitted) | `DO-20261109-0800-A7K` (TEMPLE, billed to ACME, on the issued invoice); `DO-20261110-0830-B3M` (STALL, billed to ACME, on no invoice); `DO-20261110-0900-C9P` (STALL, billed to BETA, on the draft invoice); `DO-20261111-0715-D2X` (TEMPLE, billed to BETA, on no invoice) |
| Invoices | One issued, `INV-20261109-090000`, billed to ACME, total 18.00, holding the first order; one draft, billed to BETA, holding the third order |

Ids are text made by the app: read them from the summary file or from the server's answers, never hard-code them. The numbers above are the ones users see and are stable.
The summary file is JSON: `people` (`name`, `userId`, `displayName`, `role`, `deviceId`), `parties` (`code`, `name`, `id`, `plays`: `billed` or `receiver`),
`deliveryOrders` (`id`, `number`, `receiver` and `billed` as party codes, `invoice`: `null` or `{ status, number }`, a draft having `number: null`), `invoices`
(`id`, `number`, `status`, `billed`). A printed delivery order never shows a price, a discount, a surcharge or the billed party.

**What these runs cannot prove.** They sign in with a development-only sign-in: the header is trusted by the server. So they do not exercise real device pairing, request
signing, token rotation, revocation of a device or person, or the effect of switching a person off. Under this sign-in, switching a person off or changing their role does not
change what that person's header can do. Do not write a test that expects it to. The development sign-in exists only in a server started for tests.

## 4. HTTP routes tests may call

Every request names itself so a repeat is safe. A write (POST) sends JSON including `requestId`, `deviceId`, `appRelease` and `schemaVersion`; a read (GET) sends the same four as query
parameters. `requestId` is fresh text for each new action; **the same `requestId` with the same content returns the same answer and acts once**; with different content it answers
`REQUEST_ID_REUSED`. The `Authorization` header is the `E2E_AUTH_<PERSON>` value unchanged, and `deviceId` must be the device that header belongs to.

| Route | Method | Who | What it does |
|---|---|---|---|
| `/api/sync/pull` | GET | `manager`, `viewer` | Reads the records this role may see from the cursor `after`, at most `limit`. Answers `role`, `bundles`, `cursor`, `hasMore`. An `account_admin` gets `NOT_ALLOWED` |
| `/api/admin/users` | GET | `account_admin` | Lists the people: name, role, whether active, the devices paired. Never a token, key or hash |
| `/api/admin/users/add` | POST | `account_admin` | Adds `displayName` and `role` (`manager` or `viewer` only); the server makes the id |
| `/api/admin/users/rename` | POST | `account_admin` | Adds `userId`, `displayName` |
| `/api/admin/users/role` | POST | `account_admin` | Adds `userId`, `role` (`manager` or `viewer` only) |
| `/api/admin/users/deactivate` | POST | `account_admin` | Adds `userId`. Nobody can switch themself off; the last active `account_admin` can never be switched off |
| `/api/admin/users/reactivate` | POST | `account_admin` | Adds `userId` |
| `/healthz` | GET | anyone | Readiness, as in section 1 |

People are never deleted and there is no route to create an `account_admin`. A people change that works answers `200` with `{ ok: true, person }`; a refused one answers `{ ok: false, code }`
with `NOT_ALLOWED` (403), `NOT_FOUND` (404), `LAST_ADMIN` (409) or `INVALID` (422: an empty name, a name over 80 characters or with control characters, or an unknown role).

Every other failure answers `{ "error": { "code", "message", "incident"? } }` with a fixed plain message (never a database message or a stack); only `INTERNAL` carries an `incident` id; a malformed body is
`BAD_REQUEST`, never a 500:

| Code | HTTP | Fixed message |
|---|---|---|
| `UNAUTHENTICATED` | 401 | Please sign in again. |
| `DEVICE_UNKNOWN` | 403 | This device is not set up for this sign-in. |
| `NOT_ALLOWED` | 403 | This sign-in cannot do that. |
| `UPDATE_REQUIRED` | 426 | Please update the app to keep syncing. |
| `BAD_REQUEST` | 400 | The request could not be read. |
| `NOT_FOUND` | 404 | Not found. |
| `METHOD_NOT_ALLOWED` | 405 | That is not allowed here. |
| `PAYLOAD_TOO_LARGE` | 413 | That is too large to send. |
| `REQUEST_ID_REUSED` | 422 | This request number was already used for something else. |
| `PAIRING_CLOSED` | 409 | Pairing is not open right now. Ask your account admin to press Add device. |
| `RATE_LIMITED` | 429 | Too many tries. Please wait a moment. |
| `INTERNAL` | 500 | Something went wrong on our side. Please try again later. |
| `UNAVAILABLE` | 503 | The service is busy. Please try again shortly. |

`UNAUTHENTICATED` and `DEVICE_UNKNOWN` are deliberately vague: a test must not expect the server to say why someone is refused.

## 5. The screens: one page, found by test id

The app is one page at `/`. Moving between screens never changes the address, so a test finds its place by the root of the screen. Each screen's root is
`data-testid="screen-<name>"`: `loading`, `setup`, `picker`, `home`, `people`, `add-name`, `add-role`, `pairing`, `letterhead`, `orders`, `order`, `invoices`, `invoice`,
`invoice-edit`. The two paper views use `print-do` and `print-invoice` instead.

Find things by `data-testid`. The visible words below are promised as of this version; a change to one is added to the changelog.

### 5.1 Profile switcher and role visibility

| Screen / element | Test id | Visible text and state |
|---|---|---|
| Nobody is set up on this browser | `screen-setup` | Title "Set up PotatoFlow here"; the 2-digit number is `setup-code`; buttons `setup-try-again` ("Try again"), `setup-back` ("Go back") |
| Picker | `screen-picker` | Title "Who is using PotatoFlow?"; one tile per person: `profile-<personId>`. The account admin's tile has the extra line "Looks after PotatoFlow"; manager and viewer tiles show no role |
| "Someone new" tile | `profile-new` | "Someone new", with the hint "First ask the person who looks after PotatoFlow to tap “Add a phone or computer”". Opens `screen-setup` |
| Home (manager, viewer) | `screen-home` | Title "Hello, <name>."; `home-orders` ("Delivery orders"), `home-invoices` ("Invoices"), `switch-person` ("Switch person": back to the picker, no password) |
| People (account admin) | `screen-people` | Title "People"; `open-letterhead` ("Letterhead"), `add-person` ("Add a person"), a row `person-<personId>` per person with `add-device-<personId>` ("Add a phone or computer"), `switch-off-<personId>` / `switch-on-<personId>` |

Choosing a tile lands on **People for the account admin** and on **Home for a manager or viewer**. Person ids in test ids are the ones in the summary file.

| | account admin ("owner") | manager | viewer |
|---|---|---|---|
| Lands on | `screen-people` | `screen-home` | `screen-home` |
| People, Letterhead | yes | no | no |
| Orders and invoices screens | **none**: no way to reach them | yes | yes, read only |
| `orders-new`, `orders-edit`, `orders-void`, `orders-draft` | n/a | present | **absent**; `orders-view-only` is shown ("You can look at orders and print them, but not change them.") |
| `print-edit` on an order's paper view | n/a | present | **absent** |
| `invoice-issue`, `invoice-edit`, `invoice-mark-paid`, `invoice-void`, `invoice-discard-draft` | n/a | present when the invoice's state allows | **absent**; `invoices-view-only` shows on the list and `invoice-view-only` on a review |
| `invoice-print` | n/a | present | present |

This describes what the screens show for each role. It is not proof of what the server enforces; the HTTP routes are the check for that.

### 5.2 Orders list and the order's paper view

`home-orders` opens `screen-orders` (title "Delivery orders"): `orders-search`, `orders-new` ("New order", manager only), `orders-none` ("There are no orders yet." or "No order matches that."), and one
**`orders-item`** per order, newest first. Inside it: the order's number; "<date> · To <receiver>"; "Ordered by <billed party>"; any `orders-hint` lines ("Voided", "On an invoice", "Changed since it was printed",
"Not printed yet"); then the buttons, in this order:

| Button | Test id | Rule |
|---|---|---|
| **View or print** | `orders-print` | First and primary. Opens the paper view |
| **Edit order** | `orders-edit` | Manager only, and only on an order that is not voided. See the table below |
| Void order | `orders-void` | Manager only, and only on an order that is not voided. Asks once (confirm "Void this order" or "Keep the order") |

**Edit order, by the state of the order:**

| State of the order | `orders-edit` | `orders-edit-blocked` (a sentence under the card) | `print-edit` on the paper view |
|---|---|---|---|
| Not on any invoice | present, **enabled** | absent | present, enabled |
| On a **draft** invoice | present, **enabled** | absent | present, enabled |
| On an **issued** or **paid** invoice | present, **disabled** | "This order is on an invoice that has been issued. To change it, open that invoice and press Edit invoice." | present, **disabled**, with `print-edit-blocked` showing the same sentence |
| **Voided** | **absent** (the hint "Voided" shows) | absent | present, **disabled**, with `print-edit-blocked`: "This order was voided, so it cannot be changed." |

Pressing an enabled Edit order opens `screen-order` with the title "Edit this order". An order's state is read when the screen opens, so after something changes it (a sync, an invoice being issued) leave the screen and open it again.

**Paper view** (`print-do`; opened by `orders-print`, and after an order is submitted): heading "Print the delivery order"; `print-button` ("Print"; disabled, with `print-notice`, while there is no letterhead); `print-edit` ("Edit order",
managers only) and `print-edit-blocked`; `print-voided` on a voided order; `print-back` ("Go back", to the list). The sheet is `customer-copy` with `customer-copy-label` ("Customer Copy"), `paper-meta`, `paper-delivery-to`,
`paper-ordered-by`, `paper-delivery`, `paper-items` and `received-by` ("Received By (Signature / Company Stamp)"). **It never shows a price.** The page title is the file name the browser offers:
`<order number>_<receiver name>` (lower case, spaces as hyphens).

### 5.3 Invoices list, review and the paper view

`home-invoices` opens `screen-invoices` (title "Invoices"): `invoices-search`, `invoices-none`, and one **`invoices-item`** per invoice, drafts first then the newest. Inside it the button `invoices-open` holds:

| Line | Test id | Text |
|---|---|---|
| 1 | | The invoice number, or "Draft for <name>", or "Changes for <name>" (a draft that replaces an issued invoice) |
| 2 | `invoices-party` | **"<name> · <code>"**, for example `Alan Tan · ALT`. Two customers with the same name differ by this code (`Alan Tan · ALT`, `Alan Tan · ALT2`). The code is left out only if the customer has none |
| 3 | | "<from> to <to> · <n> order(s) · $<total>" |
| notes | `invoices-note` | "Draft", "Issued", "Paid", "Voided", "Replaced by <number>", "Edit in progress", "Changes to <number>" |

**Navigation.** `invoices-open` opens the review (`screen-invoice`: `invoice-for`, `invoice-status`, one `invoice-order` per order with `invoice-line`s, `invoice-total`). **`invoice-print` ("View or print invoice") is the first and
primary button there**, above the orders, present when the invoice has orders and is a draft, issued or paid. It opens the paper view (`print-invoice`), whose `print-back` returns to the review; the review's `invoice-back`
returns to the list. The manager's other review buttons are `invoice-issue`, `invoice-discard-draft`, `invoice-edit`, `invoice-mark-paid`, `invoice-void`; the ones that need an internet connection are disabled with
"Needs internet. Your work is saved." when offline.

**Invoice paper view** (`print-invoice`): `invoice-paper` with `invoice-paper-heading`, `invoice-paper-meta`, `invoice-paper-bill-to`, one `invoice-paper-order` per order, `invoice-paper-total`, and where they apply
`invoice-paper-draft` (the DRAFT tag), `invoice-paper-paid` and `invoice-paper-replaces` ("Replaces <number>"). Also `print-button`, `print-notice` (no letterhead), `print-draft-note` (on a draft) and `print-back`. The page title
is the file name offered to the browser:

| Invoice | Page title |
|---|---|
| Draft | `DRAFT-<party>-<code>-<yyyy-mm>`, for example `DRAFT-alan-tan-alt-2026-11` (the code and the billing month tell two drafts apart) |
| Issued or paid | `<invoice number>_<party>` |

### 5.4 Known limits (do not assert these)

- The **order cards do not show the customer's code**: two same-name customers read alike on the Orders list. Only the Invoices list is disambiguated.
- A list reads the browser's own copy when it opens and **does not refresh** when a sync lands. After pairing, or after the server makes draft invoices, leave the screen and open it again.
- Signing in on a browser works only through the set-up flow: `screen-setup`, then the admin taps the matching number on `screen-pairing` (test ids `pairing-waiting`, `choice-<number>`, `choice-none`, `pairing-ok`). Section 2 says what is missing for a test to do that.

## Changelog

- **2026-11-22 (additive):** first published copy in this repository. Start-up and readiness; what exists to seed and reset; the screen and test-id surface for sign-in, role visibility, orders (Edit order and its lock reasons, "View or print"), invoices (`Name · code` rows, the primary "View or print invoice", draft file names).
