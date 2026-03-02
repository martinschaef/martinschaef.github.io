import { TitleScreen } from './scenes/TitleScreen.js';
import { World1_Saarbruecken } from './scenes/World1_Saarbruecken.js';

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    pixelArt: true,
    backgroundColor: '#222034',
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 0 }, debug: false }
    },
    scene: [TitleScreen, World1_Saarbruecken]
};

new Phaser.Game(config);
