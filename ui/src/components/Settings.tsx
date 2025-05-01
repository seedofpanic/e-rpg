import React from 'react';
import { observer } from 'mobx-react-lite';
import styles from '../styles/main.module.css';
import SaveFileInput from './SaveFileInput';
import '../styles/SaveFileInput.css';
import settingsStore from '../stores/SettingsStore';

type SettingsProps = {
  isOpen: boolean;
  onClose: () => void;
};

const Settings: React.FC<SettingsProps> = observer(({ isOpen, onClose }) => {
  
  // Show reset confirmation modal
  const showResetConfirmation = () => {
    const confirmReset = window.confirm(
      'Are you sure you want to reset the game? This will clear all dialogue history and character memories.\n\nThis action cannot be undone!'
    );
    
    if (confirmReset) {
      settingsStore.resetGame();
      onClose();
    }
  };

  // Test current volume with a sample sound
  const testVoiceVolume = () => {
    // Create a simple audio test using the Web Audio API instead of backend TTS
    const audioContext = new AudioContext();
    
    // Create audio nodes
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
  
    const compressor = audioContext.createDynamicsCompressor();
    
    // Set up oscillator with a more pleasant wavetable
    oscillator.type = 'sine'; // triangle wave sounds smoother than sine
    oscillator.frequency.setValueAtTime(392, audioContext.currentTime); // G4 note (more pleasant than A4)
    
    // Set up gain with envelope to avoid clicks
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(settingsStore.volume, audioContext.currentTime + 0.1); // Fade in
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.6); // Fade out
    
    // Connect audio graph
    oscillator.connect(gainNode);
    gainNode.connect(compressor);
    compressor.connect(audioContext.destination);
    
    // Play a gentle note
    oscillator.start();
    setTimeout(() => {
      oscillator.stop();
      audioContext.close();
    }, 700); // Play for 700ms to allow for fade out
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
              value={settingsStore.apiKey} 
              onChange={(e) => settingsStore.setApiKey(e.target.value)} 
              placeholder="Enter your Gemini API key"
            />
            <div className="form-text">Your API key is stored securely and used for AI processing.</div>
          </div>
          
          {/* Voice Volume Control */}
          <div className="mb-3">
            <label htmlFor="voice-volume" className="form-label">Voice Volume: {Math.round(settingsStore.volume * 100)}%</label>
            <div className="d-flex align-items-center">
              <input 
                type="range" 
                className="form-range flex-grow-1 me-2" 
                id="voice-volume" 
                min="0" 
                max="1" 
                step="0.01"
                value={settingsStore.volume} 
                onChange={(e) => settingsStore.setVolume(parseFloat(e.target.value))} 
              />
              <button 
                type="button" 
                className="btn btn-sm btn-outline-secondary" 
                onClick={testVoiceVolume}
              >
                Test
              </button>
            </div>
            <div className="form-text">Adjust the volume of voice output.</div>
          </div>
          
          {/* Lore Settings */}
          <div className="mb-3">
            <label htmlFor="lore-text" className="form-label">Base Campaign Lore</label>
            <textarea 
              className="form-control" 
              id="lore-text" 
              rows={5} 
              value={settingsStore.baseLore} 
              onChange={(e) => settingsStore.setBaseLore(e.target.value)}
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
                checked={settingsStore.autosaveEnabled} 
                onChange={(e) => settingsStore.setAutosaveEnabled(e.target.checked)} 
                disabled={settingsStore.isDebugMode}
              />
              <label className="form-check-label" htmlFor="autosave-enabled">
                Enable Autosave
              </label>
            </div>
            {settingsStore.isDebugMode && (
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
                value={settingsStore.autosaveThreshold} 
                onChange={(e) => settingsStore.setAutosaveThreshold(parseInt(e.target.value))} 
                min={1} 
                max={60} 
                disabled={settingsStore.isDebugMode || !settingsStore.autosaveEnabled}
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
            onClick={() => settingsStore.handleSaveSettings()} 
            disabled={settingsStore.isSaving}
          >
            {settingsStore.isSaving ? (
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