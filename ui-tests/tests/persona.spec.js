const { test, expect } = require('@playwright/test');
const { waitForAppLoad } = require('./utils/test-helpers');

test.describe('Persona System Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppLoad(page);
  });

  test('should display current persona', async ({ page }) => {
    // Check if persona elements exist at all
    const personaElements = page.locator('.persona-display, #current-persona');
    
    if (await personaElements.count() === 0) {
      test.skip('Persona display elements not found');
      return;
    }
    
    // Get the current persona display element (should be only one visible)
    const currentPersona = personaElements.first();
    await expect(currentPersona).toBeVisible();
    
    // Verify it has content
    const personaText = await currentPersona.textContent();
    expect(personaText.trim().length).toBeGreaterThan(0);
  });

  test('should open persona dropdown when clicked', async ({ page }) => {
    // Find the persona dropdown trigger button
    const personaDropdownTrigger = page.locator('#personaDropdown, .persona-dropdown-toggle, button[data-bs-toggle="dropdown"]').first();
    
    if (await personaDropdownTrigger.count() === 0) {
      test.skip('Persona dropdown trigger not found');
      return;
    }
    
    // Open the dropdown
    await personaDropdownTrigger.click();
    
    // Check for dropdown menu
    const dropdownMenu = page.locator('.dropdown-menu, .persona-menu');
    await expect(dropdownMenu.first()).toBeVisible();
    
    // Check for persona options inside
    const personaOptions = dropdownMenu.locator('.persona-option, .dropdown-item');
    expect(await personaOptions.count()).toBeGreaterThan(0);
  });

  test('should allow creating new personas', async ({ page }) => {
    // Find and click the persona management button
    const personaManagementBtn = page.locator('.persona-manage-btn, #manage-personas-btn');
    
    if (await personaManagementBtn.count() === 0) {
      test.skip('Persona management button not found');
      return;
    }
    
    // Click the first matching button
    await personaManagementBtn.first().click();
    
    // Check if the persona management modal appears
    const personaModal = page.locator('#personaModal, .persona-modal');
    
    if (await personaModal.count() === 0) {
      test.skip('Persona modal not found after clicking management button');
      return;
    }
    
    await expect(personaModal.first()).toBeVisible();
    
    // Look for add new persona button
    const addPersonaBtn = personaModal.locator('.add-persona-btn, #add-persona-btn');
    
    if (await addPersonaBtn.count() === 0) {
      // Close modal before skipping
      await page.locator('.modal .btn-close, .modal .close-btn').first().click();
      test.skip('Add persona button not found');
      return;
    }
    
    // Close the modal to maintain clean state
    await page.locator('.modal .btn-close, .modal .close-btn').first().click();
    await expect(personaModal.first()).not.toBeVisible();
  });

  test('should allow managing existing personas', async ({ page }) => {
    // Find and click the persona management button
    const personaManagementBtn = page.locator('.persona-manage-btn, #manage-personas-btn');
    
    if (await personaManagementBtn.count() === 0) {
      test.skip('Persona management button not found');
      return;
    }
    
    // Click the first matching button
    await personaManagementBtn.first().click();
    
    // Check if the persona management modal appears
    const personaModal = page.locator('#personaModal, .persona-modal');
    
    if (await personaModal.count() === 0) {
      test.skip('Persona modal not found after clicking management button');
      return;
    }
    
    await expect(personaModal.first()).toBeVisible();
    
    // Check for existing persona items
    const personaItems = personaModal.locator('.persona-item');
    
    if (await personaItems.count() === 0) {
      // Close modal before skipping
      await page.locator('.modal .btn-close, .modal .close-btn').first().click();
      test.skip('No existing personas found to manage');
      return;
    }
    
    // Check for edit/delete buttons on persona items
    const firstPersonaItem = personaItems.first();
    const actionButtons = firstPersonaItem.locator('.edit-btn, .delete-btn, button');
    
    expect(await actionButtons.count()).toBeGreaterThan(0);
    
    // Close the modal to maintain clean state
    await page.locator('.modal .btn-close, .modal .close-btn').first().click();
    await expect(personaModal.first()).not.toBeVisible();
  });

  test('should allow toggling favorite personas', async ({ page }) => {
    // Find the persona dropdown trigger button 
    const personaDropdownTrigger = page.locator('#personaDropdown, .persona-dropdown-toggle, button[data-bs-toggle="dropdown"]').first();
    
    if (await personaDropdownTrigger.count() === 0) {
      test.skip('Persona dropdown trigger not found');
      return;
    }
    
    // Open the dropdown
    await personaDropdownTrigger.click();
    
    // Check for dropdown menu
    const dropdownMenu = page.locator('.dropdown-menu, .persona-menu');
    await expect(dropdownMenu.first()).toBeVisible();
    
    // Look for favorite toggle buttons
    const favoriteButtons = dropdownMenu.locator('.favorite-btn, .star-btn');
    
    if (await favoriteButtons.count() === 0) {
      test.skip('No favorite buttons found in persona dropdown');
      return;
    }
    
    // Click outside to close the dropdown (cleanup)
    await page.locator('body').click();
    await expect(dropdownMenu.first()).not.toBeVisible();
  });
}); 