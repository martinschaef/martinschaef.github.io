#!/usr/bin/env python3
"""Add a frontal walk cycle to a 4-frame idle NPC sheet, for wandering NPCs.

Usage: python3 tools/build_npc_walk.py <src_sprite> <dst_sprite> <frameWidth>
  e.g. python3 tools/build_npc_walk.py tancrede tancrede2 85

Reads assets/sprites/<src>.png (4 idle frames, 188 px tall) and writes
assets/sprites/<dst>.png with 8 frames: 0-3 idle, 4-7 walk (left leg up,
bob, right leg up, bob). Same puppet technique as build_walk_cycle.py.
Register the result in data/sprites.json with "wander": true and
animations idle {start 0, count 4} / walk {start 4, count 4}.
"""
import sys
import numpy as np
from PIL import Image

LIFT, BOB = 10, 2


def hip_row(f):
    w = (f[..., 3] > 0).sum(1)
    top = int(np.argmax(w > 0))
    torso = w[top + int(0.35 * (len(w) - top)):int(0.7 * len(w))].max()
    for y in range(int(0.55 * len(w)), len(w)):
        if 0 < w[y] < 0.7 * torso:
            return y
    return int(0.72 * len(w))


def shift(L, dy):
    out = np.zeros_like(L)
    if dy >= 0: out[dy:] = L[:len(L) - dy]
    else: out[:dy] = L[-dy:]
    return out


def comp(*layers):
    out = np.zeros_like(layers[0])
    for L in layers:
        m = L[..., 3] > 0
        out[m] = L[m]
    return out


def lift(leg, px):
    ys, xs = np.where(leg[..., 3] > 0)
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    crop = Image.fromarray(leg[y0:y1 + 1, x0:x1 + 1]).resize((x1 - x0 + 1, max(1, y1 - y0 + 1 - px)), Image.NEAREST)
    out = np.zeros_like(leg)
    c = np.array(crop)
    out[y0:y0 + c.shape[0], x0:x1 + 1] = c
    return out


def walk(f):
    hip = hip_row(f)
    body = f.copy(); body[hip:] = 0
    legs = f.copy(); legs[:hip] = 0
    xs = np.where(legs[..., 3] > 0)[1]
    cx = (xs.min() + xs.max()) // 2
    L = legs.copy(); L[:, cx:] = 0
    R = legs.copy(); R[:, :cx] = 0
    a = comp(R, lift(L, LIFT), shift(body, 1))
    c = comp(L, lift(R, LIFT), shift(body, 1))
    b = shift(f, -BOB)
    return [a, b, c, b.copy()], hip


def main():
    src, dst, fw = sys.argv[1], sys.argv[2], int(sys.argv[3])
    sheet = np.array(Image.open(f'assets/sprites/{src}.png').convert('RGBA'))
    fh = sheet.shape[0]
    idle = [sheet[:, i * fw:(i + 1) * fw] for i in range(4)]
    frames, hip = walk(idle[0])
    out = np.concatenate(idle + frames, axis=1)
    Image.fromarray(out).save(f'assets/sprites/{dst}.png', optimize=True)
    print(f'{dst}.png: 8 frames of {fw}x{fh}, hip at y={hip}')


if __name__ == '__main__':
    main()
