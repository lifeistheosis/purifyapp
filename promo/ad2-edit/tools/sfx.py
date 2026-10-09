# AD 2 effects. Every sound is an object on screen, modelled from its physics and made
# here, no samples: torn vellum, the page lifting, a stone room, the year sliding, a brass
# date wheel, seams closing, glass, a red pen, a book shutting, and a bronze bell tuned to
# the beat's F. Levels are set against the mix at each moment, then checked word by word.
#
#   python3 sfx.py track <mix 48k.wav> <voice.wav> <out.wav> <cues.json> <report.txt> <words_snapped.json>
# The report gives each effect's level and, for every word, the voice against the effects.
import sys, json, numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt, fftconvolve, iirpeak, lfilter, resample_poly

SR = 48000
def RNG(seed): return np.random.default_rng(seed)
def T(d): return np.arange(int(round(d * SR))) / SR
def filt(x, kind, f, order=2): return sosfilt(butter(order, f, btype=kind, fs=SR, output='sos'), x)
def peak(x, f, q):
    b, a = iirpeak(f, q, fs=SR); return lfilter(b, a, x)
def unit(x): return x / (np.max(np.abs(x)) + 1e-12)
def rms(x): return np.sqrt(np.mean(x ** 2) + 1e-20)

def room(rt, lp, hp=120, pre=0.02, seed=0):
    r = RNG(seed); t = T(rt * 1.2)
    ir = filt(filt(r.standard_normal(len(t)) * 10 ** (-3 * t / rt), 'lowpass', lp), 'highpass', hp)
    ir[: int(0.006 * SR)] *= np.linspace(0, 1, int(0.006 * SR))
    pk = np.max(np.abs(ir))
    for d, a in [(0.009, 0.7), (0.017, 0.5), (0.029, 0.4), (0.043, 0.3)]: ir[int(d * SR)] += a * pk * 2
    return np.concatenate([np.zeros(int(pre * SR)), ir])
def with_room(dry, ir, wet_db):
    wet = fftconvolve(dry, ir); wet *= rms(dry) / rms(wet) * 10 ** (wet_db / 20)
    out = wet.copy(); out[: len(dry)] += dry; return out

def grains(n, rate, dur, r, sigma=0.6, big_p=0.0, big=2.0):
    """Poisson clicks, the grain of friction and fracture. rate(t) in grains per second."""
    out = np.zeros(n); t = 0.0; total = n / SR
    while True:
        t += r.exponential(1.0 / max(rate(t), 1.0))
        if t >= total: break
        L = max(4, int(SR * r.uniform(*dur)))
        g = r.standard_normal(L) * np.exp(-np.arange(L) / (L * 0.3))
        a = np.exp(r.normal(0, sigma)) * (big if r.random() < big_p else 1.0)
        i = int(t * SR); m = min(L, n - i); out[i:i + m] += a * g[:m]
    return out

def tame(x, crest_db=15):
    """Round off the rare spike so a transient's peak sits at most crest_db over its loudest 100 ms."""
    w = int(0.1 * SR); r = np.sqrt(np.max(np.convolve(x ** 2, np.ones(w) / w, 'same')) + 1e-20); c = r * 10 ** (crest_db / 20)
    return c * np.tanh(x / c)

