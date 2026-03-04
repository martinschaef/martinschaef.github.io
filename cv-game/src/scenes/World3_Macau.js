import { BaseScene } from './BaseScene.js';
import { Player } from '../entities/Player.js';

export class World3_Macau extends BaseScene {
    constructor() { super('World3_Macau'); }

    preload() {
        this.load.spritesheet('martin', 'assets/sprites/martin.png', { frameWidth: 104, frameHeight: 183 });
        this.load.image('world3_bg', 'assets/tilemaps/world3_bg.png');
        this.load.json('world3_collision', 'assets/tilemaps/world3_collision.json');
        this.loadAudio('music3');
    }

    create() {
        const col = this.cache.json.get('world3_collision');
        const S = col.display_scale || 3;
        const ww = col.world_width * S, wh = col.world_height * S;

        this.add.image(0, 0, 'world3_bg').setOrigin(0).setScale(S).setDepth(0);
        this.physics.world.setBounds(0, 0, ww, wh);

        this.walls = this.physics.add.staticGroup();
        const addRect = (r) => {
            const z = this.add.zone(r.x*S + r.w*S/2, r.y*S + r.h*S/2, r.w*S, r.h*S);
            this.physics.add.existing(z, true); this.walls.add(z);
        };
        col.water_rects.forEach(addRect);
        col.border_rects.forEach(addRect);

        const sp = col.player_spawn || { x: 350, y: 400 };
        this.player = new Player(this, sp.x * S, sp.y * S);
        this.physics.add.collider(this.player.sprite, this.walls);

        this.cameras.main.setBounds(0, 0, ww, wh);
        this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);

        this.add.text(16, 16, 'Macau — The Far East', {
            fontSize: '14px', fontFamily: 'monospace', color: '#f4e842',
            stroke: '#000', strokeThickness: 3
        }).setScrollFactor(0).setDepth(100);

        this.cameras.main.fadeIn(500);
        this.playMusic('music3');
        this.createMuteButton();
    }

    update() { this.player.update(); }
}
