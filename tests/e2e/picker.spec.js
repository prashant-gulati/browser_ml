import { test, expect } from '@playwright/test';

test.describe('Picker page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/browser-ml.html');
  });

  test('picker is visible on load', async ({ page }) => {
    await expect(page.locator('#picker')).toBeVisible();
  });

  test('container is hidden on load', async ({ page }) => {
    await expect(page.locator('#container')).toBeHidden();
  });

  test('status is hidden on load', async ({ page }) => {
    await expect(page.locator('#status')).toBeHidden();
  });

  test('h1 text is "Browser ML Playground"', async ({ page }) => {
    await expect(page.locator('#picker h1')).toHaveText('Browser ML Playground');
  });

  test('all 7 backend cards are visible', async ({ page }) => {
    const backends = ['blazeface', 'mediapipe', 'cocossd', 'posenet', 'handpose', 'bodypix', 'facemesh'];
    for (const backend of backends) {
      await expect(page.locator(`.card[data-backend="${backend}"]`)).toBeVisible();
    }
  });

  test('all 4 group labels are present', async ({ page }) => {
    const labels = ['Face Detection', 'Object Detection', 'Body & Pose', 'Hands & Face Mesh'];
    for (const label of labels) {
      await expect(page.locator('.group-label', { hasText: label })).toBeVisible();
    }
  });

  test('BlazeFace card has "Maintenance mode" badge', async ({ page }) => {
    const badge = page.locator('.card[data-backend="blazeface"] .badge');
    await expect(badge).toHaveText('Maintenance mode');
  });

  test('MediaPipe card has "Recommended" badge', async ({ page }) => {
    const badge = page.locator('.card[data-backend="mediapipe"] .badge');
    await expect(badge).toHaveText('Recommended');
  });

  test('picker visual regression', async ({ page }) => {
    await expect(page).toHaveScreenshot('picker.png', { maxDiffPixelRatio: 0.02 });
  });
});
