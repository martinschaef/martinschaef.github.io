// Audio registry — drop MP3 files into assets/audio/ matching these names
// Bump ASSET_VERSION whenever a shipped asset (map, audio, data) changes so browsers refetch it.
export const ASSET_VERSION = 16;
export const AUDIO = {
    // UI & dialogue
    blip:       'assets/audio/blip.mp3',        // per-character typewriter sound
    confirm:    'assets/audio/confirm.mp3',      // dialogue advance / menu confirm
    select:     'assets/audio/select.mp3',       // menu choice move

    // Combat
    swing:      'assets/audio/swing.mp3',        // keyboard attack
    hit:        'assets/audio/hit.mp3',          // enemy takes damage
    hurt:       'assets/audio/hurt.mp3',         // player takes damage
    enemyDeath: 'assets/audio/enemy_death.mp3',  // enemy dies
    crateBreak: 'assets/audio/crate_break.mp3',  // crate destroyed

    // Items & world
    pickup:     'assets/audio/pickup.mp3',       // item collected
    doorOpen:   'assets/audio/door_open.mp3',    // level transition

    // Music (per world)
    musicTitle: 'assets/audio/music_opening.mp3',   // title screen montage
    music1:     'assets/audio/music_saarbruecken.mp3',
    music2:     'assets/audio/music_freiburg.mp3',
    music3:     'assets/audio/music_macau.mp3',
    music4:     'assets/audio/music_sanfrancisco.mp3',
    music5:     'assets/audio/music_nyc.mp3',
    musicEnding:'assets/audio/music_ending.mp3',  // victory screen + rolling credits
};
