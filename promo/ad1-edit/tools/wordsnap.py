import json, sys, numpy as np, soundfile as sf
y,sr=sf.read(sys.argv[1]); y=y.mean(1) if y.ndim>1 else y
words=json.load(open(sys.argv[2]))[sys.argv[3]]
hop=int(0.005*sr); win=int(0.02*sr)
env=np.array([np.sqrt(np.mean(y[i:i+win]**2)+1e-12) for i in range(0,len(y)-win,hop)])
db=20*np.log10(env+1e-9)
t=np.arange(len(db))*hop/sr
# smooth
k=5; dbs=np.convolve(db,np.ones(k)/k,'same')
# onset function: rise over 30 ms
r=np.zeros_like(dbs); L=6; r[L:]=dbs[L:]-dbs[:-L]
cands=[i for i in range(1,len(r)-1) if r[i]>6 and r[i]>=r[i-1] and r[i]>=r[i+1] and dbs[i]>-45]
ct=t[cands]
out=[]
for w in words:
    tt=w['t']
    # parakeet token time ~ within [-0.06,+0.16] of acoustic onset
    near=[c for c in ct if tt-0.10<=c<=tt+0.12]
    best=min(near,key=lambda c:abs(c-(tt+0.02))) if near else None
    # for words starting with a vowel after a word (no onset), fallback to token time
    out.append({'w':w['w'],'tok':tt,'on':round(float(best),3) if best is not None else tt})
# end of each phrase: last time voice above -40 dB before a gap >0.25s
voiced=dbs>-38
ends=[];starts=[]
i=0
while i<len(voiced):
    if voiced[i]:
        j=i
        while j<len(voiced) and (voiced[j] or (j+50<len(voiced) and voiced[j:j+50].any())): j+=1
        starts.append(round(float(t[i]),3)); ends.append(round(float(t[min(j,len(t)-1)]),3)); i=j
    else: i+=1
print("phrases:", list(zip(starts,ends)))
for o in out: print(f"{o['w']:<14} token {o['tok']:6.3f}  onset {o['on']:6.3f}")
json.dump({'words':out,'phrases':list(zip(starts,ends))},open(sys.argv[4],'w'),indent=1)
