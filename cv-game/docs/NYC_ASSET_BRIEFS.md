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

## Part 2 — World 6 map: the AWS Midtown office

**Done.** The map is built from a painted reference, `tools/ref/office_ref.jpeg`
(a 1024×559 mock screenshot: street and taxis on the left, HQ exit door, kitchen,
two meeting rooms, management office top-right, desk pods, reception, server room).

```bash
python3 tools/build_office_from_ref.py [--debug /tmp/w6_overlay.png]
```

The script crops the HUD strip, cleans JPEG noise, upscales ×2 into
`assets/tilemaps/world6_bg.png` (2048×1024, `display_scale` 1.0) and derives the
collision from the floor colour: a 16 px block is walkable when most of it is
low-saturation grey. `CARVE` / `BLOCK` rectangles in the script fix doorways and
walls, and unreachable floor islands are blocked so paper pickups never land
there. It prints a reachability check for the spawn, NPCs, and exit door.
NPC positions (Byron in the management office, Numair in the kitchen, Willem by
"Ownership", Emmi at the standing desk) are set in the script.
