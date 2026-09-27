import { AUDIO } from '../config/audio.js';
import { LEVELS } from '../config/levels.js';

// Cast grouped by career chapter; ids refer to data/credits.json
const CHAPTERS = [
    { title: 'Chapter I — Saarbrücken',  cast: ['doris', 'father', 'wolfgang', 'monika', 'christine', 'evren', 'valentin', 'tobert', 'ben'] },
    { title: 'Chapter II — Freiburg',    cast: ['podelski', 'podelski_dog', 'stephan', 'byron'] },
    { title: 'Chapter III — Macau',      cast: ['zhiming', 'paul'] },
    { title: 'Chapter IV — San Francisco', cast: ['john', 'dejan', 'willem'] },
    { title: 'Chapter V — New York City', cast: ['byron2', 'lauren'] },
];

const SCROLL_SPEED = 38;     // px per second
const FAST_FACTOR = 5;       // while holding SPACE / DOWN / pointer

const YELLOW = '#f4e842', LIGHT = '#cbdbfc', DIM = '#8b8bb0';

export class VictoryScreen extends Phaser.Scene {
    constructor() { super('VictoryScreen'); }

    preload() {
        this.load.json('credits', 'data/credits.json');
        this.load.json('publications', '../publications.json');
        if (!this.textures.exists('martin'))
            this.load.spritesheet('martin', 'assets/sprites/martin.png?v=5', { frameWidth: 112, frameHeight: 183 });
        if (!this.cache.audio.exists('musicEnding')) this.load.audio('musicEnding', AUDIO.musicEnding);
        this.load.on('loaderror', (f) => console.warn('VictoryScreen asset missing (skipped):', f.key));
    }

    create() {
        const credits = this.cache.json.get('credits') || {};
        // Credit sprites need per-sprite frame widths from credits.json, so load them now
        let pending = 0;
        for (const c of Object.values(credits)) {
            if (!this.textures.exists(c.sprite)) {
                this.load.spritesheet(c.sprite, `assets/sprites/${c.sprite}.png`, { frameWidth: c.fw, frameHeight: 188 });
                pending++;
            }
        }
        if (pending) { this.load.once('complete', () => this._build(credits)); this.load.start(); }
        else this._build(credits);
    }

    // ── Layout ────────────────────────────────────────────

    _build(credits) {
        const cam = this.cameras.main;
        this._w = cam.width; this._h = cam.height;
        this._phase = 'victory';
        this._done = false;

        this._makeStarfield();

        if (this.cache.audio.exists('musicEnding')) {
            this._music = this.sound.add('musicEnding', { loop: true, volume: 0 });
            this._music.play();
            this.tweens.add({ targets: this._music, volume: 0.5, duration: 1500 });
        }

        this._buildVictory();
        this._rollRoot = this._buildRoll(credits);
        this._rollRoot.setVisible(false);

        // Input
        const kb = this.input.keyboard;
        this._fastKeys = [kb.addKey('SPACE'), kb.addKey('DOWN'), kb.addKey('S')];
        kb.on('keydown-ENTER', () => this._advance());
        kb.on('keydown-ESC', () => this._exit());
        kb.on('keydown-M', () => { this.sound.mute = !this.sound.mute; });
        this.input.on('pointerdown', () => { if (this._phase === 'victory') this._advance(); });

        // Victory card rolls into the credits by itself
        this._autoRoll = this.time.delayedCall(7000, () => this._advance());

        this.scale.on('resize', this._onResize, this);
        this.events.once('shutdown', () => this.scale.off('resize', this._onResize, this));
        cam.fadeIn(800);
    }

    _makeStarfield() {
        this._stars = [];
        for (let i = 0; i < 90; i++) {
            const s = this.add.circle(
                Phaser.Math.Between(0, this._w), Phaser.Math.Between(0, this._h),
                Phaser.Math.FloatBetween(0.6, 1.8), 0xffffff, Phaser.Math.FloatBetween(0.2, 0.9)
            ).setScrollFactor(0).setDepth(0);
            s._speed = Phaser.Math.FloatBetween(4, 16);
            this.tweens.add({ targets: s, alpha: 0.1, duration: Phaser.Math.Between(700, 2200), yoyo: true, repeat: -1 });
            this._stars.push(s);
        }
    }

