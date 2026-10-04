import { BaseScene } from './BaseScene.js';

export class World6_Office extends BaseScene {
    constructor() { super('World6_Office'); }

    preload() {
        this.loadLevelAssets(6);
        this.loadNPCSprites(['willem', 'numair', 'emmi', 'byron2']);
        this.loadAudio('music5');
    }

    create() {
        this.createLevel(6, 'New York City — The Office', 'music5');
    }

    update() {
        this.updateLevel();
    }
}
