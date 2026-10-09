# Purify's own effects, synthesized: no third-party samples.
import sys, json, numpy as np, soundfile as sf
SR=48000
def t_(d): return np.arange(int(d*SR))/SR
rs=np.random.RandomState(7)
def noise(d): return rs.randn(int(d*SR))
def onepole_lp(x, fc):
    fc=np.broadcast_to(np.asarray(fc,dtype=np.float64),x.shape)
    a=np.exp(-2*np.pi*fc/SR); y=np.zeros_like(x); s=0.0
    for i in range(len(x)): s=(1-a[i])*x[i]+a[i]*s; y[i]=s
    return y
def bp(x, fc, q=1.0):
    # biquad bandpass (constant 0 dB peak), static fc
    w=2*np.pi*fc/SR; al=np.sin(w)/(2*q)
    b0,b1,b2=al,0,-al; a0,a1,a2=1+al,-2*np.cos(w),1-al
    y=np.zeros_like(x); x1=x2=y1=y2=0.0
    for i in range(len(x)):
        yy=(b0*x[i]+b1*x1+b2*x2-a1*y1-a2*y2)/a0; x2,x1=x1,x[i]; y2,y1=y1,yy; y[i]=yy
    return y
def hp(x, fc): return x-onepole_lp(x,fc)
def env(d, a, dec, shape='exp'):
    t=t_(d); e=np.minimum(1, t/max(a,1e-4))
    return e*np.exp(-np.maximum(0,t-a)/dec)
def sine_sweep(d, f0, f1, curve=3.0):
    t=t_(d); f=f1+(f0-f1)*np.exp(-t*curve); ph=2*np.pi*np.cumsum(f)/SR; return np.sin(ph)
def norm(x, peak_db):
    m=np.max(np.abs(x))+1e-12; return x/m*10**(peak_db/20)
def pan(x, p=0.0):
    l=np.cos((p+1)*np.pi/4); r=np.sin((p+1)*np.pi/4); return np.stack([x*l*1.414, x*r*1.414],1)
def snuff():
    d=0.45; n=bp(noise(d),1600,0.7)*env(d,0.006,0.09)
    th=sine_sweep(d,85,45,9)*env(d,0.004,0.11)*0.5
    return norm(n*0.8+th,-12)
def whoosh_in(d=0.32, up=True):
    t=t_(d); k=(t/d)
    e=(k**2.2) if up else (1-k)**2
    fc=300+4800*k if up else 5000-4200*k
    x=onepole_lp(noise(d),fc)*e
    x=x*np.minimum(1,(d-t)/0.012) if up else x
    return norm(x,-17)
def shimmer(d=0.9, base=1320, lvl=-21):
    t=t_(d); x=np.zeros_like(t)
    for i,(m,a) in enumerate([(1,1),(1.5,0.6),(2,0.45),(3,0.25),(4.01,0.15)]):
        f=base*m*(1+0.003*np.sin(2*np.pi*(5+i)*t))
        x+=a*np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t/(0.35-0.04*i))
    return norm(x*np.minimum(1,t/0.004),lvl)
def thud(d=0.16, f0=110, f1=60, lvl=-19):
    x=sine_sweep(d,f0,f1,22)*env(d,0.002,0.05)+0.25*hp(noise(d),3000)*env(d,0.001,0.006)
    return norm(x,lvl)
def drop_hit():
    d=0.9; boom=np.tanh(1.6*sine_sweep(d,62,34,5))*env(d,0.004,0.28)
    burst=onepole_lp(noise(d),1800)*env(d,0.002,0.07)
    return norm(boom*0.7+burst*0.5,-15)
def glitch():
    d=0.2; x=np.zeros(int(d*SR)); n=hp(noise(d),1200)
    for k in range(5):
        a=int((k*0.034)*SR); b=a+int(0.016*SR); x[a:b]=np.round(n[a:b]*3)/3
    return norm(x,-25)
