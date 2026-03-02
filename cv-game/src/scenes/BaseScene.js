export class BaseScene extends Phaser.Scene {
    showMessage(text) {
        this._clearMessage();
        this._dialogueActive = true;

        // SNES-style dialogue box at bottom
        this._msgBox = this.add.rectangle(400, 540, 760, 100, 0x000000, 0.92)
            .setStrokeStyle(2, 0xf4e842).setScrollFactor(0).setDepth(100);
        this._msgText = this.add.text(40, 500, '', {
            fontSize: '16px', fontFamily: 'monospace', color: '#ffffff',
            wordWrap: { width: 720 }
        }).setScrollFactor(0).setDepth(101);

        // Typewriter effect
        let i = 0;
        this._typeTimer = this.time.addEvent({
            delay: 30,
            repeat: text.length - 1,
            callback: () => { this._msgText.text += text[i++]; }
        });
    }

    hideMessage() {
        this._clearMessage();
        this._dialogueActive = false;
    }

    _clearMessage() {
        if (this._msgBox) { this._msgBox.destroy(); this._msgBox = null; }
        if (this._msgText) { this._msgText.destroy(); this._msgText = null; }
        if (this._typeTimer) { this._typeTimer.destroy(); this._typeTimer = null; }
    }

    get dialogueActive() { return !!this._dialogueActive; }

    transitionTo(sceneKey) {
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(sceneKey));
    }
}
