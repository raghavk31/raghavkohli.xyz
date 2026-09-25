"""
make-sama-cover.py — the four cover images for Sama, drawn rather than photographed.

    python scripts/make-sama-cover.py

Sama has no drawings yet and no screenshots worth showing, so its homepage card had nothing to
stand on. These are made images in the language Raghav picked as the reference
(images/sama/Recording 2026-07-12 162241.gif): a halftone dot-matrix figure lit out of a dark
band in a slow flowing gradient, with a glass card carrying one line.

Four of them, one per thing the project is about:
  01  the feeder      a distribution feeder from the substation down to the rooftops on it
  02  one day         generation over consumption; the exported surplus is the gap between them
  03  observability   the same feeder, dissolving as it drops below the substation
  04  the spread      ₹6.40 cleared against ₹2.50 paid, and the charges in between

Nothing here is data. Every number and every line of card text is quoted from the page
(src/projects/1-sama.md) — no telemetry, no readings, nothing the project has not claimed.

Writes what the card actually serves, in prep-covers.py's own naming: 00.jpg (the thumb, which
is cover 1), cK-f.jpg (the frame, 1200×800 — the card is landscape so it keeps its ratio and
nothing is cropped) and cK.jpg (the 400² chip in the hover strip). It does not write 01–09.jpg:
those are reserved for the page's nine figure slots, which are still to be drawn. Deterministic —
SEED fixes every field, so a re-run reproduces the same four images.

Needs the site's own faces in scripts/_fonts/ (gitignored). To fetch them:

    mkdir -p scripts/_fonts && cd scripts/_fonts
    curl -sLo Fraunces.ttf "https://github.com/google/fonts/raw/main/ofl/fraunces/Fraunces%5BSOFT%2CWONK%2Copsz%2Cwght%5D.ttf"
    curl -sLo Geist.ttf    "https://github.com/google/fonts/raw/main/ofl/geist/Geist%5Bwght%5D.ttf"
"""
import math
import random
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "assets" / "projects" / "sama"
FONTS = Path(__file__).resolve().parent / "_fonts"

W, H = 1500, 1000          # 3:2 — a landscape card keeps its own ratio, so nothing is cropped
STEP = 15                  # halftone pitch; the card shows this image at ~0.42×, so coarse reads right
SEED = 20260712            # the date on the reference recording
QUALITY = 84
FRAME = 1200               # long edge served, as in prep-covers.py
SQUARE = 400               # the chip in the card's hover strip

# The page paper at one end, the accent navy at the other, warmed in the middle: the site's own
# range, not the reference's mauve. t = 0 is paper, t = 1 is ink.
RAMP = [
    (0.00, (250, 250, 248)),
    (0.14, (242, 240, 232)),
    (0.30, (224, 221, 210)),
    (0.46, (196, 194, 186)),
    (0.60, (158, 160, 167)),
    (0.74, (112, 120, 141)),
    (0.88, (66, 76, 103)),
    (1.00, (34, 41, 62)),
]
SOLAR = (203, 166, 92)     # the one warm thread: this is a project about generation


# ---------------------------------------------------------------- fields

def lattice(w, h, cx, cy, rnd):
    """Smooth value noise from a coarse random lattice, resampled up. Separate cell sizes in x and
    y are what make the field flow in one direction instead of marbling."""
    gw, gh = max(2, int(w / cx)) + 2, max(2, int(h / cy)) + 2
    im = Image.new("L", (gw, gh))
    im.putdata([rnd.randrange(256) for _ in range(gw * gh)])
    return im.resize((w, h), Image.BICUBIC)


def ramp_at(t):
    t = 0.0 if t < 0 else (1.0 if t > 1 else t)
    for i in range(len(RAMP) - 1):
        a, ca = RAMP[i]
        b, cb = RAMP[i + 1]
        if t <= b:
            k = (t - a) / (b - a) if b > a else 0.0
            return tuple(round(ca[j] + (cb[j] - ca[j]) * k) for j in range(3))
    return RAMP[-1][1]


