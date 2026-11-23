import subprocess, sys, os, json
import numpy as np
from PIL import Image, ImageDraw, ImageFont

def probe(path):
    j = json.loads(subprocess.run(['ffprobe','-v','error','-select_streams','v:0','-show_entries','stream=width,height,r_frame_rate,nb_frames:format=duration','-of','json',path],capture_output=True).stdout)
    s = j['streams'][0]; a,b = s['r_frame_rate'].split('/')
    return dict(w=int(s['width']),h=int(s['height']),fps=float(a)/float(b),n=int(s.get('nb_frames',0)),dur=float(j['format']['duration']))

def font(sz):
    for p in ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf','/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf']:
        if os.path.exists(p): return ImageFont.truetype(p, sz)
    return ImageFont.load_default()

def video_stats(path, info):
    w,h = 96,54
    raw = subprocess.run(['ffmpeg','-v','error','-i',path,'-vf',f'scale={w}:{h}:flags=area,format=gray','-f','rawvideo','-'],capture_output=True).stdout
    a = np.frombuffer(raw,np.uint8).reshape(-1,h,w).astype(np.float32)
    fps = info['fps']; n = len(a)
    b = a.mean(axis=(1,2))
    d = np.r_[0, np.abs(a[1:]-a[:-1]).mean(axis=(1,2))]
    hist = np.stack([np.histogram(f,bins=16,range=(0,256))[0] for f in a]).astype(np.float32)/(w*h)
    dh = np.r_[0, np.abs(hist[1:]-hist[:-1]).sum(axis=1)/2]
    # cuts: strong pixel change AND histogram change, local peak
    cuts=[]
    for i in range(1,n):
        lo=max(1,i-6); hi=min(n,i+7)
        med = np.median(d[lo:hi])
        if d[i]>18 and d[i]>2.5*med+4 and dh[i]>0.18 and d[i]>=d[lo:hi].max()-1e-6:
            cuts.append(i)
    # flashes: brightness spike lasting <=3 frames
    flashes=[]
    for i in range(2,n-3):
        base = min(b[max(0,i-3):i].mean(), b[i+2:i+5].mean() if i+5<=n else 255)
        if b[i]-base>55 and b[i]>150: 
            if not flashes or i-flashes[-1]>3: flashes.append(i)
    # dark flashes / black frames
    blacks=[i for i in range(n) if b[i]<8]
    # motion between cuts (shake/zoom energy): median d excluding cut frames
    mask=np.ones(n,bool); mask[cuts]=False
    still = float((d[mask]<0.6).mean())  # share of frames that are held (duplicate) frames
    return dict(fps=fps,n=n,cuts=[c/fps for c in cuts],flashes=[f/fps for f in flashes],
                black_share=len(blacks)/n,bright_mean=float(b.mean()),dark_share=float((b<40).mean()),
                motion_med=float(np.median(d[mask])),held_share=still,d=d,b=b)

def color_stats(path):
    w,h=64,36
    raw = subprocess.run(['ffmpeg','-v','error','-i',path,'-vf',f'fps=3,scale={w}:{h}:flags=area','-pix_fmt','rgb24','-f','rawvideo','-'],capture_output=True).stdout
    a = np.frombuffer(raw,np.uint8).reshape(-1,h,w,3).astype(np.float32)/255
    mx=a.max(axis=3); mn=a.min(axis=3)
    sat = np.where(mx>0.08,(mx-mn)/np.maximum(mx,1e-6),0)
    persat = sat.mean(axis=(1,2))
    r,g,bl = a[...,0].mean(),a[...,1].mean(),a[...,2].mean()
    return dict(sat_mean=float(persat.mean()), mono_share=float((persat<0.08).mean()), rgb=(float(r),float(g),float(bl)))

