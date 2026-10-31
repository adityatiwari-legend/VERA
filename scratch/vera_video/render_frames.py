# VERA motion graphics v2 - 90s @ 30fps 1920x1080, supersampled 1.5x
# Scenes: 1 Problem 0-10 | 2 Title 10-16 | 3 Pipeline 16-50 | 4 Product 50-62
#         5 Features 62-74 | 6 Metrics 74-82 | 7 Outro 82-90
import math
import os
import random

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1920, 1080
SS = 1.5
CW, CH = int(W * SS), int(H * SS)
FPS = 30
DUR = 90.0
NF = int(DUR * FPS)
HERE = os.path.dirname(os.path.abspath(__file__))
FRAMES = os.path.join(HERE, "frames")
os.makedirs(FRAMES, exist_ok=True)

MINT = (0, 245, 155)
CYAN = (56, 189, 248)
INDIGO = (129, 140, 248)
VIOLET = (167, 139, 250)
AMBER = (251, 191, 36)
ROSE = (251, 113, 133)
WHITE = (240, 240, 245)
ZINC = (161, 161, 170)
DIM = (122, 122, 132)
CARD = (18, 18, 22)

_FP = {
    "black": "C:/Windows/Fonts/ariblk.ttf",
    "bold": "C:/Windows/Fonts/segoeuib.ttf",
    "semib": "C:/Windows/Fonts/seguisb.ttf",
    "reg": "C:/Windows/Fonts/segoeui.ttf",
    "light": "C:/Windows/Fonts/segoeuil.ttf",
    "ital": "C:/Windows/Fonts/segoeuii.ttf",
    "mono": "C:/Windows/Fonts/consola.ttf",
    "monob": "C:/Windows/Fonts/consolab.ttf",
}
for k, v in list(_FP.items()):
    if not os.path.exists(v):
        _FP[k] = _FP["bold"]

_fc = {}


def F(style, size):
    k = (style, int(size * SS))
    if k not in _fc:
        _fc[k] = ImageFont.truetype(_FP[style], int(size * SS))
    return _fc[k]


def measure(fnt, s):
    return fnt.getlength(s) / SS


class SD:
    def __init__(self, im):
        self.d = ImageDraw.Draw(im, "RGBA")

    def _b(self, b):
        return [b[0] * SS, b[1] * SS, b[2] * SS, b[3] * SS]

    def _p(self, p):
        return (p[0] * SS, p[1] * SS)

    def line(self, pts, fill=None, width=1, joint="curve"):
        self.d.line([self._p(p) for p in pts], fill=fill,
                    width=max(1, int(width * SS)), joint=joint)

    def ellipse(self, b, fill=None, outline=None, width=1):
        self.d.ellipse(self._b(b), fill=fill, outline=outline,
                       width=max(1, int(width * SS)))

    def rectangle(self, b, fill=None, outline=None, width=1):
        self.d.rectangle(self._b(b), fill=fill, outline=outline,
                         width=max(1, int(width * SS)))

    def rounded_rectangle(self, b, radius=10, fill=None, outline=None, width=1):
        self.d.rounded_rectangle(self._b(b), radius=radius * SS, fill=fill,
                                 outline=outline, width=max(1, int(width * SS)))

    def arc(self, b, start, end, fill=None, width=1):
        self.d.arc(self._b(b), start, end, fill=fill,
                   width=max(1, int(width * SS)))

    def polygon(self, pts, fill=None, outline=None):
        self.d.polygon([self._p(p) for p in pts], fill=fill, outline=outline)

    def text(self, xy, s, font, fill=None, anchor=None):
        self.d.text((xy[0] * SS, xy[1] * SS), s, font=font, fill=fill, anchor=anchor)


def clamp01(x):
    return 0.0 if x < 0 else (1.0 if x > 1 else x)


def lerp(a, b, t):
    return a + (b - a) * t


def seg(t, a, b):
    if b <= a:
        return 1.0
    return clamp01((t - a) / (b - a))


def eo(t):
    t = clamp01(t)
    return 1 - (1 - t) ** 3


def eio(t):
    t = clamp01(t)
    return t * t * (3 - 2 * t)


def eob(t, s=1.70158):
    t = clamp01(t)
    t -= 1.0
    return 1.0 + (t * t * ((s + 1.0) * t + s))


def A(rgb, al):
    return (rgb[0], rgb[1], rgb[2], int(255 * clamp01(al)))


def tracked(d, cx, y, s, fnt, rgb, alpha=1.0, tr=0.0):
    if alpha <= 0.01:
        return 0.0
    widths = [measure(fnt, ch) for ch in s]
    total = sum(widths) + tr * max(0, len(s) - 1)
    x = cx - total / 2
    for ch, wd in zip(s, widths):
        d.text((x, y), ch, fnt, A(rgb, alpha))
        x += wd + tr
    return total


def partial_line(d, pts, p, fill, width=4):
    if p <= 0.01:
        return
    lens = [0.0]
    for i in range(1, len(pts)):
        lens.append(lens[-1] + math.dist(pts[i - 1], pts[i]))
    total = lens[-1]
    target = total * clamp01(p)
    acc = [pts[0]]
    for i in range(1, len(pts)):
        if lens[i] <= target:
            acc.append(pts[i])
        else:
            f = (target - lens[i - 1]) / max(1e-9, lens[i] - lens[i - 1])
            acc.append((lerp(pts[i - 1][0], pts[i][0], f),
                        lerp(pts[i - 1][1], pts[i][1], f)))
            break
    d.line(acc, fill=fill, width=width)


def draw_check(d, cx, cy, r, rgb, alpha, p):
    pts = [(cx - 0.62 * r, cy + 0.02 * r), (cx - 0.18 * r, cy + 0.45 * r),
           (cx + 0.65 * r, cy - 0.42 * r)]
    partial_line(d, pts, p, A(rgb, alpha), 5)


def inr(v):
    v = int(v)
    s = str(v)
    if len(s) <= 3:
        return s
    head, tail = s[:-3], s[-3:]
    parts = []
    while len(head) > 2:
        parts.insert(0, head[-2:])
        head = head[:-2]
    if head:
        parts.insert(0, head)
    return ",".join(parts + [tail])