def field(seed, band):
    """The flowing gradient, built at a third of full size and blown up — the upsample is what
    makes it look painted rather than computed.

    `band` is the dark mass the figure is lit out of: (axis, centre, width) in fractions, where
    axis is "v" for a vertical column (the branching figures) or "h" for a low horizontal bank
    (the two that read left to right)."""
    rnd = random.Random(seed)
    w, h = W // 3, H // 3
    # long, slow bands: fine across the flow, very coarse along it
    base = lattice(w, h, 16, 150, rnd).load()
    warp_x = lattice(w, h, 34, 90, rnd).load()
    warp_y = lattice(w, h, 60, 60, rnd).load()
    fine = lattice(w, h, 7, 48, rnd).load()
    warm = lattice(w, h, 40, 120, rnd).load()

    axis, centre, width = band
    im = Image.new("RGB", (w, h))
    px = im.load()
    for y in range(h):
        for x in range(w):
            u = x + (warp_x[x, y] - 128) / 128.0 * w * 0.05
            v = y + (warp_y[x, y] - 128) / 128.0 * h * 0.10
            u = 0 if u < 0 else (w - 1 if u > w - 1 else u)
            v = 0 if v < 0 else (h - 1 if v > h - 1 else v)
            t = base[int(u), int(v)] / 255.0
            t = t * 0.80 + fine[x, y] / 255.0 * 0.20
            t = 0.21 + t * 0.44                       # pale overall, but never bare paper:
            # white dots on a cream corner have nothing to read against
            # the dark mass, wavering so it never reads as a rectangle
            p = (x / w) if axis == "v" else (y / h)
            q = ((y / h) if axis == "v" else (x / w))
            c = centre + math.sin(q * 3.1 + seed % 7) * 0.035
            k = max(0.0, 1.0 - (abs(p - c) / width) ** 1.7)
            t += k * 0.62
            t += math.sin(t * 30.0) * 0.016           # the striations in the reference
            r, g, b = ramp_at(t)
            kw = (warm[x, y] / 255.0 - 0.55)
            if kw > 0:                                # a warm thread, never more than a tint
                kw = min(kw * 0.9, 0.30) * (1 - k * 0.6)
                r = round(r + (SOLAR[0] - r) * kw)
                g = round(g + (SOLAR[1] - g) * kw)
                b = round(b + (SOLAR[2] - b) * kw)
            px[x, y] = (r, g, b)
    return im.resize((W, H), Image.BICUBIC).filter(ImageFilter.GaussianBlur(1.2))


# ---------------------------------------------------------------- the figures
# Each returns an 'L' mask: white is where the dots go, and how big they get.

