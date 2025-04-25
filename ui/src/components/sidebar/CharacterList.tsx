import React from 'react';
import styles from '../../styles/main.module.css';
import { formatAvatarUrl } from './utils';

interface Character {
  id: string;
  name: string;
  avatar: string;
  active: boolean;
  is_leader: boolean;
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
}

const CharacterList: React.FC<CharacterListProps> = ({
  characters,
  charactersIds,
  onAvatarClick,
  onToggleActive,
  onOpenSkillRoll
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

export default CharacterList; 