# ---------------- background / particles / sprites ----------------
def make_bg():
    base = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(base)
    for y in range(H):
        f = y / H
        d.line([(0, y), (W, y)],
               fill=(int(lerp(8, 14, f)), int(lerp(9, 17, f)), int(lerp(12, 26, f))))
    m = Image.new("L", (W, H), 0)
    ImageDraw.Draw(m).ellipse([-W * 0.28, -H * 0.42, W * 1.28, H * 1.42], fill=255)
    m = m.filter(ImageFilter.GaussianBlur(160)).point(lambda p: int(255 - (255 - p) * 0.42))
    base = Image.composite(base, Image.new("RGB", (W, H), (0, 0, 0)), m)
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(ov)
    st = 90
    for yy in range(st // 2, H, st):
        for xx in range(st // 2, W, st):
            od.ellipse([xx - 1, yy - 1, xx + 1, yy + 1], fill=(200, 220, 255, 9))
    return Image.alpha_composite(base.convert("RGBA"), ov)


BG = make_bg()

rnd = random.Random(7)
PARTS = []
for i in range(56):
    PARTS.append(dict(x=rnd.uniform(0, W), y=rnd.uniform(0, H),
                      r=rnd.uniform(1.2, 3.0), s=rnd.uniform(6, 22),
                      ph=rnd.uniform(0, 6.28),
                      c=MINT if rnd.random() < 0.6 else CYAN,
                      a=rnd.uniform(0.05, 0.18)))
PARTS2 = []
for i in range(26):
    PARTS2.append(dict(x=rnd.uniform(0, W), y=rnd.uniform(0, H),
                       r=rnd.uniform(3.2, 5.5), s=rnd.uniform(26, 44),
                       ph=rnd.uniform(0, 6.28),
                       c=MINT if rnd.random() < 0.5 else INDIGO,
                       a=rnd.uniform(0.03, 0.08)))


def draw_particles(d, t):
    for p in PARTS2:
        y = (p["y"] - p["s"] * t) % (H + 60) - 30
        x = p["x"] + math.sin(t * 0.4 + p["ph"]) * 18
        d.ellipse([x - p["r"], y - p["r"], x + p["r"], y + p["r"]], fill=A(p["c"], p["a"]))
    for p in PARTS:
        y = (p["y"] - p["s"] * t) % (H + 40) - 20
        x = p["x"] + math.sin(t * 0.5 + p["ph"]) * 14
        a = p["a"] * (0.6 + 0.4 * math.sin(t * 1.3 + p["ph"]))
        d.ellipse([x - p["r"], y - p["r"], x + p["r"], y + p["r"]], fill=A(p["c"], a))


def glow_sprite(radius, rgb, alpha):
    r = radius * SS
    s = int(r * 8)
    sp = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    ImageDraw.Draw(sp).ellipse([s / 2 - r, s / 2 - r, s / 2 + r, s / 2 + r],
                               fill=A(rgb, alpha))
    return sp.filter(ImageFilter.GaussianBlur(r * 0.9))


GLOW_SOFT = glow_sprite(26, MINT, 0.5)
GLOW_BIG = glow_sprite(90, MINT, 0.55)
GLOW_CYAN = glow_sprite(26, CYAN, 0.5)
GLOW_INDIGO = glow_sprite(26, INDIGO, 0.5)

# aurora backdrop sprites (slow drifting color fields) - built at final pixel
# size so pasting never resizes (per-frame resize of huge sprites is the hot spot)
def aurora_sprite(diam_px, rgb, alpha):
    s = diam_px
    sp = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    ImageDraw.Draw(sp).ellipse([4, 4, s - 4, s - 4], fill=A(rgb, alpha))
    return sp.filter(ImageFilter.GaussianBlur(s * 0.22))


AUR1 = aurora_sprite(1250, MINT, 0.10)
AUR2 = aurora_sprite(1500, INDIGO, 0.09)
AUR3 = aurora_sprite(1050, CYAN, 0.07)


def paste_glow(ov, sp, x, y, scale=1.0, fade=1.0):
    if fade <= 0.01:
        return
    if abs(scale - 1.0) > 1e-3:
        w = int(sp.width * scale)
        if w < 4:
            return
        sp2 = sp.resize((w, w), Image.BILINEAR)
    else:
        sp2 = sp
    if fade < 0.99:
        al = sp2.getchannel("A").point(lambda p: int(p * fade))
        sp2 = sp2.copy()
        sp2.putalpha(al)
    ov.alpha_composite(sp2, (int(x * SS - sp2.width / 2), int(y * SS - sp2.height / 2)))


def draw_aurora(ov, t):
    fade = seg(t, 0.0, 4.0)
    paste_glow(ov, AUR1, 360 + 140 * math.sin(t * 0.11), 300 + 100 * math.cos(t * 0.09), 1.0, fade)
    paste_glow(ov, AUR2, 1580 + 130 * math.cos(t * 0.10 + 2.0), 760 + 90 * math.sin(t * 0.08 + 1.0), 1.0, fade)
    paste_glow(ov, AUR3, 960 + 200 * math.sin(t * 0.06 + 4.0), 120 + 60 * math.cos(t * 0.07), 1.0, fade)


# light-sweep band sprite (for wordmark shimmer)
def make_band():
    w = int(300 * SS)
    h = int(CH * 1.25)
    g = np.abs(np.linspace(-1.0, 1.0, w)) ** 1.6 * 255
    col = np.zeros((h, w, 4), dtype=np.uint8)
    col[:, :, 0] = 255
    col[:, :, 1] = 255
    col[:, :, 2] = 255
    col[:, :, 3] = g.astype(np.uint8)
    band = Image.fromarray(col, "RGBA").rotate(15, resample=Image.BILINEAR)
    return band


BAND = make_band()
EMPTY = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))


def text_sweep(ov, mask, x_log, fade):
    if fade <= 0.01:
        return
    sw = EMPTY.copy()
    pos = int(x_log * SS - BAND.width / 2)
    sw.paste(BAND, (pos, int(CH * 0.5 - BAND.height / 2)), BAND)
    out = Image.composite(sw, EMPTY, mask)
    if fade < 0.99:
        al = out.getchannel("A").point(lambda p: int(p * fade))
        out.putalpha(al)
    ov.alpha_composite(out)


# ---------------- icons ----------------
def icon_coin(d, cx, cy, s, rgb, al, p, t):
    d.arc([cx - 38 * s, cy - 38 * s, cx + 38 * s, cy + 38 * s], -90, -90 + 360 * min(1, p),
          A(rgb, al), width=5)
    if p > 0.55:
        d.ellipse([cx - 27 * s, cy - 27 * s, cx + 27 * s, cy + 27 * s],
                  outline=A(rgb, 0.4 * al), width=2)
    d.text((cx, cy + 2), "\u20b9", F("bold", 54 * s), A(rgb, al * min(1, p * 1.4)), anchor="mm")


def icon_lock(d, cx, cy, s, rgb, al, p, t):
    p1 = seg(p, 0.0, 0.5)
    d.arc([cx - 19 * s, cy - 42 * s, cx + 19 * s, cy - 4 * s], 180, 180 + 180 * p1,
          A(rgb, al), width=5)
    p2 = seg(p, 0.35, 1.0)
    dy = (1 - p2) * 10 * s
    d.rounded_rectangle([cx - 28 * s, cy - 8 * s + dy, cx + 28 * s, cy + 36 * s + dy],
                        radius=8 * s, fill=A(rgb, 0.16 * al * p2),
                        outline=A(rgb, al * p2), width=5)
    d.ellipse([cx - 4 * s, cy + 4 * s + dy, cx + 4 * s, cy + 12 * s + dy],
              fill=A(rgb, al * p2))
    d.line([(cx, cy + 12 * s + dy), (cx, cy + 22 * s + dy)], A(rgb, al * p2), width=4)


