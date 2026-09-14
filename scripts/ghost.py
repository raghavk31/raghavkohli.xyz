"""
ghost.py — average a set of same-template spreads into one "ghost" image.

    python scripts/ghost.py <out.jpg> <spread1> <spread2> ...   [--strength 0.5]

Pixel mean of every input, then a deterministic levels stretch (2nd–98th percentile of the
luminance histogram mapped to the full range, blended back at --strength) so the averaged
image does not go grey; a full stretch (1.0) makes colour spreads garish. What
is constant across the inputs (the template) stays sharp; what varies (the content) blurs.

All inputs must share one size — the check is hard because a misaligned page box turns the
template into mush too. Re-run whenever an input is re-exported.
"""
import sys
from pathlib import Path

from PIL import Image, ImageOps


def main():
    argv = sys.argv[1:]
    strength = 0.5
    if "--strength" in argv:
        i = argv.index("--strength")
        strength = float(argv[i + 1])
        del argv[i : i + 2]
    if len(argv) < 3:
        sys.exit(__doc__)
    out = Path(argv[0])
    paths = [Path(p) for p in argv[1:]]
    ims = [ImageOps.exif_transpose(Image.open(p)).convert("RGB") for p in paths]
    sizes = {im.size for im in ims}
    if len(sizes) != 1:
        sys.exit(f"inputs are not one size: {sorted(sizes)} — re-export before averaging")

    acc = ims[0]
    for k, im in enumerate(ims[1:], start=2):
        acc = Image.blend(acc, im, 1.0 / k)  # running mean, no numpy needed

    # levels stretch on luminance, applied to all three channels
    hist = acc.convert("L").histogram()
    total = sum(hist)
    lo = next(i for i in range(256) if sum(hist[: i + 1]) >= total * 0.02)
    hi = next(i for i in range(255, -1, -1) if sum(hist[i:]) >= total * 0.02)
    if hi <= lo:
        lo, hi = 0, 255
    lut = [min(255, max(0, round((v - lo) * 255 / (hi - lo)))) for v in range(256)] * 3
    acc = Image.blend(acc, acc.point(lut), strength)

    out.parent.mkdir(parents=True, exist_ok=True)
    acc.save(out, "JPEG", quality=90, optimize=True, progressive=True)
    print(f"{out}  {acc.size[0]}x{acc.size[1]}  from {len(ims)} inputs  levels {lo}-{hi} @ {strength}")


if __name__ == "__main__":
    main()
