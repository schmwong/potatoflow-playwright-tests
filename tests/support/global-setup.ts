import { appRelease, baseUrl, requireEnv, schemaVersion } from './env';

/**
 * Runs once before the tests (not for --list). Fails with a plain sentence, never a stack of detail:
 *  - the harness variables are all there (contract section 1),
 *  - the address is on this machine (ground rule 6: never point a test at production),
 *  - GET /healthz answers 200 { "status": "ok" } (the ready signal).
 */
export default async function globalSetup(): Promise<void> {
  const base = baseUrl();
  appRelease();
  schemaVersion();
  requireEnv('E2E_SEED_SUMMARY');

  const host = new URL(base).hostname;
  if (!['127.0.0.1', 'localhost', '[::1]', '::1'].includes(host)) {
    throw new Error('E2E_BASE_URL is not a loopback address. Tests only run against a throw-away local run.');
  }

  const deadline = Date.now() + 30_000;
  for (;;) {
    try {
      const res = await fetch(`${base}/healthz`);
      if (res.status === 200 && (await res.json())?.status === 'ok') return;
    } catch {
      // not up yet
    }
    if (Date.now() > deadline) throw new Error('The run did not become ready: /healthz never answered ok.');
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}
