import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import CharacterManagement from './components/CharacterManagement';
import InventoryManagement from './components/InventoryManagement';
import Notifications from './components/Notifications';
import styles from './styles/main.module.css';
import SkillRollModal from './components/SkillRollModal';

const App: React.FC = observer(() => {
  const [activeView, setActiveView] = useState<string>('chat');
  
  // Apply global styling
  useEffect(() => {
    document.body.classList.add('bg-dark');
    document.body.style.height = '100vh';
    document.body.style.margin = '0';
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.classList.remove('bg-dark');
      document.body.style.height = '';
      document.body.style.margin = '';
      document.body.style.overflow = '';
    };
  }, []);
  
  // Render the active view component
  const renderActiveView = () => {
    switch (activeView) {
      case 'characters':
        return <CharacterManagement />;
      case 'inventory':
        return <InventoryManagement />;
      case 'chat':
      default:
        return <ChatArea />;
    }
  };
  
  return (
    <div className={styles.container}>
      <Sidebar setActiveView={setActiveView} activeView={activeView} />
      <div className={styles.mainContent}>
        {renderActiveView()}
      </div>
      <Notifications />
      <SkillRollModal/>
    </div>
  );
});

export default App;
