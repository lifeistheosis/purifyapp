#!/usr/bin/env python3
"""The engine the Cradle's three full-style versions share (storm.py, whisper.py, musashi.py).

His words (2026-11-25): "you are just doing autonomous clip switches. I want every beat. and I want you to copy one of
the references full style", then "do all 3. the point here is to showcase your editing capabilities to go all out".
So each version cuts on every one of the song's 94 beats, and each cut is placed by hand for what it shows. The cuts
follow the song's own groove, measured from the sound (sound_map.py, and the beat table below): every eight beats the
kick lands on the first, the fourth and the sixth, and the eighth is a short gap where the music drops out. A kick gets
the largest change, a beat between kicks a smaller one, a gap a quiet one, so the picture moves with the drums and not
with a clock. Nothing pops and settles (CLAUDE.md, "No bounce"): a move runs at a steady speed, and a jump is a cut.

Run any version from the repository root, with a Python that has numpy, opencv-python-headless and pillow:
  python -I -B docs/plans/promo-edits/edit-3/<version>.py <work> sheet [seconds ...]
  python -I -B docs/plans/promo-edits/edit-3/<version>.py <work> beats        a still at every beat, in one picture
  python -I -B docs/plans/promo-edits/edit-3/<version>.py <work> check        a cut on every beat, from the timeline
  python -I -B docs/plans/promo-edits/edit-3/<version>.py <work> render       every frame, with the sound
<work> holds raw/ (the pictures, out of git), font/ (DM Sans) and sound.mp3.
"""
import math, os, subprocess, sys
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFont

W, H, FPS = 1080, 1920, 60
N = 3400                      # 56.667 s; the sound is 56.66 s
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", ".."))
WORK = os.path.abspath(os.environ.get("EDIT3_WORK", os.path.join(ROOT, ".promo", "edit-3")))

# ---------------------------------------------------------------- the song
# Every beat, tracked from the song's drums and snapped to its onset (librosa, a hop of about 6 ms); the bar lines fall
# on the drop at 18.530 s.
BEATS = [0.209, 0.795, 1.393, 1.985, 2.572, 3.17, 3.756, 4.342, 4.934, 5.526, 6.118, 6.716, 7.303, 7.895, 8.487,
         9.085, 9.665, 10.257, 10.855, 11.436, 12.028, 12.626, 13.212, 13.804, 14.396, 14.988, 15.581, 16.167,
         16.765, 17.357, 18.007, 18.53, 19.18, 19.72, 20.312, 20.904, 21.496, 22.082, 22.674, 23.266, 23.853,
         24.433, 25.037, 25.629, 26.221, 26.807, 27.44, 27.992, 28.543, 29.176, 29.739, 30.36, 30.952, 31.539,
         32.148, 32.705, 33.315, 33.907, 34.458, 35.045, 35.683, 36.27, 36.879, 37.448, 38.04, 38.609, 39.259,
         39.816, 40.414, 41.001, 41.593, 42.179, 42.818, 43.328, 43.961, 44.577, 45.134, 45.708, 46.301, 46.881,
         47.502, 48.094, 48.686, 49.238, 49.865, 50.457, 51.072, 51.635, 52.233, 52.808, 53.418, 54.004, 54.596,
         55.107]
# The groove, measured (the sound's loudness in the 150 ms after each beat): the kick on the first, fourth and sixth
# beat of every eight, and a gap on the eighth. The build's own accents are its sharpest onsets (snare and clap).
KICKS = {4, 7, 10, 12, 15, 20, 23, 26, 28, 31, 34, 36, 39, 42, 44, 47, 50, 52, 55, 58, 60, 63, 66, 68, 71, 74, 76,
         79, 82, 84, 87, 90, 92}
ACCENTS = {6, 8, 9, 16, 24}
GAPS = {14, 30, 38, 46, 54, 62, 70, 78, 86}
PHRASES = [0, 7, 15, 23, 31, 39, 47, 55, 63, 71, 79, 87]   # the first beat of each eight
BASS_IN = [2.281, 11.738]      # the bass enters off the beat, twice in the build
DROP = 18.530
STOP = (32.00, 32.705)         # the song stops; one faint sound inside (32.148)
SILENCE = (35.85, 37.448)      # the song goes quiet; a sound at 36.27 and a click at 36.879
END = N / FPS


