import { BaseScene } from './BaseScene.js';

export class World4_SanFrancisco extends BaseScene {
    constructor() { super('World4_SanFrancisco'); }

    preload() {
        this.loadLevelAssets(4);
        this.loadNPCSprites(['john', 'dejan']);
        this.loadAudio('music4');
    }

    create() {
        this.createLevel(4, 'San Francisco — The Research Lab', 'music4');
    }

    update() {
        this.updateLevel();
    }
}