def audio_stats(path):
    sr=22050
    raw = subprocess.run(['ffmpeg','-v','error','-i',path,'-ac','1','-ar',str(sr),'-f','s16le','-'],capture_output=True).stdout
    x = np.frombuffer(raw,np.int16).astype(np.float32)/32768
    n=1024; hop=256; win=np.hanning(n).astype(np.float32)
    frames = 1+(len(x)-n)//hop
    idx = np.arange(n)[None,:]+hop*np.arange(frames)[:,None]
    X = x[idx]*win
    Sp = np.abs(np.fft.rfft(X,axis=1))
    logS = np.log1p(100*Sp)
    flux = np.r_[0,np.maximum(0,np.diff(logS,axis=0)).sum(axis=1)]
    bass = Sp[:,1:8].sum(axis=1)          # ~20-150 Hz
    tot = Sp.sum(axis=1)+1e-9
    rms = np.sqrt((x[idx]**2).mean(axis=1))
    t = np.arange(frames)*hop/sr
    fr = sr/hop
    # tempo by autocorrelation of onset envelope
    e = flux-flux.mean()
    ac = np.correlate(e,e,'full')[len(e)-1:]
    cands=[]
    for bpm in np.arange(60,200.5,0.5):
        lag = 60/bpm*fr
        l0=int(np.floor(lag)); f=lag-l0
        if l0+1<len(ac):
            v = ac[l0]*(1-f)+ac[l0+1]*f
            # reinforce with double lag
            l2=2*lag; k=int(np.floor(l2)); g=l2-k
            if k+1<len(ac): v += 0.5*(ac[k]*(1-g)+ac[k+1]*g)
            cands.append((v,bpm))
    cands.sort(reverse=True)
    top=[]
    for v,bpm in cands:
        if all(abs(bpm-q)>4 for q in top): top.append(float(bpm))
        if len(top)==3: break
    # hits: peaks of flux
    z=(flux-flux.mean())/(flux.std()+1e-9)
    mind=int(0.12*fr); hits=[]
    for i in range(1,frames-1):
        lo=max(0,i-mind); hi=min(frames,i+mind+1)
        if z[i]>1.5 and z[i]>=z[lo:hi].max()-1e-9: hits.append((float(t[i]),float(z[i])))
    # per-second loudness and bass share
    secs=int(np.ceil(len(x)/sr)); db=[]; bs=[]
    for s in range(secs):
        m=(t>=s)&(t<s+1)
        if m.any():
            db.append(float(20*np.log10(rms[m].mean()+1e-6))); bs.append(float(bass[m].sum()/tot[m].sum()))
    # biggest loudness jump (the drop): compare 1s after vs 1s before at 0.1 s steps
    best=(0,0)
    for s in np.arange(1,len(x)/sr-1,0.05):
        a_=rms[(t>=s-1)&(t<s)].mean(); b_=rms[(t>=s)&(t<s+1)].mean()
        ba=bass[(t>=s-1)&(t<s)].mean(); bb=bass[(t>=s)&(t<s+1)].mean()
        g = 20*np.log10((b_+1e-6)/(a_+1e-6)) + 10*np.log10((bb+1e-6)/(ba+1e-6))
        if g>best[0]: best=(float(g),float(s))
    return dict(dur=len(x)/sr,tempo=top,hits=hits,db=db,bass=bs,drop=best,peak=float(np.abs(x).max()))