def first(t):
    """The frame that holds time t: a cut lands on its beat's frame, never after it."""
    return math.floor(t * FPS + 1e-6)


def beat_end(k):
    return BEATS[k + 1] if k + 1 < len(BEATS) else END


def lerp(a, b, u):
    return a + (b - a) * u


def clamp01(u):
    return 0.0 if u < 0 else 1.0 if u > 1 else u


# ---------------------------------------------------------------- the pictures
# key: (file under <work>/raw/, how it is read). "gray" turns a print or a black-and-white photograph to its luminance
# (a print's paper is warm; the storm is black and white); "rgb" keeps the paint.
SOURCES = {
    "greco": ("met_436570.jpg", "rgb"),        # El Greco, The Adoration of the Shepherds, about 1605 to 1610. The Met
    "angel": ("met/370641.jpg", "gray"),       # Rembrandt, The Angel Appearing to the Shepherds, 1634. The Met
    "flight": ("met/354629.jpg", "gray"),      # Rembrandt, The Flight into Egypt: a Night Piece, 1651. The Met
    "night": ("met/359896.jpg", "gray"),       # Rembrandt, The Adoration of the Shepherds: a Night Piece, about 1657
    "lamp": ("met/373069.jpg", "gray"),        # Rembrandt, The Adoration of the Shepherds: with the Lamp, about 1654
    "cross": ("met/437972.jpg", "gray"),       # Zurbarán, The Crucifixion. The Met (its photograph is black and white)
    "head": ("met/437404.jpg", "rgb"),         # Rembrandt, Head of Christ. The Met
    "ribera": ("met/437455.jpg", "rgb"),       # Ribera, The Holy Family with Saints Anne and Catherine of Alexandria, 1648
    "murillo": ("met/437175.jpg", "rgb"),      # Murillo, Virgin and Child, 1670s
    "zurbaran": ("met/437971.jpg", "rgb"),     # Zurbarán, The Young Virgin, about 1632 to 1633
    "velazquez": ("met/437871.jpg", "rgb"),    # Velázquez, The Supper at Emmaus, 1622 to 1623
    "caravaggio": ("met/437986.jpg", "rgb"),   # Caravaggio, The Denial of Saint Peter, 1610
    "vladimir": ("vladimir_rm302.jpg", "ground"),  # Our Lady of Vladimir, Moscow, mid 16th century. Russian Museum, DRZh-302
}
# The part of each photograph that is the work itself (a print's plate inside its paper, a canvas inside its tacking
# edge), as x0, y0, x1, y1 in source pixels: the camera never shows what is outside it.
PLATES = {
    "angel": (40, 40, 2870, 3390), "flight": (90, 90, 3170, 3700), "night": (115, 85, 3440, 2565),
    "lamp": (130, 100, 3290, 2700), "greco": (40, 40, 2455, 3790), "head": (170, 130, 2790, 3380),
    "murillo": (120, 50, 2700, 3930), "ribera": (20, 20, 2745, 3700), "zurbaran": (130, 120, 3080, 3790),
    "velazquez": (20, 20, 3500, 3270), "caravaggio": (40, 40, 3860, 2860),
}
_cache = {}


def add_source(key, path, mode, plate=None):
    SOURCES[key] = (path, mode)
    if plate:
        PLATES[key] = plate


