import React, { useState, useRef, useEffect } from 'react';
import { Message } from '../stores/ChatStore';
import styles from '../styles/main.module.css';
import RollMessage from './RollMessage';
import socketService from '../services/api';
import '../styles/SkillRoll.css';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const [showSkillMenu, setShowSkillMenu] = useState(false);
  const skillMenuRef = useRef<HTMLDivElement>(null);
  
  // Handle click outside to close menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (skillMenuRef.current && !skillMenuRef.current.contains(event.target as Node)) {
        setShowSkillMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Helper function to format avatar URL with cache busting
  const formatAvatarUrl = (avatarPath: string) => {
    if (!avatarPath) return "images/avatar.jpg";
    
    // Extract timestamp parameter if it exists in the avatar string
    let timestamp = '';
    if (avatarPath.includes('?t=')) {
      timestamp = avatarPath.split('?t=')[1];
    } else {
      // Use a random timestamp as fallback to prevent caching
      timestamp = Date.now().toString();
    }
    
    // If it starts with "images/"
    if (avatarPath.startsWith('images/')) {
      return `${avatarPath}?t=${timestamp}`;
    }
    
    // Return the formatted URL
    return "/images/" + (avatarPath.includes('?t=') ? avatarPath : `${avatarPath}?t=${timestamp}`);
  };

  const getMessageClassName = () => {
    let className = styles.message;
    
    switch (message.type) {
      case 'system':
        className += ` ${styles.systemMessage}`;
        break;
      case 'thinking':
        className += ` ${styles.thinkingMessage}`;
        break;
      case 'gm':
        className += ` ${styles.gmMessage}`;
        break;
      case 'roll':
        className += ' roll-message-container';
        break;
      case 'memory':
        className += ' memory-message';
        break;
      default:
        break;
    }
    
    return className;
  };

  // List of all skills
  const skills = [
    { label: "Acrobatics", value: "acrobatics" },
    { label: "Animal Handling", value: "animal_handling" },
    { label: "Arcana", value: "arcana" },
    { label: "Athletics", value: "athletics" },
    { label: "Deception", value: "deception" },
    { label: "History", value: "history" },
    { label: "Insight", value: "insight" },
    { label: "Intimidation", value: "intimidation" },
    { label: "Investigation", value: "investigation" },
    { label: "Medicine", value: "medicine" },
    { label: "Nature", value: "nature" },
    { label: "Perception", value: "perception" },
    { label: "Performance", value: "performance" },
    { label: "Persuasion", value: "persuasion" },
    { label: "Religion", value: "religion" },
    { label: "Sleight of Hand", value: "sleight_of_hand" },
    { label: "Stealth", value: "stealth" },
    { label: "Survival", value: "survival" }
  ];

  // Handle skill roll
  const handleSkillRoll = (skillName: string) => {
    if (message.characterId) {
      socketService.rollSkill(message.characterId, skillName);
    }
    setShowSkillMenu(false);
  };
  
  return (
    <div className={getMessageClassName()}>
      {/* Avatar only for non-system messages */}
      {message.type !== 'system' && (
        <div className={styles.messageAvatar}>
          {message.avatar ? (
            <img src={formatAvatarUrl(message.avatar)} alt={message.sender} />
          ) : (
            <div 
              className={styles.characterAvatar}
              style={{ 
                backgroundColor: '#2c3e50',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              {message.sender.charAt(0)}
            </div>
          )}
        </div>
      )}
      
      <div className={styles.messageContent}>
        {/* Don't show sender for system or thinking messages */}
        {message.type !== 'system' && message.type !== 'thinking' && (
          <h5>{message.sender}</h5>
        )}
        
        {/* Render content based on message type */}
        {message.type === 'roll' && message.data ? (
          <RollMessage data={message.data} />
        ) : (
          <>
            <p>{message.content}</p>
            
            {/* Show skill roll button for character messages only */}
            {message.type === 'message' && (
              <div className="skill-roll-container" ref={skillMenuRef}>
                <button 
                  className="skill-roll-button"
                  onClick={() => setShowSkillMenu(!showSkillMenu)}
                  aria-label="Roll a skill check"
                  title="Roll a skill check for this character"
                >
                  🎲 Roll Skill
                </button>
                
                {showSkillMenu && (
                  <div className="skill-dropdown">
                    {skills.map((skill) => (
                      <button 
                        key={skill.value}
                        className="skill-option"
                        onClick={() => handleSkillRoll(skill.value)}
                      >
                        {skill.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ChatMessage; 