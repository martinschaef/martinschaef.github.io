import { LEVELS } from '../config/levels.js';
import { AUDIO } from '../config/audio.js';

// Pixel-art portraits across the decades (built by tools/build_title_portraits.py)
const PORTRAIT_YEARS = ['1994', '1998', '2006', '2011', '2018', '2025'];
const PORTRAIT_W = 384, PORTRAIT_H = 480;

export class TitleScreen extends Phaser.Scene {
    constructor() {
        super('TitleScreen');
    }

    preload() {
        PORTRAIT_YEARS.forEach(y => this.load.image('portrait_' + y, `assets/title/portrait_${y}.png`));
        if (!this.cache.audio.exists('musicTitle')) this.load.audio('musicTitle', AUDIO.musicTitle);
        this.load.on('loaderror', (file) => console.warn('Title asset not found (skipped):', file.key));
    }

    create() {
        const w = this.cameras.main.width, h = this.cameras.main.height;
        const cx = w/2;

        this._buildBackdrop(w, h);
        this._startMontage(w, h);
        this._startMusic();

        // Restart on resize so the layout recomputes (menu + montage are size-dependent)
        this._layoutW = w; this._layoutH = h;
        this._onResize = (gs) => {
            if (this._leaving) return;
            if (Math.abs(gs.width - this._layoutW) < 40 && Math.abs(gs.height - this._layoutH) < 40) return;
            this.scene.restart();
        };
        this.scale.on('resize', this._onResize, this);
        this.events.once('shutdown', () => {
            this.scale.off('resize', this._onResize, this);
            if (this._music) { this._music.stop(); this._music = null; }
        });

        this.add.text(cx, h * 0.12, 'CAREER QUEST', {
            fontSize: '48px', fontFamily: 'monospace', color: '#f4e842',
            stroke: '#000', strokeThickness: 6
        }).setOrigin(0.5);

        this.add.text(cx, h * 0.22, 'The Martin Schaef Story', {
            fontSize: '18px', fontFamily: 'monospace', color: '#cbdbfc'
        }).setOrigin(0.5);

        this._createButton(cx, h * 0.38, 'START GAME', () => this._start());
        this._createButton(cx, h * 0.50, 'LEVEL SELECT ▾', () => this._toggleLevelSelect());
        this._createButton(cx, h * 0.62, 'CREDITS', () => this._leave('CreditsScreen'));
        this._createButton(cx, h * 0.74, 'ABOUT', () => this._showAbout());

        const prompt = this.add.text(cx, h - 28, 'Press ENTER or tap START', {
            fontSize: '14px', fontFamily: 'monospace', color: '#cbdbfc', stroke: '#000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(5);
        this.tweens.add({ targets: prompt, alpha: 0, duration: 600, yoyo: true, repeat: -1 });

        this.input.keyboard.on('keydown-ENTER', () => this._start());
        this.input.keyboard.on('keydown-M', () => this._toggleMute());
        this._muteBtn = this.add.text(w - 10, 10, this.sound.mute ? '🔇' : '🔊', { fontSize: '20px' })
            .setOrigin(1, 0).setDepth(60).setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this._toggleMute());
        this.cameras.main.fadeIn(800);

        this._levelPanel = null;
        this._aboutBox = null;

        // Figure out which scenes are registered
        this._availableScenes = new Set(Object.keys(this.scene.manager.keys));
    }

    _start() {
        this._goToLevel(LEVELS[0].key);
    }

    _goToLevel(key) {
        if (!this._availableScenes.has(key)) {
            this._flash('Coming soon!');
            return;
        }
        this.registry.set('papersFound', 0);
        this.registry.set('bugsSquashed', 0);
        this.registry.set('flags', {});
        this.registry.set('maxHp', 3);
        this.registry.set('chips', 0);
        this._leave(key);
    }

    _leave(key) {
        if (this._leaving) return;
        this._leaving = true;
        if (this._music) this.tweens.add({ targets: this._music, volume: 0, duration: 450 });
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(key));
    }

