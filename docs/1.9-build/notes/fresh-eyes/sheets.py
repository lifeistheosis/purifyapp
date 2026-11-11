# Contact sheets of the walk's pictures, four screens to a sheet, each named.
#   python3 docs/1.9-build/notes/fresh-eyes/sheets.py <folder of pngs> [per sheet]
import sys, os, glob
from PIL import Image, ImageDraw
src = sys.argv[1]; per = int(sys.argv[2]) if len(sys.argv) > 2 else 4
files = sorted(glob.glob(os.path.join(src, "*.png")))
out = os.path.join(src, "sheets"); os.makedirs(out, exist_ok=True)
for i in range(0, len(files), per):
    ims = [Image.open(f).convert("RGB") for f in files[i:i+per]]
    w = sum(im.width for im in ims) + 8 * (len(ims) - 1); h = max(im.height for im in ims) + 22
    sheet = Image.new("RGB", (w, h), (255, 255, 255)); d = ImageDraw.Draw(sheet); x = 0
    for f, im in zip(files[i:i+per], ims):
        sheet.paste(im, (x, 22)); d.text((x + 4, 4), os.path.basename(f)[:60], fill=(0, 0, 0)); x += im.width + 8
    sheet.save(os.path.join(out, f"sheet-{i//per:03d}.png"))
print(len(files), "pictures,", (len(files) + per - 1) // per, "sheets in", out)
