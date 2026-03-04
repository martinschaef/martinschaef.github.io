import { BaseScene } from './BaseScene.js';

export class World2_Freiburg extends BaseScene {
    constructor() { super('World2_Freiburg'); }

    preload() {
        this.loadLevelAssets(2);
        this.loadNPCSprites(['podelski','byron','byron2','dejan','evren','john','stephan','zhiming']);
        this.loadAudio('music2');
    }

    create() {
        this.createLevel(2, 'Freiburg — The PhD Quest', 'music2');
    }

    update() {
        this.updateLevel();
    }
}
