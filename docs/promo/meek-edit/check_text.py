"""The cards' words against what stands behind them, on every sixth frame they are on screen, and their sizes."""
import sys, os, numpy as np, cv2
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import render as R
from PIL import ImageFont
a = R.assets()
def lin(c):
    c = np.asarray(c, np.float64); return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
def rel(rgb):
    l = lin(rgb); return 0.2126 * l[..., 0] + 0.7152 * l[..., 1] + 0.0722 * l[..., 2]
Lt = float(rel(R.TEXT_INK)); worst = (99, None)
for kind, frames in (("first card", range(332, 423, 6)), ("second card", range(436, 503, 6))):
    for f in frames:
        if kind == "first card":
            bg = R.paper_vignette(R.place(np.dstack([a["s5"]] * 3), R.B_CANVAS, R.cam("S5", f), border=1.0))
            tm = R.place(a["t5"], R.B_CANVAS, R.cam("S5", f), border=0.0)
        else:
            bg = R.paper_vignette(R.place(np.dstack([a["s6"]] * 3), R.B_CANVAS, R.cam("S6img", f), border=1.0))
            tm = R.place(a["t6"], R.B_TEXT, R.cam("S6txt", f), border=0.0)
        glyph = tm > 0.5
        if glyph.sum() == 0:
            continue
        near = cv2.dilate(glyph.astype(np.uint8), np.ones((9, 9), np.uint8)) > 0
        cr = (float(np.percentile(rel(bg)[near], 5)) + 0.05) / (Lt + 0.05)
        if cr < worst[0]:
            worst = (cr, (kind, f))
print("worst card contrast", round(worst[0], 2), "at", worst[1])
for label, face, size, scale in (("first card", "ComicRelief-Bold.ttf", 84, R.cam("S5", 332)), ("second card", "ComicRelief-Bold.ttf", 101, R.cam("S6txt", 466)),
                                 ("name", "PermanentMarker-Regular.ttf", 104, None)):
    fnt = ImageFont.truetype(os.path.join(R.FONTS, face), size); bb = fnt.getbbox("H")
    s = 1.0 if scale is None else float(np.sqrt(abs(np.linalg.det(scale[:2, :2]))))
    cap = (bb[3] - bb[1]) * (1.0 if label == "name" else 0.5) * s  # the cards are drawn at twice the frame
    print(f"{label}: capitals {cap:.1f} px tall at their smallest on a 1080 frame, {cap * 390 / 1080:.1f} px on a phone 390 wide")
end = rel(R.END_TEXT); bgd = rel(R.END_TOP)
print("end card contrast", round((end + 0.05) / (bgd + 0.05), 2))