def feeder(rnd, seen_to=None):
    """One distribution feeder: substation, trunk, laterals, and the rooftops hanging off them.
    It fills the frame, because it is the frame's subject."""
    m = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(m)

    def branch(x, y, ang, length, wide, depth):
        if depth <= 0 or length < 46:
            s = 9
            d.rectangle([x - s, y - s, x + s, y + s], fill=225)     # a rooftop, end of the line
            return
        seg = length * rnd.uniform(0.52, 0.72)
        nx = x + math.cos(ang) * seg
        ny = y + math.sin(ang) * seg
        d.line([x, y, nx, ny], fill=255, width=wide)
        d.ellipse([nx - wide * .7, ny - wide * .7, nx + wide * .7, ny + wide * .7], fill=255)
        spread = rnd.uniform(0.40, 0.88)
        branch(nx, ny, ang + spread, length * rnd.uniform(0.70, 0.86), max(4, wide - 3), depth - 1)
        branch(nx, ny, ang - spread * rnd.uniform(0.6, 1.2), length * rnd.uniform(0.70, 0.86),
               max(4, wide - 3), depth - 1)
        if depth > 4 and rnd.random() < 0.35:
            branch(nx, ny, ang + rnd.uniform(-0.18, 0.18), length * 0.9, max(4, wide - 2), depth - 1)

    sx, sy = W * 0.44, H * 0.03
    d.rectangle([sx - 34, sy, sx + 34, sy + 40], fill=255)          # the substation
    branch(sx - 10, sy + 40, math.pi / 2 + 0.12, 400, 17, 6)
    branch(sx + 10, sy + 40, math.pi / 2 - 0.34, 370, 14, 6)
    branch(sx + 18, sy + 40, math.pi / 2 - 0.98, 330, 11, 5)

    # the street network the low-tension line runs along — one quarter of the frame, not all of
    # it: the reference leaves most of the field empty and lets the figure be the subject
    g = Image.new("L", (W, H), 0)
    dg = ImageDraw.Draw(g)
    for i in range(5):
        y = H * 0.12 + i * H * 0.115 + rnd.uniform(-14, 14)
        dg.line([W * 0.52 + rnd.uniform(-40, 40), y + rnd.uniform(-16, 16),
                 W * 1.02, y + rnd.uniform(-16, 16)], fill=255, width=6)
    for i in range(5):
        x = W * 0.60 + i * W * 0.098 + rnd.uniform(-18, 18)
        dg.line([x + rnd.uniform(-16, 16), H * 0.04,
                 x + rnd.uniform(-16, 16), H * 0.62 + rnd.uniform(-60, 60)], fill=255, width=6)
    fade = Image.new("L", (W, H), 0)
    ImageDraw.Draw(fade).ellipse([W * 0.44, -H * 0.10, W * 1.04, H * 0.80], fill=255)
    g = ImageChops.multiply(g, fade.filter(ImageFilter.GaussianBlur(115)))
    m = ImageChops.lighter(m, g.point(lambda v: int(v * 0.50)))

    if seen_to is not None:                                        # cover 03: it stops being seen
        grad = Image.new("L", (1, H))
        gp = grad.load()
        for y in range(H):
            gp[0, y] = int(255 * max(0.04, min(1.0, 1.0 - (y / H - seen_to) / 0.42)))
        m = ImageChops.multiply(m, grad.resize((W, H)))
        dd = ImageDraw.Draw(m)
        for x in range(int(W * 0.04), int(W * 0.96), 34):
            dd.line([x, H * seen_to, x + 16, H * seen_to], fill=150, width=5)
    return m


def m_feeder(rnd):
    return feeder(rnd)


def m_observability(rnd):
    return feeder(rnd, seen_to=0.30)


def m_day(rnd):
    """A day: generation over consumption. The gap between the curves is the exported surplus."""
    m = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(m)
    x0, x1 = W * 0.06, W * 0.96
    base = H * 0.84
    amp = H * 0.62

    def gen(x):                      # generation: a bell across the middle of the day
        u = (x - x0) / (x1 - x0)
        return math.exp(-((u - 0.5) ** 2) / 0.034) * amp

    def use(x):                      # consumption: low through the day, rising into the evening
        u = (x - x0) / (x1 - x0)
        return (0.16 + 0.12 * math.exp(-((u - 0.20) ** 2) / 0.010)
                + 0.34 * math.exp(-((u - 0.88) ** 2) / 0.016)) * amp

    # the surplus, filled: thickest at midday, thinning to nothing at the crossings
    for x in range(int(x0), int(x1), 11):
        g, c = gen(x), use(x)
        if g <= c + 4:
            continue
        top, bot = base - g, base - c
        for y in range(int(top) + 14, int(bot), 11):
            k = (y - top) / max(1.0, bot - top)
            d.ellipse([x - 3, y - 3, x + 3, y + 3], fill=int(40 + 105 * (1 - abs(k - 0.55) * 1.4)))
    d.line([(x, base - gen(x)) for x in range(int(x0), int(x1), 4)], fill=255, width=14)
    d.line([(x, base - use(x)) for x in range(int(x0), int(x1), 4)], fill=200, width=9)
    d.line([x0, base, x1, base], fill=170, width=6)
    for i in range(9):               # the hours, ticked
        x = x0 + (x1 - x0) * i / 8
        d.line([x, base + 12, x, base + 38], fill=170, width=6)
    return m


