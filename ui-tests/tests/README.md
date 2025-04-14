# UI Testing with Playwright

This folder contains UI tests using Playwright. All tests automatically mock the backend to ensure they are reliable and don't depend on the actual server implementation.

## How Backend Mocking Works

All tests use a custom fixture that automatically:

1. Mocks all API requests using Playwright's `page.route()` functionality
2. Mocks the Socket.io connection to simulate real-time events

## Using the Mocked Backend in Tests

### Basic Test Structure

```javascript
// Import our custom fixtures instead of the standard ones
const { test, expect } = require('./fixtures');
const { triggerThinkingState } = require('./utils/test-helpers');

test('should display thinking indicator', async ({ page }) => {
  await page.goto('/');
  
  // Trigger a mock thinking state
  await triggerThinkingState(page);
  
  // Check if thinking indicator appears
  await expect(page.locator('#thinking-message')).toBeVisible();
});
```

### Triggering Socket Events

You can trigger socket events from your tests:

```javascript
// Trigger a custom socket event
await page.evaluate(() => {
  // Access the mock socket that was set up by our fixtures
  if (window.mockSocket) {
    // Create mock data
    const data = {
      type: 'message',
      sender: 'Character',
      message: 'Hello world',
      character_id: 'char1',
      avatar: 'avatar.jpg'
    };
    
    // Trigger the event with the data
    window.mockSocket._triggerEvent('new_message', data);
  }
});
```

### Customizing API Mock Responses

For specific tests that need custom API responses, you can override the default mocks:

```javascript
test('should handle error response', async ({ page }) => {
  // Override a specific API route for this test only
  await page.route('**/api/get_characters', route => {
    route.fulfill({
      status: 500,
      body: JSON.stringify({ 
        status: 'error', 
        message: 'Server error' 
      }),
      headers: { 'Content-Type': 'application/json' }
    });
  });
  
  // The rest of your test...
});
```

## Helper Functions

The `test-helpers.js` file provides several utility functions:

- `waitForAppLoad(page)` - Waits for the application to load
- `mockSocketBackend(page)` - Sets up socket mocking (called automatically)
- `mockApiResponses(page)` - Sets up API mocking (called automatically)
- `triggerThinkingState(page, endThinking)` - Triggers the thinking state
- `sendChatMessage(page, message)` - Sends a test message in the chat
- And more...

## Adding New Tests

When adding new tests:

1. Always import from './fixtures' instead of '@playwright/test'
2. Use helper functions from './utils/test-helpers' for common operations
3. Don't try to test against the real backend - always use mocks 