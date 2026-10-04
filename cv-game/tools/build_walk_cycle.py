#!/usr/bin/env python3
"""
Rebuild Martin's walk cycles from his idle frames.

The AI-generated walk frames were stretched per-frame to a uniform cell and
contain almost no leg motion, so the walk looked like a vibrating shuffle.
This script keeps the four idle frames (row 0) and synthesises a clean
4-frame cycle per direction with classic 16-bit "puppet" animation:

  * frontal views (south/north): alternate lifting the left/right leg
    (leg segment shifted up and foreshortened), with a 2px body bob
  * side view (east, flipped for west): split the legs into front/back
    halves and swing them apart for the contact frames

Layout stays 8 cols x 4 rows of 112x183 so existing frame indices work:
  row 0: idle   0:south 1:west 2:north 3:east
  row 1: walk south  frames 8-11
  row 2: walk north  frames 16-19
  row 3: walk east   frames 24-27  (flipX for west)

Usage: python3 tools/build_walk_cycle.py [--preview]
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image

SRC = Path('assets/sprites/martin.png')
FW, FH, COLS, ROWS = 112, 183, 8, 4
LIFT = 8        # px a stepping leg is raised (frontal)
STRIDE = 5      # px each leg moves forward/back (side)
BOB = 2         # px body bob on passing frames


def alpha_bbox(a):
    ys, xs = np.where(a[..., 3] > 0)
    return ys.min(), ys.max(), xs.min(), xs.max()


def find_hip_row(frame):
    """First row (from the top) where the trouser colour dominates: legs start here."""
    for y in range(90, FH):
        row = frame[y]
        op = row[:, 3] > 0
        if op.sum() < 10:
            continue
        rgb = row[op][:, :3].astype(int)
        blue = ((rgb[:, 2] > rgb[:, 0] + 30) & (rgb[:, 2] > rgb[:, 1])).mean()
        if blue < 0.2:
            return y
    return int(FH * 0.72)


def shift(layer, dx=0, dy=0):
    out = np.zeros_like(layer)
    h, w = layer.shape[:2]
    ys, yd = (slice(0, h - dy), slice(dy, h)) if dy >= 0 else (slice(-dy, h), slice(0, h + dy))
    xs, xd = (slice(0, w - dx), slice(dx, w)) if dx >= 0 else (slice(-dx, w), slice(0, w + dx))
    out[yd, xd] = layer[ys, xs]
    return out


def composite(*layers):
    out = np.zeros_like(layers[0])
    for L in layers:
        m = L[..., 3] > 0
        out[m] = L[m]
    return out


def split_legs(frame, hip):
    """Return (body, left_leg, right_leg) layers. Legs split at the centre column of the leg mass."""
    body = frame.copy(); body[hip:] = 0
    legs = frame.copy(); legs[:hip] = 0
    ys, xs = np.where(legs[..., 3] > 0)
    cx = int(round((xs.min() + xs.max()) / 2))
    left = legs.copy(); left[:, cx:] = 0
    right = legs.copy(); right[:, :cx] = 0
    return body, left, right, cx


def lift_leg(leg, hip, px):
    """Raise a leg: move it up and squash it slightly so the foot lifts off the ground."""
    ys, xs = np.where(leg[..., 3] > 0)
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    crop = Image.fromarray(leg[y0:y1 + 1, x0:x1 + 1])
    new_h = max(1, (y1 - y0 + 1) - px)
    crop = crop.resize((x1 - x0 + 1, new_h), Image.NEAREST)
    out = np.zeros_like(leg)
    out[y0:y0 + new_h, x0:x1 + 1] = np.array(crop)
    return out


def shear_leg(leg, hip, px):
    """Swing a leg from the hip: rows further from the hip shift more (0 at hip, px at the foot)."""
    out = np.zeros_like(leg)
    h = leg.shape[0]
    for y in range(hip, h):
        dx = int(round(px * (y - hip) / max(1, h - 1 - hip)))
        out[y] = shift(leg[y:y + 1], dx=dx)[0]
    return out


def frontal_cycle(frame):
    hip = find_hip_row(frame)
    body, L, R, _ = split_legs(frame, hip)
    # contact frames: one leg lifted, body drops 1px (overlaps the hip, no seam)
    f_a = composite(R, lift_leg(L, hip, LIFT), shift(body, dy=1))
    f_c = composite(L, lift_leg(R, hip, LIFT), shift(body, dy=1))
    # passing frames: whole sprite bobs up
    f_b = shift(frame, dy=-BOB)
    return [f_a, f_b, f_c, f_b.copy()]


def side_cycle(frame):
    hip = find_hip_row(frame)
    body, back, front, _ = split_legs(frame, hip)
    # contact: legs swing apart from the hip, body drops 1px
    f_a = composite(shear_leg(back, hip, -STRIDE), shear_leg(front, hip, STRIDE), shift(body, dy=1))
    # contact mirrored: the legs cross (far leg passes the near leg)
    f_c = composite(shear_leg(front, hip, -STRIDE), shear_leg(back, hip, STRIDE), shift(body, dy=1))
    # passing: whole sprite bobs up
    f_b = shift(frame, dy=-BOB)
    return [f_a, f_b, f_c, f_b.copy()]


def main():
    preview = '--preview' in sys.argv
    sheet = np.array(Image.open(SRC).convert('RGBA'))
    idle = [sheet[0:FH, c * FW:(c + 1) * FW].copy() for c in range(4)]  # south, west, north, east
    south, west, north, east = idle

    out = np.zeros((ROWS * FH, COLS * FW, 4), dtype=np.uint8)
    for c, f in enumerate(idle):
        out[0:FH, c * FW:(c + 1) * FW] = f
    rows = [frontal_cycle(south), frontal_cycle(north), side_cycle(east)]
    for r, frames in enumerate(rows, start=1):
        for c, f in enumerate(frames):
            out[r * FH:(r + 1) * FH, c * FW:(c + 1) * FW] = f

    if preview:
        Path('/tmp/cq').mkdir(exist_ok=True)
        Image.fromarray(out).save('/tmp/cq/martin_new_sheet.png')
        strip = out[FH:, :4 * FW]
        Image.fromarray(strip).resize((4 * FW * 2, 3 * FH * 2), Image.NEAREST).save('/tmp/cq/martin_walk_preview.png')
        print('preview written to /tmp/cq/martin_walk_preview.png')
        return
    Image.fromarray(out).save(SRC)
    print(f'wrote {SRC} ({out.shape[1]}x{out.shape[0]})')


if __name__ == '__main__':
    main()
