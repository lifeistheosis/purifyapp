#!/usr/bin/env python3
"""Promo edit 2, the Church: the storyboard's stills.

One still for each shot, from the real pictures in the real look: black and
white with grain, deep blacks, the cut-outs on pure black, the small words in
the app's sans. Nothing here is drawn by a machine: every picture is a
photograph, a frame of a clip, an icon or the app's own screen, and the only
things added are the grade, the grain and the type.

  python3 -I -B docs/plans/promo-edits/edit-2/board.py . .promo/promo-edits/edit-2 cut      # the two cut-outs
  python3 -I -B docs/plans/promo-edits/edit-2/board.py . .promo/promo-edits/edit-2 stills   # the stills, and the page's copies

The work folder (out of git) holds raw/ (the pictures of pictures.json, by
name), clips/ (its clips), font/ (DM Sans, the app's sans), screens/ (the
app's real screens) and what this makes: cut/ and stills/.

The words are asserted against data/bible every time the stills are made.
"""
import json, os, subprocess, sys

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


def crop_to(im, box, size):
    return im.crop(box).resize(size, Image.LANCZOS)


def in_window(pic, seed, **kw):
    """A picture graded and grained, standing in the window on black."""
    y = np.zeros((H, W), np.float32)
    x0, y0, x1, y1 = WIN
    y[y0:y1, x0:x1] = grain(grade(grey(pic), **kw), seed)
    return to_image(y)


def clip_frame(name, t):
    out = f"{WORK}/stills/_{name}.png"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(t), "-i", f"{WORK}/clips/{name}.mp4", "-vframes", "1", out], check=True)
    im = Image.open(out).convert("RGB")
    os.remove(out)
    return im


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
    m[790:] = 0  # the cuff: the hand ends where the sleeve begins
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


def cut_out_on_black(name, height, centre, seed, gain=1.0):
    """A cut-out, graded, on pure black: its picture times its own edge."""
    im = Image.open(f"{WORK}/cut/{name}.png")
    box = im.getchannel("A").getbbox()
    im = im.crop(box)
    k = height / im.height
    im = im.resize((round(im.width * k), height), Image.LANCZOS)
    a = np.asarray(im.getchannel("A"), np.float32) / 255
    y = grain(grade(grey(im), lift=0.02, deep=0.35) * gain, seed) * a
    full = np.zeros((H, W), np.float32)
    x0, y0 = round(centre[0] - im.width / 2), round(centre[1] - im.height / 2)
    full[y0:y0 + im.height, x0:x0 + im.width] = y
    return to_image(full)


# ---------------------------------------------------------------- the stills

