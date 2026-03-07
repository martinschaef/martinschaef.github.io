const SPEED = 160;
const SCALE = 0.4;

// martin.png: 104x183 frames, 8 cols x 4 rows
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
        this._touchAction = false;
        this._touchDir = null;
        this.hp = 3;
        this.maxHp = 3;
        this.attacking = false;
        this.invincible = false;
        this.attackHitbox = null;

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
        this.attackKey = scene.input.keyboard.addKey('Z');
        this._touchAttack = false;

        this._createAnims();

        // Mobile touch controls
        if (!scene.sys.game.device.os.desktop) {
            this._createTouchControls();
        }
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

    _createTouchControls() {
        const s = this.scene;
        this._joyBase = s.add.circle(0, 0, 50, 0xffffff, 0.15).setScrollFactor(0).setDepth(200);
        this._joyThumb = s.add.circle(0, 0, 22, 0xffffff, 0.4).setScrollFactor(0).setDepth(201);
        this._actionBtn = s.add.circle(0, 0, 30, 0xf4e842, 0.3).setScrollFactor(0).setDepth(200).setInteractive();
        this._actionLabel = s.add.text(0, 0, 'A', {
            fontSize: '18px', fontFamily: 'monospace', color: '#f4e842'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

        this._actionBtn.on('pointerdown', () => { this._touchAction = true; });

        this._atkBtn = s.add.circle(0, 0, 30, 0xff4444, 0.3).setScrollFactor(0).setDepth(200).setInteractive();
        this._atkLabel = s.add.text(0, 0, 'Z', {
            fontSize: '18px', fontFamily: 'monospace', color: '#ff4444'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(201);
        this._atkBtn.on('pointerdown', () => { this._touchAttack = true; });

        this._layoutTouch();

        // Reposition on resize
        s.scale.on('resize', () => this._layoutTouch());

        // Joystick drag
        const self = this;
        s.input.on('pointerdown', (p) => {
            if (p.x < s.cameras.main.width / 2) self._joyPointer = p;
        });
        s.input.on('pointermove', (p) => {
            if (self._joyPointer && p.id === self._joyPointer.id) {
                const jx = self._joyBase.x, jy = self._joyBase.y;
                const dx = p.x - jx, dy = p.y - jy;
                const dist = Math.sqrt(dx*dx + dy*dy);
                if (dist > 15) {
                    const angle = Math.atan2(dy, dx);
                    const clamp = Math.min(dist, 50);
                    self._joyThumb.setPosition(jx + Math.cos(angle)*clamp, jy + Math.sin(angle)*clamp);
                    self._touchDir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
                } else {
                    self._touchDir = null;
                    self._joyThumb.setPosition(jx, jy);
                }
            }
        });
        s.input.on('pointerup', (p) => {
            if (self._joyPointer && p.id === self._joyPointer.id) {
                self._joyPointer = null;
                self._touchDir = null;
                self._joyThumb.setPosition(self._joyBase.x, self._joyBase.y);
            }
        });
    }

    _layoutTouch() {
        const cam = this.scene.cameras.main;
        const w = cam.width, h = cam.height;
        const jx = 100, jy = h - 100;
        this._joyBase.setPosition(jx, jy);
        this._joyThumb.setPosition(jx, jy);
        this._actionBtn.setPosition(w - 80, h - 100);
        this._actionLabel.setPosition(w - 80, h - 100);
        if (this._atkBtn) {
            this._atkBtn.setPosition(w - 140, h - 70);
            this._atkLabel.setPosition(w - 140, h - 70);
        }
    }

    update() {
        if (this.scene.dialogueActive) {
            this.sprite.setVelocity(0);
            this._setIdle();
            return;
        }

        const up = this.cursors.up.isDown || this.wasd.up.isDown || this._touchDir === 'up';
        const down = this.cursors.down.isDown || this.wasd.down.isDown || this._touchDir === 'down';
        const left = this.cursors.left.isDown || this.wasd.left.isDown || this._touchDir === 'left';
        const right = this.cursors.right.isDown || this.wasd.right.isDown || this._touchDir === 'right';

        let vx = 0, vy = 0;
        if (left) { vx = -SPEED; this.facing = 'left'; }
        if (right) { vx = SPEED; this.facing = 'right'; }
        if (up) { vy = -SPEED; this.facing = 'up'; }
        if (down) { vy = SPEED; this.facing = 'down'; }

        // Normalize diagonal speed
        if (vx !== 0 && vy !== 0) {
            vx *= 0.707; vy *= 0.707;
        }

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
        const touch = this._touchAction;
        this._touchAction = false;
        return touch ||
               Phaser.Input.Keyboard.JustDown(this.actionKey) ||
               Phaser.Input.Keyboard.JustDown(this.spaceKey);
    }

    isAttack() {
        const touch = this._touchAttack;
        this._touchAttack = false;
        return touch || Phaser.Input.Keyboard.JustDown(this.attackKey);
    }

    attack() {
        if (this.attacking) return;
        this.attacking = true;

        // Hitbox offset based on facing
        const offsets = { down: [0, 40], up: [0, -40], left: [-40, 0], right: [40, 0] };
        const [ox, oy] = offsets[this.facing];
        const w = this.facing === 'left' || this.facing === 'right' ? 30 : 50;
        const h = this.facing === 'left' || this.facing === 'right' ? 50 : 30;

        const hb = this.scene.add.zone(this.sprite.x + ox, this.sprite.y + oy, w, h);
        this.scene.physics.add.existing(hb, false);
        hb.body.setAllowGravity(false);
        this.attackHitbox = hb;

        // Visual slash
        const slash = this.scene.add.rectangle(this.sprite.x + ox, this.sprite.y + oy, w, h, 0xf4e842, 0.6).setDepth(15);
        this.scene.sfx('swing', { volume: 0.3 });

        this.scene.time.delayedCall(150, () => {
            slash.destroy();
            hb.destroy();
            this.attackHitbox = null;
            this.attacking = false;
        });
    }

    takeDamage(amount) {
        if (this.invincible || this.hp <= 0) return;
        this.hp -= amount;
        this.invincible = true;
        this.scene.sfx('hurt', { volume: 0.4 });

        // Flash effect
        this.scene.tweens.add({
            targets: this.sprite, alpha: 0.3, yoyo: true, repeat: 5, duration: 80,
            onComplete: () => { this.sprite.alpha = 1; this.invincible = false; }
        });

        // Knockback
        const kb = { down: [0, -120], up: [0, 120], left: [120, 0], right: [-120, 0] };
        const [kx, ky] = kb[this.facing];
        this.sprite.setVelocity(kx, ky);

        if (this.hp <= 0 && this.scene.onPlayerDeath) this.scene.onPlayerDeath();
    }
}
