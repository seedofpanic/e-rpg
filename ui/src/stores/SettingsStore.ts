import { makeAutoObservable } from "mobx";
import socketService from "../services/api";

class SettingsStore {
  updateSaveFilePath() {
    socketService.sendEvent('update_save_file_path', { filepath: this.saveFilePath });
  }
  loadGame() {
    console.log('Loading game', this.saveFilePath);
    socketService.sendEvent('load_game', { filepath: this.saveFilePath });
  }
  saveGame() {
    socketService.sendEvent('save_game', { filepath: this.saveFilePath });
  }
  resetGame() {
    socketService.sendEvent('reset_game');
  }
    isSaving: boolean = false;
    isDebugMode: boolean = false;
    autosaveEnabled: boolean = false;
    autosaveThreshold: number = 10;
    saveFilePath: string = '';
    baseLore: string = '';
    isLoading: boolean = true;
    apiKey: string = '';
    isSettingsOpen: boolean = false;

    setIsSettingsOpen(isOpen: boolean) {
        this.isSettingsOpen = isOpen;
    }

    setIsDebugMode(debug_mode: boolean) {
        this.isDebugMode = debug_mode;
    }
    setAutosaveEnabled(enabled: boolean) {
        this.autosaveEnabled = enabled;
    }
    setAutosaveThreshold(threshold: number) {
        this.autosaveThreshold = threshold;
    }
    setSaveFilePath(filePath: string) {
        this.saveFilePath = filePath;
        localStorage.setItem('saveFilePath', filePath);
    }
    setBaseLore(lore: string) {
        this.baseLore = lore;
    }
    setIsSaving(isSaving: boolean) {
        this.isSaving = isSaving;
    }
    setApiKey(apiKey: string) {
        this.apiKey = apiKey;
    }
    constructor() {
        makeAutoObservable(this);
        this.initializeSocket();
    }
    initializeSocket() {
         // Setup listeners
      socketService.on('autosave_status', (data: { enabled: boolean; debug_mode: boolean; threshold?: number }) => {
        this.setAutosaveEnabled(data.enabled);
        this.setIsDebugMode(data.debug_mode);
        
        // Backend might return threshold directly or include it in a nested settings object
        if (data.threshold) {
          this.setAutosaveThreshold(data.threshold);
        }
      });
      
      // Direct response from get_autosave_settings
      socketService.on('autosave_settings', (data: any) => {
        if (data?.enabled !== undefined) {
          this.setAutosaveEnabled(data.enabled);
        }
        if (data?.threshold) {
          this.setAutosaveThreshold(data.threshold);
        }
      });
      
      // Listen for scene updates which contain lore
      socketService.on('scene_updated', (data: any) => {
        if (data && data.lore) {
          this.setBaseLore(data.lore);
        }
      });

      this.setSaveFilePath(localStorage.getItem('saveFilePath') || 'game_state');     
      socketService.sendEvent('init');
    }
    handleSaveSettings(): void {
        this.setIsSaving(true);

        // Update API key
        socketService.sendEvent('update_api_key', { api_key: this.apiKey });
        
        // Update autosave settings
        socketService.sendEvent('update_game_state', { 
            autosave: {
                enabled: this.autosaveEnabled,
                threshold: this.autosaveThreshold
            }
        });
        
        // Update lore
        socketService.sendEvent('update_lore', { lore: this.baseLore });
    }
}

const settingsStore = new SettingsStore();
export default settingsStore;