def icon_doc(d, cx, cy, s, rgb, al, p, t):
    d.rounded_rectangle([cx - 27 * s, cy - 36 * s, cx + 27 * s, cy + 36 * s],
                        radius=6 * s, outline=A(rgb, al), width=5)
    d.line([(cx + 8 * s, cy - 36 * s), (cx + 27 * s, cy - 17 * s)], A(rgb, al), width=4)
    d.line([(cx + 8 * s, cy - 36 * s), (cx + 8 * s, cy - 17 * s), (cx + 27 * s, cy - 17 * s)],
           A(rgb, al), width=3)
    for i, (wd, yy) in enumerate([(30, -12), (38, 0), (22, 12)]):
        pi = seg(p, 0.15 + i * 0.22, 0.5 + i * 0.22)
        partial_line(d, [(cx - 16 * s, cy + yy * s),
                         (cx - 16 * s + wd * s * pi, cy + yy * s)], 1.0, A(rgb, 0.8 * al), 4)


def icon_scan(d, cx, cy, s, rgb, al, p, t):
    L = 14 * s
    for (px, py, dx, dy) in [(-1, -1, 1, 1), (1, -1, -1, 1), (-1, 1, 1, -1), (1, 1, -1, -1)]:
        x0 = cx + px * 40 * s
        y0 = cy + py * 32 * s
        d.line([(x0, y0 + dy * L), (x0, y0), (x0 + dx * L, y0)], A(rgb, al), width=5)
    for yy in (-14, 0, 14):
        partial_line(d, [(cx - 20 * s, cy + yy * s), (cx + 20 * s, cy + yy * s)],
                     1.0, A(rgb, 0.45 * al), 4)
    tri = 0.5 - 0.5 * math.cos(max(0.0, t) * 2.4)
    yl = cy + (-30 + 60 * tri) * s
    d.rectangle([cx - 36 * s, yl - 8 * s, cx + 36 * s, yl], fill=A(MINT, 0.18 * al))
    d.line([(cx - 36 * s, yl), (cx + 36 * s, yl)], A(MINT, al), width=3)
    for (sx, sy, ph) in [(-30, -28, 0), (32, 26, 2)]:
        tw = max(0.0, math.sin(t * 5 + ph))
        ll = 7 * tw
        d.line([(cx + sx * s - ll, cy + sy * s), (cx + sx * s + ll, cy + sy * s)],
               A(WHITE, al * tw), width=2)
        d.line([(cx + sx * s, cy + sy * s - ll), (cx + sx * s, cy + sy * s + ll)],
               A(WHITE, al * tw), width=2)


def icon_rings(d, cx, cy, s, rgb, al, p, t):
    pos = [(cx - 27 * s, cy + 16 * s), (cx + 27 * s, cy + 16 * s), (cx, cy - 22 * s)]
    for (x, y) in pos:
        d.ellipse([x - 20 * s, y - 20 * s, x + 20 * s, y + 20 * s],
                  outline=A(rgb, 0.5 * al), width=4)
    for idx, pr in [(0, seg(p, 0.15, 0.55)), (1, seg(p, 0.5, 0.9))]:
        x, y = pos[idx]
        d.ellipse([x - 20 * s, y - 20 * s, x + 20 * s, y + 20 * s],
                  fill=A(rgb, 0.18 * al * pr), outline=A(rgb, al), width=5)
        draw_check(d, x, y, 11 * s, rgb, al * pr, pr)
    d.ellipse([pos[2][0] - 3 * s, pos[2][1] - 3 * s, pos[2][0] + 3 * s, pos[2][1] + 3 * s],
              fill=A(rgb, 0.35 * al))


def icon_chain(d, cx, cy, s, rgb, al, p, t):
    pos = [(-44, 16), (0, -10), (44, 16)]
    half = 23 * s
    for i, (ox, oy) in enumerate(pos):
        pi = seg(p, 0.1 + i * 0.25, 0.55 + i * 0.25)
        x = cx + ox * s * pi
        y = cy + oy * s * pi
        pulse = 1.0 + (0.05 * math.sin(t * 6) if i == 2 else 0.0)
        d.rounded_rectangle([x - half * pulse, y - half * pulse, x + half * pulse, y + half * pulse],
                            radius=10 * s, fill=A(rgb, 0.13 * al * pi),
                            outline=A(rgb, al * pi), width=5)
    for i in range(2):
        pi = seg(p, 0.35 + i * 0.25, 0.75 + i * 0.25)
        x0 = cx + pos[i][0] * s
        y0 = cy + pos[i][1] * s
        x1 = cx + pos[i + 1][0] * s
        y1 = cy + pos[i + 1][1] * s
        partial_line(d, [(x0, y0), (x1, y1)], pi, A(rgb, 0.6 * al), 4)


# ---------------- scene 1: problem (0-10) ----------------
FLOAT_Q = [(742, 640, 64), (1172, 610, 92), (958, 762, 54), (856, 580, 44), (1086, 735, 66)]
RISK_CHIPS = ["NO PROOF", "BLIND TRUST", "ZERO TRACEABILITY"]


def scene1(d, ov, t):
    env = seg(t, 0.15, 0.6) * (1 - seg(t, 9.55, 9.95))
    if env <= 0.01:
        return
    a1 = seg(t, 0.4, 1.1) * (1 - seg(t, 2.6, 3.05)) * env
    if a1 > 0.01:
        dy = (1 - eo(seg(t, 0.4, 1.2))) * 60
        d.text((960, 180 + dy), "You donate.", F("black", 110), A(WHITE, a1), anchor="ma")
    ca = seg(t, 1.1, 1.4) * (1 - seg(t, 2.9, 3.35)) * env
    if ca > 0.01:
        cy = lerp(400, 480, eob(seg(t, 1.1, 1.8)))
        paste_glow(ov, GLOW_SOFT, 960, cy, 1.6, 0.5 * ca)
        d.ellipse([960 - 85, cy - 85, 960 + 85, cy + 85], fill=A(MINT, 0.08 * ca),
                  outline=A(MINT, ca), width=5)
        d.ellipse([960 - 68, cy - 68, 960 + 68, cy + 68], outline=A(MINT, 0.35 * ca), width=2)
        d.text((960, cy + 3), "\u20b9", F("bold", 92), A(WHITE, ca), anchor="mm")
        aa = seg(t, 2.0, 2.4) * (1 - seg(t, 2.9, 3.3)) * env
        if aa > 0.01:
            s = "\u20b97,50,000 \u2192 earmarked"
            fnt = F("monob", 27)
            wd = measure(fnt, s)
            d.rounded_rectangle([960 - wd / 2 - 18, 612, 960 + wd / 2 + 18, 658],
                                radius=12, fill=A(MINT, 0.08 * aa),
                                outline=A(MINT, 0.45 * aa), width=2)
            d.text((960, 635), s, fnt, A(MINT, aa), anchor="mm")
    qa = seg(t, 3.5, 4.15) * env
    if qa > 0.01:
        dy = (1 - eo(seg(t, 3.5, 4.2))) * 40
        f1 = F("bold", 76)
        f2 = F("bold", 86)
        w1 = measure(f1, "But where does it go")
        w2 = measure(f2, "?")
        x0 = 960 - (w1 + w2 + 8) / 2
        d.text((x0, 648 + dy), "But where does it go", f1, A(WHITE, qa))
        d.text((x0 + w1 + 8, 644 + dy), "?", f2, A(ROSE, qa))
    for i, (qx, qy, qs) in enumerate(FLOAT_Q):
        aq = seg(t, 4.0 + i * 0.18, 4.6 + i * 0.18) * (1 - seg(t, 6.6, 7.1)) * env
        if aq <= 0.01:
            continue
        pulse = 0.55 + 0.45 * math.sin(t * 2.2 + i * 1.7)
        col = ROSE if i % 2 == 0 else CYAN
        d.text((qx, qy - (t - 4.0) * 7 + math.sin(t + i) * 8), "?", F("bold", qs),
               A(col, 0.38 * aq * pulse))
    fnt = F("monob", 26)
    widths = [measure(fnt, s) + 44 for s in RISK_CHIPS]
    total = sum(widths) + 22 * 2
    x = 960 - total / 2
    for i, s in enumerate(RISK_CHIPS):
        a = seg(t, 5.6 + i * 0.3, 5.95 + i * 0.3) * env
        if a > 0.01:
            dy = (1 - eob(seg(t, 5.6 + i * 0.3, 6.05 + i * 0.3))) * 26
            d.rounded_rectangle([x, 758 + dy, x + widths[i], 806 + dy], radius=13,
                                fill=A(ROSE, 0.07 * a), outline=A(ROSE, 0.6 * a), width=2)
            d.text((x + widths[i] / 2, 782 + dy), s, fnt, A(ROSE, a), anchor="mm")
        x += widths[i] + 22
    ta = seg(t, 7.7, 8.35) * env
    if ta > 0.01:
        d.text((960, 858), "Trust shouldn\u2019t be blind.", F("semib", 50),
               A(AMBER, ta), anchor="ma")


