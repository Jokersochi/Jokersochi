import { test, expect } from '@playwright/test';

test('has title and meta description', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/.+/);
  const desc = await page.locator('meta[name="description"]').getAttribute('content');
  expect(desc).not.toBeNull();
});
