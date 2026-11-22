import { expect, test, type APIRequestContext, type APIResponse } from '@playwright/test';
import {
  apiGet, apiPost, apiPostRaw, expectError, expectTurnedAway, freshRequestId, readJson, errorCodeOf,
} from './support/api';
import { PEOPLE } from './support/people';
import { readSeedSummary } from './support/seed';

/**
 * HTTP contract suite (docs/contract/e2e-contract.md, sections 3 and 4). It never prints a response
 * body: assertions compare statuses, codes and booleans, because this repository is public.
 *
 * The contract has no HTTP route that writes orders or invoices, so the order and invoice rules are
 * checked here only as far as the contract exposes them: the seed summary, and what `sync/pull`
 * returns for each role. The Edit-order lock is a screen rule (section 5.2) and waits for a browser
 * sign-in (section 2, "Missing").
 */

const PULL = '/api/sync/pull';
const USERS = '/api/admin/users';

type Who = typeof PEOPLE[keyof typeof PEOPLE];

/** Both `after` and `limit` are required; `after=0` reads from the start (section 4). */
const FIRST_PAGE = { after: 0, limit: 500 } as const;

const pull = (
  request: APIRequestContext,
  as: Who,
  params: Record<string, string | number>,
  deviceId?: string,
): Promise<APIResponse> => apiGet(request, PULL, { as, deviceId, params });

/** Pull every page for a person, from `after=0` to the end (bounded). */
async function pullAll(request: APIRequestContext, as: Who): Promise<Record<string, any>[]> {
  const pages: Record<string, any>[] = [];
  let after = 0;
  for (let i = 0; i < 50; i += 1) {
    const res = await pull(request, as, { after, limit: 500 });
    expect(res.status(), 'pull status').toBe(200);
    const body = await readJson(res);
    pages.push(body);
    if (body.hasMore !== true) return pages;
    expect(Number.isInteger(body.cursor), 'cursor to continue from').toBe(true);
    after = body.cursor;
  }
  throw new Error('pull never finished within 50 pages');
}

/** The id field of a person is `userId`, never `id` (section 4). */
function expectPersonShape(person: Record<string, any> | undefined): void {
  expect(person, 'a person comes back').toBeDefined();
  expect(typeof person?.userId, 'person.userId is text').toBe('string');
  expect(person?.userId, 'person.userId is not empty').toBeTruthy();
  expect(person && 'id' in person, 'person has no id field').toBe(false);
}

test.describe('Readiness', { tag: ['@api', '@smoke'] }, () => {
  test('GET /healthz answers 200 with status ok, without signing in', async ({ request }) => {
    const res = await request.get('/healthz');
    expect(res.status()).toBe(200);
    expect((await readJson(res)).status).toBe('ok');
  });
});

