import { BaseScene } from './BaseScene.js';
import { Player } from '../entities/Player.js';

export class World2_Freiburg extends BaseScene {
    constructor() { super('World2_Freiburg'); }

    preload() {
        this.load.spritesheet('martin', 'assets/sprites/martin.png', { frameWidth: 104, frameHeight: 183 });
        this.load.image('world2_bg', 'assets/tilemaps/world2_bg.png');
        this.load.json('world2_collision', 'assets/tilemaps/world2_collision.json');
        this.loadAudio('music2');
    }

    create() {
        const col = this.cache.json.get('world2_collision');
        const S = col.display_scale || 3;
        const ww = col.world_width * S, wh = col.world_height * S;

        this.add.image(0, 0, 'world2_bg').setOrigin(0).setScale(S).setDepth(0);
        this.physics.world.setBounds(0, 0, ww, wh);

        this.walls = this.physics.add.staticGroup();
        const addRect = (r) => {
            const z = this.add.zone(r.x*S + r.w*S/2, r.y*S + r.h*S/2, r.w*S, r.h*S);
            this.physics.add.existing(z, true); this.walls.add(z);
        };
        col.water_rects.forEach(addRect);
        col.border_rects.forEach(addRect);
        if (col.blocked_tiles) {
            const bs = col.block_size * S;
            col.blocked_tiles.forEach(([tx, ty]) => {
                const z = this.add.zone(tx*bs + bs/2, ty*bs + bs/2, bs, bs);
                this.physics.add.existing(z, true); this.walls.add(z);
            });
        }

        const sp = col.player_spawn || { x: 350, y: 400 };
        this.player = new Player(this, sp.x * S, sp.y * S);
        this.physics.add.collider(this.player.sprite, this.walls);

        this.cameras.main.setBounds(0, 0, ww, wh);
        this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);

        this.add.text(16, 16, 'Freiburg — University', {
            fontSize: '14px', fontFamily: 'monospace', color: '#f4e842',
            stroke: '#000', strokeThickness: 3
        }).setScrollFactor(0).setDepth(100);

        this.cameras.main.fadeIn(500);
        this.playMusic('music2');
        this.createMuteButton();
    }

    update() { this.player.update(); }
}