    // ── Audio ──────────────────────────────────────────────

    _startMusic() {
        if (!this.cache.audio.exists('musicTitle')) return;
        const play = () => {
            if (this._music || this._leaving) return;
            this._music = this.sound.add('musicTitle', { loop: true, volume: 0 });
            this._music.play();
            this.tweens.add({ targets: this._music, volume: 0.45, duration: 2000 });
        };
        // Browsers block audio until the first user gesture; Phaser unlocks on it.
        if (this.sound.locked) this.sound.once('unlocked', play); else play();
    }

    _toggleMute() {
        this.sound.mute = !this.sound.mute;
        if (this._muteBtn) this._muteBtn.setText(this.sound.mute ? '🔇' : '🔊');
    }

    // ── Heroic backdrop: night sky, light rays, pixel skyline ──

    _buildBackdrop(w, h) {
        const g = this.add.graphics().setDepth(-30);
        // Banded night-sky gradient (works on both Canvas and WebGL renderers)
        const top = Phaser.Display.Color.ValueToColor(0x0a0a2a), bot = Phaser.Display.Color.ValueToColor(0x3a2060);
        const bands = 24;
        for (let i = 0; i < bands; i++) {
            const c = Phaser.Display.Color.Interpolate.ColorWithColor(top, bot, bands - 1, i);
            g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
            g.fillRect(0, Math.floor(i * h / bands), w, Math.ceil(h / bands) + 1);
        }

        // Twinkling stars
        const rnd = new Phaser.Math.RandomDataGenerator(['career-quest']);
        for (let i = 0; i < 70; i++) {
            const s = this.add.rectangle(rnd.between(0, w), rnd.between(0, h * 0.8), 2, 2, 0xffffff)
                .setDepth(-25).setAlpha(rnd.realInRange(0.2, 0.9));
            this.tweens.add({ targets: s, alpha: 0.1, duration: rnd.between(900, 2600),
                yoyo: true, repeat: -1, delay: rnd.between(0, 2000) });
        }

        // Rotating light rays from behind the skyline (additive, faint)
        const rays = this.add.container(w / 2, h * 0.92).setDepth(-20);
        const rg = this.add.graphics();
        rg.fillStyle(0xf4e842, 1);
        const len = Math.max(w, h) * 1.3;
        for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2, hw = 0.035;
            rg.fillTriangle(0, 0,
                Math.cos(a - hw) * len, Math.sin(a - hw) * len,
                Math.cos(a + hw) * len, Math.sin(a + hw) * len);
        }
        rg.setAlpha(0.07).setBlendMode(Phaser.BlendModes.ADD);
        rays.add(rg);
        this.tweens.add({ targets: rays, angle: 360, duration: 90000, repeat: -1 });
        this.tweens.add({ targets: rg, alpha: 0.13, duration: 3500, yoyo: true, repeat: -1 });