test.describe('Seeded world (summary file)', { tag: '@api' }, () => {
  test('the four documented people, with their roles and devices', () => {
    const { people } = readSeedSummary();
    for (const p of Object.values(PEOPLE)) {
      const seeded = people.find((s) => s.userId === p.personId);
      expect(seeded, `${p.personId} is seeded`).toBeDefined();
      expect(seeded?.role, `${p.personId} role (lower case)`).toBe(p.role);
      expect(seeded?.deviceId, `${p.personId} device`).toBe(p.deviceId);
    }
  });

  test('parties: two billed, two receivers, and a temple is never billed', () => {
    const { parties, deliveryOrders } = readSeedSummary();
    const plays = (code: string) => parties.find((p) => p.code === code)?.plays;
    expect([plays('ACME'), plays('BETA')]).toEqual(['billed', 'billed']);
    expect([plays('STALL'), plays('TEMPLE')]).toEqual(['receiver', 'receiver']);
    expect(deliveryOrders.some((o) => o.billed === 'TEMPLE')).toBe(false);
  });

  test('delivery orders: who receives, who pays and which invoice holds each', () => {
    const { deliveryOrders } = readSeedSummary();
    const order = (number: string) => deliveryOrders.find((o) => o.number === number);

    // Invoice statuses are upper case in the summary: ISSUED or DRAFT (section 3, "Case matters").
    const issued = order('DO-20261109-0800-A7K');
    expect([issued?.receiver, issued?.billed]).toEqual(['TEMPLE', 'ACME']);
    expect(issued?.invoice?.status).toBe('ISSUED');
    expect(issued?.invoice?.number).toBe('INV-20261109-090000');

    const unbilledStall = order('DO-20261110-0830-B3M');
    expect([unbilledStall?.receiver, unbilledStall?.billed, unbilledStall?.invoice]).toEqual(['STALL', 'ACME', null]);

    const onDraft = order('DO-20261110-0900-C9P');
    expect([onDraft?.receiver, onDraft?.billed]).toEqual(['STALL', 'BETA']);
    expect(onDraft?.invoice?.status).toBe('DRAFT');
    expect(onDraft?.invoice?.number).toBeNull(); // a draft has no number yet

    const unbilledTemple = order('DO-20261111-0715-D2X');
    expect([unbilledTemple?.receiver, unbilledTemple?.billed, unbilledTemple?.invoice]).toEqual(['TEMPLE', 'BETA', null]);
  });

  test('invoices: one ISSUED (billed to ACME) and one DRAFT (billed to BETA)', () => {
    const { invoices } = readSeedSummary();
    const issued = invoices.filter((i) => i.status === 'ISSUED');
    const drafts = invoices.filter((i) => i.status === 'DRAFT');
    expect(issued.map((i) => [i.number, i.billed])).toEqual([['INV-20261109-090000', 'ACME']]);
    expect(drafts.map((i) => i.billed)).toEqual(['BETA']);
    expect(invoices.length, 'no other invoices').toBe(2);
  });
});

test.describe('Sign-in is refused plainly', { tag: '@api' }, () => {
  test('no Authorization header', async ({ request }) => {
    await expectTurnedAway(await apiGet(request, PULL, { deviceId: PEOPLE.anna.deviceId, params: FIRST_PAGE }));
  });

  test('an Authorization value nobody was given', async ({ request }) => {
    await expectTurnedAway(
      await apiGet(request, PULL, {
        rawAuthorization: 'e2e-not-a-real-credential',
        deviceId: PEOPLE.anna.deviceId,
        params: FIRST_PAGE,
      }),
    );
  });

  test("one person's header from another person's device, on a well-formed request", async ({ request }) => {
    // Ben's device is e2e-dev-2; Anna's header belongs to e2e-dev-1. The request must be well formed:
    // a malformed one answers BAD_REQUEST first (section 4, "The order of the checks").
    await expectTurnedAway(await pull(request, PEOPLE.anna, FIRST_PAGE, PEOPLE.ben.deviceId));
  });
});

test.describe('sync/pull: the query is required', { tag: '@api' }, () => {
  test('after=0 reads from the start', async ({ request }) => {
    const res = await pull(request, PEOPLE.anna, { after: 0, limit: 500 });
    expect(res.status()).toBe(200);
  });

  const bad: [string, Record<string, string | number>][] = [
    ['without after (only limit is not a valid first request)', { limit: 500 }],
    ['without limit', { after: 0 }],
    ['without either', {}],
    ['limit=0', { after: 0, limit: 0 }],
    ['a negative limit', { after: 0, limit: -1 }],
    ['a negative after', { after: -1, limit: 500 }],
    ['a non-numeric after', { after: 'abc', limit: 500 }],
    ['a non-numeric limit', { after: 0, limit: 'abc' }],
  ];
  for (const [label, params] of bad) {
    test(`${label} is BAD_REQUEST`, async ({ request }) => {
      await expectError(await pull(request, PEOPLE.anna, params), 'BAD_REQUEST');
    });
  }

  test('a viewer gets the same BAD_REQUEST for a missing after', async ({ request }) => {
    await expectError(await pull(request, PEOPLE.vic, { limit: 500 }), 'BAD_REQUEST');
  });

  test('the order of the checks: role first, so an admin is NOT_ALLOWED even with a malformed query', async ({ request }) => {
    await expectError(await pull(request, PEOPLE.admin, {}), 'NOT_ALLOWED');
  });

  test('the order of the checks: shape before device, so a foreign device with a malformed query is BAD_REQUEST', async ({ request }) => {
    await expectError(await pull(request, PEOPLE.anna, { limit: 500 }, PEOPLE.ben.deviceId), 'BAD_REQUEST');
  });
});

