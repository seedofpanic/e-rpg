import React, { useRef, useEffect, useState, useLayoutEffect } from 'react';
import { observer } from 'mobx-react-lite';
import chatStore from '../stores/ChatStore';
import personaStore, { Persona } from '../stores/PersonaStore';
import ChatMessage from './ChatMessage';
import PersonaManagement from './PersonaManagement';
import styles from '../styles/main.module.css';

const ChatArea: React.FC = observer(() => {  
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const personaSelectorRef = useRef<HTMLDivElement>(null);
  const [showPersonaDropdown, setShowPersonaDropdown] = useState(false);
  const [isPersonaManagementOpen, setIsPersonaManagementOpen] = useState(false);
  const [personaCreateMode, setPersonaCreateMode] = useState(false);
  
  // Helper function to format avatar URL
  const formatAvatarUrl = (avatarPath: string, timestamp?: number) => {
    // If it's null or undefined, return default avatar
    if (!avatarPath) {
      return '/images/avatar.jpg';
    }
    
    // If it's a full URL (starts with http)
    if (avatarPath.startsWith('http')) {
      return timestamp ? `${avatarPath}?t=${timestamp}` : avatarPath;
    }
    
    // If it already has a leading slash
    if (avatarPath.startsWith('/')) {
      return timestamp ? `${avatarPath}?t=${timestamp}` : avatarPath;
    }
    
    // If it starts with "images/" but no leading slash
    if (avatarPath.startsWith('images/')) {
      return timestamp ? `/${avatarPath}?t=${timestamp}` : `/${avatarPath}`;
    }
    
    // For any other format, assume it's a relative path and add the /images/ prefix
    return timestamp ? `/images/${avatarPath}?t=${timestamp}` : `/images/${avatarPath}`;
  };
  
  // Scroll to bottom function
  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };
  
  // Set current persona to active persona in chatStore when available
  useEffect(() => {
    if (personaStore.currentPersona && personaStore.currentPersona.id !== chatStore.currentPersonaId) {
      chatStore.setCurrentPersona(personaStore.currentPersona.id);
    }
  }, [personaStore.currentPersona]);
  
  // Handle clicks outside the persona dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        personaSelectorRef.current && 
        !personaSelectorRef.current.contains(event.target as Node) &&
        showPersonaDropdown
      ) {
        setShowPersonaDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPersonaDropdown]);
  
  // Scroll to bottom when messages change or thinking status changes - using useLayoutEffect for DOM updates
  useLayoutEffect(() => {
    scrollToBottom();
  }, [chatStore.messages.length, chatStore.isThinking]);
  
  // Initial scroll and periodic check for content loading
  useEffect(() => {
    // Initial scroll
    scrollToBottom();
    
    // Check for any delayed content loading (like images)
    const imageLoadListener = () => scrollToBottom();
    document.addEventListener('load', imageLoadListener, true);
    
    // Additional safety - check again after a short delay
    const timeoutId = setTimeout(scrollToBottom, 100);
    
    return () => {
      document.removeEventListener('load', imageLoadListener, true);
      clearTimeout(timeoutId);
    };
  }, []);
  
  // Handle send message with keyboard shortcut
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.code === 'Enter' && !chatStore.isThinking) {
      if (e.ctrlKey) {
        // Ctrl+Enter to continue
        chatStore.sendMessage();
        chatStore.continueCampaign();

      } else {
        // Regular Enter to send
        chatStore.sendMessage();
      }
    }
  };
  
  // Handle changing the active persona
  const handlePersonaChange = (persona: Persona) => {
    chatStore.setCurrentPersona(persona.id);
    setShowPersonaDropdown(false);
  };
  
  // Handle opening the persona management modal
  const handleOpenPersonaManagement = () => {
    setPersonaCreateMode(false);
    setShowPersonaDropdown(false);
    setIsPersonaManagementOpen(true);
  };
  
  // Handle opening the create persona form
  const handleCreatePersona = () => {
    setPersonaCreateMode(true);
    setShowPersonaDropdown(false);
    setIsPersonaManagementOpen(true);
  };
  
  // Handle closing the persona management modal
  const handleClosePersonaManagement = () => {
    setIsPersonaManagementOpen(false);
    setPersonaCreateMode(false);
  };
  
  // Get the active persona
  const activePersona = personaStore.personas.find(p => p.id === chatStore.currentPersonaId) || 
                        personaStore.currentPersona;
  
  return (
    <div className={styles.chatArea}>
      <div className={styles.chatContainer} ref={chatContainerRef}>
        {chatStore.messages.length === 0 ? (
          <div className={styles.welcomeMessage}>
            <h2>Welcome to E-RPG</h2>
            <p>
              Your enhanced RPG campaign manager. Start your adventure by typing 
              a message or setting up your party in the sidebar.
            </p>
          </div>
        ) : (
          chatStore.messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))
        )}
      </div>
      
      <div className={styles.inputContainer}>
        <div className={styles.messageControls}>
          {/* Persona Selector */}
          <div className={styles.personaSelector} ref={personaSelectorRef}>
            <div 
              className={styles.activePerson} 
              onClick={() => setShowPersonaDropdown(!showPersonaDropdown)}
            >
              {activePersona ? (
                <>
                  <img 
                    src={formatAvatarUrl(activePersona.avatar, activePersona.avatarTimestamp)} 
                    alt={activePersona.name} 
                    className={styles.personaAvatarSmall} 
                    onLoad={scrollToBottom}
                  />
                  <span>{activePersona.name}</span>
                </>
              ) : (
                <span>Default GM</span>
              )}
              <i className={`bi bi-chevron-${showPersonaDropdown ? 'up' : 'down'}`}></i>
            </div>
            
            {showPersonaDropdown && (
              <div className={styles.personaDropdown}>
                {personaStore.personas.map(persona => (
                  <div 
                    key={persona.id} 
                    className={`${styles.personaOption} ${persona.id === chatStore.currentPersonaId ? styles.active : ''}`}
                    onClick={() => handlePersonaChange(persona)}
                  >
                    <img 
                      src={formatAvatarUrl(persona.avatar, persona.avatarTimestamp)} 
                      alt={persona.name} 
                      className={styles.personaAvatarSmall} 
                    />
                    <span>{persona.name}</span>
                    {persona.isDefault && <span className={styles.defaultBadge}>Default</span>}
                  </div>
                ))}
                
                <div className={styles.dropdownDivider}></div>
                
                <div 
                  className={styles.personaCreateOption}
                  onClick={handleCreatePersona}
                >
                  <i className="bi bi-plus-circle"></i>
                  <span>Create New Persona</span>
                </div>
                
                <div 
                  className={styles.personaManageOption}
                  onClick={handleOpenPersonaManagement}
                >
                  <i className="bi bi-person-fill-gear"></i>
                  <span>Manage Personas</span>
                </div>
              </div>
            )}
          </div>
          
          <div className={styles.inputGroup}>
            <input
              type="text"
              className={styles.formControl}
              placeholder="Type your message..."
              value={chatStore.messageInput}
              onChange={(e) => chatStore.setMessageInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={chatStore.isThinking}
            />
            
            <button 
              className={`btn ${styles.btnPrimary}`}
              onClick={() => chatStore.sendMessage()}
              disabled={chatStore.isThinking || !chatStore.messageInput.trim()}
            >
              Send
            </button>
            
            <button 
              className={`btn ${styles.btnSecondary} ms-2`}
              onClick={() => chatStore.continueCampaign()}
              disabled={chatStore.isThinking}
              title="Continue the story"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
      
      {/* Persona Management Modal */}
      <PersonaManagement 
        isOpen={isPersonaManagementOpen} 
        onClose={handleClosePersonaManagement}
        initialCreateMode={personaCreateMode}
      />
    </div>
  );
});

export default ChatArea; 