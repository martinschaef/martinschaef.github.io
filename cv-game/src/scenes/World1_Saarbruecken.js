import { BaseScene } from './BaseScene.js';
import { Player } from '../entities/Player.js';

export class World1_Saarbruecken extends BaseScene {
    constructor() {
        super('World1_Saarbruecken');
    }

    preload() {
        this.load.spritesheet('martin', 'assets/sprites/martin.png', {
            frameWidth: 104, frameHeight: 183
        });
        this.load.spritesheet('martin_actions', 'assets/sprites/martin_actions.png', {
            frameWidth: 442, frameHeight: 360
        });
        this.load.image('world1_bg', 'assets/tilemaps/world1_bg.png');
        this.load.json('world1_collision', 'assets/tilemaps/world1_collision.json');
        this.load.json('npcData', 'data/world1_npcs.json');
        this.load.json('spriteData', 'data/sprites.json');

        // NPC spritesheets for this level
        this.load.spritesheet('doris',     'assets/sprites/doris.png',     { frameWidth: 305, frameHeight: 753 });
        this.load.spritesheet('father',    'assets/sprites/father.png',    { frameWidth: 375, frameHeight: 924 });
        this.load.spritesheet('wolfgang',  'assets/sprites/wolfgang.png',  { frameWidth: 448, frameHeight: 476 });
        this.load.spritesheet('monika',    'assets/sprites/monika.png',    { frameWidth: 303, frameHeight: 759 });
        this.load.spritesheet('christine', 'assets/sprites/christine.png', { frameWidth: 305, frameHeight: 745 });
        this.load.spritesheet('valentin',  'assets/sprites/valentin.png',  { frameWidth: 435, frameHeight: 1185 });
        this.load.spritesheet('tobert',    'assets/sprites/tobert.png',    { frameWidth: 453, frameHeight: 917 });
        this.load.spritesheet('ben',       'assets/sprites/ben.png',       { frameWidth: 414, frameHeight: 959 });
        this.load.spritesheet('podelski',  'assets/sprites/podelski.png',  { frameWidth: 412, frameHeight: 533 });
    }

    create() {
        const S = 3;
        const npcData = this.cache.json.get('npcData');
        const spriteData = this.cache.json.get('spriteData');
        const col = this.cache.json.get('world1_collision');
        const ww = col.world_width * S, wh = col.world_height * S;

        // Background
        this.add.image(0, 0, 'world1_bg').setOrigin(0, 0).setScale(S).setDepth(0);
        this.physics.world.setBounds(0, 0, ww, wh);

        // Collision zones
        this.walls = this.physics.add.staticGroup();
        const addRect = (r) => {
            const zone = this.add.zone(r.x*S + r.w*S/2, r.y*S + r.h*S/2, r.w*S, r.h*S);
            this.physics.add.existing(zone, true);
            this.walls.add(zone);
        };
        col.water_rects.forEach(addRect);
        col.border_rects.forEach(addRect);
        if (col.blocked_tiles) {
            const bs = col.block_size * S;
            col.blocked_tiles.forEach(([tx, ty]) => {
                const zone = this.add.zone(tx*bs + bs/2, ty*bs + bs/2, bs, bs);
                this.physics.add.existing(zone, true);
                this.walls.add(zone);
            });
        }

        // Player
        const sp = col.player_spawn || { x: 350, y: 580 };
        this.player = new Player(this, sp.x * S, sp.y * S);

        // NPCs from config
        this.npcList = [];
        this.npcBodies = this.physics.add.staticGroup();
        const defaultPositions = {
            mom:{x:280,y:540}, dad:{x:320,y:540}, wolfgang:{x:400,y:620},
            monika:{x:440,y:560}, christine:{x:240,y:600}, valentin:{x:360,y:620},
            tobert:{x:480,y:540}, ben:{x:300,y:600}, podelski:{x:500,y:600}
        };
        const positions = col.npcs || Object.entries(defaultPositions).map(([id,p]) => ({id,...p}));

        positions.forEach(n => {
            const cfg = npcData[n.id];
            if (!cfg) return;
            const x = n.x * S, y = n.y * S;

            // Use sprite if loaded, otherwise colored rectangle
            let sprite;
            const sDef = spriteData.sprites[cfg.sprite];
            if (this.textures.exists(cfg.sprite)) {
                sprite = this.add.sprite(x, y, cfg.sprite, 0).setScale(sDef?.scale || 0.1).setDepth(5);
            } else {
                sprite = this.add.rectangle(x, y, 28, 28, 0xffff00).setDepth(5);
            }

            // Name label
            this.add.text(x, y - sprite.displayHeight/2 - 10, n.id, {
                fontSize: '10px', fontFamily: 'monospace', color: '#fff',
                stroke: '#000', strokeThickness: 2
            }).setOrigin(0.5).setDepth(5);

            // Collision zone
            const zone = this.add.zone(x, y, 28, 28);
            this.physics.add.existing(zone, true);
            this.npcBodies.add(zone);
            this.npcList.push({ x, y, id: n.id, dialogue: cfg.dialogue });
        });

        // Collisions
        this.physics.add.collider(this.player.sprite, this.walls);
        this.physics.add.collider(this.player.sprite, this.npcBodies);

        // Doors/exits (from editor)
        if (col.doors) {
            col.doors.forEach(d => {
                const zone = this.add.zone(d.x * S, d.y * S, (d.w || 48) * S, (d.h || 48) * S);
                this.physics.add.existing(zone, true);
                // Visual indicator
                this.add.rectangle(d.x * S, d.y * S, (d.w || 48) * S, (d.h || 48) * S, 0xf4e842, 0.15).setDepth(1);
                this.add.text(d.x * S, d.y * S - 20 * S, d.label || '🚪', {
                    fontSize: '12px', fontFamily: 'monospace', color: '#f4e842',
                    stroke: '#000', strokeThickness: 2
                }).setOrigin(0.5).setDepth(5);
                this.physics.add.overlap(this.player.sprite, zone, () => {
                    if (this._transitioning) return;
                    this._transitioning = true;
                    this.transitionTo(d.target || 'World2_Freiburg');
                });
            });
        }

        // Camera
        this.cameras.main.setBounds(0, 0, ww, wh);
        this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);

