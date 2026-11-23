import json, subprocess, numpy as np
from PIL import Image, ImageDraw
m=json.load(open('ref/measure.json')); d=np.array(m['d']); n=m['n']
# a cut or the middle of a smear: the frame of greatest change within 4 frames either side, change over 15
cuts=[i for i in range(1,n) if d[i]>15 and d[i]>=d[max(0,i-4):i+5].max()]
print('cuts (frame):',cuts)
print('gaps:',np.diff(cuts).tolist())
# width of each change: frames around the peak with d>6
wid=[]
for c in cuts:
    a=c
    while a>0 and d[a-1]>6: a-=1
    b=c
    while b<n-1 and d[b+1]>6: b+=1
    wid.append((a,b))
print('spans:',wid)
# the bass: low band (<120 Hz) envelope at 1 ms
pcm=subprocess.run(['ffmpeg','-v','error','-i','ref/v.mp4','-ac','1','-ar','44100','-f','f32le','-'],capture_output=True).stdout
s=np.frombuffer(pcm,np.float32); sr=44100
S=np.fft.rfft(s); f=np.fft.rfftfreq(len(s),1/sr)
for band in (60,90,120):
    low=np.fft.irfft(np.where(f<band,S,0),len(s))
    env=np.sqrt(np.convolve(low**2,np.ones(441)/441,'same'))
    seg=env[int(10.5*sr):int(11.6*sr)]
    base=env[int(9.5*sr):int(10.9*sr)]
    thr=base.max()*1.3
    k=np.argmax(seg>thr); t=10.5+k/sr
    print(f'<{band}Hz: quiet max {base.max():.3f}, first passes {thr:.3f} at {t:.4f}s = frame {t*60:.1f}; peak in window {seg.max():.3f} at {10.5+seg.argmax()/sr:.3f}')
low=np.fft.irfft(np.where(f<120,S,0),len(s)); 
print('low env each 1/60 s, 10.8 to 11.5:',' '.join(f"{(i/60):.3f}:{np.sqrt((low[int(i/60*sr):int((i+1)/60*sr)]**2).mean()):.2f}" for i in range(648,690)))
# a sheet of the reference's frames to see its look
pick=[30,110,130,150,160,190,191,192,200,330,470,520,545,580,640,664,666,668,690,720,780,860,930,1000,1100,1160,1176,1180,1190]
cols=6; tw=180
rows=(len(pick)+cols-1)//cols
sheet=Image.new('RGB',(cols*tw,rows*(tw+14)),(20,20,20)); dr=ImageDraw.Draw(sheet)
for k,i in enumerate(pick):
    raw=subprocess.run(['ffmpeg','-v','error','-ss',f'{i/60:.4f}','-i','ref/v.mp4','-frames:v','1','-vf',f'scale={tw}:{tw}','-pix_fmt','rgb24','-f','rawvideo','-'],capture_output=True).stdout
    im=Image.frombytes('RGB',(tw,tw),raw); x,y=(k%cols)*tw,(k//cols)*(tw+14)
    sheet.paste(im,(x,y)); dr.text((x+3,y+tw+1),f'{i} {i/60:.2f}',fill=(255,255,255))
sheet.save('ref/sheet.jpg',quality=80); print(sheet.size)
