import React, { useEffect, useState, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import chatStore from '../stores/ChatStore';
import characterStore, { Character } from '../stores/CharacterStore';
import personaStore from '../stores/PersonaStore';
import socketService from '../services/api';
import Settings from './Settings';
import SkillRoll from './SkillRoll';
import SaveFileInput from './SaveFileInput';
import styles from '../styles/main.module.css';
import '../styles/SaveFileInput.css';

interface SidebarProps {
  setActiveView: (view: string) => void;
  activeView: string;
}

const Sidebar: React.FC<SidebarProps> = observer(({ setActiveView, activeView }) => {
  const { currentScene, isConnected } = chatStore;
  const socket = chatStore.getSocket();
  
  // State for scene editing
  const [isEditingScene, setIsEditingScene] = useState(false);
  const [sceneText, setSceneText] = useState('');
  const [isUpdatingScene, setIsUpdatingScene] = useState(false);
  
  // State for settings modal
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Refs for file input
  const personaFileInputRef = useRef<HTMLInputElement>(null);
  const characterFileInputRef = useRef<HTMLInputElement>(null);
  
  // State to track which character is selected for avatar upload
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('');
  
  // Use try-catch to prevent rendering errors
  let characters: Character[] = [];
  try {
    characters = characterStore.getAllCharacters() || [];
  } catch (err) {
    console.error('Error getting characters:', err);
  }
  
  // Request characters data and scene data on initial load
  useEffect(() => {
    if (socket && isConnected) {
      console.log('Socket connected, ready to receive character data');
      
      // Request current scene
      socket.emit('update_game_state', {
        requestId: `init-${Date.now()}`,
      });
    }
  }, [socket, isConnected]);
  
  // Update scene text when currentScene changes
  useEffect(() => {
    if (currentScene && currentScene.description) {
      setSceneText(currentScene.description);
    }
  }, [currentScene]);
  
  // Listen for scene update events
  useEffect(() => {
    if (socket) {
      socket.on('scene_updating', (data: { status: string, message?: string }) => {
        if (data.status === 'started') {
          setIsUpdatingScene(true);
        } else if (data.status === 'completed' || data.status === 'error') {
          setIsUpdatingScene(false);
        }
      });
    }
    
    return () => {
      if (socket) {
        socket.off('scene_updating');
      }
    };
  }, [socket]);
  
  // Handle scene edit button click
  const handleEditSceneClick = () => {
    setIsEditingScene(true);
  };
  
  // Handle scene save button click
  const handleSaveSceneClick = () => {
    if (socket) {
      socket.emit('update_game_state', {
        scene: sceneText,
        requestId: Date.now().toString()
      });
      
      setIsEditingScene(false);
    }
  };
  
  // Handle scene cancel button click
  const handleCancelSceneClick = () => {
    setIsEditingScene(false);
    // Reset to current scene description
    if (currentScene && currentScene.description) {
      setSceneText(currentScene.description);
    }
  };
  
  // Handle persona avatar click to open file upload
  const handlePersonaAvatarClick = () => {
    personaFileInputRef.current?.click();
  };
  
  // Handle character avatar click to open file upload
  const handleCharacterAvatarClick = (characterId: string) => {
    setSelectedCharacterId(characterId);
    characterFileInputRef.current?.click();
  };
  
  // Helper function to format avatar URL
  const formatAvatarUrl = (avatarPath: string, timestamp?: number) => {
    // If it's null or undefined, return default avatar
    if (!avatarPath) {
      return '/images/avatar.jpg';
    }
    
    // If it's a full URL (starts with http)
    if (avatarPath.startsWith('http')) {
      return timestamp ? `${avatarPath}?t=${timestamp}` : avatarPath;
    }
    
    // If it already has a leading slash
    if (avatarPath.startsWith('/')) {
      return timestamp ? `${avatarPath}?t=${timestamp}` : avatarPath;
    }
    
    // If it starts with "images/" but no leading slash
    if (avatarPath.startsWith('images/')) {
      return timestamp ? `/${avatarPath}?t=${timestamp}` : `/${avatarPath}`;
    }
    
    // For any other format, assume it's a relative path and add the /images/ prefix
    return timestamp ? `/images/${avatarPath}?t=${timestamp}` : `/images/${avatarPath}`;
  };
  
  // Handle persona avatar file change
  const handlePersonaAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && personaStore.currentPersona) {
      const formData = new FormData();
      formData.append('avatar', file);
      formData.append('persona_id', personaStore.currentPersona.id);
      
      try {
        const response = await fetch('/api/upload_persona_avatar', {
          method: 'POST',
          body: formData,
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Avatar uploaded:', data);
          // Update the avatar in the store
          await personaStore.updatePersona(personaStore.currentPersona.id, { 
            avatar: data.avatar_url 
          });
          
          // Force refresh avatar in all components
          personaStore.refreshAvatar(personaStore.currentPersona.id);
        }
      } catch (error) {
        console.error('Error uploading avatar:', error);
      }
    }
  };
  
  // Handle character avatar file change
  const handleCharacterAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && selectedCharacterId) {
      const formData = new FormData();
      formData.append('avatar', file);
      formData.append('character_id', selectedCharacterId);
      
      try {
        const response = await fetch('/api/avatars', {
          method: 'POST',
          body: formData,
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Character avatar uploaded:', data);
          
          // Force an update with the new avatar path
          if (data.status === 'success' && data.avatar_path) {
            // Clone the characters object
            const chars = {...characterStore.characters};
            if (chars[selectedCharacterId]) {
              // Update the character with the new avatar path and timestamp
              chars[selectedCharacterId] = {
                ...chars[selectedCharacterId],
                avatar: data.avatar_path,
                _avatarTimestamp: Date.now()
              };
              // Update the store to refresh the UI
              characterStore.handleCharactersUpdated(chars);
              
              // Create a new image element to preload the new avatar
              const img = new Image();
              img.src = formatAvatarUrl(data.avatar_path, Date.now());
            }
          }
          
          // Reset selected character
          setSelectedCharacterId('');
        }
      } catch (error) {
        console.error('Error uploading character avatar:', error);
      }
    }
  };
  
  return (
    <div className={styles.sidebar}>
      <div className={styles.logoContainer}>
        <h1>E-RPG</h1>
        <div className={styles.tagline}>Enhanced RPG Campaign Manager</div>
      </div>
      
      {/* Current GM Persona Display */}
      <div className={styles.currentPersona}>
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h5 className="mb-0">GM Persona</h5>
        </div>
        
        {personaStore.isLoading ? (
          <div className="d-flex align-items-center">
            <div className="spinner-border spinner-border-sm me-2" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <small>Loading persona...</small>
          </div>
        ) : personaStore.currentPersona ? (
          <div className={styles.personaPreview}>
            <img 
              src={formatAvatarUrl(personaStore.currentPersona.avatar, personaStore.currentPersona.avatarTimestamp)} 
              alt={personaStore.currentPersona.name} 
              className={styles.personaAvatar} 
              onClick={handlePersonaAvatarClick}
              style={{ cursor: 'pointer' }}
              title="Click to change avatar"
            />
            <div className={styles.personaInfo}>
              <strong>{personaStore.currentPersona.name}</strong>
              <small>{personaStore.currentPersona.description}</small>
            </div>
            
            {/* Hidden file input for persona avatar */}
            <input
              type="file"
              ref={personaFileInputRef}
              style={{ display: 'none' }}
              accept="image/*"
              onChange={handlePersonaAvatarChange}
            />
          </div>
        ) : (
          <div className="alert alert-warning">No GM persona selected</div>
        )}
      </div>
      
      <div className={styles.currentScene}>
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h5 className="mb-0">Current Scene</h5>
          {!isEditingScene ? (
            <button 
              className="btn btn-sm btn-outline-light" 
              onClick={handleEditSceneClick}
              disabled={!isConnected}
              title={!isConnected ? "Connect to server first" : "Edit scene"}
            >
              <i className="bi bi-pencil-fill"></i>
            </button>
          ) : (
            <div>
              <button 
                className="btn btn-sm btn-success me-1" 
                onClick={handleSaveSceneClick}
                title="Save changes"
              >
                <i className="bi bi-check-lg"></i>
              </button>
              <button 
                className="btn btn-sm btn-outline-light" 
                onClick={handleCancelSceneClick}
                title="Cancel editing"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
          )}
        </div>
        
        {isUpdatingScene && (
          <div className="alert alert-info py-1 px-2 mb-2 d-flex align-items-center">
            <div className="spinner-border spinner-border-sm me-2" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <small>Updating scene...</small>
          </div>
        )}
        
        {isEditingScene ? (
          <textarea
            className="form-control form-control-sm bg-dark text-light border-secondary"
            value={sceneText}
            onChange={(e) => setSceneText(e.target.value)}
            rows={5}
            placeholder="Enter scene description..."
          />
        ) : (
          <p>{(currentScene && currentScene.description) || 'No active scene'}</p>
        )}
      </div>
      
      <div className="characters-list mt-4">
        <h5 className="mb-1">Party&nbsp;Members</h5>
        <small className="d-block text-light opacity-75 mb-2">(Click character to toggle active/inactive)</small>
        {characterStore.isLoading ? (
          <p className="text-muted">Loading characters...</p>
        ) : !characters || characters.length === 0 ? (
          <p className="text-muted">No characters added yet</p>
        ) : (
          characters.map((character: Character) => (
            <button
              key={character.id}
              className={`${styles.characterItem} ${character.active ? 'active' : 'inactive'}`}
              onClick={() => characterStore.toggleCharacterActive(character.id)}
            >
              <img 
                src={formatAvatarUrl(character.avatar, character._avatarTimestamp)} 
                alt={character.name} 
                className={`${styles.avatar} ${character.is_leader ? styles.leaderAvatar : ''}`} 
                onClick={(e) => {
                  e.stopPropagation();
                  handleCharacterAvatarClick(character.id);
                }}
                title="Click to change avatar"
                style={{ cursor: 'pointer' }}
              />
              <div className="character-info">
                <div className="character-name">{character.name}</div>
                <small className={`status ${character.active ? 'text-success' : 'text-secondary'}`}>
                  {character.active ? 'Active' : 'Inactive'}
                </small>
              </div>
              {character.active && (
                <div 
                  className={styles.rollButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    
                    // Create a modal dialog for skill rolls
                    const modal = document.createElement('div');
                    modal.style.position = 'fixed';
                    modal.style.zIndex = '1000';
                    modal.style.top = '0';
                    modal.style.left = '0';
                    modal.style.right = '0';
                    modal.style.bottom = '0';
                    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                    modal.style.display = 'flex';
                    modal.style.justifyContent = 'center';
                    modal.style.alignItems = 'center';
                    
                    const modalContent = document.createElement('div');
                    modalContent.style.backgroundColor = '#fff';
                    modalContent.style.borderRadius = '8px';
                    modalContent.style.padding = '20px';
                    modalContent.style.maxWidth = '90%';
                    modalContent.style.width = '400px';
                    modalContent.style.maxHeight = '80vh';
                    modalContent.style.overflow = 'auto';
                    
                    const header = document.createElement('h3');
                    header.textContent = `Skill Rolls for ${character.name}`;
                    header.style.marginBottom = '20px';
                    
                    modalContent.appendChild(header);
                    modal.appendChild(modalContent);
                    document.body.appendChild(modal);
                    
                    // Close modal when clicking outside content
                    modal.addEventListener('click', (evt) => {
                      if (evt.target === modal) {
                        document.body.removeChild(modal);
                      }
                    });
                    
                    // Create each skill category
                    const categories = {
                      strength: ['athletics'],
                      dexterity: ['acrobatics', 'sleight_of_hand', 'stealth'],
                      intelligence: ['arcana', 'history', 'investigation', 'nature', 'religion'],
                      wisdom: ['animal_handling', 'insight', 'medicine', 'perception', 'survival'],
                      charisma: ['deception', 'intimidation', 'performance', 'persuasion']
                    };
                    
                    Object.entries(categories).forEach(([category, skills]) => {
                      const categoryDiv = document.createElement('div');
                      categoryDiv.style.marginBottom = '15px';
                      
                      const categoryTitle = document.createElement('h4');
                      categoryTitle.textContent = category.charAt(0).toUpperCase() + category.slice(1);
                      categoryTitle.style.fontSize = '16px';
                      categoryTitle.style.marginBottom = '10px';
                      
                      const skillsDiv = document.createElement('div');
                      skillsDiv.style.display = 'flex';
                      skillsDiv.style.flexWrap = 'wrap';
                      skillsDiv.style.gap = '8px';
                      
                      skills.forEach(skill => {
                        const skillButton = document.createElement('button');
                        skillButton.textContent = skill.split('_')
                          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                          .join(' ');
                        skillButton.style.padding = '6px 12px';
                        skillButton.style.borderRadius = '4px';
                        skillButton.style.border = '1px solid #ddd';
                        skillButton.style.cursor = 'pointer';
                        
                        // Add a click handler to roll the skill
                        skillButton.addEventListener('click', () => {
                          // Get a fresh reference to the socket each time
                          const socketRef = socketService.getSocket();
                          if (socketRef) {
                            socketRef.emit('roll_skill', {
                              character_id: character.id,
                              skill_name: skill
                            });
                            document.body.removeChild(modal);
                          }
                        });
                        
                        skillsDiv.appendChild(skillButton);
                      });
                      
                      categoryDiv.appendChild(categoryTitle);
                      categoryDiv.appendChild(skillsDiv);
                      modalContent.appendChild(categoryDiv);
                    });
                  }}
                  title="Skill Rolls"
                >
                  <i className="bi bi-dice-6"></i>
                </div>
              )}
            </button>
          ))
        )}
        
        {/* Hidden file input for character avatar */}
        <input
          type="file"
          ref={characterFileInputRef}
          style={{ display: 'none' }}
          accept="image/*"
          onChange={handleCharacterAvatarChange}
        />
      </div>
      
      <div className="connection-status mt-2">
        {isConnected ? (
          <small className="text-success">Connected to server</small>
        ) : (
          <small className="text-danger">Disconnected from server</small>
        )}
      </div>
      
      <div className="sidebar-controls mt-4">
        <button 
          className={`btn ${styles.btnSecondary} w-100 mb-2 ${activeView === 'characters' ? styles.active : ''}`}
          onClick={() => setActiveView('characters')}
        >
          <i className="bi bi-people-fill me-2"></i>
          Character Management
        </button>
        
        <button 
          className={`btn ${styles.btnSecondary} w-100 mb-2 ${activeView === 'inventory' ? styles.active : ''}`}
          onClick={() => setActiveView('inventory')}
        >
          <i className="bi bi-backpack-fill me-2"></i>
          Inventory Management
        </button>
        
        <button 
          className={`btn ${styles.btnSecondary} w-100 mb-2 ${activeView === 'chat' ? styles.active : ''}`}
          onClick={() => setActiveView('chat')}
        >
          <i className="bi bi-chat-dots-fill me-2"></i>
          Chat
        </button>
        
        <div className="d-flex gap-2 mt-3">
          <button 
            className={`btn ${styles.btnOutlineLight} w-100`}
            onClick={() => setIsSettingsOpen(true)}
          >
            <i className="bi bi-gear-fill me-2"></i>
            Settings
          </button>
        </div>
      </div>
      
      {/* Settings Modal */}
      <Settings isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* Save Game Section */}
      <div className={`${styles.saveGameSection} mt-4`}>
        <h5 className="mb-2">Game State</h5>
        <SaveFileInput className={styles.sidebarSaveInput} darkMode={true} />
      </div>
    </div>
  );
});

export default Sidebar; 