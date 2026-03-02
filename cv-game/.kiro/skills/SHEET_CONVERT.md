# Skill: Sprite Sheet Conversion

## Purpose
Convert AI-generated character sprite sheets into game-ready Phaser 3 spritesheets by removing the checkerboard background, extracting individual frames, and assembling them into a uniform grid.

## Input
- Source sheets in `assets/sprites/sheets/<name>_sheet.png`
- These have a **checkerboard gray background** (two alternating gray block colors, ~32px blocks)
- Characters are arranged in rows of poses (idle variations, front-facing)

## Output
- Game-ready spritesheet at `assets/sprites/<name>.png`
- Transparent background (RGBA)
- Uniform frame size, padded to the largest frame dimensions
- Single row or grid of frames

## Conversion Steps

### 1. Auto-detect checkerboard colors
- Sample pixels at (0,0) and (32,0) — these are the two alternating block colors
- Both are gray tones that vary per sheet (range ~80-190)

### 2. Remove background
- For every pixel, compute max channel difference from each checkerboard color
- If within tolerance (30) of either color, set alpha to 0
- This handles the noisy/slightly-varying checkerboard

### 3. Find content frames
- Project the content mask vertically to find row bands (>2% content)
- Merge bands that are close together (<10px gap) into rows
- Within each row, project horizontally to find frame columns
- Merge close columns into individual frames

### 4. Extract and normalize
- Crop each frame to its content bounding box
- Pad all frames to the maximum frame dimensions (uniform size)
- Center each character within the padded frame

### 5. Assemble spritesheet
- Lay out frames in a grid (configurable columns, default=max frames per row)
- Save as PNG with transparency

## Tool
```
python3 tools/convert_sheet.py assets/sprites/sheets/<name>_sheet.png [--cols N]
```
Output: `assets/sprites/<name>.png`

## Game Integration
```javascript
// In preload():
this.load.spritesheet('wolfgang', 'assets/sprites/wolfgang.png', {
    frameWidth: <W>, frameHeight: <H>
});
// Frame 0 is the default idle pose
```

## Notes
- The checkerboard block size varies but is typically ~32px
- Tolerance of 30 handles the noisy AI-generated backgrounds well
- Some sheets have multiple rows (e.g., father has 2×4, tobert has 2×2)
- Podelski's sheet includes dogs — these get extracted as separate frames
- The martin_big_sheet has a different layout (labeled animation groups) and needs manual extraction — this skill handles the simpler NPC sheets
