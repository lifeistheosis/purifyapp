import subprocess, sys, os, json
import numpy as np
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from analyze import probe, font

def frames(path, t0, t1, step, tw, th, fps):
    cmd=['ffmpeg','-v','error','-ss',f'{t0:.3f}','-t',f'{t1-t0:.3f}','-i',path,'-vf',f'scale={tw}:{th}:flags=area','-pix_fmt','rgb24','-f','rawvideo','-']
    raw=subprocess.run(cmd,capture_output=True).stdout
    a=np.frombuffer(raw,np.uint8).reshape(-1,th,tw,3)
    idx=list(range(0,len(a),step))
    return [(t0+i/fps,a[i]) for i in idx]

def strips(root, spec, out, W=1560):
    rows=[]
    for s in spec:
        p=os.path.join(root,str(s['v']),'v.mp4'); info=probe(p)
        tw=W//s['cols']; th=int(round(tw*info['h']/info['w']))
        fr=frames(p,s['t0'],s['t1'],s.get('step',1),tw,th,info['fps'])
        rows.append((s,fr,tw,th))
    f=font(18); H=0
    for s,fr,tw,th in rows: H+=26+(-(-len(fr)//s['cols']))*th
    im=Image.new('RGB',(W,H),(20,20,20)); dr=ImageDraw.Draw(im); y=0; fs=font(13)
    for s,fr,tw,th in rows:
        dr.text((6,y+3),s['label'],fill=(255,235,80),font=f); y+=26
        for i,(t,a) in enumerate(fr):
            x=(i%s['cols'])*tw; yy=y+(i//s['cols'])*th
            im.paste(Image.fromarray(a),(x,yy))
            lab=f'{t:.2f}'; dr.rectangle([x,yy,x+dr.textlength(lab,font=fs)+4,yy+16],fill=(0,0,0)); dr.text((x+2,yy+1),lab,fill=(255,255,255),font=fs)
        y+=(-(-len(fr)//s['cols']))*th
    im.save(out,quality=85)

def crops(root, spec, out, W=1400):
    tiles=[]
    for s in spec:
        p=os.path.join(root,str(s['v']),'v.mp4'); info=probe(p)
        raw=subprocess.run(['ffmpeg','-v','error','-ss',f"{s['t']:.3f}",'-i',p,'-frames:v','1','-pix_fmt','rgb24','-f','rawvideo','-'],capture_output=True).stdout
        a=np.frombuffer(raw,np.uint8).reshape(info['h'],info['w'],3)
        x0,y0,x1,y1=[int(round(v)) for v in (s['box'][0]*info['w'],s['box'][1]*info['h'],s['box'][2]*info['w'],s['box'][3]*info['h'])]
        c=Image.fromarray(a[y0:y1,x0:x1]); k=W/c.width
        c=c.resize((W,int(c.height*k)),Image.LANCZOS)
        tiles.append((s,c))
    f=font(18); H=sum(26+c.height for s,c in tiles)
    im=Image.new('RGB',(W,H),(20,20,20)); dr=ImageDraw.Draw(im); y=0
    for s,c in tiles:
        dr.text((6,y+3),s['label'],fill=(255,235,80),font=f); y+=26; im.paste(c,(0,y)); y+=c.height
    im.save(out,quality=90)

if __name__=='__main__':
    root,outdir=sys.argv[1],sys.argv[2]
    strips(root,[
        dict(v=1,t0=2.30,t1=2.97,step=2,cols=10,label='[1] 2.30 to 2.97, every 2nd frame: one manga panel into the next'),
        dict(v=3,t0=2.20,t1=3.40,step=2,cols=6,label='[3] 2.20 to 3.40, every 2nd frame: the tear, the water, the crosses'),
        dict(v=4,t0=3.60,t1=4.10,step=1,cols=8,label='[4] 3.60 to 4.10, every frame: the man into the drawn figure'),
    ],os.path.join(outdir,'B1.jpg'))
    strips(root,[
        dict(v=4,t0=11.15,t1=11.55,step=1,cols=6,label='[4] 11.15 to 11.55: the white frame at the drop'),
        dict(v=6,t0=0.0,t1=0.65,step=1,cols=7,label='[6] 0.00 to 0.65: the letters at the start'),
        dict(v=6,t0=2.40,t1=2.85,step=1,cols=9,label='[6] 2.40 to 2.85: the white-bordered print'),
        dict(v=6,t0=11.20,t1=11.55,step=1,cols=7,label='[6] 11.20 to 11.55: the smear between two photos'),
        dict(v=2,t0=3.58,t1=3.95,step=1,cols=9,label='[2] 3.58 to 3.95: the blur into the gym'),
    ],os.path.join(outdir,'B2.jpg'))
    crops(root,[
        dict(v=2,t=2.48,box=(0.0,0.30,1.0,0.75),label='[2] 2.48'),
        dict(v=2,t=3.30,box=(0.0,0.30,1.0,0.75),label='[2] 3.30'),
        dict(v=2,t=12.79,box=(0.15,0.36,0.85,0.64),label='[2] 12.79'),
        dict(v=2,t=15.47,box=(0.25,0.36,0.75,0.64),label='[2] 15.47 (the end card)'),
    ],os.path.join(outdir,'T1.jpg'))
    crops(root,[
        dict(v=5,t=5.64,box=(0.38,0.42,0.62,0.56),label='[5] 5.64'),
        dict(v=5,t=6.44,box=(0.38,0.42,0.62,0.56),label='[5] 6.44'),
        dict(v=5,t=13.69,box=(0.38,0.42,0.62,0.56),label='[5] 13.69'),
        dict(v=5,t=29.79,box=(0.38,0.42,0.62,0.56),label='[5] 29.79'),
        dict(v=5,t=41.86,box=(0.38,0.42,0.62,0.56),label='[5] 41.86'),
        dict(v=5,t=61.18,box=(0.38,0.36,0.62,0.56),label='[5] 61.18 (the end)'),
        dict(v=6,t=15.0,box=(0.35,0.40,0.65,0.60),label='[6] 15.00 (the end)'),
        dict(v=4,t=5.5,box=(0.30,0.93,0.70,1.0),label='[4] 5.50 (the line along the foot)'),
    ],os.path.join(outdir,'T2.jpg'))
    print('ok')
