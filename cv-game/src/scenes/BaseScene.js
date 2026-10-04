import { AUDIO, ASSET_VERSION } from '../config/audio.js';
import { LEVELS } from '../config/levels.js';
import { Player } from '../entities/Player.js';

export class BaseScene extends Phaser.Scene {

    // ── Audio ──────────────────────────────────────────────

    loadAudio(...musicKeys) {
        for (const [key, path] of Object.entries(AUDIO)) {
            if (key.startsWith('music') && !musicKeys.includes(key)) continue;
            this.load.audio(key, `${path}?v=${ASSET_VERSION}`);
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
        const v = `?v=${ASSET_VERSION}`;
        this.load.spritesheet('martin', `assets/sprites/martin.png${v}`, { frameWidth: 112, frameHeight: 183 });
        this.load.image(`world${worldNum}_bg`, `assets/tilemaps/world${worldNum}_bg.png${v}`);
        this.load.json(`world${worldNum}_collision`, `assets/tilemaps/world${worldNum}_collision.json${v}`);
        this.load.json('spriteData', `data/sprites.json${v}`);
        this.load.json('enemyData', `data/enemies.json${v}`);
        this.load.json(`npcData_w${worldNum}`, `data/world${worldNum}_npcs.json${v}`);
        this.load.json('itemData', `data/items.json${v}`);
        this.load.json('publications', `../publications.json${v}`);
        this.load.once('loaderror', (file) => {
            if (file.key === 'publications') console.warn('publications.json not found — serve from the repo root (see README), otherwise no papers spawn.');
        });
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
        // Scene instances are reused across restarts; clear stale per-run state
        this._transitioning = false;
        this._dialogueActive = false;
        this._worldNum = worldNum;
        this._harmless = !!col.harmless_enemies;

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
        // A door can hand over a spawn point (e.g. coming back out of a building)
        const sp = this.scene.settings.data?.spawn || col.player_spawn || { x: 350, y: 400 };
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

        // Map signs (building names added on top of the painted map)
        this._setupSigns(col, S);

        // Auto-spawn publication papers
        this._setupPapers(worldNum, col, S);

        // Crates (from collision data, or none)
        this.crates = this.physics.add.staticGroup();
        this.physics.add.collider(this.player.sprite, this.crates);

        // Combat overlaps
        this.physics.add.collider(this.player.sprite, this.enemyGroup);
        this.physics.add.collider(this.enemyGroup, this.walls);
        this.physics.add.overlap(this.player.sprite, this.enemyGroup, (_, enemy) => {
            if (this._harmless) return;
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
        this._buildHearts();

        this._hudMute = this.add.text(cam.width - 8, barH / 2, this.sound.mute ? '🔇' : '🔊', {
            fontSize: '16px'
        }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(101).setInteractive({ useHandCursor: true });
        this._hudMute.on('pointerdown', () => this._toggleMute());
        this.input.keyboard.on('keydown-M', () => this._toggleMute());

        // Desktop: translucent controls legend, bottom-left
        if (this.sys.game.device.os.desktop) {
            this._hudControls = this.add.text(10, cam.height - 10,
                'WASD / ←↑↓→  move\nE / SPACE    talk\nZ / click    attack\nM            mute', {
                fontSize: '11px', fontFamily: 'monospace', color: '#ffffff',
                backgroundColor: '#000000', padding: { x: 8, y: 6 }, lineSpacing: 2
            }).setOrigin(0, 1).setScrollFactor(0).setDepth(100).setAlpha(0.55);
        }

        // Resize handler
        this._ww = ww; this._wh = wh;
        this.scale.on('resize', (gs) => {
            this.cameras.main.setSize(gs.width, gs.height);
            this.cameras.main.setBounds(0, 0, this._ww, this._wh);
            this._hudBar.setPosition(gs.width / 2, barH / 2).setSize(gs.width, barH);
            this._hudMute.setPosition(gs.width - 8, barH / 2);
            if (this._hudControls) this._hudControls.setPosition(10, gs.height - 10);
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

            const label = this.add.text(x, y - sprite.displayHeight/2 - 10, cfg.name || n.id, {
                fontSize: '10px', fontFamily: 'monospace', color: '#fff',
                stroke: '#000', strokeThickness: 2
            }).setOrigin(0.5).setDepth(5);

            if (!isWanderer) {
                const z = this.add.zone(x, y, 28, 28);
                this.physics.add.existing(z, true); this.npcBodies.add(z);
            }
            this.npcList.push({ x, y, id: n.id, cfg, dialogue: cfg.dialogue, random: cfg.random, sprite, label, wander: isWanderer });
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
                if (!this._cond(d.requires)) {
                    // Locked: bounce the player back out and explain, at most every few seconds
                    const p = this.player, ang = Phaser.Math.Angle.Between(x, y, p.sprite.x, p.sprite.y);
                    const out = Math.max(z.width, z.height) / 2 + 24;
                    p.sprite.setPosition(x + Math.cos(ang) * out, y + Math.sin(ang) * out);
                    p.sprite.setVelocity(0);
                    if (!this.dialogueActive && this.time.now > (this._lockedMsgUntil || 0)) {
                        this._lockedMsgUntil = this.time.now + 2500;
                        this._currentNPC = null;
                        this.showMessage(d.locked_text || 'The door is locked.');
                    }
                    return;
                }
                this._transitioning = true;
                // Swap to open door sprite
                if (doorSpr && this.textures.exists('door_open')) {
                    doorSpr.setTexture('door_open');
                }
                this.transitionTo(d.target, d.spawn ? { spawn: d.spawn } : undefined);
            });
        });
    }

    _setupSigns(col, S) {
        (col.signs || []).forEach(sg => {
            this.add.text(sg.x * S, sg.y * S, sg.text, {
                fontSize: '13px', fontFamily: 'monospace', color: '#000000', fontStyle: 'bold',
                backgroundColor: '#f2eee0', padding: { x: 6, y: 3 }
            }).setOrigin(0.5).setDepth(6);
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
                    this.setFlag('has_' + it.id);
                    const info = itemData[it.id];
                    if (info) { this._currentNPC = null; this.showMessage(`Got: ${info.name}!\n\n${info.description}`); }
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

        const commentFor = this._paperCommenter();

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
                this.registry.set('papersFound', (this.registry.get('papersFound') || 0) + 1);
                this.setFlag(`papers_w${worldNum}`, (this.getFlag(`papers_w${worldNum}`) || 0) + 1);
                const comment = commentFor(paper);
                this.showMessage(`📄 "${paper.title}" (${paper.year})\n\n${comment}`);
            });
        });
    }