        // Pixel skyline silhouette with lit windows, Empire State spire in the middle
        const sk = this.add.graphics().setDepth(-10);
        const base = h;
        let x = 0;
        const buildings = [];
        while (x < w) {
            const bw = rnd.between(18, 46), bh = rnd.between(h * 0.05, h * 0.15);
            buildings.push({ x, bw, bh }); x += bw + rnd.between(2, 6);
        }
        sk.fillStyle(0x08081a, 1);
        buildings.forEach(b => sk.fillRect(b.x, base - b.bh, b.bw, b.bh));
        // spire
        const sx = w / 2 - 16, sh = h * 0.24;
        sk.fillRect(sx, base - sh, 32, sh);
        sk.fillRect(sx + 6, base - sh - 16, 20, 16);
        sk.fillRect(sx + 12, base - sh - 30, 8, 14);
        sk.fillRect(sx + 15, base - sh - 48, 2, 18);
        // windows
        sk.fillStyle(0xf4e842, 0.75);
        buildings.forEach(b => {
            for (let wy = base - b.bh + 6; wy < base - 6; wy += 8)
                for (let wx = b.x + 4; wx < b.x + b.bw - 4; wx += 7)
                    if (rnd.frac() < 0.35) sk.fillRect(wx, wy, 3, 3);
        });
        for (let wy = base - sh + 8; wy < base - 8; wy += 8)
            for (let wx = sx + 5; wx < sx + 28; wx += 7)
                if (rnd.frac() < 0.5) sk.fillRect(wx, wy, 3, 3);
        // beacon on the spire
        const beacon = this.add.rectangle(w / 2, base - sh - 48, 4, 4, 0xff4040).setDepth(-9);
        this.tweens.add({ targets: beacon, alpha: 0.1, duration: 700, yoyo: true, repeat: -1 });
    }

    // ── Decade montage: pixel portraits drifting in and out ──

    _startMontage(w, h) {
        const years = PORTRAIT_YEARS.filter(y => this.textures.exists('portrait_' + y));
        if (!years.length) return;
        const wide = w >= 760;
        const targetH = Math.min(h * 0.5, wide ? 320 : 260);
        const scale = targetH / PORTRAIT_H;
        const y = h * 0.52;
        // Two slots flanking the menu on wide screens; one dimmed slot behind it otherwise
        const slots = wide
            ? [{ x: w * 0.17, alpha: 0.95 }, { x: w * 0.83, alpha: 0.95 }]
            : [{ x: w / 2, alpha: 0.28 }];
        const frames = slots.map(s => this.add.rectangle(s.x, y, PORTRAIT_W * scale + 10, PORTRAIT_H * scale + 10, 0x000000, 0.35)
            .setStrokeStyle(2, 0xf4e842, wide ? 0.8 : 0.25).setDepth(-5));
        if (!wide) frames.forEach(f => f.setAlpha(0.4));

        let idx = 0;
        const hold = 4200, fade = 1100;
        const show = (slot) => {
            const year = years[idx % years.length]; idx++;
            const img = this.add.image(slot.x, y, 'portrait_' + year)
                .setScale(scale * 0.96).setAlpha(0).setDepth(-4);
            // crop drift: slow zoom + tiny pan for a Ken Burns feel
            const cap = this.add.text(slot.x, y + PORTRAIT_H * scale / 2 + 16, year, {
                fontSize: '16px', fontFamily: 'monospace', color: '#f4e842', stroke: '#000', strokeThickness: 3
            }).setOrigin(0.5).setAlpha(0).setDepth(-3);
            const total = hold + fade * 2;
            this.tweens.add({ targets: img, alpha: slot.alpha, duration: fade, ease: 'Sine.easeOut' });
            this.tweens.add({ targets: img, scale: scale * 1.04, x: slot.x + 6, duration: total, ease: 'Sine.easeInOut' });
            this.tweens.add({ targets: cap, alpha: wide ? 1 : 0.5, duration: fade, delay: 300 });
            this.time.delayedCall(hold + fade, () => {
                this.tweens.add({ targets: [img, cap], alpha: 0, duration: fade, onComplete: () => { img.destroy(); cap.destroy(); } });
            });
            // mask to the frame so the zoom does not spill
            const m = this.make.graphics({ add: false });
            m.fillRect(slot.x - PORTRAIT_W * scale / 2, y - PORTRAIT_H * scale / 2, PORTRAIT_W * scale, PORTRAIT_H * scale);
            img.setMask(m.createGeometryMask());
        };
        // Each slot crossfades to its next portrait every hold+fade ms; slots are staggered
        slots.forEach((slot, i) => {
            const period = hold + fade;
            this.time.delayedCall(i * period / slots.length, () => {
                show(slot);
                this.time.addEvent({ delay: period, loop: true, callback: () => show(slot) });
            });
        });
    }

    _flash(msg) {
        const t = this.add.text(this.cameras.main.width/2, this.cameras.main.height * 0.82, msg, {
            fontSize: '16px', fontFamily: 'monospace', color: '#e94560',
            stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5);
        this.tweens.add({ targets: t, alpha: 0, duration: 1500, onComplete: () => t.destroy() });
    }

    _toggleLevelSelect() {
        if (this._levelPanel) { this._closeLevelSelect(); return; }
        if (this._aboutBox) { this._aboutBox.destroy(); this._aboutText.destroy(); this._aboutBox = null; }

        const cam = this.cameras.main;
        const cx = cam.width/2;
        const panelW = Math.min(400, cam.width - 40);
        const lineH = 36;
        const panelH = LEVELS.length * lineH + 20;
        const panelY = cam.height * 0.54 + 30;

        const bg = this.add.rectangle(cx, panelY + panelH/2, panelW, panelH, 0x16213e, 0.95)
            .setStrokeStyle(2, 0xf4e842).setDepth(50);

        const items = [];
        LEVELS.forEach((lvl, i) => {
            const available = this._availableScenes.has(lvl.key);
            const color = available ? '#ffffff' : '#555555';
            const label = `${i + 1}. ${lvl.name}  —  ${lvl.subtitle}`;
            const t = this.add.text(cx, panelY + 10 + i * lineH + lineH/2, label, {
                fontSize: '14px', fontFamily: 'monospace', color,
                stroke: '#000', strokeThickness: 2
            }).setOrigin(0.5).setDepth(51);

            if (available) {
                t.setInteractive({ useHandCursor: true });
                t.on('pointerover', () => t.setColor('#f4e842'));
                t.on('pointerout', () => t.setColor('#ffffff'));
                t.on('pointerdown', () => { this._closeLevelSelect(); this._goToLevel(lvl.key); });
            }
            items.push(t);
        });

        this._levelPanel = { bg, items };
    }

    _closeLevelSelect() {
        if (!this._levelPanel) return;
        this._levelPanel.bg.destroy();
        this._levelPanel.items.forEach(t => t.destroy());
        this._levelPanel = null;
    }

    _createButton(x, y, label, callback) {
        const btn = this.add.text(x, y, label, {
            fontSize: '22px', fontFamily: 'monospace', color: '#ffffff',
            backgroundColor: '#3f3f74', padding: { x: 24, y: 10 },
            stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        btn.on('pointerover', () => btn.setStyle({ backgroundColor: '#5b5ba6' }));
        btn.on('pointerout', () => btn.setStyle({ backgroundColor: '#3f3f74' }));
        btn.on('pointerdown', callback);
    }

    _showAbout() {
        if (this._aboutBox) { this._closeAbout(); return; }
        this._closeLevelSelect();
        const w = this.cameras.main.width, h = this.cameras.main.height;
        const boxW = Math.min(620, w - 40), boxH = 280;

        this._aboutBox = this.add.rectangle(w/2, h/2, boxW, boxH, 0x000000, 0.92)
            .setStrokeStyle(2, 0xf4e842).setDepth(50);
        this._aboutText = this.add.text(w/2, h/2,
            'Career Quest is a stylized walkthrough of Martin Schaef\'s CV.\n' +
            'Explore 5 worlds representing career chapters, talk to NPCs,\n' +
            'collect publications, and fight bugs along the way.\n\n' +
            '── Controls ──\n' +
            'Move:  Arrow Keys / WASD\n' +
            'Talk:  SPACE / E  (advance dialogue)\n' +
            'Attack:  Z / Left Click\n' +
            'Mute:  M\n\n' +
            'Tap ABOUT again or click anywhere to close.',
            { fontSize: '12px', fontFamily: 'monospace', color: '#cbdbfc', align: 'center',
              lineSpacing: 4, wordWrap: { width: boxW - 40 } }
        ).setOrigin(0.5).setDepth(51);

        this.time.delayedCall(200, () => {
            this.input.once('pointerdown', () => this._closeAbout());
        });
    }

    _closeAbout() {
        if (!this._aboutBox) return;
        this._aboutBox.destroy(); this._aboutText.destroy(); this._aboutBox = null;
    }
}
