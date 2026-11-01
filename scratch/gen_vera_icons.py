"""Generate VERA icon set from the pasted brand logo (one-off).

Reads the cached paste image (1254x1254 RGB, rounded-square tile on near-white),
crops to the tile, and writes:
  public/vera-logo.png          512x512 RGBA, rounded corners (navbar/footer brand)
  public/icons/icon-192.png     192x192 RGBA, rounded corners
  public/icons/icon-512.png     512x512 RGBA, rounded corners
  public/apple-touch-icon.png   180x180 opaque square on white
  app/favicon.ico               16/32/48 flattened on white
"""
from PIL import Image, ImageDraw

SRC = r"C:\Users\miner\.zcode\cli\image-cache\sess_4b65f77d-dcd1-49af-aca1-e7853f073d11\image-7691494ee07b4d5499178f2584ae0d1d.png"
ROOT = r"D:\HackXxMUJ"

im = Image.open(SRC).convert("RGB")
w, h = im.size
bg = im.getpixel((4, 4))

# Bounding box of pixels that differ from the corner background color.
diff = im.point(lambda p: 255 if p else 0)  # placeholder, real diff below
from PIL import ImageChops
solid = Image.new("RGB", im.size, bg)
bbox = ImageChops.difference(im, solid).convert("L").point(lambda p: 255 if p > 18 else 0).getbbox()
print("source", im.size, "bg", bg, "bbox", bbox)

tile = im.crop(bbox)
# Trim to square around the shorter side (tile should already be ~square).
tw, th = tile.size
s = min(tw, th)
tile = tile.crop(((tw - s) // 2, (th - s) // 2, (tw + s) // 2, (th + s) // 2))
tile = tile.resize((1024, 1024), Image.LANCZOS)

def rounded(img: Image.Image, radius_frac: float = 0.225) -> Image.Image:
    """RGBA copy with rounded corners (app-icon style)."""
    mask = Image.new("L", img.size, 0)
    d = ImageDraw.Draw(mask)
    r = int(img.size[0] * radius_frac)
    d.rounded_rectangle([0, 0, img.size[0] - 1, img.size[1] - 1], radius=r, fill=255)
    out = img.convert("RGBA")
    out.putalpha(mask)
    return out

def save_rgba(img: Image.Image, path: str, size: int) -> None:
    rounded(img).resize((size, size), Image.LANCZOS).save(path, "PNG")
    print("wrote", path, size)

def on_white(img: Image.Image, size: int) -> Image.Image:
    canvas = Image.new("RGB", (size, size), (255, 255, 255))
    canvas.paste(img.resize((size, size), Image.LANCZOS), (0, 0))
    return canvas

save_rgba(tile, ROOT + r"\public\vera-logo.png", 512)
import os
os.makedirs(ROOT + r"\public\icons", exist_ok=True)
save_rgba(tile, ROOT + r"\public\icons\icon-192.png", 192)
save_rgba(tile, ROOT + r"\public\icons\icon-512.png", 512)

on_white(tile, 180).save(ROOT + r"\public\apple-touch-icon.png", "PNG")
print("wrote apple-touch-icon.png")

ico_sizes = [(16, 16), (32, 32), (48, 48)]
on_white(tile, 256).save(ROOT + r"\app\favicon.ico", sizes=ico_sizes)
print("wrote app\\favicon.ico")