    // Builds a comment generator for paper pickups: puns, co-author shoutouts, and
    // venue nods. Each pool is dealt without repeats until it is exhausted.
    _paperCommenter() {
        const PUNS = [
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
            "Figure 3 was drawn in PowerPoint. Nobody noticed.",
            "Reviewer #1 asked for more experiments. Reviewer #3 asked for fewer.",
            "The title went through 14 revisions. The proof went through 2.",
            "Shepherded. Which is a polite word for 'rewritten'.",
            "The rebuttal was longer than the paper.",
            "Section 5 is where the honesty lives.",
            "Submitted at 23:59 AoE. Anywhere on Earth is a lifestyle.",
            "Theorem 2 is true. Theorem 3 is true in the appendix.",
            "'Future work' is academic for 'we ran out of time'.",
            "The benchmark suite was 60% one stubborn program.",
            "Accepted with minor revisions. There is no such thing.",
            "This one was presented with a cold and a borrowed laptop.",
            "The bibliography has more entries than the paper has pages.",
            "Sound, complete, and submitted late.",
            "The reviewers 'enjoyed reading it'. Strong accept energy.",
            "Written in a hotel lobby during a different conference.",
            "The artifact evaluation committee found a typo. In the README.",
            "Every lemma here was once a bug.",
            "The tool has since been renamed twice.",
            "'Novel' appears 11 times. Reviewers counted.",
            "Someone, somewhere, implemented this. Probably wrong.",
            "The 'simple' example took three days to construct.",
            "It compiles. That is the main result.",
            "The talk ran long. The questions ran longer.",
        ];
        const SHOUTOUTS = [
            (a) => `Co-written with ${a}, who did the hard part.`,
            (a) => `${a} fixed the proof the night before the deadline. Hero.`,
            (a) => `Shoutout to ${a} for surviving the rebuttal.`,
            (a) => `${a} drew the figures. They are the best part.`,
            (a) => `Thanks to ${a} for saying 'that can't be right' at the right moment.`,
            (a) => `${a} ran the experiments. Twice. Reviewers wanted a third run.`,
            (a) => `Co-author ${a} still has the whiteboard photo.`,
            (a) => `${a} and I argued about one definition for a week. ${a} was right.`,
            (a) => `Written with ${a}, who read the related work so nobody else had to.`,
            (a) => `${a} caught the off-by-one in Lemma 4. Lemma 4 is now Lemma 3.`,
            (a) => `${a} presented this one while I hid in the audience.`,
            (a) => `Big thanks to ${a}. The coffee was on me, the ideas were theirs.`,
            (a, all) => `${all.length + 1} authors, one Overleaf project, zero merge conflicts. Thanks ${a}.`,
        ];
        const VENUE = [
            (v) => `Presented at ${v}. The coffee there was fine.`,
            (v) => `Accepted at ${v}. Nobody asked a hostile question. Suspicious.`,
            (v) => `${v}: good talks, better hallway conversations.`,
            (v) => `Flew across an ocean to present at ${v} for 20 minutes.`,
        ];

        const deal = (pool, rnd) => {
            let deck = [];
            return () => {
                if (!deck.length) {
                    deck = pool.slice();
                    for (let i = deck.length - 1; i > 0; i--) {
                        const j = Math.floor(rnd() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]];
                    }
                }
                return deck.pop();
            };
        };
        const rnd = Math.random;
        const nextPun = deal(PUNS, rnd), nextShout = deal(SHOUTOUTS, rnd), nextVenue = deal(VENUE, rnd);

