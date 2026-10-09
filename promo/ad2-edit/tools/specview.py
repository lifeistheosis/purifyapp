# Review image: the effects alone over the final mix, cue by cue, with the words.
#   python3 specview.py work/sfx.wav work/mix.wav work/sfx_cues.json work/words_snapped.json work/spec.png fonts/Inter-Medium.otf
import sys, json, numpy as np, soundfile as sf
from PIL import Image, ImageDraw, ImageFont
fx, sr = sf.read(sys.argv[1]); mix, _ = sf.read(sys.argv[2]); cues = json.load(open(sys.argv[3])); words = json.load(open(sys.argv[4]))['words']
fx = fx.mean(1) if fx.ndim > 1 else fx; mix = mix.mean(1) if mix.ndim > 1 else mix
W, H, PX = 2400, 360, 140  # px per second
def spec(x):
    n = 2048; hop = int(sr / PX); win = np.hanning(n); cols = []
    for i in range(0, len(x) - n, hop): cols.append(np.abs(np.fft.rfft(x[i:i + n] * win)))
    S = 20 * np.log10(np.array(cols).T + 1e-9); f = np.fft.rfftfreq(n, 1 / sr)
    # log frequency axis 60 Hz .. 16 kHz
    ys = np.geomspace(60, 16000, H); idx = np.searchsorted(f, ys)
    return S[idx][::-1]
def img(S, top):
    v = np.clip((S - (top - 80)) / 80, 0, 1)
    rgb = np.stack([v ** 0.8 * 235, v ** 1.6 * 225, v ** 3 * 220 + v * 30], -1).astype(np.uint8)
    return Image.fromarray(rgb)
A = spec(fx); B = spec(mix); top = max(A.max(), B.max())
ia, ib = img(A, top), img(B, top)
cols = A.shape[1]; out = Image.new('RGB', (cols, 2 * H + 120), (10, 12, 20)); out.paste(ia, (0, 40)); out.paste(ib, (0, H + 80))
d = ImageDraw.Draw(out); f = ImageFont.truetype(sys.argv[6], 20); fs = ImageFont.truetype(sys.argv[6], 16)
d.text((8, 8), 'EFFECTS ALONE (log freq 60 Hz to 16 kHz)', fill=(166, 178, 196), font=f); d.text((8, H + 48), 'FINAL MIX: voiceover, beat and effects', fill=(166, 178, 196), font=f)
for c in cues:
    x = int(c['t'] * PX); d.line([(x, 40), (x, 2 * H + 80)], fill=(217, 58, 63), width=1); d.text((x + 3, 42), c['name'], fill=(243, 241, 236), font=fs)
for w in words:
    x = int(w['on'] * PX); d.text((x + 2, 2 * H + 86), w['w'], fill=(166, 178, 196), font=fs); d.line([(x, 2 * H + 80), (x, 2 * H + 100)], fill=(166, 178, 196))
for s in range(0, 17): d.text((s * PX + 2, H + 44 - 18), f'{s}s', fill=(90, 100, 120), font=fs)
out.save(sys.argv[5]); print(out.size)
