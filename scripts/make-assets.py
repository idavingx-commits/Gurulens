"""GuruLens asset pipeline.

Processes the source logos into production-ready icons and generates
seed avatars / covers / post images. Run: python scripts/make-assets.py
"""

from __future__ import annotations

import math
import os
import random
from collections import deque

from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(ROOT, "public")
BRAND = os.path.join(PUBLIC, "brand")
SEED = os.path.join(ROOT, "storage", "seed")
APP = os.path.join(ROOT, "src", "app")

SRC_GURULENS = r"C:\Users\Iworld\Downloads\Blue Education Search Logo Icon.png"
SRC_INESHDEV = r"C:\Users\Iworld\Desktop\file_0000000054388211941a6f7e985f6c3c.png"

BRAND_BLUE = (0, 148, 253)
BRAND_NAVY = (10, 27, 61)
BRAND_VIOLET = (109, 91, 255)
GRADIENTS = [
    ((0, 148, 253), (10, 27, 61)),
    ((109, 91, 255), (0, 148, 253)),
    ((0, 200, 255), (0, 90, 200)),
    ((255, 138, 76), (240, 60, 100)),
    ((52, 199, 123), (0, 120, 90)),
    ((250, 180, 60), (230, 90, 30)),
]


def ensure_dirs() -> None:
    for d in (BRAND, SEED, APP, os.path.join(ROOT, "storage", "avatars"),
              os.path.join(ROOT, "storage", "covers"), os.path.join(ROOT, "storage", "posts"),
              os.path.join(ROOT, "storage", "videos"), os.path.join(ROOT, "storage", "docs"),
              os.path.join(ROOT, "storage", "thumbs")):
        os.makedirs(d, exist_ok=True)


def near_white(p: tuple[int, int, int, int], tol: int) -> bool:
    return p[0] >= 255 - tol and p[1] >= 255 - tol and p[2] >= 255 - tol


def remove_white_background(im: Image.Image, tol: int = 14) -> Image.Image:
    """Flood-fill from the borders, removing near-white pixels only if they
    connect to the edge. Interior whites (glyph cut-outs) stay intact."""
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    visited = bytearray(w * h)
    q: deque[tuple[int, int]] = deque()

    def push(x: int, y: int) -> None:
        if not visited[y * w + x] and near_white(px[x, y], tol):
            visited[y * w + x] = 1
            q.append((x, y))

    for x in range(w):
        push(x, 0)
        push(x, h - 1)
    for y in range(h):
        push(0, y)
        push(w - 1, y)

    while q:
        x, y = q.popleft()
        r, g, b, _ = px[x, y]
        px[x, y] = (r, g, b, 0)
        if x > 0:
            push(x - 1, y)
        if x < w - 1:
            push(x + 1, y)
        if y > 0:
            push(x, y - 1)
        if y < h - 1:
            push(x, y + 1)
    return im


def feather_alpha(im: Image.Image, radius: int = 1) -> Image.Image:
    """Slight alpha blur to kill anti-aliasing halos left by bg removal."""
    r, g, b, a = im.split()
    a = a.filter(ImageFilter.GaussianBlur(radius))
    return Image.merge("RGBA", (r, g, b, a))


def trim(im: Image.Image, pad: int = 8) -> Image.Image:
    bbox = im.getbbox()
    if not bbox:
        return im
    x0, y0, x1, y1 = bbox
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(im.width, x1 + pad)
    y1 = min(im.height, y1 + pad)
    return im.crop((x0, y0, x1, y1))


def recolor(im: Image.Image, rgb: tuple[int, int, int]) -> Image.Image:
    out = im.copy()
    px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = px[x, y]
            if a > 0:
                px[x, y] = (rgb[0], rgb[1], rgb[2], a)
    return out


