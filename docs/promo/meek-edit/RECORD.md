# The meek edit: the record

What was made for `BRIEF.md`, how, from what, and how it was checked. Made 2026-11-26, made again the same day at his second word ("ensure the effects, visuals, and design is 1:1"), and given the reference's own sound at his third ("put the original audio"). Earlier versions are in the Vault (below).

## The file

| | |
|---|---|
| File | `.promo/meek-edit/purify-meek.mp4` (out of git), sha256 `7a2b2925220e93a15560612b6f3680985e3e21b5d7b2f477ea2a9ac92246e21e` |
| Length | 18.60 seconds, 558 frames: the reference edit's own length, frame for frame |
| Size | 26.4 MB (27,646,074 bytes) |
| Picture | 1080 by 1080 (the reference's square, at full resolution), H.264 High, yuv420p, 30 frames a second, faststart |
| Sound | the reference's own sound, its first 18.52 seconds, at its own level (-11.7 LUFS against its -11.6; true peak -0.2 dBTP); AAC, 48 kHz stereo, 192 kbps |
| Made by | `render.py` with `look.py` (the picture); the sound taken from the reference file. Stills first, each compared with the reference's same frame and measured; then four renders of the picture on this machine (about 80 seconds each), the first three reviewed and corrected. One version |
| Paid generation | none |

## The shots

Every cut, move and transition is on the reference's own frames, and every shot now wears the reference shot's look.

| Frames | Seconds | The reference | Ours |
|---|---|---|---|
| 0 to 40 | 0.00 to 1.33 | the colour hero: warm, hard contrast, glowing highlights, peach and orange bokeh, a breath of light at 0.93 s | **Christ Pantocrator**, Sinai, 6th century, graded to the reference's opening: the same warmth, contrast, glow, bokeh and breath of light |
| 41 to 138 | 1.37 to 4.60 | eight flashes of manga ink panels, each throwing a white halo, over the colour picture | the Pantocrator in ink over itself, then **Ushakov, the Vysotsky Pantocrator, the Novgorod Holy Face and Vasnetsov** in ink, in the reference's order on its frames, each with the halo |
| 139 to 141 | 4.63 to 4.70 | white flash | white flash |
| 142 to 234 | 4.73 to 7.80 | backlit close-up: a cream haze behind a dark figure, snow-like flakes, light along the sword | **Kramskoi, Christ in the Wilderness**, graded to it and lifted to the same cream haze; the same flakes; a soft pool of light passing over His clasped hands |
| 235 to 328 | 7.83 to 10.93 | a dark forest stream in golden light with an Orton glow, flying in as a bent panel | **Polenov, On the Lake of Gennesaret** in the same dark golden hour and glow, on the same bent panel |
| 329 to 331 | 10.97 to 11.03 | a soft white band wipes left to right | the same |
| 332 to 422 | 11.07 to 14.07 | a manga drawing on white with grey corners; the first card in comic capitals upper right; the card rides the zoom | **Polenov, Dreams (On the Hill)** as a manga drawing, cut so He sits large at lower left as the reference's figure does; **I AM / MEEK AND / LOWLY / IN HEART** in comic capitals upper right, on the reference's zoom path |
| 423 to 432 | 14.10 to 14.40 | diagonal whip | the same |
| 433 to 502 | 14.43 to 16.73 | a small walking figure drawn on white; the second card as its own layer, growing 1.25 times while the picture zooms past it | **Polenov, He Returned in the Power of the Spirit into Galilee** as a manga drawing; **THE KINGDOM / OF GOD / IS WITHIN / YOU.** on the reference's path and growth |
| 503 to 548 | 16.77 to 18.27 | the page falls to a warm near-black; the name in brush capitals, revealed left to right in a white glow | the same; **PURIFY** in brush capitals, the same reveal and glow |
| 549 to 557 | 18.30 to 18.57 | fades out | fades out |

## The look, matched and measured

`look.py` matches each colour shot to the reference shot it stands in for (its tone by quantiles, its cast by mean and spread in Lab, kept in `grade_ref.json`: numbers, not pictures), then finishes it as the reference is finished. The black and white shots are rendered as manga ink: the picture calmed by mean shift, contours drawn by an extended difference of Gaussians, the deepest shadows filled black, the middle tones hatched (paintings) or screened (icons), stray specks removed. Measured on the finished film against the reference, shot by shot (L* is lightness out of 100; b* above 0 is warm):

| Shot | Reference: L* mean, b*, darkest 5% / lightest 5% | Ours |
|---|---|---|
| Opening | 61.2, 8.4, 5.9 / 98.0 | 53.6, 12.8, 5.9 / 94.1 |
| Ink panels | 59.3, 2.4, 0.4 / 100 | 53.8, 5.9, 0.4 / 99.2 |
| Close-up | 56.7, 6.4, 0.4 / 99.6 | 55.3, 8.2, 2.0 / 98.0 |
| Lake | 32.4, 18.6, 6.7 / 91.0 | 36.4, 21.6, 2.0 / 80.4 |
| First card | 88.1, 0.0, 24.7 / 100 | 81.3, 0.0, 3.9 / 100 |
| Second card | 89.7, 0.0, 23.1 / 100 | 91.6, 0.0, 70.6 / 100 |
| End | 4.4, 0.4 | 4.0, 1.0 |

The cards' text was measured too, by its pixels: each card is centred within about 0.02 of the reference's at the start and end of its zoom, and the second ends centred at (0.55, 0.33) against the reference's (0.57, 0.33).

Tried at the stills and left out: Vasnetsov's Christ Almighty as the opening (its night sky went grey and wrong under the reference's bright grade; it stays a panel), Rublev's Baptism of Christ for the lake (flat and worn under the golden hour), and a statistical match for the lake (an olive duotone).

