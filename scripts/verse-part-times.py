#!/usr/bin/env python3
"""Where each chosen verse's part starts and ends in its chapter's recording.

His word, 2026-11-28: "when you click play it starts playing the whole verse rather than what
you see". A pick that shows a part of a long verse (data/today/verse-picks.json, `part`) played
the whole verse, because the recordings are timed by verse only
(public/audio/read/<book>/<chapter>.json). This finds the part inside its verse:

  1. The verse's sound is read (ffmpeg, mono at 16 kHz).
  2. A speech model (faster-whisper, "tiny.en") times each word it hears, and those words are
     matched to the verse's own words, so the part's first and last words are found by which
     word they are, never by guessing from length. (Placing by length alone failed: Hebrews
     4:7 says "To day" twice and the part is the second.)
  3. The model's times are close, not exact (it put "rejoice" in Luke 10:20 0.14 s early), so
     each boundary is the first gap between words found going out from the middle of the word
     as the model heard it: back from the part's first word for its start, on from its last
     word for its end. (The deepest gap nearby is not always the right one: in Luke 10:20 it
     lies before "rather", one word early.)

  python3 -m venv .venv-align && .venv-align/bin/pip install faster-whisper   (once; the model,
  about 75 MB, downloads on the first run)
  .venv-align/bin/python scripts/verse-part-times.py     writes data/today/verse-part-times.json

Run it after picks with a part are added; lib/today/__tests__/versePartTimes.test.ts fails until
every part has its times.
"""

import difflib
import json
import re
import subprocess
import sys
from pathlib import Path

import numpy as np
from faster_whisper import WhisperModel

ROOT = Path(__file__).resolve().parent.parent
RECORDINGS = "https://audio.purifyapp.net/read"
RATE = 16000
FRAME = 0.01
OUT = ROOT / "data/today/verse-part-times.json"


def norm(word: str) -> str:
    return re.sub(r"[^a-z0-9]", "", word.lower())


def sound(book: str, chapter: int, start: float, end: float) -> np.ndarray:
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-ss", str(start), "-to", str(end), "-i", f"{RECORDINGS}/{book}/{chapter}.mp3", "-ac", "1", "-ar", str(RATE), "-f", "s16le", "-"],
        check=True,
        capture_output=True,
    ).stdout
    return np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0


def energy(audio: np.ndarray) -> np.ndarray:
    per = int(RATE * FRAME)
    n = len(audio) // per
    rms = np.sqrt(np.mean(audio[: n * per].reshape(n, per) ** 2, axis=1))
    # Smoothed over three frames, so one quiet consonant is not taken for a gap.
    return np.convolve(rms, np.ones(3) / 3, mode="same")


def gap_from(e: np.ndarray, t: float, step: int, reach: float) -> float:
    """The middle of the first gap between words met going out from t (step -1 back, +1 on)."""
    speech = e[e > 0.05 * e.max()]
    quiet = 0.2 * float(np.median(speech)) if len(speech) else 0.0
    i = int(t / FRAME)
    limit = max(0, min(len(e) - 1, int((t + step * reach) / FRAME)))
    while 0 <= i < len(e) and (i - limit) * step < 0 and e[i] >= quiet:
        i += step
    if not (0 <= i < len(e)) or e[i] >= quiet:
        # No clear gap: the quietest instant on that side.
        a, b = sorted((int(t / FRAME), limit))
        return (a + int(np.argmin(e[a : b + 1]))) * FRAME
    j = i
    while 0 <= j + step < len(e) and e[j + step] < quiet:
        j += step
    return (i + j) / 2 * FRAME


def heard_index(verse_words: list, heard: list, i: int) -> int | None:
    """The heard word matched to the verse's word i, from an alignment of the two word lists."""
    sm = difflib.SequenceMatcher(a=[norm(w) for w in verse_words], b=[norm(w) for w, _, _ in heard], autojunk=False)
    for block in sm.get_matching_blocks():
        if block.a <= i < block.a + block.size:
            return block.b + (i - block.a)
    return None


def main() -> int:
    picks = json.loads((ROOT / "data/today/verse-picks.json").read_text())["picks"]
    model = WhisperModel("tiny.en", device="cpu", compute_type="int8")
    times = {}
    for day, pick in sorted(picks.items()):
        part = pick.get("part")
        if not part:
            continue
        key = f"{pick['book']}.{pick['chapter']}.{pick['verse']}:{part}"
        if key in times:
            continue
        timings = ROOT / "public/audio/read" / pick["book"] / f"{pick['chapter']}.json"
        if not timings.exists():
            # No recording of the chapter yet, so the card has no Listen to time.
            continue
        manifest = json.loads(timings.read_text())
        verse = next(v for v in manifest["verses"] if v["n"] == pick["verse"])
        text = " ".join((verse.get("text") or "").split())
        start = text.find(part)
        if start < 0:
            raise SystemExit(f"{day}: the part is not in the recording's words of {key}")
        stop = start + len(part)

        # The verse's words with where each starts in the text.
        words = [(m.group(), m.start(), m.end()) for m in re.finditer(r"\S+", text)]
        first = next(i for i, (_, a, _) in enumerate(words) if a >= start)
        last = max(i for i, (_, _, b) in enumerate(words) if b <= stop + 1)
        ends_with_verse = not re.search(r"[A-Za-z0-9]", text[stop:])

        lead = 0.05
        audio = sound(pick["book"], pick["chapter"], max(0.0, verse["at"] - lead), verse["end"] + lead)
        e = energy(audio)
        segments, _ = model.transcribe(audio, language="en", word_timestamps=True, initial_prompt=text, beam_size=5, condition_on_previous_text=False)
        heard = [(w.word.strip(), w.start, w.end) for s in segments for w in s.words]
        verse_words = [w for w, _, _ in words]
        to_chapter = lambda t: round(min(verse["end"], max(verse["at"], verse["at"] - lead + t)), 2)

        if first == 0:
            at = verse["at"]
        else:
            h = heard_index(verse_words, heard, first)
            if h is None:
                raise SystemExit(f"{day}: the model did not hear where the part begins in {key}")
            middle = (heard[h][1] + heard[h][2]) / 2
            at = to_chapter(gap_from(e, middle, -1, 0.45))
        if ends_with_verse:
            end = verse["end"]
        else:
            h = heard_index(verse_words, heard, last)
            if h is None:
                raise SystemExit(f"{day}: the model did not hear where the part ends in {key}")
            middle = (heard[h][1] + heard[h][2]) / 2
            end = to_chapter(gap_from(e, middle, 1, 0.5))
        if not verse["at"] <= at < end <= verse["end"]:
            raise SystemExit(f"{day}: {key} measured out of its verse ({at}-{end})")
        times[key] = {"at": at, "end": end, "verse": [verse["at"], verse["end"]]}
        print(f"{day}  {key[:68]:68}  {at}-{end}  (verse {verse['at']}-{verse['end']})")

    OUT.write_text(
        json.dumps(
            {
                "note": "Where each chosen verse's part starts and ends in its recording, in seconds into the chapter. Measured by scripts/verse-part-times.py; do not edit by hand.",
                "times": times,
            },
            indent=2,
            ensure_ascii=False,
        )
        + "\n"
    )
    print(f"\n{len(times)} parts measured: {OUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
