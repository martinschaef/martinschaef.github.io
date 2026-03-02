export class TitleScreen extends Phaser.Scene {
    constructor() {
        super('TitleScreen');
    }

    create() {
        const cx = 400, cy = 300;

        // Title
        this.add.text(cx, 160, 'CAREER QUEST', {
            fontSize: '48px', fontFamily: 'monospace', color: '#f4e842',
            stroke: '#000', strokeThickness: 6
        }).setOrigin(0.5);

        this.add.text(cx, 220, 'The Martin Schaef Story', {
            fontSize: '18px', fontFamily: 'monospace', color: '#cbdbfc'
        }).setOrigin(0.5);

        // Start button
        this._createButton(cx, 340, 'START GAME', () => {
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('World1_Saarbruecken');
            });
        });

        // About button
        this._createButton(cx, 410, 'ABOUT', () => {
            this._showAbout();
        });

        // Blinking prompt
        const prompt = this.add.text(cx, 520, 'Press ENTER to start', {
            fontSize: '14px', fontFamily: 'monospace', color: '#8b8b8b'
        }).setOrigin(0.5);
        this.tweens.add({ targets: prompt, alpha: 0, duration: 600, yoyo: true, repeat: -1 });

        this.input.keyboard.on('keydown-ENTER', () => {
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('World1_Saarbruecken');
            });
        });

        this.cameras.main.fadeIn(500);
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

        this._aboutBox = this.add.rectangle(400, 300, 600, 200, 0x000000, 0.9).setStrokeStyle(2, 0xf4e842);
        this._aboutText = this.add.text(400, 300,
            'Career Quest is a playable CV for Martin Schaef.\n\n' +
            'Navigate through 5 worlds representing career chapters:\n' +
            'Saarbrücken → Freiburg → Macau → San Francisco → NYC\n\n' +
            'Press ABOUT again or click anywhere to close.',
            { fontSize: '13px', fontFamily: 'monospace', color: '#cbdbfc', align: 'center', wordWrap: { width: 560 } }
        ).setOrigin(0.5);

        this.input.once('pointerdown', () => {
            if (this._aboutBox) { this._aboutBox.destroy(); this._aboutText.destroy(); this._aboutBox = null; }
        });
    }
}