        this._currentNPC = null;
        this._dialogueNode = 0;

        // Arrow keys for choice navigation
        this._upKey = this.input.keyboard.addKey('UP');
        this._downKey = this.input.keyboard.addKey('DOWN');
        this._prevUp = false;
        this._prevDown = false;

        // HUD
        this.add.text(16, 16, 'Saarbrücken — The Tutorial', {
            fontSize: '14px', fontFamily: 'monospace', color: '#f4e842',
            stroke: '#000', strokeThickness: 3
        }).setScrollFactor(0).setDepth(100);
        this.add.text(16, 36, 'WASD/Arrows: Move | E/Space: Talk | ↑↓: Choose', {
            fontSize: '11px', fontFamily: 'monospace', color: '#cbdbfc',
            stroke: '#000', strokeThickness: 2
        }).setScrollFactor(0).setDepth(100);
    }

    update() {
        this.player.update();

        // Choice navigation (edge-triggered)
        if (this.dialogueActive) {
            const upNow = this._upKey.isDown;
            const downNow = this._downKey.isDown;
            if (upNow && !this._prevUp) this.moveChoice(-1);
            if (downNow && !this._prevDown) this.moveChoice(1);
            this._prevUp = upNow;
            this._prevDown = downNow;
        }

        if (this.player.isAction()) {
            if (this.dialogueActive) this._advanceDialogue();
            else this._tryTalk();
        }
    }

    _tryTalk() {
        const px = this.player.sprite.x, py = this.player.sprite.y;
        for (const npc of this.npcList) {
            if (Phaser.Math.Distance.Between(px, py, npc.x, npc.y) < 60) {
                this._currentNPC = npc;
                this._dialogueNode = 0;
                this._showNode(0);
                return;
            }
        }
    }

    _showNode(index) {
        const nodes = this._currentNPC.dialogue;
        if (index >= nodes.length) { this.hideMessage(); this._currentNPC = null; return; }
        const node = nodes[index];
        this._dialogueNode = index;
        this.showMessage(node.text, node.choices || null);
    }

    _findNode(id) {
        return this._currentNPC.dialogue.findIndex(n => n.id === id);
    }

    _advanceDialogue() {
        if (!this._currentNPC) { this.hideMessage(); return; }
        const node = this._currentNPC.dialogue[this._dialogueNode];

        // If there are choices, use the selected one
        if (node.choices) {
            const choice = this.getSelectedChoice();
            if (!choice) return;
            if (choice.next) {
                const idx = this._findNode(choice.next);
                if (idx >= 0) { this._showNode(idx); return; }
            }
            this.hideMessage(); this._currentNPC = null; return;
        }

        // Auto-advance to next node (skip nodes with IDs — those are branch targets)
        let next = this._dialogueNode + 1;
        const nodes = this._currentNPC.dialogue;
        while (next < nodes.length && nodes[next].id) next++;

        if (next < nodes.length) {
            this._showNode(next);
        } else {
            this.hideMessage();
            this._currentNPC = null;
        }
    }
}
