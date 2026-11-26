import sys, os, numpy as np, cv2
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import render as R
a = R.assets()
def lin(c):
    c = np.asarray(c, np.float64); return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
def rel(rgb):
    l = lin(rgb); return 0.2126 * l[..., 0] + 0.7152 * l[..., 1] + 0.0722 * l[..., 2]
Lt = float(rel(R.TEXT_INK)); worst = (99, None); sizes = []
for kind, frames in (("s5", range(332, 423, 6)), ("s6", range(433, 503, 6))):
    for f in frames:
        if kind == "s5":
            canvas, z = R.s5_layer(f)
            bg = R.paper_vignette(R.warp_canvas(np.dstack([a["s5"]] * 3), z, R.S5_FIX))
            tm = R.view(a["t5"], (0, 0, R.C2), z, fixed=R.S5_FIX, border=0.0)
        else:
            z = R.z6(f)
            bg = R.paper_vignette(R.warp_canvas(np.dstack([a["s6"]] * 3), z, R.S6_FIX))
            zt = 1.0 + R.T6_GROW * (z - 1.0) / (R.Z6_END - 1.0)
            tm = R.view(a["t6"], (0, 0, R.C2), zt, fixed=R.T6_FIX, border=0.0)
        glyph = tm > 0.5
        if glyph.sum() == 0: continue
        near = cv2.dilate(glyph.astype(np.uint8), np.ones((9, 9), np.uint8)) > 0
        lb5 = float(np.percentile(rel(bg)[near], 5)); cr = (lb5 + 0.05) / (Lt + 0.05)
        ys = np.where(glyph.any(axis=1))[0]
        if cr < worst[0]: worst = (cr, (kind, f))
print("worst card contrast", round(worst[0], 2), "at", worst[1])
# smallest letter on screen: card 1 at z=1, cap height of Comic Relief at 84 px on a 2160 canvas
from PIL import ImageFont
for face, size, canvas_scale in (("ComicRelief-Bold.ttf", 84, 0.5), ("ComicRelief-Bold.ttf", 110, 0.5), ("PermanentMarker-Regular.ttf", 104, 1.0)):
    fnt = ImageFont.truetype(os.path.join(R.FONTS, face), size); bb = fnt.getbbox("H")
    cap = (bb[3] - bb[1]) * canvas_scale
    print(face, size, "cap height at 1080:", round(cap, 1), "px; on a phone 390 wide:", round(cap * 390 / 1080, 1), "px")
end = rel(R.END_TEXT); bgd = rel(R.END_TOP)
print("end card contrast", round((end + 0.05) / (bgd + 0.05), 2))
