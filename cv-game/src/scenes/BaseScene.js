import { AUDIO } from '../config/audio.js';
import { LEVELS } from '../config/levels.js';
import { Player } from '../entities/Player.js';

export class BaseScene extends Phaser.Scene {

    // ── Audio ──────────────────────────────────────────────

    loadAudio(...musicKeys) {
        for (const [key, path] of Object.entries(AUDIO)) {
            if (key.startsWith('music') && !musicKeys.includes(key)) continue;
            this.load.audio(key, path);
        }
        this.load.on('loaderror', (file) => {
            console.warn('Audio not found (skipped):', file.key);
        });
    }

    sfx(key, config) {
        if (this.sound.mute) return;
        if (this.cache.audio.exists(key)) this.sound.play(key, config);
    }

    playMusic(key, volume = 0.3) {
        if (this._music) this._music.stop();
        if (!this.cache.audio.exists(key)) return;
        this._music = this.sound.add(key, { loop: true, volume });
        this._music.play();
    }

    stopMusic() {
        if (this._music) { this._music.stop(); this._music = null; }
    }

    createMuteButton() {
        // Mute button is now part of the HUD bar in createLevel
    }

    _toggleMute() {
        this.sound.mute = !this.sound.mute;
        if (this._hudMute) this._hudMute.setText(this.sound.mute ? '🔇' : '🔊');
    }

    // ── Level asset loading (call in preload) ─────────────

    loadLevelAssets(worldNum) {
        this.load.spritesheet('martin', 'assets/sprites/martin.png?v=5', { frameWidth: 112, frameHeight: 183 });
        this.load.image(`world${worldNum}_bg`, `assets/tilemaps/world${worldNum}_bg.png`);
        this.load.json(`world${worldNum}_collision`, `assets/tilemaps/world${worldNum}_collision.json`);
        this.load.json('spriteData', 'data/sprites.json');
        this.load.json('enemyData', 'data/enemies.json');
        this.load.json(`npcData_w${worldNum}`, `data/world${worldNum}_npcs.json`);
        this.load.json('itemData', 'data/items.json');
        this.load.json('publications', '../publications.json');
        this.load.spritesheet('items', 'assets/sprites/items.png', { frameWidth: 121, frameHeight: 100 });
        this.load.image('door_closed', 'assets/sprites/door_closed.png');
        this.load.image('door_open', 'assets/sprites/door_open.png');
    }

    // ── Level creation (call in create) ───────────────────

    createLevel(worldNum, title, musicKey) {
        const col = this.cache.json.get(`world${worldNum}_collision`);
        const S = col.display_scale || 3;
        this._S = S;
        const spriteData = this.cache.json.get('spriteData');
        const npcData = this.cache.json.get(`npcData_w${worldNum}`) || {};
        const enemyData = this.cache.json.get('enemyData') || {};
        const ww = col.world_width * S, wh = col.world_height * S;

        // Background
        this.add.image(0, 0, `world${worldNum}_bg`).setOrigin(0).setScale(S).setDepth(0);
        this.physics.world.setBounds(0, 0, ww, wh);

        // Walls
        this.walls = this.physics.add.staticGroup();
        const addRect = (r) => {
            const z = this.add.zone(r.x*S + r.w*S/2, r.y*S + r.h*S/2, r.w*S, r.h*S);
            this.physics.add.existing(z, true); this.walls.add(z);
        };
        (col.water_rects || []).forEach(addRect);
        (col.border_rects || []).forEach(addRect);
        if (col.blocked_tiles) {
            const bs = col.block_size * S;
            col.blocked_tiles.forEach(([tx, ty]) => {
                const z = this.add.zone(tx*bs + bs/2, ty*bs + bs/2, bs, bs);
                this.physics.add.existing(z, true); this.walls.add(z);
            });
        }

        // Player
        const sp = col.player_spawn || { x: 350, y: 400 };
        this.player = new Player(this, sp.x * S, sp.y * S);
        this.physics.add.collider(this.player.sprite, this.walls);

        // NPCs
        this._setupNPCs(col, npcData, spriteData, S);

        // Enemies
        this._setupEnemies(col, enemyData, S);

        // Doors
        this._setupDoors(col, S);

        // Items
        this._setupItems(col, S);

        // Auto-spawn publication papers
        this._setupPapers(worldNum, col, S);

        // Crates (from collision data, or none)
        this.crates = this.physics.add.staticGroup();
        this.physics.add.collider(this.player.sprite, this.crates);

        // Combat overlaps
        this.physics.add.collider(this.player.sprite, this.enemyGroup);
        this.physics.add.collider(this.enemyGroup, this.walls);
        this.physics.add.overlap(this.player.sprite, this.enemyGroup, (_, enemy) => {
            this.player.takeDamage(enemy.enemyCfg.damage);
            this._updateHearts();
        });

        // Camera
        this.cameras.main.setBounds(0, 0, ww, wh);
        this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);

