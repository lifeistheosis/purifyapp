#!/usr/bin/env python3
"""Promo edit 2, the Church: the storyboard's stills, and the film.

One still for each shot, and then every frame, from the real pictures in the real look: black and
white with grain, deep blacks, the cut-outs on pure black, the small words in
the app's sans. Nothing here is drawn by a machine: every picture is a
photograph, a frame of a clip, an icon or the app's own screen, and the only
things added are the grade, the grain and the type.

  python3 -I -B docs/plans/promo-edits/edit-2/board.py . .promo/promo-edits/edit-2 cut      # the two cut-outs
  python3 -I -B docs/plans/promo-edits/edit-2/board.py . .promo/promo-edits/edit-2 stills   # the stills, and the page's copies
  python3 -I -B docs/plans/promo-edits/edit-2/board.py . .promo/promo-edits/edit-2 film     # every frame, then the silent master
  python3 -I -B docs/plans/promo-edits/edit-2/board.py . .promo/promo-edits/edit-2 sound <the reference's file>   # the preview, not for posting

The work folder (out of git) holds raw/ (the pictures of pictures.json, by
name), clips/ (its clips), font/ (DM Sans, the app's sans), screens/ (the
app's real screens) and what this makes: cut/ and stills/.

The words are asserted against data/bible every time the stills are made.
"""
import json, os, shutil, subprocess, sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT, WORK, WHAT = sys.argv[1], sys.argv[2], sys.argv[3]
W, H = 1080, 1920
# The picture stands 1080 by 1440 in the middle of the frame; the black above and below it is the cut-outs' own black.
WIN = (0, 240, 1080, 1680)
FPS = 24  # the reference's own; every cut below is counted in its frames

# The cuts, in the reference's frames at 24 a second, measured from the reference itself (RECORD.md).
SHOTS = [
    ("01-candle-hand", 0, 6),
    ("02-church", 6, 48),
    ("03-hand", 48, 70),
    ("04-figure", 70, 89),
    # 89 to 91: two frames of blur into the Church
    ("05-candles", 91, 113),
    ("06-censer", 113, 135),
    ("07-dome", 135, 157),
    ("08-book", 157, 178),
    ("09-gospel", 178, 200),
    ("10-face", 200, 221),
    ("11-app", 221, 243),
    ("12-end", 243, 286),
]

# The small words. Each is Scripture, word for word, or the app's own label.
WORDS = {
    "entry_word": "church",  # 1 Timothy 3:15, set in capitals with a full stop as the reference sets its entry
    "entry": ("the pillar and ground of the truth", "1-timothy", 3, 15, "1 Timothy 3:15"),
    "invocation": ("in the name of the Father, and of the Son, and of the Holy Ghost", "matthew", 28, 19, "Matthew 28:19"),
    "amen": ("Amen", "matthew", 28, 20, "Matthew 28:20"),
    "end": ("upon this rock I will build my church; and the gates of hell shall not prevail against it", "matthew", 16, 18, "Matthew 16:18"),
}
LABELS = {"08-book": "nav.prayers", "11-app": "nav.today"}  # the app's own labels, read from its English catalogue


def verse(book, chapter, n):
    return next(v["text"] for v in json.load(open(f"{ROOT}/data/bible/{book}/{chapter}.json"))["verses"] if v["n"] == n)


def hold_the_words():
    for key in ("entry", "invocation", "amen", "end"):
        words, book, chapter, n, _ = WORDS[key]
        assert words in verse(book, chapter, n), f"{key}: not the app's own Bible, word for word"
    assert WORDS["entry_word"] in verse("1-timothy", 3, 15), "the entry's word is not in its verse"
    cat = json.load(open(f"{ROOT}/lib/i18n/messages/en.json"))
    return {shot: cat[key] for shot, key in LABELS.items()}


# ---------------------------------------------------------------- the look

def grey(rgb):
    a = np.asarray(rgb.convert("RGB"), np.float32) / 255
    return a[..., 0] * 0.2126 + a[..., 1] * 0.7152 + a[..., 2] * 0.0722


def grade(y, lift=0.05, deep=0.5):
    """Deep blacks and a firm middle: the black point is raised, then an S curve."""
    y = np.clip((y - lift) / (1 - lift), 0, 1)
    s = y * y * (3 - 2 * y)
    return y * (1 - deep) + s * deep


