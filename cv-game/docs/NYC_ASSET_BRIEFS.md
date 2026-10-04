# NYC Asset Briefs — Sprites and Office Map

Prompts for the image generator (same workflow as the existing cast and worlds 1–5).
Generate, drop the PNGs where noted, then run the listed tool to wire them in.

---

## Part 1 — Character sprite sheets

### Format (identical to `assets/sprites/sheets/dejan_sheet.png`)
- Canvas **1952 × 2208 px**, light grey/white **checkerboard background** (the converter
  flood-fills it away).
- **2 rows × 4 columns**, one full-body character per cell, standing, facing the viewer.
- Row 1: four **idle** poses with small variation (weight shift, hand gesture, blink,
  look aside). Row 2: four more idle variants (the game plays all 8 as a 3 fps idle loop).
- **16-bit pixel art**, SNES-era RPG NPC proportions (slightly big head, ~1:5 head-to-body),
  black 1 px outline, flat shading with 2–3 tones per material, no anti-aliasing, no
  drop shadow, no text.
- Same scale as the existing cast: figure height ≈ 85 % of the cell.

Shared prompt prefix (paste before each character description):

> Pixel art character sprite sheet, 16-bit SNES JRPG style like Zelda: A Link to the Past,
> 2 rows by 4 columns of the same character in idle poses, standing, facing the viewer,
> full body, clean 1px black outlines, flat cel shading, limited palette, no anti-aliasing,
> on a light grey and white checkerboard background. Character:

Then after generating: `python3 tools/convert_sheet.py assets/sprites/sheets/<name>_sheet.png`
and update `frameWidth` in `data/sprites.json`, `data/credits.json`, and `knownSprites`
in `src/scenes/BaseScene.js`.

### `tancrede_sheet.png` — Tancrède Lepoint
> a slim, athletic white man in his late 30s, French, with thick tousled dark brown hair
> swept up and to the side, clean-shaven, warm wide grin. Wears a navy short-sleeved
> button-up shirt with a small white dot/leaf pattern, top button open, dark slim
> trousers, white sneakers. One pose holds a cocktail glass; one pose has thin round
> glasses on.

### `emmi_sheet.png` — Michael Emmi
> a lean, wiry white man in his early 40s with a runner's build, short silver-grey hair
> (salt and pepper, swept back), clean-shaven, narrow face, friendly smirk. Wears a
> fitted black short-sleeved button-up shirt with the top three buttons open, slim dark
> jeans, running shoes. One pose checks a sports watch; one pose stretches a calf like a
> runner.

### `ioannis_sheet.png` — Ioannis Agadakos
> a broad, stocky, muscular Greek man in his early 40s with a thick neck and big
> shoulders, very short dark hair receding at the temples, full dark beard with grey
> streaks, olive skin, big mischievous grin. Wears a plain black t-shirt stretched over
> his chest, dark jeans, black sneakers, a black beaded bracelet. One pose has Thai
> boxing hand wraps on and fists raised; one pose holds a beer.

### `numair_sheet.png` — Muhammad Numair Mansur
> a slim, athletic Pakistani man in his mid 30s, same build as a lean runner, short
> neat black hair, brown skin, a trim black mustache and a short chin beard (no
> sideburn beard), bright friendly smile. Wears a light blue casual shirt with the
> sleeves rolled to the elbows, dark trousers, brown shoes. One pose holds a laptop
> under one arm; one pose gives a thumbs-up.

---

## Part 2 — World 6 map: the AWS office + a slice of Midtown street

### Canvas and grid
- **1600 × 1200 px**, 16-bit pixel art, same style as worlds 1–5 (see
  `docs/WORLD5_MAP_BRIEF.md` for the style paragraph; reuse it verbatim).
- Top-down ¾ perspective, visible tile grid is fine (removed in post).
- The procedural placeholder (`tools/build_office_map.py`) shows the exact layout below
  as a flat colour block-out; `assets/tilemaps/world6_bg.png` is that block-out.
  Match its geometry so the existing collision JSON and NPC positions still fit.

### Layout (positions in px, origin top-left)
1. **Street strip, bottom** (y 880 → 1200): asphalt road with yellow dashed centre
   line, two parked yellow NYC taxis (x≈120 and x≈1180, y≈1010), a grey concrete
   sidewalk (y 880 → 990) with 4 street trees in iron grates (x 300, 700, 1000, 1400),
   a red fire hydrant (x 520), a trash can (x 1100). Keep the sidewalk walkable.
2. **Building facade** along y 840 → 880 with a row of glass windows, and a glass
   double door **entrance at x 760 → 840** with an orange "aws" smile logo on a dark
   sign above it. This is where the player enters/leaves.
3. **Office floor** (x 48 → 1552, y 48 → 840): blue-grey carpet tiles in a subtle
   checker pattern, light grey walls.
4. **Meeting room, top-left** (x 48 → 420, y 48 → 330): glass wall facing the floor,
   door gap at y 200 → 260 on its right wall, long wooden table with 8 chairs, a big
   whiteboard on the top wall covered in boxes and arrows. Label plaque:
   **"SORRY"** (it's a Lean joke).
5. **Byron's corner office, top-right** (x 1180 → 1552, y 48 → 300): glass partition,
   door gap at y 180 → 230 on its left wall, large desk with a monitor at x≈1330–1470,
   y≈120–180, two potted plants, whiteboard with "∀x. proof(x) → ship(x)".
6. **Open-plan desks**: two rows of four desks (x 520, 700, 880, 1060; y 400 and 620),
   each ~96×56 px with a monitor and chair, cables, coffee mugs, a rubber duck or two.
7. **Kitchen, bottom-left** (x 48 → 400, y 560 → 840): counter with espresso machine
   and sink along the top, fridge on the left wall, small table with two chairs,
   door gap at y 640 → 720 on its right wall.
8. **Lounge, bottom-right** (x 1250 → 1500, y 660 → 790): red sofa facing a low
   wooden coffee table, a floor lamp, a tall plant.
9. Decorations: an AWS-orange accent stripe on one wall, a framed "Dokimos → Aletheia →
   CDA" diagram, a bookshelf, a server-rack-shaped mini fridge. No people in the map.

### Labels (optional; the game overlays its own signs)
"AWS · JFK14" over the entrance, "KITCHEN", "SORRY" on the meeting room.

### After generating
1. Save as `assets/tilemaps/world6_bg.png` (1600×1200).
2. Run `python3 tools/build_office_map.py --collision-only` to regenerate
   `world6_collision.json` from the layout above, then fine-tune blocked tiles in
   `tools/collision_editor.html` (Map → world6) if the drawing deviates.
