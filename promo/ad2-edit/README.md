# AD 2, "Your Bible is missing books"

The TikTok edit cut to the owner's `your_bible_is_missing_books.mp3` (his voiceover over a
borrowed beat), 16.5 s, in a new style called RUBRIC: lapis black, cool vellum, and the red
that Orthodox service books print their rubrics in. There is no gold and no orange anywhere, which
is the owner's rule after AD 1. Every cut, tear, ring and word is keyed to times measured from
the audio, written down in `timing.json`.

Nothing here is media. The beat is a borrowed TikTok sound and stays out of this public repo;
the voiceover, the frames and the videos are rebuilt with the tools below.

## The format: hook, history, reconciliation, the fix

The owner's brief, 2026-10-07: this is one type of creative that works so far, and the others are
still to be worked out. AD 2 is the first piece built on it.

| Part | Time | On screen |
| --- | --- | --- |
| Hook (the attention grabber) | 0 to 4.0 s | YOUR BIBLE IS / MISSING BOOKS over a contents page, The Historical Books, from Brenton's Septuagint. Three bands are torn out on the beat: Tobit and Judith, the Maccabees, 1 Esdras. RIPPED OUT / ON PURPOSE. |
| The issue or the history | 4.0 to 7.1 s | Three dated facts, the years rolling: c. 350, Codex Sinaiticus carries Tobit, Judith, Wisdom and Sirach. 1534, Luther's Bible sets them apart as Apocrypha. 1646, the Westminster Confession calls them "no part of the canon". |
| The reconciliation | 7.1 to 9.7 s | The strips fly home and the seams close in rubric red. We built *Purify* / to give it back. |
| Purify, the fix | 9.7 to 16.5 s | The real Bible in the app on a tablet, a ring round each book a Protestant Bible leaves out. The complete, / unaltered canon. Completely *free*. The lockup, APOSTOLIC, ORTHODOX, KNOWLEDGE, and Free on iOS and Android. |

The owner's other notes for this piece: the hook has to be the most interesting part; the pacing
is slower than AD 1 because the cut is 16 s; the design, effects and transitions are smooth; the
effects are not the stock ones, and he hears them separately, last, and says yes or no.

## What is on screen, and where it comes from