def grain(y, seed, amount=0.05):
    """Film grain that follows the light: none on pure black, so the cut-outs' ground stays pure."""
    rng = np.random.default_rng(seed)
    n = rng.normal(0, 1, y.shape).astype(np.float32)
    n = (n + np.roll(n, 1, 0) + np.roll(n, 1, 1) + np.roll(n, (1, 1), (0, 1))) / 2  # each grain a little wider than a pixel
    return np.clip(y + n * amount * np.clip(y * 6, 0, 1), 0, 1)


def to_image(y):
    return Image.fromarray((np.clip(y, 0, 1) * 255 + 0.5).astype(np.uint8), "L")


# ---------------------------------------------------------------- the type

def font(weight, size):
    return ImageFont.truetype(f"{WORK}/font/DMSans-{weight}.ttf", size)


def spaced(d, xy, s, f, track=0, fill=255, anchor="l"):
    """A line with its letters set apart by `track` pixels; anchor l, m or r about x."""
    widths = [d.textlength(c, font=f) for c in s]
    total = sum(widths) + track * (len(s) - 1)
    x = xy[0] - (total / 2 if anchor == "m" else total if anchor == "r" else 0)
    for c, w in zip(s, widths):
        d.text((x, xy[1]), c, font=f, fill=fill)
        x += w + track
    return total


def lines(d, x, y, rows, f, lead, anchor="m", fill=255, track=0):
    for i, row in enumerate(rows):
        spaced(d, (x, y + i * lead), row, f, track, fill, anchor)
    return y + len(rows) * lead


NAME = "PURIFY"


def name_at_head(d):
    """The app's name, small, where the reference carries its maker's mark all through."""
    spaced(d, (60, 268), NAME, font("500", 22), track=7, fill=200)


# ---------------------------------------------------------------- the cut-outs

def cut():
    import cv2
    from rembg import new_session, remove

    src = f"{WORK}/raw/pantocrator19.jpg"
    im = cv2.imread(src)
    # The blessing hand, whole to the cuff: told from the robe by its colour, inside a box about it.
    x0, y0, x1, y1 = 440, 1230, 840, 2180
    crop = im[y0:y1, x0:x1].copy()
    mask = np.zeros(crop.shape[:2], np.uint8)
    cv2.grabCut(crop, mask, (25, 25, crop.shape[1] - 50, crop.shape[0] - 50), np.zeros((1, 65)), np.zeros((1, 65)), 6, cv2.GC_INIT_WITH_RECT)
    m = ((mask == 1) | (mask == 3)).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    m = (lab == 1 + np.argmax(st[1:, 4])).astype(np.uint8) * 255
    # The cuff: the hand ends where the sleeve begins, and falls into the black over fifty pixels, as into shadow.
    fall = np.clip((810 - np.arange(crop.shape[0], dtype=np.float32)) / 50, 0, 1)[:, None]
    m = (m * fall).astype(np.uint8)
    m = cv2.GaussianBlur(m, (0, 0), 1.2)
    Image.fromarray(np.dstack([cv2.cvtColor(crop, cv2.COLOR_BGR2RGB), m])).save(f"{WORK}/cut/hand.png")
    # The figure, whole with His halo (the halo's circle is read off the icon by hand: centre and radius).
    a = np.asarray(remove(Image.open(src).convert("RGB"), session=new_session("u2net"), only_mask=True)).copy()
    halo = np.zeros_like(a)
    cv2.circle(halo, (975, 650), 505, 255, -1)
    a = np.maximum(a, halo)
    a[2500:] = 0  # the panel's lower edge
    a = cv2.GaussianBlur(a, (0, 0), 1.5)
    Image.fromarray(np.dstack([cv2.cvtColor(im, cv2.COLOR_BGR2RGB), a])).save(f"{WORK}/cut/figure.png")
    print("cut/hand.png, cut/figure.png")


# ---------------------------------------------------------------- the shots

SIZE = (W, WIN[3] - WIN[1])
FULL = (0, 0, W, H)


def light(im):
    """A picture as grey light, 0 to 1, in a form that can be moved by parts of a pixel."""
    return Image.fromarray(grey(im), "F")


def lerp(b0, b1, k):
    return tuple(a + (b - a) * k for a, b in zip(b0, b1))


def zoom(box, s, at=None):
    """The box drawn in by s, holding one point of the picture where it stands (the box's middle unless given)."""
    x0, y0, x1, y1 = box
    cx, cy = at or ((x0 + x1) / 2, (y0 + y1) / 2)
    fx, fy, w, h = (cx - x0) / (x1 - x0), (cy - y0) / (y1 - y0), (x1 - x0) / s, (y1 - y0) / s
    return (cx - w * fx, cy - h * fy, cx + w * (1 - fx), cy + h * (1 - fy))


