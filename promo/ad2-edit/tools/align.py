# Finds where the beat sits inside the voiceover mix, to the sample.
#   python3 align.py vo.f32 beat.f32 work/lag.npy   (both 44.1 kHz stereo float32, from ffmpeg -f f32le)
import sys, numpy as np
sr=44100
a=np.fromfile(sys.argv[1],dtype=np.float32).reshape(-1,2).mean(1)   # mix (voice + beat)
b=np.fromfile(sys.argv[2],dtype=np.float32).reshape(-1,2).mean(1)   # beat alone
# coarse: envelope cross-correlation over the full range of offsets
def env(x, hop=441):
    n=len(x)//hop; x=x[:n*hop].reshape(n,hop); return np.sqrt((x**2).mean(1))
ea, eb = env(a), env(b)
ea=(ea-ea.mean())/ea.std(); eb=(eb-eb.mean())/eb.std()
N=1
while N < len(ea)+len(eb): N*=2
c=np.fft.irfft(np.fft.rfft(ea,N)*np.conj(np.fft.rfft(eb,N)),N)
lags=np.concatenate([np.arange(0,len(ea)), np.arange(-len(eb)+1,0)])
cc=np.concatenate([c[:len(ea)], c[N-len(eb)+1:]])
best=lags[np.argmax(cc)]
print("coarse best lag (10ms units):", best, "=", best*0.01, "s  (beat sample t corresponds to mix t + lag)")
# fine: sample-level correlation around the coarse lag using full-rate signals (high-passed to emphasize drums)
L=int(best*441)
def seg_corr(lag):
    if lag>=0: x=a[lag:]; y=b[:len(x)]
    else: y=b[-lag:]; x=a[:len(y)]
    n=min(len(x),len(y),sr*12); return float(np.dot(x[:n],y[:n])/ (np.linalg.norm(x[:n])*np.linalg.norm(y[:n])+1e-9))
bestf=max(((seg_corr(L+d),L+d) for d in range(-900,901,3)))
lag=bestf[1]
bestf=max(((seg_corr(lag+d),lag+d) for d in range(-4,5)))
print("fine best lag samples:", bestf[1], "=", bestf[1]/sr, "s  corr", round(bestf[0],4))
np.save(sys.argv[3], np.array([bestf[1]]))
