"""
Generates QuickExpenses' app icon and every derived asset from one simple,
flat, on-brand mark (a receipt + a checkmark badge) instead of the old
multi-coin illustrated collage. Pure PIL geometry -- no external assets,
no font-glyph dependency, so it renders identically everywhere.

Run: python scripts/gen_icon.py
"""
from PIL import Image, ImageDraw

# ---- Brand colors (matches src/constants/theme.ts) -----------------------
BG_TOP    = (10, 132, 255)    # close to theme accent #007AFF, lifted a touch
BG_BOTTOM = (0, 86, 214)      # subtle depth, not a loud gradient
WHITE     = (255, 255, 255)
BAR       = (191, 224, 255)   # soft tint for the receipt's line-item bars
BADGE     = (48, 209, 88)     # iOS-green, reads as "settled / good"

CANVAS = 1024


def vertical_gradient(size, top, bottom):
    img = Image.new('RGB', (1, size), 0)
    for y in range(size):
        t = y / (size - 1)
        r = round(top[0] + (bottom[0] - top[0]) * t)
        g = round(top[1] + (bottom[1] - top[1]) * t)
        b = round(top[2] + (bottom[2] - top[2]) * t)
        img.putpixel((0, y), (r, g, b))
    return img.resize((size, size))


def receipt_polygon(x0, y0, x1, y1, teeth=6, tooth_depth=0.085):
    """A simple ticket/receipt outline: square top, zigzag ("torn") bottom."""
    w = x1 - x0
    depth = w * tooth_depth
    pts = [(x0, y0), (x1, y0), (x1, y1)]
    # Zigzag from bottom-right to bottom-left.
    step = w / (teeth * 2)
    x = x1
    toggle_down = True
    for i in range(teeth * 2):
        x -= step
        y = y1 + depth if toggle_down else y1
        pts.append((x, y))
        toggle_down = not toggle_down
    pts.append((x0, y1))
    return pts