def clip_frames(name, t, n):
    d = f"{WORK}/stills/_{name}"
    os.makedirs(d, exist_ok=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(t), "-i", f"{WORK}/clips/{name}.mp4", "-frames:v", str(n), f"{d}/%03d.png"], check=True)
    out = [light(Image.open(f"{d}/{i + 1:03d}.png")) for i in range(n)]
    shutil.rmtree(d)
    return out


def windowed(src, box, **kw):
    """The part of a picture in the box, graded, standing in the window on black."""
    y = np.zeros((H, W), np.float32)
    y[WIN[1]:WIN[3]] = grade(np.asarray(src.resize(SIZE, Image.LANCZOS, box=box), np.float32), **kw)
    return y


def cut_canvas(name, height, centre):
    """A cut-out, graded, on pure black at the frame's size: its picture times its own edge."""
    im = Image.open(f"{WORK}/cut/{name}.png")
    im = im.crop(im.getchannel("A").getbbox())
    im = im.resize((round(im.width * height / im.height), height), Image.LANCZOS)
    y = grade(grey(im), lift=0.02, deep=0.35) * (np.asarray(im.getchannel("A"), np.float32) / 255)
    full = np.zeros((H, W), np.float32)
    x0, y0 = round(centre[0] - im.width / 2), round(centre[1] - im.height / 2)
    full[y0:y0 + im.height, x0:x0 + im.width] = y
    return Image.fromarray(full, "F")


def phone_canvas():
    """The app's real Today on a plain dark phone, on black, with room about it for the camera to come in."""
    screen = Image.open(f"{WORK}/screens/today-top.png").convert("RGB")
    sw, sh = round(screen.width * 1250 / screen.height), 1250
    screen = screen.resize((sw, sh), Image.LANCZOS)
    pad, r, mx, my = 16, 74, 27, 48
    body = Image.new("L", (W + 2 * mx, H + 2 * my), 0)
    bx, by = mx + (W - sw) // 2 - pad, my + WIN[1] + (SIZE[1] - sh) // 2 - pad
    bd = ImageDraw.Draw(body)
    bd.rounded_rectangle((bx - 2, by - 2, bx + sw + 2 * pad + 2, by + sh + 2 * pad + 2), r + 2, fill=74)  # the edge of the body
    bd.rounded_rectangle((bx, by, bx + sw + 2 * pad, by + sh + 2 * pad), r, fill=14)                    # the body
    glass = Image.new("L", (sw, sh), 0)
    ImageDraw.Draw(glass).rounded_rectangle((0, 0, sw, sh), r - pad, fill=255)
    body.paste(to_image(grey(screen)), (bx + pad, by + pad), glass)
    return Image.fromarray(np.asarray(body, np.float32) / 255, "F"), (mx, my)


def moved(canvas, box):
    return np.asarray(canvas.resize((W, H), Image.LANCZOS, box=box), np.float32)


