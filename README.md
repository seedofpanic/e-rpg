# E-RPG
E-RPG is an innovative application that enables users to play Game Masters in Role Playing campaigns where AI agents act as players. Each AI agent is equipped with unique prompts that define their character's personality, motivations, and behavior patterns.

## Interface
The application features a chat-based interface where each character, including the AI-controlled ones, is represented by a distinctive avatar. This design creates an immersive tabletop RPG experience in a digital environment. The system supports voice input via microphone, allowing for natural language interaction between the Game Master and the AI players.

## Technologies
- **Python**: Powers the backend logic including AI interaction and game mechanics
- **Google Gemini**: Provides the large language model capabilities that drive the AI players
- **Flask & Socket.IO**: Creates a real-time web application for seamless interaction
- **Web interface**: Delivers an accessible front-end experience through browser-based interaction
- **Sentence Transformers**: Used for semantic text processing and understanding
- **React**: Frontend UI built with React and TypeScript

## Key Features
- AI-driven players with unique character personalities
- Chat-based gameplay with visual character representation
- Voice input capabilities for natural game mastering
- Real-time narrative development and character interaction
- Adaptable AI responses to player decisions and game events
- Character inventory and gold management
- Game Master persona customization
- Game state saving and loading

## Use Cases
- Solo RPG campaigns for players without a regular group
- Testing campaign narratives before running them with human players
- Learning game mastering techniques with responsive AI players
- Creating unique interactive storytelling experiences

## Installation and Setup

### Prerequisites
- Python 3.11 or higher
- Google Gemini API key
- Conda (Miniconda or Anaconda)
- Node.js 18 or higher (for UI development)

### Installation Steps
1. Clone this repository:
   ```
   git clone https://github.com/yourname/e-rpg.git
   cd e-rpg
   ```

2. Create a conda environment using the provided environment file:
   ```
   conda env create -f environment.yml
   conda activate develop
   ```

3. Create a `.env` file based on the example:
   ```
   cp .env.example .env
   ```

4. Edit the `.env` file and add your Google Gemini API key.

### Installing PyTorch with CUDA Support
To enable GPU acceleration for deep learning features, install PyTorch with CUDA support:

```
pip uninstall -y torch torchvision torchaudio
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

Verify the installation:
```
python -c "import torch; print('CUDA available:', torch.cuda.is_available()); print('PyTorch version:', torch.__version__)"
```

This should output `CUDA available: True` if your GPU is properly detected.

### Running the Application

#### Backend Server
1. Start the Flask application:
   ```
   python app.py
   ```

2. The server will start on http://localhost:5000

#### UI Development (Optional)
If you want to run the UI in development mode with hot-reloading:

1. Navigate to the UI directory:
   ```
   cd ui
   ```

2. Install Node.js dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm start
   ```

4. The development UI will be available at http://localhost:5173 and will connect to the backend at port 5000

#### Building the UI for Production
To build the UI for production deployment:

1. Navigate to the UI directory:
   ```
   cd ui
   ```

2. Build the production version:
   ```
   npm run build
   ```

3. The built files will be available in the `ui/dist` directory and can be served by the Flask application