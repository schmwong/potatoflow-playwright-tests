import { randomUUID } from 'node:crypto';
import { expect, type APIRequestContext, type APIResponse } from '@playwright/test';
import { appRelease, schemaVersion } from './env';
import { authHeader, type Person } from './people';

/**
 * Helpers for the HTTP routes (contract section 4). Responses are never printed: assertions below
 * compare statuses, codes and booleans only, because this repository is public (ground rule 4).
 */

export const freshRequestId = (): string => `e2e-${randomUUID()}`;

interface CallOptions {
  /** Whose header to send. Omit to send no Authorization header at all. */
  as?: Person;
  /** Send this exact Authorization value instead of the person's. */
  rawAuthorization?: string;
  /** The device named in the request. Defaults to the person's own device. */
  deviceId?: string;
  requestId?: string;
}

function headers(opts: CallOptions): Record<string, string> {
  if (opts.rawAuthorization !== undefined) return { Authorization: opts.rawAuthorization };
  if (opts.as) return { Authorization: authHeader(opts.as) };
  return {};
}

function identity(opts: CallOptions) {
  return {
    requestId: opts.requestId ?? freshRequestId(),
    deviceId: opts.deviceId ?? opts.as?.deviceId ?? 'e2e-dev-none',
    appRelease: appRelease(),
    schemaVersion: schemaVersion(),
  };
}

/** A read: the four identifying fields travel as query parameters. */
export function apiGet(
  request: APIRequestContext,
  route: string,
  opts: CallOptions & { params?: Record<string, string | number> } = {},
): Promise<APIResponse> {
  return request.get(route, {
    headers: headers(opts),
    params: { ...identity(opts), ...(opts.params ?? {}) },
  });
}

/** A write: JSON with the four identifying fields beside the route's own fields. */
export function apiPost(
  request: APIRequestContext,
  route: string,
  body: Record<string, unknown>,
  opts: CallOptions = {},
): Promise<APIResponse> {
  return request.post(route, {
    headers: headers(opts),
    data: { ...identity(opts), ...body },
  });
}

/** A write whose body is not JSON, to check that it is refused plainly. */
export function apiPostRaw(
  request: APIRequestContext,
  route: string,
  rawBody: string,
  opts: CallOptions = {},
): Promise<APIResponse> {
  return request.post(route, {
    headers: { ...headers(opts), 'Content-Type': 'application/json' },
    data: rawBody,
  });
}

// ---- Error vocabulary (contract section 4) -------------------------------------------------------

export const ERRORS = {
  UNAUTHENTICATED: { status: 401, message: 'Please sign in again.' },
  DEVICE_UNKNOWN: { status: 403, message: 'This device is not set up for this sign-in.' },
  NOT_ALLOWED: { status: 403, message: 'This sign-in cannot do that.' },
  BAD_REQUEST: { status: 400, message: 'The request could not be read.' },
  NOT_FOUND: { status: 404, message: 'Not found.' },
  METHOD_NOT_ALLOWED: { status: 405, message: 'That is not allowed here.' },
  REQUEST_ID_REUSED: { status: 422, message: 'This request number was already used for something else.' },
} as const;

export type ErrorCode = keyof typeof ERRORS;

export async function readJson(res: APIResponse): Promise<Record<string, any>> {
  const text = await res.text();
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/** The error code of a refusal, in either documented shape: { error: { code } } or { ok: false, code }. */
export function errorCodeOf(body: Record<string, any>): string | undefined {
  return body?.error?.code ?? body?.code;
}

/** Ground rule 5: a plain message, never a code, table name or stack trace in the words. */
export function looksTechnical(text: string): boolean {
  return /\b(stack|SQLITE|SQL|Traceback|TypeError|ReferenceError)\b|\bat \S+ \(.*:\d+:\d+\)/i.test(text);
}

/** Assert a refusal with a documented code, status and fixed message (statuses and strings only are shown). */
export async function expectError(res: APIResponse, code: ErrorCode): Promise<void> {
  const body = await readJson(res);
  expect(res.status(), `status for ${code}`).toBe(ERRORS[code].status);
  expect(errorCodeOf(body), 'error code').toBe(code);
  const message = body?.error?.message;
  if (message !== undefined) expect(message, 'fixed message').toBe(ERRORS[code].message);
  expect(looksTechnical(JSON.stringify(body)), 'no technical wording in the answer').toBe(false);
}

/**
 * UNAUTHENTICATED and DEVICE_UNKNOWN are deliberately vague: a test must not expect the server to say
 * which one it is (contract section 4). Assert only that the person was turned away by one of them.
 */
export async function expectTurnedAway(res: APIResponse): Promise<void> {
  const body = await readJson(res);
  const code = errorCodeOf(body);
  expect(['UNAUTHENTICATED', 'DEVICE_UNKNOWN'], 'turned-away code').toContain(code);
  expect(res.status(), 'status').toBe(ERRORS[code as 'UNAUTHENTICATED' | 'DEVICE_UNKNOWN'].status);
}
