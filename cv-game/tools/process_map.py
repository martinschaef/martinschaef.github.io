#!/usr/bin/env python3
"""
Map Processing Pipeline for Career Quest.

Usage:
    python3 tools/process_map.py <input_image> <output_name> [--scale 0.5]

Example:
    python3 tools/process_map.py assets/saarbrücken-map.png world1 --scale 0.5

Outputs:
    assets/tilemaps/<output_name>_bg.png        — scaled background image
    assets/tilemaps/<output_name>_collision.json — collision data (water, borders)
    /tmp/<output_name>_collision_preview.png     — debug visualization
"""

import argparse, json, sys
from pathlib import Path
from PIL import Image
import numpy as np

def detect_water(rgb, block_size=32):
    """Detect water pixels: blue channel dominant."""
    return (rgb[:,:,2] > rgb[:,:,0] + 15) & (rgb[:,:,2] > rgb[:,:,1]) & (rgb[:,:,2] > 80)

def build_collision_rects(mask, block_size, scale):
    """Convert a boolean mask into collision rectangles at game scale."""
    h, w = mask.shape
    rects = []
    for by in range(h // block_size):
        for bx in range(w // block_size):
            block = mask[by*block_size:(by+1)*block_size, bx*block_size:(bx+1)*block_size]
            if np.mean(block) > 0.5:
                rects.append({
                    'x': int(bx * block_size * scale),
                    'y': int(by * block_size * scale),
                    'w': int(block_size * scale),
                    'h': int(block_size * scale)
                })
    return rects

def process_map(input_path, output_name, scale=0.5):
    img = Image.open(input_path).convert('RGBA')
    arr = np.array(img)
    h, w = arr.shape[:2]
    rgb = arr[:,:,:3].astype(np.int16)

    game_w, game_h = int(w * scale), int(h * scale)
    print(f'Input: {w}x{h} → Game world: {game_w}x{game_h} (scale {scale})')

    # Save scaled background
    out_dir = Path('assets/tilemaps')
    out_dir.mkdir(parents=True, exist_ok=True)

    scaled = img.resize((game_w, game_h), Image.LANCZOS)
    bg_path = out_dir / f'{output_name}_bg.png'
    scaled.save(bg_path)
    print(f'Saved {bg_path}')

    # Detect water collision
    water_mask = detect_water(rgb)
    water_rects = build_collision_rects(water_mask, 32, scale)

    # Border collision
    border = 8
    border_rects = [
        {'x': 0, 'y': 0, 'w': game_w, 'h': border},
        {'x': 0, 'y': game_h - border, 'w': game_w, 'h': border},
        {'x': 0, 'y': 0, 'w': border, 'h': game_h},
        {'x': game_w - border, 'y': 0, 'w': border, 'h': game_h},
    ]

    # Save collision JSON
    collision_data = {
        'world_width': game_w,
        'world_height': game_h,
        'scale': scale,
        'block_size': int(32 * scale),
        'water_rects': water_rects,
        'border_rects': border_rects,
    }
    col_path = out_dir / f'{output_name}_collision.json'
    with open(col_path, 'w') as f:
        json.dump(collision_data, f)
    print(f'Saved {col_path} ({len(water_rects)} water, {len(border_rects)} border)')

    # Debug visualization
    vis = np.array(scaled.convert('RGBA'))
    for rect in water_rects:
        x, y, rw, rh = rect['x'], rect['y'], rect['w'], rect['h']
        vis[y:y+rh, x:x+rw, 0] = np.minimum(vis[y:y+rh, x:x+rw, 0].astype(int) + 100, 255).astype(np.uint8)
        vis[y:y+rh, x:x+rw, 2] = vis[y:y+rh, x:x+rw, 2] // 2
    preview_path = f'/tmp/{output_name}_collision_preview.png'
    Image.fromarray(vis).save(preview_path)
    print(f'Saved {preview_path}')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Process map image for Career Quest')
    parser.add_argument('input', help='Input map image path')
    parser.add_argument('output_name', help='Output name prefix (e.g., world1)')
    parser.add_argument('--scale', type=float, default=0.5, help='Scale factor (default: 0.5)')
    args = parser.parse_args()
    process_map(args.input, args.output_name, args.scale)
