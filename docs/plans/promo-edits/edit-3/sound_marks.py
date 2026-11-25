# The landmarks of a song, pinned to about a hundredth of a second: where the bass goes out and comes in, and the loudness around each. Run: python -I sound_marks.py <file>.
import sys, numpy as np, librosa
y,sr=librosa.load(sys.argv[1],sr=22050,mono=True)
hop=128; S=np.abs(librosa.stft(y,n_fft=2048,hop_length=hop))**2
f=librosa.fft_frequencies(sr=sr,n_fft=2048); t=librosa.frames_to_time(np.arange(S.shape[1]),sr=sr,hop_length=hop)
sub=10*np.log10(S[(f>=25)&(f<110)].sum(axis=0)+1e-10); allb=10*np.log10(S.sum(axis=0)+1e-10)
k=np.ones(9)/9; sub=np.convolve(sub,k,'same'); allb=np.convolve(allb,k,'same')
ref=np.percentile(sub,95); refa=np.percentile(allb,95)
def cross(lo,hi,kind,arr,refv,thr):
    m=(t>=lo)&(t<=hi); idx=np.where(m)[0]
    for i in idx[1:]:
        a,b=arr[i-1]-refv,arr[i]-refv
        if kind=='in' and a<thr<=b: return t[i]
        if kind=='out' and a>=thr>b: return t[i]
    return None
print("sub-bass ref %.1f dB, full ref %.1f dB"%(ref,refa))
for lo,hi,kind in [(1.0,2.6,'in'),(8.8,10.4,'out'),(10.8,11.9,'in'),(16.5,17.6,'out'),(17.9,18.9,'in'),(31.5,32.3,'out'),(32.0,33.0,'in'),(35.6,36.6,'out'),(36.5,37.6,'in')]:
    print(f"sub {kind:3s} in [{lo},{hi}]: {cross(lo,hi,kind,sub,ref,-12)}")
for lo,hi,kind in [(35.5,36.8,'out'),(36.3,37.3,'in'),(54.8,56.7,'out')]:
    print(f"full {kind:3s} in [{lo},{hi}]: {cross(lo,hi,kind,allb,refa,-15)}")
# loudness of each 0.1 s in key windows
for lo,hi in [(0,2.4),(9.2,11.8),(16.6,18.8),(31.6,33.0),(35.6,37.6),(54.6,56.66)]:
    print(f"\n{lo}-{hi} full dB rel (0.1s):",' '.join(f"{x:.1f}:{allb[(t>=x)&(t<x+0.1)].mean()-refa:.0f}" for x in np.arange(lo,hi,0.1)))