test.describe('sync/pull by role', { tag: '@api' }, () => {
  for (const who of [PEOPLE.anna, PEOPLE.ben, PEOPLE.vic]) {
    test(`${who.personId} (${who.role}) reads, and is told the role`, async ({ request }) => {
      const res = await pull(request, who, FIRST_PAGE);
      expect(res.status()).toBe(200);
      const body = await readJson(res);
      expect(body.role).toBe(who.role);
      expect(Array.isArray(body.bundles), 'bundles is a list').toBe(true);
      expect(Number.isInteger(body.cursor), 'cursor is a whole number').toBe(true);
      expect(typeof body.hasMore, 'hasMore is a flag').toBe('boolean');
      expect(body.serverTime, 'serverTime comes back').toBeDefined();
      expect(body.minAppRelease, 'minAppRelease comes back').toBeDefined();
    });
  }

  test('the account admin never reads orders or invoices', async ({ request }) => {
    await expectError(await pull(request, PEOPLE.admin, FIRST_PAGE), 'NOT_ALLOWED');
  });

  test('limit caps the page, and the cursor continues from there', async ({ request }) => {
    const first = await pull(request, PEOPLE.anna, { after: 0, limit: 1 });
    expect(first.status()).toBe(200);
    const firstBody = await readJson(first);
    expect(firstBody.bundles.length).toBeLessThanOrEqual(1);
    expect(Number.isInteger(firstBody.cursor), 'cursor is a whole number').toBe(true);

    const next = await pull(request, PEOPLE.anna, { after: firstBody.cursor, limit: 1 });
    expect(next.status()).toBe(200);
  });

  // Section 4: reading from after=0 to the end, the number of every seeded order and of the issued
  // invoice appears as text inside bundles. The shape of a bundle is not the contract: look for text.
  for (const who of [PEOPLE.anna, PEOPLE.vic]) {
    test(`${who.personId} can read the seeded orders and the issued invoice`, async ({ request }) => {
      const pages = await pullAll(request, who);
      const text = JSON.stringify(pages.map((p) => p.bundles));
      const { deliveryOrders, invoices } = readSeedSummary();
      for (const o of deliveryOrders) {
        expect(text.includes(o.number), `order ${o.number} is in what ${who.personId} reads`).toBe(true);
      }
      for (const i of invoices.filter((x) => x.status === 'ISSUED')) {
        expect(text.includes(String(i.number)), `invoice ${i.number} is in what ${who.personId} reads`).toBe(true);
      }
    });
  }
});