        const coauthors = (paper) => String(paper.authors || '')
            .split(/,\s*|\s+and\s+/).map(a => a.trim().replace(/^and\s+/, '').replace(/\s*\(.*?\)\s*$/, ''))
            .filter(a => a && !/sch[aä]e?f/i.test(a));
        const shortVenue = (paper) => {
            const m = /\(([A-Za-z&+\- ]{2,12})\)/.exec(paper.venue || '');
            return m ? m[1] : null;
        };

        return (paper) => {
            const roll = rnd();
            const others = coauthors(paper);
            if (roll < 0.4 && others.length) {
                const a = others[Math.floor(rnd() * others.length)];
                return nextShout()(a, others);
            }
            const v = shortVenue(paper);
            if (roll < 0.55 && v) return nextVenue()(v);
            return nextPun();
        };
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
                const talksKey = 'talks:' + npc.id;
                const talks = this.getFlag(talksKey) || 0;
                // First state whose condition holds wins; the NPC's top-level dialogue is the fallback
                const st = (npc.cfg?.states || []).find(s => this._cond(s.if, talks)) || npc.cfg || npc;
                this.setFlag(talksKey, talks + 1);
                const dialogue = st.dialogue || npc.dialogue;
                if (!dialogue?.length) return;
                // "cycle": one line per visit, in order. "random": one random line per visit.
                const single = st.cycle || st.random;
                this._currentNPC = { ...npc, dialogue, random: single };
                let start = 0;
                if (st.cycle) start = talks % dialogue.length;
                else if (st.random) start = Math.floor(Math.random() * dialogue.length);
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
        this._applyEffects(nodes[index]);
        this.showMessage(this._fillTemplate(nodes[index].text), nodes[index].choices || null);
    }

    // Live values usable in dialogue text, e.g. "{bugsLeft} bugs to go"
    _fillTemplate(text) {
        const left = (this.enemies || []).length;
        return text
            .replace(/\{bugsLeft\}/g, String(left))
            .replace(/\{bugsNoun\}/g, left === 1 ? 'bug' : 'bugs')
            .replace(/\{papersHere\}/g, String(this.getFlag(`papers_w${this._worldNum}`) || 0));
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
            this._applyEffects(choice);
            if (choice.next) { const idx = this._findNode(choice.next); if (idx >= 0) { this._showNode(idx); return; } }
            this.hideMessage(); this._currentNPC = null; return;
        }
        if (node.goto) {
            this.hideMessage(); this._currentNPC = null;
            if (!this._transitioning) { this._transitioning = true; this.transitionTo(node.goto); }
            return;
        }
        // Explicit jump, or: a branch target (node with an id) ends the conversation
        if (node.next) { const idx = this._findNode(node.next); if (idx >= 0) { this._showNode(idx); return; } }
        if (node.id) {
            if (node.flee) this._fleeNPC(this._currentNPC);
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
        const idx = this.enemies.indexOf(enemy);
        if (idx >= 0) this.enemies.splice(idx, 1);
        this.registry.set('bugsSquashed', (this.registry.get('bugsSquashed') || 0) + 1);
        if (this.enemies.length === 0) this.setFlag(`bugs_cleared_w${this._worldNum}`);
        // Stop it from hurting the player while it dies
        enemy.body.enable = false;
        enemy.setVelocity(0);
        this.sfx('hit');

        // Hit feedback: white flash, knockback away from the player, tiny shake
        enemy.setTintFill(0xffffff);
        this.time.delayedCall(70, () => enemy.active && enemy.clearTint());
        const ang = Phaser.Math.Angle.Between(this.player.sprite.x, this.player.sprite.y, enemy.x, enemy.y);
        this.tweens.add({ targets: enemy, x: enemy.x + Math.cos(ang) * 18, y: enemy.y + Math.sin(ang) * 18, duration: 120, ease: 'Quad.easeOut' });
        this.cameras.main.shake(60, 0.004);

        const finish = () => {
            if (!enemy.active) return;
            this.sfx('enemyDeath');
            this.tweens.add({ targets: enemy, alpha: 0, duration: 150, onComplete: () => enemy.destroy() });
        };
        const t = enemy._type || 'bug';
        if (this.anims.exists(t + '_death')) {
            enemy.play(t + '_death');
            enemy.once('animationcomplete', finish);
        } else {
            this.time.delayedCall(150, finish);
        }
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

    _buildHearts() {
        (this._hearts || []).forEach(h => h.destroy());
        this._hearts = [];
        const cam = this.cameras.main, barH = 32;
        const heartsX = cam.width / 2 - (this.player.maxHp * 20) / 2;
        for (let i = 0; i < this.player.maxHp; i++) {
            this._hearts.push(this.add.text(heartsX + i * 20, barH / 2, '❤️', {
                fontSize: '14px'
            }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(101));
        }
        this._updateHearts();
    }

    // ── Quest state ───────────────────────────────────────
    // Flags live in the game registry so they survive level transitions.
    // They are reset when a new game starts (TitleScreen).

    _flags() {
        let f = this.registry.get('flags');
        if (!f) { f = {}; this.registry.set('flags', f); }
        return f;
    }

    setFlag(name, value = true) { this._flags()[name] = value; }
    getFlag(name) { return this._flags()[name]; }

    // Condition syntax: undefined (always), "flag", "!flag", "name>=N" (numeric flag), "talks>=N" (talks with the
    // current NPC), or an array of those that must all hold.
    _cond(expr, talks = 0) {
        if (expr === undefined || expr === null) return true;
        if (Array.isArray(expr)) return expr.every(e => this._cond(e, talks));
        const m = /^talks\s*>=\s*(\d+)$/.exec(expr);
        if (m) return talks >= Number(m[1]);
        // Numeric flags, e.g. "papers_w2>=2"
        const n = /^([\w:]+)\s*>=\s*(\d+)$/.exec(expr);
        if (n) return (Number(this.getFlag(n[1])) || 0) >= Number(n[2]);
        if (expr.startsWith('!')) return !this.getFlag(expr.slice(1));
        return !!this.getFlag(expr);
    }

    // Side effects attached to a dialogue node or choice
    _applyEffects(obj) {
        if (!obj) return;
        if (obj.set) [].concat(obj.set).forEach(f => this.setFlag(f));
        if (obj.reward) this._grantReward(obj.reward);
    }

    _toast(msg) {
        const t = this.add.text(this.cameras.main.width / 2, 60, msg, {
            fontSize: '16px', fontFamily: 'monospace', color: '#f4e842', stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5).setScrollFactor(0).setDepth(150);
        this.tweens.add({ targets: t, y: 90, alpha: 0, delay: 1200, duration: 800, onComplete: () => t.destroy() });
    }

    // reward: "beer", "extra_heart" or "extra_heart:<tag>" (each tag once), "chips:<amount>" (repeatable)
    _grantReward(reward) {
        const [kind, arg] = reward.split(':');
        if (kind === 'chips') {
            const n = Number(arg) || 1000;
            this.registry.set('chips', (this.registry.get('chips') || 0) + n);
            this.sfx('pickup', { volume: 0.4 });
            this._toast(`🎰 +${n.toLocaleString('en-US')} Laxino chips`);
            return;
        }
        if (this.getFlag('reward:' + reward)) return;
        this.setFlag('reward:' + reward);
        if (kind === 'beer') {
            // A friendly Saarland beer: the world sways for a few seconds
            const cam = this.cameras.main;
            this.tweens.add({ targets: cam, rotation: 0.035, duration: 700, yoyo: true, repeat: 3, ease: 'Sine.easeInOut',
                onComplete: () => cam.setRotation(0) });
            this.tweens.add({ targets: cam, zoom: 1.04, duration: 1400, yoyo: true, ease: 'Sine.easeInOut' });
            this.sfx('confirm', { volume: 0.4 });
            return;
        }
        if (kind === 'extra_heart') {
            const max = (this.registry.get('maxHp') || 3) + 1;
            this.registry.set('maxHp', max);
            this.player.maxHp = max;
            this.player.hp = max;
            this._buildHearts();
            this.sfx('pickup', { volume: 0.4 });
            this.cameras.main.flash(250, 244, 232, 66);
            this._toast('❤️ +1 max heart');
        }
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

    transitionTo(sceneKey, data) {
        this.sfx('doorOpen', { volume: 0.3 });
        this.stopMusic();
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(sceneKey, data));
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
            lauren: { w: 118 }, willem: { w: 116 }, paul: { w: 76 },
            tancrede: { w: 69 }, emmi: { w: 81 }, ioannis: { w: 177 }, numair: { w: 72 }
        };
        npcIds.forEach(id => {
            const s = knownSprites[id];
            if (s) this.load.spritesheet(id, `assets/sprites/${id}.png`, { frameWidth: s.w, frameHeight: 188 });
        });
        // Bug enemy
        this.load.spritesheet('bug', 'assets/sprites/bug.png', { frameWidth: 101, frameHeight: 94 });
    }
}
