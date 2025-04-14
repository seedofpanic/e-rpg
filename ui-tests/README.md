# E-RPG UI Tests

This directory contains UI automated tests for the E-RPG application using [Playwright](https://playwright.dev/).

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

## Running Tests

To run the UI tests, ensure the E-RPG application is running on the default URL configured in `playwright.config.js` (http://localhost:5000), then:

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests in headed mode (with browser UI visible)
npm run test:headed

# Run tests with specific browser
npx playwright test --project=chromium
```

## Test Reports

After running tests, view the HTML report:

```bash
npx playwright show-report
```

Test results are also stored in the `test-results` directory, and HTML reports in the `playwright-report` directory.

## Notes for Test Development

- Tests are designed to be resilient to different application states
- Many tests will skip if the required UI elements are not found
- Some tests may need application data (characters, messages) to be present
- For actual file uploads, create a `test-assets` directory with test images 