export class CreditsScreen extends Phaser.Scene {
    constructor() { super('CreditsScreen'); }

    preload() {
        this.load.json('credits', 'data/credits.json');
    }

    create() {
        const credits = this.cache.json.get('credits');
        const entries = Object.values(credits);

        // Load sprites then rebuild once ready
        for (const c of entries) {
            if (!this.textures.exists(c.sprite))
                this.load.spritesheet(c.sprite, `assets/sprites/${c.sprite}.png`, { frameWidth: c.fw, frameHeight: 188 });
        }
        this.load.once('complete', () => this._build(entries));
        this.load.start();
    }

    _build(entries) {
        const cam = this.cameras.main;
        const w = cam.width;
        const rowH = 90, startY = 80, spriteX = 60;

        // Title (fixed)
        this.add.text(w / 2, 30, 'CREDITS', {
            fontSize: '32px', fontFamily: 'monospace', color: '#f4e842',
            stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5).setScrollFactor(0).setDepth(10);

        entries.forEach((c, i) => {
            const y = startY + i * rowH;
            this.add.sprite(spriteX, y, c.sprite, 0).setScale(0.35);
            this.add.text(110, y - 14, c.name, {
                fontSize: '14px', fontFamily: 'monospace', color: '#f4e842',
                stroke: '#000', strokeThickness: 2
            });
            this.add.text(110, y + 8, c.text, {
                fontSize: '11px', fontFamily: 'monospace', color: '#cbdbfc',
                stroke: '#000', strokeThickness: 1,
                wordWrap: { width: w - 140 }
            });
        });

        const totalH = startY + entries.length * rowH + 80;

        // Back button at bottom
        const back = this.add.text(w / 2, totalH - 40, '← BACK', {
            fontSize: '18px', fontFamily: 'monospace', color: '#ffffff',
            backgroundColor: '#3f3f74', padding: { x: 16, y: 8 },
            stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        back.on('pointerover', () => back.setStyle({ backgroundColor: '#5b5ba6' }));
        back.on('pointerout', () => back.setStyle({ backgroundColor: '#3f3f74' }));
        back.on('pointerdown', () => this.scene.start('TitleScreen'));

        // Scrollable camera
        this.cameras.main.setBounds(0, 0, w, totalH);

        // Touch/mouse drag to scroll
        let dragY = 0;
        this.input.on('pointerdown', (p) => { dragY = p.y; });
        this.input.on('pointermove', (p) => {
            if (p.isDown) {
                this.cameras.main.scrollY -= (p.y - dragY);
                dragY = p.y;
            }
        });
        // Mouse wheel
        this.input.on('wheel', (p, go, dx, dy) => {
            this.cameras.main.scrollY += dy * 0.5;
        });

        this.input.keyboard.on('keydown-ESC', () => this.scene.start('TitleScreen'));
        this.cameras.main.fadeIn(300);
    }
}
