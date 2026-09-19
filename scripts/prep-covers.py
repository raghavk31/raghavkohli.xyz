"""
prep-covers.py — the rotating covers behind each homepage card.

    python scripts/prep-covers.py <slug> [<slug> ...]      (no args = every slug in COVERS)

For each pick in COVERS[slug] it reads src/assets/projects/<slug>/NN.jpg and writes two files:
  cK.jpg    a square (SQUARE px) for the hover strip under the card
  cK-f.jpg  the same region cover-cropped to the card's frame ratio (--car in index.njk),
            long edge FRAME px — what the frame crossfades to (main.js initCovers)
and prints the `covers:` YAML block for the project's frontmatter.

A pick is "NN" or "NN:hint". Hints: l / r cut a two-page spread to that page first (the CRCAP
spreads are two A4 portraits, ratio 1.41 — the same ratio as a single landscape drawing, so the
cut is never guessed); a — the more colourful half; t / b bias a portrait source toward its top
or bottom. Otherwise the whole image is cover-cropped about its centre. Never touches images/.
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
    "ahmedabad-crcap":       (0.8, ["17:r", "13:r", "09:r", "30:l", "54:l"]),
    "vadodara-crcap":        (1.616, ["02:r", "10:l", "10:r", "23:r", "36:l"]),
    "surat-crcap":           (0.8, ["12:l", "26:l", "02:r", "13:r"]),
    "state-of-cities":       (1.896, ["02", "06:l", "21", "23"]),
    "living-heritage":       (1.0,   ["03", "05", "07", "09", "12"]),
    "rebel-bodies":          (1.354, ["03", "06", "08", "11", "20"]),
    "one-is-to-one":         (1.0, ["04", "06", "12", "14"]),
    "water-urbanism":        (1.474, ["03", "09", "13", "18", "21"]),
    "generative-techniques": (1.415, ["05", "08", "15", "19:l", "25"]),
    "eco-machine":           (1.778, ["04", "08", "12", "14", "16"]),
    "utopias":               (1.5,   ["03", "10", "14", "17", "19"]),
    "pune-metro":            (1.613, ["03", "06", "08", "14", "16"]),
    "koliwadas":             (0.8, ["01", "07:r", "11", "24"]),
    "urban-greening":        (0.8, ["03:r", "04:r", "09:l", "25:l"]),
    "urban-performances":    (1.0,   ["04", "06", "07", "09"]),
    "majuli":                (1.362, ["02", "03", "04", "06"]),
    "gcap":                  (0.8, ["07:l", "13", "22", "33", "41"]),
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
        nn, _, hint = pick.partition(":")
        src = d / f"{nn}.jpg"
        im = Image.open(src).convert("RGB")
        page = page_of(im, hint)
        bias = hint if hint in ("t", "b") else ""
        sq = fit(cover(page, 1.0, bias), SQUARE)
        fr = fit(cover(page, ratio, bias), FRAME)
        sq.save(d / f"c{k}.jpg", quality=QUALITY, optimize=True)
        fr.save(d / f"c{k}-f.jpg", quality=QUALITY, optimize=True)
        print(f"  c{k}  {sq.size[0]}x{sq.size[1]} + frame {fr.size[0]}x{fr.size[1]}  <- {nn}.jpg{(' ' + hint) if hint else ''}")
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
