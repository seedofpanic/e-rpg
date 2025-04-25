import React from 'react';
import styles from '../../styles/main.module.css';

interface NavigationButtonsProps {
  activeView: string;
  onViewChange: (view: string) => void;
  onOpenSettings: () => void;
}

const NavigationButtons: React.FC<NavigationButtonsProps> = ({
  activeView,
  onViewChange,
  onOpenSettings
}) => {
  return (
    <div className="sidebar-controls mt-4">
      <button 
        className={`btn ${styles.btnSecondary} w-100 mb-2 ${activeView === 'characters' ? styles.active : ''}`}
        onClick={() => onViewChange('characters')}
      >
        <i className="bi bi-people-fill me-2"></i>
        Character Management
      </button>
      
      <button 
        className={`btn ${styles.btnSecondary} w-100 mb-2 ${activeView === 'inventory' ? styles.active : ''}`}
        onClick={() => onViewChange('inventory')}
      >
        <i className="bi bi-backpack-fill me-2"></i>
        Inventory Management
      </button>
      
      <button 
        className={`btn ${styles.btnSecondary} w-100 mb-2 ${activeView === 'chat' ? styles.active : ''}`}
        onClick={() => onViewChange('chat')}
      >
        <i className="bi bi-chat-dots-fill me-2"></i>
        Chat
      </button>
      
      <div className="d-flex gap-2 mt-3">
        <button 
          className={`btn ${styles.btnOutlineLight} w-100`}
          onClick={onOpenSettings}
        >
          <i className="bi bi-gear-fill me-2"></i>
          Settings
        </button>
      </div>
    </div>
  );
};

export default NavigationButtons; 