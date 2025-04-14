import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import chatStore from '../stores/ChatStore';

interface SaveFileInputProps {
  onSave?: () => void;
  onLoad?: () => void;
  className?: string;
  darkMode?: boolean;
}

const SaveFileInput: React.FC<SaveFileInputProps> = observer(({ onSave, onLoad, className, darkMode = false }) => {
  const [filePath, setFilePath] = useState(chatStore.saveFilePath);
  const [isEditing, setIsEditing] = useState(false);

  // Update local state when the store's value changes
  useEffect(() => {
    setFilePath(chatStore.saveFilePath);
  }, [chatStore.saveFilePath]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    chatStore.setSaveFilePath(filePath);
    setIsEditing(false);
  };

  const handleSave = () => {
    chatStore.saveGame(filePath);
    if (onSave) onSave();
  };

  const handleLoad = () => {
    chatStore.loadGame(filePath);
    if (onLoad) onLoad();
  };

  return (
    <div className={`save-file-container ${darkMode ? 'dark-mode' : ''} ${className || ''}`}>
      {isEditing ? (
        <form onSubmit={handleSubmit} className="save-file-form">
          <div className={darkMode ? "input-group" : "save-file-input-group"}>
            <input
              type="text"
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
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
                setFilePath(chatStore.saveFilePath);
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
              {chatStore.saveFilePath || 'game_state.json'}
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