# ---------------- scene 2: title (10-16) ----------------
_s2_layer = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
_sd2 = SD(_s2_layer)
_s2_widths = [measure(F("black", 330), ch) for ch in "VERA"]
_s2_total = sum(_s2_widths) + 42 * 3
_s2_xs = []
_x = 960 - _s2_total / 2
for _wd in _s2_widths:
    _s2_xs.append(_x)
    _x += _wd + 42
for _ch, _xx in zip("VERA", _s2_xs):
    _sd2.text((_xx, 360), _ch, F("black", 330), A(WHITE, 255))
_s2_mask = _s2_layer.getchannel("A")
_g1 = _s2_layer.filter(ImageFilter.GaussianBlur(12 * SS))
_g2 = _s2_layer.filter(ImageFilter.GaussianBlur(28 * SS))
_s2_layer = None

_s5_layer = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
tracked(SD(_s5_layer), 960, 655, "VERA", F("black", 150), WHITE, 1.0, tr=26)
_s5_mask = _s5_layer.getchannel("A")
_g5a = _s5_layer.filter(ImageFilter.GaussianBlur(10 * SS))
_g5b = _s5_layer.filter(ImageFilter.GaussianBlur(22 * SS))
_s5_layer = None


def scene2(d, ov, t):
    env = seg(t, 10.0, 10.3) * (1 - seg(t, 15.6, 15.95))
    if env <= 0.01:
        return
    bs = eio(seg(t, 10.0, 10.9))
    if bs > 0.01:
        paste_glow(ov, GLOW_BIG, 960, 540, 0.3 + bs * 3.2, (1 - bs) * 0.9 * env)
    ga = env * (1 - seg(t, 15.2, 15.65))
    glow_a = ga * seg(t, 10.55, 10.95)
    if glow_a > 0.01:
        f = 0.5 + 0.5 * math.sin(2 * math.pi * 0.9 * (t - 10))
        gl = Image.blend(_g1, _g2, f)
        al = gl.getchannel("A").point(lambda p: int(p * 0.85 * glow_a))
        gl.putalpha(al)
        ov.alpha_composite(gl)
    for i, (ch, xx) in enumerate(zip("VERA", _s2_xs)):
        t0 = 10.05 + i * 0.15
        la = seg(t, t0, t0 + 0.3) * ga
        if la <= 0.01:
            continue
        dy = (1 - eob(seg(t, t0, t0 + 0.55))) * 110
        d.text((xx, 360 + dy), ch, F("black", 330), A(WHITE, la))
    sw = seg(t, 11.3, 12.05)
    if 0 < sw < 1:
        text_sweep(ov, _s2_mask, lerp(-260, 2180, eo(sw)), math.sin(sw * math.pi) * 0.95)
    ua = seg(t, 10.95, 11.5) * (1 - seg(t, 15.25, 15.7)) * env
    if ua > 0.01:
        w = 920 * eio(seg(t, 10.95, 11.5))
        d.rounded_rectangle([960 - w / 2, 762, 960 + w / 2, 772], radius=5, fill=A(MINT, ua))
    sa = seg(t, 11.25, 11.95) * env
    if sa > 0.01:
        dy = (1 - eo(seg(t, 11.25, 11.85))) * 24
        tracked(d, 960, 810 + dy, "VERIFIABLE EVIDENCE & REAL AUDITING",
                F("monob", 40), CYAN, sa, tr=8)
    ta = seg(t, 12.5, 13.2) * env
    if ta > 0.01:
        d.text((960, 884), "Every rupee. Traced end to end.", F("light", 54),
               A(WHITE, 0.92 * ta), anchor="ma")
    aa = seg(t, 13.8, 14.4) * env
    if aa > 0.01:
        tracked(d, 960, 948, "FOR DONORS \u00b7 NGOS \u00b7 AUDITORS",
                F("mono", 24), DIM, aa, tr=8)


# ---------------- scene 3: pipeline (16-50) ----------------
S3 = 16.0
S3_STEPS = 17.6
WSTEP = 5.4
NODE_X = [200, 504, 808, 1112, 1416, 1720]
NODE_Y = 520

NODES = [
    ("DONATE", "A donor gives to a campaign", "earmarked the moment it lands \u2014 no commingling",
     icon_coin, MINT),
    ("ESCROW", "Funds lock in escrow", "milestone budgets capped, nothing moves early",
     icon_lock, CYAN),
    ("PROOF", "NGO submits evidence", "receipts fingerprinted with SHA-256",
     icon_doc, INDIGO),
    ("VERIFY", "AI scans \u2014 a human verifies", "Gemini OCR + certified auditor review",
     icon_scan, VIOLET),
    ("MULTISIG", "2-of-3 multisig approval", "two signatures required, no single point of trust",
     icon_rings, AMBER),
    ("ON-CHAIN", "Smart contract releases funds", "on-chain tx hash, verifiable by anyone",
     icon_chain, MINT),
]


