import { TitleScreen } from './scenes/TitleScreen.js';
import { World1_Saarbruecken } from './scenes/World1_Saarbruecken.js';

const config = {
    type: Phaser.AUTO,
    pixelArt: true,
    backgroundColor: '#222034',
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 0 }, debug: false }
    },
    input: {
        activePointers: 2
    },
    scene: [TitleScreen, World1_Saarbruecken]
};

new Phaser.Game(config);
