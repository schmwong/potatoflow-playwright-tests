import { readFileSync } from 'node:fs';
import { requireEnv } from './env';

/**
 * The seed summary (contract section 3): a small JSON file named by E2E_SEED_SUMMARY. Read it, never
 * write it, and never hard-code the ids inside it.
 */
export interface SeedSummary {
  people: { name: string; userId: string; displayName: string; role: string; deviceId: string }[];
  parties: { code: string; name: string; id: string; plays: 'billed' | 'receiver' }[];
  deliveryOrders: {
    id: string;
    number: string;
    receiver: string;
    billed: string;
    invoice: null | { status: string; number: string | null };
  }[];
  invoices: { id: string; number: string; status: string; billed: string }[];
}

let cached: SeedSummary | undefined;

export function readSeedSummary(): SeedSummary {
  cached ??= JSON.parse(readFileSync(requireEnv('E2E_SEED_SUMMARY'), 'utf8')) as SeedSummary;
  return cached;
}
