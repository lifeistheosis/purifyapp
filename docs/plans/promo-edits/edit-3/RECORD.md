# Promo edit 3, the Cradle: the record

Brief: `docs/plans/promo-edits/edit-3-the-cradle.md`. Made in session_01VuYTwcTkdWjfVG9Mi39XAx. The sound, the pictures and the films are out of git, in `.promo/edit-3/`.

## His words (2026-11-25, verbatim, in order)

- "I want you to use this audio and make a prompt with extreme detail on the style and how the edit will be structured"
- "also the beat drop is around 0:18"
- "no licence. this is going on tiktok"
- "just start editing" (asked before it whether the song's words suit icons of the Mother of God; he answered by starting the edit)
- "I said. It doesn't have to be public domain." (while the pictures were being searched for)
- "again it could be anything Eastern Orthodox related or Jesus related (it could be western art too! just nothing heretical) the video has to be nice"

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

## Measured

- First stills, after the lift: Chapter I frames 0.13 to 0.29 luma, their brightest tenth 0.26 to 0.71; Chapter II 0.22 to 0.30; the faces 0.28; the white panels 0.97.

## Cost

- See the chat's report to him; get_session read $5.86 at the start of the study of the references (after the store-build plan and the ipwho.is fix). The film's own cost is read at its end.
