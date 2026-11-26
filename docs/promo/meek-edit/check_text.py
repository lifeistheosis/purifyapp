import sys, os, numpy as np, cv2
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import render as R
a = R.assets()
def lin(c):
    c = np.asarray(c, np.float64)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
def rel(rgb):
    l = lin(rgb); return 0.2126 * l[..., 0] + 0.7152 * l[..., 1] + 0.0722 * l[..., 2]
Lt = float(rel(R.INK))
worst = (99, None)
rows = []
for kind, frames in (("s5", range(332, 423, 6)), ("s6", range(433, 503, 6))):
    for f in frames:
        if kind == "s5":
            canvas, z = R.s5_layer(f); bare = a.s5_canvas; t = a.s5_text; fix = R.S5_FIX
        else:
            canvas, z = R.s6_layer(f); bare = a.s6_canvas; t = a.s6_text; fix = R.S6_FIX
        bg = R.warp_canvas(bare, z, fix)
        tm = R.warp_canvas(np.dstack([t, t, t]).astype(np.float32), z, fix, )
        # warp_canvas pads with white; the alpha canvas pads with 1 too, so rebuild the mask the safe way
        tm = R.view(np.dstack([t, t, t]).astype(np.float32), (0, 0, t.shape[0]), z, fixed=fix, border=0.0)[..., 0]
        glyph = tm > 0.5
        if glyph.sum() == 0: continue
        near = cv2.dilate(glyph.astype(np.uint8), np.ones((9, 9), np.uint8)) > 0
        Lb = rel(bg)[near]
        lb5 = float(np.percentile(Lb, 5))
        cr = (lb5 + 0.05) / (Lt + 0.05)
        # smallest type on screen: the citation, 68 px on a 2160 canvas
        cite_px = 68 / 2 * z
        rows.append((kind, f, round(z, 3), round(cr, 2), round(cite_px, 1)))
        if cr < worst[0]: worst = (cr, (kind, f))
for r in rows: print(*r)
print("worst contrast", round(worst[0], 2), "at", worst[1], "| ink luminance", round(Lt, 4), "| pass 4.5:1:", worst[0] >= 4.5)
