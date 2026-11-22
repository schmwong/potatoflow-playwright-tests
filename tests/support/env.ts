/** Variables set by the run harness (contract section 1). Read them; never default or invent them. */

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Start a run with "npm run e2e:serve -- <test command>" in the application ` +
        'repository (see docs/contract/e2e-contract.md, section 1).',
    );
  }
  return value;
}

export const baseUrl = (): string => requireEnv('E2E_BASE_URL').replace(/\/+$/, '');
export const appRelease = (): string => requireEnv('E2E_APP_RELEASE');
export const schemaVersion = (): string => requireEnv('E2E_SCHEMA_VERSION');