def m_spread(rnd):
    """₹6.40 cleared against ₹2.50 paid, and the charges standing between the two."""
    m = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(m)
    base = H * 0.88
    unit = H * 0.108                                # one rupee
    bw = W * 0.15

    d.rectangle([W * 0.13 - bw / 2, base - 6.4 * unit, W * 0.13 + bw / 2, base], fill=255)
    d.rectangle([W * 0.87 - bw / 2, base - 2.5 * unit, W * 0.87 + bw / 2, base], fill=255)

    # the deductions, stepping down from what it clears at to what she is paid
    steps = [1.05, 0.72, 0.95, 0.68, 0.50]
    x = W * 0.13 + bw / 2
    top = 6.4
    span = (W * 0.87 - bw / 2 - x) / len(steps)
    for s in steps:
        top -= s
        d.rectangle([x + 10, base - (top + s) * unit, x + span - 10, base - top * unit], fill=62)
        d.line([x + 10, base - top * unit, x + span - 10, base - top * unit], fill=230, width=7)
        x += span
    d.line([W * 0.04, base, W * 0.96, base], fill=190, width=7)
    d.line([W * 0.13 - bw / 2, base - 6.4 * unit, W * 0.87 + bw / 2, base - 6.4 * unit],
           fill=120, width=4)
    return m


def texture(m, rnd):
    """The reference's mass is mottled, not solid, and it scatters loose dots past its own edge.
    A mid-frequency field takes bites out of the body; a wide blur of the figure seeds the
    sparkles around it."""
    mott = lattice(W, H, 34, 34, rnd).point(lambda v: 168 + int(v * 0.34))
    m = ImageChops.multiply(m, mott)
    aura = m.filter(ImageFilter.GaussianBlur(13)).point(lambda v: int(v * 0.34))
    aura = ImageChops.multiply(aura, lattice(W, H, 17, 17, rnd).point(lambda v: 0 if v < 190 else 255))
    return ImageChops.lighter(m, aura)


# ---------------------------------------------------------------- halftone

def halftone(bg, mask):
    """The reference's move: sample the figure on a grid and draw each cell as a diamond sized by
    its value. White, always — the dark band in the gradient is what it is read against."""
    soft = mask.filter(ImageFilter.GaussianBlur(2.2))
    shade = mask.filter(ImageFilter.GaussianBlur(60)).point(lambda v: min(255, int(v * 1.9)))
    bg = Image.composite(Image.blend(bg, Image.new("RGB", (W, H), (28, 32, 46)), 0.42), bg, shade)

    cols, rows = W // STEP, H // STEP
    cells = soft.resize((cols, rows), Image.BOX).load()
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    rmax = STEP * 0.60
    for j in range(rows):
        for i in range(cols):
            v = cells[i, j] / 255.0
            if v < 0.02:
                continue
            r = (v ** 0.58) * rmax
            x, y = i * STEP + STEP / 2, j * STEP + STEP / 2
            a = 255 if v > 0.20 else int(140 + 115 * v / 0.20)
            if r < 1.2:
                d.ellipse([x - 1, y - 1, x + 1, y + 1], fill=(255, 255, 255, a))
            else:
                d.polygon([(x, y - r), (x + r, y), (x, y + r), (x - r, y)],
                          fill=(255, 255, 255, a))
    return Image.alpha_composite(bg.convert("RGBA"), layer).convert("RGB")


# ---------------------------------------------------------------- glass

def face(name, size, weight):
    f = ImageFont.truetype(str(FONTS / name), size)
    try:
        axes = f.get_variation_axes()
    except (OSError, AttributeError):
        return f
    vals = []
    for a in axes:
        tag = a.get("name", b"")
        tag = tag.decode() if isinstance(tag, bytes) else str(tag)
        if "Weight" in tag or "wght" in tag:
            vals.append(max(a["minimum"], min(a["maximum"], weight)))
        elif "Optical" in tag:
            vals.append(max(a["minimum"], min(a["maximum"], size)))
        else:
            vals.append(a["default"])
    try:
        f.set_variation_by_axes(vals)
    except OSError:
        pass
    return f


