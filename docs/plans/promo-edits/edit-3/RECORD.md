# Promo edit 3, the Cradle: the record

Brief: `docs/plans/promo-edits/edit-3-the-cradle.md`. Made in session_01VuYTwcTkdWjfVG9Mi39XAx. The sound, the pictures and the films are out of git, in `.promo/edit-3/`.

## His words (2026-11-25, verbatim, in order)

- "I want you to use this audio and make a prompt with extreme detail on the style and how the edit will be structured"
- "also the beat drop is around 0:18"
- "no licence. this is going on tiktok"
- "just start editing" (asked before it whether the song's words suit icons of the Mother of God; he answered by starting the edit)
- "I said. It doesn't have to be public domain." (while the pictures were being searched for)
- "again it could be anything Eastern Orthodox related or Jesus related (it could be western art too! just nothing heretical) the video has to be nice"

## The three full-style versions (his words on the fourth cut: "you are just doing autonomous clip switches. I want every beat. and I want you to copy one of the references full style", then, asked which reference: "do all 3. the point here is to showcase your editing capabilities to go all out")

His rule is in CLAUDE.md ("Every beat carries a cut"). What he named, and what changed:

- **On the beat, not between.** The fourth cut cut on every half beat, so half its cuts fell between the drums and read as a slideshow on a timer. Each version now cuts on each of the song's 94 beats and nowhere else, and each cut is written by hand, with a note saying what it shows (`storm.py`, `whisper.py`, `musashi.py`; the shared engine is `core.py`).
- **The groove, measured.** The song's loudness after each beat shows its drum pattern: in every eight beats the kick falls on the first, the fourth and the sixth, and the eighth is a gap where the music drops out (`core.py`: KICKS, GAPS). A kick gets the largest change (a strike, a wider shot, a larger panel), a beat between kicks a smaller one, a gap a quiet one (darkness, a crush, the words alone). Each new scene starts on the first beat of an eight. That is how the cuts follow the music rather than a clock.
- **One reference to a film, in full.** Version 1 copies the storm, version 2 the whisper, version 3 Musashi, each in its own frame (widescreen, 4:3, square, as each reference stands on a phone). The references' devices his rules forbid are left out and named below.

### Version 1, the storm (`the-cradle-v1-storm.mp4`)

Black and white in the storm's widescreen band, film grain. Every cut hides in a strike of lightning or in the dark; each shot is closer than the last; no words, and it ends on the picture with the light still rising, as the storm does. The story, in that light: the shepherds' field the night the angel came (Rembrandt's etching, beats 0 to 13; the angel framed below the glory, so none of its beams show); the music drops out (beat 14, darkness); the road by lantern (Rembrandt's Flight into Egypt, beats 15 to 22, the bass gone; it returns as a flicker); the stable in the dark (Rembrandt's night piece), then El Greco's faces in strikes that grow dimmer into the black pause; on the drop, two frames of white and the whole of El Greco's night, the Child its light, then closer to Him on every kick; the song's stop on the Cross (Zurbarán), seen only in the strikes, His hands, His head, His feet, the title; in the silence His face, the first time; then His face (Rembrandt's Head of Christ) and the Child's (Murillo's, in black and white) cut one against the other with the eyes held on one line, in the dark between strikes, and from beat 79 in a soft light rising from above and behind, closer on every beat until His eye and the light take the frame. The Child in the cradle is the Christ. Left out of the storm: its lightning bolts (they would be drawn onto the paintings).

### Version 2, the whisper (`the-cradle-v2-whisper.mp4`)

Warm old-master paintings in the whisper's 4:3, each painting cut like coverage of a scene, beat by beat: a close face, an insert of hands, a two-shot, wider on the kicks, the whole painting as the master at the end of its eight; nothing held still (each shot drifts at a steady speed, a different way from the last); it opens in the middle of a fast pan; between paintings the blacks are crushed while the lights stay, a hard cut on the beat, and the next painting develops up out of the dark. The paintings: the young Virgin praying (Zurbarán); the Mother and Child, her face and hands only (Murillo); the Nativity at night (El Greco), in the break; Peter's denial by the fire (Caravaggio), into the pause; on the drop, with no develop, the Mother's eyes straight into the lens (Ribera), then the Holy Family widening out, Catherine kissing His hand, Anne, Joseph, the master; the Cross into the song's stop (Zurbarán's photograph, kept near neutral: no sepia); Emmaus after the stop (Velázquez); Our Lady of Vladimir out of the silence, the Child's cheek on hers, widening to the whole silver cover; the Murillo again, and now the Child looks into the lens; El Greco's angels with their banner (Laudamus te, benedicimus te) and Zurbarán's angels' faces, black between them once a beat; the card, Purify's cross and its name typed. Left out of the whisper: its push that eases in to a stop (every move here runs at a steady speed); its strobe of fifteen black frames in a second (here once a beat, about 1.7 a second, under the three a second that light-sensitive viewers can take); CapCut's card.

### Version 3, Musashi (`the-cradle-v3-musashi.mp4`)

Reference 3's square, its two worlds and its order. Colour: Murillo's Mother and Child, then over the Mother's face the Mother as Schongauer, Dürer and Raimondi engraved her, one drawing on each beat, cut out by hand at the edges, the painted Child kept in front of them (cut out of the painting with GrabCut) as reference 3 keeps its hand and sword in front; the music's gap: the painting alone. Colour again: in to Ribera's Mother, a beat closer each time, to her eyes on us; out from Zurbarán's young Virgin's eyes, a beat wider each time, to her whole room; the white comes in from the left. On the drop, ink on white: "FOR A CHILD IS BORN TO US, AND A SON IS GIVEN TO US" (Isaiah 9:6, Brenton), a line on each beat, beside the Mother and Child as the engravers drew them, a drawing on each beat after; the song's stop leaves the words alone. A whip, at a steady speed, into the question: "BUT WHOM SAY YE THAT I AM?" (Matthew 16:15), a word on each beat, beside Schongauer's standing Christ, then His face in many drawings (Traut, Huret, Agostino Carracci, Beham, Stradanus, Schongauer), closer on the second pass, the words alone on each gap. A white flash into colour: His face and the Child's in paint (Rembrandt, Murillo, Velázquez, Ribera, Zurbarán, El Greco), each with its eyes where the last one's were. A whip into the question alone, closer on each beat, the fade; the cross and the name typed, no glow. Left out of Musashi: its push that pulses on the beat and settles, its page that bends and flattens (a straight cut stands in its place), the glow on its sign-off. Its lettering is a comic hand; here it is DM Sans Bold in capitals.

### The hi-hats (his word on the three versions: "match the hi hats too when frame switches")

`sound_hats.py` finds the song's hats above 7 kHz and writes `hats.json`: 102 hats fall between beats (a hat within 70 ms of a beat is that beat's own cut), 54 of them in trap rolls about 50 ms apart. Every hat is now a cut too, in each film's own way: in the storm, a cut closer into the same picture, towards its light; in the whisper, an insert of the same painting, to one side and then the other; in Musashi, the device itself, the next drawing swapped in place, the next face, or a step further along the beat's own move in or out. On a roll the cuts stutter between framings of like brightness, so a roll reads as a stutter and never as a flashing light.

### Measured on the films

Each film was measured from the finished MP4, not from the timeline: every frame's change against the last, the largest change within two frames of each beat, and the film's own sound against the song it was made from. The films are 1080 by 1920, 60 frames a second, 3,400 frames (56.667 s), H.264, the sound AAC from frame 0.

- **Version 1, the storm:** 94 of 94 beats carry a cut; 88 on the beat's own frame, 6 where the lightning's first flicker starts two frames ahead of the cut it hides. The other large changes are the lightning's second flash three to five frames after a strike, and the two flickers where the bass comes in between beats (2.28 and 11.74 s). Two flickers that fell between beats in the quiet opening were taken out after the first render.
- **Version 2, the whisper:** 93 of 94 beats carry a cut, all 93 on the beat's own frame. The first render measured 84: where one painting crushed fully to black and the next developed out of black, black met black and the beat showed nothing. Reference 2's own crush keeps the lights, so the crush now stops short of black and the next painting comes up from its brightest parts; the beat after the song's stop now hits the painting harder. Its other large changes are the opening pan, the crushes and develops inside shots, and the black frames that come just before each angel's beat.
- **Version 3, Musashi:** 93 of 94 beats carry a cut; 91 on the beat's own frame, 2 two frames after (the whips, centred on their beats). The first render measured 85: the beats where only a line or a word arrived changed too little of the frame, so each of those beats now also swaps the drawing beside the words. Its other large changes are the white coming in before the drop, the two whips and the white flash into the painted faces.
- **The last beat (55.107 s)** carries the cross appearing alone on black in versions 2 and 3, and His eye in the light in version 1; a small mark on black changes little of the frame, and is plain to the eye.
- **The sound** sits 0 ms from the song in all three.

### Sent to him, and the Vault

Sent: version 1 at a lighter bitrate (CRF 20, 95 MB; the master's film grain makes it 222 MB), versions 2 and 3 as rendered (88 and 99 MB). The masters are `.promo/edit-3/out/the-cradle-v1-storm.mp4`, `-v2-whisper.mp4` and `-v3-musashi.mp4`; the copies sent are in `.promo/edit-3/out/send/`. The fourth cut and its renderer (`edit.py`, commit bb13fe6e) stay as they are: nothing made is deleted.

### Cost

get_session: $39.70 for the whole session at 10:15 UTC (it began as the store-build chat at 03:18 UTC), context about 740,000 tokens. No credits were spent: no generated picture or film; every picture is a museum's own photograph.

## The second cut (his word on the first: "you barely even edited it. no effects. and not a single edit style used from our references")

He was right: the first cut was slow pushes and plain cuts, held back by his older rule against effects on the beat. The second cut carries each reference's own devices, one reference to a chapter, on the same pictures:

- **The night (reference 1, the storm):** black and white in a widescreen band (1080 by 760, as the storm's 1080 by 740), film grain and a vignette; every cut hidden inside a strike of light that blows out the lights and keeps the shadows (the glory that shone round the shepherds, Luke 2:9), rising over two frames to its peak on the cut's frame; flickers inside shots at 8.12, 9.08 and 15.30 s; cuts into darkness at the breaks; the film opens on a fast blurred push that lands in half a second.
- **The drop (18.53 s):** out of black, two frames of white, and the band opens to the full screen on her eye in colour.
- **The Mother (reference 2, the whisper):** every cut enters on a fast blurred zoom or pan (from the right, from above, from the left) that settles in about a third of a second; coverage of one picture, wider each cut; crush and a black-frame strobe on both of the song's stops.
- **The light (reference 3, Musashi):** the words rise out of white; bold capitals that pulse on the beat (a larger push on the bar); a page-bend into the faces, which then swap in place on every half beat, the eight twice over, each with a small push; a white flash into the second verse; a motion-blur whip into the question; a fade to black; the cross, and the name typed under it, with no glow.

## The fourth cut (his words on the third: "that certain "bounce" (that very first bounce in that repeats) techniche is very vibe coded. and the pacing is very slow and the text bouncing in has the same bounce effect that is very vibecoded (strict rule)")

- **No bounce, a strict rule now in CLAUDE.md, held by `lib/marketing/__tests__/noBounce.test.ts`** (it fails on the third cut's renderer and passes on the fourth). Gone: the opening push that landed, the punch in that settled on every jump, the pulses on the words, the push on each word, the page-bend that flattened into the faces, the whip that slowed as it arrived. Every move now runs at a steady speed; a jump closer is a straight cut.
- **Twice the pace:** a cut on every half beat (about 0.3 s), 187 half beats in all, as reference 3 swaps its faces. The night cuts through the El Greco with a jump closer every fourth cut, strikes on the bar lines and the two bass entries, flickers between; its dark breaks strike on every half beat; the build closes on strikes that grow dimmer. The Mother cuts on every half beat, the bar lines wider each bar with a flash of white; after the stop the whole icon in straight steps, closer on each half beat.
- **Measured on the film:** across all 187 half beats the picture changes by a median of 0.078 at a half beat against 0.0027 between them (29 times). The six quiet half beats are inside the song's own pause before the drop, its two stops and its silence before the light.
- **A fault of the renderer, mended:** the fourth cut's frames are quick to draw, so they piled up waiting for the encoder until the machine ran out of memory and the film came out cut short twice; the renderer now hands out eight runs at a time.
- **The words on white with a picture beside them**, as reference 3 sets its words beside its figure: a line on each beat (a word of the question on each beat), the picture changing on every half beat, faces that look out at the one asked under the question.

## The third cut (his word on the second: "and I wanted every beat to have a retention point (image switch, movement, transition or something etc, image cut)")

- **The beats:** the song's 94 beats, tracked from its own drums (101.7 a minute) and snapped to their onsets, with the bar lines on the drop; and the two bass entries that fall between beats in the build (2.28, 11.74 s).
- **Every beat starts something.** The night: a cut to a new detail of the El Greco on each beat, the bar lines inside a strike of light, a punch closer on the beats between, flickers; in its two dark breaks each beat is a strike that shows a face and gives it back to the dark. The Mother: each bar a whoosh cut, wider each bar, then a punch and two inserts (her eyes close, the Child's face, the enamel, a medallion, His hand, the gem, His foot, her hand, the silver flowers); after the stop the whole icon comes closer on every beat; in the silence before the light, two glimpses of it out of the dark. The light: the verses one line on each beat and the question one word on each beat, each with a push; once a verse is whole, its beats switch to a colour picture and back; the faces swap on every half beat.
- **Measured on the film:** the picture changes by a median of 0.093 (of 1) across the frames at a beat, and by 0.0026 between beats: 36 times more. 93 of 94 beats carry a clear change; the 94th (32.15 s) is inside the song's stop, where the strobe runs.
- The Child and the lamb, the brightest paint in the El Greco, have their own exposure so they no longer blow out.

## What changed from the brief, and why

- **The night is El Greco, not a Nativity icon.** At his word that Western art may be used and "the video has to be nice": *The Adoration of the Shepherds* (The Met, about 1605 to 1610) is a night where the newborn Child is the only light and every face is lit from Him, which is the light that edits. El Greco was trained as an icon painter in Crete before he went West. The icon first chosen (the Russian Museum's early 16th century Nativity, DRZh-1248, 9168 by 12000) is bright gold from edge to edge and was fetched but not used.
- **The night's shots, closing in:** the whole canvas; the angels with their banner; the shepherds' faces; Mary and Joseph; Mary's face opening out of the dark cut; her hands over the Child; the Child on the white cloth, the longest shot, closing to black for the pause before the drop.
- **The Mother is a Moscow Vladimir of the mid 16th century in its silver-gilt cover** (Russian Museum, DRZh-302, 5270 by 6000), not the Tretyakov's: three and a half times the detail, so the drop's close shot of her eye is sharp, and the widening ends on the whole silver cover with its enamel and stones.
- **The faces of Chapter III mix East and West** in order of their centuries: Berlinghiero (1230s), a Smolensk Hodegetria (end of the 14th), Bellini (about 1465), a Suzdal Hodegetria (end of the 15th), Bellini (late 1480s), the Vladimir (mid 16th), a Smolensk Hodegetria (16th), Our Lady of Kazan (17th). Duccio's Child is in profile and Lippi's looks down at a book, so neither could stand eye to eye with the others; the Tikhvin Child's face has darkened almost to black.
- **The cuts are on the measured onsets** (librosa, a hop of about 6 ms), each on its onset's frame: the drop at 18.530 s, frame 1111.
- **The type is larger than the brief's** (70 px for the two Isaiah lines, 88 for the question, 36 for citations): 64 read small on a phone in the first stills.
- **The night's light is lifted** (gamma 0.66, gain 1.5): El Greco's canvas is so dark that the first stills measured 0.05 to 0.08 luma.

## Faults the review found in the first cut, and mended

- Two single frames at full light: at the dark cut (frame 631) and where the whole icon develops (frame 1962). A shot started a few milliseconds before its light's first change and the light defaulted to full. A ramp now holds its first value before its first change.
- The crush at 32.0 s turned the icon a harsh red: it lowered each colour channel on its own. It now darkens by brightness and keeps each colour's hue.
- A thin white rim around the whole icon (33 to 36 s): the museum photograph's light ground. It is turned to black from the picture's edge inward; the icon is not touched.
- The type was raised again, to 78 px for the Isaiah lines and 96 for the question (the block stays clear of the buttons TikTok draws lower down the right side).

- After the crush to black (36.40 s) a few silver glints stayed lit: the lift let the brightest silver pass white before the crush. The picture is now clipped before the crush, and a full crush is black.

## Measured

- **The film (third render, 2026-11-25 about 08:12 UTC):** 1080 by 1920, 60 frames a second, 3,400 frames (56.667 s), H.264 High, the sound as AAC from frame 0. Large changes only at the planned cuts: 136, 260, 402, 704, 828, 1111 (the drop, out of black), 1254, 1395, 1537, 1679, 1821, 2246 (black to white, the light), 2530, 2812, 3288. Luma by second: 0.13 to 0.19 in the night outside its two dark cuts, 0.25 to 0.31 for the Mother, 0.97 on the white, 0.30 to 0.48 for the faces.
- First stills, after the lift: Chapter I frames 0.13 to 0.29 luma, their brightest tenth 0.26 to 0.71; Chapter II 0.22 to 0.30; the faces 0.28; the white panels 0.97.

## The Vault

The first cut was sent to him on 2026-11-25 and is kept in that message; its renderer is commit 49be2652 on the branch, so it can be made again exactly. The second, third and fourth cuts are `.promo/edit-3/out/the-cradle-cut2.mp4`, `-cut3.mp4` and `-cut4.mp4` (out of git); each was sent to him.

## Cost

- get_session: $5.86 at the start of the study of the references; $13.29 at the last finished turn before the film's turn (context 391,000 tokens). The film's turn (finding the pictures, the renderer, three renders) is not in that figure; it shows once the turn ends. No credits were spent: no Higgsfield, no generated picture.
