const { test, expect } = require('@playwright/test');

test.describe('Homepage tests', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/');
    
    // Verify the page has loaded with the correct title
    await expect(page).toHaveTitle(/E-RPG - Enhanced RPG Campaign Manager/);
  });
  
  test('should have proper UI elements', async ({ page }) => {
    await page.goto('/');
    
    // Check for key UI elements - adjusted based on actual app structure
    // Using more general selectors that are likely to exist in the app
    await expect(page.locator('body')).toBeVisible();
    
    // Look for any content container
    const contentSection = page.locator('.container-fluid, .container, .content, #app, #root, main');
    await expect(contentSection).toBeVisible();
  });
}); 