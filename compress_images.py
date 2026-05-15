#!/usr/bin/env python3
"""
Run once from the repo root to compress all referenced images:

    python compress_images.py

- Resizes everything to max 1920px on longest side
- JPEG quality 82 (visually lossless, ~80% smaller files)
- Converts PNGs to JPGs, updates content.js paths automatically
- Skips files already under 150KB
- Prints a summary of space saved

Requirements: Pillow  →  pip install Pillow
"""
import os, re, sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    sys.exit("Run:  pip install Pillow  then re-run this script.")

MAX_DIM  = 1920
QUALITY  = 82
BASE     = Path(__file__).parent
CJS      = BASE / "content.js"

cjs_text = CJS.read_text(encoding="utf-8")
refs     = sorted(set(re.findall(r'"(images/[^"]+)"', cjs_text)))
print(f"Found {len(refs)} referenced image paths. Compressing...\n")

total_saved = 0
renames     = {}

for ref in refs:
    full = BASE / ref
    if not full.exists():
        print(f"  MISSING  {ref}")
        continue

    orig = full.stat().st_size
    if orig < 150_000:          # already small — skip
        continue

    ext = full.suffix.lower().lstrip(".")

    try:
        img = Image.open(full)

        # Flatten to RGB
        if img.mode in ("RGBA", "P", "LA"):
            bg = Image.new("RGB", img.size, (255, 255, 255))
            if img.mode == "RGBA":
                bg.paste(img, mask=img.split()[3])
            else:
                bg.paste(img.convert("RGBA"), mask=img.convert("RGBA").split()[3])
            img = bg
        elif img.mode != "RGB":
            img = img.convert("RGB")

        # Resize
        w, h = img.size
        if max(w, h) > MAX_DIM:
            r = MAX_DIM / max(w, h)
            img = img.resize((int(w * r), int(h * r)), Image.LANCZOS)

        if ext == "png":
            out      = full.with_suffix(".jpg")
            new_ref  = ref[:-4] + ".jpg"
            img.save(out, "JPEG", quality=QUALITY, optimize=True)
            full.unlink()
            renames[ref] = new_ref
            saved = orig - out.stat().st_size
            print(f"  PNG→JPG  {full.name}  {orig//1024}KB → {out.stat().st_size//1024}KB  (-{saved//1024}KB)")
        else:
            img.save(full, "JPEG", quality=QUALITY, optimize=True)
            saved = orig - full.stat().st_size
            print(f"  JPEG     {full.name}  {orig//1024}KB → {full.stat().st_size//1024}KB  (-{saved//1024}KB)")

        total_saved += saved

    except Exception as e:
        print(f"  ERROR    {ref}: {e}")

# Patch content.js for any PNG→JPG renames
if renames:
    updated = cjs_text
    for old, new in renames.items():
        updated = updated.replace(f'"{old}"', f'"{new}"')
    CJS.write_text(updated, encoding="utf-8")
    print(f"\n  Updated content.js with {len(renames)} path renames.")

print(f"\n✓  Done. Space saved: {total_saved / 1_048_576:.1f} MB")
print(   "   Now run:  git add -A && git commit -m 'Compress images' && git push")
