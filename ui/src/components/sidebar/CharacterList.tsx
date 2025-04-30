import React from 'react';
import styles from '../../styles/main.module.css';
import { formatAvatarUrl } from './utils';

interface Character {
  id: string;
  name: string;
  avatar: string;
  active: boolean;
  is_leader: boolean;
  current_hp: number;
  max_hp: number;
}

interface CharactersMap {
  [key: string]: Character;
}

interface CharacterListProps {
  characters: CharactersMap;
  charactersIds: string[];
  onAvatarClick: (characterId: string) => void;
  onToggleActive: (characterId: string) => void;
  onOpenSkillRoll: (characterId: string) => void;
  onUpdateHealth?: (characterId: string, newHp: number) => void;
}

const CharacterList: React.FC<CharacterListProps> = ({
  characters,
  charactersIds,
  onAvatarClick,
  onToggleActive,
  onOpenSkillRoll,
  onUpdateHealth
}) => {
  return (
    <div className="characters-list mt-4">
      <h5 className="mb-1">Party&nbsp;Members</h5>
      <small className="d-block text-light opacity-75 mb-2">(Click character to toggle active/inactive)</small>
      {!charactersIds?.length ? (
        <p className="text-muted">No characters added yet</p>
      ) : (
        charactersIds.map((characterId: string) => {
          const character = characters[characterId];
          return (
            <div
              key={characterId}
              className={`${styles.characterItem} ${character.active ? styles.active : styles.inactive}`}
            >
              <img 
                src={formatAvatarUrl(character.avatar)} 
                alt={character.name} 
                className={`${styles.avatar} ${character.is_leader ? styles.leaderAvatar : ''}`} 
                onClick={(e) => {
                  e.stopPropagation();
                  onAvatarClick(character.id);
                }}
                title="Click to change avatar"
                style={{ cursor: 'pointer' }}
              />
              <div className={styles.characterInfo} onClick={() => onToggleActive(characterId)}>
                <div className={styles.characterName}>{character.name}</div>
                <small className={`${styles.status} ${character.active ? styles.statusActive : styles.statusInactive}`}>
                  {character.active ? 'Active' : 'Inactive'}
                </small>
                <div className={styles.healthBarContainer} title={`HP: ${character.current_hp}/${character.max_hp}`}>
                  <div 
                    className={styles.healthBar} 
                    style={{ 
                      width: `${(character.current_hp / character.max_hp) * 100}%`,
                      backgroundColor: getHealthColor(character.current_hp, character.max_hp)
                    }}
                  ></div>
                  <span className={styles.healthText}>{character.current_hp}/{character.max_hp}</span>
                </div>
                {onUpdateHealth && (
                  <div className={styles.healthControls} onClick={(e) => e.stopPropagation()}>
                    <button 
                      className={styles.healthButton} 
                      onClick={() => onUpdateHealth(character.id, Math.max(0, character.current_hp - 1))}
                      title="Decrease HP"
                    >
                      -
                    </button>
                    <button 
                      className={styles.healthButton} 
                      onClick={() => onUpdateHealth(character.id, Math.min(character.max_hp, character.current_hp + 1))}
                      title="Increase HP"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
              {character.active && (
                <div 
                  className={styles.rollButton}
                  onClick={() => onOpenSkillRoll(character.id)}
                  title="Skill Rolls"
                >
                  <i className="bi bi-dice-6"></i>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

// Helper function to get health bar color based on percentage
const getHealthColor = (current: number, max: number): string => {
  const healthPercent = (current / max) * 100;
  if (healthPercent > 60) return '#4caf50'; // Green
  if (healthPercent > 30) return '#ffc107'; // Yellow
  return '#f44336'; // Red
};

export default CharacterList; 