def scene3(d, ov, t):
    env = seg(t, S3, S3 + 0.35) * (1 - seg(t, 49.55, 49.95))
    if env <= 0.01:
        return
    ha = seg(t, S3 + 0.1, S3 + 0.7) * env
    if ha > 0.01:
        dy = (1 - eo(seg(t, S3 + 0.1, S3 + 0.7))) * 30
        d.text((960, 138 + dy), "How VERA traces your donation", F("bold", 62),
               A(WHITE, ha), anchor="ma")
    sa = seg(t, S3 + 0.35, S3 + 0.95) * env
    if sa > 0.01:
        d.text((960, 216), "the complete journey of a donation \u2014 end to end",
               F("light", 33), A(ZINC, sa), anchor="ma")
    cur = min(5, max(0, int((t - S3_STEPS) / WSTEP))) if t >= S3_STEPS else 0
    if t >= S3_STEPS:
        d.text((1740, 152), f"STEP {cur + 1} / 6", F("mono", 26), A(DIM, 0.75 * env), anchor="rm")
    # base line draw-on then full
    base_end = lerp(NODE_X[0], NODE_X[5], eio(seg(t, S3 + 0.3, S3 + 1.2)))
    d.line([(NODE_X[0], NODE_Y), (base_end, NODE_Y)], A((255, 255, 255), 1), width=5)
    # progress + head
    st = S3_STEPS + cur * WSTEP
    u = seg(t, st + 3.6, st + WSTEP)
    head = lerp(NODE_X[cur], NODE_X[min(5, cur + 1)], eio(u)) if cur < 5 else NODE_X[5]
    if t > S3_STEPS:
        d.line([(NODE_X[0], NODE_Y), (head, NODE_Y)], A(MINT, 0.16), width=16)
        d.line([(NODE_X[0], NODE_Y), (head, NODE_Y)], A(MINT, 0.9), width=5)
        paste_glow(ov, GLOW_SOFT, head, NODE_Y, 1 + 0.15 * math.sin(t * 10), 0.9)
        d.ellipse([head - 7, NODE_Y - 7, head + 7, NODE_Y + 7], fill=A(WHITE, 0.95))
    # nodes
    for i, (label, cap, desc, ifn, accent) in enumerate(NODES):
        nst = S3_STEPS + i * WSTEP
        intro_t = S3 + 0.5 + i * 0.16
        active = t >= nst
        aa = (seg(t, nst, nst + 0.3) if active else seg(t, intro_t, intro_t + 0.3)) * env
        if aa <= 0.01:
            continue
        cx = NODE_X[i]
        sc = 0.82 + 0.18 * eob(seg(t, intro_t, intro_t + 0.5))
        cw, chh = 216 * sc, 148 * sc
        if active:
            flash = (1 - seg(t, nst, nst + 0.9)) * 0.55
            if flash > 0.02:
                paste_glow(ov, GLOW_SOFT if accent is not AMBER else GLOW_CYAN,
                           cx, NODE_Y, 1.3, flash)
            d.rounded_rectangle([cx - cw / 2, NODE_Y - chh / 2, cx + cw / 2, NODE_Y + chh / 2],
                                radius=18 * sc, fill=A(CARD, 0.97 * aa))
            d.rounded_rectangle([cx - cw / 2, NODE_Y - chh / 2, cx + cw / 2, NODE_Y + chh / 2],
                                radius=18 * sc, fill=A(accent, 0.16 * aa),
                                outline=A(accent, 0.95 * aa), width=3)
        else:
            d.rounded_rectangle([cx - cw / 2, NODE_Y - chh / 2, cx + cw / 2, NODE_Y + chh / 2],
                                radius=18 * sc, fill=A(CARD, 0.97 * aa),
                                outline=A((255, 255, 255), 0.10 * aa), width=2)
        d.text((cx - 92 + 12, 458), f"0{i + 1}", F("monob", 22),
               A(accent if active else DIM, (0.9 if active else 0.7) * aa))
        icol = accent if active else ZINC
        ifn(d, cx, NODE_Y + 8, 0.92, icol, aa if active else 0.55 * aa,
            seg(t, nst, nst + 1.2) if active else 0.0, t - nst if active else 0.0)
        d.text((cx, 612), label, F("bold", 33),
               A(WHITE, (0.95 if active else 0.42) * aa), anchor="ma")
    # receipt rider
    if t >= S3_STEPS and cur < 5:
        dep, arr = st + 3.6, st + WSTEP
        if 0 < seg(t, dep, arr) < 1:
            uu = seg(t, dep, arr)
            rx = lerp(NODE_X[cur], NODE_X[cur + 1], eio(uu))
            ra = eio(seg(t, dep, dep + 0.35)) * (1 - eio(seg(t, arr - 0.35, arr)))
            bob = math.sin(t * 7) * 5
            ry = 395 + bob
            paste_glow(ov, GLOW_SOFT, rx, ry, 0.5, 0.4 * ra)
            d.rounded_rectangle([rx - 17, ry - 24, rx + 17, ry + 24], radius=5,
                                fill=A(CARD, ra), outline=A(MINT, 0.9 * ra), width=2)
            d.line([(rx + 6, ry - 24), (rx + 17, ry - 13)], A(MINT, 0.8 * ra), width=2)
            for k in range(3):
                d.line([(rx - 10, ry - 12 + k * 9), (rx + 10, ry - 12 + k * 9)],
                       A(MINT, 0.55 * ra), width=2)
    # caption
    stc = S3_STEPS + cur * WSTEP
    ca = seg(t, stc + 0.25, stc + 0.6) * (1 - seg(t, stc + WSTEP - 0.3, stc + WSTEP)) * env
    if ca > 0.01 and t >= S3_STEPS:
        label, cap, desc, ifn, accent = NODES[cur]
        dy = (1 - eo(seg(t, stc + 0.25, stc + 0.85))) * 26
        d.text((960, 800 + dy), cap, F("bold", 54), A(WHITE, ca), anchor="ma")
        d.text((960, 876 + dy), desc, F("light", 31), A(ZINC, ca), anchor="ma")
        d.rounded_rectangle([960 - 26, 770 + dy, 960 + 26, 776 + dy], radius=3,
                            fill=A(accent, ca))
    fa = seg(t, 47.6, 48.4) * env
    if fa > 0.01:
        s = "\u2192  PUBLIC AUDIT TRAIL"
        fnt = F("monob", 30)
        wd = measure(fnt, s)
        d.rounded_rectangle([960 - wd / 2 - 20, 934, 960 + wd / 2 + 20, 984],
                            radius=13, fill=A(MINT, 0.10 * fa),
                            outline=A(MINT, 0.8 * fa), width=2)
        d.text((960, 959), s, fnt, A(MINT, fa), anchor="mm")


# ---------------- scene 4: product surfaces (50-62) ----------------
PANEL_HDRS = ["PUBLIC AUDIT DASHBOARD", "TRACE MY DONATION", "NGO REPUTATION INDEX"]
BARS = [("TARGET", 1000000, 1.0, ZINC), ("RAISED", 750000, 0.75, MINT),
        ("IN ESCROW", 465000, 0.465, CYAN), ("RELEASED", 285000, 0.285, AMBER)]
TRACE_STEPS = ["Donation received", "Escrow locked", "Milestone allocated",
               "Proof verified", "Released on-chain"]


def glass_panel(d, ov, x0, y0, w, h, accent, a):
    paste_glow(ov, GLOW_INDIGO if accent is INDIGO else GLOW_SOFT, x0 + w / 2, y0 + h / 2,
               3.4, 0.10 * a)
    d.rounded_rectangle([x0, y0, x0 + w, y0 + h], radius=24, fill=A(CARD, 0.96 * a),
                        outline=A((255, 255, 255), 0.09 * a), width=2)
    d.rounded_rectangle([x0 + 24, y0 + 20, x0 + 124, y0 + 26], radius=3, fill=A(accent, a))
    d.line([(x0 + 24, y0 + 40), (x0 + 24, y0 + h - 24)], A((255, 255, 255), 0.05 * a), width=1)


