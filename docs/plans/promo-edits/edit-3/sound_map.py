# The sound map of a song: tempo, bar lines, energy by band, sections. Run: python -I sound_map.py <file> (needs librosa in a venv).
import sys, numpy as np, librosa
p=sys.argv[1]
y,sr=librosa.load(p,sr=22050,mono=True)
dur=len(y)/sr
hop=512
tempo,beats=librosa.beat.beat_track(y=y,sr=sr,hop_length=hop,units='time')
tempo=float(np.atleast_1d(tempo)[0])
print(f"duration {dur:.2f}s  tempo {tempo:.1f} bpm  beats {len(beats)}  beat period {60/tempo:.3f}s")
print("beats:",' '.join(f"{b:.2f}" for b in beats))
S=np.abs(librosa.stft(y,n_fft=2048,hop_length=hop))
f=librosa.fft_frequencies(sr=sr,n_fft=2048); t=librosa.frames_to_time(np.arange(S.shape[1]),sr=sr,hop_length=hop)
def band(lo,hi): return (S[(f>=lo)&(f<hi)]**2).sum(axis=0)
tot=(S**2).sum(axis=0)+1e-12
bands={'sub<120':band(20,120),'low120-500':band(120,500),'mid500-2k':band(500,2000),'high2k-8k':band(2000,8000)}
rms=librosa.feature.rms(y=y,hop_length=hop)[0]
step=0.5; edges=np.arange(0,dur+step,step)
print("\n t     dB   sub%  low%  mid%  high%")
for a,b in zip(edges[:-1],edges[1:]):
    m=(t>=a)&(t<b)
    if not m.any(): continue
    db=20*np.log10(rms[m].mean()+1e-9)
    shares=[bands[k][m].sum()/tot[m].sum()*100 for k in bands]
    print(f"{a:5.1f} {db:6.1f} "+' '.join(f"{s:5.0f}" for s in shares))
on=librosa.onset.onset_strength(y=y,sr=sr,hop_length=hop)
pk=librosa.util.peak_pick(on,pre_max=8,post_max=8,pre_avg=20,post_avg=20,delta=0.3,wait=8)
top=sorted(pk,key=lambda i:-on[i])[:30]; top=sorted(top)
print("\nstrongest onsets:",' '.join(f"{t[i]:.2f}" for i in top))
# sections
chroma=librosa.feature.chroma_cqt(y=y,sr=sr,hop_length=hop)
mf=librosa.feature.mfcc(y=y,sr=sr,hop_length=hop,n_mfcc=13)
feat=np.vstack([librosa.util.normalize(chroma,axis=1),librosa.util.normalize(mf,axis=1)])
for k in (5,7,9):
    bd=librosa.segment.agglomerative(feat,k)
    print(f"sections k={k}:",' '.join(f"{t[i]:.2f}" for i in bd))
# bass entries / big jumps in sub energy (1s windows)
sub=bands['sub<120']; w=int(0.5*sr/hop)
sm=np.convolve(sub,np.ones(w)/w,mode='same'); 
jumps=[(t[i], 10*np.log10((sm[i+w]+1e-9)/(sm[i-w]+1e-9))) for i in range(w,len(sm)-w,w//2)]
jumps=sorted(jumps,key=lambda x:-abs(x[1]))[:10]
print("\nbiggest sub-bass changes (t, dB):",' '.join(f"{a:.2f}:{b:+.1f}" for a,b in sorted(jumps)))
# harmonic/percussive balance per 2 s
H,P=librosa.effects.hpss(y)
print("\nper 2s: percussive share %")
print(' '.join(f"{i*2}:{(P[int(i*2*sr):int((i+1)*2*sr)]**2).sum()/((y[int(i*2*sr):int((i+1)*2*sr)]**2).sum()+1e-9)*100:.0f}" for i in range(int(dur//2)+1)))
