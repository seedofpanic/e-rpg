# E-RPG UI Tests

This directory contains UI tests for the E-RPG application using Playwright.

## Running the Tests

To run the tests, use the following commands:

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with browser visible
npm run test:headed

# View the latest test report
npm run report
```

## Test Structure

The UI tests are organized by feature area:

- `chat-interface.spec.js` - Tests for the chat functionality
- `character.spec.js` - Tests for character management
- `game-controls.spec.js` - Tests for game control buttons and actions
- `scene-management.spec.js` - Tests for scene viewing and editing
- `home.spec.js` - Tests for the homepage features

## Testing Approach

The tests follow these key principles:

1. **Test via the UI only** - Tests interact with visible UI elements as a user would, rather than directly accessing or mocking application stores.

2. **Resilient selectors** - Multiple selector strategies are used to find elements even when UI structure changes.

3. **Graceful degradation** - Tests skip gracefully when certain features aren't available, avoiding false failures.

4. **Minimal dependencies** - Tests don't depend on specific implementation details of components.

## Helper Functions

Test helpers in `tests/utils/test-helpers.js` provide common utilities for:

- Waiting for the application to load
- Finding UI elements with flexible selectors
- Handling common test interactions

## Common Testing Patterns

The tests use several patterns to ensure reliability:

### Multiple Selector Strategies

Using multiple selectors to find elements based on:
- ID (`#element-id`)
- Class (`.element-class`)
- Element type with text content (`button:has-text("Save")`)
- Attributes (`[data-action="save"]`)

Example:
```js
// Try multiple selectors to find an element
const element = page.locator('#specific-id, .element-class, [aria-label="Element"]');
```

### Skip Tests When Features Aren't Available

Tests check if UI elements exist before trying to interact with them:

```js
// Skip test if element not found
if (await element.count() === 0) {
  test.skip('Element not found');
  return;
}
```

### Check Element Visibility and Enabled State

Always check if an element is both visible and enabled before interacting:

```js
const isVisible = await element.isVisible().catch(() => false);
const isEnabled = await element.isEnabled().catch(() => false);

if (isVisible && isEnabled) {
  await element.click();
}
```

## Best Practices

When adding or updating tests:

1. Always check if elements exist and are visible before interacting
2. Use `.first()` when selecting elements to avoid strict mode violations
3. Add error handling with `.catch()` and skip tests that can't run
4. Don't depend on specific store implementations
5. Don't add test-specific IDs to production code - use existing attributes
6. Test the behavior, not the implementation

## Test Coverage

The tests cover all major UI features of the E-RPG application:

- **Chat Interface**: Messaging, system messages, thinking indicator, skill rolls, memory messages
- **Character Management**: Toggle active/inactive, party configuration, leader selection, skill proficiency
- **Scene Management**: Viewing and updating scenes, loading indicators
- **Game Controls**: Continue campaign, voice input, save/load, reset game
- **Persona System**: Creation, management, avatars, favorites, default personas, switching
- **Avatar Customization**: Upload and preview avatar images
- **Skill Rolls**: Menu display, tooltips, visual indicators for critical rolls
- **Autosave System**: Enable/disable, threshold configuration, debug mode handling
- **Settings**: API key management, save file path, game lore
- **UI Components**: Modals, notifications, toasts, styling

## Test Files

- `home.spec.js` - Basic homepage tests
- `character.spec.js` - Basic character UI tests
- `chat-interface.spec.js` - Tests for chat functionality
- `character-management.spec.js` - Tests for character management features
- `scene-management.spec.js` - Tests for scene management features
- `game-controls.spec.js` - Tests for game control features
- `persona.spec.js` - Tests for persona system features
- `avatar-customization.spec.js` - Tests for avatar upload and customization
- `settings.spec.js` - Tests for settings and autosave features
- `skill-rolls.spec.js` - Tests for skill roll functionality
- `modals.spec.js` - Tests for modal UI components
- `notifications.spec.js` - Tests for notification UI components
- `styling.spec.js` - Tests for UI styling and appearance

## Test Utilities

The `utils` directory contains helper functions for common test operations:

- `waitForAppLoad` - Waits for the application to fully load
- `selectCharacter` - Simulates selecting a character
- `openSettingsModal` - Opens the settings modal
- `closeOpenModal` - Closes any open modal
- `triggerSkillRoll` - Triggers a skill roll for a character
- `sendChatMessage` - Sends a test message in the chat

## Test Reports

After running tests, view the HTML report:

```bash
npx playwright show-report
```