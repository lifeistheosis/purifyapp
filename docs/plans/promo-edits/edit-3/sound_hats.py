#!/usr/bin/env python3
"""The song's hi-hats, for the cuts between beats. His word on the three versions (2026-11-25): "match the hi hats too
when frame switches".

The hats are found in the sound above 7 kHz (onset strength from 7 to 16 kHz, a hop of about 3 ms, peaks picked
against their own neighbourhood). A hat within 70 ms of a beat is that beat's own cut and is dropped. Hats closer
than 70 ms to the one before are a roll (the song's trap rolls run about 50 ms apart); a roll keeps every hit, for a
stutter of cuts between two framings of like brightness. Writes hats.json beside this file.

  python sound_hats.py <sound.mp3>
"""
import json, os, sys
import numpy as np
import librosa
import scipy.signal as ss

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import core

y, sr = librosa.load(sys.argv[1], sr=44100, mono=True)
b, a = ss.butter(6, 7000 / (sr / 2), "high")
hp = ss.filtfilt(b, a, y)
hop = 128
env = librosa.onset.onset_strength(y=hp, sr=sr, hop_length=hop, n_mels=40, fmin=7000, fmax=16000)
env = env / env.max()
t = librosa.frames_to_time(np.arange(len(env)), sr=sr, hop_length=hop)
pk = librosa.util.peak_pick(env, pre_max=6, post_max=6, pre_avg=40, post_avg=10, delta=0.08, wait=12)
hats = [float(x) for x in t[pk]]
beats = np.array(core.BEATS)
kept = [h for h in hats if np.min(np.abs(beats - h)) > 0.070 and h < beats[-1] - 0.05]
out, last = [], -1.0
for h in kept:
    roll = (h - last) < 0.070
    out.append({"t": round(h, 3), "roll": bool(roll)})
    last = h
for k in range(1, len(out)):          # the first hit of a roll belongs to it too
    if out[k]["roll"]:
        out[k - 1]["roll"] = True
json.dump({"source": "sound_hats.py", "hats": out}, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "hats.json"), "w"), indent=0)
print(f"hats between beats: {len(out)}; in rolls: {sum(o['roll'] for o in out)}")
