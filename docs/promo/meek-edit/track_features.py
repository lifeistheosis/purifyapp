"""Feature tracking of a film's camera per shot: SIFT matches to an anchor frame, RANSAC similarity,
re-anchoring when the shared content runs low. Output: per-frame 2x3 matrices in frame units."""
import sys, json, cv2, numpy as np
sift = cv2.SIFT_create(5000)
def load(path):
    cap=cv2.VideoCapture(path); fr=[]
    while True:
        ok,f=cap.read()
        if not ok: break
        fr.append(cv2.cvtColor(f,cv2.COLOR_BGR2GRAY))
    return fr
def mask(shape, boxes):
    h,w=shape; m=np.full((h,w),255,np.uint8)
    for x0,y0,x1,y1 in boxes: m[int(y0*h):int(y1*h),int(x0*w):int(x1*w)]=0
    return m
def feats(img, boxes):
    return sift.detectAndCompute(img, mask(img.shape, boxes))
def match(fa, fb, w, h):
    ka,da=fa; kb,db=fb
    if da is None or db is None or len(ka)<8 or len(kb)<8: return None, 0
    m=cv2.BFMatcher().knnMatch(da,db,k=2); good=[x for x,y in m if x.distance<0.75*y.distance]
    if len(good)<8: return None, 0
    pa=np.float32([ka[x.queryIdx].pt for x in good]); pb=np.float32([kb[x.trainIdx].pt for x in good])
    M,inl=cv2.estimateAffinePartial2D(pa,pb,method=cv2.RANSAC,ransacReprojThreshold=2.5,maxIters=8000,confidence=0.999)
    if M is None: return None, 0
    N=np.diag([1/w,1/h,1.0]); Ni=np.diag([w,h,1.0])
    M3=N@np.vstack([M,[0,0,1]])@Ni   # in frame units
    return M3, int(inl.sum())
def track(fr, f0, f1, boxes, min_inl=25):
    h,w=fr[f0].shape
    anchor=f0; A=np.eye(3); fa=feats(fr[f0],boxes); out={f0:np.eye(3)}
    for f in range(f0+1,f1+1):
        fb=feats(fr[f],boxes)
        M,n=match(fa,fb,w,h)
        if M is None or n<min_inl:
            # re-anchor on the previous frame
            prev=f-1; fp=feats(fr[prev],boxes); M2,n2=match(fp,fb,w,h)
            if M2 is None: out[f]=out[prev]; continue
            out[f]=M2@out[prev]; anchor=prev; A=out[prev]; fa=fp
            continue
        out[f]=M@A
    return {k:v[:2].ravel().tolist() for k,v in out.items()}
if __name__=="__main__":
    fr=load(sys.argv[1]); spec=json.loads(sys.argv[2]); res={}
    for name,(f0,f1,boxes) in spec.items():
        t=track(fr,f0,f1,boxes); res[name]=t
        M=np.array(t[f1]).reshape(2,3); s=np.hypot(M[0,0],M[1,0]); r=np.degrees(np.arctan2(M[1,0],M[0,0]))
        p=M@np.array([0.5,0.5,1]); print(f"{name}: f{f0}-{f1} scale {s:.3f} rot {r:+.2f} centre moves ({p[0]-0.5:+.3f},{p[1]-0.5:+.3f})")
    json.dump(res,open(sys.argv[3],"w"))
