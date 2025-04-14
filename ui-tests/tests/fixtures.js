const { test: base, expect } = require('@playwright/test');
const { mockSocketBackend, mockApiResponses, waitForAppLoad } = require('./utils/test-helpers');

/**
 * Extended test fixture that automatically sets up backend mocking
 * This ensures all tests have properly mocked backend APIs and socket connections
 */
exports.test = base.extend({
  // Override the page fixture to auto-mock the backend
  page: async ({ page }, use) => {
    // Set up API mocking before page loads
    await mockApiResponses(page);
    
    // Once the page loads in a test, set up socket mocking
    page.on('load', async () => {
      await waitForAppLoad(page);
      await mockSocketBackend(page);
      
      console.log('Backend mocking is set up for page:', page.url());
    });
    
    // Pass the enhanced page to the test
    await use(page);
  },
});

// Re-export expect
exports.expect = expect; 