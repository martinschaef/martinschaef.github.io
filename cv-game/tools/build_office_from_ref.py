#!/usr/bin/env python3
"""Build the World 6 office (AWS Midtown) from a painted reference image.

Usage: python3 tools/build_office_from_ref.py [tools/ref/office_ref.jpeg] [--debug out.png]

The reference is a 1024x559 mock screenshot with a HUD strip on top. We crop
the HUD, clean JPEG noise, upscale x2 (NEAREST) into world6_bg.png and derive
collision automatically: a 16 px block is walkable when most of its pixels are
low-saturation floor grey. CARVE/BLOCK rects (native reference pixels, after
the crop) fix doorways and furniture the colour test gets wrong.
"""
import json, sys
from collections import deque
import numpy as np
from PIL import Image, ImageFilter

SRC = next((a for a in sys.argv[1:] if not a.startswith('--') and not a.endswith('.png')),
           'tools/ref/office_ref.jpeg')
DEBUG = sys.argv[sys.argv.index('--debug') + 1] if '--debug' in sys.argv else None
CROP_TOP = 40          # HUD strip in the reference
UP = 2                 # reference px -> bg px
B = 16                 # collision block (bg px)
N = B // UP            # block size in reference px

# Native reference coordinates (after the crop): x0, y0, x1, y1
CARVE = [
    (180, 128, 240, 140),   # floor in front of the HQ exit door
]
BLOCK = [
    (0, 0, 1024, 6),        # top wall
    (0, 0, 112, 330),       # street, taxis and sidewalk outside the facade
    (770, 0, 1015, 64),     # management office back wall (slogans)
]

im = Image.open(SRC).convert('RGB')
im = im.crop((0, CROP_TOP, im.width, im.height))
a = np.asarray(im).copy()
a[0:6, 330:430] = a[8, 330:430]          # wipe leftover HUD text ("HEART ITEMS")
im = Image.fromarray(a).filter(ImageFilter.MedianFilter(3))
im = im.quantize(colors=64, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
c = np.asarray(im).astype(int)
H, W = c.shape[:2]

mx, mn, lum = c.max(2), c.min(2), c.mean(2)
floor = ((mx - mn) < 24) & (lum > 62) & (lum < 200)
gh, gw = H // N, W // N
walk = floor[:gh * N, :gw * N].reshape(gh, N, gw, N).mean((1, 3)) > 0.72

def rect(r, val):
    x0, y0, x1, y1 = r
    walk[max(0, y0 // N):min(gh, -(-y1 // N)), max(0, x0 // N):min(gw, -(-x1 // N))] = val
for r in BLOCK: rect(r, False)
for r in CARVE: rect(r, True)
walk[0, :] = walk[-1, :] = False
walk[:, 0] = walk[:, -1] = False

def bg(x, y): return {'x': x * UP, 'y': y * UP}
spawn = bg(209, 165)
npcs = [
    {'id': 'byron3',  **bg(893, 135)},   # management office, in front of his desk
    {'id': 'willem2', **bg(300, 300)},   # open floor by "Ownership"
    {'id': 'numair',  **bg(390, 140)},   # kitchen
    {'id': 'emmi2',   **bg(905, 330)},   # standing desk, right side
    {'id': 'tancrede2', **bg(330, 420)}, # wanders the open floor
]
door = {**bg(209, 134), 'w': 100, 'h': 16, 'target': 'World5_NYC', 'label': '← Back to the streets',
        'spawn': {'x': 423, 'y': 720}}

# Reachability check (block grid, 4-neighbour flood fill from the spawn)
def cell(p): return (p['y'] // B, p['x'] // B)
seen = np.zeros_like(walk); q = deque([cell(spawn)]); seen[cell(spawn)] = True
while q:
    y, x = q.popleft()
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        ny, nx = y + dy, x + dx
        if 0 <= ny < gh and 0 <= nx < gw and walk[ny, nx] and not seen[ny, nx]:
            seen[ny, nx] = True; q.append((ny, nx))
def near(p, r=3):
    y, x = cell(p)
    return bool(seen[max(0, y - r):y + r + 1, max(0, x - r):x + r + 1].any())
ok = {n['id']: near(n) for n in npcs}; ok['door'] = near(door, 1); ok['spawn_walkable'] = bool(walk[cell(spawn)])
print('reachable:', ok)
print('unreachable walkable blocks (now blocked):', int((walk & ~seen).sum()))
walk &= seen     # islands would otherwise attract paper pickups

Image.fromarray(np.asarray(im)).resize((W * UP, H * UP), Image.NEAREST).save(
    'assets/tilemaps/world6_bg.png', optimize=True)
col = {
    'world_width': W * UP, 'world_height': gh * B, 'block_size': B, 'tile_size': 60, 'display_scale': 1.0,
    'water_rects': [], 'border_rects': [],
    'blocked_tiles': [[x, y] for y in range(gh) for x in range(gw) if not walk[y, x]],
    'player_spawn': spawn, 'npcs': npcs, 'doors': [door],
    'enemies': [], 'items': [], 'signs': [], 'harmless_enemies': True,
}
json.dump(col, open('assets/tilemaps/world6_collision.json', 'w'), separators=(',', ':'))
print('size', W * UP, gh * B, 'blocked', len(col['blocked_tiles']))

if DEBUG:
    ov = np.asarray(im.convert('RGBA')).copy()
    for y in range(gh):
        for x in range(gw):
            sl = ov[y * N:(y + 1) * N, x * N:(x + 1) * N]
            if not walk[y, x]: sl[..., 0] = np.minimum(255, sl[..., 0] // 2 + 128)
            elif seen[y, x]: sl[..., 1] = np.minimum(255, sl[..., 1] // 2 + 100)
    o = Image.fromarray(ov)
    from PIL import ImageDraw
    d = ImageDraw.Draw(o)
    for p in npcs + [spawn, door]:
        x, y = p['x'] // UP, p['y'] // UP; d.ellipse([x - 4, y - 4, x + 4, y + 4], outline=(255, 255, 0), width=2)
    o.resize((W * 2, H * 2), Image.NEAREST).save(DEBUG)
