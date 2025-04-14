/**
 * Helper functions for UI tests
 */

/**
 * Waits for the application to fully load
 * @param {import('@playwright/test').Page} page 
 */
async function waitForAppLoad(page) {
  // Wait for some indicator that the app is fully loaded
  // Using more general selectors that are likely to exist, including the container-fluid class
  await page.waitForSelector('.container-fluid, .container, .content, #app, #root, main', { state: 'visible' });
}

/**
 * Mocks the socket.io backend for testing
 * @param {import('@playwright/test').Page} page 
 */
async function mockSocketBackend(page) {
  await page.evaluate(() => {
    // Save original socket.io implementation if it exists
    if (window.io) {
      window._originalIo = window.io;
    }
    
    // Mock socket.io
    window.io = function() {
      const mockSocket = {
        connected: true,
        on: function(event, callback) {
          // Store callbacks for later triggering
          if (!this._eventHandlers) this._eventHandlers = {};
          if (!this._eventHandlers[event]) this._eventHandlers[event] = [];
          this._eventHandlers[event].push(callback);
          return this;
        },
        emit: function(event, data) {
          console.log(`Socket.emit: ${event}`, data);
          
          // Auto-trigger thinking state when gm_continue is emitted
          if (event === 'gm_continue') {
            if (this._eventHandlers && this._eventHandlers['thinking_started']) {
              this._eventHandlers['thinking_started'].forEach(cb => cb());
              
              // Auto-end thinking after some time for tests
              setTimeout(() => {
                if (this._eventHandlers && this._eventHandlers['thinking_ended']) {
                  this._eventHandlers['thinking_ended'].forEach(cb => cb());
                }
              }, 1000);
            }
          }
          
          // Auto-trigger message when gm_message is emitted
          if (event === 'gm_message') {
            if (this._eventHandlers && this._eventHandlers['new_message']) {
              const responseData = {
                type: 'message',
                sender: 'System',
                message: 'Mock response to: ' + (data.message || 'continue'),
                character_id: 'system',
                avatar: 'avatar.jpg'
              };
              this._eventHandlers['new_message'].forEach(cb => cb(responseData));
            }
          }
          
          return this;
        },
        // Method to manually trigger socket events from tests
        _triggerEvent: function(event, data) {
          if (this._eventHandlers && this._eventHandlers[event]) {
            this._eventHandlers[event].forEach(cb => cb(data));
          }
        }
      };
      
      // Store in window for access in tests
      window.mockSocket = mockSocket;
      return mockSocket;
    };
  });
}

/**
 * Mocks API responses for testing
 * @param {import('@playwright/test').Page} page 
 */
async function mockApiResponses(page) {
  // Mock all fetch requests
  await page.route('**/api/**', route => {
    const url = route.request().url();
    console.log(`Mocking API request: ${url}`);
    
    // Default success response
    let responseBody = { status: 'success' };
    
    // Customize response based on endpoint
    if (url.includes('/api/get_characters')) {
      responseBody = {
        status: 'success',
        characters: {
          'char1': {
            id: 'char1',
            name: 'Test Character',
            race: 'Human',
            class: 'Fighter',
            active: true,
            ability_scores: {
              strength: 16,
              dexterity: 14,
              constitution: 15,
              intelligence: 12,
              wisdom: 10,
              charisma: 8
            }
          }
        }
      };
    } else if (url.includes('/api/get_personas')) {
      responseBody = {
        status: 'success',
        personas: {
          'gm': {
            id: 'gm',
            name: 'Game Master',
            avatar: 'avatar.jpg',
            is_favorite: true
          }
        },
        default_persona: 'gm'
      };
    }
    
    route.fulfill({
      status: 200,
      body: JSON.stringify(responseBody),
      headers: {
        'Content-Type': 'application/json'
      }
    });
  });
}

/**
 * Triggers a thinking state for testing
 * @param {import('@playwright/test').Page} page
 * @param {boolean} endThinking Whether to automatically end thinking after a delay
 */
