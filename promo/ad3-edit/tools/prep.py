# The phone's screen, from the reader capture: the page as a strip and the sticky top bar.
#   python3 tools/prep.py work/ui assets
import sys, os
from PIL import Image, ImageFilter
Image.MAX_IMAGE_PIXELS = None
ui, out = sys.argv[1:3]; os.makedirs(out, exist_ok=True)
S = 2  # strip pixels per CSS px; the capture is at 3
p = Image.open(f'{ui}/reader_page.png').convert('RGB')
p.crop((0, 0, 1170, 4500 * 3)).resize((390 * S, 4500 * S), Image.LANCZOS).filter(ImageFilter.UnsharpMask(0.6, 30, 2)).save(f'{out}/reader_strip.png', optimize=True)
v = Image.open(f'{ui}/reader_scrolled_view.png').convert('RGB')
v.crop((0, 0, 1170, 54 * 3)).resize((390 * S, 54 * S), Image.LANCZOS).save(f'{out}/reader_bar.png', optimize=True)
print('strip and bar written')