def stills():
    labels = hold_the_words()
    made = {}
    size = (W, WIN[3] - WIN[1])
    bi, cap = font("700i", 27), font("500", 40)

    def label(d, shot):
        spaced(d, (1016, 300), labels[shot].upper(), font("700i", 30), track=3, anchor="r")

    # 1. A hand sets a lit taper among the others, close.
    f = in_window(crop_to(clip_frame("lighting", 13.5), (470, 0, 1280, 1080), size), 1)
    name_at_head(ImageDraw.Draw(f)); made["01-candle-hand"] = f

    # 2. A church within, wide: the icon screen of a wooden church.
    f = in_window(crop_to(Image.open(f"{WORK}/raw/kondopoga.jpg"), (0, 30, 1070, 1457), size), 2, lift=0.03)
    name_at_head(ImageDraw.Draw(f)); made["02-church"] = f

    # 3. The blessing hand alone on black, and the entry beside it.
    f = cut_out_on_black("hand", 900, (690, 860), 3)
    d = ImageDraw.Draw(f)
    x = 260
    spaced(d, (x, 1010), "1.", font("700i", 46), anchor="m")
    spaced(d, (x, 1086), WORDS["entry_word"].upper() + ".", cap, track=3, anchor="m")
    yy = lines(d, x, 1166, ["the pillar and ground", "of the truth"], bi, 36)
    spaced(d, (x, yy + 14), WORDS["entry"][4], font("400i", 24), anchor="m", fill=190)
    made["03-hand"] = f

    # 4. He whose hand it is, whole with His halo, and the invocation; A M E N across.
    f = cut_out_on_black("figure", 900, (540, 800), 4)
    d = ImageDraw.Draw(f)
    lines(d, 64, 262, ["IN THE NAME OF THE FATHER,", "AND OF THE SON,"], bi, 36, anchor="l", track=1)
    yy = lines(d, 900, 1284, ["AND OF THE HOLY GHOST"], bi, 36, anchor="r", track=1)
    spaced(d, (900, yy + 4), WORDS["invocation"][4], font("400i", 24), anchor="r", fill=190)
    for c, (ax, ay) in zip(WORDS["amen"][0].upper(), [(120, 1400), (385, 1436), (650, 1400), (900, 1436)]):
        spaced(d, (ax, ay), c, font("700", 34), anchor="m")
    made["04-figure"] = f

    # 5. Candles.
    f = in_window(crop_to(clip_frame("candles", 5.2), (930, 0, 1740, 1080), size), 5)
    name_at_head(ImageDraw.Draw(f)); made["05-candles"] = f

    # 6. The censer.
    f = in_window(crop_to(Image.open(f"{WORK}/raw/censer.jpg"), (520, 930, 1400, 2103), size), 6)
    name_at_head(ImageDraw.Draw(f)); made["06-censer"] = f

    # 7. A dome from below.
    f = in_window(crop_to(Image.open(f"{WORK}/raw/sihastria.jpg"), (160, 110, 1700, 2163), size), 7, lift=0.02, deep=0.4)
    name_at_head(ImageDraw.Draw(f)); made["07-dome"] = f

    # 8. The service book in a priest's hands.
    f = in_window(crop_to(clip_frame("priest", 5.3), (652, 0, 1192, 720), size), 8)
    d = ImageDraw.Draw(f); name_at_head(d); label(d, "08-book"); made["08-book"] = f

    # 9. The Gospel open in His hand, from the Vysotsky Pantocrator.
    f = in_window(crop_to(Image.open(f"{WORK}/raw/vysotsky.jpg"), (560, 1040, 1280, 2000), size), 9)
    name_at_head(ImageDraw.Draw(f)); made["09-gospel"] = f

    # 10. An icon's face: the Sinai Pantocrator, the app's own icon.
    f = in_window(crop_to(Image.open(f"{WORK}/raw/sinai.jpg"), (253, 180, 1453, 1780), size), 10)
    name_at_head(ImageDraw.Draw(f)); made["10-face"] = f

    # 11. The app, its real Today, on a plain phone on black.
    screen = Image.open(f"{WORK}/screens/today-top.png").convert("RGB")
    k = 1250 / screen.height
    sw, sh = round(screen.width * k), 1250
    screen = screen.resize((sw, sh), Image.LANCZOS)
    pad, r = 16, 74
    body = Image.new("L", (W, H), 0)
    bx, by = (W - sw) // 2 - pad, WIN[1] + (size[1] - sh) // 2 - pad
    bd = ImageDraw.Draw(body)
    bd.rounded_rectangle((bx - 2, by - 2, bx + sw + 2 * pad + 2, by + sh + 2 * pad + 2), r + 2, fill=74)   # the edge of the body
    bd.rounded_rectangle((bx, by, bx + sw + 2 * pad, by + sh + 2 * pad), r, fill=14)                     # the body
    glass = Image.new("L", (sw, sh), 0)
    ImageDraw.Draw(glass).rounded_rectangle((0, 0, sw, sh), r - pad, fill=255)
    body.paste(to_image(grey(screen)), (bx + pad, by + pad), glass)
    f = to_image(grain(np.asarray(body, np.float32) / 255, 11, amount=0.03))
    name_at_head(ImageDraw.Draw(f)); made["11-app"] = f

    # 12. The end card on black: the name, the verse's name, the verse, the cross.
    f = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(f)
    spaced(d, (540, 740), "Purify", font("500", 54), anchor="m")
    spaced(d, (540, 850), WORDS["end"][4].upper(), font("500", 26), track=5, anchor="m")
    lines(d, 540, 912, ["upon this rock I will build my church;", "and the gates of hell", "shall not prevail against it"], bi, 38)
    mark = Image.open(f"{WORK}/raw/mark.png").convert("RGBA")
    mh = 84
    mark = mark.resize((round(mark.width * mh / mark.height), mh), Image.LANCZOS)
    f.paste(to_image(grey(mark) * 0.96), ((W - mark.width) // 2, 1076), mark.getchannel("A"))
    made["12-end"] = f

    # The app's label on its own shot stands beside the phone, not on its glass.
    d = ImageDraw.Draw(made["11-app"])
    spaced(d, (64, 640), labels["11-app"].upper(), font("700i", 30), track=3)

    os.makedirs(f"{WORK}/stills/page", exist_ok=True)
    for name, a, b in SHOTS:
        made[name].convert("RGB").save(f"{WORK}/stills/{name}.png")
        made[name].convert("RGB").resize((540, 960), Image.LANCZOS).save(f"{WORK}/stills/page/{name}.jpg", quality=84)
        print(f"  {name}: {a / FPS:5.2f} to {b / FPS:5.2f} s, {b - a} frames")
    # every shot beside its neighbours, for looking over
    sheet = Image.new("RGB", (6 * 360, 2 * 640), (0, 0, 0))
    for i, (name, _, _) in enumerate(SHOTS):
        sheet.paste(made[name].convert("RGB").resize((360, 640), Image.LANCZOS), ((i % 6) * 360, (i // 6) * 640))
    sheet.save(f"{WORK}/stills/sheet.jpg", quality=85)
    print("the words hold to data/bible; the labels are the app's:", labels)


{"cut": cut, "stills": stills}[WHAT]()
