# E-RPG UI

A modern React-based UI for the E-RPG (Enhanced RPG) campaign manager, built with Vite, MobX, and TypeScript.

## Features

- Real-time chat interface with Socket.IO
- Character management with avatars
- Scene configuration and management
- Message typing indicators
- Support for various message types (system, character, GM, etc.)
- Modern UI with responsive design

## Screenshots

(Add screenshots here once the app is running)

## Prerequisites

- Node.js 16.x or later
- npm or yarn
- Running E-RPG backend server (Flask)
- Conda environment (recommended)

## Installation

### Using Conda (Recommended)

1. Run the setup script to create the conda environment and install dependencies:

```bash
setup.bat
```

2. Start the development server:

```bash
start_dev.bat
```

### Manual Installation

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

The application will be available at http://localhost:5173

## Building for Production

To create a production build:

```bash
npm run build
# Or use the batch file
build.bat
```

The built files will be in the `dist` directory and can be served by any static file server.

## Project Structure

- `src/components/` - React components
  - `Sidebar.tsx` - Left sidebar with character list
  - `ChatArea.tsx` - Main chat area with messages and input
  - `ChatMessage.tsx` - Individual message component
- `src/stores/` - MobX state management
  - `ChatStore.ts` - Main store for messages and UI state
- `src/services/` - API and utility services
  - `api.ts` - Backend API communication
- `src/styles/` - CSS modules
  - `main.module.css` - Styled components
- `src/assets/` - Static assets like images

## Technologies Used

- React 18
- TypeScript
- Vite
- MobX for state management
- Socket.IO for real-time communication
- Bootstrap 5 for UI components

## Future Improvements

- Add modal dialogs for settings and configuration
- Implement character creation and management interface
- Add voice input support
- Add skill roll interface
- Implement theming and customization options

## License

MIT