def sheet(path, out, info, n_target=80, maxw=1560, maxh=1560, t0=None, t1=None, native=False):
    W,H=info['w'],info['h']; ar=W/H
    a = 0.0 if t0 is None else t0; b = info['dur'] if t1 is None else t1
    if native: n_target = max(1,int(round((b-a)*info['fps'])))
    for cols in range(4,17):
        tw=maxw//cols; th=int(round(tw/ar)); rows=-(-n_target//cols)
        if rows*th<=maxh: break
    rate = info['fps'] if native else n_target/(b-a)
    cmd=['ffmpeg','-v','error','-ss',f'{a:.3f}','-t',f'{b-a:.3f}','-i',path,'-vf',f'fps={rate:.5f},scale={tw}:{th}:flags=area','-pix_fmt','rgb24','-f','rawvideo','-']
    raw=subprocess.run(cmd,capture_output=True).stdout
    fr=np.frombuffer(raw,np.uint8).reshape(-1,th,tw,3)
    k=len(fr); rows=-(-k//cols)
    im=Image.new('RGB',(cols*tw,rows*th),(0,0,0)); dr=ImageDraw.Draw(im); f=font(max(11,tw//12))
    for i in range(k):
        x=(i%cols)*tw; y=(i//cols)*th
        im.paste(Image.fromarray(fr[i]),(x,y))
        lab=f'{a+i/rate:.2f}'
        dr.rectangle([x,y,x+dr.textlength(lab,font=f)+6,y+f.size+4],fill=(0,0,0))
        dr.text((x+3,y+1),lab,fill=(255,235,80),font=f)
    im.save(out,quality=82)
    return k,cols,tw,th

if __name__=='__main__':
    mode=sys.argv[1]
    if mode=='all':
        root,outdir=sys.argv[2],sys.argv[3]
        for nme in sorted(os.listdir(root)):
            p=os.path.join(root,nme,'v.mp4')
            if not os.path.exists(p): continue
            info=probe(p); vs=video_stats(p,info); cs=color_stats(p); au=audio_stats(p)
            cuts=vs['cuts']; shots=np.diff([0]+cuts+[info['dur']])
            print(f"\n===== [{nme}] {info['w']}x{info['h']} {info['fps']:.0f}fps {info['dur']:.2f}s")
            print(f"cuts: {len(cuts)} | shot length median {np.median(shots):.2f}s min {shots.min():.2f}s max {shots.max():.2f}s | {len(cuts)/info['dur']:.2f} cuts/s")
            print('cut times:',' '.join(f'{c:.2f}' for c in cuts))
            print(f"flashes: {len(vs['flashes'])} at",' '.join(f'{c:.2f}' for c in vs['flashes']))
            print(f"look: mean brightness {vs['bright_mean']:.0f}/255, dark frames {vs['dark_share']*100:.0f}%, black frames {vs['black_share']*100:.0f}%, mean saturation {cs['sat_mean']:.2f}, near-monochrome frames {cs['mono_share']*100:.0f}%, mean rgb {cs['rgb'][0]:.2f} {cs['rgb'][1]:.2f} {cs['rgb'][2]:.2f}")
            print(f"motion: median frame change {vs['motion_med']:.1f}, held (duplicate) frames {vs['held_share']*100:.0f}%")
            print(f"audio: {au['dur']:.2f}s, tempo candidates {au['tempo']} bpm, biggest jump +{au['drop'][0]:.1f} dB-ish at {au['drop'][1]:.2f}s")
            print('loudness dB per second:',' '.join(f'{v:.0f}' for v in au['db']))
            print('bass share per second:',' '.join(f'{v*100:.0f}' for v in au['bass']))
            strong=sorted(au['hits'],key=lambda h:-h[1])[:24]; strong.sort()
            print('strongest hits:',' '.join(f'{h[0]:.2f}' for h in strong))
            ht=np.array([h[0] for h in au['hits']])
            if len(cuts) and len(ht):
                near=[np.abs(ht-c).min() for c in cuts]
                print(f"cuts within 0.07s of an audio hit: {sum(1 for v in near if v<=0.07)}/{len(cuts)}")
            k,cols,tw,th=sheet(p,os.path.join(outdir,f'{nme}-sheet.jpg'),info)
            print(f"sheet: {k} frames, {cols} cols, thumb {tw}x{th}")
    elif mode=='sheet':
        p,out=sys.argv[2],sys.argv[3]; t0=float(sys.argv[4]); t1=float(sys.argv[5]); n=int(sys.argv[6]); native=(len(sys.argv)>7 and sys.argv[7]=='native')
        info=probe(p); print(sheet(p,out,info,n_target=n,t0=t0,t1=t1,native=native))
