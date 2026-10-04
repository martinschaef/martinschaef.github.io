#!/usr/bin/env python3
"""Generate an NPC sprite with Amazon Bedrock (Stable Image Ultra) and turn it into a
game-ready idle sheet matching the existing cast (188 px tall frames, 4 idle frames).

Usage:
  python3 tools/gen_sprite.py <name> "<character description>" [--n 3] [--pick K]
                              [--base <sprite>:<frameWidth>] [--strength 0.75]
    --base  image-to-image from an existing cast sprite (SD 3.5 Large) so the result keeps
            the game's proportions, outline, and palette; pick a base with the right build
    --n     number of candidates to generate (default 3), saved to /tmp/cq/gen/<name>_<i>.png
    --pick  skip generation and convert candidate K into assets/sprites/<name>.png

Requires AWS credentials with bedrock:InvokeModel on stability.stable-image-ultra-v1:1
in us-west-2. Each candidate costs roughly $0.14.
"""
import argparse, base64, io, json, os, subprocess, tempfile
import numpy as np
from PIL import Image

STYLE = ("Detailed pixel art character sprite of a modern-day adult man in contemporary "
         "everyday clothes, retro 16-bit video game style, full body from head to shoes, standing "
         "upright, facing the viewer, arms relaxed at his sides, centered, plain pure white "
         "background. Slightly large head on an adult body, normal human ears, crisp dark pixel "
         "outlines, flat cel shading, limited palette, visible square pixels. The man: ")
NEG = ("blurry, photo, photorealistic, 3d render, smooth gradient shading, text, watermark, "
       "multiple people, cropped feet, cropped head, background scenery, ground shadow, "
       "elf ears, pointed ears, fantasy costume, tunic, green hat, child, teenager, armor, weapon")
GEN_DIR = '/tmp/cq/gen'
FRAME_H = 188
FIG_H = 176          # figure height inside the frame (existing cast fills ~94%)
COLORS = 28


