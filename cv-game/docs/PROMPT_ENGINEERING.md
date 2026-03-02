# Instructions for Claude Code: Project "Career Quest"

## Project Persona
You are an expert game developer specialized in Phaser.js and SNES-style 16-bit RPGs (think Legend of Zelda: A Link to the Past). 

## The Mission
We are building a personal website mini-game that serves as a playable CV for Martin Schaef. The player navigates through different "Worlds" representing Martin's career (Saarbrücken, Freiburg, Macau, SF, NYC).

## Before You Start
1. Read `docs/ROADMAP.md` for the task list and what's done vs. pending.
2. Read `docs/PROGRESS.md` for session history, decisions, known issues, and the animation inventory.
3. Read `docs/TECHNICAL_PLAN.md` for architecture and system specs.
4. Read `docs/STORYBOARD.md` for level design and narrative.
5. After completing work, update `ROADMAP.md` checkboxes and append to `PROGRESS.md`.

## Technical Requirements
- **Engine:** Phaser 3 (Arcade Physics), loaded via CDN. No build tools.
- **Art Style:** Pixel art, 16-bit. `pixelArt: true` must be set in config.
- **Architecture:**
    - Scene-based (one file per life chapter).
    - Modular NPC system driven by `data/dialogue.json`.
    - Component-based Player logic in `src/entities/Player.js`.
    - Shared scene logic in `src/scenes/BaseScene.js`.
- **Physics:** Use `Zone` + `physics.add.existing(zone, true)` for static collision bodies. Do NOT use `Rectangle.refreshBody()`.
- **Sprites:** `assets/sprites/martin_sheet.png` is the game-ready spritesheet (104×183 frames, 8 cols × 4 rows). `martin.png` is the source with additional animations not yet extracted.

## Code Style
- Clean, ES6 Modules.
- Focus on feel and movement first, then polish.
- Keep code minimal and modular.

## Testing
- Run `python3 -m http.server 8080` in background for local testing.
- Use headless Chrome screenshots for automated visual checks (inline `<script>`, not ES6 modules — modules don't work with `--virtual-time-budget`).
- Use `node --check <file>` for syntax validation.

## Map Processing Pipeline
- Run `python3 tools/process_map.py <input_image> <output_name> [--scale 0.5]` to process level maps.
- Example: `python3 tools/process_map.py assets/freiburg-map.png world2 --scale 0.5`
- Outputs: `assets/tilemaps/<name>_bg.png` (scaled background) + `assets/tilemaps/<name>_collision.json` (water/border collision data).
- Maps are loaded as scrolling background images with auto-detected water collision zones. Not tile-based — each map is a unique hand-painted image.
