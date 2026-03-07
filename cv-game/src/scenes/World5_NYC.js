import { BaseScene } from './BaseScene.js';

export class World5_NYC extends BaseScene {
    constructor() { super('World5_NYC'); }

    preload() {
        this.loadLevelAssets(5);
        this.loadNPCSprites(['dejan', 'lauren', 'byron2']);
        this.loadAudio('music5');
    }

    create() {
        this.createLevel(5, 'New York City — The Big Apple', 'music5');
    }

    update() {
        this.updateLevel();
    }
}
