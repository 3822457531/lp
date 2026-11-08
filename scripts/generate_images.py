"""Generate local skincare-themed placeholder images (offline)."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import math
import random

OUT = Path(__file__).resolve().parent.parent / "assets" / "images"
OUT.mkdir(parents=True, exist_ok=True)
random.seed(42)

PALETTE = [
    (245, 235, 228),
    (232, 210, 198),
    (210, 180, 165),
    (195, 165, 150),
    (180, 145, 130),
    (220, 200, 185),
]


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def radial_bg(size, c1, c2):
    w, h = size
    img = Image.new("RGB", size, c1)
    cx, cy = w * 0.45, h * 0.4
    max_r = math.hypot(w, h)
    px = img.load()
    for y in range(h):
        for x in range(w):
            d = math.hypot(x - cx, y - cy) / max_r
            px[x, y] = lerp(c1, c2, min(1, d * 1.2))
    return img


def soft_blob(draw, box, fill, blur=0):
    draw.ellipse(box, fill=fill)


def spa_hero():
    img = radial_bg((900, 500), (248, 240, 234), (200, 170, 155))
    d = ImageDraw.Draw(img)
    soft_blob(d, (520, 80, 860, 420), (255, 230, 220))
    soft_blob(d, (580, 140, 780, 340), (240, 200, 190))
    soft_blob(d, (200, 120, 480, 380), (230, 210, 200))
    img = img.filter(ImageFilter.GaussianBlur(2))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 350, 900, 500], fill=(0, 0, 0, 0))
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    for y in range(280, 500):
        a = int(120 * (y - 280) / 220)
        od.line([(0, y), (900, y)], fill=(40, 30, 25, a))
    img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
    img.save(OUT / "hero-banner.jpg", quality=92)


def project_thumb(name, accent):
    size = (300, 300)
    img = radial_bg(size, lerp(accent, (255, 255, 255), 0.55), accent)
    d = ImageDraw.Draw(img)
    soft_blob(d, (40, 50, 260, 250), lerp(accent, (255, 255, 255), 0.35))
    soft_blob(d, (90, 100, 210, 220), lerp(accent, (255, 240, 235), 0.2))
    d.rounded_rectangle([70, 180, 230, 260], radius=28, fill=(255, 255, 255, 180))
    img = img.filter(ImageFilter.GaussianBlur(1))
    img.save(OUT / name, quality=90)


def avatar(name, accent):
    size = (200, 200)
    img = radial_bg(size, lerp(accent, (255, 255, 255), 0.4), accent)
    d = ImageDraw.Draw(img)
    d.ellipse([30, 25, 170, 175], fill=lerp(accent, (255, 250, 245), 0.25))
    d.ellipse([65, 70, 135, 120], fill=(120, 90, 80))
    d.arc([55, 95, 145, 165], 10, 170, fill=(130, 95, 85), width=4)
    m = Image.new("L", size, 0)
    md = ImageDraw.Draw(m)
    md.ellipse([0, 0, 199, 199], fill=255)
    bg = Image.new("RGB", size, lerp(accent, (255, 255, 255), 0.35))
    bg.paste(img, mask=m)
    bg.save(OUT / name, quality=90)


def promo_banner():
    img = radial_bg((800, 300), (235, 215, 200), (190, 155, 135))
    d = ImageDraw.Draw(img)
    soft_blob(d, (480, 20, 780, 280), (255, 245, 238))
    soft_blob(d, (520, 60, 720, 240), (240, 210, 195))
    img.save(OUT / "promo-butler.jpg", quality=90)


def cta_thumb():
    project_thumb("cta-skin.jpg", (210, 185, 170))


def qr_code():
    """Simple QR-like pattern for static demo."""
    n = 33
    cell = 12
    pad = 16
    size = n * cell + pad * 2
    img = Image.new("RGB", (size, size), "white")
    d = ImageDraw.Draw(img)

    def draw_finder(x, y):
        d.rectangle([x, y, x + 7 * cell, y + 7 * cell], fill="black")
        d.rectangle([x + cell, y + cell, x + 6 * cell, y + 6 * cell], fill="white")
        d.rectangle([x + 2 * cell, y + 2 * cell, x + 5 * cell, y + 5 * cell], fill="black")

    draw_finder(pad, pad)
    draw_finder(size - pad - 7 * cell, pad)
    draw_finder(pad, size - pad - 7 * cell)

    rng = random.Random(7)
    for row in range(n):
        for col in range(n):
            x = pad + col * cell
            y = pad + row * cell
            if row < 8 and col < 8:
                continue
            if row < 8 and col >= n - 8:
                continue
            if row >= n - 8 and col < 8:
                continue
            if rng.random() > 0.52:
                d.rectangle([x, y, x + cell - 1, y + cell - 1], fill="black")
    img.save(OUT / "member-qr.png")


def main():
    spa_hero()
    promo_banner()
    cta_thumb()
    project_thumb("project-clean.jpg", (195, 175, 160))
    project_thumb("project-hydrate.jpg", (170, 195, 210))
    project_thumb("project-antiaging.jpg", (185, 165, 175))
    project_thumb("project-whiten.jpg", (220, 205, 195))
    project_thumb("project-bubble.jpg", (200, 185, 175))
    project_thumb("project-blackhead.jpg", (180, 170, 165))
    project_thumb("project-acne.jpg", (205, 180, 170))
    avatar("avatar-customer.jpg", (210, 175, 160))
    avatar("avatar-staff.jpg", (175, 155, 145))
    avatar("avatar-customer2.jpg", (200, 170, 165))
    avatar("avatar-customer3.jpg", (215, 185, 175))
    qr_code()
    print("Generated", len(list(OUT.glob("*"))), "files in", OUT)


if __name__ == "__main__":
    main()
