const SPEED = 160;
const SCALE = 0.4;

// martin_sheet.png: 104x183 frames, 8 cols x 4 rows
// Row 0: idle per direction — 0:down, 1:right, 2:up, 3:left
// Row 1: walk_down (7 frames: 8-14)
// Row 2: walk_right (8 frames: 16-23) — flip for left
// Row 3: walk_up (6 frames: 24-29)
const IDLE = { down: 0, left: 3, up: 2, right: 1 };

const WALK = {
    down:  { frames: [8, 9, 10, 11, 12, 13, 14], rate: 8 },
    left:  { frames: [16, 17, 18, 19, 20, 21, 22, 23], rate: 8 },
    right: { frames: [16, 17, 18, 19, 20, 21, 22, 23], rate: 8 },
    up:    { frames: [24, 25, 26, 27, 28, 29], rate: 8 },
};

export class Player {
    constructor(scene, x, y) {
        this.scene = scene;
        this.facing = 'down';

        this.sprite = scene.physics.add.sprite(x, y, 'martin', IDLE.down)
            .setScale(SCALE)
            .setDepth(10);

        this.sprite.body.setSize(60, 30);
        this.sprite.body.setOffset(22, 148);
        this.sprite.setCollideWorldBounds(true);

        this.cursors = scene.input.keyboard.createCursorKeys();
        this.wasd = {
            up: scene.input.keyboard.addKey('W'),
            down: scene.input.keyboard.addKey('S'),
            left: scene.input.keyboard.addKey('A'),
            right: scene.input.keyboard.addKey('D'),
        };
        this.actionKey = scene.input.keyboard.addKey('E');
        this.spaceKey = scene.input.keyboard.addKey('SPACE');

        this._createAnims();
    }

    _createAnims() {
        for (const [dir, cfg] of Object.entries(WALK)) {
            const key = `martin_walk_${dir}`;
            if (this.scene.anims.exists(key)) continue;
            this.scene.anims.create({
                key,
                frames: cfg.frames.map(f => ({ key: 'martin', frame: f })),
                frameRate: cfg.rate,
                repeat: -1
            });
        }
    }

    update() {
        if (this.scene.dialogueActive) {
            this.sprite.setVelocity(0);
            this._setIdle();
            return;
        }

        const up = this.cursors.up.isDown || this.wasd.up.isDown;
        const down = this.cursors.down.isDown || this.wasd.down.isDown;
        const left = this.cursors.left.isDown || this.wasd.left.isDown;
        const right = this.cursors.right.isDown || this.wasd.right.isDown;

        let vx = 0, vy = 0;
        if (up) { vy = -SPEED; this.facing = 'up'; }
        else if (down) { vy = SPEED; this.facing = 'down'; }
        else if (left) { vx = -SPEED; this.facing = 'left'; }
        else if (right) { vx = SPEED; this.facing = 'right'; }

        this.sprite.setVelocity(vx, vy);
        this.sprite.setFlipX(this.facing === 'left');

        if (vx !== 0 || vy !== 0) {
            this.sprite.anims.play(`martin_walk_${this.facing}`, true);
        } else {
            this._setIdle();
        }
    }

    _setIdle() {
        this.sprite.anims.stop();
        this.sprite.setFrame(IDLE[this.facing]);
        this.sprite.setFlipX(false);
    }

    isAction() {
        return Phaser.Input.Keyboard.JustDown(this.actionKey) ||
               Phaser.Input.Keyboard.JustDown(this.spaceKey);
    }
}