        // Dialogue state
        this._currentNPC = null;
        this._dialogueNode = 0;
        this._upKey = this.input.keyboard.addKey('UP');
        this._downKey = this.input.keyboard.addKey('DOWN');
        this._prevUp = false;
        this._prevDown = false;

        // HUD bar
        const cam = this.cameras.main;
        const barH = 32;
        this._hudBar = this.add.rectangle(cam.width / 2, barH / 2, cam.width, barH, 0x000000, 0.7)
            .setScrollFactor(0).setDepth(100);

        this._hudBack = this.add.text(8, barH / 2, '← Menu', {
            fontSize: '12px', fontFamily: 'monospace', color: '#ffffff'
        }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(101).setInteractive({ useHandCursor: true });
        this._hudBack.on('pointerdown', () => { this.stopMusic(); this.scene.start('TitleScreen'); });

        this._hudTitle = this.add.text(80, barH / 2, title, {
            fontSize: '12px', fontFamily: 'monospace', color: '#f4e842'
        }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(101);

        // Hearts
        this._hearts = [];
        const heartsX = cam.width / 2 - (this.player.maxHp * 20) / 2;
        for (let i = 0; i < this.player.maxHp; i++) {
            this._hearts.push(this.add.text(heartsX + i * 20, barH / 2, '❤️', {
                fontSize: '14px'
            }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(101));
        }

        this._hudMute = this.add.text(cam.width - 8, barH / 2, this.sound.mute ? '🔇' : '🔊', {
            fontSize: '16px'
        }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(101).setInteractive({ useHandCursor: true });
        this._hudMute.on('pointerdown', () => this._toggleMute());
        this.input.keyboard.on('keydown-M', () => this._toggleMute());

        // Resize handler
        this._ww = ww; this._wh = wh;
        this.scale.on('resize', (gs) => {
            this.cameras.main.setSize(gs.width, gs.height);
            this.cameras.main.setBounds(0, 0, this._ww, this._wh);
            this._hudBar.setPosition(gs.width / 2, barH / 2).setSize(gs.width, barH);
            this._hudMute.setPosition(gs.width - 8, barH / 2);
        });

        this.cameras.main.fadeIn(500);
        if (musicKey) this.playMusic(musicKey);
    }

    _setupNPCs(col, npcData, spriteData, S) {
        this.npcList = [];
        this.npcBodies = this.physics.add.staticGroup();
        this.wanderingNPCs = [];
        const positions = col.npcs || [];

        // Auto-load NPC spritesheets that aren't loaded yet
        // (preload already ran, but sprites are loaded by loadLevelNPCSprites)

        positions.forEach(n => {
            const cfg = npcData[n.id];
            if (!cfg) return;
            const x = n.x * S, y = n.y * S;
            const sDef = spriteData.sprites[cfg.sprite];
            const isWanderer = sDef?.wander;
            let sprite;

            if (this.textures.exists(cfg.sprite)) {
                if (isWanderer) {
                    sprite = this.physics.add.sprite(x, y, cfg.sprite, 0).setScale(sDef.scale || 0.4).setDepth(5);
                    sprite.body.setCollideWorldBounds(true);
                    const key = cfg.sprite;
                    const a = sDef.animations;
                    if (!this.anims.exists(key + '_idle')) {
                        this.anims.create({ key: key + '_idle', frames: this.anims.generateFrameNumbers(key, { start: a.idle.start, end: a.idle.start + a.idle.count - 1 }), frameRate: a.idle.rate, repeat: -1 });
                        this.anims.create({ key: key + '_walk', frames: this.anims.generateFrameNumbers(key, { start: a.walk.start, end: a.walk.start + a.walk.count - 1 }), frameRate: a.walk.rate, repeat: -1 });
                        if (a.walk_down) this.anims.create({ key: key + '_walk_down', frames: this.anims.generateFrameNumbers(key, { start: a.walk_down.start, end: a.walk_down.start + a.walk_down.count - 1 }), frameRate: a.walk_down.rate, repeat: -1 });
                        if (a.walk_up) this.anims.create({ key: key + '_walk_up', frames: this.anims.generateFrameNumbers(key, { start: a.walk_up.start, end: a.walk_up.start + a.walk_up.count - 1 }), frameRate: a.walk_up.rate, repeat: -1 });
                    }
                    sprite.play(key + '_idle');
                    sprite._wanderTimer = 0;
                    sprite._wanderSpeed = sDef.speed || 30;
                    sprite._animKey = key;
                    sprite._hasDirWalk = !!(a.walk_down);
                    this.wanderingNPCs.push(sprite);
                } else {
                    sprite = this.add.sprite(x, y, cfg.sprite, 0).setScale(sDef?.scale || 0.4).setDepth(5);
                    // Idle animation using all frames
                    const key = cfg.sprite;
                    if (!this.anims.exists(key + '_idle')) {
                        const totalFrames = this.textures.get(key).getFrameNames().length || this.textures.get(key).frameTotal - 1;
                        if (totalFrames > 1) {
                            this.anims.create({ key: key + '_idle', frames: this.anims.generateFrameNumbers(key, { start: 0, end: totalFrames - 1 }), frameRate: 3, repeat: -1 });
                        }
                    }
                    if (this.anims.exists(key + '_idle')) sprite.play(key + '_idle');
                }
            } else {
                sprite = this.add.rectangle(x, y, 28, 28, 0xffff00).setDepth(5);
            }

            const label = this.add.text(x, y - sprite.displayHeight/2 - 10, n.id, {
                fontSize: '10px', fontFamily: 'monospace', color: '#fff',
                stroke: '#000', strokeThickness: 2
            }).setOrigin(0.5).setDepth(5);

            if (!isWanderer) {
                const z = this.add.zone(x, y, 28, 28);
                this.physics.add.existing(z, true); this.npcBodies.add(z);
            }
            this.npcList.push({ x, y, id: n.id, dialogue: cfg.dialogue, random: cfg.random, sprite, label, wander: isWanderer });
        });

        this.physics.add.collider(this.player.sprite, this.npcBodies);
        this.wanderingNPCs.forEach(s => {
            this.physics.add.collider(s, this.walls);
            this.physics.add.collider(this.player.sprite, s);
        });
    }

    _setupEnemies(col, enemyData, S) {
        this.enemies = [];
        this.enemyGroup = this.physics.add.group();
        if (!col.enemies || !col.enemies.length) return;

        // Create animations for each enemy type
        col.enemies.forEach(e => {
            const cfg = enemyData[e.type];
            if (!cfg) return;
            const t = e.type;
            if (!this.anims.exists(t + '_walk') && cfg.animations?.walk) {
                const w = cfg.animations.walk;
                this.anims.create({ key: t + '_walk', frames: this.anims.generateFrameNumbers(t, { start: w.start, end: w.start + w.count - 1 }), frameRate: w.rate, repeat: -1 });
            }
            if (!this.anims.exists(t + '_death') && cfg.animations?.death) {
                const d = cfg.animations.death;
                this.anims.create({ key: t + '_death', frames: this.anims.generateFrameNumbers(t, { start: d.start, end: d.start + d.count - 1 }), frameRate: d.rate, repeat: 0 });
            }
            const spr = this.physics.add.sprite(e.x * S, e.y * S, t, 0).setScale(0.4).setDepth(8);
            spr.body.setCollideWorldBounds(true);
            if (this.anims.exists(t + '_walk')) spr.play(t + '_walk');
            spr.enemyCfg = cfg;
            spr._wanderTimer = 0;
            spr._type = t;
            this.enemyGroup.add(spr);
            this.enemies.push(spr);
        });
    }

    _setupDoors(col, S) {
        if (!col.doors) return;
        col.doors.forEach(d => {
            const x = d.x * S, y = d.y * S;
            const z = this.add.zone(x, y, (d.w || 48) * S, (d.h || 48) * S);
            this.physics.add.existing(z, true);
            // Door sprite
            const doorSpr = this.textures.exists('door_closed')
                ? this.add.image(x, y, 'door_closed').setDepth(2)
                : null;
            // Glow
            const glow = this.add.rectangle(x, y, (d.w || 48) * S, (d.h || 48) * S, 0xf4e842, 0.2).setDepth(1);
            this.tweens.add({ targets: glow, alpha: 0.05, duration: 1200, yoyo: true, repeat: -1 });
            this.add.text(x, y - 36, d.label || 'Exit', {
                fontSize: '12px', fontFamily: 'monospace', color: '#f4e842',
                stroke: '#000', strokeThickness: 3
            }).setOrigin(0.5).setDepth(5);
            this.physics.add.overlap(this.player.sprite, z, () => {
                if (this._transitioning) return;
                this._transitioning = true;
                // Swap to open door sprite
                if (doorSpr && this.textures.exists('door_open')) {
                    doorSpr.setTexture('door_open');
                }
                this.transitionTo(d.target);
            });
        });
    }

    _setupItems(col, S) {
        this.itemSprites = [];
        if (!col.items || !col.items.length) return;
        const itemData = this.cache.json.get('itemData') || {};
        const spriteData = this.cache.json.get('spriteData');
        const itemFrames = spriteData?.items?.frames || {};

        col.items.forEach(it => {
            const frame = itemFrames[it.id];
            if (frame === undefined) return;
            const x = it.x * S, y = it.y * S;
            const spr = this.add.sprite(x, y, 'items', frame).setScale(spriteData.items.scale || 0.5).setDepth(5);
            // Floating bob animation
            this.tweens.add({ targets: spr, y: y - 6, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
            // Pickup zone
            const z = this.add.zone(x, y, 32, 32);
            this.physics.add.existing(z, true);
            this.physics.add.overlap(this.player.sprite, z, () => {
                if (spr.active) {
                    this.sfx('pickup', { volume: 0.3 });
                    spr.destroy();
                    z.destroy();
                    const idx = this.itemSprites.indexOf(spr);
                    if (idx >= 0) this.itemSprites.splice(idx, 1);
                }
            });
            // Label
            const name = itemData[it.id]?.name || it.id;
            this.add.text(x, y - 28, name, {
                fontSize: '9px', fontFamily: 'monospace', color: '#42f4a6',
                stroke: '#000', strokeThickness: 2
            }).setOrigin(0.5).setDepth(5);
            this.itemSprites.push(spr);
        });
    }

    _setupPapers(worldNum, col, S) {
        const pubs = this.cache.json.get('publications') || [];
        const level = LEVELS.find(l => l.key.includes(`World${worldNum}`));
        if (!level?.years) return;
        const [yStart, yEnd] = level.years;
        const papers = pubs.filter(p => p.year >= yStart && p.year < yEnd);
        if (!papers.length) return;

        // Build blocked set for walkability check
        const bs = col.block_size;
        const blocked = new Set();
        const blockRect = (r) => {
            const x0 = Math.floor(r.x/bs), y0 = Math.floor(r.y/bs);
            const x1 = Math.ceil((r.x+r.w)/bs), y1 = Math.ceil((r.y+r.h)/bs);
            for (let ty = y0; ty < y1; ty++) for (let tx = x0; tx < x1; tx++) blocked.add(tx+','+ty);
        };
        (col.water_rects || []).forEach(blockRect);
        (col.border_rects || []).forEach(blockRect);
        (col.blocked_tiles || []).forEach(([tx,ty]) => blocked.add(tx + ',' + ty));
        const gridW = Math.ceil(col.world_width / bs), gridH = Math.ceil(col.world_height / bs);
        for (let x = 0; x < gridW; x++) { blocked.add(x+',0'); blocked.add(x+','+(gridH-1)); }
        for (let y = 0; y < gridH; y++) { blocked.add('0,'+y); blocked.add((gridW-1)+','+y); }
        // Block tiles occupied by entities (NPCs, enemies, doors, items, player spawn)
        const blockPoint = (px, py) => { blocked.add(Math.floor(px/bs)+','+Math.floor(py/bs)); };
        (col.npcs || []).forEach(n => blockPoint(n.x, n.y));
        (col.enemies || []).forEach(e => blockPoint(e.x, e.y));
        (col.doors || []).forEach(d => blockPoint(d.x, d.y));
        (col.items || []).forEach(it => blockPoint(it.x, it.y));
        if (col.player_spawn) blockPoint(col.player_spawn.x, col.player_spawn.y);

        // Seeded random from world number for consistent placement
        let seed = worldNum * 9973;
        const rand = () => { seed = (seed * 16807 + 0) % 2147483647; return seed / 2147483647; };

        const placed = [];
        const PAPER_FRAME = 1; // accepted_paper frame in items.png

        const snark = [
            "Another one for the CV!",
            "Reviewer #2 hated this one.",
            "Surprisingly, no bugs were found writing this.",
            "Fueled entirely by coffee.",
            "The deadline was yesterday.",
            "This one almost didn't make it.",
            "Peer review is just organized suffering.",
            "Written between midnight and regret.",
            "The abstract was the hardest part.",
            "At least someone cited it... right?",
            "LaTeX crashed twice during submission.",
            "The experiments worked on the first try. Just kidding.",
            "Camera-ready was submitted 3 minutes before the deadline.",
            "This paper exists because of a whiteboard argument.",
            "Proof by intimidation.",
            "The related work section took longer than the research.",
        ];

        papers.forEach((paper, i) => {
            // Find random walkable position
            let x, y, tx, ty, attempts = 0;
            do {
                tx = 2 + Math.floor(rand() * (gridW - 4));
                ty = 2 + Math.floor(rand() * (gridH - 4));
                attempts++;
            } while (attempts < 200 && (blocked.has(tx+','+ty) || placed.some(p => Math.abs(p[0]-tx) + Math.abs(p[1]-ty) < 3)));
            if (attempts >= 200) return;
            placed.push([tx, ty]);

            x = (tx * bs + bs/2) * S;
            y = (ty * bs + bs/2) * S;

            const spr = this.add.sprite(x, y, 'items', PAPER_FRAME).setScale(0.4).setDepth(5);
            this.tweens.add({ targets: spr, y: y - 6, duration: 800 + i * 50, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

            // Subtle glow
            const glow = this.add.circle(x, y, 14, 0x42f4a6, 0.15).setDepth(4);
            this.tweens.add({ targets: glow, alpha: 0.05, duration: 1000, yoyo: true, repeat: -1 });

            const z = this.add.zone(x, y, 32, 32);
            this.physics.add.existing(z, true);
            this.physics.add.overlap(this.player.sprite, z, () => {
                if (!spr.active) return;
                this.sfx('pickup', { volume: 0.3 });
                spr.destroy(); glow.destroy(); z.destroy();
                const comment = snark[Math.floor(rand() * snark.length)];
                this.showMessage(`📄 "${paper.title}" (${paper.year})\n\n${comment}`);
            });
        });
    }

    // ── Level update (call in update) ─────────────────────

    updateLevel() {
        this.player.update();

        // Dialogue navigation
        if (this.dialogueActive) {
            const upNow = this._upKey.isDown, downNow = this._downKey.isDown;
            if (upNow && !this._prevUp) this.moveChoice(-1);
            if (downNow && !this._prevDown) this.moveChoice(1);
            this._prevUp = upNow; this._prevDown = downNow;
        }

        if (this.player.isAction()) {
            if (this.dialogueActive) this._advanceDialogue();
            else this._tryTalk();
        }

        if (this.player.isAttack() && !this.dialogueActive) this.player.attack();

        // Attack hitbox vs enemies/crates
        if (this.player.attackHitbox) {
            this.enemies.forEach(e => {
                if (e.active && this.physics.overlap(this.player.attackHitbox, e)) this._killEnemy(e);
            });
            this.crates.getChildren().forEach(c => {
                if (c.active && this.physics.overlap(this.player.attackHitbox, c)) this._destroyCrate(c);
            });
        }

        // Enemy wander AI
        this.enemies.forEach(e => {
            if (!e.active) return;
            e._wanderTimer -= this.game.loop.delta;
            if (e._wanderTimer <= 0) {
                e._wanderTimer = 1500 + Math.random() * 2000;
                const dirs = [[1,0],[-1,0],[0,1],[0,-1],[0,0]];
                const [dx, dy] = dirs[Math.floor(Math.random() * dirs.length)];
                e.setVelocity(dx * e.enemyCfg.speed, dy * e.enemyCfg.speed);
                if (dx !== 0) e.setFlipX(dx < 0);
            }
        });

        // Wandering NPC AI
        this.wanderingNPCs.forEach(s => {
            s._wanderTimer -= this.game.loop.delta;
            if (s._wanderTimer <= 0) {
                s._wanderTimer = 2000 + Math.random() * 3000;
                const dirs = [[1,0],[-1,0],[0,1],[0,-1],[0,0]];
                const [dx, dy] = dirs[Math.floor(Math.random() * dirs.length)];
                s.setVelocity(dx * s._wanderSpeed, dy * s._wanderSpeed);
                if (dx !== 0) s.setFlipX(dx < 0);
                if (!dx && !dy) {
                    s.play(s._animKey + '_idle', true);
                } else if (s._hasDirWalk && dy !== 0 && dx === 0) {
                    s.play(s._animKey + (dy > 0 ? '_walk_down' : '_walk_up'), true);
                } else {
                    s.play(s._animKey + '_walk', true);
                }
            }
        });

        // Update wandering NPC positions
        for (const npc of this.npcList) {
            if (npc.wander && npc.sprite) {
                npc.x = npc.sprite.x; npc.y = npc.sprite.y;
                npc.label.setPosition(npc.x, npc.y - npc.sprite.displayHeight/2 - 10);
            }
        }
    }

    // ── Dialogue ──────────────────────────────────────────

    showMessage(text, choices) {
        this._clearMessage();
        this._dialogueActive = true;
        this._choiceIndex = 0;
        this._choices = choices || null;
        this._choiceTexts = [];
        this._textDone = false;

        const cam = this.cameras.main;
        const w = cam.width, h = cam.height;
        const boxH = choices ? 130 : 100;
        const boxW = Math.min(760, w - 40);

        this._msgBox = this.add.rectangle(w/2, h - boxH/2 - 10, boxW, boxH, 0x000000, 0.92)
            .setStrokeStyle(2, 0xf4e842).setScrollFactor(0).setDepth(100);
        this._msgText = this.add.text(w/2 - boxW/2 + 16, h - boxH - 2, '', {
            fontSize: '16px', fontFamily: 'monospace', color: '#ffffff',
            wordWrap: { width: boxW - 32 }
        }).setScrollFactor(0).setDepth(101);

        let i = 0, blipCounter = 0;
        this._typeTimer = this.time.addEvent({
            delay: 30, repeat: text.length - 1,
            callback: () => {
                if (this._msgText) this._msgText.text += text[i];
                if (++blipCounter % 3 === 0 && text[i] !== ' ') this.sfx('blip', { volume: 0.15 });
                if (++i >= text.length) { this._textDone = true; if (choices) this._showChoices(); }
            }
        });
    }

    _showChoices() {
        const cam = this.cameras.main;
        const boxW = Math.min(760, cam.width - 40);
        const baseX = cam.width/2 - boxW/2 + 32;
        const baseY = this._msgText.y + this._msgText.height + 8;
        this._choices.forEach((c, i) => {
            const t = this.add.text(baseX, baseY + i * 22, `${i === this._choiceIndex ? '▶' : ' '} ${c.text}`, {
                fontSize: '14px', fontFamily: 'monospace', color: i === this._choiceIndex ? '#f4e842' : '#aaaaaa'
            }).setScrollFactor(0).setDepth(101);
            this._choiceTexts.push(t);
        });
    }

    _updateChoiceHighlight() {
        if (!this._choiceTexts) return;
        this._choiceTexts.forEach((t, i) => {
            t.setText(`${i === this._choiceIndex ? '▶' : ' '} ${this._choices[i].text}`);
            t.setColor(i === this._choiceIndex ? '#f4e842' : '#aaaaaa');
        });
    }

    moveChoice(dir) {
        if (!this._choices || !this._textDone) return;
        this._choiceIndex = (this._choiceIndex + dir + this._choices.length) % this._choices.length;
        this._updateChoiceHighlight();
        this.sfx('select', { volume: 0.2 });
    }

    getSelectedChoice() {
        if (!this._choices || !this._textDone) return null;
        return this._choices[this._choiceIndex];
    }

    hideMessage() {
        this._clearMessage();
        this._dialogueActive = false;
        this.sfx('confirm', { volume: 0.25 });
    }

    _clearMessage() {
        if (this._msgBox) { this._msgBox.destroy(); this._msgBox = null; }
        if (this._msgText) { this._msgText.destroy(); this._msgText = null; }
        if (this._typeTimer) { this._typeTimer.destroy(); this._typeTimer = null; }
        if (this._choiceTexts) this._choiceTexts.forEach(t => t.destroy());
        this._choiceTexts = [];
        this._choices = null;
    }

    get dialogueActive() { return !!this._dialogueActive; }

    _tryTalk() {
        const px = this.player.sprite.x, py = this.player.sprite.y;
        for (const npc of this.npcList) {
            if (Phaser.Math.Distance.Between(px, py, npc.x, npc.y) < 60) {
                this._currentNPC = npc;
                const start = npc.random ? Math.floor(Math.random() * npc.dialogue.length) : 0;
                this._dialogueNode = start;
                this._showNode(start);
                return;
            }
        }
    }

    _showNode(index) {
        const nodes = this._currentNPC.dialogue;
        if (index >= nodes.length) { this.hideMessage(); this._currentNPC = null; return; }
        this._dialogueNode = index;
        this.showMessage(nodes[index].text, nodes[index].choices || null);
    }

    _findNode(id) {
        return this._currentNPC.dialogue.findIndex(n => n.id === id);
    }

    _advanceDialogue() {
        if (!this._currentNPC) { this.hideMessage(); return; }
        const node = this._currentNPC.dialogue[this._dialogueNode];
        if (node.choices) {
            const choice = this.getSelectedChoice();
            if (!choice) return;
            if (choice.next) { const idx = this._findNode(choice.next); if (idx >= 0) { this._showNode(idx); return; } }
            this.hideMessage(); this._currentNPC = null; return;
        }
        let next = this._dialogueNode + 1;
        const nodes = this._currentNPC.dialogue;
        while (next < nodes.length && nodes[next].id) next++;
        if (next < nodes.length && !this._currentNPC.random) this._showNode(next);
        else {
            if (node.flee) this._fleeNPC(this._currentNPC);
            this.hideMessage(); this._currentNPC = null;
        }
    }

    // ── Combat helpers ────────────────────────────────────

    _fleeNPC(npc) {
        const s = npc.sprite;
        if (!s || !s.body) return;
        const dx = s.x - this.player.sprite.x;
        const dy = s.y - this.player.sprite.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const speed = (s._wanderSpeed || 30) * 5;
        s.setVelocity(dx / len * speed, dy / len * speed);
        if (dx !== 0) s.setFlipX(dx < 0);
        if (s._animKey) s.play(s._animKey + '_walk', true);
        s._wanderTimer = 2000;
    }

    _killEnemy(enemy) {
        enemy.setVelocity(0);
        const t = enemy._type || 'bug';
        if (this.anims.exists(t + '_death')) enemy.play(t + '_death');
        this.sfx('hit');
        enemy.on('animationcomplete', () => { this.sfx('enemyDeath'); enemy.destroy(); });
        const idx = this.enemies.indexOf(enemy);
        if (idx >= 0) this.enemies.splice(idx, 1);
    }

    _destroyCrate(crate) {
        this.sfx('crateBreak');
        for (let i = 0; i < 4; i++) {
            const p = this.add.rectangle(crate.x + Phaser.Math.Between(-10,10), crate.y + Phaser.Math.Between(-10,10), 8, 8, 0x8B4513).setDepth(15);
            this.tweens.add({ targets: p, alpha: 0, y: p.y - 30, duration: 400, onComplete: () => p.destroy() });
        }
        crate.destroy();
    }

    _updateHearts() {
        this._hearts.forEach((h, i) => h.setText(i < this.player.hp ? '❤️' : '🖤'));
    }

    onPlayerDeath() {
        this.player.sprite.setVelocity(0);
        this.cameras.main.shake(300, 0.02);
        // Game Over overlay
        this.time.delayedCall(600, () => {
            const cam = this.cameras.main;
            const bg = this.add.rectangle(cam.width/2, cam.height/2, cam.width, cam.height, 0x000000, 0)
                .setScrollFactor(0).setDepth(300);
            const txt = this.add.text(cam.width/2, cam.height/2, 'GAME OVER', {
                fontSize: '48px', fontFamily: 'monospace', color: '#e94560',
                stroke: '#000', strokeThickness: 6
            }).setOrigin(0.5).setScrollFactor(0).setDepth(301).setAlpha(0);
            this.tweens.add({ targets: bg, alpha: 0.7, duration: 800 });
            this.tweens.add({ targets: txt, alpha: 1, duration: 800 });
            this.time.delayedCall(2500, () => {
                this.stopMusic();
                this.scene.start('TitleScreen');
            });
        });
    }

    transitionTo(sceneKey) {
        this.sfx('doorOpen', { volume: 0.3 });
        this.stopMusic();
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(sceneKey));
    }

    // ── Helper: load NPC spritesheets from sprites.json ──

    loadNPCSprites(npcIds) {
        // Load sprites.json first, then in create we'll have it
        // For preload, we need to load the spritesheets directly
        // This reads the JSON synchronously if already cached, otherwise we load all known sprites
        const knownSprites = {
            doris: { w: 76 }, father: { w: 76 }, wolfgang: { w: 177 }, monika: { w: 75 },
            christine: { w: 77 }, valentin: { w: 69 }, tobert: { w: 93 }, ben: { w: 81 },
            podelski: { w: 76 }, podelski_dog: { w: 145 }, byron: { w: 60 }, byron2: { w: 57 }, dejan: { w: 80 },
            evren: { w: 115 }, john: { w: 72 }, stephan: { w: 82 }, zhiming: { w: 71 },
            lauren: { w: 118 }, willem: { w: 116 }
        };
        npcIds.forEach(id => {
            const s = knownSprites[id];
            if (s) this.load.spritesheet(id, `assets/sprites/${id}.png`, { frameWidth: s.w, frameHeight: 188 });
        });
        // Bug enemy
        this.load.spritesheet('bug', 'assets/sprites/bug.png', { frameWidth: 101, frameHeight: 94 });
    }
}
