# The parts of a song compared band by band (loudness, sub, mids, top, brightness, width, onsets): how the drop at 18.51 was found. Run: python -I sound_drop.py <file>.
import sys, numpy as np, librosa
y,sr=librosa.load(sys.argv[1],sr=22050,mono=False)
mono=librosa.to_mono(y); hop=512
S=np.abs(librosa.stft(mono,n_fft=2048,hop_length=hop))**2
f=librosa.fft_frequencies(sr=sr,n_fft=2048); t=librosa.frames_to_time(np.arange(S.shape[1]),sr=sr,hop_length=hop)
on=librosa.onset.onset_strength(y=mono,sr=sr,hop_length=hop)
pk=librosa.util.peak_pick(on,pre_max=3,post_max=3,pre_avg=10,post_avg=10,delta=0.25,wait=4)
cent=librosa.feature.spectral_centroid(S=np.sqrt(S),sr=sr)[0]
L,R=y[0],y[1]
def seg(a,b):
    m=(t>=a)&(t<b); i0,i1=int(a*sr),int(b*sr)
    rms=10*np.log10((mono[i0:i1]**2).mean()+1e-12)
    def band(lo,hi): return 10*np.log10(S[(f>=lo)&(f<hi)][:,m].sum(axis=0).mean()+1e-12)
    side=((L[i0:i1]-R[i0:i1])**2).mean(); mid=((L[i0:i1]+R[i0:i1])**2).mean()
    n_on=sum(1 for p in pk if a<=t[p]<b)
    return f"{a:5.2f}-{b:5.2f}  rms {rms:6.1f}  sub {band(25,110):5.1f}  lowmid {band(110,500):5.1f}  mid {band(500,2000):5.1f}  high {band(2000,8000):5.1f}  air {band(8000,11000):5.1f}  centroid {np.median(cent[m]):5.0f}Hz  width {10*np.log10(side/(mid+1e-12)+1e-12):5.1f}dB  onsets/s {n_on/(b-a):4.1f}"
for a,b in [(0.0,2.25),(2.25,9.65),(11.71,16.63),(18.51,25.0),(25.0,32.0),(32.7,35.85),(37.43,46.9),(46.9,54.85)]:
    print(seg(a,b))
print()
for a in np.arange(16.0,21.01,0.25): print(seg(a,a+0.25))
