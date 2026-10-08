# The voice alone: the mix minus the aligned beat at its measured gain.
#   python3 stem.py vo.f32 beat.f32 work/lag.npy work/gains.npy work/voice.f32
import sys, numpy as np
sr=44100
a=np.fromfile(sys.argv[1],dtype=np.float32).reshape(-1,2)
b=np.fromfile(sys.argv[2],dtype=np.float32).reshape(-1,2)
lag=int(np.load(sys.argv[3])[0]); gw=np.load(sys.argv[4])
bb=np.zeros_like(a); n=min(len(a),len(b)+lag); bb[lag:n]=b[:n-lag]
t=np.arange(len(a))/sr
# beat gain: 0.32 lead-in, 0.47 body, measured fade at the tail (voice absent there)
g=np.full(len(a),0.47)
g[t<0.38]=0.32
tail_t=np.arange(len(gw))*0.1+0.05
m=tail_t>=15.0
g_tail=np.interp(t, tail_t[m], gw[m])
g[t>=15.0]=np.clip(g_tail[t>=15.0],0,0.47)
# smooth the steps over 20 ms
k=int(0.02*sr); ker=np.ones(k)/k; g=np.convolve(g,ker,'same')
v=a-g[:,None]*bb
v.astype(np.float32).tofile(sys.argv[5])
def db(x): return 20*np.log10(np.sqrt(np.mean(x**2))+1e-9)
print("voice stem rms", db(v), " in known beat-only windows:", [round(db(v[int(s*sr):int((s+0.2)*sr)]),1) for s in (0.0,3.8,7.3,9.5,11.6,13.7,15.4)])
