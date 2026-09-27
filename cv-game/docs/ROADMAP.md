# Career Quest — Development Roadmap

> **Status (2026-09-27):** Full loop playable: Saarbrücken → Freiburg → Macau → San Francisco → NYC → Victory screen with rolling credits. Combat, doors, dialogue in all worlds, publications pickups, music, and mobile controls are done. The per-world special mechanics below (maze, context switch, timer, boss) were not built; `data/progression.json` quest gating exists but is not wired into the game yet.

## Weekend 1: The Foundation
**Goal:** Playable room with movement, NPCs, dialogue, and basic combat.

- [x] Project scaffolding (`index.html`, `src/main.js`, folder structure)
- [x] `BaseScene` with `showMessage(text)` dialogue box
- [x] `Player.js` — 4-way SNES movement (WASD/Arrows), action key (Space/E)
- [x] World1_Saarbruecken — room with floor/walls, 5 NPCs
- [x] NPC dialogue wired to `data/dialogue.json`
- [x] Title screen with START GAME, ABOUT, fade transitions
- [x] Sprite processing pipeline + player animations (idle, walk 4-dir)
- [x] NPC collision (can't walk through NPCs)
- [x] Keyboard Swing attack (Z / Left Click) — hitbox in front of player
- [ ] Destructible "Clutter Box" entities that break on swing
- [x] Sibling NPCs with simple random patrol movement
- [x] Door exit that triggers scene transition (placeholder target)

**Deliverable:** Walk around the house, talk to family, smash boxes, exit through the door.

---

## Weekend 2: World 2 — Freiburg (The PhD Quest)
**Goal:** Second level with maze navigation, item pickups, and enemy combat.

- [x] `World2_Freiburg.js` — Black Forest campus tilemap
- [ ] NPC: Andreas Podelski (in Tower of Logic), Stephan & Even (roommates)
- [ ] "Stamina Pizza" pickup item (simple inventory/HUD counter)
- [ ] Enemy: "Infinite Loop" (spinning patrol), "Null Pointer Wraith" (chases player)
- [x] Enemy health + death on keyboard swing hits
- [ ] "State-Space Explosion" maze section
- [ ] Item: "Static Analysis Shield" — blocks projectiles when held
- [ ] Red-pen projectile enemies
- [x] Scene transition from World1 → World2

**Deliverable:** Navigate campus, collect pizza, fight enemies, survive the maze, defend thesis.

---

## Weekend 3: World 3 — Macau (The UN & Casino Duality)
**Goal:** Split-map level with context-switching mechanic.

- [ ] `World3_Macau.js` — split tilemap (UN campus / Cotai Strip neon)
- [ ] Context-switch mechanic: player alternates between two map halves
- [ ] NPC: Diplomats (UN side), Pit Bosses (Casino side)
- [ ] Enemy: "Security Vulnerability" (UN side), "Legacy Code Blob" (Casino side)
- [ ] "Bounty Hunter Logic" screen-clear ability (charged attack)
- [x] Scene transition World2 → World3

**Deliverable:** Dual-world level with distinct visual halves and a unique mechanic.

---

## Weekend 4: World 4 — San Francisco (The Research Lab)
**Goal:** Timed collection level with upgraded combat.

- [x] `World4_SanFrancisco.js` — hilly Bay Area / SRI campus tilemap
- [ ] Collectible: "Peer-Reviewed Citations" scattered across map
- [ ] "Conference Deadline" countdown timer HUD element
- [ ] NPC: Fellow researchers
- [ ] Enemy: "Vague Specification" (erratic movement), "Reviewer #2" (flying red pen boss)
- [ ] Keyboard upgrade: "Formal Methods" — increased attack range
- [x] Scene transition World3 → World4

**Deliverable:** Timed collection challenge, upgraded combat, mini-boss fight.

---

## Weekend 5: World 5 — NYC (The Cloud Citadel) + Polish
**Goal:** Final level, boss fight, game completion flow.

- [x] `World5_NYC.js` — Manhattan streets / AWS Tower tilemap
- [x] NPC: Byron Cook at tower base
- [ ] Yellow cab traffic hazard (moving obstacles)
- [ ] Final Boss: "The Global Outage" — multi-phase fight
- [ ] "Senior Principal Engineer Armor" + "Cloud Keyboard" final upgrades
- [x] Victory screen / credits showing full CV summary
- [x] Scene transition World4 → World5

**Deliverable:** Complete game loop from Saarbrücken to NYC.

---

## Reminders
- [ ] Add cheat codes

---

## Weekend 6: Polish & Deploy
**Goal:** Ship it.

- [ ] Replace all placeholder sprites with custom pixel art
- [x] Add background music / SFX (8-bit style)
- [x] Mobile touch controls (virtual d-pad)
- [ ] Performance pass (asset loading, scene cleanup)
- [x] Deploy to martinschaef.github.io
- [ ] README with play link and credits
