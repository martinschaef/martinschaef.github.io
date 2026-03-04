import { BaseScene } from './BaseScene.js';

export class World3_Macau extends BaseScene {
    constructor() { super('World3_Macau'); }

    preload() {
        this.loadLevelAssets(3);
        this.loadNPCSprites(['zhiming','stephan','willem']);
        this.loadAudio('music3');
    }

    create() {
        this.createLevel(3, 'Macau — The Far East', 'music3');
    }

    update() {
        this.updateLevel();
    }
}
