import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import chatStore from '../stores/ChatStore';
import styles from '../styles/main.module.css';
import SaveFileInput from './SaveFileInput';
import '../styles/SaveFileInput.css';

type SettingsProps = {
  isOpen: boolean;
  onClose: () => void;
};

const Settings: React.FC<SettingsProps> = observer(({ isOpen, onClose }) => {
  const socket = chatStore.getSocket();
  
  // State for settings
  const [apiKey, setApiKey] = useState<string>('');
  const [saveFilePath, setSaveFilePath] = useState<string>(chatStore.saveFilePath || '');
  const [loreText, setLoreText] = useState<string>(chatStore.baseLore || '');
  const [autosaveEnabled, setAutosaveEnabled] = useState<boolean>(chatStore.autosaveEnabled);
  const [autosaveThreshold, setAutosaveThreshold] = useState<number>(chatStore.autosaveThreshold);
  const [isDebugMode, setIsDebugMode] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  
  // Debug logging effect
  useEffect(() => {
    console.log('Settings values:', {
      baseLore: chatStore.baseLore,
      saveFilePath: chatStore.saveFilePath,
      autosaveEnabled: chatStore.autosaveEnabled,
      autosaveThreshold: chatStore.autosaveThreshold
    });
  }, [chatStore.baseLore, chatStore.saveFilePath, chatStore.autosaveEnabled, chatStore.autosaveThreshold]);
  
  // Effect to update lore text when baseLore changes
  useEffect(() => {
    console.log('Base lore changed:', chatStore.baseLore);
    setLoreText(chatStore.baseLore || '');
  }, [chatStore.baseLore]);
  
  // Explicitly request settings when modal opens
  useEffect(() => {
    if (isOpen && socket) {
      console.log("Settings modal opened, requesting settings data");
      
      // Request settings from backend
      socket.emit('get_autosave_settings');
      socket.emit('get_save_file_path');
      socket.emit('get_autosave_status');
      
      // Request latest game state to get current lore
      chatStore.requestInitialState();
      
      // Initialize from store data
      setSaveFilePath(chatStore.saveFilePath || '');
      setLoreText(chatStore.baseLore || '');
      setAutosaveEnabled(chatStore.autosaveEnabled);
      setAutosaveThreshold(chatStore.autosaveThreshold);
      
      // Setup listeners
      socket.on('autosave_status', (data: { enabled: boolean; debug_mode: boolean; threshold?: number }) => {
        console.log('Received autosave_status:', data);
        setAutosaveEnabled(data.enabled);
        setIsDebugMode(data.debug_mode);
        
        // Backend might return threshold directly or include it in a nested settings object
        if (data.threshold) {
          setAutosaveThreshold(data.threshold);
        }
      });
      
      // Direct response from get_autosave_settings
      socket.on('autosave_settings', (data: any) => {
        console.log('Received autosave_settings:', data);
        if (data?.enabled !== undefined) {
          setAutosaveEnabled(data.enabled);
        }
        if (data?.threshold) {
          setAutosaveThreshold(data.threshold);
        }
      });
      
      // When getting autosave settings, also listen for response
      socket.on('response', (data: any) => {
        console.log('Received response:', data);
        if (data?.payload?.enabled !== undefined) {
          setAutosaveEnabled(data.payload.enabled);
        }
        if (data?.payload?.threshold) {
          setAutosaveThreshold(data.payload.threshold);
        }
        if (data?.payload?.filepath) {
          setSaveFilePath(data.payload.filepath);
        }
        // Check for lore in game_state
        if (data?.payload?.game_state?.lore) {
          setLoreText(data.payload.game_state.lore);
        }
      });
      
      socket.on('save_file_path', (data: { path?: string; filepath?: string }) => {
        console.log('Received save_file_path:', data);
        // Check both 'path' and 'filepath' formats since the backend might send either
        const filePath = data.filepath || data.path;
        if (filePath) {
          setSaveFilePath(filePath);
        }
      });
      
      // Listen for scene updates which contain lore
      socket.on('scene_updated', (data: any) => {
        console.log('Received scene_updated in Settings:', data);
        if (data && data.lore) {
          setLoreText(data.lore);
        }
      });
      
      // From looking at app.py, the API can also return with just a filepath property
      // This is a direct handler for that case
      const handleSaveFilePathResponse = (data: any) => {
        console.log('Handling save file path response:', data);
        if (data && data.filepath) {
          setSaveFilePath(data.filepath);
        }
      };
      
      // Make a direct fetch call to get the save file path
      fetch('/api/get_save_file_path')
        .then(response => response.json())
        .then(handleSaveFilePathResponse)
        .catch(error => console.error('Error fetching save file path:', error));
    }
    
    return () => {
      if (socket) {
        socket.off('autosave_status');
        socket.off('autosave_settings');
        socket.off('save_file_path');
        socket.off('response');
        socket.off('scene_updated');
      }
    };
  }, [socket, isOpen, chatStore.saveFilePath, chatStore.baseLore, chatStore.autosaveEnabled, chatStore.autosaveThreshold, chatStore.requestInitialState]);
  
  // Save settings
  const handleSaveSettings = () => {
    if (socket) {
      setIsSaving(true);
      
      // Update API key
      socket.emit('update_api_key', { api_key: apiKey });
      
      // Update autosave settings
      socket.emit('update_game_state', { 
        autosave: {
          enabled: autosaveEnabled,
          threshold: autosaveThreshold
        }
      });
      
      // Update lore
      chatStore.updateLore(loreText);
      
      setTimeout(() => {
        setIsSaving(false);
        onClose();
      }, 500);
    }
  };
  
  // Handle save game action
  const handleSaveGame = () => {
    chatStore.saveGame(saveFilePath);
  };
  
  // Handle load game action
  const handleLoadGame = () => {
    chatStore.loadGame(saveFilePath);
  };
  
  // Show reset confirmation modal
  const showResetConfirmation = () => {
    const confirmReset = window.confirm(
      'Are you sure you want to reset the game? This will clear all dialogue history and character memories.\n\nThis action cannot be undone!'
    );
    
    if (confirmReset) {
      chatStore.resetGame();
      onClose();
    }
  };
  
  // If not open, don't render
  if (!isOpen) return null;
  
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h5>Settings</h5>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Close"></button>
        </div>
        
        <div className={styles.modalBody}>
          {/* API Key Settings */}
          <div className="mb-3">
            <label htmlFor="gemini-api-key" className="form-label">Gemini API Key</label>
            <input 
              type="text" 
              className="form-control" 
              id="gemini-api-key" 
              value={apiKey} 
              onChange={(e) => setApiKey(e.target.value)} 
              placeholder="Enter your Gemini API key"
            />
            <div className="form-text">Your API key is stored securely and used for AI processing.</div>
          </div>
          
          {/* Lore Settings */}
          <div className="mb-3">
            <label htmlFor="lore-text" className="form-label">Base Campaign Lore</label>
            <textarea 
              className="form-control" 
              id="lore-text" 
              rows={5} 
              value={loreText} 
              onChange={(e) => setLoreText(e.target.value)}
            />
            <div className="form-text">Enter the foundational lore for your campaign world.</div>
          </div>
          
          {/* Game State Management */}
          <div className="mb-3">
            <label className="form-label">Game State Management</label>
            <SaveFileInput darkMode={true} />
            <div className="form-text">The game state will be automatically saved to this file and remembered between sessions.</div>
          </div>
          
          {/* Autosave Settings */}
          <div className="mb-3">
            <label className="form-label">Autosave Settings</label>
            <div className="form-check form-switch mb-2">
              <input 
                className="form-check-input" 
                type="checkbox" 
                role="switch" 
                id="autosave-enabled" 
                checked={autosaveEnabled} 
                onChange={(e) => setAutosaveEnabled(e.target.checked)} 
                disabled={isDebugMode}
              />
              <label className="form-check-label" htmlFor="autosave-enabled">
                Enable Autosave
              </label>
            </div>
            {isDebugMode && (
              <div className="alert alert-warning py-1 px-2 mb-2">
                <small>Autosave is disabled in debug mode</small>
              </div>
            )}
            <div className="input-group">
              <span className="input-group-text">Autosave every</span>
              <input 
                type="number" 
                className="form-control" 
                id="autosave-threshold" 
                value={autosaveThreshold} 
                onChange={(e) => setAutosaveThreshold(parseInt(e.target.value))} 
                min={1} 
                max={60} 
                disabled={isDebugMode || !autosaveEnabled}
              />
              <span className="input-group-text">minutes</span>
            </div>
            <div className="form-text">Configure how often the game state is automatically saved.</div>
          </div>
          
          {/* Reset Game */}
          <div className="mb-3">
            <label className="form-label">Reset Game</label>
            <div className="d-grid">
              <button 
                type="button" 
                className="btn btn-danger" 
                onClick={showResetConfirmation}
              >
                Reset Game
              </button>
            </div>
            <div className="form-text">Clear all dialogue history and reset the game to initial state.</div>
          </div>
        </div>
        
        <div className={styles.modalFooter}>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={onClose}
          >
            Cancel
          </button>
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={handleSaveSettings} 
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Saving...
              </>
            ) : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
});

export default Settings; 