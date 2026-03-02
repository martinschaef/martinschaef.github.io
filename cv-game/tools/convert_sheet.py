#!/usr/bin/env python3
"""
Convert AI-generated sprite sheets to game-ready Phaser 3 spritesheets.
Removes checkerboard background, extracts frames, assembles uniform grid.

Usage:
    python3 tools/convert_sheet.py assets/sprites/sheets/wolfgang_sheet.png
    python3 tools/convert_sheet.py assets/sprites/sheets/*.png
"""

import argparse
from pathlib import Path
from PIL import Image
import numpy as np

def detect_bg_colors(arr):
    """Detect the two checkerboard colors from top rows (guaranteed background)."""
    # Use top 3 rows — always pure checkerboard
    top = arr[:3, :, :3].reshape(-1, 3).astype(float)
    brightness = top.mean(axis=1)
    median_b = np.median(brightness)
    
    light = top[brightness >= median_b].mean(axis=0).astype(int)
    dark = top[brightness < median_b].mean(axis=0).astype(int)
    
    # If they're too close, also check bottom rows
    if np.abs(light - dark).max() < 15:
        h = arr.shape[0]
        bot = arr[h-3:h, :, :3].reshape(-1, 3).astype(float)
        all_bg = np.vstack([top, bot])
        brightness = all_bg.mean(axis=1)
        median_b = np.median(brightness)
        light = all_bg[brightness >= median_b].mean(axis=0).astype(int)
        dark = all_bg[brightness < median_b].mean(axis=0).astype(int)
    
    return light, dark

def remove_background(arr, tol=35):
    """Remove checkerboard by flood-filling from edges."""
    c1, c2 = detect_bg_colors(arr)
    h, w = arr.shape[:2]
    result = arr.copy()
    rgb = arr[:,:,:3].astype(int)
    
    # Per-pixel: close to either bg color
    d1 = np.abs(rgb - c1).max(axis=2)
    d2 = np.abs(rgb - c2).max(axis=2)
    bg_candidate = (d1 <= tol) | (d2 <= tol)
    
    # Flood fill from all edge pixels that are bg-colored
    from collections import deque
    bg_mask = np.zeros((h, w), dtype=bool)
    queue = deque()
    
    # Seed from all 4 edges
    for x in range(w):
        if bg_candidate[0, x]: queue.append((0, x)); bg_mask[0, x] = True
        if bg_candidate[h-1, x]: queue.append((h-1, x)); bg_mask[h-1, x] = True
    for y in range(h):
        if bg_candidate[y, 0]: queue.append((y, 0)); bg_mask[y, 0] = True
        if bg_candidate[y, w-1]: queue.append((y, w-1)); bg_mask[y, w-1] = True
    
    # BFS flood fill
    while queue:
        cy, cx = queue.popleft()
        for dy, dx in [(-1,0),(1,0),(0,-1),(0,1)]:
            ny, nx = cy+dy, cx+dx
            if 0 <= ny < h and 0 <= nx < w and not bg_mask[ny, nx] and bg_candidate[ny, nx]:
                bg_mask[ny, nx] = True
                queue.append((ny, nx))
    
    result[bg_mask, 3] = 0
    return result

def find_bands(content_1d, min_content=0.02, merge_gap=15):
    """Find contiguous bands of content."""
    bands = []
    in_band = False
    for i, v in enumerate(content_1d):
        if v > min_content and not in_band:
            start = i; in_band = True
        elif v <= min_content and in_band:
            bands.append((start, i)); in_band = False
    if in_band:
        bands.append((start, len(content_1d)))
    # Merge close bands
    merged = []
    for b in bands:
        if merged and b[0] - merged[-1][1] < merge_gap:
            merged[-1] = (merged[-1][0], b[1])
        else:
            merged.append(b)
    return merged

def extract_frames(arr):
    """Find and extract individual character frames."""
    content = arr[:,:,3] > 0
    
    # Find row bands
    row_content = content.mean(axis=1)
    row_bands = find_bands(row_content, min_content=0.01, merge_gap=20)
    
    frames = []
    for ry1, ry2 in row_bands:
        col_content = content[ry1:ry2, :].mean(axis=0)
        col_bands = find_bands(col_content, min_content=0.005, merge_gap=8)
        
        for cx1, cx2 in col_bands:
            frame = arr[ry1:ry2, cx1:cx2]
            a = frame[:,:,3]
            rows = np.any(a > 0, axis=1)
            cols = np.any(a > 0, axis=0)
            if rows.any() and cols.any():
                r1, r2 = np.where(rows)[0][[0,-1]]
                c1, c2 = np.where(cols)[0][[0,-1]]
                cropped = frame[r1:r2+1, c1:c2+1]
                # Skip tiny fragments (< 20px in either dimension)
                if cropped.shape[0] > 20 and cropped.shape[1] > 20:
                    frames.append(cropped)
    return frames

def assemble_sheet(frames, cols=None):
    """Pad frames to uniform size and assemble into a grid."""
    if not frames:
        return None
    max_h = max(f.shape[0] for f in frames)
    max_w = max(f.shape[1] for f in frames)
    n = len(frames)
    if cols is None:
        cols = n
    rows = (n + cols - 1) // cols
    
    sheet = np.zeros((rows * max_h, cols * max_w, 4), dtype=np.uint8)
    for i, frame in enumerate(frames):
        r, c = divmod(i, cols)
        fh, fw = frame.shape[:2]
        oy = max_h - fh  # bottom-align (feet on ground)
        ox = (max_w - fw) // 2  # center horizontally
        sheet[r*max_h + oy : r*max_h + oy + fh,
              c*max_w + ox : c*max_w + ox + fw] = frame
    
    return sheet, max_w, max_h

def convert_sheet(input_path, cols=None):
    img = Image.open(input_path).convert('RGBA')
    arr = np.array(img)
    print(f'Input: {input_path} ({img.size[0]}x{img.size[1]})')
    
    c1, c2 = detect_bg_colors(arr)
    print(f'BG colors: light={c1}, dark={c2}')
    
    clean = remove_background(arr)
    bg_removed = (clean[:,:,3] == 0).mean()
    print(f'Background removed: {bg_removed:.1%}')
    
    frames = extract_frames(clean)
    print(f'Found {len(frames)} frames')
    
    if not frames:
        print('ERROR: No frames found!'); return
    
    # Filter out frames that are wildly different sizes (likely noise)
    areas = [f.shape[0] * f.shape[1] for f in frames]
    median_area = np.median(areas)
    frames = [f for f, a in zip(frames, areas) if a > median_area * 0.2]
    print(f'After size filter: {len(frames)} frames')
    
    sheet, fw, fh = assemble_sheet(frames, cols)
    
    name = Path(input_path).stem.replace('_sheet', '')
    out_path = Path(input_path).parent.parent / f'{name}.png'
    Image.fromarray(sheet).save(out_path)
    
    n = len(frames)
    actual_cols = cols or n
    actual_rows = (n + actual_cols - 1) // actual_cols
    print(f'Output: {out_path} ({sheet.shape[1]}x{sheet.shape[0]})')
    print(f'Frames: {n} ({actual_cols}x{actual_rows}), each {fw}x{fh}')
    return out_path

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Convert sprite sheets')
    parser.add_argument('inputs', nargs='+', help='Input sheet PNG(s)')
    parser.add_argument('--cols', type=int, default=None, help='Columns in output grid')
    args = parser.parse_args()
    for path in args.inputs:
        convert_sheet(path, args.cols)
        print()
