# How loud the beat is inside the mix, every 100 ms (the tail fade is read from this).
#   python3 localgain.py vo.f32 beat.f32 work/lag.npy work/gains.npy
import sys, numpy as np
sr=44100
a=np.fromfile(sys.argv[1],dtype=np.float32).reshape(-1,2)
b=np.fromfile(sys.argv[2],dtype=np.float32).reshape(-1,2)
lag=int(np.load(sys.argv[3])[0])
# mix[t] ~ g(t) * beat[t - lag]
bb=np.zeros_like(a); n=min(len(a),len(b)+lag)
bb[lag:n]=b[:n-lag]
hop=int(0.1*sr)
gs=[]
for i in range(0,len(a)-hop,hop):
    x=a[i:i+hop].ravel(); y=bb[i:i+hop].ravel()
    g=float(np.dot(x,y)/(np.dot(y,y)+1e-9)); r=x-g*y
    def db(v): return 20*np.log10(np.sqrt(np.mean(v**2))+1e-9)
    gs.append(g)
    print(f"{i/sr:5.1f}s gain {g:5.2f}  mix {db(x):6.1f}  beat {db(g*y):6.1f}  resid {db(r):6.1f}")
np.save(sys.argv[4], np.array(gs))
