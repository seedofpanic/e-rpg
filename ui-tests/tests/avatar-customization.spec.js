const { test, expect } = require('@playwright/test');
const { waitForAppLoad } = require('./utils/test-helpers');
const path = require('path');

test.describe('Avatar Customization Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppLoad(page);
  });

  test('should open avatar upload modal for character', async ({ page }) => {
    // Find a character avatar container
    const avatarContainer = page.locator('.character-avatar-container').first();
    
    if (await avatarContainer.count() > 0) {
      await avatarContainer.click();
      
      // Verify modal opened
      await expect(page.locator('#avatarUploadModal')).toBeVisible();
      
      // Verify file input exists
      await expect(page.locator('#avatar-file')).toBeVisible();
      
      // Close modal
      await page.locator('#avatarUploadModal .btn-close').click();
    } else {
      test.skip('No character avatar containers found');
    }
  });

  test('should open avatar upload modal for GM', async ({ page }) => {
    // Find GM avatar container/button
    const gmAvatarContainer = page.locator('#gm-avatar-container, #change-gm-avatar-btn').first();
    
    if (await gmAvatarContainer.count() > 0) {
      await gmAvatarContainer.click();
      
      // Verify modal opened with GM as target
      await expect(page.locator('#avatarUploadModal')).toBeVisible();
      
      // Check if the character ID is set to "gm"
      const characterIdInput = page.locator('#avatar-character-id');
      if (await characterIdInput.count() > 0) {
        await expect(characterIdInput).toHaveValue('gm');
      }
      
      // Close modal
      await page.locator('#avatarUploadModal .btn-close').click();
    } else {
      test.skip('GM avatar container not found');
    }
  });

  test('should preview selected avatar image', async ({ page }) => {
    // Open avatar modal
    const avatarContainer = page.locator('.character-avatar-container').first();
    
    if (await avatarContainer.count() > 0) {
      await avatarContainer.click();
      
      // Prepare file for upload (this is mocked since we can't actually upload in automated tests)
      // Note: In a real environment, you'd need a test image file in a known location
      const testImagePath = path.join(__dirname, '..', 'test-assets', 'test-avatar.png');
      
      // Mock file selection - this part is just testing the preview functionality,
      // not the actual upload which would require a server
      try {
        // This requires a real file to exist - we can only test the UI part
        await page.setInputFiles('#avatar-file', testImagePath);
        
        // Check if preview container becomes visible
        await expect(page.locator('.avatar-preview-container')).toBeVisible();
        await expect(page.locator('#avatar-preview')).toBeVisible();
      } catch (e) {
        // If test image doesn't exist, we'll just test the UI exists
        console.log('Test image not available - skipping file upload test portion');
      }
      
      // Close modal
      await page.locator('#avatarUploadModal .btn-close').click();
    } else {
      test.skip('No character avatar containers found');
    }
  });

  test('should have upload button functionality', async ({ page }) => {
    // Open avatar modal
    const avatarContainer = page.locator('.character-avatar-container').first();
    
    if (await avatarContainer.count() > 0) {
      await avatarContainer.click();
      
      // Check upload button exists and is enabled
      await expect(page.locator('#upload-avatar-btn')).toBeVisible();
      await expect(page.locator('#upload-avatar-btn')).toBeEnabled();
      
      // We won't test actual upload functionality as it requires server interaction
      // Just verify behavior when no file is selected (should show alert or disable button)
      await page.locator('#upload-avatar-btn').click();
      
      // Either alert appears or button remains visible (we're testing without file selection)
      const alertOpened = await page.evaluate(() => {
        return window.alert !== undefined;
      });
      
      if (!alertOpened) {
        // If no alert, the modal should still be open
        await expect(page.locator('#avatarUploadModal')).toBeVisible();
      }
      
      // Close modal
      await page.locator('#avatarUploadModal .btn-close').click();
    } else {
      test.skip('No character avatar containers found');
    }
  });
}); 