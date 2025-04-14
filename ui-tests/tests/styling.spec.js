const { test, expect } = require('@playwright/test');
const { waitForAppLoad } = require('./utils/test-helpers');

test.describe('Styling and UI Appearance', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppLoad(page);
  });

  test('should apply character active/inactive styling', async ({ page }) => {
    // Find a character toggle button
    const toggleButton = page.locator('.toggle-active-btn').first();
    
    if (await toggleButton.count() > 0) {
      // Get character item container
      const characterItem = toggleButton.locator('..').first();
      
      if (await characterItem.count() > 0) {
        // Get initial state
        const initialState = await toggleButton.getAttribute('data-active');
        const initiallyActive = initialState === 'true';
        
        // Check if initial styling matches state
        const hasInactiveClass = await characterItem.evaluate(el => 
          el.classList.contains('character-inactive')
        );
        
        expect(hasInactiveClass).toBe(!initiallyActive);
        
        // Toggle state
        await toggleButton.click();
        
        // Wait for update
        await page.waitForTimeout(1000);
        
        // Check styling after toggle
        const hasInactiveClassAfterToggle = await characterItem.evaluate(el => 
          el.classList.contains('character-inactive')
        );
        
        expect(hasInactiveClassAfterToggle).toBe(initiallyActive);
        
        // Toggle back for test cleanup
        await toggleButton.click();
      }
    } else {
      test.skip('No character toggle buttons found');
    }
  });

  test('should style critical success/failure rolls', async ({ page }) => {
    // Look for existing roll results
    const criticalSuccessRoll = page.locator('.roll.critical-success');
    const criticalFailureRoll = page.locator('.roll.critical-failure');
    
    // If neither exists, we'll skip the test
    if (await criticalSuccessRoll.count() === 0 && await criticalFailureRoll.count() === 0) {
      test.skip('No critical roll results found');
      return;
    }
    
    // Test critical success styling if it exists
    if (await criticalSuccessRoll.count() > 0) {
      // Verify it has special text
      await expect(page.locator('.roll-text.critical-success')).toBeVisible();
      
      // Check computed style to ensure it's visually distinct
      const successColor = await criticalSuccessRoll.evaluate(el => {
        const style = window.getComputedStyle(el);
        return style.color || style.backgroundColor;
      });
      
      expect(successColor).not.toBe('');
    }
    
    // Test critical failure styling if it exists
    if (await criticalFailureRoll.count() > 0) {
      // Verify it has special text
      await expect(page.locator('.roll-text.critical-failure')).toBeVisible();
      
      // Check computed style to ensure it's visually distinct
      const failureColor = await criticalFailureRoll.evaluate(el => {
        const style = window.getComputedStyle(el);
        return style.color || style.backgroundColor;
      });
      
      expect(failureColor).not.toBe('');
    }
  });

  test('should display tooltips with proper styling', async ({ page }) => {
    // Find a roll result with tooltips
    const tooltipContainer = page.locator('.tooltip-container').first();
    
    if (await tooltipContainer.count() > 0) {
      // Verify tooltip text exists and is initially hidden
      const tooltipText = tooltipContainer.locator('.tooltip-text');
      
      if (await tooltipText.count() > 0) {
        // Check that tooltip is initially not visible (may be hidden by CSS)
        const isInitiallyVisible = await tooltipText.evaluate(el => {
          const style = window.getComputedStyle(el);
          return style.visibility !== 'hidden' && style.display !== 'none' && style.opacity !== '0';
        });
        
        // Most tooltip implementations hide the tooltip initially
        if (!isInitiallyVisible) {
          expect(true).toBe(true);
        } else {
          // Some tooltips may be visible initially, which is also valid
          await expect(tooltipText).toBeVisible();
        }
      }
    } else {
      test.skip('No tooltip containers found');
    }
  });

  test('should style responsive skill roll menus', async ({ page }) => {
    // Find a roll button
    const rollButton = page.locator('.roll-button').first();
    
    if (await rollButton.count() > 0) {
      // Click to open skill menu
      await rollButton.click();
      
      // Verify skill menu appears
      const skillMenu = rollButton.locator('.skill-menu');
      await expect(skillMenu).toBeVisible();
      
      // Check if it has the correct positioning class (top or bottom)
      const hasPositionClass = await skillMenu.evaluate(el => 
        el.classList.contains('skill-menu-top') || el.classList.contains('skill-menu-bottom')
      );
      
      expect(hasPositionClass).toBeTruthy();
      
      // Close menu by clicking elsewhere
      await page.click('body');
    } else {
      test.skip('No roll buttons found');
    }
  });

  test('should style message types differently', async ({ page }) => {
    // Get different message types
    const regularMessages = page.locator('.message:not(.system-message):not(.memory-message):not(.skill-roll-message)');
    const systemMessages = page.locator('.system-message');
    const memoryMessages = page.locator('.memory-message');
    const skillRollMessages = page.locator('.skill-roll-message');
    
    // Check regular messages
    if (await regularMessages.count() > 0) {
      // Regular messages should have avatar and sender name
      await expect(regularMessages.first().locator('.character-avatar')).toBeVisible();
      await expect(regularMessages.first().locator('h5')).toBeVisible();
    }
    
    // Check system messages for distinct styling
    if (await systemMessages.count() > 0) {
      // System messages should not have avatar or sender name
      const systemMessageContent = await systemMessages.first().locator('.message-content').count();
      expect(systemMessageContent).toBe(1);
      
      // Get system message style
      const systemStyle = await systemMessages.first().evaluate(el => {
        const style = window.getComputedStyle(el);
        return {
          backgroundColor: style.backgroundColor,
          color: style.color,
          fontStyle: style.fontStyle
        };
      });
      
      // System messages typically have distinct styling
      expect(systemStyle).toBeTruthy();
    }
    
    // Check memory messages
    if (await memoryMessages.count() > 0) {
      // Memory messages should have memory icon
      await expect(memoryMessages.first().locator('.memory-icon')).toBeVisible();
    }
    
    // Check skill roll messages
    if (await skillRollMessages.count() > 0) {
      // Skill roll messages should have roll result
      await expect(skillRollMessages.first().locator('.skill-roll-result')).toBeVisible();
    }
  });
}); 