def draw_mark(size: int) -> Image.Image:
    """The receipt + checkmark badge, drawn at `size`px, transparent bg."""
    # Supersample for crisp anti-aliased edges at every output size.
    S = 4
    big = size * S
    img = Image.new('RGBA', (big, big), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Receipt body: centered, slightly above center to leave room for the badge.
    rw, rh = big * 0.50, big * 0.62
    rx0 = (big - rw) / 2
    ry0 = big * 0.145
    rx1 = rx0 + rw
    ry1 = ry0 + rh * 0.86  # body height before the zigzag teeth

    # A plain square-cornered top reads cleanly as a receipt/ticket at any
    # size (the zigzag bottom alone is what signals "receipt") and is far
    # more robust than fighting anti-aliased corner subtraction at tiny
    # launcher sizes.
    poly = receipt_polygon(rx0, ry0, rx1, ry1, teeth=5, tooth_depth=0.11)
    d.polygon(poly, fill=WHITE)

    # Three line-item bars inside the receipt.
    bar_x0 = rx0 + rw * 0.16
    bar_x1 = rx1 - rw * 0.16
    bar_h = rh * 0.045
    lengths = [1.0, 0.8, 0.6]
    start_y = ry0 + rh * 0.30
    gap = rh * 0.135
    for i, frac in enumerate(lengths):
        y = start_y + i * gap
        d.rounded_rectangle(
            [bar_x0, y, bar_x0 + (bar_x1 - bar_x0) * frac, y + bar_h],
            radius=bar_h / 2, fill=BAR,
        )

    # Checkmark badge, bottom-right, overlapping the receipt's edge.
    badge_d = big * 0.40
    bx1 = rx1 + badge_d * 0.22
    by1 = ry0 + rh * 0.92
    bx0 = bx1 - badge_d
    by0 = by1 - badge_d
    # Soft halo so the badge reads as "on top of" the receipt, not stuck to it.
    halo_pad = badge_d * 0.09
    d.ellipse([bx0 - halo_pad, by0 - halo_pad, bx1 + halo_pad, by1 + halo_pad], fill=WHITE)
    d.ellipse([bx0, by0, bx1, by1], fill=BADGE)

    cx, cy = (bx0 + bx1) / 2, (by0 + by1) / 2
    r = badge_d * 0.26
    stroke = badge_d * 0.10
    p1 = (cx - r * 0.9, cy)
    p2 = (cx - r * 0.2, cy + r * 0.7)
    p3 = (cx + r, cy - r * 0.75)
    d.line([p1, p2, p3], fill=WHITE, width=round(stroke), joint='curve')
    cap = stroke / 2
    for p in (p1, p2, p3):
        d.ellipse([p[0] - cap, p[1] - cap, p[0] + cap, p[1] + cap], fill=WHITE)

    # The receipt+badge composition isn't drawn symmetrically within its own
    # canvas (the badge hangs lower-right of the receipt) -- crop to the
    # actual visible content, then re-center it, so every consumer of this
    # function gets a mark that is genuinely centered in whatever box it's
    # placed into.
    bbox = img.getbbox()
    if bbox:
        content = img.crop(bbox)
        cw, ch = content.size
        side = max(cw, ch)
        padded = Image.new('RGBA', (side, side), (0, 0, 0, 0))
        padded.alpha_composite(content, ((side - cw) // 2, (side - ch) // 2))
        img = padded

    return img.resize((size, size), Image.LANCZOS)


def rounded_square_mask(size: int, radius_frac: float) -> Image.Image:
    S = 4
    big = size * S
    m = Image.new('L', (big, big), 0)
    d = ImageDraw.Draw(m)
    d.rounded_rectangle([0, 0, big, big], radius=big * radius_frac, fill=255)
    return m.resize((size, size), Image.LANCZOS)


def make_square_icon(size: int, inset_frac: float = 0.165) -> Image.Image:
    """Full icon: gradient rounded-square background + inset mark. Used for
    icon.png, the Play Store listing icon, the favicon, and the in-app logo."""
    bg = vertical_gradient(size, BG_TOP, BG_BOTTOM).convert('RGBA')
    mask = rounded_square_mask(size, 0.223)
    bg.putalpha(mask)

    mark_size = round(size * (1 - 2 * inset_frac))
    mark = draw_mark(mark_size)
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    canvas.alpha_composite(bg)
    off = (size - mark_size) // 2
    canvas.alpha_composite(mark, (off, off))
    return canvas


def make_adaptive_foreground(size: int = 1024) -> Image.Image:
    """Android adaptive icon foreground layer: transparent background, mark
    sized to stay inside the ~66%-diameter safe zone so no launcher mask
    (circle, squircle, rounded square...) ever clips it."""
    mark_size = round(size * 0.58)
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    mark = draw_mark(mark_size)
    off = (size - mark_size) // 2
    canvas.alpha_composite(mark, (off, off))
    return canvas


def make_feature_graphic(w: int = 1024, h: int = 500) -> Image.Image:
    """Play Store feature graphic: the new mark + wordmark on the same
    gradient, replacing the old busy icon + "QuickExpenses" collage."""
    from PIL import ImageFont

    bg = vertical_gradient(h, (13, 122, 255), (0, 90, 220)).convert('RGB')
    bg = bg.resize((w, h))
    canvas = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    canvas.paste(bg, (0, 0))
    d = ImageDraw.Draw(canvas)

    icon_size = round(h * 0.66)
    icon = make_square_icon(icon_size, inset_frac=0.165)
    icon_y = (h - icon_size) // 2
    icon_x = round(h * 0.22)
    canvas.alpha_composite(icon, (icon_x, icon_y))

    text_x = icon_x + icon_size + round(h * 0.14)
    available = w - text_x - round(h * 0.06)

    title_size = 72
    title_font = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', title_size)
    while d.textlength('QuickExpenses', font=title_font) > available and title_size > 30:
        title_size -= 2
        title_font = ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf', title_size)
    sub_font = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', round(title_size * 0.46))

    title_y = h * 0.34
    d.text((text_x, title_y), 'QuickExpenses', font=title_font, fill=WHITE)
    d.text((text_x, title_y + title_size * 1.18), 'Fast, private expense tracking',
           font=sub_font, fill=(230, 240, 255))

    return canvas.convert('RGB')


if __name__ == '__main__':
    import os
    out = os.path.join(os.path.dirname(__file__), '..', 'assets')

    # Keep the alpha channel on every one of these -- they're a rounded
    # square on a transparent canvas. Converting to RGB without compositing
    # onto a real background first turns every "transparent" corner pixel
    # solid black, since the RGBA canvas's unset RGB there is (0,0,0).
    icon = make_square_icon(1024)
    icon.save(os.path.join(out, 'icon.png'), optimize=True)

    splash = make_square_icon(1024)
    splash.save(os.path.join(out, 'splash-icon.png'), optimize=True)

    adaptive = make_adaptive_foreground(1024)
    adaptive.save(os.path.join(out, 'adaptive-icon.png'), optimize=True)

    store = make_square_icon(512)
    store.save(os.path.join(out, 'store-icon-512.png'), optimize=True)

    favicon = make_square_icon(256)
    favicon.save(os.path.join(out, 'favicon.png'), optimize=True)

    logo = make_square_icon(144)
    logo.save(os.path.join(out, 'logo.png'), optimize=True)

    feature = make_feature_graphic()
    feature.save(os.path.join(out, 'feature-graphic.png'), optimize=True)

    print('done')
