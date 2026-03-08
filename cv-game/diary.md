# Career Quest — Development Diary
Built with [Kiro](https://kiro.dev)

---

## 2026-03-02 14:27 — Project Bootstrap & World 1

**Prompt:** Create a browser-based Phaser 3 RPG that serves as a playable CV

**What changed:**
- Created project scaffolding: `index.html`, `src/main.js`, folder structure
- Built `TitleScreen.js` with START GAME, ABOUT, ENTER shortcut, fade transitions
- Built `BaseScene.js` with SNES-style dialogue box and typewriter effect
- Built `Player.js` with 4-way movement (WASD + Arrows), action key (E/Space)
- Processed `martin.png` spritesheet — removed checkerboard BG, extracted 4 animation rows
- Built `tools/process_map.py` for map processing (scale, auto-detect water collision)
- Created World 1 (Saarbrücken) with scrolling map, 9 NPCs, water/border collision

**Key decisions:** Maps are hand-painted images with auto-detected collision, not tile-based. Sprites processed via Python pipeline (Pillow + NumPy).

---

## 2026-03-02 22:35 — NPC Sprites & Dialogue Trees

**Prompt:** Add NPC character sprites, branching dialogue, doors, and mobile controls

**What changed:**
- Processed NPC spritesheets (doris, father, wolfgang, monika, christine, valentin, tobert, ben) via `tools/convert_sheet.py`
- Implemented Zelda-style dialogue trees with choices and branching in `data/world1_npcs.json`
- Added door system for scene transitions
- Added mobile touch controls (virtual d-pad)

**Key decisions:** One NPC config file per level. Dialogue is data-driven JSON with choice nodes.

---

## 2026-03-03 17:14 — Sprites, Enemies, Items & Level Editor

**Prompt:** Add enemy combat, item pickups, and a collision editor tool

**What changed:**
- Created `data/enemies.json` and `data/items.json` registries
- Built `tools/collision_editor.html` — visual editor for placing walls, NPCs, doors, enemies, items
- Added items spritesheet (`assets/sprites/items.png`)
- Added enemy sprites (bug enemy)

**Key decisions:** Collision editor is a standalone HTML tool, not part of the game itself.

---

## 2026-03-03 17:55 — Level Select, Combat System, Worlds 2–3

**Prompt:** Add level select menu, keyboard swing combat, and two more worlds

**What changed:**
- Added level select panel to title screen with per-level availability check
- Implemented keyboard swing attack (Z / Left Click) with hitbox, damage, knockback
- Created World 2 (Freiburg) and World 3 (Macau) scene files
- Added podelski, byron, evren, stephan, zhiming NPC sprites

**Key decisions:** Combat uses a simple hitbox in front of the player. Enemies take damage and flash red.

---

## 2026-03-04 07:17 — Smoke Tests

**Prompt:** Add automated testing to catch scene boot failures

**What changed:**
- Created `tests/smoke.html` — headless Chrome boot check for all scenes (TitleScreen + World1-4)
- Created `tests/run.sh` with `node --check` syntax validation + headless Chrome scene test
- Added `audio: { noAudio: true }` to test config to prevent headless audio timeout
- Set up pre-commit hook running tests before every push

**Key decisions:** Tests use inline `<script>` (not ES6 modules) because `--virtual-time-budget` doesn't work with modules.

---

## 2026-03-04 09:28 — Audio System & Sound Effects

**Prompt:** Add background music and sound effects

**What changed:**
- Created `src/config/audio.js` — audio registry (11 SFX + 5 music slots)
- Added 10 CC0/Kenney sound effects (pickup, hit, door, swing, etc.)
- Added World 1 background music (`music_saarbruecken.mp3`)
- Wrote `docs/WORLD5_MAP_BRIEF.md` — detailed map creation brief for NYC level

**Key decisions:** SFX gracefully skip if files are missing. Music loops with Phaser's built-in looping.

---

## 2026-03-04 15:24 — README & Consistent Tile Scaling

**Prompt:** Document the architecture and fix tile rendering across levels

**What changed:**
- Rewrote `README.md` documenting BaseScene API, adding new levels guide, collision JSON format, controls
- Added `display_scale` to collision JSON for consistent tile rendering across levels
- Removed grid lines from map rendering

**Key decisions:** `display_scale` in collision JSON controls how the map image scales to world coordinates.

---

## 2026-03-04 15:44 — Wandering NPCs (Lauren & Willem)

**Prompt:** Add NPCs that wander around the map instead of standing still

**What changed:**
- Added `lauren.png` (103×188, 4 frames, static) and `willem.png` (116×188, 30 frames, wandering)
- Implemented wandering NPC system: physics sprites, idle/walk animations, random wander AI
- Willem added to World 3 as first wandering NPC
- Updated `data/sprites.json` with `wander: true`, speed, animation config

**Key decisions:** Wandering NPCs use physics sprites (not static) with configurable speed and animation frames.

---

## 2026-03-04 15:55 — Mute Button

**Prompt:** Add a way to mute the game

**What changed:**
- Added 🔊/🔇 toggle button in top-right corner of every level
- M key shortcut for mute
- Uses Phaser's `sound.mute` which persists across scene transitions

**Key decisions:** None — straightforward feature.

---

## 2026-03-04 16:01 — Collision Editor Improvements

**Prompt:** Make the collision editor work better with all maps

**What changed:**
- Added world2–4 to map selector dropdown
- Added scroll wheel zoom (0.1x–3x), default fits map in viewport
- Added graceful fallback when no collision JSON exists

**Key decisions:** None.

---

## 2026-03-04 17:27 — BaseScene Refactor

**Prompt:** The world scenes have too much duplicated code — consolidate it

**What changed:**
- Moved ALL shared level logic into `BaseScene.js` (~530 lines)
- `loadLevelAssets()`, `loadNPCSprites()`, `createLevel()`, `updateLevel()` — four methods handle everything
- Each world scene slimmed to ~15 lines (just preload/create/update calling BaseScene)
- Added `knownSprites` map in BaseScene for NPC frameWidth lookup

**Key decisions:** This was the biggest refactor. All new features now go into BaseScene, world scenes are just config.

---

## 2026-03-04 18:35 — Background Music for All Worlds

**Prompt:** Add music to every level

**What changed:**
- Processed music for all 5 worlds with ffmpeg (silence trimmed, mono 44.1kHz 128kbps, ~30s loops)
- `music_saarbruecken.mp3`, `music_freiburg.mp3`, `music_macau.mp3`, `music_sanfrancisco.mp3`, `music_nyc.mp3`
- Reprocessed World 2 music for cleaner loop

**Key decisions:** All music trimmed with `silenceremove` ffmpeg filter for seamless looping.

---

## 2026-03-04 18:58 — Podelski Dog Sprite

**Prompt:** Podelski should have his dog in World 2

**What changed:**
- Extracted `podelski_dog.png` (145×188, 1 frame) from podelski_sheet frame 2
- Restored `podelski.png` to 76×188 (without dog) for World 1
- Fixed NPC ID mismatch: collision map had `podelski_dog` but NPC JSON only had `podelski`

**Key decisions:** Separate sprites for with/without dog. Both IDs in NPC JSON.

---

## 2026-03-04 19:28 — Diagonal Movement

**Prompt:** Let the player move diagonally

**What changed:**
- Player can hold two direction keys simultaneously
- Diagonal speed normalized by ×0.707 (1/√2)
- Facing priority: vertical checked last so it takes precedence

**Key decisions:** None — standard diagonal normalization.

---

## 2026-03-04 19:44 — Items & Doors Polish

**Prompt:** Items should float and doors should look better

**What changed:**
- Items render from collision JSON with correct spritesheet frame, float with bob animation (Sine.easeInOut tween)
- Pickup on overlap with SFX, label showing item name
- Doors show `door_closed.png` + pulsing yellow glow, swap to `door_open.png` on enter
- Removed hardcoded crates that were spawning on top of every door

**Key decisions:** Door sprites processed from source sheets (`door_closed.png` 46×60, `door_open.png` 110×60).

---

## 2026-03-04 20:02 — Game Over Screen

**Prompt:** What happens when the player dies?

**What changed:**
- When HP hits 0: player stops → camera shakes 300ms → 600ms delay → black overlay fades in (0.7 alpha) → red "GAME OVER" text fades in → 2.5s delay → music stops → return to TitleScreen

**Key decisions:** Cinematic feel with sequential tweens rather than instant restart.

---

## 2026-03-04 20:23 — World 4 (San Francisco)

**Prompt:** Create the San Francisco level

**What changed:**
- Created `World4_SanFrancisco.js` (~15 lines using BaseScene)
- Added to `src/main.js` scene list and `src/config/levels.js`
- Fixed `dejan.png` — reprocessed to exact 640×188 (80px × 8 frames) to fix Phaser spritesheet failure
- Added john and dejan NPCs, 1 door
- Updated smoke tests to include World4

**Key decisions:** dejan.png was 644px wide causing silent Phaser failure. Width must be exact multiple of frameWidth.

---

## 2026-03-04 20:48 — Door Sprites

**Prompt:** Doors should have actual sprites instead of just colored rectangles

**What changed:**
- Processed `door_closed.png` and `door_open.png` from source sheets
- Doors show closed sprite + pulsing glow, swap to open on player overlap before scene transition
- Graceful fallback if sprites missing

**Key decisions:** None.

---

## 2026-03-04 20:50 — NPC Idle Animations

**Prompt:** Static NPCs look lifeless just standing there

**What changed:**
- All static NPCs now cycle through their spritesheet frames at 3fps
- Frame count auto-detected from texture
- Wandering NPCs excluded (they already have walk/idle anims)

**Key decisions:** 3fps chosen to feel like subtle breathing/fidgeting, not frantic.

---

## 2026-03-04 21:01 — Publication Papers

**Prompt:** Scatter my publications across the worlds as collectible items

**What changed:**
- `publications.json` loaded at runtime, filtered by world year ranges
- Papers spawn at random walkable positions using seeded RNG (worldNum × 9973)
- Pickup shows paper title + year + snarky comment (16 different quips)
- Green glow + floating bob animation on each paper
- 51 papers total: W2=1, W3=10, W4=23, W5=17

**Key decisions:** Seeded RNG ensures consistent placement. Year ranges in `levels.js`. Papers auto-update when `publications.json` changes.

---

## 2026-03-04 21:08 — Paper Placement Collision Fix

**Prompt:** Make sure papers can't spawn on blocked or occupied tiles

**What changed:**
- Fixed water_rects blocking (was only blocking top-left tile, now blocks all covered tiles)
- Added border_rects to blocked set
- Added NPC, enemy, door, item, and player spawn positions to blocked set

**Key decisions:** None — bug fix.

---

## 2026-03-04 21:09 — Title Screen Update

**Prompt:** The start screen should explain controls and that this is a CV walkthrough

**What changed:**
- Updated ABOUT box: "a stylized walkthrough of Martin Schaef's CV"
- Added full controls section: Move (Arrow/WASD), Talk (Space/E), Attack (Z/Click), Mute (M)
- Larger box (280px) with better line spacing
- Fixed dismiss bug (200ms delay before registering close click)

**Key decisions:** None.

---

## 2026-03-04 21:21 — Collision Editor: Brush & Rect Fill

**Prompt:** Add bigger brush and shape fill tools to the collision editor

**What changed:**
- Added brush size selector (1×1, 3×3, 5×5, 7×7) for block/erase tools
- Added rect fill tool (click-drag to fill rectangle of blocked tiles, live preview)
- Added rect erase tool (same but clears)
- Added world5 to map dropdown

**Key decisions:** Rect fill is more useful than flood fill for marking rectangular building footprints.

---

## 2026-03-06 14:44 — Development Diary Setup

**Prompt:** Add agent config to keep a running diary of all interactions

**What changed:**
- Created `.kiro/skills/DIARY.md` — skill instructing agent to append diary entries
- Updated `.kiro/agents/career-quest.json` to include DIARY skill
- Created `diary.md` with backfilled entries

**Key decisions:** Only log interactions that result in code/file changes. Combine related messages into single entries.

---

## 2026-03-06 17:41 — Normalize NPC Sprites

**Prompt:** NPC sprites have strange size changes and inconsistent offsets between frames

**What changed:**
- Created `tools/normalize_sprites.py` — analyzes and fixes all NPC spritesheets
- Fixed two classes of bugs across 13 sprites:
  - **Width alignment**: 8 sprites had total width not divisible by frameWidth (Phaser silently dropped partial frames) — ben, byron, byron2, doris, john, tobert, willem, zhiming
  - **Frame jitter**: 4 sprites had content at different vertical positions per frame (father: 60px variation!, willem: 34px, dejan: 7px, stephan: 5px) — all now bottom-center anchored so feet stay locked
- Backups saved as `*_prenorm.png` for rollback
- No frameWidth changes needed — no code updates required

**Key decisions:** Bottom-center anchor chosen over top-center because RPG characters should have stable feet. Script is reusable for future sprites.

---

## 2026-03-07 00:38 — Martin Action Sprites

**Prompt:** Process martin_action_sheet.png and make all animations available in the game

**What changed:**
- Processed `assets/sprites/sheets/martin_action_sheet.png` (2760×1504, checkerboard BG):
  - Detected 3 content rows, split row 0 at vertical gap into 4 animation groups
  - Removed checkerboard background (dual-color flood fill, tolerance 35)
  - Extracted frames, scaled to 183px height (matching martin.png), bottom-center anchored
- Created 4 spritesheets:
  - `martin_attack.png`: 5 frames, 234×183 — keyboard swing
  - `martin_hit.png`: 6 frames, 330×183 — getting hit
  - `martin_powerup.png`: 9 frames, 186×183 — power-up charge
  - `martin_blast.png`: 10 frames, 320×183 — energy blast
- All 4 preloaded in `BaseScene.loadLevelAssets()`
- Animations registered in `Player._createAnims()`
- Attack now plays `martin_attack` overlay sprite instead of yellow rectangle slash
- Taking damage now plays `martin_hit` overlay sprite
- Powerup and blast animations registered but not yet triggered by gameplay

**Key decisions:** Action sprites use overlay sprites (created/destroyed per use) since their frame dimensions differ from the walk/idle sheet. Base sprite hidden during overlay playback.

---

## 2026-03-07 00:53 — Fix NPC Sprite Size Changes

**Prompt:** NPC animations are buggy with strange size changes

**What changed:**
- Diagnosed the root cause: BaseScene cycles ALL spritesheet frames for static NPC idle animations, but some sprites have frames with wildly different content sizes
- Analyzed all 19 NPC sprites — found 3 with inconsistent frames:
  - `father.png`: 8→4 frames (frames 4-7 were half-body at 128px vs 188px full-body)
  - `wolfgang.png`: 7→4 frames (frames 1-3 had width 135-177px vs ~90px for the rest)
  - `willem.png`: 30→24 frames (frames 24-29 were oversized, but idle/walk ranges 0-15 unaffected)
- Verified all remaining sprites pass consistency checks (height ±10px, width ±20px)

**Key decisions:** Stripped bad frames from sheets rather than adding special-case logic in game code. Simpler and prevents any future code from accidentally using inconsistent frames.

---

## 2026-03-07 01:00 — Reprocess Player Action Sprites

**Prompt:** New animation sheets in new_animations/ — process them and fix heights

**What changed:**
- Processed 3 new source sheets from `new_animations/`:
  - `martin_swing.png` (978×542): Detected 3×2 grid → 6 attack frames at 220×183
  - `martin_hit.png` (639×247): Detected 3×1 grid → 3 hit frames at 158×183
  - `martin_powerup.png` (1168×250): Content-extracted → 5 powerup frames at 160×183
- All frames scaled to 183px height (matching martin.png), bottom-center anchored
- Updated frameWidth values in `BaseScene.loadLevelAssets()` and frame counts in `Player._createAnims()`
- All sheets verified: 0 remainder, 0 height variation across frames

**Key decisions:** Used regular grid detection for swing/hit (frames too close together for gap-based extraction). Tried multiple grid sizes and picked the one with most consistent frame content.

---

## 2026-03-07 10:16 — New Player Sprite from Nano Banana

**Prompt:** Process new sprite sheet from NANO_BANANA_SPRITE_PROMPT.md for walking and striking

**What changed:**
- Processed `assets/sprites/sheets/martin_new.png` (1792×2390, cyan background):
  - Removed cyan BG (color-distance threshold 40)
  - Found 5 content rows: idle(4), walk_down(4), walk_right(4), walk_up(4), attack(3)
  - Reordered idle frames from prompt order (down,left,right,up) to game order (down,right,up,left)
  - Scaled all frames to 183px height (scale factor 0.403), bottom-center anchored
- Created `martin.png`: 400×732, 4×4 grid, frameWidth=100 (was 104)
- Created `martin_attack.png`: 522×183, 3 frames, frameWidth=174 (was 220)
- Updated `Player.js`: new frame indices for 4-col layout (walk_down=4-7, walk_right=8-11, walk_up=12-15)
- Updated `BaseScene.js`: new frameWidth values

**Key decisions:** Switched from 8-col to 4-col grid since new sheet has 4 frames per animation (was 7-8). Attack kept as separate sheet due to wider frames (174 vs 100).

---

## 2026-03-07 13:45 — Full Reprocess of Player Sprite Sheet

**Prompt:** Reprocess martin_new.png with detailed row-by-row animation mapping

**What changed:**
- Processed `assets/sprites/sheets/martin_new.png` (2760×1504, grey checkerboard BG):
  - BG removal: dual checkerboard color match + low-saturation filter (removed 78% of pixels)
  - 6 rows × variable frames, filtered labels/text by minimum height (100px)
  - Separated walk vs strike frames within rows by height threshold (200px)
- Created spritesheets:
  - `martin.png`: 7×3 grid (fw=76) — idle(4), walk_down(7), walk_up(5)
  - `martin_attack.png`: 7 frames (fw=144) — strike south
  - `martin_attack_north.png`: 7 frames (fw=122) — strike north
  - `martin_attack_west.png`: 9 frames (fw=146) — strike west (rows 5+6 combined)
  - `martin_powerup.png`: 5 frames (fw=178) — power up
- QA verified: all sheets have 0 height variation, all frames bottom-anchored at 183px
- Fixed powerup sheet: 2px bottom misalignment corrected by shifting content down
- Walk left/right reuse walk_down frames (no side-view walk in source sheet)
- Cache-busted all sprite URLs to v=3

**Key decisions:** Used saturation-based BG detection (sat < 0.10) combined with checkerboard color matching — more robust than either alone. Split animations within rows by frame height (walk frames ~250px, strike frames ~155px). Idle reordered from sheet order (S,W,N,E) to game order (S,E,N,W).

---

## 2026-03-07 14:02 — Fix Sprite Transparency Bug

**Prompt:** Player sprite shows parts of two rows and transparency is messed up

**What changed:**
- Diagnosed root cause: the `sat < 0.10` low-saturation filter was removing grey character pixels (pants, shoes, shadows, glasses frames) because they matched the grey checkerboard background's saturation profile
- Replaced BG removal with **edge-seeded flood fill**: only checker-matching pixels reachable from image borders and row boundaries are removed. Interior grey pixels (character clothing) are protected.
- Raised checker tolerance from 22 to 30 (safe with flood fill since it can't reach character interiors)
- Added character-size filter (80-160px width) to exclude text labels from frame extraction
- Rebuilt all spritesheets:
  - `martin.png`: 7×3 grid, fw=86 (idle 4f, walk_down 7f, walk_up 5f)
  - `martin_attack.png`: 5f, fw=128
  - `martin_attack_north.png`: 7f, fw=144
  - `martin_attack_west.png`: 8f, fw=122
  - `martin_powerup.png`: 6f, fw=176
- QA: <2% grey pixel leakage across all sheets

**Root cause:** Using color saturation as a proxy for "is background" fails when the character has grey/desaturated elements. The correct approach is spatial: BG is what's reachable from the edges, not what looks grey.

**Prevention:** Always use flood-fill from edges for BG removal on AI-generated sprite sheets. Never use saturation or color-only filters — characters can have any color including greys that match the BG.

---

## 2026-03-07 17:39 — Revert martin.png to March 4 version

**Prompt:** martin.png is no good, revert to 2 days ago

**What changed:**
- Reverted `martin.png`, `Player.js`, and `BaseScene.js` to commit `3f36e55` (March 4)
- Original sprite: 832×732, 104×183 frames, 8×4 grid
- The flood-fill sprite extraction from `martin_new.png` wasn't producing acceptable results
- Attack sprite sheets from today's work remain on disk but are not loaded

---

## 2026-03-07 18:13 — Credits Screen

**Prompt:** Create a credits screen reachable from main menu showing idle sprites of all NPCs with names

**What changed:**
- New `src/scenes/CreditsScreen.js` — loads all 19 NPC spritesheets, displays them in a 3-column grid with idle animations and display names
- `TitleScreen.js` — added CREDITS button (repositioned existing buttons to fit)
- `main.js` — registered CreditsScreen in scene list
- `tests/smoke.html` — added CreditsScreen to import and test lists

---

## 2026-03-08 08:55 — Credits Screen Redesign + HUD Bar

**Prompt:** Credits screen doesn't fit mobile; make it one NPC per row with configurable descriptions and scrollable. Also clean up the overlapping HUD icons.

**What changed:**
- `data/credits.json` — new file with sprite key, frame width, display name, and description text for each of the 19 NPCs. Editable without touching code.
- `src/scenes/CreditsScreen.js` — rewritten: single-column layout (sprite left, name+text right), scrollable via drag or mouse wheel, loads NPC data from credits.json
- `src/scenes/BaseScene.js` — replaced scattered HUD elements (title, controls hint, hearts, mute) with a clean 32px semi-transparent bar at top:
  - Left: ← Menu button (returns to title)
  - Center-left: level title
  - Center: hearts
  - Right: mute toggle
  - Resize-aware repositioning
- Removed old `createMuteButton()` (mute now lives in the HUD bar)

---
