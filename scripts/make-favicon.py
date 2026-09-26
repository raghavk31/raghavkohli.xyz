"""Draw the site favicon: the header mark 'र.' in bold white on black.

Renders large with Nirmala UI Bold (the Devanagari face the header mark falls
back to on Windows), centres the ink, and downsamples to each icon size.

    python scripts/make-favicon.py
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "assets"
FONT = ("C:/Windows/Fonts/Nirmala.ttc", 1)  # Nirmala UI Bold
TEXT = "र."
BIG = 1024
FILL = 0.78  # share of the square the ink's wider side takes


def draw():
    font = ImageFont.truetype(FONT[0], BIG, index=FONT[1])
    # measure the ink, then scale the font so it fills FILL of the square
    x0, y0, x1, y1 = font.getbbox(TEXT)
    scale = FILL * BIG / max(x1 - x0, y1 - y0)
    font = ImageFont.truetype(FONT[0], int(BIG * scale), index=FONT[1])
    x0, y0, x1, y1 = font.getbbox(TEXT)
    img = Image.new("RGB", (BIG, BIG), "black")
    ImageDraw.Draw(img).text(
        ((BIG - (x1 - x0)) / 2 - x0, (BIG - (y1 - y0)) / 2 - y0),
        TEXT, font=font, fill="white")
    return img


def main():
    img = draw()
    img.resize((180, 180), Image.LANCZOS).save(OUT / "apple-touch-icon.png")
    img.resize((512, 512), Image.LANCZOS).save(OUT / "icon-512.png")
    img.resize((32, 32), Image.LANCZOS).save(OUT / "favicon-32.png")
    img.save(OUT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    print("wrote favicon.ico, favicon-32.png, apple-touch-icon.png, icon-512.png")


if __name__ == "__main__":
    main()
