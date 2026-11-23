# The promo edits: the hand-over

Kept by the chat he started for this on 2026-11-23 at 20:53 UTC (session_01VuYTwaR8ZjSrVP4wNc6eeM). The job, in his words below: a prompt for a new promo, from his reference edits, the sound he chooses and a storyboard, talked through with him video by video first.

**Status, 2026-11-23 about 21:15 UTC: six of his seven references are read and measured, and put to him one by one. Nothing is made: no prompt, no storyboard, no film, no credits. It waits for his direction on each video.**

## His words in this chat (verbatim, UTC, 2026-11-23)

- 20:53: "time to make new promo for purify. I want you to make a prompt for my new promo based off these edit styles and the audio I want and the storyboard for the edit"

  Nothing came with it: the chat's upload folder was empty, and Higgsfield held no video, no audio and one picture from August. He was asked to send the three things again.

- 20:58, with seven TikTok links: "a bunch of references and we can structure each edit with my direction. we can combine styles, talk about which audio, and give story board idea on how the edit will be structured. let's go through each video"

  At that word: the six that could be fetched were read (below) and put to him in the chat, each with what it would mean for Purify and where it meets a rule of his. He has given no direction yet.

- 21:20, a second job for this chat: "Okay, so 2 actual things that I want finished with the rest of our limit. The first one is to make promo, obviously, and the other one is to incorporate our new goals list." He described milestones of his own for the admin panel, counted from subscriptions, and said the panel "feels like a terminal". He did not answer the two questions on the references.

  At that word: what the panel has today was read, and the plan was written for his yes: `docs/plans/goals-milestones.md` (his words on it are there; his private figures are left out, since this repository is public). Nothing is built. Asked of him: whether a mark is counted after the app's own costs, and his yes to a fresh chat building it. The promo still waits on his direction.

- About 21:35: "are these even good goals?"

  At that word: answered in the chat (right as a destination, not yet goals to steer by) with four changes proposed, noted in the plan under "His question". Asked of him: a date for the first mark, and two numbers from his panel (who pays today, and readers active in a month).

## How the references were read

Each was fetched with yt-dlp into the chat's scratchpad (out of git, lost with the container; the addresses below fetch them again). `promo-edits/analyze.py` counts the cuts from the change between frames, measures the sound from its onsets and makes a strip of 80 frames; `promo-edits/strips.py` makes the closer strips of the transitions and the words. Every film was looked at on its strip.

- **Nothing was heard.** The sound is measured, not listened to. All six name their sound "original sound", the maker's own upload, so TikTok names no song.
- **The cut counts are a script's.** A change that smears can be missed, and a heavy effect can be counted as a cut. The times are good to about a frame.
- The views are as TikTok gave them on 2026-11-23.

| | Maker, subject | Length, shape | Cuts | Sound |
|---|---|---|---|---|
| 1 | @praisegrimm, an anime character ("t1 show") | 20.0 s, square, 60 fps | 38, about two a second | about 105 beats a minute, loud all through, the bass comes in at 11.1 s |
| 2 | @jer.vfx, fighters at prayer ("#edit #god #ufc") | 16.5 s, wide, 24 fps | 17, one every 0.90 s | a slow sway, about 66 beats a minute |
| 3 | @gerginterx, paintings of Christ | 20.2 s, wide, 30 fps | 8 in all | quiet, a pulse of about 130, fading from 13 s |
| 4 | @jessie.prodz, a man and a drawn character side by side | 16.7 s, wide, 30 fps | 27, twelve bright frames | about 128, the drop at 11.35 s |
| 5 | @0024nacho, "Glowmix2", a game filmed as cinema | 64.4 s, very wide, 20 fps | 30, shots up to 12.6 s | 15 s of single hits, a breath of silence, the track comes in at 16.45 s |
| 6 | @kr1s.vfx, a tribute to an actor from press photos | 18.5 s, 6 by 5, 20 fps | 21, on a 0.4 s grid | about 75, a cut on each beat or half beat, a 5 s bass tail |
| 7 | @daarol799 | not read | | |

Views: 171,900; 200,900; 401,600; 345,700; 3,827; 745,400.

Addresses: `https://www.tiktok.com/@praisegrimm/video/7709973136590015757`, `@jer.vfx/video/7705664879780220182`, `@gerginterx/video/7705913263405485343`, `@jessie.prodz/video/7698893287511313694`, `@0024nacho/video/7697730411190848782`, `@kr1s.vfx/video/7697350996053331222`, `@daarol799/video/7709728336615902482`.

**The seventh could not be fetched:** TikTok answers "This post may not be comfortable for some audiences. Log in for access." It needs the file from him.

## Each one, as it runs

### 1. The question, then the run of faces (@praisegrimm)

- 0.00 to 2.10: one held picture in a brown tone, with one small line of words on it: a question ("who do you solo?").
- 2.10 to 9.0: the answer is a run of about 25 faces in 7 seconds, each a black ink drawing on white. A face holds sharp for about a fifth of a second and then smears into the next over two or three frames. No bright frame between them.
- 9.0 to 11.1: colour comes back and the film slows on its one hero, in close shots.
- 11.1 to the end: the bass comes in and the film turns dark and blue, with longer shots. It ends on one white frame, then black.
- 13 of the 38 cuts fall on a hit of the sound.

### 2. Black and white, small words, a verse to end (@jer.vfx)

