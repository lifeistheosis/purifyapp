# Finds the faces in each painting (OpenCV's YuNet) so every god can be held on his face: the eyes, the viewer's left
# first, in the fetched file's pixels. Writes find/faces.json and a sheet with every face found, numbered.
import json, os, sys
import cv2, numpy as np
from PIL import Image, ImageDraw
R=json.load(open('find/fetched.json'))
names=[n for n in sys.argv[1:] if os.path.exists(f'raw/{n}.jpg') and os.path.getsize(f'raw/{n}.jpg')>1000]
det=cv2.FaceDetectorYN.create('find/model/yunet.onnx','',(640,640),0.45,0.3,200)
out={}; tiles=[]
for n in names:
    im=Image.open(f'raw/{n}.jpg').convert('RGB'); w,h=im.size; found=[]
    for side in (1100,2000,3200):
        k=min(1.0,side/max(w,h)) if side<3200 else min(1.6,side/max(w,h))
        s=im.resize((round(w*k),round(h*k))); b=cv2.cvtColor(np.asarray(s),cv2.COLOR_RGB2BGR); det.setInputSize((b.shape[1],b.shape[0])); _,f=det.detect(b)
        for r in ([] if f is None else f):
            r=r/np.array([k]*14+[1.0]); found.append(r)
    keep=[]
    for r in sorted(found,key=lambda r:-r[14]):
        cx,cy=r[0]+r[2]/2,r[1]+r[3]/2
        if all(abs(cx-(q[0]+q[2]/2))>0.5*max(r[2],q[2]) or abs(cy-(q[1]+q[3]/2))>0.5*max(r[3],q[3]) for q in keep): keep.append(r)
    keep=sorted(keep,key=lambda r:-r[2]*r[3])[:6]
    out[n]={'size':[w,h],'faces':[{'box':[round(float(v)) for v in r[:4]],'eyes':sorted([[round(float(r[4]),1),round(float(r[5]),1)],[round(float(r[6]),1),round(float(r[7]),1)]]),'score':round(float(r[14]),2)} for r in keep]}
    th=290; s=th/h; t=im.resize((max(1,round(w*s)),th))
    if t.width>430: t=t.resize((430,round(th*430/t.width)))
    s=t.width/w; d=ImageDraw.Draw(t)
    for i,f in enumerate(out[n]['faces']):
        x,y,bw,bh=[v*s for v in f['box']]; d.rectangle([x,y,x+bw,y+bh],outline=(0,255,0),width=2); d.rectangle([x,y-12,x+11,y],fill=(0,0,0)); d.text((x+2,y-12),str(i+1),fill=(255,255,0))
    d.rectangle([0,0,min(t.width,96),12],fill=(0,0,0)); d.text((2,0),n,fill=(0,255,255)); tiles.append(t)
    ed=[round(float(np.hypot(f['eyes'][1][0]-f['eyes'][0][0],f['eyes'][1][1]-f['eyes'][0][1]))) for f in out[n]['faces']]
    print(n,(w,h),'eyes apart',ed,'|',R.get(n,{}).get('title','')[5:70])
json.dump(out,open('find/faces.json','w'))
rows=[[]]; x=0
for t in tiles:
    if x+t.width>2000: rows.append([]); x=0
    rows[-1].append(t); x+=t.width+4
sh=Image.new('RGB',(2000,len(rows)*294),(20,20,20))
for j,row in enumerate(rows):
    x=0
    for t in row: sh.paste(t,(x,j*294)); x+=t.width+4
sh.save('find/faces.jpg',quality=80); print('sheet',sh.size,len(tiles))