def smooth(a, b, x): k = np.clip((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k)

# ----------------------------------------------------------------------------- the sounds
def rip(d=0.26, seed=1):
    """A strip torn from a page: fibre crackle in the air above the voice, the rasp below it."""
    r = RNG(seed); n = int((d + 0.09) * SR)
    shape = lambda t: min(1.0, t / (0.06 * d)) * (1 - smooth(0.72 * d, d, t)) if t < d else 0.0
    g = grains(n, lambda t: 40 + 3800 * shape(t), (0.00015, 0.0012), r, 0.7, 0.07, 2.6)
    body = grains(n, lambda t: 20 + 900 * shape(t), (0.002, 0.005), r, 0.5)
    x = filt(g, 'highpass', 4200) * 1.0 + filt(g, 'bandpass', [1300, 3300]) * 0.3 \
        + filt(g, 'bandpass', [7000, 13000]) * 0.4 + filt(body, 'lowpass', 650) * 0.8
    tp = T(0.03); x[: len(tp)] += (filt(r.standard_normal(len(tp)), 'lowpass', 1800) * np.exp(-tp / 0.002) * 2.2
                                   + np.sin(2 * np.pi * 240 * tp) * np.exp(-tp / 0.012) * 0.5) * np.max(np.abs(x)) * 0.4
    x[: int(0.002 * SR)] *= np.linspace(0, 1, int(0.002 * SR))
    return tame(x), 0

def lift(d=0.42, seed=3):
    """The torn page flying up and out, flapping faster as it goes."""
    r = RNG(seed); t = T(d); k = t / d; nz = r.standard_normal(len(t))
    x = filt(nz, 'bandpass', [320, 850]) * (1 - k) + filt(nz, 'bandpass', [850, 2000]) * k
    rate = 7 + 19 * k ** 1.5; ph = 2 * np.pi * np.cumsum(rate) / SR
    flap = 0.3 + 0.7 * np.abs(np.sin(ph)) ** 1.6
    crack = filt(grains(len(t), lambda u: 150 + 900 * (u / d) ** 2, (0.0002, 0.0008), r), 'highpass', 5200) * 0.3
    env = k ** 2.2 * np.minimum(1, (d - t) / 0.035)
    return (x * flap + crack) * env, 0

def knock(seed=13):
    """A knock in a stone room: we are somewhere very old."""
    r = RNG(seed); t = T(0.3)
    exc = r.standard_normal(len(t)) * np.exp(-t / 0.0015)
    modes = sum(a * peak(exc, f, q) for f, q, a in [(181, 9, 1.0), (412, 12, 0.8), (623, 14, 0.55), (1150, 18, 0.35), (1890, 22, 0.2)])
    thump = np.sin(2 * np.pi * np.cumsum(72 + 30 * np.exp(-t * 40)) / SR) * np.exp(-t / 0.06)
    dry = unit(modes) * 0.9 + thump * 0.45
    return with_room(dry, room(1.9, 1500, hp=150, pre=0.024, seed=21), wet_db=0.0), 0

def slide(d=0.34, seed=19):
    """The year pushed up the page: vellum dragged on vellum, then it settles."""
    r = RNG(seed); n = int((d + 0.16) * SR); t = np.arange(n) / SR; k = np.clip(t / d, 0, 1)
    v = np.where(k < 0.5, 4 * k ** 2, 4 * (1 - k) ** 2) * (t < d)
    g = grains(n, lambda u: 300 + 2600 * float(np.interp(u, t, v)), (0.0003, 0.0016), r)
    x = (filt(g, 'bandpass', [420, 1500]) * 0.8 + filt(g, 'lowpass', 380) * 0.9) * v ** 0.7
    tt = T(0.12); tock = np.sin(2 * np.pi * 165 * tt) * np.exp(-tt / 0.028) * 0.9 + filt(r.standard_normal(len(tt)), 'lowpass', 800) * np.exp(-tt / 0.006) * 0.8
    i = int(d * SR); x[i:i + len(tt)] += tock[: n - i] * np.max(np.abs(x)) * 0.9
    return x, 0

def tumbler(seed=29):
    """A brass date wheel turning 1534 into 1646: a ratchet, then three wheels landing."""
    r = RNG(seed); n = int(0.62 * SR); out = np.zeros(n)
    def click(parts, dec, band, L, amp):
        tt = T(L); c = filt(r.standard_normal(len(tt)) * np.exp(-tt / 0.0006), 'bandpass', band, 3)
        for f, a in parts: c += a * np.sin(2 * np.pi * f * tt + r.random() * 6) * np.exp(-tt / dec)
        return c * amp
    tk = 0.05
    while tk < 0.40:
        c = click([(6400 * r.uniform(0.97, 1.03), 1.0), (8900, 0.5)], 0.0016, [5500, 11000], 0.012, 0.22 * r.uniform(0.7, 1))
        i = int(tk * SR); out[i:i + len(c)] += c[: n - i]; tk += 1 / (34 + 10 * r.random())
    for at, f0 in [(0.319, 5040), (0.370, 4760), (0.420, 4490)]:  # the three digits that change land here
        c = click([(f0, 1.0), (f0 * 1.41, 0.6), (f0 * 1.93, 0.3)], 0.005, [5000, 11000], 0.05, 0.9)
        tt = T(0.05); c += np.sin(2 * np.pi * 520 * tt) * np.exp(-tt / 0.012) * 0.35  # the wheel's body, under the voice
        i = int(at * SR); out[i:i + len(c)] += c[: n - i]
    return tame(out), 0

def seal(seed=17, pre=0.32):
    """A torn strip flying home: the tear zips shut, the strip lands."""
    r = RNG(seed); m = int(pre * SR); k = np.arange(m) / m
    zp = filt(grains(m, lambda u: 400 + 3000 * (u / pre) ** 2, (0.00015, 0.0006), r), 'highpass', 6500, 4) * k ** 2.5 * 0.5
    tp = T(0.18)
    pat = filt(r.standard_normal(len(tp)), 'lowpass', 900, 4) * np.exp(-tp / 0.009) * 1.2 + np.sin(2 * np.pi * 148 * tp) * np.exp(-tp / 0.035) * 0.8
    out = np.concatenate([zp, np.zeros(len(tp))]); out[m - 48:m - 48 + len(tp)] += pat * max(np.max(np.abs(zp)), 1e-9) * 2.0
    return tame(out), m

def tap(seed=31):
    """The page lands on the glass of the tablet."""
    r = RNG(seed); t = T(0.14)
    x = r.standard_normal(len(t)) * np.exp(-t / 0.0005) * 0.8
    for f, a, d in [(2650, 0.7, 0.010), (4410, 0.45, 0.006), (6930, 0.25, 0.004), (1180, 0.3, 0.018)]:
        x += a * np.sin(2 * np.pi * f * t + r.random() * 6) * np.exp(-t / d)
    x += np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.03) * 0.35
    return tame(x), 0