test.describe('People routes: who may call them', { tag: '@api' }, () => {
  for (const who of [PEOPLE.anna, PEOPLE.vic]) {
    test(`${who.personId} (${who.role}) cannot list people`, async ({ request }) => {
      await expectError(await apiGet(request, USERS, { as: who }), 'NOT_ALLOWED');
    });

    test(`${who.personId} (${who.role}) cannot add a person`, async ({ request }) => {
      await expectError(
        await apiPost(request, `${USERS}/add`, { displayName: 'E2E Not Allowed', role: 'viewer' }, { as: who }),
        'NOT_ALLOWED',
      );
    });
  }

  test('the account admin lists the seeded people as { people }, with userId and no token, key or hash', async ({ request }) => {
    const res = await apiGet(request, USERS, { as: PEOPLE.admin });
    expect(res.status()).toBe(200);
    const body = await readJson(res);
    expect(Array.isArray(body.people), 'people is a list').toBe(true);

    const rows: Record<string, any>[] = body.people;
    for (const p of readSeedSummary().people) {
      const row = rows.find((r) => r.userId === p.userId);
      expect(row, `${p.userId} is listed`).toBeDefined();
      expect(row?.displayName, `${p.userId} displayName`).toBe(p.displayName);
      expect(row?.role, `${p.userId} role`).toBe(p.role);
      expect(typeof row?.active, `${p.userId} active is a flag`).toBe('boolean');
    }
    for (const row of rows) expect('id' in row, 'a row has no id field (it is userId)').toBe(false);

    const names: string[] = [];
    const walk = (value: unknown): void => {
      if (Array.isArray(value)) value.forEach(walk);
      else if (value && typeof value === 'object') {
        for (const [k, v] of Object.entries(value)) { names.push(k); walk(v); }
      }
    };
    walk(body);
    expect(names.filter((n) => /token|secret|hash|key/i.test(n)).length, 'secret-looking field names').toBe(0);
  });
});

