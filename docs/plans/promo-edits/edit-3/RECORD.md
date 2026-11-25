# Promo edit 3, the Cradle: the record

Brief: `docs/plans/promo-edits/edit-3-the-cradle.md`. Made in session_01VuYTwcTkdWjfVG9Mi39XAx. The sound, the pictures and the films are out of git, in `.promo/edit-3/`.

## His words (2026-11-25, verbatim, in order)

- "I want you to use this audio and make a prompt with extreme detail on the style and how the edit will be structured"
- "also the beat drop is around 0:18"
- "no licence. this is going on tiktok"
- "just start editing" (asked before it whether the song's words suit icons of the Mother of God; he answered by starting the edit)
- "I said. It doesn't have to be public domain." (while the pictures were being searched for)
- "again it could be anything Eastern Orthodox related or Jesus related (it could be western art too! just nothing heretical) the video has to be nice"

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