def scene4(d, ov, t):
    env = seg(t, 50.0, 50.35) * (1 - seg(t, 61.55, 61.95))
    if env <= 0.01:
        return
    # panel
    pa = seg(t, 50.2, 50.9) * env
    if pa <= 0.01:
        return
    dy = (1 - eob(seg(t, 50.2, 50.95))) * 60
    x0, y0, pw, ph = 460, 270 + dy, 1000, 580
    beats = [(50.5, 54.2, MINT), (54.4, 58.2, CYAN), (58.4, 61.9, INDIGO)]
    b_idx = 0 if t < 54.4 else (1 if t < 58.4 else 2)
    accent = beats[b_idx][2]
    glass_panel(d, ov, x0, y0, pw, ph, accent, pa)
    # header chip (crossfades between beats)
    for i, (bs, be, bc) in enumerate(beats):
        ha = seg(t, bs + 0.1, bs + 0.5) * (1 - seg(t, be - 0.05, be + 0.25))
        if ha <= 0.01:
            continue
        s = PANEL_HDRS[i]
        fnt = F("monob", 27)
        wd = measure(fnt, s)
        d.rounded_rectangle([960 - wd / 2 - 22, y0 + 40, 960 + wd / 2 + 22, y0 + 88],
                            radius=13, fill=A(bc, 0.10 * ha * pa),
                            outline=A(bc, 0.7 * ha * pa), width=2)
        d.text((960, y0 + 64), s, fnt, A(bc, ha * pa), anchor="mm")
    # beat 1: funding bars
    b1 = seg(t, 50.6, 51.0) * (1 - seg(t, 54.0, 54.35)) * pa
    if b1 > 0.01:
        d.text((960, y0 + 118), "Campaign \u00b7 Government School \u2014 Jaipur",
               F("light", 28), A(WHITE, 0.85 * b1), anchor="ma")
        for i, (lab, val, frac, col) in enumerate(BARS):
            t0 = 50.9 + i * 0.3
            a = seg(t, t0, t0 + 0.35) * b1
            if a <= 0.01:
                continue
            yb = y0 + 172 + i * 84
            d.text((x0 + 60, yb + 8), lab, F("monob", 22), A(ZINC, a), anchor="lm")
            roll = eio(seg(t, t0, t0 + 0.9))
            d.text((x0 + pw - 60, yb + 8), "\u20b9" + inr(val * roll),
                   F("monob", 26), A(WHITE, a), anchor="rm")
            d.rounded_rectangle([x0 + 60, yb + 30, x0 + pw - 60, yb + 52], radius=11,
                                fill=A((255, 255, 255), 0.07 * a))
            fw = (pw - 120) * frac * eio(seg(t, t0 + 0.1, t0 + 1.0))
            if fw > 24:
                d.rounded_rectangle([x0 + 60, yb + 30, x0 + 60 + fw, yb + 52], radius=11,
                                    fill=A(col, 0.85 * a))
        ca = seg(t, 53.4, 53.8) * b1
        if ca > 0.01:
            s = "OPEN TO ANYONE \u00b7 NO LOGIN REQUIRED"
            fnt = F("monob", 22)
            wd = measure(fnt, s)
            d.rounded_rectangle([960 - wd / 2 - 20, y0 + ph - 74, 960 + wd / 2 + 20, y0 + ph - 32],
                                radius=12, fill=A(MINT, 0.08 * ca), outline=A(MINT, 0.55 * ca), width=2)
            d.text((960, y0 + ph - 53), s, fnt, A(MINT, ca), anchor="mm")
    # beat 2: trace timeline
    b2 = seg(t, 54.5, 54.9) * (1 - seg(t, 57.95, 58.25)) * pa
    if b2 > 0.01:
        xs = [560 + i * 200 for i in range(5)]
        ty = y0 + 300
        d.line([(xs[0], ty), (xs[4], ty)], A((255, 255, 255), 0.10 * b2), width=5)
        prog = eio(seg(t, 54.9, 56.7))
        d.line([(xs[0], ty), (lerp(xs[0], xs[4], prog), ty)], A(MINT, 0.9 * b2), width=5)
        for i, (lx, lab) in enumerate(zip(xs, TRACE_STEPS)):
            passed = prog >= i / 4.0 - 1e-6
            a = b2 * (1.0 if passed else 0.45)
            col = MINT if passed else DIM
            if passed:
                d.ellipse([lx - 16, ty - 16, lx + 16, ty + 16], fill=A(MINT, 0.15 * a),
                          outline=A(MINT, a), width=3)
                cp = seg(t, 54.9 + i * 0.45, 55.25 + i * 0.45)
                draw_check(d, lx, ty, 9, MINT, a, cp)
            else:
                d.ellipse([lx - 14, ty - 14, lx + 14, ty + 14], outline=A(DIM, a), width=3)
            ly = ty - 78 if i % 2 == 0 else ty + 56
            d.text((lx, ly), lab, F("light", 23), A(WHITE if passed else ZINC, a), anchor="ma")
        ca = seg(t, 57.1, 57.5) * b2
        if ca > 0.01:
            s = "EVERY STEP \u00b7 TIMESTAMPED \u00b7 PUBLIC"
            fnt = F("monob", 22)
            wd = measure(fnt, s)
            d.rounded_rectangle([960 - wd / 2 - 20, y0 + ph - 74, 960 + wd / 2 + 20, y0 + ph - 32],
                                radius=12, fill=A(CYAN, 0.08 * ca), outline=A(CYAN, 0.55 * ca), width=2)
            d.text((960, y0 + ph - 53), s, fnt, A(CYAN, ca), anchor="mm")
    # beat 3: reputation gauge
    b3 = seg(t, 58.5, 58.9) * pa
    if b3 > 0.01:
        cx, cy, r = 810, y0 + 310, 150
        d.arc([cx - r, cy - r, cx + r, cy + r], 135, 405, A((255, 255, 255), 0.10 * b3), width=16)
        gp = eio(seg(t, 58.9, 60.1)) * 0.87
        if gp > 0.005:
            d.arc([cx - r, cy - r, cx + r, cy + r], 135, 135 + 270 * gp,
                  A(MINT, 0.95 * b3), width=16)
            ang = math.radians(135 + 270 * gp)
            hx, hy = cx + r * math.cos(ang), cy + r * math.sin(ang)
            paste_glow(ov, GLOW_SOFT, hx, hy, 0.45, 0.8 * b3)
        roll = eio(seg(t, 58.9, 60.1))
        d.text((cx, cy - 6), str(int(87 * roll)), F("black", 84), A(WHITE, b3), anchor="mm")
        d.text((cx, cy + 78), "/ 100 REPUTATION", F("monob", 21), A(ZINC, b3), anchor="mm")
        ga = seg(t, 59.7, 60.2) * b3
        if ga > 0.01:
            d.rounded_rectangle([1100, cy - 62, 1240, cy + 58], radius=16,
                                fill=A(MINT, 0.10 * ga), outline=A(MINT, 0.8 * ga), width=3)
            d.text((1170, cy - 22), "A", F("black", 58), A(MINT, ga), anchor="mm")
            d.text((1170, cy + 34), "GRADE", F("monob", 17), A(ZINC, ga), anchor="mm")
        d.text((960, y0 + 470), "base 100 \u00b7 public penalties & bonuses \u2014 a formula anyone can recompute",
               F("light", 26), A(ZINC, 0.9 * b3), anchor="ma")


