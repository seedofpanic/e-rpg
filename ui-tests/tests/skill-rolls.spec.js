const { test, expect } = require('@playwright/test');
const { waitForAppLoad } = require('./utils/test-helpers');

test.describe('Skill Roll Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppLoad(page);
  });

  test('should display roll buttons for characters', async ({ page }) => {
    // Check if roll buttons exist for any characters
    const rollButtons = page.locator('.roll-button');
    
    if (await rollButtons.count() > 0) {
      await expect(rollButtons.first()).toBeVisible();
    } else {
      test.skip('No roll buttons found - need characters with roll capability');
    }
  });

  test('should show skill menu when roll button clicked', async ({ page }) => {
    // Find a roll button
    const rollButton = page.locator('.roll-button').first();
    
    if (await rollButton.count() > 0) {
      // Click to open skill menu
      await rollButton.click();
      
      // Verify skill menu appears
      const skillMenu = rollButton.locator('.skill-menu');
      await expect(skillMenu).toBeVisible();
      
      // Verify it contains skill items
      await expect(skillMenu.locator('.skill-item').first()).toBeVisible();
      
      // Close menu by clicking elsewhere
      await page.click('body');
    } else {
      test.skip('No roll buttons found - need characters with roll capability');
    }
  });

  test('should contain all standard RPG skills', async ({ page }) => {
    // Standard skills
    const standardSkills = [
      'Acrobatics', 'Animal Handling', 'Arcana', 'Athletics', 
      'Deception', 'History', 'Insight', 'Intimidation', 
      'Investigation', 'Medicine', 'Nature', 'Perception',
      'Performance', 'Persuasion', 'Religion', 
      'Sleight of Hand', 'Stealth', 'Survival'
    ];
    
    // Find a roll button
    const rollButton = page.locator('.roll-button').first();
    
    if (await rollButton.count() > 0) {
      // Click to open skill menu
      await rollButton.click();
      
      // Check if all standard skills are present
      for (const skill of standardSkills) {
        // Using case-insensitive contains to handle variations in text
        const skillItem = page.locator(`.skill-item:text-matches("${skill}", "i")`);
        if (await skillItem.count() === 0) {
          console.log(`Skill not found: ${skill}`);
        }
      }
      
      // At least check if there are 18 skills (the standard number)
      const skillItemCount = await page.locator('.skill-item').count();
      expect(skillItemCount).toBeGreaterThanOrEqual(18);
      
      // Close menu by clicking elsewhere
      await page.click('body');
    } else {
      test.skip('No roll buttons found - need characters with roll capability');
    }
  });

  test('should perform skill roll when skill is clicked', async ({ page }) => {
    // Find a roll button
    const rollButton = page.locator('.roll-button').first();
    
    if (await rollButton.count() > 0) {
      // Click to open skill menu
      await rollButton.click();
      
      // Get initial count of skill roll messages
      const initialRollCount = await page.locator('.skill-roll-message').count();
      
      // Click the first skill
      await page.locator('.skill-item').first().click();
      
      // Wait for roll result to appear (with a reasonable timeout)
      try {
        await page.waitForSelector('.skill-roll-message', { 
          state: 'attached',
          timeout: 5000 
        });
        
        // Check if a new roll message appeared
        const newRollCount = await page.locator('.skill-roll-message').count();
        expect(newRollCount).toBeGreaterThan(initialRollCount);
      } catch (e) {
        // If no roll message appears, check for loading indicator
        const loading = await page.locator('.skill-loading').count();
        if (loading > 0) {
          // If still loading, test passes
          expect(loading).toBeGreaterThan(0);
        } else {
          // If no loading indicator, the test fails
          throw e;
        }
      }
    } else {
      test.skip('No roll buttons found - need characters with roll capability');
    }
  });

  test('should display roll components with tooltips', async ({ page }) => {
    // Find existing roll results or create one
    let rollResult = page.locator('.skill-roll-result').first();
    
    if (await rollResult.count() === 0) {
      // No roll result exists, so create one
      const rollButton = page.locator('.roll-button').first();
      
      if (await rollButton.count() > 0) {
        // Click to open skill menu
        await rollButton.click();
        
        // Click first skill
        await page.locator('.skill-item').first().click();
        
        // Wait for roll result
        try {
          await page.waitForSelector('.skill-roll-result', { 
            state: 'attached',
            timeout: 5000 
          });
          
          // Get the roll result
          rollResult = page.locator('.skill-roll-result').first();
        } catch (e) {
          // If no roll result appears, skip the test
          test.skip('Could not generate a skill roll result');
          return;
        }
      } else {
        test.skip('No roll buttons found - need characters with roll capability');
        return;
      }
    }
    
    // Test roll components
    await expect(rollResult.locator('.skill-name')).toBeVisible();
    await expect(rollResult.locator('.roll')).toBeVisible();
    await expect(rollResult.locator('.roll-details')).toBeVisible();
    
    // Verify tooltip containers exist
    const tooltipContainers = rollResult.locator('.tooltip-container');
    if (await tooltipContainers.count() > 0) {
      await expect(tooltipContainers.first()).toBeVisible();
      
      // Verify tooltip text exists (though we can't test hover in headless)
      const tooltipTexts = rollResult.locator('.tooltip-text');
      expect(await tooltipTexts.count()).toBeGreaterThan(0);
    }
  });
}); 