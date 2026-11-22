import type { Locator, Page } from '@playwright/test';

/**
 * Screens and elements are found by data-testid (contract section 5). The app is one page at "/": a
 * test finds its place by the root of the screen, never by the address.
 */
export const byTestId = (page: Page, id: string): Locator => page.getByTestId(id);

export type ScreenName =
  | 'loading' | 'setup' | 'picker' | 'home' | 'people' | 'add-name' | 'add-role' | 'pairing'
  | 'letterhead' | 'orders' | 'order' | 'invoices' | 'invoice' | 'invoice-edit';

export const screen = (page: Page, name: ScreenName | 'print-do' | 'print-invoice'): Locator =>
  page.getByTestId(name.startsWith('print-') ? name : `screen-${name}`);
