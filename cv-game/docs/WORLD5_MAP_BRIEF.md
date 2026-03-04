# World 5: New York City — Map Brief for Nano Banana

## Canvas Size
- **1792 × 2400 pixels** (same as worlds 2–4)
- **60 × 60 px tile grid** (same grid as worlds 2–4)
- That's 29 columns × 40 rows of tiles

## Visual Style (match existing levels)
- **16-bit pixel art**, SNES-era RPG aesthetic (think Zelda: A Link to the Past / EarthBound)
- Top-down ¾ perspective (slight overhead angle so you see building fronts)
- Visible tile grid lines (we remove them in post-processing, so don't worry about hiding them)
- Rich, saturated colors — not washed out
- White text labels on key landmarks (same font style as "VÖLKLINGEN STEELWORKS" and "SAARBRÜCKEN CITY" in world 1)
- Trees/parks rendered as clusters of round canopy sprites
- Water is bright blue with subtle shading, bordered by shoreline tiles
- Buildings have detailed pixel-art rooftops and facades, red/brown/grey tones
- Roads are grey cobblestone/asphalt with visible lane markings or curb edges

## Geography & Layout (top to bottom)

The map covers a strip from **Jackson Heights, Queens** across to **Midtown Manhattan**, oriented so:
- **East (Queens) is on the RIGHT side** of the map
- **West (Manhattan) is on the LEFT side**
- The **East River** runs vertically through the middle, dividing the two boroughs

### Right side — Queens (roughly right 40% of map)

**Top-right area: Jackson Heights**
- Dense residential blocks with brownstone-style row houses
- Roosevelt Avenue running horizontally (2 tiles wide)
- 74th Street running vertically (2 tiles wide)
- Small shops, a diversity of colorful awnings
- Label: **"JACKSON HEIGHTS"**
- Elevated 7-train tracks running along Roosevelt Ave (pixel art rail structure above the road)

**Center-right: Flushing Meadows / Unisphere**
- Open green park area with trees around the edges
- The **Unisphere** as a prominent landmark in the center of the park — a large globe/sphere structure, pixel art style, metallic grey with visible continents
- Fountain pools around the Unisphere
- Paths radiating outward from the globe
- Label: **"UNISPHERE"**

**Lower-right: Queensbridge**
- Queensbridge Houses — grid of identical rectangular public housing buildings, beige/brown
- Label: **"QUEENSBRIDGE"**
- This area sits right next to the East River on the Queens side

### Center — East River

- Bright blue water running vertically, about 4–5 tiles wide
- **Queensboro Bridge (Ed Koch Bridge)** crossing horizontally from Queensbridge to Manhattan — pixel art steel bridge with distinctive double-deck structure, grey metal
- Label: **"QUEENSBORO BRIDGE"**

### Left side — Manhattan (roughly left 40% of map)

**Upper-left: Midtown East**
- Dense Manhattan grid — tall buildings with flat rooftops, glass/steel look
- Streets running in a strict grid: avenues vertical (2 tiles wide), streets horizontal (2 tiles wide)
- Yellow taxi sprites parked or on roads (small, 1-tile)

**Center-left: Midtown**
- Increasing building density and height toward the Empire State Building
- Chrysler Building as a smaller landmark along the way (art deco spire)
- Label: **"MIDTOWN"**

**Bottom-left: Empire State Building area**
- The **Empire State Building** as the largest structure on the map — tall art deco tower with antenna spire, grey limestone with warm lighting
- Small plaza/park area in front of it
- Label: **"EMPIRE STATE BUILDING"**
- This is the "destination" / end-game area, so make it visually prominent

### Edges
- **Top edge:** trees/park border (same style as world 1 forest edges)
- **Bottom edge:** more Manhattan streets fading into tree border
- **Left edge:** tree/building border
- **Right edge:** residential Queens fading into tree border

## Critical Rules

1. **ALL roads must be strictly horizontal or vertical** — no diagonal roads anywhere. Manhattan's grid and Queens' grid should both be orthogonal.
2. **Roads are 2 tiles wide** (120px) — this gives enough room for the player character to walk comfortably.
3. **No diagonal anything** — bridges cross horizontally, rail lines run horizontally or vertically, paths are orthogonal.
4. Buildings sit in rectangular blocks between the grid roads.
5. The East River can have natural/curved shorelines, but walkable paths along it should still be orthogonal.

## Color Palette Reference
- **Roads:** #6B6B6B to #8B8B8B (grey asphalt)
- **Grass/parks:** #4A8B3F to #6BAF5A (rich greens, same as world 1)
- **Water:** #3B7DD8 to #5B9DE8 (bright blue, same as world 1 river)
- **Buildings Manhattan:** #8B8B9B, #A0A0B0 (steel/glass grey), some brown/beige stone
- **Buildings Queens:** #B87333, #C4956A (brownstone), #D4A574 (brick)
- **Empire State:** #C0B8A8 (limestone), #D4CFC4 (highlights)
- **Bridge steel:** #707880, #8B9298
- **Trees:** #2D5A1E to #4A8B3F (dark to medium green canopy clusters)

## Landmark Sizes (approximate)
- Empire State Building: 4–5 tiles wide × 8–10 tiles tall (biggest thing on the map)
- Unisphere: 3 tiles diameter
- Queensboro Bridge: 2 tiles tall × spans the river width
- Chrysler Building: 2–3 tiles wide × 5–6 tiles tall
- Regular Manhattan buildings: 2–3 tiles wide × 2–3 tiles tall
- Queens row houses: 1–2 tiles wide × 1 tile tall

## Deliverable
- Single PNG file, **1792 × 2400 pixels**, RGBA
- Name it `world5_nyc.png`
