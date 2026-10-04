#!/usr/bin/env python3
"""Build pixel-art decade portraits for the title screen montage.

Reads face boxes exported from Photos (see /tmp/cq/martin_faces.txt format:
uuid|year|facesize|quality|yaw|smile|cx|cy|nfaces|favorite; cy is bottom-origin),
crops head-and-shoulders, downsamples to a coarse pixel grid, quantizes to a
small palette, and writes assets/title/portrait_<year>.png at 4x nearest-neighbour.
"""
import os, sys
from PIL import Image, ImageOps, ImageEnhance

D = os.path.expanduser('~/Pictures/Photos Library.photoslibrary/resources/derivatives')
FACES = '/tmp/cq/martin_faces.txt'
OUT = 'assets/title'
PIX_W, PIX_H = 96, 120       # coarse grid (portrait)
UP = 4                       # nearest-neighbour upscale → 384x480
COLORS = 20

PICKS = [  # (uuid, label)
 ('F43D2CE6-B8A7-496C-8DE7-7A058EC93B9D', '1994'),
 ('392FA723-108D-474D-BFD3-2B85357213C5', '1998'),
 ('D20D7479-9B5D-46D5-91EE-F4171DA0E191', '2006'),
 ('DBA56F4E-10C1-46E4-9B75-678A20932404', '2011'),
 ('40BE9C8C-3202-444F-B671-56BACD839AF1', '2018'),
 ('6B1D3B65-B1E9-4764-8C30-00D6CF03B74B', '2025'),
]

faces = {}
for l in open(FACES):
    p = l.strip().split('|')
    faces[p[0]] = dict(year=int(p[1]), size=float(p[2]), cx=float(p[6]), cy=1 - float(p[7]))

def stylize(im, f):
    W, H = im.size
    fx, fy, r = f['cx'] * W, f['cy'] * H, f['size'] * max(W, H) / 2
    # crop: 2.6 face-widths wide, face at ~40% height, portrait aspect
    cw = r * 2 * 2.6; ch = cw * PIX_H / PIX_W
    x0, y0 = fx - cw / 2, fy - ch * 0.42
    # clamp inside image, shrink if needed
    if cw > W or ch > H:
        s = min(W / cw, H / ch); cw *= s; ch *= s; x0, y0 = fx - cw / 2, fy - ch * 0.42
    x0 = min(max(0, x0), W - cw); y0 = min(max(0, y0), H - ch)
    c = im.crop((int(x0), int(y0), int(x0 + cw), int(y0 + ch)))
    c = ImageEnhance.Contrast(c).enhance(1.25)
    c = ImageEnhance.Color(c).enhance(1.3)
    small = c.resize((PIX_W, PIX_H), Image.LANCZOS)
    q = small.quantize(colors=COLORS, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
    return q.resize((PIX_W * UP, PIX_H * UP), Image.NEAREST)

def main():
    os.makedirs(OUT, exist_ok=True)
    names = []
    for uuid, label in PICKS:
        f = faces[uuid]
        im = ImageOps.exif_transpose(Image.open(f'{D}/{uuid[0]}/{uuid}_1_105_c.jpeg')).convert('RGB')
        out = stylize(im, f)
        name = f'{OUT}/portrait_{label}.png'
        out.save(name, optimize=True); names.append(name)
        print(name, os.path.getsize(name))
    # contact sheet for review
    sheet = Image.new('RGB', (PIX_W * UP * len(names) // 2, PIX_H * UP * 2))
    for i, n in enumerate(names):
        sheet.paste(Image.open(n), ((i % 4) * PIX_W * UP, (i // 4) * PIX_H * UP))
    sheet.save('/tmp/cq/portraits_sheet.png')

if __name__ == '__main__':
    main()
