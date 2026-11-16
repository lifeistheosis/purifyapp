#!/usr/bin/env python3
# The voices recorder (Purify 1.9): Heart, the one voice, for every reader,
# recorded ahead from the repository alone on GitHub's own runners
# (.github/workflows/voices-record.yml; his yes of 2026-11-16, about 00:33
# UTC). Heart alone since his word of 2026-11-16, about 22:35 UTC ("only leave
# one the standard prerecorded voices"): the three voices once planned for
# Purify Plus are dropped, and with them their private bucket. His steps are
# docs/1.9-build/OWNER-STEPS.md, "Voices on GitHub's runners".
#
#   plan    the work a run file names, packed into shards
#             record.py plan --run scripts/voices/run.json --batches listen-batches --out plan/plan.json
#   record  one shard of a plan, or chapters and batches named here
#             record.py record --plan plan/plan.json --shard 1 --out out
#             record.py record --voice af_heart --chapter genesis/1 --batch listen-batches/history/pentecost.json --out out
#   report  measures what was recorded, beside Heart's New Testament
#             record.py report --out out
#   where   the bucket and key a recording goes to
#
# What a recording is, each part measured on Heart's New Testament where the
# app plays it (audio.purifyapp.net/read/, 2026-11-16):
# - Kokoro 82M through kokoro-onnx 0.6.1, the engine Heart's New Testament was
#   made with (docs/licensing/audio-provenance.md), at speed 1.0, its fp16
#   model. On John 1 the fp16 model reads within 1.4 percent of Heart's length
#   (the fp32 model 2.7 percent short, the int8 3.6 percent short).
# - After every verse, 0.45 s of silence: all 7,697 gaps and all 260 endings in
#   Heart's New Testament timings are 0.45 s. In a batch (V1), 0.45 s after
#   each sentence and twice that, 0.9 s, after each block.
# - Loudness: each recording brought to -22.2 LUFS integrated, Heart's level
#   (John 1 -22.1, Romans 8 -22.5, Mark 4 -22.1), its sample peak kept at or
#   under -1.0 dBFS, Heart's own (-1.00, -0.92, -1.01).
# - Sound: mp3, 24 kHz, mono, LAME VBR quality 7, as Heart's chapters are
#   (LAME 3.100 VBR, 39.8 to 40.3 kbit/s).
# - Timings: Heart's chapter files exactly ({"voice", "seconds", "verses":
#   [{"n", "at", "end", "text"}]}) and V1's batch files ({"voice", "seconds",
#   "blocks": [{"at"?, "s": [[start, end], ...]}]}), each time to the
#   hundredth, with the sound laid so that every time is where the sound is.
#
# Python 3.10 or later. The model, numpy and ffmpeg are needed only to record
# for real; the plan, and the stand-in engine the tests use, need none of them.

import argparse
import json
import math
import os
import re
import subprocess
import sys
import time
import unicodedata
import wave
from array import array
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SR = 24000
SPEED = 1.0
VERSE_PAUSE = 0.45
BLOCK_PAUSE = 0.90
TARGET_LUFS = -22.2
PEAK_CEILING_DB = -1.0
MP3_VBR_QUALITY = "7"
DEFAULT_MODEL = "kokoro-v1.0.fp16.onnx"
VOICES_FILE = "voices-v1.0.bin"
# Heart's pace with its pauses: 180,798 words in 16.34 hours (scripts/listen-batches.mjs).
WORDS_A_MINUTE = 184.4
# GitHub's limits for a public repository: 20 jobs at once, 256 in one run, 6 hours a job.
MAX_PARALLEL = 20
MAX_SHARDS = 256
PUBLIC_BASE = "https://audio.purifyapp.net"

# Kokoro's name for Heart, the one voice: every reader's and public, beside the
# Bible's recordings. No other voice is recorded (his word of 2026-11-16).
VOICES = {
    "af_heart": {"lang": "en-us"},
}
NEW_TESTAMENT = "new-testament"
OLD_TESTAMENT = "old-testament"

SILENCE = array("f", [0.0])


# --- What is read -------------------------------------------------------------


def bible_books():
    return json.loads((ROOT / "data" / "bible" / "books.json").read_text(encoding="utf-8"))


