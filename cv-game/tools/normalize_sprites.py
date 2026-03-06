#!/usr/bin/env python3
"""Normalize NPC spritesheets: anchor all frames to bottom-center, fix width alignment."""
import sys, os, json
from PIL import Image
import numpy as np

SPRITES_DIR = 'assets/sprites'
KNOWN = {
    'doris': 76, 'father': 76, 'wolfgang': 177, 'monika': 75,
    'christine': 77, 'valentin': 69, 'tobert': 93, 'ben': 81,
    'podelski': 76, 'podelski_dog': 145, 'byron': 60, 'byron2': 57, 'dejan': 80,
    'evren': 115, 'john': 72, 'stephan': 82, 'zhiming': 71,
    'lauren': 103, 'willem': 116
}

def get_content_bbox(alpha):
    """Return (top, bottom, left, right) of non-transparent content, or None."""
    rows = np.any(alpha > 0, axis=1)
    cols = np.any(alpha > 0, axis=0)
    if not np.any(rows): return None
    return (np.argmax(rows), len(rows) - np.argmax(rows[::-1]),
            np.argmax(cols), len(cols) - np.argmax(cols[::-1]))

def normalize_sprite(name, fw):
    path = os.path.join(SPRITES_DIR, f'{name}.png')
    if not os.path.exists(path): return
    
    img = Image.open(path).convert('RGBA')
    arr = np.array(img)
    w, h = img.size
    nframes = w // fw  # ignore remainder
    
    # Extract frames and find content bounds
    frames = []
    max_content_h = 0
    max_content_w = 0
    for i in range(nframes):
        frame = arr[:, i*fw:(i+1)*fw]
        bbox = get_content_bbox(frame[:,:,3])
        if bbox is None:
            frames.append((frame, None))
            continue
        top, bot, left, right = bbox
        content = frame[top:bot, left:right]
        max_content_h = max(max_content_h, bot - top)
        max_content_w = max(max_content_w, right - left)
        frames.append((content, bbox))
    
    if max_content_h == 0: return
    
    # Frame size: content width padded to even, full height
    new_fw = max(fw, max_content_w)
    # Make sure it's at least as wide as original fw
    new_h = h  # keep original height
    
    # Build new sheet: anchor each frame to bottom-center
    new_w = new_fw * nframes
    out = np.zeros((new_h, new_w, 4), dtype=np.uint8)
    
    for i, (content, bbox) in enumerate(frames):
        if bbox is None: continue
        ch, cw = content.shape[:2]
        # Bottom-center anchor
        x_off = (new_fw - cw) // 2
        y_off = new_h - ch  # anchor to bottom
        out[y_off:y_off+ch, i*new_fw+x_off:i*new_fw+x_off+cw] = content
    
    result = Image.fromarray(out)
    
    # Check if anything changed
    old_arr = np.array(img)
    if out.shape == old_arr.shape and np.array_equal(out, old_arr):
        print(f"  {name}: already clean")
        return False
    
    # Backup and save
    backup = os.path.join(SPRITES_DIR, f'{name}_prenorm.png')
    if not os.path.exists(backup):
        img.save(backup)
    result.save(path)
    
    changed_fw = new_fw != fw
    print(f"  {name}: {w}x{h} -> {new_w}x{new_h}, fw {fw}->{new_fw}, {nframes} frames" + 
          (" [frameWidth CHANGED]" if changed_fw else ""))
    return changed_fw

if __name__ == '__main__':
    names = sys.argv[1:] if len(sys.argv) > 1 else sorted(KNOWN.keys())
    fw_changes = {}
    for name in names:
        if name not in KNOWN:
            print(f"  {name}: unknown sprite, skipping")
            continue
        result = normalize_sprite(name, KNOWN[name])
        if result:  # frameWidth changed
            fw_changes[name] = True
    
    if fw_changes:
        print(f"\n⚠️  frameWidth changed for: {', '.join(fw_changes.keys())}")
        print("   Update knownSprites in BaseScene.js and sprites.json!")
