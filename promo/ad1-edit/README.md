# AD 1, the gold edit on the 808 sound

The TikTok edit cut to the owner's `AD_1.mp3` (voiceover over the 808 beat), in the
approved EDIT-GOLD style: cold bold capitals for the problem, gold serif for the answer,
the Purify lockup at the end. Every cut, shake, flash and word is keyed to times measured
from the audio, written down in `timing.json`.

Nothing here is media. The beat is a borrowed TikTok sound and stays out of this public
repo; the voiceover, the frames and the videos are rebuilt with the tools below.

## What is on screen, and where it comes from

| Shot | Source | Rights |
| --- | --- | --- |
| Candle, smoke, portico (COLLEGIVM), gates, light, phone frame | drawn in code, `comp.js` | Purify's own |
| St John Chrysostom, Hagia Sophia mosaic | `public/history/media/chrysostom-at-constantinople.jpg` | Public domain (`lib/history/events.ts`) |
| Archangel Michael, 14th c. | `public/shop/media/archangel-michael-print.jpg` | Public domain (`docs/licensing/SHOP_MEDIA.md`) |
| Holy Trinity, Rublev | `public/shop/media/holy-trinity-rublev-mounted.jpg` | Public domain (same) |
| Triumph of Orthodoxy | `public/history/media/triumph-of-orthodoxy.jpg` | Public domain (`lib/history/events.ts`) |
| Christ Pantocrator, Vysotsky chin | `public/shop/media/deesis-wooden-diptych.jpg` | Public domain (`SHOP_MEDIA.md`) |
| Dormition, Theophanes the Greek | `public/shop/media/dormition-of-the-theotokos-mounted.jpg` | Public domain (`SHOP_MEDIA.md`) |
| Sinai Pantocrator | `public/sections/prayers.jpg` | Public domain (`docs/licensing/SECTION_MEDIA.md`) |
| The History timeline in the phone | the app's own `/history` page, captured at phone size | Purify's own |
| Cross mark | `public/purify-cross-mark.png` | Purify's own |
| Inter, Lora | Open Font License | free for commercial use |
| Sound effects | synthesized, `tools/sfx.py` | Purify's own |

## Rebuild

From this folder, with the repo's `node_modules` installed and Python 3 with `numpy` and
`Pillow` (the analysis step also wants `librosa`, `soundfile` and `sherpa-onnx`).

1. **Capture the timeline.** Run the app (`npm run dev` at the repo root), then
   `node tools/history-capture.mjs http://127.0.0.1:3000/history work/ui`.
2. **Grade the pictures.** `python3 tools/prep.py assets work/ui/history_full.png`
   writes the gold and cold versions, the phone strip and the cross mark into `assets/`.
3. **Fonts.** Put `Inter-{Medium,SemiBold,Bold,ExtraBold,Black}.otf` and Lora's latin
   variable files as `lora-normal.woff2` and `lora-italic.woff2` in `fonts/`.
4. **Render.** Serve the folder (`python3 -m http.server 8765`), then
   `node tools/capture.mjs http://127.0.0.1:8765/index.html frames full 30 13.766`.
   `test 0.4,4.75,8.9` instead of `full ...` renders stills for a quick look.
   `node tools/cover.mjs http://127.0.0.1:8765/index.html out/cover.png` writes the cover.
5. **Sound.** `python3 tools/sfx.py work/sfx.wav 13.766`, then mix it under the audio
   and encode:

   ```
   ffmpeg -i AD_1.mp3 -i work/sfx.wav -filter_complex "[0:a]aresample=48000[a];[a][1:a]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.84:attack=3:release=60:level=disabled[m]" -map "[m]" work/mix.wav
   ffmpeg -framerate 30 -i frames/f_%04d.png -i work/mix.wav -vf "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p" -c:v libx264 -preset slow -crf 17 -profile:v high -colorspace bt709 -color_primaries bt709 -color_trc bt709 -c:a aac -b:a 256k -ar 48000 -movflags +faststart out/purify-ad1-edit.mp4
   ```

   The post file swaps `AD_1.mp3` for the voice alone: AD_1 minus the beat, at gain
   0.988 with the two files sample aligned.

If Playwright's own Chromium is not installed, point `PW_CHROMIUM` at a Chromium binary.

## Measuring a new sound

`tools/drums.py` and `tools/kicks.py` split the beat into drums and melody and list
kicks, snares and 808 hits; `tools/asr_ts.py` and `tools/wordsnap.py` give the
voiceover's words with their onsets. Look at the spectrogram before trusting a number:
the melody in this beat fools a plain onset detector.

## Posting

- TikTok only, and never promoted: the beat is borrowed (SSM guardrail 2). A paid
  version needs a sound from TikTok's Commercial Music Library.
- `purify-ad1-edit.mp4` carries AD_1 itself, so it is in sync as it stands.
- `purify-ad1-POST-voice-sfx.mp4` follows the America edit: voice and effects only,
  with the 808 sound added inside TikTok at volume 100. It is only in sync if the sound
  starts at its very beginning (first drum hit 0.14 s in).
- The cover carries the hook in the middle of the frame.
