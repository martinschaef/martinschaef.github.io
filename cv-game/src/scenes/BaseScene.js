import { AUDIO } from '../config/audio.js';
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
        const cam = this.cameras.main;
        this._muteBtn = this.add.text(cam.width - 12, 12, this.sound.mute ? '🔇' : '🔊', {
            fontSize: '22px'
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(200).setInteractive({ useHandCursor: true });
        this._muteBtn.on('pointerdown', () => this._toggleMute());
        this.input.keyboard.on('keydown-M', () => this._toggleMute());
    }

    _toggleMute() {
        this.sound.mute = !this.sound.mute;
        if (this._muteBtn) this._muteBtn.setText(this.sound.mute ? '🔇' : '🔊');
    }

    // ── Level asset loading (call in preload) ─────────────

    loadLevelAssets(worldNum) {
        this.load.spritesheet('martin', 'assets/sprites/martin.png', { frameWidth: 104, frameHeight: 183 });
        this.load.image(`world${worldNum}_bg`, `assets/tilemaps/world${worldNum}_bg.png`);
        this.load.json(`world${worldNum}_collision`, `assets/tilemaps/world${worldNum}_collision.json`);
        this.load.json('spriteData', 'data/sprites.json');
        this.load.json('enemyData', 'data/enemies.json');
        this.load.json(`npcData_w${worldNum}`, `data/world${worldNum}_npcs.json`);
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

        // Crates near first door
        this.crates = this.physics.add.staticGroup();
        if (col.doors && col.doors.length > 0) {
            const door = col.doors[0];
            const dx = door.x * S, dy = door.y * S;
            for (let i = -1; i <= 1; i++) {
                const c = this.add.rectangle(dx + i * 50, dy + 60, 40, 40, 0x8B4513).setDepth(5).setStrokeStyle(2, 0x5C3317);
                this.physics.add.existing(c, true); this.crates.add(c);
            }
        }
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

        // HUD
        this.add.text(16, 16, title, {
            fontSize: '14px', fontFamily: 'monospace', color: '#f4e842',
            stroke: '#000', strokeThickness: 3
        }).setScrollFactor(0).setDepth(100);
        this.add.text(16, 36, 'WASD/Arrows: Move | E/Space: Talk | Z: Attack | ↑↓: Choose', {
            fontSize: '11px', fontFamily: 'monospace', color: '#cbdbfc',
            stroke: '#000', strokeThickness: 2
        }).setScrollFactor(0).setDepth(100);

        // Hearts
        this._hearts = [];
        for (let i = 0; i < this.player.maxHp; i++) {
            this._hearts.push(this.add.text(16 + i * 24, 56, '❤️', { fontSize: '18px' }).setScrollFactor(0).setDepth(100));
        }

        // Resize handler
        this._ww = ww; this._wh = wh;
        this.scale.on('resize', (gs) => {
            this.cameras.main.setSize(gs.width, gs.height);
            this.cameras.main.setBounds(0, 0, this._ww, this._wh);
        });

        this.cameras.main.fadeIn(500);
        if (musicKey) this.playMusic(musicKey);
        this.createMuteButton();
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
                    if (!this.anims.exists(key + '_idle')) {
                        const a = sDef.animations;
                        this.anims.create({ key: key + '_idle', frames: this.anims.generateFrameNumbers(key, { start: a.idle.start, end: a.idle.start + a.idle.count - 1 }), frameRate: a.idle.rate, repeat: -1 });
                        this.anims.create({ key: key + '_walk', frames: this.anims.generateFrameNumbers(key, { start: a.walk.start, end: a.walk.start + a.walk.count - 1 }), frameRate: a.walk.rate, repeat: -1 });
                    }
                    sprite.play(key + '_idle');
                    sprite._wanderTimer = 0;
                    sprite._wanderSpeed = sDef.speed || 30;
                    sprite._animKey = key;
                    this.wanderingNPCs.push(sprite);
                } else {
                    sprite = this.add.sprite(x, y, cfg.sprite, 0).setScale(sDef?.scale || 0.4).setDepth(5);
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
            this.npcList.push({ x, y, id: n.id, dialogue: cfg.dialogue, sprite, label, wander: isWanderer });
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
            const z = this.add.zone(d.x * S, d.y * S, (d.w || 48) * S, (d.h || 48) * S);
            this.physics.add.existing(z, true);
            this.add.rectangle(d.x * S, d.y * S, (d.w || 48) * S, (d.h || 48) * S, 0xf4e842, 0.15).setDepth(1);
            this.add.text(d.x * S, d.y * S - 20 * S, d.label || '🚪', {
                fontSize: '12px', fontFamily: 'monospace', color: '#f4e842',
                stroke: '#000', strokeThickness: 2
            }).setOrigin(0.5).setDepth(5);
            this.physics.add.overlap(this.player.sprite, z, () => {
                if (this._transitioning) return;
                this._transitioning = true;
                this.transitionTo(d.target);
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
                s.play(dx || dy ? s._animKey + '_walk' : s._animKey + '_idle', true);
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
                this._dialogueNode = 0;
                this._showNode(0);
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
        if (next < nodes.length) this._showNode(next);
        else { this.hideMessage(); this._currentNPC = null; }
    }

    // ── Combat helpers ────────────────────────────────────

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
        this.time.delayedCall(1000, () => this.scene.restart());
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
            lauren: { w: 103 }, willem: { w: 116 }
        };
        npcIds.forEach(id => {
            const s = knownSprites[id];
            if (s) this.load.spritesheet(id, `assets/sprites/${id}.png`, { frameWidth: s.w, frameHeight: 188 });
        });
        // Bug enemy
        this.load.spritesheet('bug', 'assets/sprites/bug.png', { frameWidth: 101, frameHeight: 94 });
    }
}
