# Career Quest — Development Diary
Built with [Kiro](https://kiro.dev)

---

## 2026-03-01 — Project Bootstrap & World 1

**Prompt:** Set up the project and build the first playable level

**What changed:**
- Created project scaffolding: `index.html`, `src/main.js`, folder structure
- Built `TitleScreen.js` with START GAME, ABOUT, ENTER shortcut, fade transitions
- Built `BaseScene.js` with SNES-style dialogue box and typewriter effect
- Built `Player.js` with 4-way movement (WASD + Arrows), action key (E/Space)
- Processed `martin.png` spritesheet — removed checkerboard BG, extracted 4 animation rows (idle, walk_down, walk_side, walk_up)
- Built `tools/process_map.py` for map processing (scale, auto-detect water collision)
- Created World 1 (Saarbrücken) with scrolling map, 9 NPCs, water/border collision

**Key decisions:** Maps are hand-painted images with auto-detected collision, not tile-based. Sprites processed via Python pipeline (Pillow + NumPy).

---

## 2026-03-02 — Worlds 2–4, Combat, Audio, BaseScene Refactor

**Prompt:** Build out remaining worlds, add combat, music, and shared scene logic

**What changed:**
- Refactored all shared level logic into `BaseScene.js` (~530 lines) — each world scene is now ~15 lines
- Created Worlds 2 (Freiburg), 3 (Macau), 4 (San Francisco) with NPCs, enemies, doors
- Added combat system: keyboard swing attack, enemy HP, damage, knockback
- Added items system: floating sprites with bob animation, pickup on overlap
- Added doors: closed/open sprites, pulsing glow, scene transitions
- Processed background music for all 5 worlds (silence trimmed, mono 44.1kHz, ~30s loops)
- Added mute button (🔊/🔇) + M key shortcut
- Added diagonal movement (normalized by ×0.707)
- Added game over screen (camera shake → black overlay → red text → return to title)
- Added wandering NPCs (Willem in World 3) with physics sprites and walk animations
- Added NPC idle animations (all static NPCs cycle through frames at 3fps)
- Built collision editor with zoom, all maps in dropdown

**Key decisions:** One NPC config file per level. Wandering NPCs configured via `sprites.json` with `wander: true`. Seeded RNG not used yet.

---

## 2026-03-04 — Publication Papers, Title Screen, Collision Editor

**Prompt:** Auto-spawn publication papers across worlds, update title screen, improve collision editor

**What changed:**
- `publications.json` loaded at runtime, filtered by world year ranges (W1: 1982-2006, W2: 2006-2010, W3: 2010-2013, W4: 2013-2017, W5: 2017+)
- Papers spawn at random walkable positions using seeded RNG for consistency
- Pickup shows paper title + snarky comment ("Reviewer #2 hated this one.")
- Paper placement now properly blocks water rects (all tiles, not just top-left), border rects, NPCs, enemies, doors, items, player spawn
- Updated title screen ABOUT box: explains controls (Move, Talk, Attack, Mute) and describes game as "a stylized walkthrough of Martin Schaef's CV"
- Added collision editor tools: brush sizes (1×1 to 7×7), rect fill/erase (click-drag), world5 in dropdown

**Key decisions:** Year ranges in `src/config/levels.js`. Seeded RNG (worldNum × 9973) ensures papers appear in same spots each playthrough. 51 papers total across 4 worlds.

---

## 2026-03-06 — Development Diary Setup

**Prompt:** Add agent configuration to keep a running diary of all interactions in `./diary.md`

**What changed:**
- Created `.kiro/skills/DIARY.md` — skill that instructs agent to append entries after each interaction
- Updated `.kiro/agents/career-quest.json` to include the DIARY skill
- Created `diary.md` with header and backfilled entries for all previous sessions

**Key decisions:** Diary entries only logged for interactions that result in code/file changes. Multiple related messages combined into single entries.

---
