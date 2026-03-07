const NPC_SPRITES = {
    doris:       { w: 76,  name: 'Doris (Mom)' },
    father:      { w: 76,  name: 'Dad' },
    wolfgang:    { w: 177, name: 'Wolfgang' },
    monika:      { w: 75,  name: 'Monika' },
    christine:   { w: 77,  name: 'Christine' },
    valentin:    { w: 69,  name: 'Valentin' },
    tobert:      { w: 93,  name: 'Tobert' },
    ben:         { w: 81,  name: 'Ben' },
    podelski:    { w: 76,  name: 'Podelski' },
    podelski_dog:{ w: 145, name: "Podelski's Dog" },
    byron:       { w: 60,  name: 'Byron' },
    byron2:      { w: 57,  name: 'Byron (NYC)' },
    dejan:       { w: 80,  name: 'Dejan' },
    evren:       { w: 115, name: 'Evren' },
    john:        { w: 72,  name: 'John' },
    stephan:     { w: 82,  name: 'Stephan' },
    zhiming:     { w: 71,  name: 'Zhiming' },
    lauren:      { w: 103, name: 'Lauren' },
    willem:      { w: 116, name: 'Willem' },
};

export class CreditsScreen extends Phaser.Scene {
    constructor() { super('CreditsScreen'); }

    preload() {
        for (const [key, s] of Object.entries(NPC_SPRITES)) {
            this.load.spritesheet(key, `assets/sprites/${key}.png`, { frameWidth: s.w, frameHeight: 188 });
        }
    }

    create() {
        const cam = this.cameras.main;
        const w = cam.width, cx = w / 2;

        this.add.text(cx, 40, 'CREDITS', {
            fontSize: '36px', fontFamily: 'monospace', color: '#f4e842',
            stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5).setScrollFactor(0).setDepth(10);

        const entries = Object.entries(NPC_SPRITES);
        const cols = 3, cellW = 220, cellH = 120;
        const gridW = cols * cellW;
        const startX = cx - gridW / 2 + cellW / 2;
        const startY = 100;

        entries.forEach(([key, s], i) => {
            const col = i % cols, row = Math.floor(i / cols);
            const x = startX + col * cellW;
            const y = startY + row * cellH;

            const sprite = this.add.sprite(x, y, key, 0).setScale(0.4);

            this.add.text(x, y + sprite.displayHeight / 2 + 8, s.name, {
                fontSize: '12px', fontFamily: 'monospace', color: '#cbdbfc',
                stroke: '#000', strokeThickness: 2
            }).setOrigin(0.5);
        });

        const totalH = startY + Math.ceil(entries.length / cols) * cellH + 60;

        // Back button
        const backY = Math.max(totalH, cam.height - 40);
        const back = this.add.text(cx, backY, '← BACK', {
            fontSize: '18px', fontFamily: 'monospace', color: '#ffffff',
            backgroundColor: '#3f3f74', padding: { x: 16, y: 8 },
            stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        back.on('pointerover', () => back.setStyle({ backgroundColor: '#5b5ba6' }));
        back.on('pointerout', () => back.setStyle({ backgroundColor: '#3f3f74' }));
        back.on('pointerdown', () => this.scene.start('TitleScreen'));

        this.input.keyboard.on('keydown-ESC', () => this.scene.start('TitleScreen'));
        this.cameras.main.fadeIn(300);
    }
}
