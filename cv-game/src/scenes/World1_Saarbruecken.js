import { BaseScene } from './BaseScene.js';
import { Player } from '../entities/Player.js';

export class World1_Saarbruecken extends BaseScene {
    constructor() {
        super('World1_Saarbruecken');
    }

    preload() {
        this.load.spritesheet('martin', 'assets/sprites/martin_sheet.png', {
            frameWidth: 104, frameHeight: 183
        });
        this.load.image('world1_bg', 'assets/tilemaps/world1_bg.png');
        this.load.json('world1_collision', 'assets/tilemaps/world1_collision.json');
        this.load.json('dialogue', 'data/dialogue.json');
    }

    create() {
        const S = 3; // map display scale
        this.dialogue = this.cache.json.get('dialogue');
        const col = this.cache.json.get('world1_collision');
        const ww = col.world_width * S, wh = col.world_height * S;

        // Background map (scaled 3x, pixelArt:true keeps it crisp)
        this.add.image(0, 0, 'world1_bg').setOrigin(0, 0).setScale(S).setDepth(0);

        // World bounds
        this.physics.world.setBounds(0, 0, ww, wh);

        // Collision zones (scale all rects by S)
        this.walls = this.physics.add.staticGroup();
        const addRect = (r) => {
            const zone = this.add.zone(r.x*S + r.w*S/2, r.y*S + r.h*S/2, r.w*S, r.h*S);
            this.physics.add.existing(zone, true);
            this.walls.add(zone);
        };
        col.water_rects.forEach(addRect);
        col.border_rects.forEach(addRect);

        // Load walkability overrides if present
        if (col.blocked_tiles) {
            const bs = col.block_size * S;
            col.blocked_tiles.forEach(([tx, ty]) => {
                const zone = this.add.zone(tx*bs + bs/2, ty*bs + bs/2, bs, bs);
                this.physics.add.existing(zone, true);
                this.walls.add(zone);
            });
        }

        // Player spawn (from editor or default)
        const sp = col.player_spawn || { x: 350, y: 580 };
        this.player = new Player(this, sp.x * S, sp.y * S);

        // NPCs (from editor or defaults)
        this.npcList = [];
        this.npcBodies = this.physics.add.staticGroup();
        const defaultNpcs = [
            { id:'mom', x:280, y:540 }, { id:'dad', x:320, y:540 },
            { id:'wolfgang', x:400, y:620 }, { id:'monika', x:440, y:560 },
            { id:'christine', x:240, y:600 }, { id:'valentin', x:360, y:620 },
            { id:'tobert', x:480, y:540 }, { id:'ben', x:300, y:600 }
        ];
        const NPC_COLORS = { mom:0x4488ff, dad:0x44aa44, wolfgang:0xff8844, monika:0xff4488, christine:0xaa44ff, valentin:0x44ffcc, tobert:0xff6644, ben:0x88aaff };
        (col.npcs || defaultNpcs).forEach(n => {
            this._placeNPC(n.x * S, n.y * S, NPC_COLORS[n.id] || 0xffff00, n.id);
        });

        // Collisions
        this.physics.add.collider(this.player.sprite, this.walls);
        this.physics.add.collider(this.player.sprite, this.npcBodies);

        // Camera
        this.cameras.main.setBounds(0, 0, ww, wh);
        this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);

        this._currentNPC = null;
        this._dialogueIndex = 0;

        // HUD
        this.add.text(16, 16, 'Saarbrücken — The Tutorial', {
            fontSize: '14px', fontFamily: 'monospace', color: '#f4e842',
            stroke: '#000', strokeThickness: 3
        }).setScrollFactor(0).setDepth(100);
        this.add.text(16, 36, 'WASD/Arrows: Move | E/Space: Talk', {
            fontSize: '11px', fontFamily: 'monospace', color: '#cbdbfc',
            stroke: '#000', strokeThickness: 2
        }).setScrollFactor(0).setDepth(100);
    }

    _placeNPC(x, y, color, id) {
        this.add.rectangle(x, y, 28, 28, color).setDepth(5);
        this.add.text(x, y - 22, id, {
            fontSize: '10px', fontFamily: 'monospace', color: '#fff',
            stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5).setDepth(5);
        const zone = this.add.zone(x, y, 28, 28);
        this.physics.add.existing(zone, true);
        this.npcBodies.add(zone);
        this.npcList.push({ x, y, id });
    }

    update() {
        this.player.update();

        if (this.player.isAction()) {
            if (this.dialogueActive) {
                this._advanceDialogue();
            } else {
                this._tryTalk();
            }
        }
    }

    _tryTalk() {
        const px = this.player.sprite.x, py = this.player.sprite.y;
        for (const npc of this.npcList) {
            if (Phaser.Math.Distance.Between(px, py, npc.x, npc.y) < 60) {
                this._currentNPC = npc;
                this._dialogueIndex = 0;
                const lines = this.dialogue[npc.id];
                if (lines?.[0]) this.showMessage(lines[0]);
                return;
            }
        }
    }

    _advanceDialogue() {
        if (!this._currentNPC) { this.hideMessage(); return; }
        const lines = this.dialogue[this._currentNPC.id];
        this._dialogueIndex++;
        if (this._dialogueIndex < lines.length) {
            this.showMessage(lines[this._dialogueIndex]);
        } else {
            this.hideMessage();
            this._currentNPC = null;
        }
    }
}
