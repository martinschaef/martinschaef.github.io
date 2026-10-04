#!/usr/bin/env python3
"""Procedurally draw the World 6 office map (AWS NYC) and its collision JSON.

Layout (map pixels, 1600x1200): office interior on top (y < 880), a strip of
Midtown sidewalk + street at the bottom. Everything drawn here is also written
as blocked tiles so the collision stays in sync with the picture.
"""
import json, random, sys
COLLISION_ONLY = "--collision-only" in sys.argv   # keep a hand-made world6_bg.png, only rewrite the JSON
from PIL import Image, ImageDraw

W, H = 1600, 1200
B = 16
random.seed(6)
im = Image.new('RGB', (W, H), (40, 40, 48))
d = ImageDraw.Draw(im)
blocked = set()

def block(x0, y0, x1, y1):
    for ty in range(y0 // B, (y1 + B - 1) // B):
        for tx in range(x0 // B, (x1 + B - 1) // B):
            blocked.add((tx, ty))

def px_rect(x0, y0, x1, y1, fill, outline=None):
    d.rectangle([x0, y0, x1 - 1, y1 - 1], fill=fill, outline=outline)

# ── Street (bottom) ───────────────────────────────────────────
STREET_Y = 880
px_rect(0, STREET_Y, W, H, (78, 78, 82))                 # asphalt
for x in range(0, W, 64):                                  # lane dashes
    px_rect(x + 8, 1080, x + 40, 1086, (220, 200, 90))
px_rect(0, STREET_Y, W, STREET_Y + 110, (165, 160, 150))  # sidewalk
for x in range(0, W, 48):
    d.line([x, STREET_Y, x, STREET_Y + 110], fill=(140, 136, 128))
d.line([0, STREET_Y + 110, W, STREET_Y + 110], fill=(120, 118, 112), width=3)
# parked taxis
for x in (120, 1180):
    px_rect(x, 1010, x + 110, 1060, (240, 190, 30), (60, 50, 10))
    px_rect(x + 20, 1018, x + 90, 1052, (60, 70, 90))
    block(x, 1010, x + 110, 1060)
# hydrant, trash can, trees on sidewalk
for x in (300, 700, 1000, 1400):
    px_rect(x - 14, STREET_Y + 20, x + 14, STREET_Y + 48, (80, 60, 40))
    d.ellipse([x - 30, STREET_Y - 16, x + 30, STREET_Y + 40], fill=(40, 120, 50), outline=(20, 70, 30))
    block(x - 30, STREET_Y - 16, x + 30, STREET_Y + 40)
px_rect(520, STREET_Y + 60, 536, STREET_Y + 92, (200, 40, 40)); block(520, STREET_Y + 60, 536, STREET_Y + 92)
px_rect(1100, STREET_Y + 56, 1128, STREET_Y + 96, (90, 90, 100), (40, 40, 50)); block(1100, STREET_Y + 56, 1128, STREET_Y + 96)
# traffic + far side of street are off limits
block(0, STREET_Y + 110, W, H)

# ── Building shell ────────────────────────────────────────────
WALL = (92, 86, 104); WALL_DARK = (58, 54, 66)
CARPET = (70, 96, 120); CARPET2 = (64, 88, 112)
px_rect(0, 0, W, STREET_Y, WALL_DARK)
# facade along the sidewalk with windows
px_rect(0, STREET_Y - 40, W, STREET_Y, (120, 112, 128))
for x in range(24, W, 96):
    px_rect(x, STREET_Y - 32, x + 48, STREET_Y - 8, (150, 190, 230), (40, 40, 60))
block(0, STREET_Y - 40, W, STREET_Y)
# interior floor
IX0, IY0, IX1, IY1 = 48, 48, W - 48, STREET_Y - 40
for y in range(IY0, IY1, 32):
    for x in range(IX0, IX1, 32):
        px_rect(x, y, x + 32, y + 32, CARPET if (x // 32 + y // 32) % 2 == 0 else CARPET2)
# outer walls
block(0, 0, W, IY0); block(0, 0, IX0, STREET_Y); block(IX1, 0, W, STREET_Y)
px_rect(0, 0, W, IY0, WALL); px_rect(0, 0, IX0, STREET_Y, WALL); px_rect(IX1, 0, W, STREET_Y, WALL)
# lobby doorway in the facade (gap in blocked tiles): x 760..840
for ty in range((STREET_Y - 40) // B, STREET_Y // B + 1):
    for tx in range(760 // B, 840 // B):
        blocked.discard((tx, ty))
px_rect(760, STREET_Y - 40, 840, STREET_Y + 2, (120, 150, 170))
d.line([800, STREET_Y - 40, 800, STREET_Y], fill=(60, 80, 100), width=2)
px_rect(740, STREET_Y - 76, 860, STREET_Y - 46, (30, 30, 40))
d.text((760, STREET_Y - 70), 'aws', fill=(255, 153, 0))

# ── Furniture helpers ─────────────────────────────────────────
DESK = (120, 82, 50); DESK_EDGE = (70, 45, 25)
def desk(x, y, w=96, h=56, monitor=True, chair='below'):
    px_rect(x, y, x + w, y + h, DESK, DESK_EDGE)
    if monitor:
        px_rect(x + w // 2 - 18, y + 8, x + w // 2 + 18, y + 30, (30, 30, 36), (10, 10, 12))
        px_rect(x + w // 2 - 15, y + 11, x + w // 2 + 15, y + 27, random.choice([(60, 140, 220), (40, 200, 120), (230, 230, 230)]))
        px_rect(x + w // 2 - 4, y + 30, x + w // 2 + 4, y + 36, (60, 60, 70))
        px_rect(x + 12, y + 40, x + w - 12, y + 48, (200, 200, 210), (120, 120, 130))  # keyboard
    block(x, y, x + w, y + h)
    cy = y + h + 6 if chair == 'below' else y - 30
    px_rect(x + w // 2 - 14, cy, x + w // 2 + 14, cy + 24, (40, 40, 48), (20, 20, 24))

def plant(x, y):
    px_rect(x - 10, y + 10, x + 10, y + 26, (150, 90, 60), (90, 50, 30))
    d.ellipse([x - 18, y - 14, x + 18, y + 14], fill=(50, 150, 70), outline=(20, 90, 40))
    block(x - 18, y - 14, x + 18, y + 26)

def wall_h(x0, x1, y, t=12):
    px_rect(x0, y, x1, y + t, WALL, WALL_DARK); block(x0, y, x1, y + t)

def wall_v(x, y0, y1, t=12):
    px_rect(x, y0, x + t, y1, WALL, WALL_DARK); block(x, y0, x + t, y1)

def glass_v(x, y0, y1):
    px_rect(x, y0, x + 8, y1, (150, 200, 230), (90, 130, 160)); block(x, y0, x + 8, y1)

# ── Corner office (Byron), top-right ──────────────────────────
OX0, OY0 = 1180, IY0
wall_h(OX0, IX1, 300); wall_v(OX0, IY0, 100); glass_v(OX0, 100, 180); wall_v(OX0, 230, 300)
# gap at y 180..230 is the doorway (glass partition shown beside it)
for ty in range(180 // B, 230 // B + 1): blocked.discard((OX0 // B, ty))
px_rect(OX0 + 12, IY0, IX1, 300, (90, 110, 130))
desk(1330, 120, 140, 60, chair='above')
plant(1210, 270); plant(1520, 270)
px_rect(1200, IY0, 1500, IY0 + 10, (240, 240, 240), (120, 120, 120))  # whiteboard
d.text((1260, IY0 + 1), '∀x. proof(x) → ship(x)', fill=(40, 40, 160))

# ── Meeting room, top-left ────────────────────────────────────
MX1 = 420
wall_v(MX1, IY0, 200); wall_v(MX1, 260, 330); wall_h(IX0, MX1 + 12, 330)
for ty in range(200 // B, 260 // B + 1): blocked.discard((MX1 // B, ty))
px_rect(IX0, IY0, MX1, 330, (96, 104, 124))
px_rect(120, 120, 340, 220, (150, 110, 70), (90, 60, 35)); block(120, 120, 340, 220)   # table
for x in (140, 200, 260, 300):
    px_rect(x, 92, x + 26, 112, (40, 40, 48)); px_rect(x, 228, x + 26, 248, (40, 40, 48))
px_rect(IX0 + 10, IY0 + 8, 380, IY0 + 60, (245, 245, 245), (120, 120, 120))          # whiteboard
d.text((70, IY0 + 14), 'TODO: fix prod   ∅ sorry', fill=(200, 30, 30))
d.text((70, IY0 + 36), 'Dokimos → Aletheia → CDA', fill=(30, 30, 160))
block(IX0, IY0, 380, IY0 + 60)

# ── Kitchen, bottom-left ──────────────────────────────────────
wall_h(IX0, 400, 560); wall_v(400, 560, 640); wall_v(400, 720, IY1)
for ty in range(640 // B, 720 // B + 1): blocked.discard((400 // B, ty))
px_rect(IX0, 572, 400, IY1, (200, 196, 180))
px_rect(IX0, 580, 400, 640, (230, 230, 235), (150, 150, 160)); block(IX0, 580, 400, 640)   # counter
px_rect(90, 586, 130, 630, (60, 60, 70), (30, 30, 40)); d.text((96, 598), 'cafe', fill=(255, 200, 80))  # coffee machine
px_rect(200, 586, 260, 630, (180, 190, 200), (110, 120, 130))                             # sink
px_rect(IX0 + 10, 700, IX0 + 80, 800, (235, 235, 240), (140, 140, 150)); block(IX0 + 10, 700, IX0 + 80, 800)  # fridge
px_rect(180, 720, 300, 790, (150, 110, 70), (90, 60, 35)); block(180, 720, 300, 790)      # kitchen table

# ── Open-plan desks (two rows of pods) ────────────────────────
for row, y in enumerate((400, 620)):
    for i in range(4):
        x = 520 + i * 180
        desk(x, y, chair='below' if row == 1 else 'above')
plant(480, 360); plant(1140, 360); plant(480, 820); plant(1140, 820)
# lounge sofa near the window
px_rect(1250, 740, 1500, 790, (160, 60, 70), (90, 30, 40)); block(1250, 740, 1500, 790)
px_rect(1300, 660, 1450, 700, (120, 82, 50), (70, 45, 25)); block(1300, 660, 1450, 700)   # coffee table

# ── Export ────────────────────────────────────────────────────
if not COLLISION_ONLY:
    im.save('assets/tilemaps/world6_bg.png', optimize=True)
col = {
    'world_width': W, 'world_height': H, 'block_size': B, 'tile_size': 60, 'display_scale': 1.2,
    'water_rects': [], 'border_rects': [],
    'blocked_tiles': sorted([list(t) for t in blocked]),
    'player_spawn': {'x': 800, 'y': STREET_Y + 30},
    'npcs': [
        {'id': 'byron3', 'x': 1400, 'y': 215},
        {'id': 'willem2', 'x': 970, 'y': 540},
        {'id': 'numair', 'x': 230, 'y': 680},
        {'id': 'emmi2', 'x': 1180, 'y': 500},
    ],
    'doors': [{'x': 800, 'y': STREET_Y + 100, 'w': 80, 'h': 20, 'target': 'World5_NYC', 'label': '← Back to the streets'}],
    'enemies': [], 'items': [],
    'signs': [
        {'x': 800, 'y': STREET_Y - 100, 'text': 'AWS · JFK14'},
        {'x': 235, 'y': 350, 'text': 'MEETING ROOM "SORRY"'},
        {'x': 200, 'y': 560, 'text': 'KITCHEN'},
        {'x': 1390, 'y': 316, 'text': "BYRON'S OFFICE"},
    ],
    'harmless_enemies': True,
}
json.dump(col, open('assets/tilemaps/world6_collision.json', 'w'), separators=(',', ':'))
print('blocked', len(blocked))