    _buildVictory() {
        const w = this._w, h = this._h, cx = w / 2;
        const pubs = this.cache.json.get('publications') || [];
        const found = this.registry.get('papersFound') || 0;
        const bugs = this.registry.get('bugsSquashed') || 0;
        const chips = this.registry.get('chips') || 0;
        const first = LEVELS[0].years[0];

        const items = [];
        const title = this.add.text(cx, h * 0.14, 'QUEST COMPLETE!', {
            fontSize: '44px', fontFamily: 'monospace', color: YELLOW, stroke: '#000', strokeThickness: 6
        }).setOrigin(0.5).setScale(0.2);
        this.tweens.add({ targets: title, scale: 1, duration: 700, ease: 'Back.easeOut' });
        this.tweens.add({ targets: title, y: title.y - 6, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 700 });
        items.push(title);

        // Martin, celebrating
        if (this.textures.exists('martin')) {
            if (!this.anims.exists('martin_walk_down')) {
                this.anims.create({ key: 'martin_walk_down', frames: [8, 9, 10, 11, 12, 13, 14].map(f => ({ key: 'martin', frame: f })), frameRate: 8, repeat: -1 });
            }
            const m = this.add.sprite(cx, h * 0.36, 'martin', 0).setScale(0.6);
            m.play('martin_walk_down');
            this.tweens.add({ targets: m, y: m.y - 14, duration: 350, yoyo: true, repeat: -1, ease: 'Quad.easeOut' });
            items.push(m);
            this._confetti(cx, h * 0.36);
        }

        const lines = [
            [`${first} – ${new Date().getFullYear()}  ·  5 cities  ·  3 continents`, LIGHT],
            [pubs.length ? `📄 Papers collected: ${Math.min(found, pubs.length)} / ${pubs.length}` : `📄 Papers collected: ${found}`, '#42f4a6'],
            [`🐛 Bugs squashed: ${bugs}`, '#e94560'],
            ...(chips ? [[`🎰 Laxino chips: ${chips.toLocaleString('en-US')}`, '#f4a742']] : []),
            ['', LIGHT],
            ['Martin Schaef', YELLOW],
            ['Principal Applied Scientist · AWS Automated Reasoning', LIGHT],
        ];
        lines.forEach(([t, color], i) => {
            const txt = this.add.text(cx, h * 0.52 + i * 26, t, {
                fontSize: i >= 4 ? '18px' : '15px', fontFamily: 'monospace', color, stroke: '#000', strokeThickness: 3,
                align: 'center', wordWrap: { width: w - 40 }
            }).setOrigin(0.5).setAlpha(0);
            this.tweens.add({ targets: txt, alpha: 1, duration: 400, delay: 900 + i * 250 });
            items.push(txt);
        });

        const prompt = this.add.text(cx, h - 40, 'Press ENTER or tap to roll the credits', {
            fontSize: '13px', fontFamily: 'monospace', color: DIM
        }).setOrigin(0.5);
        this.tweens.add({ targets: prompt, alpha: 0.2, duration: 600, yoyo: true, repeat: -1 });
        items.push(prompt);

        this._victoryItems = items;
    }

    _confetti(x, y) {
        const colors = [0xf4e842, 0x42f4a6, 0xe94560, 0x5b9bff, 0xffffff];
        for (let i = 0; i < 40; i++) {
            const c = this.add.rectangle(x, y, 5, 8, Phaser.Utils.Array.GetRandom(colors)).setDepth(2);
            const ang = Phaser.Math.FloatBetween(-Math.PI, 0);
            const dist = Phaser.Math.Between(80, 260);
            this.tweens.add({
                targets: c, x: x + Math.cos(ang) * dist, y: y + Math.sin(ang) * dist * 0.6 + 220,
                angle: Phaser.Math.Between(-360, 360), alpha: 0,
                duration: Phaser.Math.Between(1400, 2400), ease: 'Quad.easeOut',
                onComplete: () => c.destroy()
            });
        }
    }

    _buildRoll(credits) {
        const w = this._w;
        const root = this.add.container(w / 2, this._h + 40).setDepth(5);
        let y = 0;
        const add = (obj, gap) => { obj.y = y; root.add(obj); y += gap; return obj; };
        const text = (t, size, color, extra = {}) => this.add.text(0, 0, t, {
            fontSize: size, fontFamily: 'monospace', color, stroke: '#000', strokeThickness: 3,
            align: 'center', wordWrap: { width: Math.min(640, w - 40) }, ...extra
        }).setOrigin(0.5, 0);

        add(text('CAREER QUEST', '40px', YELLOW, { strokeThickness: 6 }), 60);
        add(text('The Martin Schaef Story', '16px', LIGHT), 90);
        add(text('starring', '13px', DIM), 22);
        add(text('Martin Schaef', '22px', YELLOW), 36);
        add(text('as himself', '13px', DIM), 110);

        const shown = new Set();
        CHAPTERS.forEach(ch => {
            add(text(ch.title, '20px', YELLOW), 50);
            let side = -1;
            ch.cast.forEach(id => {
                const c = credits[id];
                if (!c || shown.has(id)) return;
                shown.add(id);
                y += this._castRow(root, c, y, side);
                side = -side;
            });
            y += 60;
        });

        // Anyone in credits.json not assigned to a chapter still gets a line
        const extras = Object.keys(credits).filter(id => !shown.has(id));
        if (extras.length) {
            add(text('Also Featuring', '20px', YELLOW), 50);
            let side = -1;
            extras.forEach(id => { y += this._castRow(root, credits[id], y, side); side = -side; });
            y += 60;
        }

        // The papers are the real stars of a CV
        const pubs = (this.cache.json.get('publications') || []).slice().sort((a, b) => a.year - b.year || a.title.localeCompare(b.title));
        if (pubs.length) {
            add(text('Featured Publications', '20px', YELLOW), 36);
            add(text(`${pubs.length} papers, in order of appearance`, '12px', DIM), 36);
            pubs.forEach(p => {
                const t = add(text(`${p.year}  ${p.title}`, '12px', LIGHT), 0);
                y += t.height + 8;
            });
            y += 70;
        }

        add(text('Co-authors, reviewers, and Reviewer #2', '14px', LIGHT), 24);
        add(text('thank you for everything (mostly)', '12px', DIM), 80);
        add(text('Built with Phaser 3, too many sprite sheets,', '12px', DIM), 20);
        add(text('and an AI assistant named Margo', '12px', DIM), 140);

        const end = add(text('THE END', '42px', YELLOW, { strokeThickness: 6 }), 70);
        add(text('…or is it? Thanks for playing!', '15px', LIGHT), 0);

        this._rollEndY = end.y; // local y of "THE END"
        return root;
    }