# ---------------- scene 5: features (62-74) ----------------
CARDS4 = [
    ("Trace My Donation", "a step-by-step journey for every rupee", MINT, "trace"),
    ("Public Audit Dashboard", "open to everyone \u2014 no login required", CYAN, "chart"),
    ("NGO Reputation Index", "deterministic 0\u2013100 integrity score", INDIGO, "star"),
    ("2-of-3 Multisig On-Chain", "Solidity contract authorizes every release", AMBER, "shield"),
]
CARD_POS = [(470, 395), (1450, 395), (470, 715), (1450, 715)]


def if_trace(d, cx, cy, rgb, al, p):
    pts = [(cx - 40, cy + 18), (cx - 8, cy - 10), (cx + 20, cy + 8), (cx + 44, cy - 22)]
    partial_line(d, pts, seg(p, 0.1, 1.0), A(rgb, 0.7 * al), 4)
    for i, (x, y) in enumerate(pts):
        pi = seg(p, 0.1 + i * 0.2, 0.4 + i * 0.2)
        if pi <= 0:
            continue
        r = 7 * pi
        d.ellipse([x - r, y - r, x + r, y + r], fill=A(CARD, al), outline=A(rgb, al), width=3)
    draw_check(d, pts[3][0], pts[3][1], 8, rgb, al * seg(p, 0.75, 1.0), seg(p, 0.75, 1.0))


def if_chart(d, cx, cy, rgb, al, p):
    heights = [24, 42, 32, 56]
    bw, gap = 16, 12
    x0 = cx - (len(heights) * bw + (len(heights) - 1) * gap) / 2
    for i, hh in enumerate(heights):
        pi = eob(seg(p, 0.1 + i * 0.15, 0.6 + i * 0.15))
        d.rectangle([x0 + i * (bw + gap), cy + 30 - hh * pi,
                     x0 + i * (bw + gap) + bw, cy + 30],
                    fill=A(rgb, (0.35 if i < 3 else 0.95) * al * pi))
    d.line([(x0 - 6, cy + 32), (x0 + len(heights) * (bw + gap), cy + 32)], A(rgb, 0.5 * al), width=3)


def if_star(d, cx, cy, rgb, al, p):
    pts = []
    for k in range(10):
        ang = math.radians(-90 + k * 36)
        r = 34 if k % 2 == 0 else 15
        pts.append((cx + r * math.cos(ang), cy + r * math.sin(ang)))
    pi = eob(seg(p, 0.1, 0.7))
    if pi > 0.01:
        pp = [(lerp(cx, x, pi), lerp(cy, y, pi)) for x, y in pts]
        d.polygon(pp, fill=A(rgb, 0.15 * al), outline=A(rgb, al))
    d.text((cx, cy + 1), "0\u2013100", F("monob", 17), A(rgb, al * seg(p, 0.6, 1.0)), anchor="mm")


def if_shield(d, cx, cy, rgb, al, p):
    pts = [(cx, cy - 36), (cx + 32, cy - 24), (cx + 32, cy + 4), (cx, cy + 40),
           (cx - 32, cy + 4), (cx - 32, cy - 24)]
    pp = [(lerp(cx, x, seg(p, 0, 0.6)), lerp(cy, y, seg(p, 0, 0.6))) for x, y in pts]
    d.line(pp + [pp[0]], A(rgb, al), width=4)
    draw_check(d, cx, cy + 2, 16, rgb, al * seg(p, 0.5, 1.0), seg(p, 0.5, 1.0))


ICON4 = {"trace": if_trace, "chart": if_chart, "star": if_star, "shield": if_shield}
CHIPS4 = ["321 automated tests \u00b7 0 failing", "Next.js 14", "PostgreSQL 16",
          "Solidity 0.8.28", "Gemini AI"]


def scene5(d, ov, t):
    env = seg(t, 62.0, 62.35) * (1 - seg(t, 73.55, 73.95))
    if env <= 0.01:
        return
    ha = seg(t, 62.1, 62.65) * env
    if ha > 0.01:
        dy = (1 - eo(seg(t, 62.1, 62.65))) * 26
        d.text((960, 112 + dy), "Built for radical transparency", F("bold", 62),
               A(WHITE, ha), anchor="ma")
    for i, ((title, desc, accent, ik), (cx, cy)) in enumerate(zip(CARDS4, CARD_POS)):
        t0 = 62.3 + i * 0.4
        a = seg(t, t0, t0 + 0.55) * env
        if a <= 0.01:
            continue
        dy = (1 - eo(seg(t, t0, t0 + 0.6))) * 70
        x0, y0 = cx - 390, cy - 132 + dy
        d.rounded_rectangle([x0, y0, x0 + 780, y0 + 265], radius=20,
                            fill=A(CARD, 0.94 * a), outline=A((255, 255, 255), 0.09 * a), width=2)
        d.rounded_rectangle([x0 + 28, y0 + 22, x0 + 148, y0 + 28], radius=3, fill=A(accent, a))
        ICON4[ik](d, cx - 290, cy + dy + 6, accent, a, seg(t, t0 + 0.3, t0 + 1.3))
        d.text((cx - 210, cy + dy - 22), title, F("bold", 44), A(WHITE, a), anchor="lm")
        d.text((cx - 210, cy + dy + 32), desc, F("light", 30), A(ZINC, a), anchor="lm")
    fnt = F("monob", 24)
    widths = [measure(fnt, s) + 36 for s in CHIPS4]
    total = sum(widths) + 18 * (len(CHIPS4) - 1)
    x = 960 - total / 2
    for i, s in enumerate(CHIPS4):
        t0 = 69.6 + i * 0.14
        a = seg(t, t0, t0 + 0.35) * env
        if a > 0.01:
            first = i == 0
            c = MINT if first else ZINC
            d.rounded_rectangle([x, 922, x + widths[i], 966], radius=12,
                                fill=A((255, 255, 255), 0.045 * a),
                                outline=A(MINT if first else (255, 255, 255),
                                          (0.55 if first else 0.14) * a), width=2)
            d.text((x + widths[i] / 2, 944), s, fnt, A(c, a), anchor="mm")
        x += widths[i] + 18


# ---------------- scene 6: metrics (74-82) ----------------
STATS = [
    ("\u20b97,50,000", "campaign funds traced end to end", MINT, "roll", 750000),
    ("7", "verification steps before any release", CYAN, "roll", 7),
    ("2 / 3", "multisig signatures required to move funds", INDIGO, "pop", 0),
    ("0", "releases without recorded proof", AMBER, "zero", 0),
]
STAT_POS = [(540, 420), (1380, 420), (540, 790), (1380, 790)]


