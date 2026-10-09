import sys, wave, json, numpy as np, sherpa_onnx
m=sys.argv[1]
rec=sherpa_onnx.OfflineRecognizer.from_transducer(
    encoder=f"{m}/encoder.int8.onnx", decoder=f"{m}/decoder.int8.onnx", joiner=f"{m}/joiner.int8.onnx",
    tokens=f"{m}/tokens.txt", model_type="nemo_transducer", num_threads=4)
out={}
for p in sys.argv[3:]:
    with wave.open(p) as w:
        sr=w.getframerate(); x=np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16).astype(np.float32)/32768
    s=rec.create_stream(); s.accept_waveform(sr,x); rec.decode_stream(s)
    r=s.result
    print("==",p); print("TEXT:",r.text)
    toks=list(r.tokens); ts=list(r.timestamps)
    durs=list(getattr(r,'durations',[]) or [])
    # merge sentencepiece tokens into words
    words=[]
    for i,(tk,t0) in enumerate(zip(toks,ts)):
        if tk.startswith('▁') or tk.startswith(' ') or not words:
            words.append({'w':tk.replace('▁','').strip(),'t':round(float(t0),3)})
        else:
            words[-1]['w']+=tk
    for wd in words: print(f"  {wd['t']:6.3f}  {wd['w']}")
    out[p]=words
json.dump(out,open(sys.argv[2],'w'),indent=1)
