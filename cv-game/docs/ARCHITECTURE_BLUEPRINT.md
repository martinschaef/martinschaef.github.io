# Architectural Blueprint

## File Hierarchy
- `index.html`: Main entry, loads Phaser via CDN.
- `src/main.js`: Configures the game (800x600, Physics, Scene List).
- `src/scenes/BaseScene.js`: A parent class for all levels to handle shared logic (Dialogue UI, Scene Transitions).
- `src/scenes/World1_Saarbruecken.js`: The tutorial level.
- `src/entities/Player.js`: Handles WASD/Arrow movement and "Keyboard Swing" attack logic.
- `data/dialogue.json`: A JSON map for NPC text.

## Level 1: Saarbrücken (The Tutorial)
- **Environment:** A 16-bit house.
- **Goal:** Talk to Parents, dodge 3 Siblings (using simple random pathing), and exit through the front door to "University."
- **Combat:** No damage taken here, but Martin can "swing" his keyboard to clear "clutter" (boxes) blocking the door.