def scene6(d, ov, t):
    env = seg(t, 74.0, 74.35) * (1 - seg(t, 81.55, 81.95))
    if env <= 0.01:
        return
    ha = seg(t, 74.15, 74.7) * env
    if ha > 0.01:
        tracked(d, 960, 132, "VERA \u2014 BY THE NUMBERS", F("monob", 26), DIM, ha, tr=10)
    for i, ((num, lab, accent, kind, target), (cx, cy)) in enumerate(zip(STATS, STAT_POS)):
        t0 = 74.4 + i * 0.5
        a = seg(t, t0, t0 + 0.5) * env
        if a <= 0.01:
            continue
        dy = (1 - eo(seg(t, t0, t0 + 0.55))) * 40
        d.rounded_rectangle([cx - 32, cy - 118 + dy, cx + 32, cy - 112 + dy], radius=3,
                            fill=A(accent, a))
        if kind == "roll":
            roll = eio(seg(t, t0 + 0.2, t0 + 1.4))
            v = int(target * roll) if target > 20 else target
            txt = ("\u20b9" + inr(v)) if target > 20 else str(v)
        elif kind == "pop":
            txt = num
        else:
            txt = "0"
        d.text((cx, cy + dy), txt, F("black", 118), A(WHITE, a), anchor="mm")
        if kind == "zero":
            ring = seg(t, t0 + 0.5, t0 + 0.9)
            if ring > 0.01:
                pr = 92 + 8 * math.sin((t - t0) * 4)
                d.ellipse([cx - pr, cy + dy - pr, cx + pr, cy + dy + pr],
                          outline=A(AMBER, 0.5 * a * ring), width=3)
        d.text((cx, cy + dy + 96), lab, F("light", 29), A(ZINC, a), anchor="ma")


# ---------------- scene 7: outro (82-90) ----------------
QUOTE = ["\u201cA donor should be able to trace where",
         "their donated money goes, why it was",
         "released, and what proof was submitted.\u201d"]


def scene7(d, ov, t):
    env = seg(t, 82.0, 82.35) * (1 - seg(t, 88.9, 89.8))
    if env <= 0.01:
        return
    qa = seg(t, 82.3, 83.5) * (1 - seg(t, 85.7, 86.2)) * env
    if qa > 0.01:
        dy = (1 - eo(seg(t, 82.3, 83.3))) * 20
        for i, line in enumerate(QUOTE):
            d.text((960, 236 + i * 70 + dy), line, F("ital", 44), A(WHITE, 0.92 * qa), anchor="ma")
        d.text((960, 462 + dy), "\u2014 the VERA principle", F("mono", 26), A(MINT, qa), anchor="ma")
    ma = seg(t, 86.1, 86.6) * env
    if ma > 0.01:
        sc = eob(seg(t, 86.1, 86.7))
        paste_glow(ov, GLOW_SOFT, 960, 560, 1.4 + 0.2 * math.sin(t * 2.2), 0.55 * ma)
        pts = [(960, 560 - 64 * sc), (960 + 54 * sc, 560 - 44 * sc), (960 + 54 * sc, 560 + 6 * sc),
               (960, 560 + 66 * sc), (960 - 54 * sc, 560 + 6 * sc), (960 - 54 * sc, 560 - 44 * sc)]
        d.line(pts + [pts[0]], A(MINT, ma), width=7)
        draw_check(d, 960, 560, 34, MINT, ma, seg(t, 86.6, 87.1))
    wa = seg(t, 86.3, 86.8) * env
    if wa > 0.01:
        f = 0.5 + 0.5 * math.sin(2 * math.pi * 0.8 * (t - 82))
        gl = Image.blend(_g5a, _g5b, f)
        al = gl.getchannel("A").point(lambda p: int(p * 0.55 * wa * seg(t, 86.75, 87.1)))
        gl.putalpha(al)
        ov.alpha_composite(gl)
        dy = (1 - eo(seg(t, 86.3, 86.9))) * 30
        tracked(d, 960, 655 + dy, "VERA", F("black", 150), WHITE, wa, tr=26)
    sw = seg(t, 87.2, 87.9)
    if 0 < sw < 1:
        text_sweep(ov, _s5_mask, lerp(-260, 2180, eo(sw)), math.sin(sw * math.pi) * 0.9)
    sa = seg(t, 86.9, 87.4) * env
    if sa > 0.01:
        tracked(d, 960, 838, "VERIFIABLE \u00b7 EVIDENCE \u00b7 REAL \u00b7 AUDITING",
                F("monob", 28), CYAN, sa, tr=6)
    fa = seg(t, 87.7, 88.3) * env
    if fa > 0.01:
        d.text((960, 918), "High-trust philanthropy, engineered.", F("semib", 46),
               A(WHITE, fa), anchor="ma")


# ---------------- transitions ----------------
WIPE_AT = [10.0, 16.0, 50.0, 62.0, 74.0, 82.0]


def wipe(d, ov, t):
    for b in WIPE_AT:
        u = seg(t, b - 0.18, b + 0.27)
        if 0 < u < 1:
            x = lerp(-80, 2000, eo(u))
            fade = 1 - abs(2 * u - 1)
            paste_glow(ov, GLOW_SOFT, x, 540, 0.4, 0.55 * fade)
            d.line([(x, 0), (x, 1080)], A(MINT, 0.5 * fade), width=3)


# ---------------- render ----------------
SCENES = [(0.0, 10.0), (10.0, 16.0), (16.0, 50.0), (50.0, 62.0),
          (62.0, 74.0), (74.0, 82.0), (82.0, 90.0)]
ZOOMS = [(1.0, 1.035), (1.018, 1.05), (1.0, 1.03), (1.045, 1.0),
         (1.0, 1.03), (1.0, 1.025), (1.02, 1.055)]


def render_frame(fi):
    t = fi / FPS
    ov = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
    d = SD(ov)
    draw_aurora(ov, t)
    draw_particles(d, t)
    if t < 10.0:
        scene1(d, ov, t)
    elif t < 16.0:
        scene2(d, ov, t)
    elif t < 50.0:
        scene3(d, ov, t)
    elif t < 62.0:
        scene4(d, ov, t)
    elif t < 74.0:
        scene5(d, ov, t)
    elif t < 82.0:
        scene6(d, ov, t)
    else:
        scene7(d, ov, t)
    wipe(d, ov, t)
    # per-scene slow zoom (center crop)
    si = 0
    for k, (s0, s1) in enumerate(SCENES):
        if s0 <= t < s1 or (k == len(SCENES) - 1 and t >= s0):
            si = k
    z0, z1 = ZOOMS[si]
    z = lerp(z0, z1, eio(seg(t, SCENES[si][0], SCENES[si][1])))
    if z > 1.0005:
        nw, nh = max(1, int(CW / z)), max(1, int(CH / z))
        x0, y0 = (CW - nw) // 2, (CH - nh) // 2
        ov = ov.crop((x0, y0, x0 + nw, y0 + nh)).resize((W, H), Image.LANCZOS)
    else:
        ov = ov.resize((W, H), Image.LANCZOS)
    frame = Image.alpha_composite(BG, ov).convert("RGB")
    if t > 11.0:
        fdraw = ImageDraw.Draw(frame)
        fdraw.text((W - 36, H - 44), "VERA", font=ImageFont.truetype(_FP["mono"], 20),
                   fill=(86, 92, 100), anchor="ra")
    frame.save(os.path.join(FRAMES, "f_%05d.png" % fi), compress_level=1)


if __name__ == "__main__":
    import time
    t0 = time.time()
    for fi in range(NF):
        render_frame(fi)
        if fi % 150 == 0:
            print(f"frame {fi}/{NF}  {time.time() - t0:.0f}s elapsed", flush=True)
    print(f"DONE {NF} frames in {time.time() - t0:.0f}s")