def gradient_image(w: int, h: int, c1, c2, angle: float = 35.0) -> Image.Image:
    im = Image.new("RGB", (w, h))
    px = im.load()
    rad = math.radians(angle)
    dx, dy = math.cos(rad), math.sin(rad)
    denom = abs(dx) * w + abs(dy) * h
    for y in range(h):
        for x in range(w):
            t = (x * dx + y * dy) / denom
            t = max(0.0, min(1.0, t))
            px[x, y] = tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))
    return im


def add_shapes(im: Image.Image, seed: int, count: int = 7) -> Image.Image:
    rnd = random.Random(seed)
    layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for _ in range(count):
        r = rnd.randint(im.width // 14, im.width // 4)
        x = rnd.randint(-r, im.width)
        y = rnd.randint(-r, im.height)
        alpha = rnd.randint(14, 42)
        color = (255, 255, 255, alpha) if rnd.random() > 0.4 else (10, 27, 61, alpha)
        if rnd.random() > 0.5:
            d.ellipse([x, y, x + r, y + r], fill=color)
        else:
            d.rounded_rectangle([x, y, x + int(r * 1.6), y + r], radius=r // 3, fill=color)
    layer = layer.filter(ImageFilter.GaussianBlur(2))
    return Image.alpha_composite(im.convert("RGBA"), layer)


def circle_crop(im: Image.Image, size: int) -> Image.Image:
    im = im.resize((size, size), Image.LANCZOS)
    mask = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(mask)
    d.ellipse([0, 0, size - 1, size - 1], fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(im, (0, 0), mask)
    return out


def make_gurulens_assets() -> None:
    src = Image.open(SRC_GURULENS).convert("RGBA")
    cleaned = feather_alpha(remove_white_background(src))
    icon = trim(cleaned, pad=6)
    icon.save(os.path.join(BRAND, "gurulens-icon.png"))
    icon.resize((512, 512), Image.LANCZOS).save(os.path.join(BRAND, "gurulens-icon-512.png"))
    white = recolor(icon, (255, 255, 255))
    white.save(os.path.join(BRAND, "gurulens-white.png"))

    square = Image.new("RGBA", (icon.width, icon.width), (0, 0, 0, 0))
    square.paste(icon, ((icon.width - icon.width) // 2, (icon.width - icon.height) // 2))
    square = trim(square, pad=4)

    def on_canvas(size: int, pad_ratio: float) -> Image.Image:
        inner = int(size * (1 - pad_ratio * 2))
        art = square.copy()
        art.thumbnail((inner, inner), Image.LANCZOS)
        canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        canvas.paste(art, ((size - art.width) // 2, (size - art.height) // 2), art)
        return canvas

    on_canvas(512, 0.08).save(os.path.join(BRAND, "gurulens-icon-512-padded.png"))
    on_canvas(192, 0.08).save(os.path.join(BRAND, "gurulens-icon-192.png"))

    icon_small = on_canvas(256, 0.06)
    ico_sizes = [16, 32, 48, 64]
    icon_small.save(os.path.join(APP, "favicon.ico"), sizes=[(s, s) for s in ico_sizes])
    icon_small.resize((512, 512), Image.LANCZOS).save(os.path.join(APP, "icon.png"))
    icon_small.resize((180, 180), Image.LANCZOS).save(os.path.join(APP, "apple-icon.png"))

    # Maskable PWA icon: brand gradient background, logo inside safe zone.
    bg = gradient_image(512, 512, BRAND_BLUE, BRAND_NAVY, 135).convert("RGBA")
    art = square.copy()
    art.thumbnail((300, 300), Image.LANCZOS)
    bg.paste(art, ((512 - art.width) // 2, (512 - art.height) // 2), art)
    bg.save(os.path.join(BRAND, "gurulens-maskable-512.png"))

    og = gradient_image(1200, 630, BRAND_NAVY, BRAND_BLUE, 30).convert("RGBA")
    og = add_shapes(og, 7, 9)
    art = square.copy()
    art.thumbnail((380, 380), Image.LANCZOS)
    og.paste(art, (110, (630 - art.height) // 2), art)
    d = ImageDraw.Draw(og)
    d.rounded_rectangle([110, 88, 330, 148], radius=30, fill=(255, 255, 255, 40))
    og.save(os.path.join(BRAND, "og-default.png"))
    print("gurulens assets ->", BRAND)


def make_ineshdev_assets() -> None:
    src = Image.open(SRC_INESHDEV).convert("RGBA")
    trimmed = trim(src, pad=4)
    trimmed.save(os.path.join(BRAND, "ineshdev-white.png"))
    dark = recolor(trimmed, BRAND_NAVY)
    dark.save(os.path.join(BRAND, "ineshdev-dark.png"))
    print("ineshdev assets ->", BRAND)


def initials(name: str) -> str:
    parts = [p for p in name.split() if p]
    if not parts:
        return "GL"
    if len(parts) == 1:
        return parts[0][:2].upper()
    return (parts[0][0] + parts[-1][0]).upper()


def make_avatar(name: str, path: str, seed: int) -> None:
    c1, c2 = GRADIENTS[seed % len(GRADIENTS)]
    size = 256
    im = gradient_image(size, size, c1, c2, 120).convert("RGBA")
    d = ImageDraw.Draw(im)
    text = initials(name)
    font = None
    for font_path in (
        r"C:\Windows\Fonts\segoeuib.ttf",
        r"C:\Windows\Fonts\arialbd.ttf",
    ):
        if os.path.exists(font_path):
            from PIL import ImageFont
            font = ImageFont.truetype(font_path, 96)
            break
    if font:
        bbox = d.textbbox((0, 0), text, font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        d.text(((size - tw) / 2 - bbox[0], (size - th) / 2 - bbox[1]), text, font=font, fill=(255, 255, 255, 235))
    circle_crop(im, size).save(path)


def make_cover(path: str, seed: int) -> None:
    c1, c2 = GRADIENTS[seed % len(GRADIENTS)]
    im = gradient_image(1200, 320, c1, c2, 20 + seed * 13).convert("RGBA")
    im = add_shapes(im, seed, 10)
    im.convert("RGB").save(path, quality=88)


def make_post_image(path: str, seed: int) -> None:
    c1, c2 = GRADIENTS[seed % len(GRADIENTS)]
    im = gradient_image(900, 600, c1, c2, seed * 29).convert("RGBA")
    im = add_shapes(im, seed * 3 + 1, 8)
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([40, 40, 260, 96], radius=28, fill=(255, 255, 255, 36))
    im.convert("RGB").save(path, quality=88)


def make_seed_assets() -> None:
    teachers = [
        "Anuradha Perera", "Nimali Fernando", "Kasun Jayawardena", "Dilhani Rathnayake",
        "Tharindu Silva", "Sachini Wijesekara", "Ruwan Bandara", "Ishara Gunasekara",
        "Chamari Dissanayake", "Pasindu Herath", "Nadeesha Kumari", "Asanka Weerasinghe",
        "Hiruni Ekanayake", "Manoj Peiris", "Sanduni Alwis", "Dinesh Rajapaksha",
    ]
    students = ["Kavindu Silva", "Sethmi Perera", "Ravindu Fernando", "Nethmi Jayasuriya",
                "Yasiru Bandara", "Hiruni Senanayake"]
    for i, name in enumerate(teachers):
        make_avatar(name, os.path.join(SEED, f"avatar-t{i}.png"), i)
        make_cover(os.path.join(SEED, f"cover-t{i}.jpg"), i)
    for i, name in enumerate(students):
        make_avatar(name, os.path.join(SEED, f"avatar-s{i}.png"), i + 3)
    for i in range(14):
        make_post_image(os.path.join(SEED, f"post-{i}.jpg"), i)
    print("seed assets ->", SEED)


if __name__ == "__main__":
    ensure_dirs()
    make_gurulens_assets()
    make_ineshdev_assets()
    make_seed_assets()
    print("done")