def build():
    """Every shot: how many frames, its picture at frame i (k from 0 to 1 across the shot), its words, its grain."""
    labels = hold_the_words()
    n = {name: b - a for name, a, b in SHOTS}
    bi, cap = font("700i", 27), font("500", 40)
    raw = lambda name: light(Image.open(f"{WORK}/raw/{name}.jpg"))
    shots = {}

    def words(draw=None, name=True):
        o = Image.new("L", (W, H), 0)
        d = ImageDraw.Draw(o)
        if name:
            name_at_head(d)
        if draw:
            draw(d)
        return np.asarray(o, np.float32) / 255

    def add(key, pic, over, amount=0.05):
        shots[key] = {"n": n[key], "pic": pic, "words": over, "grain": amount}

    # 1. A hand sets a lit taper among the others, close. The clip's own movement, and the least push.
    f1 = clip_frames("lighting", 13.5, n["01-candle-hand"])
    b1 = (470, 0, 1280, 1080)
    add("01-candle-hand", lambda i, k: windowed(f1[i], lerp(b1, zoom(b1, 1.01), k)), words())

    # 2. A church within, wide: one slow move toward the royal doors.
    s2 = raw("kondopoga")
    add("02-church", lambda i, k: windowed(s2, lerp((0, 30, 1070, 1457), (60, 100, 1044, 1412), k), lift=0.03), words())

    # 3. The blessing hand alone on black, and the entry beside it.
    c3 = cut_canvas("hand", 900, (690, 860))

    def entry(d):
        x = 260
        spaced(d, (x, 1010), "1.", font("700i", 46), anchor="m")
        spaced(d, (x, 1086), WORDS["entry_word"].upper() + ".", cap, track=3, anchor="m")
        yy = lines(d, x, 1166, ["the pillar and ground", "of the truth"], bi, 36)
        spaced(d, (x, yy + 14), WORDS["entry"][4], font("400i", 24), anchor="m", fill=190)
    add("03-hand", lambda i, k: moved(c3, zoom(FULL, 1 + 0.04 * k, (690, 860))), words(entry, name=False))

    # 4. He whose hand it is, whole with His halo, and the invocation; A M E N across.
    c4 = cut_canvas("figure", 900, (540, 800))

    def invocation(d):
        lines(d, 64, 262, ["IN THE NAME OF THE FATHER,", "AND OF THE SON,"], bi, 36, anchor="l", track=1)
        yy = lines(d, 900, 1284, ["AND OF THE HOLY GHOST"], bi, 36, anchor="r", track=1)
        spaced(d, (900, yy + 4), WORDS["invocation"][4], font("400i", 24), anchor="r", fill=190)
        for c, (ax, ay) in zip(WORDS["amen"][0].upper(), [(120, 1400), (385, 1436), (650, 1400), (900, 1436)]):
            spaced(d, (ax, ay), c, font("700", 34), anchor="m")
    add("04-figure", lambda i, k: moved(c4, zoom(FULL, 1 + 0.035 * k, (540, 800))), words(invocation, name=False))

    # 5. Candles: the clip as it was filmed, drifting a little to one side.
    f5 = clip_frames("candles", 5.2, n["05-candles"])
    add("05-candles", lambda i, k: windowed(f5[i], lerp((930, 0, 1740, 1080), (960, 0, 1770, 1080), k)), words())

    # 6. The censer: one slow move down its chains.
    s6 = raw("censer")
    add("06-censer", lambda i, k: windowed(s6, lerp((520, 930, 1400, 2103), (520, 975, 1400, 2148), k)), words())

    # 7. A dome from below: drawn in toward the dome.
    s7 = raw("sihastria")
    b7 = (160, 110, 1700, 2163)
    add("07-dome", lambda i, k: windowed(s7, lerp(b7, zoom(b7, 1.04, (873, 692)), k), lift=0.02, deep=0.4), words())

    # 8. The service book in a priest's hands, with the app's own label for it.
    f8 = clip_frames("priest", 5.3, n["08-book"])
    b8 = (652, 0, 1192, 720)
    add("08-book", lambda i, k: windowed(f8[i], lerp(b8, zoom(b8, 1.02), k)),
        words(lambda d: spaced(d, (1016, 300), labels["08-book"].upper(), font("700i", 30), track=3, anchor="r")))

    # 9. The Gospel open in His hand, from the Vysotsky Pantocrator: the shot pulls back.
    s9 = raw("vysotsky")
    b9 = (560, 1040, 1280, 2000)
    add("09-gospel", lambda i, k: windowed(s9, lerp(zoom(b9, 1.06, (920, 1450)), b9, k)), words())

    # 10. An icon's face: the Sinai Pantocrator, the app's own icon, drawn in toward His eyes.
    s10 = raw("sinai")
    b10 = (253, 180, 1453, 1780)
    add("10-face", lambda i, k: windowed(s10, lerp(b10, zoom(b10, 1.04, (853, 955)), k)), words())

    # 11. The app, its real Today, on a plain phone on black; the label stands beside the phone, not on its glass.
    c11, (mx, my) = phone_canvas()
    add("11-app", lambda i, k: moved(c11, lerp((0, 0, W + 2 * mx, H + 2 * my), (mx, my, W + mx, H + my), k)),
        words(lambda d: spaced(d, (64, 640), labels["11-app"].upper(), font("700i", 30), track=3)), amount=0.03)

    # 12. The end card on black: the name, the verse's name, the verse, the cross. Still, and without grain.
    def end(d):
        spaced(d, (540, 740), "Purify", font("500", 54), anchor="m")
        spaced(d, (540, 850), WORDS["end"][4].upper(), font("500", 26), track=5, anchor="m")
        lines(d, 540, 912, ["upon this rock I will build my church;", "and the gates of hell", "shall not prevail against it"], bi, 38)
    card = words(end, name=False)
    mark = Image.open(f"{WORK}/raw/mark.png").convert("RGBA")
    mark = mark.resize((round(mark.width * 84 / mark.height), 84), Image.LANCZOS)
    x0 = (W - mark.width) // 2
    card[1076:1076 + 84, x0:x0 + mark.width] = grey(mark) * 0.96 * (np.asarray(mark.getchannel("A"), np.float32) / 255)
    add("12-end", lambda i, k: np.zeros((H, W), np.float32), card, amount=0)
    return shots, labels


