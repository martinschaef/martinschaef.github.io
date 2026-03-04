import { AUDIO } from '../config/audio.js';

export class BaseScene extends Phaser.Scene {

    /** Call in preload() to load all SFX + specific music keys */
    loadAudio(...musicKeys) {
        for (const [key, path] of Object.entries(AUDIO)) {
            if (key.startsWith('music') && !musicKeys.includes(key)) continue;
            this.load.audio(key, path);
        }
        this.load.on('loaderror', (file) => {
            console.warn('Audio not found (skipped):', file.key);
        });
    }

    /** Play a sound effect (no-op if not loaded or muted) */
    sfx(key, config) {
        if (this.sound.mute) return;
        if (this.cache.audio.exists(key)) this.sound.play(key, config);
    }

    /** Play looping music, stopping any previous track */
    playMusic(key, volume = 0.3) {
        if (this._music) this._music.stop();
        if (!this.cache.audio.exists(key)) return;
        this._music = this.sound.add(key, { loop: true, volume });
        this._music.play();
    }

    stopMusic() {
        if (this._music) { this._music.stop(); this._music = null; }
    }

    /** Create mute toggle button (call in create()) */
    createMuteButton() {
        const cam = this.cameras.main;
        const muted = this.sound.mute;
        this._muteBtn = this.add.text(cam.width - 12, 12, muted ? '🔇' : '🔊', {
            fontSize: '22px'
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(200).setInteractive({ useHandCursor: true });
        this._muteBtn.on('pointerdown', () => this._toggleMute());

        // M key to toggle
        this.input.keyboard.on('keydown-M', () => this._toggleMute());
    }

    _toggleMute() {
        this.sound.mute = !this.sound.mute;
        if (this._muteBtn) this._muteBtn.setText(this.sound.mute ? '🔇' : '🔊');
    }

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

        let i = 0;
        let blipCounter = 0;
        this._typeTimer = this.time.addEvent({
            delay: 30,
            repeat: text.length - 1,
            callback: () => {
                if (this._msgText) this._msgText.text += text[i];
                // Blip every 3rd character (not every char — too noisy)
                if (++blipCounter % 3 === 0 && text[i] !== ' ') this.sfx('blip', { volume: 0.15 });
                i++;
                if (i >= text.length) {
                    this._textDone = true;
                    if (choices) this._showChoices();
                }
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

    transitionTo(sceneKey) {
        this.sfx('doorOpen', { volume: 0.3 });
        this.stopMusic();
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(sceneKey));
    }
}
