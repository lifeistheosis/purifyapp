import sys, shutil, numpy as np
from PIL import Image, ImageFilter
Image.MAX_IMAGE_PIXELS=None
from pathlib import Path
R=str(Path(__file__).resolve().parents[3]/'public')+'/'  # the repo's public/ folder
OUT=sys.argv[1]
import os; os.makedirs(OUT, exist_ok=True)
def lum(im):
    a=np.asarray(im.convert('RGB')).astype(np.float32)/255
    return 0.2126*a[...,0]+0.7152*a[...,1]+0.0722*a[...,2]
def gradmap(L, stops):
    xs=np.array([s[0] for s in stops]); cs=np.array([s[1] for s in stops],dtype=np.float32)
    out=np.stack([np.interp(L,xs,cs[:,i]) for i in range(3)],-1)
    return Image.fromarray(np.clip(out,0,255).astype(np.uint8))
def curve(L, lo=0.04, hi=0.96, gamma=1.0, s=0.35):
    x=np.clip((L-lo)/(hi-lo),0,1)**gamma
    return x*(1-s)+ (x*x*(3-2*x))*s
GOLD=[(0.0,(9,6,3)),(0.18,(38,26,12)),(0.45,(118,86,42)),(0.72,(196,158,94)),(0.9,(232,206,150)),(1.0,(248,236,206))]
COLD=[(0.0,(3,5,10)),(0.3,(22,30,44)),(0.6,(78,92,116)),(0.85,(160,174,196)),(1.0,(214,224,238))]
def cover(im, W, H, fx=0.5, fy=0.5):
    w,h=im.size; s=max(W/w,H/h)
    im=im.resize((round(w*s),round(h*s)),Image.LANCZOS)
    w,h=im.size; x=int(np.clip(fx*w-W/2,0,w-W)); y=int(np.clip(fy*h-H/2,0,h-H))
    return im.crop((x,y,x+W,y+H))
def sharpen(im, r=1.6, p=90): return im.filter(ImageFilter.UnsharpMask(radius=r,percent=p,threshold=2))
mont=[('A_chrysostom','history/media/chrysostom-at-constantinople.jpg',0.5,0.3),
      ('B_archangel','shop/media/archangel-michael-print.jpg',0.5,0.4),
      ('C_trinity','shop/media/holy-trinity-rublev-mounted.jpg',0.5,0.45),
      ('D_triumph','history/media/triumph-of-orthodoxy.jpg',0.5,0.35),
      ('E_deesis','shop/media/deesis-wooden-diptych.jpg',0.5,0.35),
      ('F_dormition','shop/media/dormition-of-the-theotokos-mounted.jpg',0.5,0.4)]
PRECROP={'B_archangel':(96,104,806,1096)}
for name,f,fx,fy in mont:
    im=Image.open(R+f).convert('RGB')
    if name in PRECROP: im=im.crop(PRECROP[name])
    c=cover(im,1188,2112,fx,fy)
    L=curve(lum(c),0.05,0.95,1.05,0.4)
    g=sharpen(gradmap(L,GOLD))
    g.save(f'{OUT}/{name}.jpg',quality=94)
    print(name, im.size, '->', g.size)
# Pantocrator bust framed panel (gold, crisp)
p=Image.open(R+'sections/prayers.jpg').convert('RGB'); p=p.crop((9,0,619,652))
L=curve(lum(p),0.04,0.96,1.0,0.35); gp=sharpen(gradmap(L,GOLD).resize((760,797),Image.LANCZOS),1.2,70); gp.save(f'{OUT}/pantocrator_gold.jpg',quality=95)
# Pantocrator full, blurred background version
pm=Image.open(R+'shop/media/christ-pantocrator-mounted.jpg').convert('RGB')
c=cover(pm,1080,1920,0.5,0.35); L=curve(lum(c),0.05,0.95,1.1,0.4); gradmap(L,GOLD).save(f'{OUT}/pantocrator_bg.jpg',quality=92)
# History strip for the phone screen (real app UI)
h=Image.open(sys.argv[2]).convert('RGB')
w,hh=h.size; s=720/w
hs=h.resize((720,round(hh*s)),Image.LANCZOS)
hs=sharpen(hs,0.8,50)
hs.save(f'{OUT}/history_strip.png',optimize=True)
print('strip', hs.size, 'scale', s)
# Chrysostom mosaic, cold, framed panel for the "hidden" beat (name inscriptions get redacted)
c=Image.open(R+'history/media/chrysostom-at-constantinople.jpg').convert('RGB')
L=curve(lum(c),0.06,0.97,1.1,0.35)
sharpen(gradmap(L,COLD).resize((920,828),Image.LANCZOS),1.0,60).save(f'{OUT}/chrysostom_cold.jpg',quality=95)
sharpen(gradmap(L,GOLD).resize((920,828),Image.LANCZOS),1.0,60).save(f'{OUT}/chrysostom_gold_panel.jpg',quality=95)

# the Purify cross mark, as shipped in public/
shutil.copy(R+'purify-cross-mark.png', f'{OUT}/cross-mark.png')