def glass(im, box, pill, title, body):
    """A blurred panel lifted out of the gradient, the way the reference annotates its figure."""
    x0, y0, x1, y1 = box
    rad = 24
    panel = im.crop(box).filter(ImageFilter.GaussianBlur(22))
    panel = Image.blend(panel, Image.new("RGB", panel.size, (255, 255, 255)), 0.62)
    mask = Image.new("L", panel.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, x1 - x0 - 1, y1 - y0 - 1], rad, fill=255)
    im.paste(panel, (x0, y0), mask)

    d = ImageDraw.Draw(im, "RGBA")
    d.rounded_rectangle([x0, y0, x1 - 1, y1 - 1], rad, outline=(255, 255, 255, 130), width=2)

    tx, ty = x0 + 34, y0 + 32
    f_pill = face("Geist.ttf", 19, 500)
    f_title = face("Fraunces.ttf", 42, 400)
    f_body = face("Geist.ttf", 22, 300)

    pw = d.textlength(pill, font=f_pill)             # a chip of paper, as the labels are on the site
    d.rounded_rectangle([tx, ty, tx + pw + 34, ty + 38], 19, fill=(250, 250, 248, 240))
    d.text((tx + 17, ty + 19), pill, font=f_pill, fill=(28, 27, 24), anchor="lm")
    ty += 66

    for line in title:
        d.text((tx, ty), line, font=f_title, fill=(22, 23, 28), anchor="la")
        ty += 50
    ty += 12
    for line in body:
        d.text((tx, ty), line, font=f_body, fill=(66, 67, 72, 230), anchor="la")
        ty += 33
    return im


# ---------------------------------------------------------------- the four

COVERS = [
    dict(mask=m_feeder, seed=SEED + 1, band=("v", 0.46, 0.30),
         card=(70, 470, 640, 770), pill="(lt feeder)",
         title=["₹2.50 paid.", "₹6.40 cleared."],
         body=["The same unit on the same wire.", "Nothing in the house says which."]),
    dict(mask=m_day, seed=SEED + 2, band=("h", 0.62, 0.34),
         card=(80, 70, 660, 370), pill="(one day)",
         title=["What the meter", "does not say."],
         body=["Not what she produced, not when,", "not where it went, not what it was", "worth to whoever received it."]),
    dict(mask=m_observability, seed=SEED + 3, band=("v", 0.44, 0.28),
         card=(820, 470, 1420, 770), pill="(observability)",
         title=["Seen at the", "substation."],
         body=["It thins out fast below — and below", "is where a rooftop connects."]),
    dict(mask=m_spread, seed=SEED + 4, band=("h", 0.70, 0.30),
         card=(950, 70, 1440, 370), pill="(the spread)",
         title=["Gross, before", "the charges."],
         body=["Wheeling, banking, cross-subsidy,", "platform fee. What survives them", "is the first piece of work."]),
]


def main():
    missing = [f for f in ("Fraunces.ttf", "Geist.ttf") if not (FONTS / f).exists()]
    if missing:
        raise SystemExit(f"missing {', '.join(missing)} in {FONTS} — see the docstring for the curl lines")
    OUT.mkdir(parents=True, exist_ok=True)
    for k, c in enumerate(COVERS, 1):
        rnd = random.Random(c["seed"])
        im = halftone(field(c["seed"], c["band"]), texture(c["mask"](rnd), rnd))
        im = glass(im, c["card"], c["pill"], c["title"], c["body"])
        frame = im.resize((FRAME, FRAME * H // W), Image.LANCZOS)
        frame.save(OUT / f"c{k}-f.jpg", quality=QUALITY, optimize=True)
        side = min(im.size)
        chip = im.crop(((W - side) // 2, (H - side) // 2,
                        (W + side) // 2, (H + side) // 2)).resize((SQUARE, SQUARE), Image.LANCZOS)
        chip.save(OUT / f"c{k}.jpg", quality=QUALITY, optimize=True)
        print(f"  c{k}  {frame.size[0]}x{frame.size[1]} + chip {SQUARE}²  {c['pill']}")
        if k == 1:                                  # the thumb is the card's first state
            frame.save(OUT / "00.jpg", quality=QUALITY, optimize=True)
            print(f"  00.jpg  {frame.size[0]}x{frame.size[1]}  thumb")


if __name__ == "__main__":
    main()