    // One cast member: sprite on alternating sides, name + blurb next to it. Returns row height.
    _castRow(root, c, y, side) {
        const rowH = 96;
        const offset = Math.min(200, this._w / 2 - 70);
        const spr = this.add.sprite(side * offset, y + rowH / 2, c.sprite, 0).setScale(0.42);
        if (!this.textures.exists(c.sprite)) spr.setVisible(false);
        const align = side < 0 ? 0 : 1;
        const tx = side < 0 ? -offset + 50 : offset - 50;
        const name = this.add.text(tx, y + rowH / 2 - 16, c.name, {
            fontSize: '16px', fontFamily: 'monospace', color: YELLOW, stroke: '#000', strokeThickness: 3
        }).setOrigin(align, 0.5);
        const blurb = this.add.text(tx, y + rowH / 2 + 8, c.text, {
            fontSize: '12px', fontFamily: 'monospace', color: LIGHT, stroke: '#000', strokeThickness: 2,
            wordWrap: { width: Math.max(160, offset * 2 - 110) }, align: side < 0 ? 'left' : 'right'
        }).setOrigin(align, 0);
        // Gentle idle bob so the cast feels alive
        this.tweens.add({ targets: spr, y: spr.y - 4, duration: 900 + Math.random() * 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        root.add([spr, name, blurb]);
        return rowH;
    }

    // ── Flow ──────────────────────────────────────────────

    _advance() {
        if (this._phase === 'victory') {
            this._phase = 'roll';
            if (this._autoRoll) this._autoRoll.remove();
            this.tweens.add({
                targets: this._victoryItems, alpha: 0, duration: 600,
                onComplete: () => this._victoryItems.forEach(o => o.destroy())
            });
            this._rollRoot.setVisible(true);
        } else if (this._phase === 'end') {
            this._exit();
        } else {
            // ENTER during the roll skips to the end card
            this._rollRoot.y = this._h / 2 - this._rollEndY - 20;
        }
    }

    _exit() {
        if (this._done) return;
        this._done = true;
        if (this._music) this.tweens.add({ targets: this._music, volume: 0, duration: 700 });
        this.cameras.main.fadeOut(800, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            if (this._music) this._music.stop();
            this.scene.start('TitleScreen');
        });
    }

    update(_, delta) {
        if (!this._stars) return;
        const dt = delta / 1000;
        for (const s of this._stars) {
            s.y -= s._speed * dt * (this._phase === 'roll' ? 2 : 1);
            if (s.y < -4) { s.y = this._h + 4; s.x = Phaser.Math.Between(0, this._w); }
        }

        if (this._phase !== 'roll') return;
        const fast = this._fastKeys.some(k => k.isDown) || this.input.activePointer.isDown;
        this._rollRoot.y -= SCROLL_SPEED * dt * (fast ? FAST_FACTOR : 1);

        // Stop when "THE END" reaches the middle of the screen
        const stopY = this._h / 2 - this._rollEndY - 20;
        if (this._rollRoot.y <= stopY) {
            this._rollRoot.y = stopY;
            this._phase = 'end';
            const p = this.add.text(this._w / 2, this._h - 40, 'Press ENTER or tap to return to the title', {
                fontSize: '13px', fontFamily: 'monospace', color: DIM
            }).setOrigin(0.5).setDepth(10);
            this.tweens.add({ targets: p, alpha: 0.2, duration: 600, yoyo: true, repeat: -1 });
            this.input.once('pointerdown', () => this._exit());
        }
    }

    _onResize(gs) {
        this._w = gs.width; this._h = gs.height;
        this.cameras.main.setSize(gs.width, gs.height);
        if (this._rollRoot) this._rollRoot.x = gs.width / 2;
    }
}
