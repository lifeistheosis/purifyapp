"""Track a film's camera, shot by shot: the affine move between each pair of frames (ECC), chained."""
import sys, json, cv2, numpy as np
def frames(path, size=288):
    cap=cv2.VideoCapture(path); out=[]
    while True:
        ok,f=cap.read()
        if not ok: break
        g=cv2.cvtColor(cv2.resize(f,(size,size),interpolation=cv2.INTER_AREA),cv2.COLOR_BGR2GRAY).astype(np.float32)/255
        out.append(g)
    return out
def mask_for(size, boxes_out):
    m=np.ones((size,size),np.uint8)
    for x0,y0,x1,y1 in boxes_out: m[int(y0*size):int(y1*size), int(x0*size):int(x1*size)]=0
    return m
def step(a, b, mask):
    """Affine W with b(W p) ~ a(p): how frame b's content moved relative to a."""
    W=np.eye(2,3,dtype=np.float32)
    try:
        _,W=cv2.findTransformECC(cv2.GaussianBlur(a,(0,0),1.0),cv2.GaussianBlur(b,(0,0),1.0),W,cv2.MOTION_AFFINE,
                                 (cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,200,1e-6),mask,5)
    except cv2.error:
        return None
    return W
def chain(fr, f0, f1, mask):
    """Content transform of each frame relative to f0, as (scale, rot_deg, tx, ty) in frame units (1 = width)."""
    M=np.eye(3); out=[(f0,1.0,0.0,0.0,0.0)]
    n=fr[0].shape[0]
    for f in range(f0, f1):
        W=step(fr[f], fr[f+1], mask)
        if W is None: out.append((f+1,)+tuple(out[-1][1:])); continue
        W3=np.vstack([W,[0,0,1]])
        # ECC: next(W x) ~ this(x), so W carries content from frame f to frame f+1
        M=W3@M
        a,b,c,d=M[0,0],M[0,1],M[1,0],M[1,1]
        s=np.sqrt(abs(a*d-b*c)); rot=np.degrees(np.arctan2(c,a))
        # translation of the frame centre
        cx=cy=(n-1)/2
        p=M@np.array([cx,cy,1.0])
        out.append((f+1,float(s),float(rot),float((p[0]-cx)/n),float((p[1]-cy)/n),[float(v) for v in M[:2].ravel()]))
    return out
if __name__=="__main__":
    path=sys.argv[1]; spec=json.loads(sys.argv[2]); fr=frames(path)
    res={}
    for name,(f0,f1,boxes) in spec.items():
        res[name]=chain(fr,f0,f1,mask_for(288,boxes))
    json.dump(res,open(sys.argv[3],"w"))
    for name,rows in res.items():
        r=np.array([x[:5] for x in rows]); print(f"{name}: frames {int(r[0,0])}-{int(r[-1,0])}  scale {r[0,1]:.3f}->{r[-1,1]:.3f}  rot {r[-1,2]:+.2f}deg  drift ({r[-1,3]:+.3f},{r[-1,4]:+.3f})")