def black_ground(im):
    """The photograph's light ground, reached from the picture's edge, becomes black; the icon is not touched."""
    h, w = im.shape[:2]
    light = (im.min(axis=2) > 200) & ((im.max(axis=2).astype(int) - im.min(axis=2)) < 28)
    mask = np.zeros((h + 2, w + 2), np.uint8)
    fill = light.astype(np.uint8)
    seeds = [(x, 0) for x in range(0, w, 7)] + [(x, h - 1) for x in range(0, w, 7)] + \
            [(0, y) for y in range(0, h, 7)] + [(w - 1, y) for y in range(0, h, 7)]
    for (x, y) in seeds:
        if fill[y, x] == 1 and mask[y + 1, x + 1] == 0:
            cv2.floodFill(fill, mask, (x, y), 2, flags=4 | (1 << 8))
    ground = cv2.dilate((fill == 2).astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
    out = im.copy()
    out[ground] = 0
    return out


def src(key, level=0):
    ck = (key, level)
    if ck not in _cache:
        if level == 0:
            path, mode = SOURCES[key]
            im = cv2.cvtColor(cv2.imread(os.path.join(WORK, "raw", path), cv2.IMREAD_COLOR), cv2.COLOR_BGR2RGB)
            if mode == "gray":
                g = cv2.cvtColor(im, cv2.COLOR_RGB2GRAY)
                im = np.repeat(g[..., None], 3, axis=2)
            elif mode == "ground":
                im = black_ground(im)
            _cache[ck] = im
        else:
            a = src(key, level - 1)
            _cache[ck] = cv2.resize(a, (a.shape[1] // 2, a.shape[0] // 2), interpolation=cv2.INTER_AREA)
    return _cache[ck]


def size(key):
    a = src(key)
    return a.shape[1], a.shape[0]


def view(key, cx, cy, cw, ow, oh, keep_inside=True, border=0):
    """The picture through the camera: a window cw source pixels wide, centred on (cx, cy), drawn at ow by oh."""
    a0 = src(key)
    sh, sw = a0.shape[:2]
    s = cw / ow
    if keep_inside:
        x0, y0, x1, y1 = PLATES.get(key, (0, 0, sw, sh))
        hw, hh = s * ow / 2, s * oh / 2
        cx = (x0 + x1) / 2 if 2 * hw >= x1 - x0 else min(max(cx, x0 + hw), x1 - hw)
        cy = (y0 + y1) / 2 if 2 * hh >= y1 - y0 else min(max(cy, y0 + hh), y1 - hh)
    lvl = 0
    while s / 2 ** (lvl + 1) >= 1.0 and lvl < 5:
        lvl += 1
    a = src(key, lvl)
    f = 1 / 2 ** lvl
    ss = s * f
    M = np.float32([[ss, 0, cx * f - ss * ow / 2], [0, ss, cy * f - ss * oh / 2]])
    out = cv2.warpAffine(a, M, (ow, oh), flags=cv2.INTER_CUBIC | cv2.WARP_INVERSE_MAP,
                         borderMode=cv2.BORDER_CONSTANT, borderValue=(border, border, border))
    return out.astype(np.float32) / 255.0, (cx, cy, s)


def to_screen(geo, ow, oh, px, py):
    cx, cy, s = geo
    return (px - cx) / s + ow / 2, (py - cy) / s + oh / 2


# ---------------------------------------------------------------- light and texture
_grids = {}


def grid(w, h):
    if (w, h) not in _grids:
        _grids[(w, h)] = np.meshgrid(np.arange(w, dtype=np.float32), np.arange(h, dtype=np.float32))
    return _grids[(w, h)]


_grain = None


def grain(i, w, h):
    global _grain
    if _grain is None:
        rng = np.random.default_rng(7)
        _grain = [cv2.GaussianBlur(rng.standard_normal((H, W)).astype(np.float32), (0, 0), 0.7) * 1.6 for _ in range(6)]
    return _grain[i % 6][:h, :w]


def add_grain(x, i, amount):
    h, w = x.shape[:2]
    return np.clip(x + (grain(i, w, h) * amount)[..., None] * (0.35 + 0.65 * x), 0, 1)


_vig = {}


def vignette(w, h, k=0.30, lo=0.55):
    ck = (w, h, k, lo)
    if ck not in _vig:
        u, v = grid(w, h)
        r2 = ((u - w / 2) / (w / 2)) ** 2 + ((v - h / 2) / (h / 2)) ** 2
        _vig[ck] = np.clip(1 - k * r2, lo, 1).astype(np.float32)
    return _vig[ck]


def pool(w, h, u0, v0, r, floor):
    """A soft pool of light round a point on the screen (radius r times the frame's width), over a floor."""
    uu, vv = grid(w, h)
    d2 = ((uu - u0) ** 2 + (vv - v0) ** 2) / ((r * w) ** 2)
    return floor + (1 - floor) * np.exp(-d2)


def lum(x):
    return x @ np.float32([0.2126, 0.7152, 0.0722])


def crush(x, c):
    """The blacks pulled down while the lights stay (reference 2): c from 0 (none) to 1 (black)."""
    if c <= 0.001:
        return x
    if c >= 0.999:
        return np.zeros_like(x)
    L = lum(x)
    k = np.clip((L - c) / max(1e-3, 1 - c), 0, 1) / np.maximum(L, 1e-4)
    return x * np.minimum(k, 1.0)[..., None]


def crush_lights(x, c):
    """Reference 2's crush measured against the frame's own lights, so a dark painting keeps its brightest parts too:
    c from 0 (none) to 1, where 1 leaves only the very brightest few pixels."""
    if c <= 0.001:
        return x
    L = lum(x)
    top = float(np.percentile(L[::4, ::4], 99.7))
    return crush(x, c * max(top, 0.05))


def strike(x, L, top=True):
    """Lightning (reference 1): the lights blow out and the shadows hold; a little more from the sky."""
    if L <= 0.003:
        return x
    if top:
        h = x.shape[0]
        g = (0.72 + 0.28 * (1 - np.arange(h, dtype=np.float32) / h))[:, None, None]
        L = L * g
    return np.clip(x * (1 + 3.2 * L) + 0.06 * L, 0, 1)


def to_white(x, a):
    """Towards white (reference 3's white flash, the drop's flash), a from 0 to 1."""
    if a <= 0.003:
        return x
    return np.clip(x + (1 - x) * min(1.0, a), 0, 1)


# ---------------------------------------------------------------- type and the mark
def font(weight, sz):
    return ImageFont.truetype(os.path.join(WORK, "font", f"DMSans-{weight}.ttf"), sz)


_mark = None


def mark():
    global _mark
    if _mark is None:
        _mark = np.array(Image.open(os.path.join(ROOT, "public", "purify-cross-mark.png")).convert("RGBA")).astype(np.float32) / 255
    return _mark


def end_card(t, t_mark, t_type, y_mark=860):
    """Black, the cross at t_mark, and the name typed under it from t_type, a letter every 0.06 s. No glow."""
    out = np.zeros((H, W, 3), np.uint8)
    if t < t_mark:
        return out
    m = mark()
    mh, mw = m.shape[:2]
    x0, y0 = W // 2 - mw // 2, y_mark - mh // 2
    a = m[..., 3:4]
    region = out[y0:y0 + mh, x0:x0 + mw].astype(np.float32) / 255
    out[y0:y0 + mh, x0:x0 + mw] = np.clip((region * (1 - a) + m[..., :3] * a) * 255 + 0.5, 0, 255).astype(np.uint8)
    word = "Purify"
    shown = int((t - t_type) / 0.06) + 1 if t >= t_type else 0
    if shown:
        im = Image.fromarray(out)
        d = ImageDraw.Draw(im)
        f = font(500, 50)
        total = d.textlength(word, font=f)
        d.text((W / 2 - total / 2, y0 + mh + 46), word[:min(len(word), shown)], font=f, fill=(244, 244, 240))
        out = np.array(im)
    return out


def in_band(img, band):
    """The picture in its band on a black screen (each reference's own frame: widescreen, 4:3 or square)."""
    x0, y0, bw, bh = band
    canvas = np.zeros((H, W, 3), np.uint8)
    canvas[y0:y0 + bh, x0:x0 + bw] = img
    return canvas


def u8(x):
    return (np.clip(x, 0, 1) * 255 + 0.5).astype(np.uint8)


# ---------------------------------------------------------------- the commands
def cmd_sheet(frame, name, times, cols=7, tag=""):
    tw, th = 216, 384
    rows = (len(times) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * (tw + 6), rows * (th + 30)), (40, 40, 40))
    d = ImageDraw.Draw(sheet)
    f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 15)
    for k, ts in enumerate(times):
        lab = ts if isinstance(ts, str) else f"{ts:.2f}"
        t = BEATS[int(ts[1:])] + 0.12 if isinstance(ts, str) else ts
        im = Image.fromarray(frame(first(t))).resize((tw, th), Image.LANCZOS)
        x, y = (k % cols) * (tw + 6), (k // cols) * (th + 30)
        sheet.paste(im, (x, y + 26))
        d.text((x + 4, y + 4), lab, fill=(255, 220, 0), font=f)
    p = os.path.join(WORK, "stills", f"{name}{tag}.jpg")
    os.makedirs(os.path.dirname(p), exist_ok=True)
    sheet.save(p, quality=88)
    print(p)


def cmd_beats(frame, name, a=0, b=None):
    """A still a little after every beat, eight to a row (one row per phrase of the song)."""
    b = len(BEATS) if b is None else b
    tw, th = 162, 288
    labels = [f"b{k}" for k in range(a, b)]
    rows = []
    row = []
    for lab in labels:
        k = int(lab[1:])
        if k in PHRASES and row:
            rows.append(row)
            row = []
        row.append(lab)
    rows.append(row)
    sheet = Image.new("RGB", (8 * (tw + 4), len(rows) * (th + 24)), (40, 40, 40))
    d = ImageDraw.Draw(sheet)
    f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 13)
    for r, row in enumerate(rows):
        for c, lab in enumerate(row):
            k = int(lab[1:])
            t = BEATS[k] + min(0.15, (beat_end(k) - BEATS[k]) * 0.4)
            im = Image.fromarray(frame(first(t))).resize((tw, th), Image.LANCZOS)
            x, y = c * (tw + 4), r * (th + 24)
            sheet.paste(im, (x, y + 22))
            col = (255, 120, 80) if k in KICKS else (120, 200, 255) if k in GAPS else (255, 220, 0)
            d.text((x + 3, y + 3), f"{lab} {BEATS[k]:.2f}", fill=col, font=f)
    p = os.path.join(WORK, "stills", f"{name}-beats-{a}-{b}.jpg")
    os.makedirs(os.path.dirname(p), exist_ok=True)
    sheet.save(p, quality=86)
    print(p)


def cmd_check(cuts):
    """Every beat must start a cut: the timeline's cut frames against the beats' frames."""
    cf = set(first(t) for t in cuts)
    missing = [k for k, b in enumerate(BEATS) if first(b) not in cf]
    extra = sorted(t for t in cuts if not any(abs(first(t) - first(b)) == 0 for b in BEATS))
    print(f"beats: {len(BEATS)}; cuts in the timeline: {len(cf)}; beats with no cut: {missing}; cuts off the beat: {[round(x, 3) for x in extra]}")
    return not missing


def _chunk(args):
    fn, a, b = args
    return [fn(i).tobytes() for i in range(a, b)]


def cmd_render(frame_fn, name, sound=None):
    import multiprocessing as mp
    sound = sound or os.path.join(WORK, "sound.mp3")
    out = os.path.join(WORK, "out")
    os.makedirs(out, exist_ok=True)
    path = os.path.join(out, f"{name}.mp4")
    ff = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
                           "-r", str(FPS), "-i", "-", "-i", sound, "-map", "0:v", "-map", "1:a", "-c:v", "libx264",
                           "-preset", "slow", "-crf", "16", "-profile:v", "high", "-pix_fmt", "yuv420p",
                           "-movflags", "+faststart", "-c:a", "aac", "-b:a", "256k", "-t", f"{N / FPS:.4f}", path],
                          stdin=subprocess.PIPE)
    # a few runs at a time: finished frames never pile up waiting for the encoder (they filled the machine on 2026-11-25)
    chunks = [(frame_fn, a, min(N, a + 20)) for a in range(0, N, 20)]
    with mp.Pool(4) as pool:
        for k in range(0, len(chunks), 8):
            for frames in pool.map(_chunk, chunks[k:k + 8]):
                for fb in frames:
                    ff.stdin.write(fb)
    ff.stdin.close()
    ff.wait()
    print(path)


def main(name, frame_fn, cuts, sheet_times):
    global WORK
    WORK = os.path.abspath(sys.argv[1])
    c = sys.argv[2]
    if c == "sheet":
        cmd_sheet(frame_fn, name, [float(x) if not x.startswith("b") else x for x in sys.argv[3:]] or sheet_times)
    elif c == "beats":
        a = int(sys.argv[3]) if len(sys.argv) > 3 else 0
        b = int(sys.argv[4]) if len(sys.argv) > 4 else None
        cmd_beats(frame_fn, name, a, b)
    elif c == "check":
        ok = cmd_check(cuts)
        sys.exit(0 if ok else 1)
    elif c == "render":
        if not cmd_check(cuts):
            sys.exit("a beat has no cut")
        cmd_render(frame_fn, name)
    elif c == "frame":
        for ts in sys.argv[3:]:
            p = os.path.join(WORK, "stills", f"{name}-{float(ts):06.2f}.jpg")
            os.makedirs(os.path.dirname(p), exist_ok=True)
            Image.fromarray(frame_fn(first(float(ts)))).save(p, quality=92)
            print(p)
