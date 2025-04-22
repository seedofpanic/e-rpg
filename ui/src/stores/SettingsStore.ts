import { makeAutoObservable } from "mobx";
import socketService from "../services/api";

class SettingsStore {
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
    }
    handleSaveSettings(): void {
        settingsStore.setIsSaving(true);
    
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

