# Career Quest

A browser-based Phaser 3 RPG that serves as a playable CV for Martin Schaef. The player navigates through worlds representing career chapters: Saarbrücken → Freiburg → Macau → San Francisco → NYC.

**Live:** [www.martinschaef.de/cv-game](https://www.martinschaef.de/cv-game/)

## Quick Start

```bash
cd cv-game
python3 -m http.server 8080
# open http://localhost:8080
```

No build step. Phaser 3.60 loads from CDN. Everything is vanilla ES6 modules.

## Project Structure

```
cv-game/
├── index.html                  # Entry point (loads Phaser CDN + src/main.js)
├── src/
│   ├── main.js                 # Game config, scene registration
│   ├── config/
│   │   └── levels.js           # Level registry (add new levels here)
│   ├── scenes/
│   │   ├── BaseScene.js        # Shared: dialogue box, typewriter, choices, transitions
│   │   ├── TitleScreen.js      # Main menu + level select
│   │   ├── World1_Saarbruecken.js  # Tutorial level (NPCs, combat, crates)
│   │   ├── World2_Freiburg.js      # University (stub)
│   │   └── World3_Macau.js         # Far East (stub)
│   └── entities/
│       └── Player.js           # Movement, attack, health, mobile controls
├── data/
│   ├── sprites.json            # Sprite registry (all NPCs, enemies, items)
│   ├── world1_npcs.json        # World 1 NPC dialogue trees
│   ├── world2_npcs.json        # World 2 NPC dialogue trees
│   ├── enemies.json            # Enemy stats (hp, damage, speed, behavior)
│   └── items.json              # Quest items (name, description, frame index)
├── assets/
│   ├── sprites/                # Game-ready PNGs (spritesheets)
│   │   └── sheets/             # Source sheets (gitignored, not needed at runtime)
│   └── tilemaps/               # Per-world: *_bg.png + *_collision.json
├── tools/
│   ├── collision_editor.html   # Visual level editor
│   ├── process_map.py          # Map → background + collision JSON
│   └── convert_sheet.py        # Raw spritesheet → game-ready PNG
├── tests/
│   ├── smoke.html              # Headless boot test for all scenes
│   ├── run.sh                  # Run smoke tests via headless Chrome
│   └── pre-commit              # Git hook (syntax + JSON + smoke test)
└── docs/                       # Planning & tracking (ROADMAP, PROGRESS, etc.)
```

## Key Config Files

### Dialogue (`data/world*_npcs.json`)

Each level has its own NPC config. Dialogue uses Zelda-style branching trees:

```json
{
  "mom": {
    "sprite": "doris",
    "dialogue": [
      { "text": "Are you leaving?", "choices": [
        { "text": "Yes.", "next": "farewell" },
        { "text": "Not yet.", "next": "stay" }
      ]},
      { "id": "farewell", "text": "Good luck, son." },
      { "id": "stay", "text": "Take your time." }
    ]
  }
}
```

- Nodes without `choices` auto-advance to the next node
- Nodes with an `id` are branch targets (skipped during auto-advance)
- `"gives": "item_id"` on a node hands the player a quest item (planned)

### Sprites (`data/sprites.json`)

Central registry mapping sprite keys to PNG paths, frame dimensions, and display scale. Referenced by NPC configs via the `"sprite"` field.

### Enemies (`data/enemies.json`)

Stats per enemy type: `hp`, `damage`, `speed`, `behavior` (wander), animation frame ranges.

### Items (`data/items.json`)

Quest items with `name`, `description`, `frame` index (into `items.png`), `type`, and `stages` (which worlds they appear in).

### Levels (`src/config/levels.js`)

Array of `{ key, name, subtitle }` objects. The title screen level select is built from this. To add a new level:

1. Add entry to `levels.js`
2. Create the scene file in `src/scenes/`
3. Import and register it in `src/main.js`

## Tools

### Level Editor

```bash
# Start the server, then open in browser:
open http://localhost:8080/tools/collision_editor.html
```

Paint walkability, place player spawn, NPCs, doors, enemies, and items. Save downloads a `*_collision.json` — move it to `assets/tilemaps/`.

Tools in the sidebar: Block Tile, Erase, Player Spawn, NPC, Door, Enemy, Item. Each entity type has a delete button in the "Placed Characters" list.

### Map Processing

```bash
python3 tools/process_map.py <input_image> <output_name> [--scale 0.5]
# Example:
python3 tools/process_map.py assets/freiburg-map.png world2 --scale 0.5
```

Outputs `assets/tilemaps/<name>_bg.png` and `<name>_collision.json`. Auto-detects tile grid size, removes grid lines, computes `display_scale` for consistent tile rendering across levels.

The `display_scale` field in the collision JSON controls how large the map renders in-game. It's computed so that one source tile = 72px on screen (roughly player height). Override it manually if needed.

### Sprite Sheet Processing

```bash
python3 tools/convert_sheet.py assets/sprites/sheets/some_sheet.png
```

Removes checkerboard backgrounds, extracts frames, bottom-aligns them, and outputs a uniform grid PNG to `assets/sprites/`. See `.kiro/skills/SHEET_CONVERT.md` for details.

## Testing

```bash
# Run smoke tests (boots game in headless Chrome, cycles all scenes)
./tests/run.sh

# Runs automatically on every git commit (pre-commit hook)
# To reinstall the hook:
cp tests/pre-commit ../../.git/hooks/pre-commit && chmod +x ../../.git/hooks/pre-commit
```

The smoke test verifies:
- All ES6 module imports resolve
- Phaser game boots
- Every registered scene completes `preload()` + `create()` without errors

## Controls

| Action | Desktop | Mobile |
|--------|---------|--------|
| Move | WASD / Arrow keys | Virtual joystick (left side) |
| Talk / Advance dialogue | E / Space | A button (right side) |
| Attack | Z | Z button (right side) |
| Choose dialogue option | ↑ / ↓ | ↑ / ↓ |

## Architecture Notes

- **Physics:** Static collision bodies use `Zone` + `physics.add.existing(zone, true)`. Never use `Rectangle.refreshBody()`.
- **Map rendering:** Background images loaded at native size, displayed with `setScale(display_scale)`. All collision rects and positions from JSON are multiplied by the same scale in scene code.
- **Responsive:** `Phaser.Scale.RESIZE` mode. All UI positioned relative to `cameras.main.width/height`. Touch controls reposition on resize.
- **Player sprite:** `martin.png` — 104×183 frames, 8 cols × 4 rows. Scale 0.4. Body 60×30 offset 22,148.
- **NPC rendering:** Scene reads `npcData[id].sprite` to get the sprite key, looks up `spriteData.sprites[key].scale` for display scale. Falls back to a yellow rectangle if the texture is missing.
