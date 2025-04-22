import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import settingsStore from '../stores/SettingsStore';

interface SaveFileInputProps {
  onSave?: () => void;
  onLoad?: () => void;
  className?: string;
  darkMode?: boolean;
}

const SaveFileInput: React.FC<SaveFileInputProps> = observer(({ onSave, onLoad, className, darkMode = false }) => {
  const [isEditing, setIsEditing] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    settingsStore.updateSaveFilePath();
    setIsEditing(false);
  };

  const handleSave = () => {
    settingsStore.saveGame();
    if (onSave) onSave();
  };

  const handleLoad = () => {
    settingsStore.loadGame();
    if (onLoad) onLoad();
  };

  return (
    <div className={`save-file-container ${darkMode ? 'dark-mode' : ''} ${className || ''}`}>
      {isEditing ? (
        <form onSubmit={handleSubmit} className="save-file-form">
          <div className={darkMode ? "input-group" : "save-file-input-group"}>
            <input
              type="text"
              value={settingsStore.saveFilePath}
              onChange={(e) => settingsStore.setSaveFilePath(e.target.value)}
              placeholder="Enter save file path"
              className={darkMode ? "form-control" : "save-file-input"}
            />
            <button 
              type="submit" 
              className={darkMode ? "btn btn-success" : "save-file-submit"}
            >
              Save
            </button>
            <button 
              type="button" 
              className={darkMode ? "btn btn-danger" : "save-file-cancel"}
              onClick={() => {
                settingsStore.updateSaveFilePath();
                setIsEditing(false);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="save-file-display">
          <div className="save-file-path-container">
            <span className="save-file-label">Save File:</span>
            <span 
              className={darkMode ? "form-control-plaintext save-file-path-dark" : "save-file-path"} 
              onClick={() => setIsEditing(true)}
              title="Click to edit save file path"
            >
              {settingsStore.saveFilePath || 'game_state.json'}
            </span>
            <button 
              className={darkMode ? "btn btn-primary btn-sm" : "save-file-edit"} 
              onClick={() => setIsEditing(true)}
              title="Edit save file path"
            >
              Edit
            </button>
          </div>
          <div className="save-file-actions">
            <button 
              className={darkMode ? "btn btn-success" : "save-file-save-btn"} 
              onClick={handleSave}
              title="Save game to file"
            >
              Save Game
            </button>
            <button 
              className={darkMode ? "btn btn-warning text-dark" : "save-file-load-btn"} 
              onClick={handleLoad}
              title="Load game from file"
            >
              Load Game
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

export default SaveFileInput; 