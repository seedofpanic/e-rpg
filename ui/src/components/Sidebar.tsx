import React, { useRef } from 'react';
import { observer } from 'mobx-react-lite';
import chatStore from '../stores/ChatStore';
import characterStore from '../stores/CharacterStore';
import personaStore from '../stores/PersonaStore';
import socketService from '../services/api';
import Settings from './Settings';
import sidebarStore from '../stores/SidebarStore';
import settingsStore from '../stores/SettingsStore';
import styles from '../styles/main.module.css';
import '../styles/SaveFileInput.css';
import SidebarHeader from './sidebar/SidebarHeader';
import PersonaDisplay from './sidebar/PersonaDisplay';
import SceneEditor from './sidebar/SceneEditor';
import CharacterList from './sidebar/CharacterList';
import ConnectionStatus from './sidebar/ConnectionStatus';
import NavigationButtons from './sidebar/NavigationButtons';
import SaveGameSection from './sidebar/SaveGameSection';

interface SidebarProps {
  setActiveView: (view: string) => void;
  activeView: string;
}

const Sidebar: React.FC<SidebarProps> = observer(({ setActiveView, activeView }) => {
  const personaFileInputRef = useRef<HTMLInputElement>(null);
  const characterFileInputRef = useRef<HTMLInputElement>(null);
  
  // Handle persona avatar file change
  const handlePersonaAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && personaStore.currentPersona) {
      const formData = new FormData();
      formData.append('avatar', file);
      formData.append('persona_id', personaStore.currentPersona.id);
      
      try {
        await fetch('/api/upload_persona_avatar', {
          method: 'POST',
          body: formData,
        });
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
  
  // Handle character avatar click to open file upload
  const handleCharacterAvatarClick = (characterId: string) => {
    sidebarStore.setSelectedCharacterId(characterId);
    characterFileInputRef.current?.click();
  };
  
  // Handle persona avatar click to open file upload
  const handlePersonaAvatarClick = () => {
    personaFileInputRef.current?.click();
  };
  
  return (
    <div className={styles.sidebar}>
      <SidebarHeader />
      
      <PersonaDisplay 
        currentPersona={personaStore.currentPersona}
        isLoading={personaStore.isLoading}
        onAvatarClick={handlePersonaAvatarClick}
      />
      
      <SceneEditor 
        sceneText={sidebarStore.sceneText}
        isEditingScene={sidebarStore.isEditingScene}
        isUpdatingScene={sidebarStore.isUpdatingScene}
        onSceneTextChange={(text: string) => sidebarStore.setSceneText(text)}
        onUpdateScene={() => sidebarStore.updateScene()}
        onCancelEdit={() => {
          sidebarStore.resetSceneText();
          sidebarStore.setIsEditingScene(false);
        }}
        isConnected={socketService.isConnected}
      />
      
      <CharacterList 
        characters={characterStore.characters}
        charactersIds={characterStore.charactersIds}
        onAvatarClick={handleCharacterAvatarClick}
        onToggleActive={(id: string) => characterStore.toggleCharacterActive(id)}
        onOpenSkillRoll={(id: string) => chatStore.openSkillRoll(id)}
      />
      
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={personaFileInputRef}
        style={{ display: 'none' }}
        accept="image/*"
        onChange={handlePersonaAvatarChange}
      />
      
      <input
        type="file"
        ref={characterFileInputRef}
        style={{ display: 'none' }}
        accept="image/*"
        onChange={handleCharacterAvatarChange}
      />
      
      <ConnectionStatus isConnected={socketService.isConnected} />
      
      <NavigationButtons 
        activeView={activeView}
        onViewChange={setActiveView}
        onOpenSettings={() => settingsStore.setIsSettingsOpen(true)}
      />
      
      {/* Settings Modal */}
      <Settings 
        isOpen={settingsStore.isSettingsOpen} 
        onClose={() => settingsStore.setIsSettingsOpen(false)} 
      />

      <SaveGameSection />
    </div>
  );
});

export default Sidebar; 