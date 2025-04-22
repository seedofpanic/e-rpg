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
import sidebarStore from '../stores/SidebarStore';
import settingsStore from '../stores/SettingsStore';

interface SidebarProps {
  setActiveView: (view: string) => void;
  activeView: string;
}

const Sidebar: React.FC<SidebarProps> = observer(({ setActiveView, activeView }) => {
  const personaFileInputRef = useRef<HTMLInputElement>(null);
  const characterFileInputRef = useRef<HTMLInputElement>(null);
  
  // Handle scene cancel button click
  const handleCancelSceneClick = () => {
    sidebarStore.resetSceneText();
    sidebarStore.setIsEditingScene(false);
  };
  
  // Handle persona avatar click to open file upload
  const handlePersonaAvatarClick = () => {
    personaFileInputRef.current?.click();
  };
  
  // Handle character avatar click to open file upload
  const handleCharacterAvatarClick = (characterId: string) => {
    sidebarStore.setSelectedCharacterId(characterId);
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
    if (file && sidebarStore.selectedCharacterId) {
      const formData = new FormData();
      formData.append('avatar', file);
      formData.append('character_id', sidebarStore.selectedCharacterId);
      
      await fetch('/api/avatars', {
        method: 'POST',
        body: formData,
      });
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
        
        {!personaStore.currentPersona && personaStore.isLoading ? (
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
          {!sidebarStore.isEditingScene ? (
            <button 
              className="btn btn-sm btn-outline-light" 
              onClick={() => sidebarStore.updateScene()}
              disabled={!socketService.isConnected}
              title={!socketService.isConnected ? "Connect to server first" : "Edit scene"}
            >
              <i className="bi bi-pencil-fill"></i>
            </button>
          ) : (
            <div>
              <button 
                className="btn btn-sm btn-success me-1" 
                onClick={() => sidebarStore.updateScene()}
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
        
        {sidebarStore.isUpdatingScene && (
          <div className="alert alert-info py-1 px-2 mb-2 d-flex align-items-center">
            <div className="spinner-border spinner-border-sm me-2" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <small>Updating scene...</small>
          </div>
        )}
        
        {sidebarStore.isEditingScene ? (
          <textarea
            className="form-control form-control-sm bg-dark text-light border-secondary"
            value={sidebarStore.sceneText}
            onChange={(e) => sidebarStore.setSceneText(e.target.value)}
            rows={5}
            placeholder="Enter scene description..."
          />
        ) : (
          <p>{sidebarStore.sceneText || 'No active scene'}</p>
        )}
      </div>
      
      <div className="characters-list mt-4">
        <h5 className="mb-1">Party&nbsp;Members</h5>
        <small className="d-block text-light opacity-75 mb-2">(Click character to toggle active/inactive)</small>
        {!characterStore.charactersIds?.length ? (
          <p className="text-muted">No characters added yet</p>
        ) : (
          characterStore.charactersIds.map((characterId: string) => {
            const character = characterStore.characters[characterId];
            return (
            <button
              key={characterId}
              className={`${styles.characterItem} ${character.active ? 'active' : 'inactive'}`}
              onClick={() => characterStore.toggleCharacterActive(characterId)}
            >
              <img 
                src={formatAvatarUrl(character.avatar)} 
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
                  onClick={() => chatStore.openSkillRoll(character.id)}
                  title="Skill Rolls"
                >
                  <i className="bi bi-dice-6"></i>
                </div>
              )}
            </button>
          )
        })
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
        {socketService.isConnected ? (
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
            onClick={() => settingsStore.setIsSettingsOpen(true)}
          >
            <i className="bi bi-gear-fill me-2"></i>
            Settings
          </button>
        </div>
      </div>
      
      {/* Settings Modal */}
      <Settings isOpen={settingsStore.isSettingsOpen} onClose={() => settingsStore.setIsSettingsOpen(false)} />

      {/* Save Game Section */}
      <div className={`${styles.saveGameSection} mt-4`}>
        <h5 className="mb-2">Game State</h5>
        <SaveFileInput className={styles.sidebarSaveInput} darkMode={true} />
      </div>
    </div>
  );
});

export default Sidebar; 