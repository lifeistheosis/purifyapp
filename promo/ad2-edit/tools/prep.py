# Grades the two pictures AD 2 uses into assets/.
#   python3 prep.py ../../../public work/ui assets
# The codex is public/sections/bible.jpg (Codex Sinaiticus, Matthew 6:4-32, 4th century, public
# domain: docs/licensing/SECTION_MEDIA.md), mapped to lapis. The tablet strip is the app's own
# /bible page, from tools/bible-capture.mjs.
import sys, os, numpy as np
from PIL import Image, ImageFilter
pub, ui, out = sys.argv[1:4]; os.makedirs(out, exist_ok=True)
def lum(im):
    a = np.asarray(im.convert('RGB')).astype(np.float32) / 255
    return 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]
def gradmap(L, stops):
    xs = np.array([s[0] for s in stops]); cs = np.array([s[1] for s in stops], dtype=np.float32)
    return Image.fromarray(np.clip(np.stack([np.interp(L, xs, cs[:, i]) for i in range(3)], -1), 0, 255).astype(np.uint8))
LAPIS = [(0.0, (5, 8, 16)), (0.35, (22, 32, 54)), (0.65, (84, 98, 126)), (0.88, (184, 190, 200)), (1.0, (232, 230, 224))]
b = Image.open(f'{pub}/sections/bible.jpg').convert('RGB')
L = np.clip((lum(b) - 0.1) / 0.85, 0, 1) ** 1.1
gradmap(L, LAPIS).filter(ImageFilter.UnsharpMask(1.0, 50, 2)).save(f'{out}/codex_lapis.jpg', quality=94)
t = Image.open(f'{ui}/tablet_full.png').convert('RGB'); w, h = t.size; s = 840 / w
t.resize((840, round(h * s)), Image.LANCZOS).filter(ImageFilter.UnsharpMask(0.8, 40, 2)).save(f'{out}/tablet_strip.png', optimize=True)
print('codex', b.size, 'tablet strip', (840, round(h * s)))
