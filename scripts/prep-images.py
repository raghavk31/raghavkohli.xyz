"""
prep-images.py — turn a curated pick folder into web-ready project images.

    python scripts/prep-images.py <slug> [--grid]

Reads   images/_picks/<slug>/NN-*.{jpg,jpeg,png,tif,tiff}   (NN = two-digit order; 00 = thumb)
Writes  src/assets/projects/<slug>/NN.jpg                    (long edge <= 1800px, thumb <= 1200px)
Prints  a ready-to-paste YAML block for the page's frontmatter.

Optional size hint in the filename: 03-lg-name.jpg -> size: lg (lg | md | sm | xs | tall).
Add "natural" after the size (03-lg-natural-name.jpg) -> fit: natural (never cropped).
Add "resolve" after that (06-lg-natural-resolve-name.jpg) -> also writes NN-r.jpg, long edge
<= 1280px, for a viewer that prefetches many images (state of cities) — emitted as resolve:.
Without a hint, size is suggested from the aspect ratio.

--grid  composites every non-thumb pick into one contact-grid image (for tile sets like
        the eight generative-techniques typologies) and emits it as a single lg item.

Never touches images/. Re-running overwrites src/assets/projects/<slug>/.
"""
import argparse
import math
import re
import shutil
import sys
from pathlib import Path

from PIL import Image, ImageOps

Image.MAX_IMAGE_PIXELS = None  # the water-urbanism scans are 14k px wide

ROOT = Path(__file__).resolve().parent.parent
PICKS = ROOT / "images" / "_picks"
OUT = ROOT / "src" / "assets" / "projects"

MAX_EDGE = 1800
THUMB_EDGE = 1200
RESOLVE_EDGE = 1024  # the viewer is never wider than 966px
RESOLVE_QUALITY = 72  # fifteen of these are prefetched at once; keep the set near 1.5 MB
QUALITY = 82
SIZES = ("lg", "md", "sm", "xs", "tall")
EXTS = {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".webp"}
NAME_RE = re.compile(r"^(\d{2})(?:-(lg|md|sm|xs|tall))?(?:-(natural))?(?:-(resolve))?(?:-.*)?$", re.I)


def suggest_size(w, h):
    r = w / h
    if r < 0.9:
        return "tall"
    if r < 1.15:
        return "sm"
    if r < 1.5:
        return "md"
    return "lg"


def load(path):
    im = Image.open(path)
    im = ImageOps.exif_transpose(im)
    if im.mode in ("RGBA", "LA", "P"):
        bg = Image.new("RGB", im.size, (255, 255, 255))
        bg.paste(im.convert("RGBA"), mask=im.convert("RGBA").split()[-1])
        im = bg
    return im.convert("RGB")


def shrink(im, max_edge):
    w, h = im.size
    scale = max_edge / max(w, h)
    if scale < 1:
        im = im.resize((round(w * scale), round(h * scale)), Image.LANCZOS)
    return im


def save(im, dest, quality=QUALITY):
    im.save(dest, "JPEG", quality=quality, optimize=True, progressive=True)
    return dest.stat().st_size


def make_grid(images, cols=None, gap=24):
    """Tile images (already RGB) into one grid with a white ground."""
    n = len(images)
    cols = cols or math.ceil(math.sqrt(n))
    rows = math.ceil(n / cols)
    cw = max(i.size[0] for i in images)
    ch = max(i.size[1] for i in images)
    grid = Image.new("RGB", (cols * cw + (cols - 1) * gap, rows * ch + (rows - 1) * gap), (255, 255, 255))
    for k, im in enumerate(images):
        x = (k % cols) * (cw + gap) + (cw - im.size[0]) // 2
        y = (k // cols) * (ch + gap) + (ch - im.size[1]) // 2
        grid.paste(im, (x, y))
    return grid


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("--grid", action="store_true", help="composite 01.. into one grid image")
    ap.add_argument("--cols", type=int, default=None, help="grid columns (with --grid)")
    args = ap.parse_args()

    src = PICKS / args.slug
    if not src.is_dir():
        sys.exit(f"no pick folder: {src}")
    files = sorted(p for p in src.iterdir() if p.suffix.lower() in EXTS)
    picks = []
    for p in files:
        m = NAME_RE.match(p.stem)
        if not m:
            print(f"  skip (no NN- prefix): {p.name}")
            continue
        picks.append((m.group(1), (m.group(2) or "").lower(), bool(m.group(3)), bool(m.group(4)), p))
    if not picks:
        sys.exit("nothing to do — files need a two-digit prefix, e.g. 01-map.jpg")

    dest = OUT / args.slug
    if dest.exists():
        shutil.rmtree(dest)
    dest.mkdir(parents=True)

    thumb = None
    items = []
    grid_src = []
    for n, hint, natural, resolve, p in picks:
        im = load(p)
        if n == "00":
            im = shrink(im, THUMB_EDGE)
            kb = save(im, dest / "00.jpg") // 1024
            thumb = (f"/assets/projects/{args.slug}/00.jpg", im.size[0], im.size[1])
            print(f"  00.jpg  {im.size[0]}x{im.size[1]}  {kb}K  thumb  <- {p.name}")
            continue
        if args.grid:
            grid_src.append(shrink(im, 900))
            continue
        full = shrink(im, MAX_EDGE)
        kb = save(full, dest / f"{n}.jpg") // 1024
        size = hint or suggest_size(*full.size)
        items.append((n, size, natural, resolve, full.size[0], full.size[1]))
        print(f"  {n}.jpg  {full.size[0]}x{full.size[1]}  {kb}K  {size:4}{' natural' if natural else ''}  <- {p.name}")
        if resolve:
            r = shrink(im, RESOLVE_EDGE)
            rkb = save(r, dest / f"{n}-r.jpg", RESOLVE_QUALITY) // 1024
            print(f"  {n}-r.jpg  {r.size[0]}x{r.size[1]}  {rkb}K  resolve")

    if args.grid and grid_src:
        im = shrink(make_grid(grid_src, args.cols), MAX_EDGE)
        kb = save(im, dest / "01.jpg") // 1024
        items.append(("01", "lg", True, False, im.size[0], im.size[1]))
        print(f"  01.jpg  {im.size[0]}x{im.size[1]}  {kb}K  lg    <- grid of {len(grid_src)}")

    print("\n# --- paste into frontmatter ---")
    if thumb:
        print(f"thumb: {thumb[0]}")
        print(f"thumbw: {thumb[1]}")
        print(f"thumbh: {thumb[2]}")
    print("gallery:")
    for n, size, natural, resolve, w, h in items:
        fit = ", fit: natural" if natural else ""
        res = f", resolve: /assets/projects/{args.slug}/{n}-r.jpg" if resolve else ""
        print(f'  - {{ src: /assets/projects/{args.slug}/{n}.jpg, w: {w}, h: {h}, size: {size}{fit}{res}, fig: fig.{n}, cap: "" }}')
    print("# w/h let the browser reserve space before the image loads (no layout jump) and size strips.")
    print("# Chapter pages: move items into `open:` / `chapters[].plates` / `chapters[].strip.items` — see docs/plans/2026-09-13-project-page.md")


if __name__ == "__main__":
    main()
