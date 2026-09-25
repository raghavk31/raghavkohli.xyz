"""
prep-covers.py — the rotating covers behind each homepage card.

    python scripts/prep-covers.py <slug> [<slug> ...]      (no args = every slug in COVERS)

For each pick in COVERS[slug] it reads src/assets/projects/<slug>/NN.jpg and writes two files:
  cK.jpg    a square (SQUARE px) for the hover strip under the card
  cK-f.jpg  the same region cover-cropped to the card's frame ratio (--car in index.njk),
            long edge FRAME px — what the frame crossfades to (main.js initCovers)
and prints the `covers:` YAML block for the project's frontmatter.

A pick is "NN", "NN:hint", or either with "@x,y,w,h" appended. Hints: l / r cut a two-page spread
to that page first (the CRCAP spreads are two A4 portraits, ratio 1.41 — the same ratio as a single
landscape drawing, so the cut is never guessed); a — the more colourful half; t / b bias a portrait
source toward its top or bottom. Otherwise the whole image is cover-cropped about its centre.

"@x,y,w,h" (fractions of the page, after any l/r cut) takes a window of it before the cover crop:
a report map sits in the middle of an A4 with its legend in one corner and its title in another,
so without a window the card frames the legend. Example: "17:r@0.03,0.04,0.94,0.70".
Never touches images/.
"""
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "assets" / "projects"
SQUARE = 400
FRAME = 1200
QUALITY = 80

# slug: (frame ratio w/h — the card's --car: landscape = the thumb's own ratio, near-square = 1, portrait = 0.8 (4:5, contained) — , picks)
COVERS = {
    "ahmedabad-crcap":       (0.8, ["17:r@0,.02,1,.74", "13:r@0,.02,1,.74", "09:r@0,.02,1,.74", "30:l@0,.02,1,.74", "12:a@0,.02,1,.74"]),
    "vadodara-crcap":        (1.616, ["02:r@.06,.19,.88,.40", "10:l@.06,.19,.88,.40", "10:r@.06,.19,.88,.40",
                                  "23:r@.06,.19,.88,.40", "16:r@.06,.19,.88,.40"]),   # a landscape card on portrait
                                  # map pages: the window fills the frame with the city rather than floating it in margin
    "surat-crcap":           (0.8, ["12:l@0,.02,1,.74", "26:r@0,.02,1,.74", "02:r@0,.02,1,.74", "13:r@0,.02,1,.74"]),
    "state-of-cities":       (1.896, ["02", "06:l", "21", "23"]),
    "living-heritage":       (1.0,   ["03", "05", "07", "09", "12"]),
    "rebel-bodies":          (1.354, ["03", "06", "08", "11", "20"]),
    "one-is-to-one":         (1.0, ["04", "06", "12", "14"]),
    "water-urbanism":        (1.474, ["22", "24", "27", "28", "15"]),
    "generative-techniques": (1.415, ["05", "08", "15", "19:l", "25"]),
    "eco-machine":           (1.778, ["04", "08", "12", "14", "16"]),
    "utopias":               (1.5,   ["03", "10", "14", "17", "19"]),
    "pune-metro":            (1.83,  ["02", "07", "09", "12", "17"]),
    "koliwadas":             (0.8, ["01", "07:r", "11", "24"]),
    "urban-greening":        (0.8, ["05:r", "04:r", "24", "25:l"]),
    "urban-performances":    (1.0,   ["04", "06", "07", "09"]),
    "majuli":                (1.362, ["02", "03", "04", "06"]),
    "gcap":                  (0.8, ["02", "03", "04", "05", "13"]),
}


def saturation(im):
    return sum(im.convert("HSV").resize((64, 64)).split()[1].tobytes())


def page_of(im, hint):
    """l / r → that half of a spread; a → the more colourful half; anything else → the whole image."""
    if hint not in ("l", "r", "a"):
        return im
    w, h = im.size
    left, right = im.crop((0, 0, w // 2, h)), im.crop((w - w // 2, 0, w, h))
    if hint == "l":
        return left
    if hint == "r":
        return right
    return left if saturation(left) >= saturation(right) else right


def window(im, box):
    """The part of the page the card should show: x,y,w,h as fractions, clamped to the image."""
    if not box:
        return im
    x, y, w, h = (float(v) for v in box.split(","))
    W, H = im.size
    l, t = max(0, round(x * W)), max(0, round(y * H))
    r, b = min(W, round((x + w) * W)), min(H, round((y + h) * H))
    if r - l < 8 or b - t < 8:
        sys.exit(f"  window {box} leaves nothing to crop")
    return im.crop((l, t, r, b))


def cover(im, ratio, bias):
    """Centre cover-crop to ratio; bias t/b keeps the top or bottom of a source taller than the crop."""
    w, h = im.size
    if w / h > ratio:
        cw, ch = int(round(h * ratio)), h
        x0, y0 = (w - cw) // 2, 0
    else:
        cw, ch = w, int(round(w / ratio))
        x0 = 0
        y0 = 0 if bias == "t" else (h - ch) if bias == "b" else (h - ch) // 2
    return im.crop((x0, y0, x0 + cw, y0 + ch))


def fit(im, long_edge):
    im = im.copy()
    im.thumbnail((long_edge, long_edge), Image.LANCZOS)
    return im


def run(slug):
    ratio, picks = COVERS[slug]
    d = OUT / slug
    rows = []
    for k, pick in enumerate(picks, 1):
        spec, _, box = pick.partition("@")
        nn, _, hint = spec.partition(":")
        src = d / f"{nn}.jpg"
        im = Image.open(src).convert("RGB")
        page = window(page_of(im, hint), box)
        bias = hint if hint in ("t", "b") else ""
        sq = fit(cover(page, 1.0, bias), SQUARE)
        fr = fit(cover(page, ratio, bias), FRAME)
        sq.save(d / f"c{k}.jpg", quality=QUALITY, optimize=True)
        fr.save(d / f"c{k}-f.jpg", quality=QUALITY, optimize=True)
        print(f"  c{k}  {sq.size[0]}x{sq.size[1]} + frame {fr.size[0]}x{fr.size[1]}  <- {nn}.jpg{(' ' + hint) if hint else ''}{(' @' + box) if box else ''}")
        rows.append(f"  - {{ t: /assets/projects/{slug}/c{k}.jpg, f: /assets/projects/{slug}/c{k}-f.jpg, w: {fr.size[0]}, h: {fr.size[1]} }}")
    print(f"\n# --- {slug}: paste into frontmatter ---\ncovers:\n" + "\n".join(rows) + "\n")


def main():
    slugs = sys.argv[1:] or list(COVERS)
    for s in slugs:
        if s not in COVERS:
            sys.exit(f"no covers configured for {s} — add it to COVERS in {Path(__file__).name}")
        print(f"\n{s}")
        run(s)


if __name__ == "__main__":
    main()