## The pictures

Unchanged from the first version: nine public-domain works, none on the heritage list (`lib/marketing/heritagePictures.ts`), each file's checksum in `art.json`.

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

The colour shots carry the reference's grade and the ink shots are drawn from the pictures; nothing is added to or taken from a work's content, and nothing is mirrored.

## The words

Verbatim King James, as the app gives it. On screen, in the reference's comic capitals and without a reference line under them, as the reference has none: "I am meek and lowly in heart" (Matthew 11:29, inside the verse, so no full stop is added) and "The kingdom of God is within you." (Luke 17:21, the verse's end and its own full stop). The citations go in the caption instead (below). Spoken, unchanged: John 18:33, 18:35, 18:36 and 18:37 at the reference's four moments (`lines.json`).

Caption line, to paste with the post: "My kingdom is not of this world." John 18:36. On screen: Matthew 11:29; Luke 17:21. Art: Christ Pantocrator (Sinai); icons by Simon Ushakov, the Vysotsky Deesis and Novgorod; Viktor Vasnetsov; Ivan Kramskoi; Vasily Polenov. Scripture: KJV.

## The type

| Use | Face | Licence | In place of |
|---|---|---|---|
| The two cards | Comic Relief Bold, narrowed to 93% | OFL 1.1 | the reference's manga lettering (a commercial face) |
| The name | Permanent Marker, spaced | Apache 2.0 | the reference's brush capitals |

Both from their open-licence packages (`fetch.py`, checked by checksum). The house faces (Lora, DM Sans, DM Serif Display) are set aside for this piece at his word; they are what the first version used.

## The sound

