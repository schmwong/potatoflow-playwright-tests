import { requireEnv } from './env';

/**
 * The seeded people (contract section 3). `suffix` is the end of the E2E_AUTH_<PERSON> variable, which
 * holds a ready-made Authorization header value to be used unchanged.
 */
export type Role = 'viewer' | 'manager' | 'account_admin';

export interface Person {
  key: 'admin' | 'anna' | 'ben' | 'vic';
  suffix: string;
  personId: string;
  role: Role;
  /** The device the header belongs to; requests must name it. */
  deviceId: string;
}

export const PEOPLE = {
  admin: { key: 'admin', suffix: 'ADMIN', personId: 'e2e-admin', role: 'account_admin', deviceId: 'e2e-dev-admin' },
  anna: { key: 'anna', suffix: 'MANAGER_ANNA', personId: 'e2e-anna', role: 'manager', deviceId: 'e2e-dev-1' },
  ben: { key: 'ben', suffix: 'MANAGER_BEN', personId: 'e2e-ben', role: 'manager', deviceId: 'e2e-dev-2' },
  vic: { key: 'vic', suffix: 'VIEWER_VIC', personId: 'e2e-vic', role: 'viewer', deviceId: 'e2e-dev-1' },
} as const satisfies Record<string, Person>;

/** The Authorization header value for a person, unchanged. */
export function authHeader(person: Person): string {
  return requireEnv(`E2E_AUTH_${person.suffix}`);
}
