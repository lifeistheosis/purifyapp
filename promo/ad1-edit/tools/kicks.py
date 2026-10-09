import sys, json, numpy as np, soundfile as sf, librosa
perc,sr=sf.read(sys.argv[1]); harm,_=sf.read(sys.argv[2]); full,_=sf.read(sys.argv[3])
if full.ndim>1: full=full.mean(1)
hop=128
def bandenv(y,lo,hi,n=2048):
    D=np.abs(librosa.stft(y.astype(np.float32),n_fft=n,hop_length=hop))
    f=librosa.fft_frequencies(sr=sr,n_fft=n); m=(f>=lo)&(f<hi)
    e=np.sqrt((D[m]**2).sum(0)); return e
t=None
def onsets(e, rel=0.25, mindist=0.12, rise_db=6):
    edb=20*np.log10(e+1e-9)
    tt=np.arange(len(e))*hop/sr
    # positive derivative over ~23ms
    k=4
    d=np.zeros_like(edb); d[k:]=edb[k:]-edb[:-k]
    peaks=[]
    thr=rise_db
    i=k
    while i<len(d)-1:
        if d[i]>thr and d[i]>=d[i-1] and d[i]>=d[i+1]:
            # level after onset
            lvl=edb[i:i+int(0.05*sr/hop)].max()
            peaks.append((tt[i-k//2],d[i],lvl))
            i+=int(mindist*sr/hop)
        else: i+=1
    mx=max(p[2] for p in peaks)
    return [(round(a,3),round(b,1),round(c-mx,1)) for a,b,c in peaks]
ek=bandenv(perc,30,160)
es=bandenv(perc,1500,8000)
esub=bandenv(full,25,90,4096)
print("KICK (percussive 30-160Hz): time, rise dB, level rel max dB")
K=onsets(ek,rise_db=7,mindist=0.10)
print("  "+"  ".join(f"{a:.3f}({b},{c})" for a,b,c in K))
print("SNARE/CLAP (percussive 1.5-8k):")
SN=onsets(es,rise_db=8,mindist=0.10)
print("  "+"  ".join(f"{a:.3f}({b},{c})" for a,b,c in SN))
print("SUB/808 (full mix 25-90Hz):")
SB=onsets(esub,rise_db=5,mindist=0.15)
print("  "+"  ".join(f"{a:.3f}({b},{c})" for a,b,c in SB))
json.dump({"kick":K,"snare":SN,"sub":SB},open(sys.argv[4],'w'))
