export class BaseScene extends Phaser.Scene {
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
        this._typeTimer = this.time.addEvent({
            delay: 30,
            repeat: text.length - 1,
            callback: () => {
                if (this._msgText) this._msgText.text += text[i++];
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
    }

    getSelectedChoice() {
        if (!this._choices || !this._textDone) return null;
        return this._choices[this._choiceIndex];
    }

    hideMessage() {
        this._clearMessage();
        this._dialogueActive = false;
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
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(sceneKey));
    }
}
