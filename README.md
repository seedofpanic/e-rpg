# E-RPG
E-RPG is an innovative application that enables users to serve as Game Masters in Role Playing campaigns where AI agents act as players. Each AI agent is equipped with unique prompts that define their character's personality, motivations, and behavior patterns.

## Interface
The application features a chat-based interface where each character, including the AI-controlled ones, is represented by a distinctive avatar. This design creates an immersive tabletop RPG experience in a digital environment. The system supports voice input via microphone, allowing for natural language interaction between the Game Master and the AI players.

## Technologies
- **Python**: Powers the backend logic including AI interaction and game mechanics
- **Google Gemini**: Provides the large language model capabilities that drive the AI players
- **Flask & Socket.IO**: Creates a real-time web application for seamless interaction
- **Web interface**: Delivers an accessible front-end experience through browser-based interaction

## Key Features
- AI-driven players with unique character personalities
- Chat-based gameplay with visual character representation
- Voice input capabilities for natural game mastering
- Real-time narrative development and character interaction
- Adaptable AI responses to player decisions and game events

## Use Cases
- Solo RPG campaigns for players without a regular group
- Testing campaign narratives before running them with human players
- Learning game mastering techniques with responsive AI players
- Creating unique interactive storytelling experiences

## Installation and Setup

### Prerequisites
- Python 3.8 or higher
- Google Gemini API key
- Conda (Miniconda or Anaconda)

### Installation Steps
1. Clone this repository:
   ```
   git clone https://github.com/yourusername/e-rpg.git
   cd e-rpg
   ```

2. Create a conda environment and activate it:
   ```
   conda create -n e-rpg python=3.8
   conda activate e-rpg
   ```

3. Install the dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Install faiss using conda:
   ```
   conda install -c conda-forge faiss-gpu
   ```

5. Create a `.env` file based on the example:
   ```
   cp .env.example .env
   ```

6. Edit the `.env` file and add your Google Gemini API key.

### Running the Application
1. Start the Flask application:
   ```
   flask run --no-debugger --no-reload
   ```

   Alternatively, you can run directly with Python:
   ```
   python app.py
   ```

2. Open a web browser and navigate to:
   ```
   http://localhost:5000
   ```

## Creating Character Avatars
Place character avatar images in the `ui/public/images/` directory. Make sure to include:
- `gm.png` for the Game Master
- `system.png` for system messages
- Character avatar images that match the avatar filenames in `app.py`

## Customizing Characters
Edit the `characters` dictionary in `app.py` to create unique character personalities, backgrounds, and classes.