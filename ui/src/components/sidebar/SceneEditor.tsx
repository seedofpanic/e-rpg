import React from 'react';
import styles from '../../styles/main.module.css';

interface SceneEditorProps {
  sceneText: string;
  isEditingScene: boolean;
  isUpdatingScene: boolean;
  isConnected: boolean;
  onSceneTextChange: (text: string) => void;
  onUpdateScene: () => void;
  onCancelEdit: () => void;
}

const SceneEditor: React.FC<SceneEditorProps> = ({
  sceneText,
  isEditingScene,
  isUpdatingScene,
  isConnected,
  onSceneTextChange,
  onUpdateScene,
  onCancelEdit
}) => {
  return (
    <div className={styles.currentScene}>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h5 className="mb-0">Current Scene</h5>
        {!isEditingScene ? (
          <button 
            className="btn btn-sm btn-outline-light" 
            onClick={onUpdateScene}
            disabled={!isConnected}
            title={!isConnected ? "Connect to server first" : "Edit scene"}
          >
            <i className="bi bi-pencil-fill"></i>
          </button>
        ) : (
          <div>
            <button 
              className="btn btn-sm btn-success me-1" 
              onClick={onUpdateScene}
              title="Save changes"
            >
              <i className="bi bi-check-lg"></i>
            </button>
            <button 
              className="btn btn-sm btn-outline-light" 
              onClick={onCancelEdit}
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
          onChange={(e) => onSceneTextChange(e.target.value)}
          rows={5}
          placeholder="Enter scene description..."
        />
      ) : (
        <p>{sceneText || 'No active scene'}</p>
      )}
    </div>
  );
};

export default SceneEditor; 