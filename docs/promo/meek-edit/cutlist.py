import sys, cv2, numpy as np
def cuts(path, thr):
    cap=cv2.VideoCapture(path); prev=None; i=0; out=[]
    while True:
        ok,f=cap.read()
        if not ok: break
        g=cv2.cvtColor(cv2.resize(f,(144,144)),cv2.COLOR_BGR2GRAY).astype(np.float32)
        if prev is not None:
            d=np.abs(g-prev).mean()
            if d>thr: out.append(i)
        prev=g; i+=1
    return out
def starts(fr):  # first frame of each burst
    s=[]; 
    for f in fr:
        if not s or f-s[-1][-1]>2: s.append([f])
        else: s[-1].append(f)
    return [b[0] for b in s]
ref=starts(cuts(sys.argv[1],14)); ours=starts(cuts(sys.argv[2],14))
print("reference cut starts:", [r for r in ref if r<558])
print("ours cut starts:     ", ours)
