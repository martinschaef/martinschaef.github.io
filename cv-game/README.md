# Career Quest

A browser-based Phaser 3 RPG that serves as a playable CV for Martin Schaef. The player navigates through worlds representing career chapters: Saarbrücken → Freiburg → Macau → San Francisco → NYC.

**Live:** [www.martinschaef.de/cv-game](https://www.martinschaef.de/cv-game/)

## Quick Start

```bash
cd cv-game
python3 -m http.server 8080
# open http://localhost:8080

# Kill & restart if already running:
lsof -ti:8080 | xargs kill; python3 -m http.server 8080
```

No build step. Phaser 3.60 loads from CDN. Everything is vanilla ES6 modules.

## Project Structure

```
cv-game/
├── index.html                  # Entry point (loads Phaser CDN + src/main.js)
├── src/
│   ├── main.js                 # Game config, scene registration
│   ├── config/
│   │   ├── levels.js           # Level registry (add new levels here)
│   │   └── audio.js            # Audio registry (SFX + music key→path map)
│   ├── scenes/
│   │   ├── BaseScene.js        # Shared level logic (see below)
│   │   ├── TitleScreen.js      # Main menu + level select
│   │   ├── World1_Saarbruecken.js  # Tutorial level
│   │   ├── World2_Freiburg.js      # University level
│   │   └── World3_Macau.js         # Far East level
│   └── entities/
│       └── Player.js           # Movement, attack, health, mobile controls
├── data/
│   ├── sprites.json            # Sprite registry (all NPCs, enemies, items)
│   ├── world1_npcs.json        # World 1 NPC dialogue trees
│   ├── world2_npcs.json        # World 2 NPC dialogue trees
│   ├── world3_npcs.json        # World 3 NPC dialogue trees
│   ├── enemies.json            # Enemy stats (hp, damage, speed, behavior)
│   └── items.json              # Quest items (name, description, frame index)
├── assets/
│   ├── sprites/                # Game-ready PNGs (spritesheets)
│   │   └── sheets/             # Source sheets (not needed at runtime)
│   ├── tilemaps/               # Per-world: *_bg.png + *_collision.json
│   └── audio/                  # SFX (.mp3) + music (music_*.mp3)
├── tools/
│   ├── collision_editor.html   # Visual level editor (zoom, all maps)
│   ├── process_map.py          # Map → background + collision JSON
│   └── convert_sheet.py        # Raw spritesheet → game-ready PNG
├── tests/
│   ├── smoke.html              # Headless boot test for all scenes
│   ├── run.sh                  # Run smoke tests via headless Chrome
│   └── pre-commit              # Git hook (syntax + JSON + smoke test)
└── docs/                       # Planning & tracking
```

## BaseScene — Shared Level Logic

All world scenes extend `BaseScene`, which provides:

- **`loadLevelAssets(worldNum)`** — preloads bg, collision JSON, sprites.json, enemies.json, NPC data
- **`loadNPCSprites([ids])`** — preloads NPC spritesheets + bug enemy sheet
- **`loadAudio(...musicKeys)`** — preloads all SFX + specified music tracks
- **`createLevel(worldNum, title, musicKey)`** — sets up everything:
  - Map background + collision walls (water, borders, blocked tiles)
  - Player spawn + physics
  - NPCs with sprites, labels, collision zones (static or wandering)
  - Enemies with wander AI + combat overlaps
  - Doors with scene transitions
  - Crates (destructible)
  - Hearts HUD + controls HUD
  - Camera follow + resize handling
  - Music + mute button
- **`updateLevel()`** — runs every frame:
  - Player movement + input
  - Dialogue navigation (↑↓ choices, E/Space advance)
  - Attack hitbox vs enemies/crates
  - Enemy wander AI
  - Wandering NPC AI + label tracking

A minimal world scene looks like:

```javascript
import { BaseScene } from './BaseScene.js';

export class World4_SanFrancisco extends BaseScene {
    constructor() { super('World4_SanFrancisco'); }

    preload() {
        this.loadLevelAssets(4);
        this.loadNPCSprites(['lauren', 'byron']);
        this.loadAudio('music4');
    }

    create() {
        this.createLevel(4, 'San Francisco — The Research Lab', 'music4');
    }

    update() {
        this.updateLevel();
    }
}
```

## Adding a New Level

1. Create the map image, run `python3 tools/process_map.py` to get `*_bg.png` + `*_collision.json`
2. Open the collision editor, place NPCs/enemies/doors/items, save the JSON
3. Create `data/worldN_npcs.json` with NPC dialogue trees
4. Create `src/scenes/WorldN_Name.js` (extend BaseScene, ~15 lines)
5. Add entry to `src/config/levels.js`
6. Import and register in `src/main.js`

## Wandering NPCs

NPCs with `"wander": true` in `sprites.json` get physics sprites and walk around randomly. They need `animations` (idle + walk frame ranges) and `speed` defined in their sprite entry. Example:

```json
"willem": {
  "path": "assets/sprites/willem.png",
  "frameWidth": 116, "frameHeight": 188, "scale": 0.4,
  "wander": true, "speed": 30,
  "animations": {
    "idle": { "start": 0, "count": 4, "rate": 4 },
    "walk": { "start": 8, "count": 8, "rate": 8 }
  }
}
```

## Key Config Files

### Dialogue (`data/world*_npcs.json`)

Zelda-style branching dialogue trees:

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

### Collision JSON (`assets/tilemaps/*_collision.json`)

Generated by `process_map.py`, edited in the collision editor:

```json
{
  "world_width": 1792, "world_height": 2400,
  "block_size": 32, "display_scale": 1.2,
  "water_rects": [...], "border_rects": [...],
  "blocked_tiles": [[tx,ty], ...],
  "player_spawn": {"x": 206, "y": 568},
  "npcs": [{"id": "evren", "x": 824, "y": 1200}],
  "doors": [{"x": 900, "y": 100, "target": "World3_Macau", "label": "Exit →"}],
  "enemies": [{"type": "bug", "x": 500, "y": 600}],
  "items": [{"id": "diploma", "x": 300, "y": 400}]
}
```

## Tools

### Level Editor

```bash
open http://localhost:8080/tools/collision_editor.html
```

Supports all maps (world1–4). Scroll wheel to zoom in/out, default zoomed to fit. Paint blocked tiles, place NPCs/doors/enemies/items. Save downloads JSON.

### Map Processing

```bash
python3 tools/process_map.py <input_image> <output_name> [--scale 0.5]
```

### Sprite Sheet Processing

```bash
python3 tools/convert_sheet.py assets/sprites/sheets/some_sheet.png
```

## Testing

```bash
./tests/run.sh
# Also runs automatically on every git commit (pre-commit hook)
```

## Controls

| Action | Desktop | Mobile |
|--------|---------|--------|
| Move | WASD / Arrow keys | Virtual joystick (left) |
| Talk / Advance | E / Space | A button (right) |
| Attack | Z | Z button (right) |
| Choose option | ↑ / ↓ | ↑ / ↓ |
| Mute/unmute | M | 🔊 button (top-right) |

## Audio

10 SFX (blip, confirm, select, swing, hit, hurt, enemy_death, crate_break, pickup, door_open) + per-level music slots. Missing audio files are silently skipped. Mute persists across scene transitions.
