import React from 'react';
import styles from '../../styles/main.module.css';
import { formatAvatarUrl } from './utils';

interface Persona {
  id: string;
  name: string;
  description: string;
  avatar: string;
  avatarTimestamp?: number;
}

interface PersonaDisplayProps {
  currentPersona: Persona | null;
  isLoading: boolean;
  onAvatarClick: () => void;
}

const PersonaDisplay: React.FC<PersonaDisplayProps> = ({ currentPersona, isLoading, onAvatarClick }) => {
  return (
    <div className={styles.currentPersona}>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h5 className="mb-0">GM Persona</h5>
      </div>
      
      {!currentPersona && isLoading ? (
        <div className="d-flex align-items-center">
          <div className="spinner-border spinner-border-sm me-2" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <small>Loading persona...</small>
        </div>
      ) : currentPersona ? (
        <div className={styles.personaPreview}>
          <img 
            src={formatAvatarUrl(currentPersona.avatar, currentPersona.avatarTimestamp)} 
            alt={currentPersona.name} 
            className={styles.personaAvatar} 
            onClick={onAvatarClick}
            style={{ cursor: 'pointer' }}
            title="Click to change avatar"
          />
          <div className={styles.personaInfo}>
            <strong>{currentPersona.name}</strong>
            <small>{currentPersona.description}</small>
          </div>
        </div>
      ) : (
        <div className="alert alert-warning">No GM persona selected</div>
      )}
    </div>
  );
};

export default PersonaDisplay; 