def smear(y, n=170):
    """A frame drawn out down its height, as a camera thrown past it would leave it."""
    c = np.cumsum(np.pad(y, ((n // 2 + 1, n // 2), (0, 0)), mode="edge"), axis=0)
    return (c[n:] - c[:-n]) / n


def frame(shots, f):
    """Frame f of the film, as grey light."""
    if f == 89:   # two frames of blur into the Church: the figure thrown upward,
        s = shots["04-figure"]
        return grain(smear(s["pic"](s["n"] - 1, 1.0)) * 0.8, f)
    if f == 90:   # and the candles arriving
        s = shots["05-candles"]
        return grain(smear(s["pic"](0, 0.0)), f)
    name, a, b = next(x for x in SHOTS if x[1] <= f < x[2])
    s = shots[name]
    i = f - a
    y = s["pic"](i, i / (s["n"] - 1))
    if s["grain"]:
        y = grain(y, f, s["grain"])
    return np.maximum(y, s["words"])   # a line stands from its shot's first frame to its last


def stills():
    shots, labels = build()
    os.makedirs(f"{WORK}/stills/page", exist_ok=True)
    made = {}
    for name, a, b in SHOTS:
        made[name] = to_image(frame(shots, a)).convert("RGB")
        made[name].save(f"{WORK}/stills/{name}.png")
        made[name].resize((540, 960), Image.LANCZOS).save(f"{WORK}/stills/page/{name}.jpg", quality=84)
        print(f"  {name}: {a / FPS:5.2f} to {b / FPS:5.2f} s, {b - a} frames")
    sheet = Image.new("RGB", (6 * 360, 2 * 640), (0, 0, 0))
    for i, (name, _, _) in enumerate(SHOTS):
        sheet.paste(made[name].resize((360, 640), Image.LANCZOS), ((i % 6) * 360, (i // 6) * 640))
    sheet.save(f"{WORK}/stills/sheet.jpg", quality=85)
    print("the words hold to data/bible; the labels are the app's:", labels)


MASTER, PREVIEW, SMALL = "purify-the-church.mp4", "purify-the-church-PREVIEW-not-for-posting.mp4", "purify-the-church-page.mp4"


def film():
    shots, labels = build()
    os.makedirs(f"{WORK}/film", exist_ok=True)
    total = SHOTS[-1][2]
    enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "gray", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                            "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
                            f"{WORK}/film/{MASTER}"], stdin=subprocess.PIPE)
    for f in range(total):
        enc.stdin.write((np.clip(frame(shots, f), 0, 1) * 255 + 0.5).astype(np.uint8).tobytes())
    enc.stdin.close()
    assert enc.wait() == 0
    # a lighter copy for the page
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", f"{WORK}/film/{MASTER}", "-vf", "scale=720:1280", "-c:v", "libx264", "-preset", "slow", "-crf", "24",
                    "-pix_fmt", "yuv420p", "-movflags", "+faststart", f"{WORK}/film/{SMALL}"], check=True)
    print(f"film/{MASTER}: {total} frames at {FPS}, {total / FPS:.3f} s, silent; the words hold to data/bible; labels {labels}")


def sound():
    """The preview: the reference's own first seconds of sound under the film, for him alone to judge the timing."""
    ref = sys.argv[4]
    secs = SHOTS[-1][2] / FPS
    note = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    spaced(ImageDraw.Draw(note), (540, 150), "Preview. Not for posting.", font("500", 30), anchor="m", fill=(255, 255, 255, 255))
    note.save(f"{WORK}/film/_note.png")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", f"{WORK}/film/{MASTER}", "-i", f"{WORK}/film/_note.png", "-t", f"{secs:.3f}", "-i", ref,
                    "-filter_complex", f"[0:v][1:v]overlay[v];[2:a]afade=t=out:st={secs - 0.12:.3f}:d=0.12[a]", "-map", "[v]", "-map", "[a]",
                    "-c:v", "libx264", "-preset", "slow", "-crf", "21", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-t", f"{secs:.3f}",
                    "-movflags", "+faststart", f"{WORK}/film/{PREVIEW}"], check=True)
    os.remove(f"{WORK}/film/_note.png")
    print(f"film/{PREVIEW}")


{"cut": cut, "stills": stills, "film": film, "sound": sound}[WHAT]()
