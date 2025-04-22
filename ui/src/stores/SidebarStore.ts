import socketService from '../services/api';
import { makeAutoObservable } from 'mobx';

class SidebarStore {
    setSelectedCharacterId(characterId: string) {
      this.selectedCharacterId = characterId;
    }
    constructor() {
        makeAutoObservable(this);
        this.initSocket();
    }

    initSocket() {
        socketService.on('scene_updated', (data: any) => {
            this.setSceneText(data.scene);
        });
    }

    resetSceneText() {
      this.sceneText = this.currentSceneText;
    }
    setSceneText(description: any) {
        this.sceneText = description;
    }
    updateScene(): void {
        socketService.sendEvent('update_game_state', {
            scene: this.sceneText,
        });
    }
    setIsEditingScene(isEditing: boolean) {
      if (isEditing) {
        this.currentSceneText = this.sceneText;
      }

      this.isEditingScene = isEditing;
    }
    isEditingScene: boolean = false;
    sceneText: string = '';
    currentSceneText: string = '';
    isUpdatingScene: boolean = false; 
    selectedCharacterId: string = '';
}

export default new SidebarStore();
