# Career Quest — Technical Implementation Plan

## 1. Project Structure

```
cv-game/
├── index.html
├── data/
│   └── dialogue.json
├── assets/
│   ├── sprites/          # Player, NPCs, enemies, items
│   ├── tilemaps/         # JSON tilemaps (Tiled editor)
│   ├── tilesets/         # Tileset PNGs
│   └── audio/            # Music + SFX (later)
├── src/
│   ├── main.js           # Phaser config + boot
│   ├── scenes/
│   │   ├── BaseScene.js
│   │   ├── World1_Saarbruecken.js
│   │   ├── World2_Freiburg.js
│   │   ├── World3_Macau.js
│   │   ├── World4_SanFrancisco.js
│   │   └── World5_NYC.js
│   └── entities/
│       ├── Player.js
│       ├── NPC.js
│       └── Enemy.js
└── docs/
```

## 2. Core Systems

### 2.1 Game Config (`src/main.js`)
- 800×600 canvas, Arcade Physics, `pixelArt: true`
- Scene list: all 5 worlds registered
- Gravity: 0 (top-down RPG, no gravity)
- Load via ES6 module `<script type="module" src="src/main.js">`

### 2.2 BaseScene (`src/scenes/BaseScene.js`)
Shared parent class for all world scenes. Provides:

- `createPlayer(x, y)` — instantiates Player at spawn point
- `showMessage(text)` — renders a dialogue box (bottom of screen, SNES-style black box with white text, typewriter effect)
- `hideMessage()` — dismisses dialogue
- `transitionTo(sceneKey)` — fade-out → start next scene
- `createNPC(x, y, key, dialogueId)` — places an NPC linked to dialogue.json
- Dialogue state: tracks whether dialogue box is open (blocks player movement while open)

### 2.3 Player (`src/entities/Player.js`)
A factory function or class that wraps a Phaser Arcade Sprite:

- **Movement:** 4-way, 120px/s. WASD + Arrow keys. No diagonal (SNES-style).
- **Action key:** Space or E — triggers NPC interaction when overlapping an NPC.
- **Attack:** Z or Left Click — creates a short-lived hitbox (16×16) in front of the player based on facing direction. 200ms lifespan. Overlaps with destructibles/enemies.
- **Facing direction:** Track last movement direction for attack placement.
- **State:** `idle`, `walking`, `attacking`, `talking` (movement locked during `talking` and `attacking`).

### 2.4 NPC System (`src/entities/NPC.js`)
- Static sprite with an overlap zone
- `dialogueId` property → looks up text from `data/dialogue.json`
- On player action key while overlapping → `scene.showMessage(dialogueText)`
- Patrol NPCs (siblings): simple random waypoint movement using `Phaser.Math.Between` for target positions, move at 40px/s

### 2.5 Enemy System (`src/entities/Enemy.js`)
- Arcade sprite with health property
- Patrol behavior: random waypoint (like sibling NPCs) or chase-player within detection radius
- On overlap with player attack hitbox → take damage → flash white → die at 0 HP
- Drop nothing initially (items added per-level as needed)

### 2.6 Dialogue Data (`data/dialogue.json`)
```json
{
  "mom": ["Martin! Don't forget your Abitur scroll!", "Good luck out there."],
  "dad": ["The world is big. Start with Freiburg."],
  "sibling1": ["Can't catch me!"],
  "sibling2": ["Mom said it's my turn on the computer."],
  "sibling3": ["Are you really leaving?"],
  "podelski": ["Welcome to the Tower of Logic.", "Your thesis awaits."],
  "byron": ["The cloud needs you, Martin."]
}
```
Array of strings per NPC. Each action key press advances to the next line. Last line closes the dialogue.

### 2.7 Destructibles
- Static arcade sprites (boxes, book piles)
- On overlap with attack hitbox → play break animation (or just destroy) → remove from scene
- Used to gate progress (block doorways until cleared)

### 2.8 Scene Transitions
- Trigger zones (invisible rectangles) at level exits
- On player overlap → `transitionTo('World2_Freiburg')` etc.
- Camera fade-out/fade-in for polish

## 3. Placeholder Asset Strategy

For Weekend 1, use colored rectangles via `this.add.rectangle()` or Phaser's built-in graphics:
- Player: 16×16 blue square
- NPCs: 16×16 green squares
- Enemies: 16×16 red squares
- Destructibles: 16×16 brown squares
- Walls/floor: simple tilemap from a 1-color tileset PNG (can generate a 16×16 tile programmatically)

Later replace with proper spritesheets. All sprite keys are centralized constants so swapping is easy.

## 4. Tilemap Approach

- Use **Tiled** (free map editor) to create JSON tilemaps
- For Weekend 1: a simple hand-coded tilemap array is fine (no external tool needed)
- Each world gets its own tilemap JSON + tileset PNG
- Collision layer: separate tile layer marked as collidable
- Object layer: spawn points for player, NPCs, enemies, items, exits

## 5. Key Phaser APIs Used

| System | API |
|---|---|
| Movement | `this.physics.arcade.sprite`, `body.setVelocity` |
| Input | `this.input.keyboard.createCursorKeys()`, `addKey()` |
| Collision | `this.physics.add.collider()`, `this.physics.add.overlap()` |
| Dialogue UI | `this.add.rectangle()` + `this.add.text()` (fixed to camera) |
| Tilemaps | `this.make.tilemap()`, `createLayer()` |
| Transitions | `this.cameras.main.fadeOut()`, `this.scene.start()` |
| Timer | `this.time.delayedCall()`, `this.time.addEvent()` |
