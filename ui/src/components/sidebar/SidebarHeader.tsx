import React from 'react';
import styles from '../../styles/main.module.css';

const SidebarHeader: React.FC = () => {
  return (
    <div className={styles.logoContainer}>
      <h1>E-RPG</h1>
      <div className={styles.tagline}>Enhanced RPG Campaign Manager</div>
    </div>
  );
};

export default SidebarHeader; 