- Every frame is black and white. Real footage in slow motion: hands on a cross, a man kneeling in a church, a rosary, fighters praying together, the sign of the cross.
- At the start two subjects stand cut out on pure black (a hand, a fighter) with very small white words set beside them like a dictionary's entry: "1. CHRISTIANITY. is a religion based on the teachings of Jesus Christ focused on faith love forgiveness and devotion to God." A second entry ends "and the traditions of the Catholic Church."
- "IN THE NAME OF THE FATHER AND OF THE SON" on one side, "AND OF THE HOLY SPIRIT AMEN." on the other, and the letters A M E N spread across the frame.
- From 3.79 to 11.92 a cut every 0.90 s, as even as a clock. One blur into the next shot (3.7), one bright frame (8.33). Nothing shakes.
- The end, held two seconds on black: the maker's signature, "ROMANS 15:13", the verse in small slanted type in the King James wording, and a small cross.

### 3. The paintings that move, and one unbroken opening (@gerginterx)

- 0 to 1.8: black, and a slit opens on Christ's eyes. Then His face, close.
- 2.3 to 3.3, with no cut: a tear falls from His eye, drops through black into water, the water rings, and the rings open into the three crosses at sunset.
- Then, each a painting whose figure is cut out and moves apart from its ground while the camera pushes in slowly: the Cross against the sun, the risen Christ in light, His face with the crown of thorns, the Ascension, Christ and the tempter, the Archangel Michael, Christ bound.
- Only 8 cuts in 20 seconds; the rest is blur, a turn of the camera or one shape becoming the next. One cut in eight falls on a hit.
- Warm gold on near black, a gold glow round His head, a burst of light behind the risen Christ.
- The end: a glowing emblem of the Sacred Heart on black, then the maker's name in blackletter.

### 4. Two figures matched pose for pose (@jessie.prodz)

- A real man and a drawn character, cut so that one becomes the other in the same place and pose (3.6 to 4.1: the man walking, three frames of shifted colour, the drawn figure).
- Hard black and white with no greys in many shots, red washes, grain, black between the parts (2.1, 6.1, 7.9, 13.2).
- At the drop (11.35) one white frame, then three frames of the picture as a pale negative.
- The most driven by the beat of the six: 16 of its 27 cuts fall on a hit, with 12 bright frames.
- The maker's line runs along the foot of every frame.

### 5. A grade and a pace, not an edit (@0024nacho)

- A game's scenes filmed as cinema: 85 in 100 frames are dark, with fog, a soft glow on every light, a very wide frame and long slow shots.
- Small plain cards on black between the parts: "NACHO PRESENTS", "PICTURE STILLNESS", "RIGHT WHERE YOU NEED TO BE", and two more not read.
- The first four seconds are fast and unlike the rest: a mirrored frame and a star-shaped flare at 1.6.
- Its sound has the one structure worth noting: single hits for 15 seconds, about a second and a half of silence, and then the track comes in.

### 6. Photographs brought to life (@kr1s.vfx)

- Press photographs of one man. Each still is pushed in on, washed in one colour (deep red, blue, brown), and some drop to black and white inside a white border like a print (2.6, 13.0).
- 0 to 0.6: large block letters flick over the first photograph one at a time, with bands of the picture slipping sideways.
- Between photographs: a band of black wiping across (2.5), a liquid smear with coloured edges and one frame of an etched negative inside it (11.35 to 11.45), a blur (8.1).
- 21 cuts, every one on a 0.4 s grid.
- The last five seconds are near black with thin scratch lines and the maker's name, over the tail of the bass.
- The photographs carry a picture agency's watermark.

## Where the references meet his standing words

His to decide; named to him in the chat.

- **Effects on the beat.** His word on the release film, 2026-11-21: "I want you to not time the glow to the beat. I want it to be purely clean transitions." And on the Forever edit, 2026-11-22: "the transitions are super vibe are very vibe coded and the effect that matches the beat is too vibe coded also. I want clean transitions". Reference 4 is the opposite, and 1 and 6 use bright frames too. Reference 2 agrees with it.
- **Glow and rays.** "It's just the glow. The glow looks vibe coded." and the house rule of no rays. Reference 3 glows all through and has a burst behind the risen Christ; 5 is named for its glow and has a star flare.
- **Nothing in an icon is redrawn** (the Christ edit's rule: a figure may be cut out and moved whole). Reference 3 draws a tear on the painted face.
- **The pictures.** Ours are public domain and off the heritage list. Reference 3's are Western devotional paintings and the Sacred Heart, which are not the Orthodox Church's pictures; 6's are press photographs with the agency's mark on them.
- **The sound.** None of the six is cleared. As before: the master is silent and the sound is added inside the app it is posted in.

## To read them again

```
python3 -m venv venv && venv/bin/pip install yt-dlp
mkdir -p refs/1 && (cd refs/1 && ../../venv/bin/yt-dlp --write-info-json -o "v.%(ext)s" <address>)   # one folder each, 1 to 6
python3 -I docs/handoffs/promo-edits/analyze.py all refs out      # the numbers, and out/<n>-sheet.jpg
python3 -I docs/handoffs/promo-edits/strips.py refs out           # the closer strips
```

ffmpeg, numpy and Pillow are needed. The films are other people's work: they stay out of git.

## Cost

By get_session at 21:24 UTC on 2026-11-23: $7.03 at the last finished turn, with 265,000 tokens of context (the worker restarted once between turns). That is past the 200,000 line, so this chat talks and plans and builds nothing: the film and the milestones each go to a fresh chat from their own file. Earlier, at about 21:10: $2.77 and 169,000 tokens, most of it the six films' strips. The weekly limit reads allowed_warning and resets 2026-11-27 08:00 UTC. The film itself belongs to a fresh chat started from the prompt, not to this one.

## Open

- His direction on each of the six, and which of them the new edit, or edits, are built from.
- The seventh reference, as a file.
- Which sound. None is named, so he names it or sends it; it is then measured as "Forever" was.
- Whether "nothing follows the beat" and "no glow" hold for these edits.
- The storyboard, and then the prompt. Neither is begun.