def ink(seed=37, d=0.11):
    """A red pen ringing a book's name: pen down, one quick stroke."""
    r = RNG(seed); n = int(d * SR); t = np.arange(n) / SR; k = t / d
    g = grains(n, lambda u: 900 + 1800 * np.sin(np.pi * min(1.0, u / d)), (0.0002, 0.0007), r)
    x = (filt(g, 'bandpass', [4500, 9000], 3) * 0.8 + filt(g, 'highpass', 9000) * 0.35) * np.sin(np.pi * k) ** 0.6 * (1 - 0.5 * k)
    tt = T(0.01); x[: len(tt)] += filt(r.standard_normal(len(tt)), 'highpass', 3500) * np.exp(-tt / 0.0006) * np.max(np.abs(x)) * 0.8
    return tame(x), 0

def close(seed=47):
    """A heavy book shut: the air pushed out, then the cover."""
    r = RNG(seed); tp = T(0.06)
    air = filt(r.standard_normal(len(tp)), 'bandpass', [180, 1100]) * (tp / 0.06) ** 2 * 0.5
    t = T(0.35)
    slap = filt(r.standard_normal(len(t)), 'lowpass', 1400) * np.exp(-t / 0.012) * 1.3 \
        + np.sin(2 * np.pi * 87.3 * t) * np.exp(-t / 0.075) + np.sin(2 * np.pi * 174.6 * t) * np.exp(-t / 0.04) * 0.3
    return with_room(np.concatenate([air, slap]), room(0.7, 1600, hp=100, pre=0.008, seed=49), wet_db=-8), len(tp)

