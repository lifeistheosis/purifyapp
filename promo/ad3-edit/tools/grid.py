# The beat grid from the mix alone (no beat-only file came with AD 3): period and first beat
# that best fit the percussive part, then kick and snare strength on each beat.
#   python3 tools/grid.py work/perc.wav   (perc.wav from ../ad1-edit/tools/drums.py)
import sys, numpy as np, soundfile as sf
x, sr = sf.read(sys.argv[1]); x = x.mean(1) if x.ndim > 1 else x
n = 1024; hop = 128; w = np.hanning(n); F = 1 + (len(x) - n) // hop
S = np.empty((F, n // 2 + 1), np.float32)
for i in range(F): S[i] = np.abs(np.fft.rfft(x[i * hop:i * hop + n] * w))
fr = np.fft.rfftfreq(n, 1 / sr)
def flux(lo, hi):
    m = (fr >= lo) & (fr < hi); B = np.log1p(20 * S[:, m]); d = np.diff(B, axis=0, prepend=B[:1]); d[d < 0] = 0; return d.mean(1)
K = flux(30, 130); SN = flux(1500, 6000); A = flux(30, 16000)
def score(sig, p, ph):
    tt = ph + np.arange(0, 40) * p; tt = tt[tt < len(x) / sr - 0.05]
    idx = ((tt * sr - n / 2) / hop).astype(int); idx = idx[(idx > 0) & (idx < F - 2)]
    return (sig[idx] + sig[idx + 1]).sum() / len(idx)
best = max(((score(A, p, ph), p, ph) for p in np.arange(0.560, 0.630, 0.0002) for ph in np.arange(0.0, p, 0.002)))
_, p, ph = best
print(f'beat period {p:.4f} s = {60 / p:.2f} BPM, first beat {ph:.3f} s')
for k in range(64):
    tt = ph + k * p
    if tt > len(x) / sr - 0.05: break
    i = int((tt * sr - n / 2) / hop)
    if 1 <= i < F - 3: print(f'b{k:2d} {tt:6.3f}  kick {K[i:i + 3].max():5.2f}  snare {SN[i:i + 3].max():5.2f}')
