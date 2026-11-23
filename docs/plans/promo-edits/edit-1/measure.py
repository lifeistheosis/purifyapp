# Measures the reference frame by frame: every frame's change from the last, cuts, smears, colour, and the bass.
import subprocess, json, sys, numpy as np
V='ref/v.mp4'; w=h=96
raw=subprocess.run(['ffmpeg','-v','error','-i',V,'-vf',f'scale={w}:{h}:flags=area','-pix_fmt','rgb24','-f','rawvideo','-'],capture_output=True).stdout
a=np.frombuffer(raw,np.uint8).reshape(-1,h,w,3).astype(np.float32); n=len(a)
g=a.mean(3); b=g.mean((1,2))
sat=(a.max(3)-a.min(3)).mean((1,2))
d=np.r_[0,np.abs(g[1:]-g[:-1]).mean((1,2))]
white=(g>200).mean((1,2))
# sound: low band energy
pcm=subprocess.run(['ffmpeg','-v','error','-i',V,'-ac','1','-ar','44100','-f','f32le','-'],capture_output=True).stdout
s=np.frombuffer(pcm,np.float32); sr=44100
S=np.fft.rfft(s); f=np.fft.rfftfreq(len(s),1/sr)
low=np.fft.irfft(np.where(f<120,S,0),len(s)); hop=sr//60
le=np.array([np.sqrt((low[i*hop:(i+1)*hop]**2).mean()) for i in range(len(s)//hop)])
fe=np.array([np.sqrt((s[i*hop:(i+1)*hop]**2).mean()) for i in range(len(s)//hop)])
json.dump(dict(n=n,d=d.round(2).tolist(),b=b.round(1).tolist(),sat=sat.round(1).tolist(),white=white.round(3).tolist(),low=le.round(4).tolist(),full=fe.round(4).tolist()),open('ref/measure.json','w'))
print('frames',n,'audio frames',len(le))
# print compact per-frame table, 2.0 to 20 s
def row(i): return f"{i:4d} {i/60:6.3f} d={d[i]:5.1f} b={b[i]:5.1f} sat={sat[i]:4.1f} wh={white[i]:.2f} low={le[min(i,len(le)-1)]:.3f}"
# low band profile per 0.25s
print('low band by quarter second:')
for q in range(0,80):
    seg=le[q*15:(q+1)*15]
    if len(seg): print(f"{q*0.25:5.2f}:{seg.mean():.3f}",end='  ' if q%6!=5 else '\n')
print()
# frames with notable change
print('frames with d>6:')
out=[]
for i in range(1,n):
    if d[i]>6: out.append(f"{i}({d[i]:.0f})")
print(' '.join(out))
print('sat by half second:',' '.join(f"{sat[i:i+30].mean():.0f}" for i in range(0,n,30)))
print('bright by half second:',' '.join(f"{b[i:i+30].mean():.0f}" for i in range(0,n,30)))