def bell(fp=174.61, dur=5.0, seed=41):
    """A bronze bell tuned to F, the beat's home note: hum, prime, minor tierce, quint, nominal."""
    r = RNG(seed); t = T(dur); x = np.zeros(len(t))
    for ratio, amp, dec in [(0.5, 0.55, 6.0), (1.0, 0.8, 4.2), (1.183, 0.75, 3.4), (1.506, 0.4, 2.8), (2.0, 0.85, 2.5),
                            (2.514, 0.32, 1.6), (2.662, 0.28, 1.4), (3.011, 0.24, 1.2), (4.166, 0.16, 0.8), (5.433, 0.1, 0.5), (6.796, 0.06, 0.3)]:
        for det in (-0.0006, 0.0006):
            x += amp * 0.5 * np.sin(2 * np.pi * fp * ratio * (1 + det) * t + r.random() * 6) * np.exp(-t / dec)
    x = unit(x); ts = T(0.05)
    x[: len(ts)] += filt(r.standard_normal(len(ts)), 'bandpass', [900, 3200]) * np.exp(-ts / 0.004) * 0.6
    x[: int(0.0015 * SR)] *= np.linspace(0, 1, int(0.0015 * SR))
    x = filt(x, 'highpass', 110)
    return with_room(x, room(3.0, 3000, hp=140, pre=0.02, seed=43), wet_db=-4), 0

# ----------------------------------------------------------------------------- the score
B0, BP = 0.020, 0.4413
bt = lambda k: B0 + BP * k
# (time, pan or (pan_from, pan_to), seed); the pans follow where things move on screen
CUES = [
    ('rip',     'Paper rip',        'a strip tears out (x3)',          -8, [(bt(4), 0.3, 1), (bt(6), -0.35, 2), (bt(7), 0.3, 3)], lambda s: rip(0.24 + 0.02 * (s % 3), s)),
    ('lift',    'Page lifts away',  'the page flies up into history',  -15, [(bt(8), (0.0, 0.0), 3)], lambda s: lift(0.42, s)),
    ('knock',   'Stone room',       'c. 350, the codex',               -8, [(bt(9), 0.0, 13)], lambda s: knock(s)),
    ('slide',   'Year slides up',   '1534 pushes in',                  -15, [(bt(12), 0.0, 19)], lambda s: slide(0.34, s)),
    ('tumbler', 'Brass date wheel', '1534 turns into 1646',            -16, [(bt(14), 0.08, 29)], lambda s: tumbler(s)),
    ('seal',    'Seams close',      'each strip flies home (x3)',      -13, [(bt(18), (0.6, 0.2), 17), (bt(19), (-0.6, -0.2), 18), (bt(20), (0.6, 0.15), 19)], lambda s: seal(s)),
    ('tap',     'Glass tap',        'the page lands in the tablet',    -13, [(bt(22), 0.0, 31)], lambda s: tap(s)),
    ('ink',     'Red pen',          'a ring round each book (x4)',     -16, [(bt(24), -0.2, 37), (bt(25), 0.0, 38), (bt(26) + 0.26, 0.05, 39), (bt(28) + 0.26, 0.15, 40)], lambda s: ink(s)),
    ('close',   'Book shuts',       'the Purify lockup',               -9, [(bt(32), 0.0, 47)], lambda s: close(s)),
    ('bell',    'Bell in F',        'the tagline, then the fade',      -6, [(bt(34), 0.0, 41)], lambda s: bell(174.61, 5.0, s)),
]

def kweight(x):  # ITU-R BS.1770 K-weighting at 48 kHz
    x = lfilter([1.53512485958697, -2.69169618940638, 1.19839281085285], [1, -1.69065929318241, 0.73248077421585], x)
    return lfilter([1.0, -2.0, 1.0], [1, -1.99004745483398, 0.99007225036621], x)
def lufs(ms): return -0.691 + 10 * np.log10(ms + 1e-20)
def max_short(x, win):  # loudest window of `win` seconds
    k = kweight(x) ** 2; w = int(win * SR); c = np.convolve(k, np.ones(w) / w, 'valid') if len(k) > w else np.array([k.mean()])
    return lufs(np.max(c))

def load48(path, mono=True):
    a, sr = sf.read(path, always_2d=True); a = a.mean(1) if mono else a
    return resample_poly(a, 160, 147, axis=0) if sr == 44100 else a

def pan_gains(p, n):
    p = np.linspace(p[0], p[1], n) if isinstance(p, tuple) else np.full(n, p)
    th = (p + 1) * np.pi / 4; return np.cos(th) * np.sqrt(2), np.sin(th) * np.sqrt(2)

