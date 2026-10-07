import sys, json, numpy as np, librosa
y, sr = librosa.load(sys.argv[1], sr=44100, mono=True)
D = librosa.stft(y, n_fft=2048, hop_length=256)
H, P = librosa.decompose.hpss(D, margin=(1.0, 2.0))
Pm = np.abs(P); Hm=np.abs(H)
freqs = librosa.fft_frequencies(sr=sr, n_fft=2048)
times = librosa.frames_to_time(np.arange(Pm.shape[1]), sr=sr, hop_length=256)
def band_onset(lo, hi, M=Pm):
    m = (freqs>=lo)&(freqs<hi)
    S = librosa.amplitude_to_db(M[m], ref=np.max)
    env = librosa.onset.onset_strength(S=S, sr=sr, hop_length=256, aggregate=np.mean)
    return env
kick = band_onset(30, 150)
snare = band_onset(180, 450) * 0.5 + band_onset(1500, 7000) * 1.0
hat = band_onset(7000, 16000)
full = librosa.onset.onset_strength(y=y, sr=sr, hop_length=256)
def pick(env, delta, wait):
    on = librosa.onset.onset_detect(onset_envelope=env, sr=sr, hop_length=256, backtrack=False, delta=delta, wait=wait, normalize=True)
    return [(round(float(times[i]),3), round(float(env[i]/env.max()),2)) for i in on]
tempo, beats = librosa.beat.beat_track(onset_envelope=full, sr=sr, hop_length=256, start_bpm=92, tightness=200)
bt = librosa.frames_to_time(beats, sr=sr, hop_length=256)
print("tempo", tempo, "beats", np.round(bt,3).tolist())
res = {"kick": pick(kick, 0.12, 6), "snare": pick(snare, 0.12, 6), "hat": pick(hat, 0.10, 4), "full": pick(full, 0.08, 5)}
for k,v in res.items():
    strong = [a for a in v if a[1] >= 0.35]
    print(f"{k}: {len(v)} onsets; strong(>=0.35): {len(strong)}")
    print("   ", "  ".join(f"{a:.3f}:{b}" for a,b in v))
# harmonic-layer events (melodic hits / fx) : onset of harmonic energy in 300-3000 Hz
harm = band_onset(250, 3000, Hm)
res["harm"] = pick(harm, 0.15, 8)
print("harm:", "  ".join(f"{a:.3f}:{b}" for a,b in res["harm"]))
json.dump({"tempo": float(np.atleast_1d(tempo)[0]), "beats": bt.tolist(), **res}, open(sys.argv[2], "w"), indent=0)
# save percussive & harmonic stems for listening-free inspection
import soundfile as sf
sf.write(sys.argv[3], librosa.istft(P, hop_length=256, length=len(y)), sr)
sf.write(sys.argv[4], librosa.istft(H, hop_length=256, length=len(y)), sr)