At his third word, "put the original audio": the reference's own sound, from its first frame to 18.52 seconds, where its own fade ends; TikTok's outro jingle begins at 18.54 and is left out (the last 0.15 seconds of the file peak at 0.085, the jingle at about 0.6). Taken from the reference file as it is, resampled to 48 kHz, nothing else done to it. It lines up with the picture to the sample (offset 0 at 48 kHz, correlation 0.9991 with the reference's sound), because every cut was placed on the reference's own frames.

It is the reference creator's sound: copyrighted music under four lines of Vagabond dialogue ("You're not just a vagabond, are you?", "[name] the unrivaled", "I hate that title", "A man without a rival is like a katana without a whetstone"). See Open.

The sound made for the first two versions is kept (`sound.py`, the Vault):

| Part | Where | From | Rights |
|---|---|---|---|
| The four lines | 4.78, 7.78, 10.62, 12.64 s | the app's own narration of John 18 (`audio.purifyapp.net/read/john/18.mp3`, the Heart voice) | first party; the text is public domain |
| A held note, D and A | 0 to 16.95 s | synthesised in `sound.py` | first party |
| Hits, ticks, rushes | on their frames | synthesised in `sound.py` | first party |
| Wind | under the opening, the wilderness and the cards | `public/audio/ambience/wind.mp3` (Karlunun) | CC0 |
| Sea | under the lake | `public/audio/ambience/sea.mp3` (earthcalling) | public domain |
| Bell | on the name, 17.07 s | `public/audio/ambience/bell.mp3` | first party |

## The checks

| Check | Result |
|---|---|
| Timing against the reference (`cutlist.py`) | cuts start on frames 41 51 60 69 92 103 111 119 139 329 346 359 366 378 396 408 425 469 506, against the reference's 41 52 60 68 92 102 110 119 139 235 329 345 358 365 370 377 395 424 506: every one within a frame. The lake's panel still arrives on frame 235 (a change of 12.9 there, just under the detector's 14, as the darker grade softened it) |
| The look | the table above |
| Words against what stands behind them (`check_text.py`) | worst 12.95 to 1 (the rule is 4.5); the name on the end card 11.85 to 1 |
| Size | the first card's capitals 32 px tall at their smallest (12 px on a phone 390 wide, as small as the reference's, and rising with the zoom); the second's 41.5 px; the name's 79 px |
| The sound | in sync to the sample with the reference's (offset 0), same loudness (-11.7 against -11.6 LUFS), no TikTok jingle |
| House rules | no light rays (light is soft pools and bokeh discs), no sparkle (the flakes are round), no stripe down an edge, no parchment (every white is neutral), no em dash in any word, nothing from the heritage list. Gold: see Open |
| Made again from the repository | `fetch.py` into an empty folder, then `render.py`: the frames match the delivered film to within its compression (a mean difference of 1 to 3 out of 255) |

## Why it looks as it does

| The choice | Why | What it does for the reader |
|---|---|---|
| The reference's look shot by shot, measured, not guessed | His word: effects, visuals and design one to one | The edit people stop for, carrying Christ |
| The grade matched by numbers, the finishing copied (glow, bokeh, haze, golden hour) | A grade judged by eye drifts; a grade held to the reference's own numbers does not | Each shot lands with the same weight and light as its original |
| Manga ink drawn from icons and paintings | The reference's black and white is ink; icons have their own ink tradition, the painter's pattern drawing | The panels read as originals beneath the colour, as the reference's do |
| The icons in the flashes, the Pantocrator first | The Church's own image of Christ, the app's own icon | An Orthodox viewer sees the icons they pray before |
| Comic capitals, the reference's places, sizes and zoom paths, no reference line on screen | The cards are the design; their text was measured on the reference | The words arrive exactly as the original's did; the citation is in the caption |
| PURIFY in brush capitals with the glow and reveal | The reference signs off with its creator's name in this treatment | The last frame is the name |
| The reference's own sound | His word, on hearing the John 18 version | The edit is the trend as people know it, and its cuts land on the beats and lines they were made for |

## Open

- **Gold.** The lake carries the reference's golden-hour light (23% of its pixels in the band the house measures as gold, against the reference's 29%). The house rule keeps gold, yellow and amber out of Purify's own colours; the icons' gold leaf has always been shown. This is the one grade in the edit that adds yellow light. At his word the lake goes warm-neutral instead.
- **The house type** is set aside for this piece (above), and the citations are in the caption, not on screen.
- **Russia's museum law.** Seven of the nine works are held in Russia. Russia's law on the Museum Fund (54-FZ, article 36, as Garant reads it) asks a museum's permission for commercial copies of its objects' images; how far that reaches a public-domain work is disputed. The house's heritage note assessed only Greece and Italy. Not assessed by a lawyer here either.
- **Two holders unconfirmed**: which of Ushakov's versions this is, and whether the Vasnetsov is the dome or its study.
- **The sound is someone else's.** It is copyrighted music with Vagabond dialogue, now baked into the file. Uploaded as it is, TikTok, Instagram and YouTube can match it and mute the video, block it in places or claim it. The way that stays inside TikTok's licence is to post the picture and choose the reference's sound in TikTok itself ("use this sound" on the original post); the cuts line up because the timing is frame for frame. The dialogue is a samurai's lines, now over Christ.

## The Vault

The second version with its own sound, 2026-11-26: this picture with four lines of John 18 in the app's narration over a first-party bed (`sound.py`). Replaced the same day at his word, "put the original audio". Kept: its film at `.promo/meek-edit/purify-meek-v2-narration.mp4` (out of git, sha256 `99254c17a7bcda6369ed76135fc95a6faf0996cc6ddcf7c81ca24e0ae9f83492`) and `sound.py`, `lines.json` here.

The first version, 2026-11-26: the reference's cut in the house's look (Lora cards with their references, the house faces, a neutral grade, the name in DM Serif Display). Superseded the same day at his word, "ensure the effects, visuals, and design is 1:1". Kept, not deleted: its film at `.promo/meek-edit/purify-meek-v1.mp4` (out of git, sha256 `d54646ddfa0354bac84fb7fcadf6f298eda7fe181fc5aafd519fea5c816c1d75`) and its scripts at commit `c6d635e2`.

## Making it again

```
python3 -m venv .promo/meek-edit/venv && .promo/meek-edit/venv/bin/pip install -r docs/promo/meek-edit/requirements.txt
.promo/meek-edit/venv/bin/python docs/promo/meek-edit/fetch.py
.promo/meek-edit/venv/bin/python docs/promo/meek-edit/render.py --video .promo/meek-edit/picture.mp4
# the sound: the reference file (his, kept out of git) to 18.52 s, before TikTok's jingle
ffmpeg -i <reference.mp4> -vn -af "atrim=0:18.52,afade=t=out:st=18.50:d=0.02,apad=whole_dur=18.6,aresample=48000:resampler=soxr" -c:a pcm_s24le .promo/meek-edit/sound.wav
ffmpeg -i .promo/meek-edit/picture.mp4 -i .promo/meek-edit/sound.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -ar 48000 -t 18.6 -movflags +faststart .promo/meek-edit/purify-meek.mp4
```

`render.py --stills 0,92,200 --out <dir>` takes stills (`--rebuild` prepares the pictures again); `check_text.py` and `cutlist.py <reference> <ours>` are the checks above. Fetching needs Node (`npm pack`) for the faces.
