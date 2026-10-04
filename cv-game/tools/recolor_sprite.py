#!/usr/bin/env python3
"""Derive a new NPC sprite from an existing game-ready sheet by region-limited recoloring.

Usage: python3 tools/recolor_sprite.py <base> <out> <frameWidth> <nframes> <op> [<op> ...]
  op = hue:y0-y1:h0-h1:newhue[,vmax]  rotate pixels whose hue is in [h0,h1] (0-360) to newhue, rows y0..y1, optionally only if value<=vmax
  op = dark:y0-y1:vmin-vmax:r,g,b   tint low-saturation pixels with value in [vmin,vmax] toward r,g,b
  op = shade:y0-y1:h0-h1:factor,sat   multiply value by factor and set saturation for pixels with hue in [h0,h1]
"""
import sys, colorsys
from PIL import Image

def main():
    base, out, fw, n = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
    ops = sys.argv[5:]
    im = Image.open(base).convert('RGBA').crop((0, 0, fw * n, 188))
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a < 20: continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            for op in ops:
                kind, rows, rng, tgt = op.split(':')
                y0, y1 = map(int, rows.split('-'))
                if not (y0 <= y <= y1): continue
                lo, hi = map(float, rng.split('-'))
                if kind == 'hue':
                    if s < 0.25 or v < 0.15: continue
                    nh, *vmax = tgt.split(',')
                    if vmax and v * 255 > float(vmax[0]): continue
                    hd = h * 360
                    if lo <= hd <= hi:
                        r2, g2, b2 = colorsys.hsv_to_rgb(float(nh) / 360, min(1, s * 1.1), v)
                        r, g, b = int(r2 * 255), int(g2 * 255), int(b2 * 255)
                elif kind == 'shade':
                    if s < 0.2 or v < 0.15: continue
                    hd = h * 360
                    if lo <= hd <= hi:
                        f, ns = map(float, tgt.split(','))
                        r2, g2, b2 = colorsys.hsv_to_rgb(h, ns, min(1, v * f))
                        r, g, b = int(r2 * 255), int(g2 * 255), int(b2 * 255)
                elif kind == 'dark':
                    if s > 0.35: continue
                    if lo <= v * 255 <= hi:
                        tr, tg, tb = map(int, tgt.split(','))
                        k = v * 255 / hi
                        r, g, b = int(tr * k + r * (1 - k) * 0.3), int(tg * k + g * (1 - k) * 0.3), int(tb * k + b * (1 - k) * 0.3)
            px[x, y] = (r, g, b, a)
    im.save(out, optimize=True)
    print(out, im.size)

if __name__ == '__main__':
    main()
