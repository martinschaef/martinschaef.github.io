# Career Quest — Progress Log

## 2026-03-01 (Sunday): Weekend 1, Day 1

### Session 1: Project Setup & Planning
- Created folder structure (`src/`, `assets/`, `data/`, `docs/`)
- Wrote planning docs: `ROADMAP.md`, `TECHNICAL_PLAN.md`
- Created `index.html` loading Phaser 3.60 via CDN
- Created `src/main.js` with game config (800×600, Arcade Physics, pixelArt)

### Session 2: Title Screen & Core Systems
- Built `TitleScreen.js` with START GAME, ABOUT buttons, ENTER shortcut, fade transitions
- Built `BaseScene.js` with SNES-style dialogue box (typewriter effect), `showMessage`/`hideMessage`/`transitionTo`
- Built `Player.js` with 4-way movement (WASD + Arrows), action key (E/Space)

### Session 3: Sprite Processing
- Analyzed `martin.png` spritesheet (1792×2400, irregular layout with text labels)
- Built Python pipeline: white background removal (flood fill from corners), frame extraction, trimming, uniform spritesheet generation
- Generated `martin_sheet.png` (275×314 frames, 5 cols × 2 rows)

### Session 4: World 1 & Bug Fixes
- Built `World1_Saarbruecken.js` with room (floor + walls), 5 NPCs, dialogue system
- Fixed wall physics: `Rectangle.refreshBody()` doesn't exist → switched to `Zone` + `physics.add.existing()`
- Set up headless Chrome screenshot testing workflow
- Fixed sprite visibility: frames were just heads → re-extracted full-body sprites from correct Y regions

### Session 5: New Spritesheet & Animation Polish
- Processed updated `martin.png` (2816×1536, fake checkerboard transparency)
- Removed checkerboard background via dual-color flood fill (light ~208,213,220 + dark ~157,162,170)
- Extracted 4 animation rows: idle (4f), walk_down (7f), walk_side (8f), walk_up (6f)
- Generated new `martin_sheet.png` (104×183 frames, 8 cols × 4 rows, 835KB)
- Fixed idle animation: was cycling all 4 directions → now uses single frame per facing direction
- Fixed left/right walk inversion: side sprites face right natively, flipX for left
- Added NPC collision bodies (static zones)

### Session 6: Map Processing & World1 Overhaul
- Analyzed `saarbrücken-map.png` (2816×1536) — hand-painted, no tile reuse (4224 unique 32px tiles)
- Built reusable `tools/process_map.py`: scales map, auto-detects water collision via blue-channel dominance, outputs background PNG + collision JSON
- Generated `assets/tilemaps/world1_bg.png` (1408×768) + `world1_collision.json` (484 water zones)
- Rewrote World1 as scrolling map: background image, camera follows player, water/border collision
- NPCs placed near Saarland University area
- Fixed idle direction: `_setIdle()` no longer applies flipX (idle frames have dedicated poses per direction)
- Fixed walk left/right inversion: swapped IDLE frame mapping + flipX applies to left, not right

### Decisions Made
- Headless Chrome `--virtual-time-budget` doesn't work well with ES6 modules; use inline `<script>` for automated tests
- Sprite processing uses Python (Pillow + NumPy); keep `martin.png` as source, `martin_sheet.png` as game asset
- Frame sizes vary per animation but padded to uniform 104×183 for spritesheet

---

## Available Animations

### In game (`martin_sheet.png`):
| Row | Animation | Frames | Notes |
|-----|-----------|--------|-------|
| 0 | idle | 4 | One per direction: down(0), right(1), up(2), left(3) |
| 1 | walk_down | 7 | Front-facing walk cycle (frames 8-14) |
| 2 | walk_side | 8 | Right-facing walk; flipped for left (frames 16-23) |
| 3 | walk_up | 6 | Back-facing walk cycle (frames 24-29) |

### Not yet extracted (in `martin.png`):
| Animation | Frames | Region | Use case |
|-----------|--------|--------|----------|
| climbing | 7 | right side, y=204-425 | Ladder sections |
| pushing/pulling | 6 | right side, y=489-715 | Moving boxes/crates |
| getting_hit | 4 | right side, y=744-975 | Damage reaction |
| falling/jumping | 4 | right side, y=995-1233 | Jump/fall/knockback |
| opening | ~3 | left side, y=797-1232 | Chest/door interaction |
| power_up_charge | ~3 | left side, y=797-1232 | Super Saiyan transformation |
| energy_blast | 6 | left side, y=1290-1503 | Ranged energy attack |
| bonus_attack | ~5 | right side, y=1264-1501 | Melee attack with device |

---

## Known Issues
- NPCs are placeholder colored rectangles (need sprites)
- No combat/attack system yet
- No sound/music
- No mobile touch controls