def clang():
    d=1.6; t=t_(d); x=np.zeros_like(t)
    for f,dec,a in [(172,0.9,1),(287,0.7,0.8),(433,0.55,0.6),(611,0.4,0.5),(869,0.3,0.35),(1210,0.22,0.25)]:
        x+=a*np.sin(2*np.pi*f*t+rs.rand()*6)*np.exp(-t/dec)
    x*=np.minimum(1,t/0.002)
    boom=np.tanh(1.4*sine_sweep(d,70,38,7))*env(d,0.003,0.3)
    tr=onepole_lp(noise(d),2500)*env(d,0.001,0.03)
    return norm(0.55*x+0.8*boom+0.5*tr,-12)
def crack():
    d=0.5; c=hp(noise(d),1800)*env(d,0.0008,0.03)
    wood=bp(noise(d),420,4)*env(d,0.002,0.12)*3
    th=sine_sweep(d,120,55,15)*env(d,0.002,0.09)*0.6
    return norm(c+wood*0.7+th,-12)
def burst():
    d=1.0; t=t_(d); fc=6000*np.exp(-t*4)+500
    air=onepole_lp(noise(d),fc)*env(d,0.01,0.32)
    return norm(air+0.06*shimmer(1.0,990,0)[:len(air)],-18)
def riser(d=0.32):
    t=t_(d); k=t/d
    s=np.sin(2*np.pi*np.cumsum(800+1600*k**2)/SR)*k**2*0.5
    n=bp(noise(d),3000,0.8)*k**2.5
    return norm(s+n,-21)
def swish(d=0.12):
    t=t_(d); k=t/d; x=bp(noise(d),2400,1.2)*np.sin(np.pi*k)**2
    return norm(x,-24)
def lock():
    d=1.3; t=t_(d)
    c1=hp(noise(d),2500)*env(d,0.0005,0.004); c2=np.roll(c1,int(0.032*SR))*0.8
    tone=(np.sin(2*np.pi*110*t)+0.5*np.sin(2*np.pi*220*t)+0.2*np.sin(2*np.pi*330*t))*env(d,0.01,0.45)
    return norm(0.6*(c1+c2)+0.5*tone+0.04*shimmer(d,880,0),-15)

B0,BP=0.138,0.6523
bt=lambda k:B0+BP*k
dur=float(sys.argv[2])
out=np.zeros((int(dur*SR)+SR,2))
def place(x, at, p=0.0):
    st=pan(x,p) if x.ndim==1 else x
    i=int(round(at*SR)); j=min(len(out),i+len(st))
    if i<0: st=st[-i:]; i=0
    out[i:j]+=st[:j-i]
place(snuff(), bt(2))
place(whoosh_in(0.3), bt(2.5)-0.3)
place(shimmer(0.9,1320), bt(2.5))
for k,tk in enumerate([bt(6.5), bt(6.5)+BP/6, bt(6.5)+BP/3]): place(thud(0.16,120,62,-19), tk, [-0.3,0.3,0][k])
place(drop_hit(), bt(7))
place(clang(), bt(10))
place(crack(), bt(12.5))
place(burst(), bt(13.5))
place(riser(0.3), bt(14)-0.3)
place(shimmer(1.1,990,-22), 9.34)  # just after the voice finishes "open"
w=whoosh_in(0.22,True)*10**(1/20); place(w, bt(15)-0.22); place(whoosh_in(0.3,False)*0.7, bt(15))
for k,tk in enumerate([bt(16), bt(16.5), bt(17.25), bt(17.5)]): place(swish(), tk-0.02, [0.2,-0.2,0.2,-0.2][k])
place(lock(), bt(18.5))
out=out[:int(dur*SR)]
sf.write(sys.argv[1], out.astype(np.float32), SR, subtype='FLOAT')
print('sfx peak dBFS', 20*np.log10(np.max(np.abs(out))+1e-12))
