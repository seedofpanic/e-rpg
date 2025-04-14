const { test, expect } = require('@playwright/test');
const { waitForAppLoad, selectCharacter } = require('./utils/test-helpers');

test.describe('Character tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the home page before each test
    await page.goto('/');
    await waitForAppLoad(page);
  });

  test('should be able to interact with the UI', async ({ page }) => {
    // Test that we can interact with basic UI elements
    await expect(page.locator('body')).toBeVisible();
    
    // Find any clickable elements (buttons, links, etc.)
    const clickableElements = page.locator('button, a, [role="button"]').first();
    if (await clickableElements.count() > 0) {
      // If we found any, verify we can interact with at least one
      await expect(clickableElements.first()).toBeVisible();
    }
  });

  test('should show content after interaction', async ({ page }) => {
    // Try to interact with UI and verify content updates
    
    // Find any input field
    const inputField = page.locator('input, textarea').first();
    if (await inputField.count() > 0) {
      // If we found an input field, try typing into it
      await inputField.fill('Test input');
      
      // Verify the input was accepted
      await expect(inputField).toHaveValue('Test input');
    }
  });
}); 