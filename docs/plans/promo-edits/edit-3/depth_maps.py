#!/usr/bin/env python3
"""Depth maps for the whisper's 2.5D moves (his choice, 2026-11-25: "No AI, free 2.5D", over generated video).

Each painting's depth is estimated once with Depth Anything V2 Small (Apache-2.0, run on the CPU with onnxruntime) and
saved as a 16-bit picture beside the paintings, near as bright. The film then moves its camera in depth: what is near
slides against what is far. An icon is never given a depth map: a depth move bends parts of a picture against each
other, which would redraw it (CLAUDE.md).

  python depth_maps.py <work> <model.onnx> key [key ...]      writes <work>/raw/depth/<key>.png
"""
import os, sys
import numpy as np
import cv2
import onnxruntime as ort

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import core

work, model = os.path.abspath(sys.argv[1]), sys.argv[2]
core.WORK = work
sess = ort.InferenceSession(model, providers=["CPUExecutionProvider"])
name = sess.get_inputs()[0].name
os.makedirs(os.path.join(work, "raw", "depth"), exist_ok=True)
for key in sys.argv[3:]:
    assert core.SOURCES[key][1] != "ground", f"{key} is an icon: it is not given depth"
    im = core.src(key).astype(np.float32) / 255
    h, w = im.shape[:2]
    s = 742 / max(h, w)
    th, tw = max(14, round(h * s / 14) * 14), max(14, round(w * s / 14) * 14)
    x = cv2.resize(im, (tw, th), interpolation=cv2.INTER_AREA)
    x = (x - np.float32([0.485, 0.456, 0.406])) / np.float32([0.229, 0.224, 0.225])
    d = sess.run(None, {name: x.transpose(2, 0, 1)[None].astype(np.float32)})[0][0]
    d = (d - d.min()) / max(1e-6, d.max() - d.min())
    d = cv2.resize(d, (w // 4, h // 4), interpolation=cv2.INTER_CUBIC)
    d = cv2.GaussianBlur(d, (0, 0), 2.0)
    cv2.imwrite(os.path.join(work, "raw", "depth", f"{key}.png"), (np.clip(d, 0, 1) * 65535).astype(np.uint16))
    print(key, d.shape)