def base_canvas(base):
    """Upscale frame 0 of an existing sprite onto a white 1024x1024 canvas."""
    sprite, fw = base.split(':'); fw = int(fw)
    f = Image.open(f'assets/sprites/{sprite}.png').convert('RGBA').crop((0, 0, fw, FRAME_H))
    k = 5
    big = f.resize((fw * k, FRAME_H * k), Image.NEAREST)
    can = Image.new('RGB', (1024, 1024), (255, 255, 255))
    can.paste(big, ((1024 - big.width) // 2, (1024 - big.height) // 2), big)
    buf = io.BytesIO(); can.save(buf, 'PNG')
    return base64.b64encode(buf.getvalue()).decode()


def generate(name, desc, n, base=None, strength=0.75, neg='', seed0=1000):
    os.makedirs(GEN_DIR, exist_ok=True)
    init = base_canvas(base) if base else None
    for i in range(n):
        if init:
            model = 'stability.sd3-5-large-v1:0'
            body = {"prompt": "pixel art RPG character sprite, exactly the same art style, outline, "
                              "proportions and pose as the input image, plain white background. "
                              "The man: " + desc,
                    "negative_prompt": NEG + (", " + neg if neg else ""), "mode": "image-to-image", "image": init,
                    "strength": strength, "output_format": "png", "seed": seed0 + i * 7919}
        else:
            model = 'stability.stable-image-ultra-v1:1'
            body = {"prompt": STYLE + desc, "negative_prompt": NEG + (", " + neg if neg else ""), "aspect_ratio": "2:3",
                    "output_format": "png", "seed": seed0 + i * 7919}
        with tempfile.TemporaryDirectory() as td:
            req, out = os.path.join(td, 'req.json'), os.path.join(td, 'out.json')
            json.dump(body, open(req, 'w'))
            subprocess.run(['aws', 'bedrock-runtime', 'invoke-model', '--region', 'us-west-2',
                            '--model-id', model,
                            '--body', f'fileb://{req}', '--cli-binary-format', 'raw-in-base64-out', out],
                           check=True, capture_output=True)
            d = json.load(open(out))
        p = f'{GEN_DIR}/{name}_{i}.png'
        open(p, 'wb').write(base64.b64decode(d['images'][0]))
        print('wrote', p)
    # contact sheet for review
    ims = [Image.open(f'{GEN_DIR}/{name}_{i}.png').convert('RGB') for i in range(n)]
    sheet = Image.new('RGB', (sum(im.width // 3 for im in ims), max(im.height for im in ims) // 3), 'white')
    x = 0
    for im in ims:
        sheet.paste(im.resize((im.width // 3, im.height // 3)), (x, 0)); x += im.width // 3
    sheet.save(f'{GEN_DIR}/{name}_candidates.png')
    print('review', f'{GEN_DIR}/{name}_candidates.png')


def remove_white_bg(im):
    """Flood-fill near-white from the borders to transparent."""
    a = np.array(im.convert('RGBA'))
    h, w = a.shape[:2]
    rgb = a[:, :, :3].astype(int)
    bg = (rgb.min(axis=2) > 225) & (rgb.max(axis=2) - rgb.min(axis=2) < 25)
    seen = np.zeros((h, w), bool)
    stack = [(y, x) for x in range(w) for y in (0, h - 1)] + [(y, x) for y in range(h) for x in (0, w - 1)]
    while stack:
        y, x = stack.pop()
        if 0 <= y < h and 0 <= x < w and not seen[y, x] and bg[y, x]:
            seen[y, x] = True
            stack += [(y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)]
    a[seen, 3] = 0
    # Enclosed background pockets (e.g. between the legs): large near-white components
    from collections import deque
    lab = np.zeros((h, w), np.int32); cur = 0
    for y0, x0 in zip(*np.nonzero(bg & ~seen)):
        if lab[y0, x0]: continue
        cur += 1; comp = [(y0, x0)]; lab[y0, x0] = cur; q = deque(comp)
        while q:
            y, x = q.popleft()
            for ny, nx in ((y+1, x), (y-1, x), (y, x+1), (y, x-1)):
                if 0 <= ny < h and 0 <= nx < w and bg[ny, nx] and not seen[ny, nx] and not lab[ny, nx]:
                    lab[ny, nx] = cur; comp.append((ny, nx)); q.append((ny, nx))
        if len(comp) > 400:
            ys, xs = zip(*comp); a[ys, xs, 3] = 0
    # Ground shadow: peel light, desaturated, bluish pixels inward from the transparent
    # background in the bottom rows. Outlined interiors (white sneakers) are never reached.
    alpha = a[:, :, 3] > 0
    rows = np.nonzero(alpha.any(axis=1))[0]
    if len(rows):
        y_cut = rows[-1] - int((rows[-1] - rows[0]) * 0.08)
        mx, mn = rgb.max(axis=2), rgb.min(axis=2)
        cand = (mx > 130) & ((mx - mn) < 70) & (rgb[:, :, 2] >= rgb[:, :, 0])
        cand[:y_cut] = False
        q = deque((y, x) for y, x in zip(*np.nonzero(cand))
                  if any(0 <= y + dy < h and 0 <= x + dx < w and a[y + dy, x + dx, 3] == 0
                         for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1))))
        while q:
            y, x = q.popleft()
            if a[y, x, 3] == 0: continue
            a[y, x, 3] = 0
            for ny, nx in ((y+1, x), (y-1, x), (y, x+1), (y, x-1)):
                if 0 <= ny < h and 0 <= nx < w and cand[ny, nx] and a[ny, nx, 3]:
                    q.append((ny, nx))
    return Image.fromarray(a)


def to_sprite(src):
    im = remove_white_bg(Image.open(src))
    im = im.crop(im.getbbox())
    scale = FIG_H / im.height
    small = im.resize((max(1, round(im.width * scale)), FIG_H), Image.LANCZOS)
    alpha = np.array(small)[:, :, 3] > 110
    rgb = small.convert('RGB').quantize(colors=COLORS, method=Image.Quantize.MEDIANCUT,
                                         dither=Image.Dither.NONE).convert('RGB')
    a = np.dstack([np.array(rgb), np.where(alpha, 255, 0).astype(np.uint8)])
    # 1 px black outline around the silhouette
    pad = np.zeros((a.shape[0] + 2, a.shape[1] + 2, 4), np.uint8)
    pad[1:-1, 1:-1] = a
    m = pad[:, :, 3] > 0
    ring = (np.roll(m, 1, 0) | np.roll(m, -1, 0) | np.roll(m, 1, 1) | np.roll(m, -1, 1)) & ~m
    pad[ring] = (16, 12, 20, 255)
    return Image.fromarray(pad)


def idle_sheet(fig):
    """4 idle frames: neutral, 1px breathe (torso), neutral, blink-free shift."""
    fw = fig.width + 6
    frames = []
    for dy in (0, 1, 0, 0):
        f = Image.new('RGBA', (fw, FRAME_H), (0, 0, 0, 0))
        y0 = FRAME_H - fig.height - 2
        if dy:
            # breathe: upper body down 1px, legs untouched
            split = int(fig.height * 0.55)
            f.alpha_composite(fig.crop((0, split, fig.width, fig.height)), (3, y0 + split))
            f.alpha_composite(fig.crop((0, 0, fig.width, split)), (3, y0 + dy))
        else:
            f.alpha_composite(fig, (3, y0))
        frames.append(f)
    sheet = Image.new('RGBA', (fw * 4, FRAME_H), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        sheet.alpha_composite(f, (i * fw, 0))
    return sheet, fw


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('name'); ap.add_argument('desc', nargs='?', default='')
    ap.add_argument('--n', type=int, default=3); ap.add_argument('--pick', type=int)
    ap.add_argument('--base'); ap.add_argument('--strength', type=float, default=0.75)
    ap.add_argument('--neg', default='', help='extra negative prompt terms for this character')
    ap.add_argument('--seed0', type=int, default=1000)
    args = ap.parse_args()
    if args.pick is None:
        generate(args.name, args.desc, args.n, args.base, args.strength, args.neg, args.seed0)
        return
    fig = to_sprite(f'{GEN_DIR}/{args.name}_{args.pick}.png')
    sheet, fw = idle_sheet(fig)
    out = f'assets/sprites/{args.name}.png'
    sheet.save(out, optimize=True)
    print(out, sheet.size, 'frameWidth', fw)


if __name__ == '__main__':
    main()
