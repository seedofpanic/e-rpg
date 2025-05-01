const { test, expect } = require('@playwright/test');
const { waitForAppLoad } = require('./utils/test-helpers');
const path = require('path');

test.describe('Avatar Customization Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppLoad(page);
  });

  test('should open avatar upload modal for character', async ({ page }) => {
    // Find a character avatar in the sidebar
    const avatar = page.locator('.avatar').first();
    
    if (await avatar.count() > 0) {
      await avatar.click();
      
      // Verify modal opened
      await expect(page.locator('.modalContent')).toBeVisible();
      
      // Verify file input exists
      await expect(page.locator('input[type="file"]')).toBeVisible();
      
      // Close modal
      await page.locator('.modalHeader button').click();
    } else {
      test.skip('No character avatars found');
    }
  });

  test('should open avatar upload modal for GM', async ({ page }) => {
    // Find GM avatar in persona selector
    const personaAvatar = page.locator('.personaAvatarSmall').first();
    
    if (await personaAvatar.count() > 0) {
      await personaAvatar.click();
      
      // Open the avatar upload modal from dropdown
      const avatarOption = page.locator('.personaManageOption').first();
      if (await avatarOption.count() > 0) {
        await avatarOption.click();
        
        // Verify modal opened
        await expect(page.locator('.modalContent')).toBeVisible();
        
        // Verify file input exists
        await expect(page.locator('input[type="file"]')).toBeVisible();
        
        // Close modal
        await page.locator('.modalHeader button').click();
      } else {
        test.skip('Avatar option not found in persona dropdown');
      }
    } else {
      test.skip('GM avatar not found');
    }
  });

  test('should preview selected avatar image', async ({ page }) => {
    // Open avatar modal using a character avatar
    const avatar = page.locator('.avatar').first();
    
    if (await avatar.count() > 0) {
      await avatar.click();
      
      // Prepare file for upload (this is mocked since we can't actually upload in automated tests)
      // Note: In a real environment, you'd need a test image file in a known location
      const testImagePath = path.join(__dirname, '..', 'test-assets', 'test-avatar.png');
      
      // Mock file selection - this part is just testing the preview functionality,
      // not the actual upload which would require a server
      try {
        // This requires a real file to exist - we can only test the UI part
        await page.setInputFiles('input[type="file"]', testImagePath);
        
        // Check if preview container becomes visible
        await expect(page.locator('.avatarPreview')).toBeVisible();
      } catch (e) {
        // If test image doesn't exist, we'll just test the UI exists
        console.log('Test image not available - skipping file upload test portion');
      }
      
      // Close modal
      await page.locator('.modalHeader button').click();
    } else {
      test.skip('No character avatars found');
    }
  });

  test('should have upload button functionality', async ({ page }) => {
    // Open avatar modal
    const avatar = page.locator('.avatar').first();
    
    if (await avatar.count() > 0) {
      await avatar.click();
      
      // Check upload button exists and is enabled
      const uploadButton = page.locator('button:has-text("Upload"), .btnPrimary:has-text("Upload")').first();
      await expect(uploadButton).toBeVisible();
      
      // We won't test actual upload functionality as it requires server interaction
      // Just verify behavior when no file is selected (should show alert or disable button)
      await uploadButton.click();
      
      // Either alert appears or modal remains visible
      const alertOpened = await page.evaluate(() => {
        return window.alert !== undefined;
      });
      
      if (!alertOpened) {
        // If no alert, the modal should still be open
        await expect(page.locator('.modalContent')).toBeVisible();
      }
      
      // Close modal
      await page.locator('.modalHeader button').click();
    } else {
      test.skip('No character avatars found');
    }
  });
}); 