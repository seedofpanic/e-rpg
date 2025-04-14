const { test, expect } = require('@playwright/test');
const { waitForAppLoad } = require('./utils/test-helpers');

test.describe('Character Management Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppLoad(page);
  });

  test('should toggle character active state', async ({ page }) => {
    // Find a character toggle button
    const toggleButton = page.locator('.toggle-active-btn').first();
    
    if (await toggleButton.count() > 0) {
      // Get initial state
      const initialState = await toggleButton.getAttribute('data-active');
      
      // Click to toggle
      await toggleButton.click();
      
      // Wait for server response
      await page.waitForTimeout(1000);
      
      // Verify state changed
      const newState = await toggleButton.getAttribute('data-active');
      expect(newState).not.toBe(initialState);
      
      // Toggle back for test cleanup
      await toggleButton.click();
    } else {
      test.skip('No character toggle buttons found');
    }
  });

  test('should open party configuration modal', async ({ page }) => {
    // Click the party configuration button (may be in settings or main UI)
    const partyConfigButton = page.locator('[data-bs-target="#partyConfigModal"]');
    
    if (await partyConfigButton.count() > 0) {
      await partyConfigButton.click();
      
      // Verify modal is visible
      await expect(page.locator('#partyConfigModal')).toBeVisible();
      
      // Close modal for test cleanup
      await page.locator('#partyConfigModal .btn-close').click();
    } else {
      test.skip('Party configuration button not found');
    }
  });

  test('should add character in party configuration', async ({ page }) => {
    // Open party config modal
    const partyConfigButton = page.locator('[data-bs-target="#partyConfigModal"]');
    
    if (await partyConfigButton.count() > 0) {
      await partyConfigButton.click();
      
      // Wait for the modal and content to load
      await expect(page.locator('#partyConfigModal')).toBeVisible();
      await expect(page.locator('#party-config-container')).toBeVisible();
      
      // Wait for all slots to load
      await page.waitForTimeout(1000);
      
      // Get initial number of character slots
      const initialSlots = await page.locator('.character-config-slot').count();
      
      // Click add character button
      await page.locator('#add-character-btn').click();
      
      // Wait for new slot to be added (may take a moment)
      await page.waitForTimeout(500);
      
      // Get the new count
      const newSlots = await page.locator('.character-config-slot').count();
      
      // Verify new slot was added
      expect(newSlots).toBeGreaterThan(initialSlots);
      
      // Close modal for test cleanup
      await page.locator('#partyConfigModal .modal-header .btn-close').click();
    } else {
      test.skip('Party configuration button not found');
    }
  });

  test('should set party leader', async ({ page }) => {
    // Open party config modal
    const partyConfigButton = page.locator('[data-bs-target="#partyConfigModal"]');
    
    if (await partyConfigButton.count() > 0) {
      await partyConfigButton.click();
      
      // Find all leader checkboxes and select the first non-checked one
      const leaderCheckboxes = page.locator('.character-is-leader');
      
      if (await leaderCheckboxes.count() > 1) {
        // Find a non-checked checkbox
        for (let i = 0; i < await leaderCheckboxes.count(); i++) {
          const checkbox = leaderCheckboxes.nth(i);
          if (!await checkbox.isChecked()) {
            await checkbox.check();
            
            // Verify only one checkbox is checked
            let checkedCount = 0;
            for (let j = 0; j < await leaderCheckboxes.count(); j++) {
              if (await leaderCheckboxes.nth(j).isChecked()) {
                checkedCount++;
              }
            }
            expect(checkedCount).toBe(1);
            break;
          }
        }
      }
      
      // Close modal for test cleanup
      await page.locator('#partyConfigModal .btn-close').click();
    } else {
      test.skip('Party configuration button not found');
    }
  });

  test('should open avatar upload modal', async ({ page }) => {
    // Find any character avatar container
    const avatarContainer = page.locator('.character-avatar-container').first();
    
    if (await avatarContainer.count() > 0) {
      await avatarContainer.click();
      
      // Verify modal is visible
      await expect(page.locator('#avatarUploadModal')).toBeVisible();
      
      // Close modal for test cleanup
      await page.locator('#avatarUploadModal .btn-close').click();
    } else {
      test.skip('No character avatar containers found');
    }
  });
}); 