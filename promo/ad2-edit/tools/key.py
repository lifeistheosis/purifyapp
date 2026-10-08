# The beat's key centre and bass notes, which the bell in tools/sfx.py is tuned to (F).
#   python3 key.py work/beat_harm.wav   (the melody part of the beat, from tools/drums.py in ../ad1-edit)
import sys, numpy as np, librosa
y, sr = librosa.load(sys.argv[1], sr=22050, mono=True)
names = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
def prof(seg):
    c = librosa.feature.chroma_cqt(y=seg, sr=sr, bins_per_octave=36, n_chroma=12)
    return c.mean(1)
maj = np.array([6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88]); mnr = np.array([6.33,2.68,3.52,5.38,2.60,3.53,2.54,4.75,3.98,2.69,3.34,3.17])
def key(p):
    best = []
    for i in range(12):
        best.append((np.corrcoef(np.roll(maj, i), p)[0,1], names[i]+' major')); best.append((np.corrcoef(np.roll(mnr, i), p)[0,1], names[i]+' minor'))
    return sorted(best)[::-1][:3]
for a, b in [(0, 16.5), (0, 4), (4, 8), (8, 12), (12, 15), (14, 16.5)]:
    p = prof(y[int(a*sr):int(b*sr)]); order = np.argsort(p)[::-1][:5]
    print(f'{a:>5}-{b:<5}', ' '.join(f'{names[i]}:{p[i]:.2f}' for i in order), '|', ', '.join(f'{k} {r:.2f}' for r, k in key(p)))
# bass notes: lowest strong pitch per half second
S = np.abs(librosa.stft(y, n_fft=8192, hop_length=2048)); f = librosa.fft_frequencies(sr=sr, n_fft=8192)
lo = (f > 30) & (f < 160)
for k in range(0, S.shape[1], 2):
    col = S[lo, k]; i = np.argmax(col); hz = f[lo][i]
    print(f'{k*2048/sr:5.2f}s bass {hz:6.1f} Hz {librosa.hz_to_note(hz)} lvl {20*np.log10(col[i]+1e-9):.0f}', end=' | ' if (k//2) % 4 != 3 else '\n')