test.describe('People routes: changing people', { tag: '@api' }, () => {
  const stamp = Date.now();
  const name = `E2E Tester ${stamp}`;
  const renamed = `E2E Renamed ${stamp}`;

  test.describe.serial('one person through their life', () => {
    let userId: string | undefined;

    test('add: a manager or viewer, with a userId the server makes', async ({ request }) => {
      const res = await apiPost(request, `${USERS}/add`, { displayName: name, role: 'viewer' }, { as: PEOPLE.admin });
      expect(res.status()).toBe(200);
      const body = await readJson(res);
      expect(body.ok).toBe(true);
      expectPersonShape(body.person);
      expect(body.person.displayName).toBe(name);
      expect(body.person.role).toBe('viewer');
      expect(body.person.active).toBe(true);
      userId = body.person.userId;
    });

    test('the new person is in the list, by userId', async ({ request }) => {
      test.skip(!userId, 'no person was added');
      const body = await readJson(await apiGet(request, USERS, { as: PEOPLE.admin }));
      expect((body.people as Record<string, any>[]).some((r) => r.userId === userId)).toBe(true);
    });

    test('rename', async ({ request }) => {
      test.skip(!userId, 'no person was added');
      const res = await apiPost(request, `${USERS}/rename`, { userId, displayName: renamed }, { as: PEOPLE.admin });
      expect(res.status()).toBe(200);
      const body = await readJson(res);
      expect(body.ok).toBe(true);
      expectPersonShape(body.person);
      expect(body.person.userId).toBe(userId);
      expect(body.person.displayName).toBe(renamed);
    });

    test('change role to manager', async ({ request }) => {
      test.skip(!userId, 'no person was added');
      const res = await apiPost(request, `${USERS}/role`, { userId, role: 'manager' }, { as: PEOPLE.admin });
      expect(res.status()).toBe(200);
      const body = await readJson(res);
      expect(body.ok).toBe(true);
      expectPersonShape(body.person);
      expect(body.person.userId).toBe(userId);
      expect(body.person.role).toBe('manager');
    });

    test('switch off, then on again', async ({ request }) => {
      test.skip(!userId, 'no person was added');
      const off = await apiPost(request, `${USERS}/deactivate`, { userId }, { as: PEOPLE.admin });
      expect(off.status()).toBe(200);
      const offBody = await readJson(off);
      expect(offBody.ok).toBe(true);
      expectPersonShape(offBody.person);
      expect(offBody.person.userId).toBe(userId);
      expect(offBody.person.active).toBe(false);

      const on = await apiPost(request, `${USERS}/reactivate`, { userId }, { as: PEOPLE.admin });
      expect(on.status()).toBe(200);
      const onBody = await readJson(on);
      expect(onBody.ok).toBe(true);
      expect(onBody.person.userId).toBe(userId);
      expect(onBody.person.active).toBe(true);
    });
  });

  test('the same requestId and content acts once and gives the same answer', async ({ request }) => {
    const requestId = freshRequestId();
    const once = `E2E Once ${stamp}`;
    const first = await apiPost(request, `${USERS}/add`, { displayName: once, role: 'viewer' }, { as: PEOPLE.admin, requestId });
    const second = await apiPost(request, `${USERS}/add`, { displayName: once, role: 'viewer' }, { as: PEOPLE.admin, requestId });
    expect([first.status(), second.status()]).toEqual([200, 200]);
    const a = await readJson(first);
    const b = await readJson(second);
    expectPersonShape(a.person);
    expect(b.person?.userId, 'the repeat names the same person').toBe(a.person.userId);

    const list = await readJson(await apiGet(request, USERS, { as: PEOPLE.admin }));
    const times = (list.people as Record<string, any>[]).filter((r) => r.displayName === once).length;
    expect(times, 'times the name is listed').toBe(1);
  });

  test('the same requestId with different content is refused', async ({ request }) => {
    const requestId = freshRequestId();
    await apiPost(request, `${USERS}/add`, { displayName: `E2E First ${stamp}`, role: 'viewer' }, { as: PEOPLE.admin, requestId });
    const other = await apiPost(request, `${USERS}/add`, { displayName: `E2E Second ${stamp}`, role: 'viewer' }, { as: PEOPLE.admin, requestId });
    await expectError(other, 'REQUEST_ID_REUSED');
  });

  test('rename someone who does not exist', async ({ request }) => {
    await expectError(
      await apiPost(request, `${USERS}/rename`, { userId: 'e2e-no-such-person', displayName: 'Nobody' }, { as: PEOPLE.admin }),
      'NOT_FOUND',
    );
  });

  const invalidName: [string, string][] = [
    ['an empty name', ''],
    ['a name over 80 characters', 'N'.repeat(81)],
    ['a name with a control character', 'Bad\u0007Name'],
  ];
  for (const [label, displayName] of invalidName) {
    test(`add with ${label} is INVALID`, async ({ request }) => {
      const res = await apiPost(request, `${USERS}/add`, { displayName, role: 'viewer' }, { as: PEOPLE.admin });
      await expectInvalid(res);
    });
  }

  test('add with an unknown role is INVALID', async ({ request }) => {
    await expectInvalid(await apiPost(request, `${USERS}/add`, { displayName: `E2E Role ${stamp}`, role: 'superuser' }, { as: PEOPLE.admin }));
  });

  test('nobody can switch themself off, and the last admin is never switched off', async ({ request }) => {
    const adminId = readSeedSummary().people.find((p) => p.role === 'account_admin')?.userId;
    expect(adminId, 'the seeded admin id').toBeTruthy();
    const res = await apiPost(request, `${USERS}/deactivate`, { userId: adminId }, { as: PEOPLE.admin });
    const body = await readJson(res);
    expect(body.ok).toBe(false);
    expect([403, 409], 'status').toContain(res.status());
    expect(['NOT_ALLOWED', 'LAST_ADMIN'], 'code').toContain(errorCodeOf(body));
  });
});

test.describe('Errors are plain', { tag: '@api' }, () => {
  test('a body that is not JSON is BAD_REQUEST, never a 500', async ({ request }) => {
    await expectError(await apiPostRaw(request, `${USERS}/add`, '{ this is not json', { as: PEOPLE.admin }), 'BAD_REQUEST');
  });

  test('a read on a write route is METHOD_NOT_ALLOWED', async ({ request }) => {
    await expectError(await apiGet(request, `${USERS}/add`, { as: PEOPLE.admin }), 'METHOD_NOT_ALLOWED');
  });
});

/** INVALID is a people-change refusal: 422 with { ok: false, code: 'INVALID' } (contract section 4). */
async function expectInvalid(res: APIResponse): Promise<void> {
  const body = await readJson(res);
  expect(res.status(), 'status').toBe(422);
  expect(body.ok).toBe(false);
  expect(errorCodeOf(body)).toBe('INVALID');
}