async function triggerThinkingState(page, endThinking = true) {
  await page.evaluate((shouldEndThinking) => {
    if (window.mockSocket) {
      // Trigger thinking started
      window.mockSocket._triggerEvent('thinking_started');
      
      // Auto-end thinking after a delay if requested
      if (shouldEndThinking) {
        setTimeout(() => {
          window.mockSocket._triggerEvent('thinking_ended');
        }, 2000);
      }
    } else {
      console.warn('MockSocket not available. Backend mocking may not be set up.');
      // Fallback: directly manipulate DOM and app state
      window.isThinking = true;
      window.addThinkingMessage();
      
      if (shouldEndThinking) {
        setTimeout(() => {
          window.isThinking = false;
          window.removeThinkingMessage();
        }, 2000);
      }
    }
  }, endThinking);
}

/**
 * Helper to simulate character selection/creation
 * @param {import('@playwright/test').Page} page 
 * @param {string} characterName 
 */
async function selectCharacter(page, characterName) {
  // Try to find any element containing the character name
  const characterElement = page.getByText(characterName, { exact: false });
  if (await characterElement.isVisible()) {
    await characterElement.click();
  } else {
    console.log(`Character "${characterName}" not found`);
  }
}

/**
 * Opens the settings modal
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<boolean>} True if modal was opened successfully
 */
async function openSettingsModal(page) {
  const settingsButton = page.locator('[data-bs-target="#settingsModal"]');
  
  if (await settingsButton.count() > 0) {
    await settingsButton.click();
    
    // Verify modal is visible
    await page.waitForSelector('#settingsModal', { state: 'visible' });
    return true;
  }
  
  return false;
}

/**
 * Closes any open modal by clicking its close button
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<boolean>} True if a modal was closed
 */
async function closeOpenModal(page) {
  // Try to find any open modal close button
  const closeButton = page.locator('.modal.show .btn-close').first();
  
  if (await closeButton.count() > 0) {
    await closeButton.click();
    return true;
  }
  
  return false;
}

/**
 * Triggers a skill roll for the first available character
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<boolean>} True if skill roll was triggered successfully
 */
async function triggerSkillRoll(page) {
  // Find a roll button
  const rollButton = page.locator('.roll-button').first();
  
  if (await rollButton.count() > 0) {
    // Click to open skill menu
    await rollButton.click();
    
    // Click the first skill
    const skillItem = page.locator('.skill-item').first();
    if (await skillItem.count() > 0) {
      await skillItem.click();
      
      // Wait for roll result or loading indicator
      try {
        await page.waitForSelector('.skill-roll-message, .skill-loading', { 
          state: 'attached',
          timeout: 5000 
        });
        return true;
      } catch (e) {
        console.error('Error waiting for skill roll result:', e);
      }
    }
  }
  
  return false;
}

/**
 * Sends a test message in the chat
 * @param {import('@playwright/test').Page} page
 * @param {string} message Text message to send
 * @returns {Promise<boolean>} True if message was sent successfully
 */
async function sendChatMessage(page, message = 'Test message') {
  const messageInput = page.locator('#message-input');
  const sendButton = page.locator('#send-btn');
  
  if (await messageInput.count() > 0 && await sendButton.count() > 0) {
    // Fill and send message
    await messageInput.fill(message);
    await sendButton.click();
    
    // Wait for message to appear in chat
    try {
      // Get the count of messages before checking for a new one
      const beforeCount = await page.locator('.message').count();
      await page.waitForFunction(
        (count) => document.querySelectorAll('.message').length > count,
        beforeCount,
        { timeout: 5000 }
      );
      return true;
    } catch (e) {
      console.error('Error waiting for message to appear:', e);
    }
  }
  
  return false;
}

module.exports = {
  waitForAppLoad,
  mockSocketBackend,
  mockApiResponses,
  triggerThinkingState,
  selectCharacter,
  openSettingsModal,
  closeOpenModal,
  triggerSkillRoll,
  sendChatMessage
}; 