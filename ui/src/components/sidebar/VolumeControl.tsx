import React from 'react';
import { observer } from 'mobx-react-lite';
import settingsStore from '../../stores/SettingsStore';
import styles from '../../styles/main.module.css';

const VolumeControl: React.FC = observer(() => {
  return (
    <div className={styles.volumeControlSection}>
      <h5 className="mb-2">Voice Volume</h5>
      <div className="d-flex align-items-center">
        <span className="me-2">
          <i className={`bi ${settingsStore.volume === 0 ? 'bi-volume-mute' : 'bi-volume-up'}`}></i>
        </span>
        <input 
          type="range" 
          className="form-range flex-grow-1" 
          min="0" 
          max="1" 
          step="0.01"
          value={settingsStore.volume} 
          onChange={(e) => settingsStore.setVolume(parseFloat(e.target.value))} 
          aria-label="Voice volume slider"
        />
        <span className="ms-2 text-nowrap small">
          {Math.round(settingsStore.volume * 100)}%
        </span>
      </div>
    </div>
  );
});

export default VolumeControl; 