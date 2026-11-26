"""The reference's look, as functions: its grade, its ink, its glow.

Grade: each colour shot is matched to the reference shot it stands in for
(tone by histogram, colour cast by mean and spread in Lab), then given the
reference's own finishing: a cream haze for the backlit close-up, a golden
hour with an Orton glow for the lake.

Ink: the reference's black and white panels are manga ink (black contours,
solid black hair, hatching, white paper). A picture is calmed (mean shift),
its contours drawn by an extended difference of Gaussians, its deepest
shadows filled black, its middle tones hatched or screened, and its stray
specks removed.
"""
import cv2
import numpy as np

def lum(img):
    return 0.2126 * img[..., 0] + 0.7152 * img[..., 1] + 0.0722 * img[..., 2]

def screen(a, b):
    return 1 - (1 - a) * (1 - b)

def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)

# ---------------------------------------------------------------- grade

def to_lab(rgb):
    return cv2.cvtColor(np.clip(rgb, 0, 1).astype(np.float32), cv2.COLOR_RGB2LAB)

def to_rgb(lab):
    return np.clip(cv2.cvtColor(lab.astype(np.float32), cv2.COLOR_LAB2RGB), 0, 1)

def hist_match(src, ref):
    s = src.ravel()
    sv, si, sc = np.unique(s, return_inverse=True, return_counts=True)
    rv, rc = np.unique(ref.ravel(), return_counts=True)
    sq = np.cumsum(sc).astype(np.float64) / s.size
    rq = np.cumsum(rc).astype(np.float64) / ref.size
    return np.interp(sq, rq, rv)[si].reshape(src.shape)

def ref_stats(frames_rgb, masks):
    """What the grade keeps of a reference shot: its tone as 1001 quantiles, its cast as mean and spread."""
    lab = np.concatenate([to_lab(f)[m] for f, m in zip(frames_rgb, masks)])
    q = np.percentile(lab[:, 0], np.linspace(0, 100, 1001))
    return {"Lq": [round(float(v), 4) for v in q],
            "a": [round(float(lab[:, 1].mean()), 4), round(float(lab[:, 1].std()), 4)],
            "b": [round(float(lab[:, 2].mean()), 4), round(float(lab[:, 2].std()), 4)]}

def match_quantiles(src, q):
    s = src.ravel()
    sv, si, sc = np.unique(s, return_inverse=True, return_counts=True)
    sq = np.cumsum(sc).astype(np.float64) / s.size
    return np.interp(sq, np.linspace(0, 1, len(q)), np.asarray(q))[si].reshape(src.shape)

def transfer(img, rs, sL=0.9, sab=0.85):
    """Tone and cast of the reference shot (ref_stats), the picture's own detail kept."""
    lab = to_lab(img)
    L = lab[..., 0]
    Lm = match_quantiles(L, rs["Lq"]).astype(np.float32)
    base = cv2.GaussianBlur(L, (0, 0), 3)
    Lm = cv2.GaussianBlur(Lm, (0, 0), 3) + (L - base)
    out = lab.copy()
    out[..., 0] = np.clip(L * (1 - sL) + Lm * sL, 0, 100)
    for i, k in ((1, "a"), (2, "b")):
        ch = lab[..., i]
        t = (ch - ch.mean()) / (ch.std() + 1e-6) * rs[k][1] + rs[k][0]
        out[..., i] = ch * (1 - sab) + t * sab
    return to_rgb(out)

def highkey(img, sky_lo=0.55, sky_hi=0.80, cream=(1.0, 0.965, 0.90), haze=0.78, dark_gamma=1.18, warm=0.05):
    """The backlit close-up: the bright ground lifted to a cream haze, the figure kept dark."""
    L = lum(img)
    w = smoothstep(sky_lo, sky_hi, cv2.GaussianBlur(L, (0, 0), 6))[..., None]
    out = img * (1 - w * haze) + np.array(cream, np.float32) * (w * haze)
    dark = 1 - smoothstep(0.15, 0.55, L)[..., None]
    out = out * (1 - dark) + (np.clip(out, 0, 1) ** dark_gamma) * dark
    out[..., 0] = np.clip(out[..., 0] * (1 + warm), 0, 1)
    out[..., 2] = np.clip(out[..., 2] * (1 - warm), 0, 1)
    return np.clip(out, 0, 1)

def golden_hour(img, wb=(1.10, 1.02, 0.76), sat=1.25, crush=1.7, orton=0.45):
    """The forest shot's light: warm, saturated, deep shadows, highlights that bloom."""
    out = np.clip(img * np.array(wb, np.float32), 0, 1)
    L = lum(out)[..., None]
    out = np.clip(L + (out - L) * sat, 0, 1) ** crush
    blur = cv2.GaussianBlur(out, (0, 0), 20)
    return np.clip(screen(out, orton * np.clip(blur * 1.25, 0, 1) ** 1.6), 0, 1)

# ---------------------------------------------------------------- ink

