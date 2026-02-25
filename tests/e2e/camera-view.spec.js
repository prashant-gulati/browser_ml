import { test, expect } from '@playwright/test';

test.describe('Camera view', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('clicking mediapipe card hides the picker', async ({ page }) => {
    await page.locator('.card[data-backend="mediapipe"]').click();
    await expect(page.locator('#picker')).toBeHidden();
  });

  test('clicking mediapipe card shows the container', async ({ page }) => {
    await page.locator('.card[data-backend="mediapipe"]').click();
    await expect(page.locator('#container')).toBeVisible();
  });

  test('clicking mediapipe card shows status', async ({ page }) => {
    await page.locator('.card[data-backend="mediapipe"]').click();
    await expect(page.locator('#status')).toBeVisible();
  });

  test('#detection-count shows "Loading…" immediately after card click', async ({ page }) => {
    await page.locator('.card[data-backend="mediapipe"]').click();
    await expect(page.locator('#detection-count')).toHaveText('Loading…');
  });

  test('switch button is visible after backend selection', async ({ page }) => {
    await page.locator('.card[data-backend="mediapipe"]').click();
    await expect(page.locator('#switch-btn')).toBeVisible();
  });

  test('clicking switch button returns to picker', async ({ page }) => {
    await page.locator('.card[data-backend="mediapipe"]').click();
    // Wait for UI to settle before switching
    await page.waitForTimeout(500);
    await page.locator('#switch-btn').click();
    await expect(page.locator('#picker')).toBeVisible();
    await expect(page.locator('#container')).toBeHidden();
  });

  test('status is hidden after switching back to picker', async ({ page }) => {
    await page.locator('.card[data-backend="mediapipe"]').click();
    await page.waitForTimeout(500);
    await page.locator('#switch-btn').click();
    await expect(page.locator('#status')).toBeHidden();
  });

  // Visual regression: taken at loading state before inference begins,
  // to avoid non-deterministic detection output in the screenshot.
  test('camera view loading state visual regression', async ({ page }) => {
    await page.locator('.card[data-backend="mediapipe"]').click();
    // Just check the initial UI state (container visible, loading text)
    await expect(page.locator('#container')).toBeVisible();
    await expect(page.locator('#detection-count')).toHaveText('Loading…');
    await expect(page).toHaveScreenshot('camera-view-loading.png', { maxDiffPixelRatio: 0.05 });
  });
});
