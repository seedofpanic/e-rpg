import React from 'react';
import SaveFileInput from '../SaveFileInput';
import styles from '../../styles/main.module.css';

const SaveGameSection: React.FC = () => {
  return (
    <div className={`${styles.saveGameSection} mt-4`}>
      <h5 className="mb-2">Game State</h5>
      <SaveFileInput className={styles.sidebarSaveInput} darkMode={true} />
    </div>
  );
};

export default SaveGameSection; 