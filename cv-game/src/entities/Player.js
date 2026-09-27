const SPEED = 160;
const SCALE = 0.4;

// martin.png: 112x183 frames, 8 cols x 4 rows
// Row 0: idle — 0:south, 1:west, 2:north, 3:east
// Row 1: walk_south (7f: 8-14)
// Row 2: walk_north (6f: 16-21)
// Row 3: walk_west (8f: 24-31) — flipX for east
const IDLE = { down: 0, left: 1, up: 2, right: 3 };

const WALK = {
    down:  { frames: [8, 9, 10, 11, 12, 13, 14], rate: 8 },
    left:  { frames: [24, 25, 26, 27, 28, 29, 30, 31], rate: 8 },
    right: { frames: [24, 25, 26, 27, 28, 29, 30, 31], rate: 8 },
    up:    { frames: [16, 17, 18, 19, 20, 21], rate: 8 },
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
        } else {
            // Left click attacks (ignore clicks on the top HUD bar)
            scene.input.on('pointerdown', (p) => {
                if (p.leftButtonDown() && p.y > 40) this._touchAttack = true;
            });
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
        // Brief attack lunge owns the velocity; don't let input cancel it
        if (this._lungeUntil && this.scene.time.now < this._lungeUntil) return;

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
        const scene = this.scene;
        const spr = this.sprite;

        // Direction the swing is centred on (radians; Phaser y points down)
        const DIR_ANGLE = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };
        const base = DIR_ANGLE[this.facing];
        const dx = Math.cos(base), dy = Math.sin(base);

        // Swing pivots around Martin's chest, not his feet
        const pivotX = () => spr.x;
        const pivotY = () => spr.y - spr.displayHeight * 0.1;
        const REACH = 44;          // arc radius in px
        const SPREAD = Math.PI * 0.8; // 144° sweep
        const SWEEP_MS = 110, FADE_MS = 90;

        // Hitbox covers the arc's footprint in front of the player
        const hbW = this.facing === 'left' || this.facing === 'right' ? 44 : 70;
        const hbH = this.facing === 'left' || this.facing === 'right' ? 70 : 44;
        const hb = scene.add.zone(pivotX() + dx * 30, pivotY() + dy * 30, hbW, hbH);
        scene.physics.add.existing(hb, false);
        hb.body.setAllowGravity(false);
        this.attackHitbox = hb;

        // Slash: a crescent drawn progressively from one side to the other.
        // Swing clockwise for right/down, counter-clockwise for left/up so it reads naturally.
        const clockwise = this.facing === 'right' || this.facing === 'down';
        const a0 = clockwise ? base - SPREAD / 2 : base + SPREAD / 2;
        const sweep = clockwise ? SPREAD : -SPREAD;
        const g = scene.add.graphics().setDepth(this.facing === 'up' ? 9 : 11);
        const state = { t: 0, alpha: 1 };

        const draw = () => {
            g.clear();
            const cx = pivotX(), cy = pivotY();
            const aEnd = a0 + sweep * state.t;
            // Trail: fades toward the tail of the swing
            const aTail = a0 + sweep * Math.max(0, state.t - 0.75);
            const layers = [
                { w: 14, color: 0xf4e842, a: 0.35 },
                { w: 8,  color: 0xfff6b0, a: 0.7 },
                { w: 3,  color: 0xffffff, a: 1.0 },
            ];
            for (const L of layers) {
                g.lineStyle(L.w, L.color, L.a * state.alpha);
                g.beginPath();
                g.arc(cx, cy, REACH, Math.min(aTail, aEnd), Math.max(aTail, aEnd), false);
                g.strokePath();
            }
            // Bright tip at the leading edge
            g.fillStyle(0xffffff, state.alpha);
            g.fillCircle(cx + Math.cos(aEnd) * REACH, cy + Math.sin(aEnd) * REACH, 4);
        };

        scene.tweens.add({
            targets: state, t: 1, duration: SWEEP_MS, ease: 'Cubic.easeOut',
            onUpdate: draw,
            onComplete: () => {
                scene.tweens.add({
                    targets: state, alpha: 0, duration: FADE_MS,
                    onUpdate: draw,
                    onComplete: () => g.destroy()
                });
                hb.destroy();
                this.attackHitbox = null;
                this.attacking = false;
            }
        });
        draw();

        // Body language: short lunge + squash toward the swing direction
        const sx = spr.scaleX, sy = spr.scaleY;
        spr.setVelocity(dx * 120, dy * 120);
        this._lungeUntil = scene.time.now + 70;
        scene.tweens.add({
            targets: spr,
            scaleX: sx * (dx ? 1.12 : 0.92),
            scaleY: sy * (dy ? 1.08 : 0.94),
            duration: 60, yoyo: true, ease: 'Quad.easeOut',
            onComplete: () => spr.setScale(sx, sy)
        });

        scene.sfx('swing', { volume: 0.3 });
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
