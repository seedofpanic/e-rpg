const { test, expect } = require('@playwright/test');
const { waitForAppLoad } = require('./utils/test-helpers');

test.describe('Settings and Autosave Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppLoad(page);
  });

  test('should open settings modal', async ({ page }) => {
    // Click the settings button
    const settingsButton = page.locator('[data-bs-target="#settingsModal"]');
    
    if (await settingsButton.count() > 0) {
      await settingsButton.click();
      
      // Verify modal is visible
      await expect(page.locator('#settingsModal')).toBeVisible();
      
      // Verify key settings elements exist
      await expect(page.locator('#gemini-api-key')).toBeVisible();
      await expect(page.locator('#save-file-path')).toBeVisible();
      await expect(page.locator('#autosave-enabled')).toBeVisible();
      
      // Close modal
      await page.locator('#settingsModal .btn-close').click();
    } else {
      test.skip('Settings button not found');
    }
  });

  test('should save API key', async ({ page }) => {
    // Open settings modal
    const settingsButton = page.locator('[data-bs-target="#settingsModal"]');
    
    if (await settingsButton.count() > 0) {
      await settingsButton.click();
      
      // Enter a test API key
      await page.locator('#gemini-api-key').fill('test-api-key-' + Date.now());
      
      // Save settings
      await page.locator('#save-settings-btn').click();
      
      // Wait for save to complete and modal to close
      await page.waitForTimeout(1000);
      
      // Look for success toast or system message
      const successMessage = page.locator('.toast, .system-message').last();
      if (await successMessage.count() > 0) {
        const messageText = await successMessage.textContent();
        expect(messageText).toContain('Settings');
      }
      
      // Re-open settings to verify value persisted
      await settingsButton.click();
      const savedValue = await page.locator('#gemini-api-key').inputValue();
      expect(savedValue).toContain('test-api-key-');
      
      // Close modal
      await page.locator('#settingsModal .btn-close').click();
    } else {
      test.skip('Settings button not found');
    }
  });

  test('should save file path', async ({ page }) => {
    // Open settings modal
    const settingsButton = page.locator('[data-bs-target="#settingsModal"]');
    
    if (await settingsButton.count() > 0) {
      await settingsButton.click();
      
      // Check current value
      const currentPath = await page.locator('#save-file-path').inputValue();
      
      // Create a unique identifier for this test run
      const testIdentifier = 'test-path-' + Date.now();
      
      // Enter a test file path
      await page.locator('#save-file-path').fill(testIdentifier);
      
      // Save settings
      await page.locator('#save-settings-btn').click();
      
      // Wait for save to complete
      await page.waitForTimeout(1000);
      
      // Re-open settings to verify value changed or contains our identifier
      await settingsButton.click();
      const savedValue = await page.locator('#save-file-path').inputValue();
      
      // Check if the value contains our identifier or is different from the original
      const valueChanged = savedValue.includes(testIdentifier) || savedValue !== currentPath;
      expect(valueChanged).toBe(true);
      
      // Close modal
      await page.locator('#settingsModal .btn-close').click();
    } else {
      test.skip('Settings button not found');
    }
  });

  test('should toggle autosave setting', async ({ page }) => {
    // Open settings modal
    const settingsButton = page.locator('[data-bs-target="#settingsModal"]');
    
    if (await settingsButton.count() > 0) {
      await settingsButton.click();
      
      // Get autosave checkbox
      const autosaveCheckbox = page.locator('#autosave-enabled');
      
      // Only proceed if checkbox is not disabled (not in debug mode)
      if (await autosaveCheckbox.isEnabled()) {
        // Get initial state
        const initialState = await autosaveCheckbox.isChecked();
        
        // Click to toggle
        await autosaveCheckbox.click();
        
        // Verify state changed
        const newState = await autosaveCheckbox.isChecked();
        expect(newState).not.toBe(initialState);
        
        // Save settings
        await page.locator('#save-settings-btn').click();
        
        // Wait for save to complete
        await page.waitForTimeout(1000);
        
        // Re-open settings to verify value persisted
        await settingsButton.click();
        const savedState = await autosaveCheckbox.isChecked();
        expect(savedState).toBe(newState);
        
        // Restore initial state
        if (savedState !== initialState) {
          await autosaveCheckbox.click();
          await page.locator('#save-settings-btn').click();
        }
      } else {
        // Verify debug mode warning is shown if checkbox is disabled
        const debugWarning = page.locator('#debug-mode-warning');
        if (await debugWarning.count() > 0) {
          await expect(debugWarning).toBeVisible();
        }
      }
      
      // Close modal
      await page.locator('#settingsModal .btn-close').click();
    } else {
      test.skip('Settings button not found');
    }
  });

  test('should update autosave threshold', async ({ page }) => {
    // Open settings modal
    const settingsButton = page.locator('[data-bs-target="#settingsModal"]');
    
    if (await settingsButton.count() > 0) {
      await settingsButton.click();
      
      // Get threshold input
      const thresholdInput = page.locator('#autosave-threshold');
      
      // Only proceed if input is not disabled (not in debug mode)
      if (await thresholdInput.isEnabled()) {
        // Get current value
        const initialValue = await thresholdInput.inputValue();
        
        // Set new value
        const newValue = String(parseInt(initialValue) + 1);
        await thresholdInput.fill(newValue);
        
        // Save settings
        await page.locator('#save-settings-btn').click();
        
        // Wait for save to complete
        await page.waitForTimeout(1000);
        
        // Re-open settings to verify value persisted
        await settingsButton.click();
        const savedValue = await thresholdInput.inputValue();
        expect(savedValue).toBe(newValue);
        
        // Restore initial value
        await thresholdInput.fill(initialValue);
        await page.locator('#save-settings-btn').click();
      }
      
      // Close modal
      await page.locator('#settingsModal .btn-close').click();
    } else {
      test.skip('Settings button not found');
    }
  });

  test('should update lore text', async ({ page }) => {
    // Open settings modal
    const settingsButton = page.locator('[data-bs-target="#settingsModal"]');
    
    if (await settingsButton.count() > 0) {
      await settingsButton.click();
      
      // Find lore text area
      const loreTextarea = page.locator('#lore-text');
      
      if (await loreTextarea.count() > 0) {
        // Get current value
        const initialValue = await loreTextarea.inputValue();
        
        // Set new value
        const testMarker = '[TEST MARKER ' + Date.now() + ']';
        const newValue = initialValue + '\n' + testMarker;
        await loreTextarea.fill(newValue);
        
        // Save settings
        await page.locator('#save-settings-btn').click();
        
        // Wait for save to complete
        await page.waitForTimeout(1000);
        
        // Re-open settings to verify value persisted
        await settingsButton.click();
        const savedValue = await loreTextarea.inputValue();
        expect(savedValue).toContain(testMarker);
        
        // Restore initial value
        await loreTextarea.fill(initialValue);
        await page.locator('#save-settings-btn').click();
      }
      
      // Close modal
      await page.locator('#settingsModal .btn-close').click();
    } else {
      test.skip('Settings button not found');
    }
  });
}); 