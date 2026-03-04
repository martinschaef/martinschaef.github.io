import { LEVELS } from '../config/levels.js';

export class TitleScreen extends Phaser.Scene {
    constructor() {
        super('TitleScreen');
    }

    create() {
        const w = this.cameras.main.width, h = this.cameras.main.height;
        const cx = w/2;

        this.add.text(cx, h * 0.12, 'CAREER QUEST', {
            fontSize: '48px', fontFamily: 'monospace', color: '#f4e842',
            stroke: '#000', strokeThickness: 6
        }).setOrigin(0.5);

        this.add.text(cx, h * 0.22, 'The Martin Schaef Story', {
            fontSize: '18px', fontFamily: 'monospace', color: '#cbdbfc'
        }).setOrigin(0.5);

        this._createButton(cx, h * 0.42, 'START GAME', () => this._start());
        this._createButton(cx, h * 0.54, 'LEVEL SELECT ▾', () => this._toggleLevelSelect());
        this._createButton(cx, h * 0.66, 'ABOUT', () => this._showAbout());

        const prompt = this.add.text(cx, h - 60, 'Press ENTER or tap START', {
            fontSize: '14px', fontFamily: 'monospace', color: '#8b8b8b'
        }).setOrigin(0.5);
        this.tweens.add({ targets: prompt, alpha: 0, duration: 600, yoyo: true, repeat: -1 });

        this.input.keyboard.on('keydown-ENTER', () => this._start());
        this.cameras.main.fadeIn(500);

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
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(key));
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
        if (this._aboutBox) { this._aboutBox.destroy(); this._aboutText.destroy(); this._aboutBox = null; return; }
        this._closeLevelSelect();
        const w = this.cameras.main.width, h = this.cameras.main.height;

        this._aboutBox = this.add.rectangle(w/2, h/2, Math.min(600, w-40), 200, 0x000000, 0.9).setStrokeStyle(2, 0xf4e842);
        this._aboutText = this.add.text(w/2, h/2,
            'Career Quest is a playable CV for Martin Schaef.\n\n' +
            'Navigate through worlds representing career chapters:\n' +
            'Saarbrücken → Freiburg → Macau → San Francisco → NYC\n\n' +
            'Tap ABOUT again or click anywhere to close.',
            { fontSize: '13px', fontFamily: 'monospace', color: '#cbdbfc', align: 'center', wordWrap: { width: Math.min(560, w-80) } }
        ).setOrigin(0.5);

        this.input.once('pointerdown', () => {
            if (this._aboutBox) { this._aboutBox.destroy(); this._aboutText.destroy(); this._aboutBox = null; }
        });
    }
}