| Shot | Source | Rights |
| --- | --- | --- |
| Contents page, torn strips, tablet frame, cross, lockup | drawn in code, `comp.js` | Purify's own |
| Book names and chapter counts | `data/bible/books.json` (Brenton's Septuagint) | Public domain text |
| Codex Sinaiticus behind the years | `public/sections/bible.jpg`, graded to lapis by `tools/prep.py` | Public domain (`docs/licensing/SECTION_MEDIA.md`) |
| The Bible screen in the tablet | the app's own `/bible` page, captured at 820 by 1180 | Purify's own |
| Inter, Lora | Open Font License | free for commercial use |
| Sound effects | synthesized, `tools/sfx.py` | Purify's own |

## What the words on screen claim

The voiceover says the books were "ripped out on purpose" and that "Western reformers erased
centuries of Orthodox history". Those are the owner's words and they stay in his audio, but the
screen carries only what can be checked: the three dated facts above. The risk for the owner to
weigh: in 1534 the books were moved to an appendix, not removed, and Protestant Bibles printed that
appendix into the 19th century; Catholic Bibles carry most of these books too, so the line lands
on Protestant Bibles only.

"The complete, unaltered canon" and "Completely free" were checked against `data/bible/books.json`
(78 books) and the free tier in `lib/premium/plans.ts` ("The Scriptures, with the Greek beside
them"). The voiceover says "unlocked"; the screen never shows it, because `docs/brand/voice.md`
bans the word.

## Rebuild

From this folder, with the repo's `node_modules` installed and Python 3 with `numpy`, `scipy`,
`soundfile` and `Pillow` (the measuring step also wants `librosa` and `sherpa-onnx`). The capture,
cover, speech and drum tools are AD 1's, in `../ad1-edit/tools`.

1. **Measure.** Decode both files to 44.1 kHz float (`ffmpeg -i vo.mp3 -f f32le -ac 2 -ar 44100 work/vo.f32`,
   the same for the beat), then `tools/align.py`, `tools/localgain.py` and `tools/stem.py` give the
   beat's offset, its gain and the voice alone. `../ad1-edit/tools/asr_ts.py` and `wordsnap.py`
   give the words; `../ad1-edit/tools/drums.py` splits the beat. The results are in `timing.json`.
2. **Capture the Bible screen.** Run the app (`npm run dev` at the repo root), then
   `node tools/bible-capture.mjs http://127.0.0.1:3000/bible work/ui`.
3. **Grade the pictures.** `python3 tools/prep.py ../../public work/ui assets`.
4. **Fonts.** Put `Inter-{Medium,SemiBold,Bold,ExtraBold,Black}.otf` and Lora's latin variable
   files as `lora-normal.woff2` and `lora-italic.woff2` in `fonts/`.
5. **Render.** Serve the folder (`python3 -m http.server 8770`), then
   `node ../ad1-edit/tools/capture.mjs http://127.0.0.1:8770/index.html frames full 30 16.5`,
   and `node ../ad1-edit/tools/cover.mjs http://127.0.0.1:8770/index.html out/cover.png` for the cover.
6. **Encode the clean edit** with the voiceover as it came:

   ```
   ffmpeg -framerate 30 -i frames/f_%04d.png -i vo.mp3 -vf "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p" -c:v libx264 -preset slow -crf 17 -profile:v high -colorspace bt709 -color_primaries bt709 -color_trc bt709 -c:a aac -b:a 256k -ar 48000 -movflags +faststart out/purify-ad2-edit.mp4
   ```

## Sound

Ten effects, each made by an object on screen instead of a stock whoosh, riser or impact: the
page tearing (three times), the page lifting away, a knock in a stone room for c. 350, the year
sliding up, a brass date wheel turning 1534 into 1646, the seams closing (three times), a tap on
the tablet's glass, a red pen ringing the books (four times), a heavy book shutting on the lockup,
and a bronze bell tuned to F, the beat's home note, on the tagline.

`ffmpeg -i vo.mp3 -ar 48000 -ac 2 -c:a pcm_f32le work/vo48.wav` and
`ffmpeg -f f32le -ar 44100 -ac 2 -i work/voice.f32 work/voice.wav` give the two inputs, then
`python3 tools/sfx.py track work/vo48.wav work/voice.wav work/sfx.wav work/sfx_cues.json work/sfx_report.txt work/words_snapped.json`
renders them. Every level is set against the mix's loudness (-17.7 LUFS, BS.1770) and then checked
word by word, voice against effects in the 1 to 4 kHz band where speech is understood: the
quietest word keeps 13.7 dB on average and every 20 ms of every word keeps at least 5.6 dB.
Mix and encode:

```
ffmpeg -i vo.mp3 -i work/sfx.wav -filter_complex "[0:a]aresample=48000[a];[a][1:a]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.84:attack=3:release=60:level=disabled:latency=1[m]" -map "[m]" work/mix.wav
```

then the same video line as above with `work/mix.wav` for `vo.mp3`. For review, `tools/captions.py`
labels each effect on an effects-only version (the effects turned up 8.5 dB, voice and beat
muted), and `tools/specview.py` draws the effects over the final mix.

**Status, 2026-10-08:** the clean edit went to the owner first; the effects go last, as two files
(effects only, and the edit with them in), for his yes or no. Not approved yet.
He may send sounds of his own instead, which go in at the same marks.

## Posting

- TikTok only, and never promoted: the beat is borrowed (SSM guardrail 2). A paid version needs a
  sound from TikTok's Commercial Music Library.
- After the owner's yes, a post file follows AD 1's: the voice and the effects only, with the sound
  added inside TikTok, in sync only if the sound starts at its very beginning.
- The cover carries the hook in the middle of the frame, with Tobit and Judith torn out above it.
- In the books: the format and this piece are on the SSM board's store as two ideas, with a
  540 by 960 preview and the poster uploaded to the board. They file into `ssm/` at the next
  `node ssm/ssm.mjs sync` in the purify-ads repo.
