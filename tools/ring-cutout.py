"""Cut the demo ring out of its dark studio backdrop for the AI photo tile.

    python tools/ring-cutout.py

Reads src/assets/products/ring.png and writes ring-cutout.png next to it. The silver ring is
much brighter than the charcoal backdrop, so a soft luminance key is enough. After replacing
ring.png, run this again and update the crop box (--ring-x/-y/-w/-h) in Growth.astro to the
box it prints, as fractions of the photo size.
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

HERE = Path(__file__).resolve().parent.parent / "src" / "assets" / "products"
TOP_GUARD = 80  # px: the screenshot crop had rounded card corners in the top rows

image = Image.open(HERE / "ring.png").convert("RGB")
rgb = np.asarray(image).astype(float)
lum = 0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]
t = np.clip((lum - 52) / 40, 0, 1)
alpha = t * t * (3 - 2 * t)
alpha[:TOP_GUARD, :] = 0
mask = Image.fromarray((alpha * 255).astype("uint8"))
mask = mask.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.6))
ys, xs = np.where(np.asarray(mask) > 20)
margin = 6
box = (int(max(0, xs.min() - margin)), int(max(0, ys.min() - margin)), int(min(image.width, xs.max() + margin)), int(min(image.height, ys.max() + margin)))
image.putalpha(mask)
image.crop(box).save(HERE / "ring-cutout.png", optimize=True)
print("crop box", box, "of", image.size)
