# Labels for the effects-only review video: one chip per effect, plus a header. Review only, never posted.
#   python3 captions.py <cues.json> <fonts dir> <out dir> <gain_db>   -> chips + windows.json
import sys, json, os
from PIL import Image, ImageDraw, ImageFont
cues = json.load(open(sys.argv[1])); FD = sys.argv[2]; OUT = sys.argv[3]; GAIN = sys.argv[4]; os.makedirs(OUT, exist_ok=True)
F = lambda w, s: ImageFont.truetype(f'{FD}/Inter-{w}.otf', s)
WHITE, STEEL, RED, INK = (243, 241, 236, 255), (166, 178, 196, 255), (217, 58, 63, 255), (5, 7, 13, 214)
DESC = {'rip': 'a strip tears out of the page', 'lift': 'the page flies up into the history', 'knock': 'c. 350, the codex: somewhere very old',
        'slide': '1534 pushes the old year up', 'tumbler': '1534 turns into 1646, digit by digit', 'seal': 'each strip flies home and the tear closes',
        'tap': 'the page lands in the tablet', 'ink': 'a ring round each set of books', 'close': 'the Purify lockup', 'bell': 'the tagline; tuned to the beat’s key'}
def spaced(d, xy, text, font, fill, track):
    x, y = xy
    for ch in text: d.text((x, y), ch, font=font, fill=fill); x += font.getlength(ch) + track
    return x
def width(text, font, track): return sum(font.getlength(c) + track for c in text) - track
groups = []
for c in cues:
    if groups and groups[-1]['kind'] == c['kind']: groups[-1]['ts'].append(c['t'])
    else: groups.append({'kind': c['kind'], 'name': c['name'], 'ts': [c['t']]})
wins = []
for i, g in enumerate(groups):
    im = Image.new('RGBA', (1080, 1920), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    x0, y0, x1, y1 = 56, 1676, 1024, 1834
    d.rounded_rectangle((x0, y0, x1, y1), 24, fill=INK, outline=(166, 178, 196, 70), width=2)
    spaced(d, (92, y0 + 26), f'{i + 1:02d}', F('Bold', 50), RED, 1)
    spaced(d, (180, y0 + 30), g['name'].upper(), F('SemiBold', 42), WHITE, 3)
    times = '  ·  '.join(f'{t:.2f}' for t in g['ts']) + ' s'
    ft = F('Medium', 28); spaced(d, (x1 - 36 - width(times, ft, 0.5), y0 + 42), times, ft, STEEL, 0.5)
    spaced(d, (180, y0 + 92), DESC[g['kind']], F('Medium', 30), (166, 178, 196, 230), 0.3)
    p = f'{OUT}/chip_{i + 1:02d}.png'; im.save(p)
    nxt = groups[i + 1]['ts'][0] if i + 1 < len(groups) else 16.5
    wins.append({'png': p, 'a': round(max(0, g['ts'][0] - 0.15), 3), 'b': round(min(g['ts'][-1] + 0.95, nxt - 0.12, 16.45), 3)})
# the header, there the whole time
im = Image.new('RGBA', (1080, 1920), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
h1 = 'EFFECTS ONLY'; f1 = F('SemiBold', 26); spaced(d, ((1080 - width(h1, f1, 7)) / 2, 44), h1, f1, STEEL, 7)
h2 = f'voice and beat muted, effects turned up {GAIN} dB so each one is clear'; f2 = F('Medium', 23)
spaced(d, ((1080 - width(h2, f2, 0.2)) / 2, 84), h2, f2, (166, 178, 196, 190), 0.2)
im.save(f'{OUT}/header.png')
json.dump(wins, open(f'{OUT}/windows.json', 'w'), indent=1); print(json.dumps(wins))