if __name__ == '__main__' and sys.argv[1] == 'track':
    mix, voice, out_wav, cues_json = sys.argv[2:6]
    report = open(sys.argv[6], 'w') if len(sys.argv) > 6 else sys.stdout
    m = load48(mix); v = load48(voice); dur = len(m) / SR
    track = np.zeros((len(m) + SR * 6, 2)); stems = {}; log = []
    # programme loudness, BS.1770 gated, of the mix the effects sit in
    kw = kweight(m) ** 2; blk = int(0.4 * SR); hop = int(0.1 * SR)
    z = np.array([kw[i:i + blk].mean() for i in range(0, len(kw) - blk, hop)]); z = z[lufs(z) > -70]
    z = z[lufs(z) > lufs(z.mean()) - 10]; PROG = lufs(z.mean())
    for kind, name, what, offset, cues, make in CUES:
        stem = np.zeros(len(track))
        for at, p, seed in cues:
            x, anchor = make(seed)
            i0 = int(round(at * SR)) - anchor
            # level against the mix at this moment: loudest 100 ms of the effect vs 400 ms of the mix around it
            target = PROG + offset
            g = 10 ** ((target - max_short(x, 0.1)) / 20); x = x * g
            gl, gr = pan_gains(p, len(x))
            j = min(len(track), i0 + len(x)); a = max(0, i0)
            track[a:j, 0] += (x * gl)[a - i0: j - i0]; track[a:j, 1] += (x * gr)[a - i0: j - i0]; stem[a:j] += x[a - i0: j - i0]
            log.append({'kind': kind, 'name': name, 'what': what, 't': round(at, 3), 'gain_db': round(20 * np.log10(g), 1), 'target_lufs': round(target, 1)})
        stems[kind] = stem[: len(m)]
    track = track[: len(m)]
    # let the bell bloom, then close it inside the music's own fade so nothing is cut at the last frame
    t = np.arange(len(track)) / SR; k = np.clip((t - 15.55) / (16.47 - 15.55), 0, 1)
    track *= (0.5 + 0.5 * np.cos(np.pi * k))[:, None]
    sf.write(out_wav, track.astype(np.float32), SR, subtype='FLOAT')
    json.dump(log, open(cues_json, 'w'), indent=1)
    print(f'mix programme loudness {PROG:.1f} LUFS; effects track: {dur:.3f} s, peak {20 * np.log10(np.max(np.abs(track))):.1f} dBFS', file=report)
    for e in log: print(f"  {e['t']:6.3f}  {e['name']:<17} gain {e['gain_db']:6.1f} dB  target {e['target_lufs']:6.1f} LUFS (100 ms)", file=report)
    # masking: for every word, the voice against all the effects in the band speech is understood in (1 to 4 kHz)
    words = json.load(open(sys.argv[7] if len(sys.argv) > 7 else 'words_snapped.json'))['words']
    fx = track.mean(1); vb = filt(v, 'bandpass', [1000, 4000], 4); fb = filt(fx, 'bandpass', [1000, 4000], 4)
    print('\nword          start   voice/fx (mean)   worst 20 ms', file=report)
    flags = 0
    for i, w in enumerate(words):
        a = w['on']; b = words[i + 1]['on'] if i + 1 < len(words) else a + 0.5
        b = min(max(b, a + 0.15), a + 0.6); fr = int(0.02 * SR); vs = []; fs_ = []
        for s in range(int(a * SR), int(b * SR) - fr, fr):
            vs.append(np.mean(vb[s:s + fr] ** 2)); fs_.append(np.mean(fb[s:s + fr] ** 2))
        vs, fs_ = np.array(vs), np.array(fs_); ok = vs > np.max(vs) * 0.05
        ratio = 10 * np.log10(vs[ok] / (fs_[ok] + 1e-20)); mean = 10 * np.log10(vs[ok].mean() / (fs_[ok].mean() + 1e-20))
        flag = '  <-- check' if mean < 12 or ratio.min() < 3 else ''
        flags += bool(flag)
        print(f"{w['w']:<12} {a:6.2f}   {mean:8.1f} dB      {ratio.min():8.1f} dB{flag}", file=report)
    print(f'\n{flags} words to check', file=report)
