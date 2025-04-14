# GM Character Selection Feature Elaboration

## Feature Overview
The Game Master (GM) should be able to quickly select different personas (NPCs, monsters, or other characters) to speak as during gameplay sessions. This feature will enhance the immersive experience by allowing the GM to seamlessly transition between different characters.

## Detailed Requirements

### User Interface

#### Quick Access Dropdown/Selector:
- Add a combobox menu or selector adjacent to the message input area
- Include an icon/button for the selector that visually indicates the current persona
- Show the currently selected persona name prominently

#### Two ways of Persona Creation:
- Allow GM to type in a non existing persona name and automatically create a new persona when GM sends a response
  - GM can send message from this persona immediately
  - GM can edit this persona later
- Allow GMs to create new personas on-the-fly with minimal required fields:
  - Name (required)
  - Avatar (optional, with default fallback)
  - Brief description (optional)

#### Autocomplete Suggestions:
- Implement an intelligent autocomplete system in the message input area
- Show suggestions as the GM types in real-time

#### Visual Differentiation:
- Messages sent as different personas should have distinct visual styling
- Include the persona's avatar, name, and potentially a small indicator showing it's GM-controlled

### Functionality

#### Persona Memory:
- Store previously used personas in server-side game_state
- Track usage frequency and recency for smart suggestions
- Allow favorite/pinning of commonly used personas

#### Default Persona:
- Always provide a "GM" default persona to revert to
- Allow setting a preferred default persona

#### Persona Management:
- Provide a simple interface to edit/delete created personas
- Allow import/export of persona collections

### Technical Implementation
1. Integration with the existing character management system (Character.py)
2. Extension to the game_state.json storage to include GM personas
3. Frontend changes to the chat interface in static/js/app.js and templates/index.html
4. Socketio events for real-time persona switching and message attribution

## User Experience Considerations
- The feature should be non-intrusive for GMs who don't need it
- Switching personas should take no more than 2 clicks or a quick text command
- The interface should be intuitive, requiring minimal learning
- Performance impact should be negligible, with no delays in message sending

This feature will significantly enhance the GM's ability to create immersive game sessions by quickly adopting different character voices without breaking the flow of gameplay.