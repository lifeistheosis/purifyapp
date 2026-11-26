# The meek edit: the record

What was made for `BRIEF.md`, how, from what, and how it was checked. Made 2026-11-26.

## The file

| | |
|---|---|
| File | `.promo/meek-edit/purify-meek.mp4` (out of git), sha256 `d54646ddfa0354bac84fb7fcadf6f298eda7fe181fc5aafd519fea5c816c1d75` |
| Length | 18.60 seconds, 558 frames: the reference edit's own length, frame for frame |
| Size | 27.4 MB (28,768,778 bytes) |
| Picture | 1080 by 1080 (the reference's square, at full resolution), H.264 High, yuv420p, 30 frames a second, faststart |
| Sound | AAC, 48 kHz stereo, 192 kbps; -14.0 LUFS integrated, true peak -1.4 dBTP |
| Made by | `render.py` (the picture) and `sound.py` (the sound). Stills first, checked shot by shot against the reference; then three renders of the picture on this machine (about 75 seconds each), the first two reviewed frame by frame and corrected. One version |
| Paid generation | none |

## The shots

Every cut, move and transition is on the reference's own frames (measured in it frame by frame: the cut list, a contact sheet at 10 frames a second, and its beat grid at 103.4 beats a minute).

| Frames | Seconds | The reference | Ours |
|---|---|---|---|
| 0 to 40 | 0.00 to 1.33 | the colour hero portrait, slow push-in, soft glow | **Christ Pantocrator**, Sinai, 6th century: the same push-in and glow, soft white pools of light drifting (never amber) |
| 41 to 138 | 1.37 to 4.60 | eight flashes of ink panels over the colour picture, on the beat: the hero's own panel, then four others, in the order 1 2 3 4 5 4 3 1 | the Pantocrator in black and white, aligned over itself, then **Ushakov, the Vysotsky Pantocrator, the Novgorod Holy Face and Vasnetsov**, in the same order on the same frames, in the same feathered panel |
| 139 to 141 | 4.63 to 4.70 | white flash | white flash |
| 142 to 234 | 4.73 to 7.80 | colour close-up, backlit, falling dust, a glint travelling along the sword | **Kramskoi, Christ in the Wilderness**, close on His face and clasped hands, dust in the air, a soft pool of dawn light travelling along the horizon |
| 235 to 328 | 7.83 to 10.93 | a figure in a sunlit landscape with water, flying in as a bent panel | **Polenov, On the Lake of Gennesaret**: the same panel, from 55% with a bend that relaxes, landing by frame 288 |
| 329 to 331 | 10.97 to 11.03 | a soft white band wipes left to right | the same |
| 332 to 422 | 11.07 to 14.07 | ink figure from behind, seated; the first card blurs in; zoom steps on seven beats | **Polenov, Dreams (On the Hill)** in black and white; **"I am meek / and lowly / in heart", Matthew 11:29**; the same blur-in and the same seven steps |
| 423 to 432 | 14.10 to 14.40 | diagonal whip, both cards blurred in motion | the same |
| 433 to 502 | 14.43 to 16.73 | a small walking figure on white; the second card; one zoom step | **Polenov, He Returned in the Power of the Spirit into Galilee** in black and white on white; **"The kingdom / of God is / within you", Luke 17:21**; the same step at frame 468 |
| 503 to 548 | 16.77 to 18.27 | the ground falls to black; the creator's name typed on in a white glow | the same fall, to the app's dark ground; **Purify** typed on in the app's glowing white |
| 549 to 557 | 18.30 to 18.57 | fades out | fades out |

The cards and the figure are mirrored from the reference where a painting requires it: in Dreams Christ sits on the right, so the first card stands in the open sky on the left.

## The pictures

All public domain: every work is at least a century old (the latest painter died in 1927), and each scan is a faithful photograph of a flat work. None is on the heritage list (`lib/marketing/heritagePictures.ts`): nothing is held in Greece or Italy. Each file's checksum is in `art.json`, and `fetch.py` refuses a file that differs.

| Shot | Work | Painter, date | Held |
|---|---|---|---|
| S1, panel 1 | Christ Pantocrator | Constantinople, 6th century | St Catherine's Monastery, Sinai (the app's own icon of Christ, already in the store pictures) |
| panel 2 | The Saviour Not Made by Hands | Simon Ushakov, dated 1673 by the source | not named by the source; Ushakov's versions are in the Tretyakov Gallery and the Russian Museum |
| panel 3 | Christ Pantocrator, from the Vysotsky Deesis | Constantinople, about 1387 to 1395 | Tretyakov Gallery, Moscow |
| panel 4 | The Holy Face | Novgorod, 12th century | Tretyakov Gallery, Moscow |
| panel 5 | Christ Almighty | Viktor Vasnetsov, 1885 to 1896 | not named by the source; the main dome of St Volodymyr's Cathedral, Kyiv, or its study |
| S3 | Christ in the Wilderness | Ivan Kramskoi, 1872 | Tretyakov Gallery, Moscow |
| S4 | On the Lake of Gennesaret | Vasily Polenov, 1888 | Tretyakov Gallery, Moscow |
| S5 | Dreams (On the Hill) | Vasily Polenov, 1894 | Radishchev Art Museum, Saratov (per two picture agencies) |
| S6 | He Returned in the Power of the Spirit into Galilee | Vasily Polenov, not later than 1909 | State Russian Museum, Zh-9157 (the museum's own photograph) |

Two were tried and left out at the stills: Rublev's Zvenigorod Saviour (its loss of paint turned to noise in black and white) and the Saviour of the Golden Hair (its darkened face read as a skull in black and white).

## The words

Verbatim King James, as the app gives it (`public/audio/read/<book>/<chapter>.json`), and never a sentence written for it.

- **On screen.** "I am meek and lowly in heart" (Matthew 11:29, inside the verse) and "The kingdom of God is within you" (Luke 17:21, the verse's end), each with its reference under it. At the end: Purify.
- **Spoken**, at the moments the reference's four lines are spoken, in John 18's own order: "Art thou the King of the Jews?" (18:33, at 4.78 s), "What hast thou done?" (18:35, at 7.78), "My kingdom is not of this world" (18:36, at 10.62), "Every one that is of the truth heareth my voice." (18:37, at 12.64). The cut points, to the millisecond and on silence, are `lines.json`.

## The sound

| Part | Where | From | Rights |
|---|---|---|---|
| The four lines | 4.78, 7.78, 10.62, 12.64 s | the app's own narration of John 18 (`audio.purifyapp.net/read/john/18.mp3`, the Heart voice readers hear in the app) | first party; the text is public domain |
| A held note, D and A, sung in colour | 0 to 16.95 s | synthesised in `sound.py` | first party |
| Hits on the five big cuts, ticks on the seven panel flashes, rushes into the flash, the panel and the two whips | on their frames | synthesised in `sound.py` | first party |
| Wind | under the opening, the wilderness and the cards | `public/audio/ambience/wind.mp3` (Karlunun) | CC0 |
| Sea | under the lake | `public/audio/ambience/sea.mp3` (earthcalling) | public domain |
| Bell | on the name, 17.07 s | `public/audio/ambience/bell.mp3` | first party |

No chant: the app's chant recordings are carried unlicensed by his knowing decision (`docs/licensing/audio-provenance.md`), and that decision covers the app, not an advert.

## The checks

| Check | Result |
|---|---|
| Timing against the reference (`cutlist.py`, the same detector on both files) | cuts start on frames 41 51 60 69 92 103 111 119 139 235 329 346 359 366 371 426 469 506, against the reference's 41 52 60 68 92 102 110 119 139 235 329 345 358 365 370 377 395 424 506: every one within a frame or two (the reference's steps at 377 and 395 are gentler in ours, under the detector's threshold) |
| The lines heard in the mix (Whisper, each line's window) | all four read back word for word |
| Words against what stands behind them (`check_text.py`, every sixth frame with a card) | worst 9.29 to 1 (the rule is 4.5); the name on the end card 15.7 to 1 |
| Size on a phone (a square video 390 wide) | the cards' lines about 19 px and up, the references 12 px rising to 20 px as the cards zoom |
| Loudness | -14.0 LUFS, -1.4 dBTP |
| The house's rules | light only as soft pools; no rays, no sparkle (the dust is round), no stripe down an edge, no parchment (every white is neutral), no added gold or amber, no em dash in any word, nothing from the heritage list |
| Made again from the repository | `fetch.py` then the two scripts: the sound is bit for bit the delivered sound; the frames match the delivered picture to within its compression |

## Why it looks as it does

| The choice | Why | What it does for the reader |
|---|---|---|
| The reference's structure frame for frame, in its square | He asked for one to one; its rhythm is what made it travel | The format people already stop for, carrying Christ instead of a samurai |
| Icons for the portrait and the flashes | The Church's own image of Christ; the Pantocrator is the app's own | An Orthodox viewer sees the icons they pray before, not a stranger's picture of Jesus |
| The hero in colour, then the same icon in black and white over itself | It is the reference's best device: the coloured picture, then the original beneath it | The icon arrives twice, the second time stripped to its lines |
| Russian realist painters for the cinematic shots (Kramskoi, Polenov) | The reference's colour shots are painted, cinematic, a figure alone in a landscape; these are, and they are long loved in Russia | Christ alone in the desert and by the lake, the edit's mood without an invented picture |
| Christ's words from John 18 where the dialogue was | The reference's lines are a man asked who he is and refusing the title; Pilate asks Christ the same and He answers that His kingdom is not of this world | The same arc in Scripture's own words, in the voice readers already hear in the app; a reading, never an actor playing Christ |
| Meek and lowly, the kingdom within: the two cards | They answer the reference's two cards ("All truly strong people are kind", "Do you see how infinite you are?") with His own words | The strongest is the gentlest; the infinite is within you |
| Lora Medium in sentence case, the reference under each card, the app's ink on white | The app sets a verse this way; citing is the house's rule | Reads as Purify, and every word can be checked |
| Purify typed on in the app's glowing white, on its dark ground, with a bell | The reference signs off with its creator's name; this is the house's dark ground and its one accent | The last frame is the name, and the bell is the app's own |
| No light rays, no gold added, no parchment | His standing rules | Nothing on screen reads as made by a machine |

## Open

- **Russia's museum law.** Seven of the nine works are held in Russia. Russia's law on the Museum Fund (54-FZ, article 36, as Garant reads it) asks a museum's permission for commercial copies of its objects' images, much as Greece and Italy's laws do; how far that reaches a public-domain work is disputed. The house's heritage note assessed only Greece and Italy, and this was not assessed by a lawyer either. The app and its store pictures already show Tretyakov icons on the same footing.
- **Two holders unconfirmed**: which of Ushakov's versions this is, and whether the Vasnetsov is the dome or its study.
- **Post it with its own sound.** Never with the reference's: that is copyrighted music with Vagabond dialogue.

## Making it again

```
python3 -m venv .promo/meek-edit/venv && .promo/meek-edit/venv/bin/pip install -r docs/promo/meek-edit/requirements.txt
.promo/meek-edit/venv/bin/python docs/promo/meek-edit/fetch.py
.promo/meek-edit/venv/bin/python docs/promo/meek-edit/render.py --video .promo/meek-edit/picture.mp4
.promo/meek-edit/venv/bin/python docs/promo/meek-edit/sound.py .promo/meek-edit/sound.wav
ffmpeg -i .promo/meek-edit/picture.mp4 -i .promo/meek-edit/sound.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart .promo/meek-edit/purify-meek.mp4
```

`render.py --stills 0,92,200 --out <dir>` takes stills; `check_text.py` and `cutlist.py <reference> <ours>` are the checks above. Fetching needs Node (`npm pack`) for the faces.
