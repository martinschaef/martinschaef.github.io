import { BaseScene } from './BaseScene.js';

export class World1_Saarbruecken extends BaseScene {
    constructor() { super('World1_Saarbruecken'); }

    preload() {
        this.loadLevelAssets(1);
        this.loadNPCSprites(['doris','father','wolfgang','monika','christine','valentin','tobert','ben','podelski']);
        this.loadAudio('music1');
    }

    create() {
        this.createLevel(1, 'Saarbrücken — The Tutorial', 'music1');
    }

    update() {
        this.updateLevel();
    }
}
