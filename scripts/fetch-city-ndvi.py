"""Vegetation for the homepage city: NDVI over the Ahmedabad map's box, from one Sentinel-2 scene.

OSM maps very little of Ahmedabad's green (a few dozen parks, a few hundred trees), so the trees in
city-ahmedabad.txt come from the satellite instead: NDVI = (NIR - red) / (NIR + red), bands B08 and
B04 at 10 m, from a cloud-free post-monsoon scene (S2B_43QBF_20251202, Element84's public COGs).

Writes an 8-bit greyscale PNG on the map's box at 5 m (NDVI -1..1 -> 0..255) for
scripts/make-city-map.py --ndvi. Needs rasterio and numpy, which the site does not, so run it with:
  uv run --with rasterio --with numpy python scripts/fetch-city-ndvi.py <out.png>
"""
import sys
import numpy as np
import rasterio
from rasterio.warp import reproject, Resampling, transform_bounds
from rasterio.transform import from_bounds
from PIL import Image

S, N, W, E = 22.99, 23.065, 72.555, 72.61
SCENE = "https://sentinel-cogs.s3.us-west-2.amazonaws.com/sentinel-s2-l2a-cogs/43/Q/BF/2025/12/S2B_43QBF_20251202_0_L2A/"
CW, CH, STEP = 15.0, 30.0, 5.0
mx = 111320 * np.cos(np.radians((S + N) / 2))
cols, rows = int((E - W) * mx // CW), int((N - S) * 110570 // CH)
# the same box make-city-map.py rasterises: whole cells from the north-west corner
E2, S2 = W + cols * CW / mx, N - rows * CH / 110570
ow, oh = int(cols * CW / STEP), int(rows * CH / STEP)
dst_t = from_bounds(W, S2, E2, N, ow, oh)


def band(name):
    with rasterio.open(SCENE + name + ".tif") as src:
        l, b, r, t = transform_bounds("EPSG:4326", src.crs, W, S2, E2, N)
        win = src.window(l - 100, b - 100, r + 100, t + 100)
        data = src.read(1, window=win).astype("float32")
        out = np.zeros((oh, ow), "float32")
        reproject(data, out, src_transform=src.window_transform(win), src_crs=src.crs,
                  dst_transform=dst_t, dst_crs="EPSG:4326", resampling=Resampling.bilinear)
        return out


red, nir = band("B04"), band("B08")
ndvi = np.where(nir + red > 0, (nir - red) / np.maximum(nir + red, 1), 0)
Image.fromarray(((ndvi + 1) * 127.5).clip(0, 255).astype("uint8")).save(sys.argv[1])
print(ow, "x", oh, "ndvi mean %.2f, >0.45: %.1f%%" % (ndvi.mean(), (ndvi > .45).mean() * 100))
