import { expect, test, type Page } from '@playwright/test';
import { looksTechnical } from './support/api';
import { byTestId, screen } from './support/screens';

/**
 * Browser smoke suite for a fresh browser in a contract run (docs/contract/e2e-contract.md,
 * sections 2 and 5.1).
 *
 * A contract run has no pairing step, so a browser with no stored data opens on the set-up screen and
 * stays there. The contract lets a test assert exactly three things about it: `screen-setup`,
 * `setup-problem` and `setup-try-again`. Nothing past them is asserted: not the problem sentence's
 * words (they may change), not `setup-code`, `setup-back`, the picker or its tiles, and nothing is
 * signed in. Orders and invoices cannot be driven from a browser yet (section 2, "Missing").
 */

async function openFreshBrowser(page: Page): Promise<void> {
  await page.goto('/');
  await expect(screen(page, 'setup')).toBeVisible();
}

test.describe('Fresh browser in a contract run', { tag: '@smoke' }, () => {
  test('opens at "/" on the set-up screen', async ({ page }) => {
    await openFreshBrowser(page);
    expect(new URL(page.url()).pathname, 'moving between screens keeps the address').toBe('/');
    await expect(screen(page, 'setup')).toContainText('Set up PotatoFlow here');
  });

  test('set-up screen gives a plain problem sentence and an enabled "Try again"', async ({ page }) => {
    await openFreshBrowser(page);
    // Present, with some words in it. The words themselves are not asserted (section 5.4).
    await expect(byTestId(page, 'setup-problem')).toBeVisible();
    await expect(byTestId(page, 'setup-problem')).not.toHaveText(/^\s*$/);
    await expect(byTestId(page, 'setup-try-again')).toContainText('Try again');
    await expect(byTestId(page, 'setup-try-again')).toBeEnabled();
  });

  test('"Try again" gives the same result', async ({ page }) => {
    await openFreshBrowser(page);
    await byTestId(page, 'setup-try-again').click();
    await expect(screen(page, 'setup')).toBeVisible();
    await expect(byTestId(page, 'setup-problem')).toBeVisible();
    await expect(byTestId(page, 'setup-try-again')).toBeEnabled();
    expect(new URL(page.url()).pathname).toBe('/');
  });

  test('the screen speaks plainly: no error code, table name or stack trace', async ({ page }) => {
    await openFreshBrowser(page);
    await expect(byTestId(page, 'setup-problem')).toBeVisible();
    const text = await page.locator('body').innerText();
    expect(looksTechnical(text), 'technical wording on screen').toBe(false);
    expect(/\b[A-Z]{3,}(_[A-Z]+)+\b/.test(text), 'an error-code-looking word on screen').toBe(false);
  });
});
