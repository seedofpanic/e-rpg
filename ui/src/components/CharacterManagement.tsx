import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import characterStore from '../stores/CharacterStore';
import '../styles/CharacterManagement.css';
import CharacterFormModal from './CharacterFormModal';

const CharacterManagement: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const characters = characterStore.getAllCharacters();
  
  const handleToggleActive = (characterId: string) => {
    characterStore.toggleCharacterActive(characterId);
  };
  
  const handleEditCharacter = (characterId: string) => {
    setIsModalOpen(true);
    characterStore.setEditCharacterId(characterId);
  };
  
  const handleDeleteCharacter = async (characterId: string) => {
    characterStore.deleteCharacter(characterId);
  };
  
  const handleAddCharacter = () => {
    setIsModalOpen(true);
    characterStore.clearEditCharacter();
  };
  
  return (
    <div className="character-management">
      <div className="character-management-header">
        <h2>Character Management</h2>
        <button className="add-character-btn" onClick={handleAddCharacter}>
          <i className="bi bi-plus-circle me-2"></i> Add Character
        </button>
      </div>
      
      <div className="character-list">
        {characters.length === 0 && !characterStore.isLoading ? (
          <div className="no-characters">
            No characters found. Add one to get started.
          </div>
        ) : (
          characters.map(character => (
            <div key={character.id} className={`character-item ${!character.active ? 'character-inactive' : ''}`}>
              <div className="character-avatar">
                <img 
                  src={character.avatar ? `/images/${character.avatar}` : '/images/avatar.jpg'} 
                  alt={character.name}
                  className="rounded-circle" 
                />
                {character.is_leader && <div className="leader-badge" title="Party Leader"><i className="bi bi-star-fill"></i></div>}
              </div>
              
              <div className="character-info">
                <h4>{character.name}</h4>
                <div className="character-details">
                  {character.race && <span className="character-race">{character.race}</span>}
                  {character.class && <span className="character-class">{character.class}</span>}
                </div>
              </div>
              
              <div className="character-actions">
                <button 
                  className="toggle-active-btn" 
                  onClick={() => handleToggleActive(character.id)}
                  title={character.active ? "Deactivate Character" : "Activate Character"}
                >
                  <i className={`bi ${character.active ? 'bi-toggle-on text-success' : 'bi-toggle-off text-secondary'}`}></i>
                </button>
                
                <button 
                  className="edit-character-btn" 
                  onClick={() => handleEditCharacter(character.id)}
                  title="Edit Character"
                >
                  <i className="bi bi-pencil"></i>
                </button>
                
                <button 
                  className="delete-character-btn" 
                  onClick={() => handleDeleteCharacter(character.id)}
                  title="Delete Character"
                >
                  <i className="bi bi-trash"></i>
                </button>
              </div>
            </div>
          ))
        )}
        
        {characterStore.isLoading && (
          <div className="loading-characters">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p>Loading characters...</p>
          </div>
        )}
      </div>
      
      {isModalOpen && (
        <CharacterFormModal 
          onClose={() => setIsModalOpen(false)}
        />
      )}
      
      <button 
        className="floating-add-btn" 
        onClick={handleAddCharacter}
        aria-label="Add Character"
      >
        <i className="bi bi-plus-lg"></i>
      </button>
    </div>
  );
};

export default observer(CharacterManagement); 