def despeckle(lines, min_area):
    b = (lines < 0.5).astype(np.uint8)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(b, 8)
    keep = np.zeros(n, bool)
    keep[1:] = stats[1:, cv2.CC_STAT_AREA] >= min_area
    out = np.ones_like(lines)
    out[keep[lab]] = 0
    return out

def xdog(L, sigma, phi, eps, tau=0.99, k=1.6):
    g1 = cv2.GaussianBlur(L, (0, 0), sigma)
    g2 = cv2.GaussianBlur(L, (0, 0), sigma * k)
    D = g1 - tau * g2
    return np.clip(np.where(D >= eps, 1.0, 1.0 + np.tanh(phi * (D - eps))), 0, 1).astype(np.float32)

def screentone(T, period=5.0, angle=45):
    h, w = T.shape
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    a = np.radians(angle)
    u = (xx * np.cos(a) + yy * np.sin(a)) / period
    v = (-xx * np.sin(a) + yy * np.cos(a)) / period
    d = np.sqrt((u - np.round(u)) ** 2 + (v - np.round(v)) ** 2)
    return np.clip((d - np.clip(T, 0, 1) * 0.6) / 0.07 + 0.5, 0, 1).astype(np.float32)

def hatching(T, spacing=6.0, angle=40, width=0.42):
    h, w = T.shape
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    a = np.radians(angle)
    u = (xx * np.cos(a) + yy * np.sin(a)) / spacing
    d = np.abs(u - np.round(u))
    return np.clip((d - np.clip(T, 0, 1) * width) / 0.06 + 0.5, 0, 1).astype(np.float32)

def _calm(img, ms):
    u8 = (np.clip(img, 0, 1) * 255).astype(np.uint8)
    sm = cv2.pyrMeanShiftFiltering(cv2.cvtColor(u8, cv2.COLOR_RGB2BGR), ms[0], ms[1])
    return lum(cv2.cvtColor(sm, cv2.COLOR_BGR2RGB).astype(np.float32) / 255).astype(np.float32)

def punch(img, wb=(1.03, 1.0, 0.96), sat=1.15, gamma=0.95, contrast=1.15, pivot=0.45):
    """The opening's finish: a touch warmer, more colour, harder contrast."""
    o = np.clip(img * np.array(wb, np.float32), 0, 1)
    L = lum(o)[..., None]
    o = np.clip(L + (o - L) * sat, 0, 1)
    return np.clip((o ** gamma - pivot) * contrast + pivot, 0, 1)

def ink_icon(img, scale=1.0, black=0.20, tone_hi=0.36, white=0.42, min_area=150, period=5.0, ms=(10, 18)):
    """An icon as a manga panel: contours, black hair and beard, a little screentone, white paper."""
    L = _calm(img, ms)
    a, b = np.percentile(L, 2), np.percentile(L, 98)
    L = np.clip((L - a) / max(b - a, 1e-3), 0, 1)
    lines = xdog(L, 1.3 * scale, 240, -0.012, tau=0.992)
    lines = despeckle((lines > 0.5).astype(np.float32), int(min_area * scale * scale))
    fill = np.ones_like(L)
    fill[L < black] = 0
    m = (L >= black) & (L < tone_hi)
    t = screentone(np.clip((L - black) / (tone_hi - black) * 0.7 + 0.3, 0, 1), period * scale)
    fill[m] = t[m]
    m2 = (L >= tone_hi) & (L < white)
    fill[m2] = np.maximum(t, 0.85)[m2]
    return cv2.GaussianBlur(np.minimum(lines, fill), (0, 0), 0.55 * scale)

def ink_paint(img, scale=1.0, black=0.13, hatch_hi=0.52, cross=0.30, white=0.66, spacing=5.0, min_area=30):
    """A painting as a manga drawing: fine and bold contours, hatching and cross-hatching, black shadows."""
    L = _calm(img, (4, 8))
    a, b = np.percentile(L, 1), np.percentile(L, 99)
    L = np.clip((L - a) / max(b - a, 1e-3), 0, 1)
    f = despeckle((xdog(L, 1.0 * scale, 60, -0.004) > 0.5).astype(np.float32), int(12 * scale * scale))
    bo = despeckle((xdog(L, 2.2 * scale, 30, -0.01) > 0.5).astype(np.float32), int(min_area * scale * scale))
    lines = np.minimum(f, bo)
    h1 = hatching(np.clip((hatch_hi - L) / (hatch_hi - black), 0, 1), spacing * scale, 40, 0.42)
    h2 = hatching(np.clip((cross - L) / (cross - black), 0, 1), spacing * scale, -50, 0.38)
    fill = np.ones_like(L)
    band = L < hatch_hi
    fill[band] = h1[band]
    cb = L < cross
    fill[cb] = np.minimum(fill, h2)[cb]
    fill[L < black] = 0
    fill[L >= white] = 1
    return cv2.GaussianBlur(np.minimum(lines, fill), (0, 0), 0.6 * scale)