def bible_chapter(ref):
    book, n = parse_chapter(ref)
    return json.loads((ROOT / "data" / "bible" / book / f"{n}.json").read_text(encoding="utf-8"))


def parse_chapter(ref):
    m = re.fullmatch(r"([a-z0-9-]+)/(\d{1,3})", ref)
    if not m:
        raise SystemExit(f"Not a chapter: {ref!r} (a book and a number, as john/1)")
    return m.group(1), int(m.group(2))


def testament_of(book):
    for b in bible_books():
        if b["slug"] == book:
            return b["testament"]
    raise SystemExit(f"No such book: {book!r}")


def words(text):
    return len(text.split())


def spoken(text):
    """What the voice is handed: the text as written, its ligatures and wide forms made plain."""
    return " ".join(unicodedata.normalize("NFKC", text).split())


# --- The voice ----------------------------------------------------------------


class StandIn:
    """No model: a quiet 240 Hz tone as long as the words (0.05 s a letter, at least 0.2 s). For the tests."""

    CYCLE = array("f", (0.25 * math.sin(2 * math.pi * i / 100) for i in range(100)))

    def speak(self, text, voice):
        n = max(int(SR * 0.05 * sum(c.isalnum() for c in text)), int(SR * 0.2))
        return (self.CYCLE * (n // 100 + 1))[:n]


class Kokoro:
    def __init__(self, models, model, threads=0):
        import onnxruntime as ort
        from kokoro_onnx import Kokoro as Engine

        opts = ort.SessionOptions()
        if threads:
            opts.intra_op_num_threads = threads
        session = ort.InferenceSession(str(Path(models) / model), opts, providers=["CPUExecutionProvider"])
        self.engine = Engine.from_session(session, str(Path(models) / VOICES_FILE))

    def speak(self, text, voice):
        if not re.search(r"\w", text):
            return array("f")
        audio, rate = self.engine.create(spoken(text), voice=voice, speed=SPEED, lang=VOICES[voice]["lang"])
        if rate != SR:
            raise SystemExit(f"The model spoke at {rate} Hz, not {SR}")
        out = array("f")
        out.frombytes(audio.astype("<f4").tobytes())
        return out


# --- Laying the sound out, and its timings ------------------------------------


def lay_out(units):
    """Each (samples, pause after) in order. The times are rounded to the hundredth, as Heart's
    are, and each run of samples starts exactly at its rounded time, so the silence after it is
    its pause to within 5 ms and no time drifts from its sound. Returns the sound, each run's
    (start, end) and the length in seconds, which is the sound's own length."""
    audio = array("f")
    spans = []
    at = 0.0
    for samples, pause in units:
        start = round(at * SR)
        if start < len(audio):
            raise ValueError("a pause shorter than the rounding")
        audio.extend(SILENCE * (start - len(audio)))
        audio.extend(samples)
        end = round(at + len(samples) / SR, 2)
        spans.append((at, end))
        at = round(end + pause, 2)
    audio.extend(SILENCE * (round(at * SR) - len(audio)))
    return audio, spans, at


def record_chapter(voice_engine, voice, ref):
    chapter = bible_chapter(ref)
    verses = chapter["verses"]
    audio, spans, seconds = lay_out([(voice_engine.speak(v["text"], voice), VERSE_PAUSE) for v in verses])
    rows = [{"n": v["n"], "at": a, "end": e, "text": v["text"]} for v, (a, e) in zip(verses, spans)]
    return audio, {"voice": voice, "seconds": seconds, "verses": rows}


def record_batch(voice_engine, voice, batch):
    units, counts = [], []
    for block in batch["blocks"]:
        sentences = block["sentences"]
        for i, sentence in enumerate(sentences):
            units.append((voice_engine.speak(sentence, voice), BLOCK_PAUSE if i == len(sentences) - 1 else VERSE_PAUSE))
        counts.append(len(sentences))
    audio, spans, seconds = lay_out(units)
    blocks, k = [], 0
    for block, count in zip(batch["blocks"], counts):
        row = {"at": block["at"]} if block.get("at") else {}
        row["s"] = [[a, e] for a, e in spans[k : k + count]]
        blocks.append(row)
        k += count
    return audio, {"voice": voice, "seconds": seconds, "blocks": blocks}


# --- Level and sound ----------------------------------------------------------


def ffmpeg(args, data=None):
    return subprocess.run(["ffmpeg", "-hide_banner", "-nostats", *args], input=data, capture_output=True, check=True)


def integrated_lufs(raw):
    """EBU R128 integrated loudness of float samples, by ffmpeg's meter: the meter Heart was measured with."""
    err = ffmpeg(["-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "pipe:0", "-af", "ebur128=framelog=quiet", "-f", "null", "-"], raw).stderr.decode()
    found = re.findall(r"I:\s+(-?\d+(?:\.\d+)?) LUFS", err)
    if not found:
        raise SystemExit("ffmpeg gave no loudness")
    return float(found[-1])


def longest_quiet(samples, threshold_db=-40.0):
    """The longest run of 10 ms frames this far under the loudest frame, in seconds."""
    import numpy as np

    x = np.frombuffer(samples, dtype=np.float32) if isinstance(samples, (bytes, bytearray)) else np.asarray(samples, dtype=np.float32)
    frame = SR // 100
    n = len(x) // frame
    if n == 0:
        return 0.0
    rms = np.sqrt((x[: n * frame].reshape(n, frame).astype(np.float64) ** 2).mean(1))
    quiet = rms <= rms.max() * 10 ** (threshold_db / 20)
    best = run = 0
    for q in quiet:
        run = run + 1 if q else 0
        best = max(best, run)
    return best / 100


def limit(y, ceiling):
    """Brings each sample over the ceiling under it with a smooth dip 5 ms either side of it,
    leaving every other sample as it was."""
    import numpy as np

    w = SR // 200
    ramp = np.hanning(2 * w + 1)
    y = y.copy()
    for _ in range(4):
        over = np.flatnonzero(np.abs(y) > ceiling)
        if not len(over):
            break
        gain = np.ones(len(y))
        for i in over:
            lo, hi = max(0, i - w), min(len(y), i + w + 1)
            dip = 1 - (1 - ceiling * 0.999 / abs(y[i])) * ramp[lo - (i - w) : hi - (i - w)]
            gain[lo:hi] = np.minimum(gain[lo:hi], dip)
        y *= gain
    return y


def finish(audio, path, kind_of_file):
    """Writes the sound. For real: brought to Heart's level and encoded as Heart's mp3s are.
    For the stand-in: a plain wav, untouched. Returns what was measured on the way."""
    if kind_of_file == "wav":
        with wave.open(str(path.with_suffix(".wav")), "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes(array("h", (int(max(-1.0, min(1.0, s)) * 32767) for s in audio)).tobytes())
        return {}
    import numpy as np

    x = np.frombuffer(audio.tobytes(), dtype=np.float32).astype(np.float64)
    lufs_in = integrated_lufs(x.astype("<f4").tobytes())
    gain_db = TARGET_LUFS - lufs_in
    y = x * 10 ** (gain_db / 20)
    ceiling = 10 ** (PEAK_CEILING_DB / 20)
    over = int((np.abs(y) > ceiling).sum())
    # A recording at Heart's loudness has a handful of samples over Heart's peak (John 1: 4
    # of 7.8 million, in two places): each is brought under it by a 10 ms dip. Were there
    # many, the dips would be heard, so the whole recording is turned down instead.
    capped = over > len(y) / 1000
    if capped:
        gain_db = PEAK_CEILING_DB - 20 * math.log10(float(np.abs(x).max()))
        y = x * 10 ** (gain_db / 20)
    elif over:
        y = limit(y, ceiling)
    y = y.astype("<f4")
    raw = y.tobytes()
    ffmpeg(["-loglevel", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "pipe:0", "-c:a", "libmp3lame", "-q:a", MP3_VBR_QUALITY, "-id3v2_version", "0", str(path.with_suffix(".mp3"))], raw)
    return {
        "lufsIn": round(lufs_in, 2),
        "gainDb": round(gain_db, 2),
        "peakCapped": capped,
        "samplesLimited": 0 if capped else over,
        "peakDbfs": round(20 * math.log10(float(np.abs(y).max()) or 1e-9), 2),
        "longestQuiet": longest_quiet(raw),
        "mp3Bytes": path.with_suffix(".mp3").stat().st_size,
    }


# --- Where each recording goes --------------------------------------------------


def place(item):
    """Where the recording is written here, without its extension: as the app reads Heart's
    (lib/readAloud/chapters.ts, lib/listen/recordings.ts)."""
    return f"{'read' if item['kind'] == 'chapter' else 'listen'}/{item['id']}"


def target(item):
    """The bucket a recording goes to and its key there, without its extension: the Bible's
    public bucket (R2_BUCKET), behind audio.purifyapp.net, where the app reads it."""
    return "R2_BUCKET", place(item)


def guard(item, mode):
    """Heart's New Testament is published and its timings are in the app: a new recording of it
    would no longer match them, so it is only ever made to be measured, never uploaded."""
    if item["voice"] == "af_heart" and item["kind"] == "chapter" and testament_of(parse_chapter(item["id"])[0]) == "NT" and mode != "dry":
        raise SystemExit(f"Heart's New Testament is already recorded ({item['id']}); it is never recorded again for the bucket.")


# --- The buckets ----------------------------------------------------------------


def need(name):
    if not os.environ.get(name):
        raise SystemExit(f"{name} is not set (an Actions secret: docs/1.9-build/OWNER-STEPS.md, V12)")
    return os.environ[name]


def aws(which, *args, quiet=True):
    """The aws command against the bucket named by its secret; "{bucket}" in an argument is
    its name."""
    name, endpoint = need(which), need("R2_ENDPOINT")
    need("AWS_ACCESS_KEY_ID")
    need("AWS_SECRET_ACCESS_KEY")
    env = dict(os.environ, AWS_DEFAULT_REGION="auto", AWS_REQUEST_CHECKSUM_CALCULATION="when_required", AWS_RESPONSE_CHECKSUM_VALIDATION="when_required")
    cmd = ["aws", *[a.replace("{bucket}", name) for a in args], "--endpoint-url", endpoint, "--region", "auto"]
    return subprocess.run(cmd, env=env, capture_output=quiet)


def in_bucket(which, key):
    return aws(which, "s3api", "head-object", "--bucket", "{bucket}", "--key", key).returncode == 0


def put(path, which, key):
    kind = "audio/mpeg" if path.suffix == ".mp3" else "application/json"
    done = aws(which, "s3", "cp", str(path), f"s3://{{bucket}}/{key}", "--content-type", kind, "--cache-control", "public, max-age=86400", "--only-show-errors", quiet=False)
    if done.returncode != 0:
        raise SystemExit(f"Upload failed: {key}")


# --- Plan -------------------------------------------------------------------------


def chapter_item(voice, ref):
    return {"voice": voice, "kind": "chapter", "id": ref, "words": sum(words(v["text"]) for v in bible_chapter(ref)["verses"])}


def make_plan(run, batches_dir):
    batches_dir = Path(batches_dir)
    order = json.loads((batches_dir / "order.json").read_text(encoding="utf-8"))
    groups = {g["group"]: g["batches"] for g in order}
    mode = run["mode"]
    if mode not in ("dry", "full"):
        raise SystemExit("mode is dry or full")
    items = []
    for work in run["work"]:
        voice = work["voice"]
        if voice not in VOICES:
            raise SystemExit(f"Heart (af_heart) is the only voice recorded, not {voice!r} (his word of 2026-11-16)")
        for group in work.get("groups", []):
            if group in (NEW_TESTAMENT, OLD_TESTAMENT):
                testament = "NT" if group == NEW_TESTAMENT else "OT"
                for b in bible_books():
                    if b["testament"] == testament:
                        items += [chapter_item(voice, f"{b['slug']}/{n}") for n in range(1, b["chapters"] + 1)]
            elif group in groups:
                items += [{"voice": voice, "kind": "batch", "id": b["id"], "words": b["words"]} for b in groups[group]]
            else:
                raise SystemExit(f"No such group: {group!r}")
        items += [chapter_item(voice, ref) for ref in work.get("chapters", [])]
        for bid in work.get("batches", []):
            batch = json.loads((batches_dir / f"{bid}.json").read_text(encoding="utf-8"))
            items.append({"voice": voice, "kind": "batch", "id": bid, "words": batch["words"]})
    seen = set()
    for item in items:
        guard(item, mode)
        key = (item["voice"], item["kind"], item["id"])
        if key in seen:
            raise SystemExit(f"Named twice: {key}")
        seen.add(key)
        item["minutes"] = round(item["words"] / WORDS_A_MINUTE, 2)
    rtf = float(run["rtf"])
    if mode == "dry":
        voices = sorted({i["voice"] for i in items})
        shards = [[i for i in items if i["voice"] == v] for v in voices]
    else:
        total = sum(i["minutes"] for i in items) / rtf / 60
        count = max(1, math.ceil(total / float(run["shardHours"])))
        # In whole waves of 20, so no shard waits alone for a second wave.
        if count > MAX_PARALLEL:
            count = math.ceil(count / MAX_PARALLEL) * MAX_PARALLEL
        count = min(MAX_SHARDS, count)
        shards = [[] for _ in range(count)]
        load = [0.0] * count
        for item in sorted(items, key=lambda i: -i["minutes"]):
            k = load.index(min(load))
            shards[k].append(item)
            load[k] += item["minutes"]
    out = []
    for n, part in enumerate(shards, 1):
        out.append({"shard": n, "hours": round(sum(i["minutes"] for i in part) / rtf / 60, 2), "items": part})
    per_voice = {}
    for item in items:
        v = per_voice.setdefault(item["voice"], {"recordings": 0, "words": 0, "hoursOfSound": 0.0})
        v["recordings"] += 1
        v["words"] += item["words"]
        v["hoursOfSound"] = round(v["hoursOfSound"] + item["minutes"] / 60, 2)
    longest = max((s["hours"] for s in out), default=0)
    waves = math.ceil(len(out) / MAX_PARALLEL)
    return {
        "run": run["run"],
        "mode": mode,
        "model": run.get("model", DEFAULT_MODEL),
        "rtf": rtf,
        "voices": per_voice,
        "hoursOfSound": round(sum(i["minutes"] for i in items) / 60, 1),
        "runnerHours": round(sum(s["hours"] for s in out), 1),
        "shards": out,
        "expectedHours": round(waves * longest, 1),
    }


def cmd_plan(a):
    run = json.loads(Path(a.run).read_text(encoding="utf-8"))
    plan = make_plan(run, a.batches)
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    Path(a.out).write_text(json.dumps(plan, indent=1) + "\n", encoding="utf-8")
    for voice, v in plan["voices"].items():
        print(f"{voice}: {v['recordings']} recordings, {v['words']:,} words, {v['hoursOfSound']} hours of sound")
    print(f"{plan['mode']} run {plan['run']}: {plan['hoursOfSound']} hours of sound, about {plan['runnerHours']} runner hours at {plan['rtf']}x, {len(plan['shards'])} shards, the longest {max(s['hours'] for s in plan['shards'])} h, about {plan['expectedHours']} h from start to end")
    if os.environ.get("GITHUB_OUTPUT"):
        with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as f:
            f.write(f"shards={json.dumps([s['shard'] for s in plan['shards']])}\n")
            f.write(f"mode={plan['mode']}\nmodel={plan['model']}\n")


# --- Record -----------------------------------------------------------------------


def record_item(voice_engine, item, out, kind_of_file, batches_dir):
    started = time.time()
    if item["kind"] == "chapter":
        audio, timings = record_chapter(voice_engine, item["voice"], item["id"])
        units = len(timings["verses"])
    else:
        batch = json.loads(Path(item.get("file") or Path(batches_dir) / f"{item['id']}.json").read_text(encoding="utf-8"))
        if batch["id"] != item["id"]:
            raise SystemExit(f"{item['id']}: the batch file names {batch['id']}")
        audio, timings = record_batch(voice_engine, item["voice"], batch)
        units = sum(len(b["s"]) for b in timings["blocks"])
    spoke = time.time() - started
    path = Path(out) / place(item)
    path.parent.mkdir(parents=True, exist_ok=True)
    measured = finish(audio, path, kind_of_file)
    path.with_suffix(".json").write_text(json.dumps(timings) + "\n", encoding="utf-8")
    return {"voice": item["voice"], "kind": item["kind"], "id": item["id"], "units": units, "seconds": timings["seconds"], "speakSeconds": round(spoke, 1), "rtf": round(timings["seconds"] / max(spoke, 1e-6), 2), "t0": round(started, 1), "t1": round(time.time(), 1), **measured}


def cmd_record(a):
    if a.plan:
        plan = json.loads(Path(a.plan).read_text(encoding="utf-8"))
        mode = plan["mode"]
        model = plan["model"]
        items = plan["shards"][a.shard - 1]["items"]
        # Two recorders of two threads each make 1.27 times the sound one of four makes on
        # four cores (John 1, 2026-11-16: 6.2x together against 5.4x), so a shard's
        # recordings are dealt between them.
        k, n = (int(x) for x in a.part.split("/"))
        items = items[k - 1 :: n]
    else:
        mode = "dry"
        model = a.model
        items = [{"voice": a.voice, "kind": "chapter", "id": c} for c in a.chapter]
        for path in a.batch:
            batch = json.loads(Path(path).read_text(encoding="utf-8"))
            items.append({"voice": a.voice, "kind": "batch", "id": batch["id"], "file": path})
    upload = bool(a.upload)
    if upload and mode != "full":
        raise SystemExit("A dry run uploads nothing.")
    for item in items:
        guard(item, mode)
    voice_engine = StandIn() if a.engine == "stand-in" else Kokoro(a.models, model, a.threads)
    kind_of_file = "wav" if a.engine == "stand-in" else "mp3"
    deadline = time.time() + a.minutes * 60 if a.minutes else None
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    tag = f"{a.shard or 0}-{a.part.replace('/', 'of')}"
    report = out / f"report-{tag}.jsonl"
    left, done, kept = [], 0, 0
    for item in items:
        if deadline and time.time() > deadline:
            left.append(item)
            continue
        local = place(item)
        which, key = target(item)
        if upload and in_bucket(which, f"{key}.mp3") and in_bucket(which, f"{key}.json"):
            kept += 1
            continue
        row = record_item(voice_engine, item, out, kind_of_file, a.batches)
        if upload:
            put(out / f"{local}.mp3", which, f"{key}.mp3")
            put(out / f"{local}.json", which, f"{key}.json")
            (out / f"{local}.mp3").unlink()
            row["uploaded"] = True
        with report.open("a", encoding="utf-8") as f:
            f.write(json.dumps(row) + "\n")
        done += 1
        print(f"{item['voice']} {item['id']}: {row['seconds']} s of sound in {row['speakSeconds']} s ({row['rtf']}x)", flush=True)
    if left:
        (out / f"left-{tag}.json").write_text(json.dumps(left) + "\n", encoding="utf-8")
    print(f"recorded {done}, already in the bucket {kept}, left for the next run {len(left)}")


# --- Report -----------------------------------------------------------------------


def probe_file(mp3):
    info = json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_name,sample_rate,channels:format=duration", "-of", "json", str(mp3)], capture_output=True, check=True).stdout)
    s = info["streams"][0]
    duration = float(info["format"]["duration"])
    err = ffmpeg(["-i", str(mp3), "-af", "ebur128=framelog=quiet,astats=metadata=0:measure_perchannel=Peak_level:measure_overall=none", "-f", "null", "-"]).stderr.decode()
    lufs = re.findall(r"I:\s+(-?\d+(?:\.\d+)?) LUFS", err)
    peak = re.findall(r"Peak level dB:\s+(-?[\d.]+|-inf)", err)
    raw = ffmpeg(["-i", str(mp3), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"]).stdout
    return {
        "codec": s["codec_name"],
        "rate": int(s["sample_rate"]),
        "channels": s["channels"],
        "seconds": round(duration, 2),
        "kbps": round(mp3.stat().st_size * 8 / duration / 1000, 1),
        "lufs": float(lufs[-1]) if lufs else None,
        "peakDbfs": float(peak[-1]) if peak else None,
        "longestQuiet": longest_quiet(raw),
        "raw": raw,
    }


def pauses(raw, spans):
    """The silence heard between each two spans, measured on the sound: the run of quiet 10 ms
    frames (40 dB under the loudest) around the middle of each gap the timings give."""
    import numpy as np

    x = np.frombuffer(raw, dtype=np.float32)
    frame = SR // 100
    n = len(x) // frame
    rms = np.sqrt((x[: n * frame].reshape(n, frame).astype(np.float64) ** 2).mean(1))
    quiet = rms <= rms.max() * 10 ** (-40 / 20)
    found = []
    for (_, end), (start, _) in zip(spans, spans[1:]):
        mid = min(n - 1, int((end + start) / 2 * 100))
        if not quiet[mid]:
            found.append(0.0)
            continue
        lo = hi = mid
        while lo > 0 and quiet[lo - 1]:
            lo -= 1
        while hi < n - 1 and quiet[hi + 1]:
            hi += 1
        found.append((hi - lo + 1) / 100)
    return found


def spans_of(timings):
    if "verses" in timings:
        return [(v["at"], v["end"]) for v in timings["verses"]]
    return [tuple(s) for b in timings["blocks"] for s in b["s"]]


def describe(mp3, timings, words_read=None):
    m = probe_file(mp3)
    spans = spans_of(timings)
    gaps = sorted(pauses(m.pop("raw"), spans))
    speech = sum(e - a for a, e in spans)
    row = {**m, "timed": round(timings["seconds"], 2)}
    if gaps:
        row["pause"] = {"median": gaps[len(gaps) // 2], "min": gaps[0], "max": gaps[-1]}
    if words_read:
        row["wordsPerSecond"] = round(words_read / speech, 2)
    return row


def cmd_report(a):
    out = Path(a.out)
    rows, lines = [], []
    heart = None
    if a.heart:
        book, n = parse_chapter(a.heart)
        ref = out / "_heart" / f"{book}-{n}.mp3"
        ref.parent.mkdir(parents=True, exist_ok=True)
        got = subprocess.run(["curl", "-sSfL", "--max-time", "120", "-o", str(ref), f"{PUBLIC_BASE}/read/{book}/{n}.mp3"])
        if got.returncode == 0:
            timings = json.loads((ROOT / "public" / "audio" / "read" / book / f"{n}.json").read_text(encoding="utf-8"))
            heart = describe(ref, timings, sum(words(v["text"]) for v in timings["verses"]))
            heart.update(voice="Heart's New Testament (the bucket)", id=a.heart)
            rows.append(heart)
        else:
            lines.append(f"Heart's {a.heart} could not be fetched from {PUBLIC_BASE} here, so nothing is measured beside it.")
            lines.append("")
    speeds, runners = {}, {}
    for f in out.glob("report-*.jsonl"):
        shard = f.stem.split("-")[1]
        for line in f.read_text(encoding="utf-8").splitlines():
            r = json.loads(line)
            s = speeds.setdefault(r["voice"], [0.0, 0.0])
            s[0] += r["seconds"]
            s[1] += r["speakSeconds"]
            w = runners.setdefault(shard, [0.0, r["t0"], r["t1"]])
            w[0] += r["seconds"]
            w[1], w[2] = min(w[1], r["t0"]), max(w[2], r["t1"])
    for mp3 in sorted(out.rglob("*.mp3")):
        if "_heart" in mp3.parts:
            continue
        timings = json.loads(mp3.with_suffix(".json").read_text(encoding="utf-8"))
        parts = mp3.relative_to(out).with_suffix("").as_posix().split("/")
        kind, rid = parts[0], "/".join(parts[1:])
        read =sum(words(v["text"]) for v in timings["verses"]) if kind == "read" else None
        row = describe(mp3, timings, read)
        row.update(voice=timings["voice"], id=rid)
        if heart and kind == "read" and rid == a.heart:
            row["againstHeart"] = round(row["timed"] / heart["timed"], 4)
        rows.append(row)
    lines.append("| voice | recording | s | kbit/s | Hz, ch | LUFS | peak dBFS | pause median (min to max) | longest quiet s | words/s | length / Heart's |")
    lines.append("|---|---|---:|---:|---|---:|---:|---|---:|---:|---:|")
    for r in rows:
        p = r.get("pause")
        lines.append(
            f"| {r['voice']} | {r['id']} | {r['seconds']} | {r['kbps']} | {r['rate']}, {r['channels']} | {r['lufs']} | {r['peakDbfs']} | "
            + (f"{p['median']} ({p['min']} to {p['max']})" if p else "")
            + f" | {r['longestQuiet']} | {r.get('wordsPerSecond', '')} | {r.get('againstHeart', '')} |"
        )
    if speeds:
        lines.append("")
        lines.append("| voice | sound s | speaking s | one recorder's real-time factor |")
        lines.append("|---|---:|---:|---:|")
        for voice, (sound, spent) in sorted(speeds.items()):
            lines.append(f"| {voice} | {round(sound, 1)} | {round(spent, 1)} | {round(sound / max(spent, 1e-6), 2)}x |")
        lines.append("")
        lines.append("| shard | sound s | from first start to last end, s | the runner's real-time factor |")
        lines.append("|---|---:|---:|---:|")
        for shard, (sound, t0, t1) in sorted(runners.items(), key=lambda kv: int(kv[0])):
            lines.append(f"| {shard} | {round(sound, 1)} | {round(t1 - t0, 1)} | {round(sound / max(t1 - t0, 1e-6), 2)}x |")
    text = "\n".join(lines)
    print(text)
    print(json.dumps(rows))
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as f:
            f.write(text + "\n")
    left = list(out.glob("left-*.json"))
    if left:
        raise SystemExit(f"{len(left)} shards ran out of time; their recordings are in left-*.json and a new run takes them up.")


def main():
    p = argparse.ArgumentParser(description="Records Purify's voices (scripts/voices/record.py)")
    sub = p.add_subparsers(dest="cmd", required=True)
    pl = sub.add_parser("plan")
    pl.add_argument("--run", default=str(ROOT / "scripts" / "voices" / "run.json"))
    pl.add_argument("--batches", default="listen-batches")
    pl.add_argument("--out", default="plan/plan.json")
    rc = sub.add_parser("record")
    rc.add_argument("--plan")
    rc.add_argument("--shard", type=int, default=0)
    rc.add_argument("--voice", choices=sorted(VOICES))
    rc.add_argument("--chapter", action="append", default=[])
    rc.add_argument("--batch", action="append", default=[])
    rc.add_argument("--batches", default="listen-batches")
    rc.add_argument("--out", required=True)
    rc.add_argument("--models", default=os.environ.get("VOICES_MODELS", str(Path.home() / ".cache" / "purify-voices")))
    rc.add_argument("--model", default=DEFAULT_MODEL)
    rc.add_argument("--threads", type=int, default=0)
    rc.add_argument("--part", default="1/1", help="this recorder's share of the shard, as 1/2")
    rc.add_argument("--engine", choices=["kokoro", "stand-in"], default="kokoro")
    rc.add_argument("--upload", action="store_true")
    rc.add_argument("--minutes", type=float, default=0, help="start no recording after this many minutes")
    rp = sub.add_parser("report")
    rp.add_argument("--out", required=True)
    rp.add_argument("--heart", help="a New Testament chapter of Heart's to measure beside, as john/1")
    wh = sub.add_parser("where")
    wh.add_argument("--voice", choices=sorted(VOICES), required=True)
    wh.add_argument("--chapter")
    wh.add_argument("--batch")
    a = p.parse_args()
    if a.cmd == "plan":
        cmd_plan(a)
    elif a.cmd == "record":
        if not a.plan and not a.voice:
            raise SystemExit("record needs --plan and --shard, or --voice with --chapter and --batch")
        cmd_record(a)
    elif a.cmd == "report":
        cmd_report(a)
    else:
        item = {"voice": a.voice, "kind": "chapter" if a.chapter else "batch", "id": a.chapter or a.batch}
        which, key = target(item)
        print(json.dumps({"bucket": which, "key": key, "local": place(item)}))


if __name__ == "__main__":
    main()
