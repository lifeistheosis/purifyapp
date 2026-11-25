# Promo edit 3, the Cradle: the one-shot prompt

Written 2026-11-25 in session_01VuYTwcTkdWjfVG9Mi39XAx, at his word there: "I want you to use this audio and make a prompt with extreme detail on the style and how the edit will be structured." It follows his study of three edits (`docs/plans/promo-edits/study-2026-11-25.md`) and his reading of them: "they all have overlapping themes with their aesthetic but all have unique editing styles". This file is the whole brief of whoever makes the edit: this chat, or a fresh chat started from it.

---

You make ONE thing for Purify: promo edit 3, **the Cradle**, a 56.66 second film cut to the sound he sent ("Sub Urban - Cradles (Slowed)"). The owner (Leona, Edgar) may write to you directly: answer in extra simplified mode (a few plain lines, one or two questions at a time, never an em dash).

## Start

1. `git fetch origin ccr-07896cf2-bo0afd && git checkout -B ccr-07896cf2-bo0afd origin/ccr-07896cf2-bo0afd`. All work and every push go to that one branch. Never main. If a push is rejected, fetch, merge, push; never force, never `--no-verify`.
2. Read only these: this file; `docs/plans/promo-edits/study-2026-11-25.md`; `docs/plans/v1.9/video/release/christ-edit/README.md` (the edit he called perfect, its tools and its rules); the head of `lib/marketing/heritagePictures.ts`. Do not read `docs/NOW.md`, `docs/1.9-build/HANDOFF.md` or `BRAINSTORM.md`.
3. Keep `docs/plans/promo-edits/edit-3/RECORD.md`: his words verbatim with the time, what was made, what was measured, each page's link, the cost. Send no message to any other chat.
4. The repository is public. Nothing private about him goes into it. The sound, the pictures and the films stay out of git (`.promo/edit-3/`).

## His words (verbatim, 2026-11-25)

- "new rule for edits. (public domain is NOT needed)", then "edits are NOT paid ads".
- "remove the last rule. include the audio with edits" (the master carries its sound; it is never silent).
- On the three references: "not just the scene. but the editing, transition, emotion, quality, and etc", then "as you can see they all have overlapping themes with their aesthetic but all have unique editing styles".
- "I want you to use this audio and make a prompt with extreme detail on the style and how the edit will be structured".
- "also the beat drop is around 0:18". Measured: the drop is at 18.51 (frame 1111), after a pause from 18.25.

His standing words from the earlier films, which bind this one:

- "I want you to not time the glow to the beat. I want it to be purely clean transitions." and "the effect that matches the beat is too vibe coded also. I want clean transitions". So nothing answers the beat: no bright frame, no shake, no punch in, no pulse. Only cuts, melts and lines fall on the sound.
- "It's just the glow. The glow looks vibe coded." No glow behind words, faces or the mark.
- "make the text appear longer": a line is on screen from its shot's first frame to its last.
- Titles in the app's sans (DM Sans), never the display serif.

## The idea

**The song is called Cradles, so the film is about the cradle: the manger at Bethlehem, and the Mother who holds the Child.** It is the Nativity Fast (15 November to 24 December on the new calendar, 28 November to 6 January on the old), so it posts in season, up to the feast.

It is built the way the three references taught: **one look, three editing styles.** The song falls by itself into three chapters of about eighteen seconds each, the length of each reference, split by two silences (at 18.25 s and at 36.5 s). Each chapter is cut in one reference's style, and each ends by turning to the viewer, as each reference does at its peak.

**The drop is at 18.51** (his word: "also the beat drop is around 0:18"; measured to the frame below). Everything before it is the build: the song is muffled, as if heard through a wall (its brightness sits near 900 Hz). At 18.51 the filter opens (its brightness jumps to about 3,000 Hz and the top of the sound comes in), after a quarter second of near silence. **The film is built on that one moment.** Before the drop the picture is held back as the sound is: dark, almost without colour, slow. On the drop it opens as the sound opens: out of black, onto the Mother's eye, in warm colour and full light. Nothing in the film is as big a change as that cut, and nothing before it gives it away.

| Chapter | Time | Style (from the study) | What it shows | It turns to you with |
|---|---|---|---|---|
| I. The night | 0.00 to 18.51 | **Light that edits** (reference 1, the storm): cuts hidden in darkness, each shot closer | The Nativity icon in the dark: the journey through the night to the manger | The cradle itself, closest of all, the last light before black |
| II. The Mother | 18.51 to 36.40 | **A picture filmed as a scene** (reference 2, the whisper): coverage of one icon, wider each cut, crush and develop | The Theotokos of Vladimir, from her eye to the whole icon | Her eyes, looking out at the viewer, on the drop |
| III. The light | 37.43 to 56.66 | **Two worlds** (reference 3, Musashi): life in colour, the word in ink on white, a question at the end | Scripture on a white ground, and the Child's face in many icons | His question: "But whom say ye that I am?" |

The brightness of the whole film climbs with the story: near black in I, warm and golden in II, white in III. Colour climbs with it: the night is almost without colour, the Mother is warm, the light is full colour. **No word appears until the light does** (37.43 s): the words come with the light.

## The sound

His file: `AudioTranscriberAI_Sub_Urban_-_Cradles_Slowed_.mp3`, MP3, 128 kbps, 44.1 kHz stereo, 56.659592 s, SHA-256 `76970fa0c5d0accf41e50ad0910d7f7fab5ea179e34b20b7667451e7ec3e5d62`. If it is not in your uploads, ask him to send it, and check the hash.

The map, measured with `docs/plans/promo-edits/edit-3/sound_map.py` and `sound_marks.py` (librosa in a venv, out of git). **Measure it again yourself and pin every time to the frame** before you cut; these are the values to check, not to trust. About 103.4 beats a minute (a beat is 0.580 s, a bar of four is 2.32 s). The low end is a heavy bass that carries 70 to 90% of the energy whenever it plays.

| Time (s) | Frame at 60 | What the sound does | What the film does there |
|---|---|---|---|
| 0.00 to 2.25 | 0 to 135 | Intro: quiet, thin, no bass; a small rise at 1.4 | Shot 1, the small light in the dark |
| **2.25** | 135 | The bass comes in, muffled: the build begins (not the drop) | Hard cut |
| 2.25 to 9.65 | 135 to 579 | The build, part one: bass and hook behind the filter (brightness near 810 Hz). Bar lines with strong onsets at 4.37 and 6.73 | Cuts on 4.37 and 6.73 |
| 9.65 | 579 | The bass goes out | The light starts to close |
| **10.40 to 10.70** | 624 to 642 | Near silence (31 dB down) | The cut hidden in the dark, at 10.53 |
| **11.71** | 703 | The bass comes back | Hard cut |
| 11.71 to 16.63 | 703 to 998 | The build, part two, still behind the filter (brightness near 1,000 Hz). Bar line at 13.82 | Cut on 13.82, then the longest shot of the film holds until the drop |
| 16.63 | 998 | The bass goes out; the break before the drop (a rise in the middle and top from 17.0) | The light tightens and closes |
| **18.25 to 18.50** | 1095 to 1110 | The pause before the drop: near silence (40 dB down) | Black |
| **18.51** | 1111 | **THE DROP** (his word). The loudest hit so far, and the filter opens: the sound's brightness goes from about 900 Hz before to about 3,000 Hz after, and its top (8 to 11 kHz) comes up about 5 dB. Chapter II | Hard cut out of black onto her eye: the film's one great turn |
| 18.51 to 32.00 | 1111 to 1920 | Section B, the fullest and brightest part. Bar lines 20.92, 23.29, 25.66, 28.00, 30.37 | One cut on each bar line, wider each time |
| **32.00 to 32.70** | 1920 to 1962 | The music stops (28 dB down), small knocks at 32.4 | The crush |
| **32.70** | 1962 | The music returns | Cut to the whole icon, which develops up out of the dark |
| 32.70 to 35.85 | 1962 to 2151 | The last bars of B; bar line 35.09 | The whole icon holds and moves |
| **35.85** | 2151 | Everything stops | The whole icon is crushed to black |
| **36.50 to 37.40** | 2190 to 2244 | The deepest silence (37 to 44 dB down), one small sound at 36.90 | Black |
| **37.43** | 2246 | **Everything returns, quieter: Chapter III** | Hard cut from black to white, and the first words |
| 37.43 to 54.85 | 2246 to 3291 | Section C: quieter, half time, more knocks than bass. Bar lines 39.85, 42.21, 44.58, 46.90 (a strong onset), 49.27, 51.66, 54.03. Beats inside the bar from 42.21: 42.82, 43.37, 43.98, 44.58, 45.16, 45.74, 46.35 | White, the run of faces, white, the question |
| **54.85** | 3291 | The last bar's bass ends | Cut to black |
| **55.12** | 3307 | The last knock | Purify's mark appears |
| 55.12 to 56.66 | 3307 to 3400 | The fade, 45 dB down by 56.2 | The mark holds; the file ends |

**A cut lands on the frame of its onset or one frame before it, never after.** In section A the bass lands about a quarter beat after the tracked bar line (2.25 against 2.00, 11.71 against 11.45): cut on the bass, which is what is felt.

**The song's own words.** This chat could not hear them: a pitch tracker found little voice in this clip. He checks them before the storyboard (below, "Asked of him").

**The licence, named to him.** Cradles was released through NoCopyrightSounds (NCS). NCS's usage policy (ncs.io/usage-policy, read 2026-11-25) gives free use to independent creators only; "Brands and businesses", content "made to promote a product, service or brand", need a licence, and changing a track "beyond cutting it to fit" is not allowed (a slowed version is such a change). His rule for edits takes the risk that a post is taken down or muted. The safer ways: buy NCS's licence for the track, or post with the sound picked inside TikTok or Instagram. Either way the caption names the song: "Sound: Sub Urban, Cradles (slowed)".

**His decision (2026-11-25): "no licence. this is going on tiktok".** So: no NCS licence; the film goes to TikTok, from the edits account, with the sound in the master as his rule says. A TikTok Business account may only use TikTok's commercial library, and music it uploads can be muted; a personal or creator account has no such limit, so it is posted from the edits account, not a Business one. If TikTok mutes it anyway, the same sound is added from TikTok's own library at 0.00, and the caption still names the song.

## The look (one look, held through all three chapters)

- **Frame.** 1080 by 1920, 60 frames a second, phone first. The picture fills the frame: no letterbox, no bars, no border. The whole icon in shot 14 stands on the dark ground as a framed thing; that is an object in the frame, not a letterbox.
- **Ground and light.** A black ground and one soft pool of light on the thing that matters in each shot (the christ edit's `pool`). Light is a soft pool or nothing: never beams, rays, a ring, a flare, a light leak or a glow. If a picture has painted beams in it (the Nativity's star sends one down to the cave), the frame leaves it out or leaves it unlit; nothing is added to it.
- **Texture.** The icons' own cracks, wear and old repairs are the texture. Nothing is added: no grain, no dust, no film burn, no scratches.
- **Grade by chapter.**
  - I, the night (the build): the icon's own colour at about 30% saturation, neutral (no blue, no teal: his word on the Christ edit). Outside the pool the picture falls to about 5% of its light. The whole chapter is held a touch soft, a blur of about 0.8 px at 1080 wide and no more, so the icon's lines read but the picture is held back as the sound is behind its filter. At the drop it is gone: Chapter II is at the scan's full sharpness, so the picture opens in the same frame as the sound.
  - II, the Mother: about 80% saturation, the gold and the umber as painted. Outside the pool, about 22%.
  - III, the light: the white ground is a clean neutral, `#FAFAFA`, never cream or parchment (CLAUDE.md). The faces at full colour, with a wide pool that leaves the edges at about 45%.
- **Brightness a phone can read.** The references' worst fault was 4.7 seconds a phone shows as a black screen. So: in Chapter I the lit subject reads at a mean luma of at least 0.30 (of 1.0), and the whole frame at least 0.05, except inside the two dark cuts; in Chapter II the frame is at least 0.12, except in the crushes. The only long black is the silence before the light (36.40 to 37.43), and it is there on purpose.
- **Motion.** Every shot moves except two that are still on purpose (shot 5, where the light opens, and shot 16, where the faces change and the camera does not). A move is slow: at most 5% of the frame across a shot. Moves use the symmetric ease `cubic-bezier(0.37, 0, 0.63, 1)`; a light opening or a develop uses the house curve `cubic-bezier(0.22, 1, 0.36, 1)` (`--ease-house`, app/globals.css), so it arrives rather than drifts. Motion is blurred as a camera blurs it, as the christ edit does: each frame the mean of several moments within its own time, never across a cut.
- **Transitions: only these, and only where the tables put them.**
  1. The hard cut, on a landmark or a bar line of the sound.
  2. The dark cut (Chapter I): the pool closes over 0.5 to 0.75 s as the bass leaves, the cut falls inside the near silence where the frame is near black, and the next pool opens over about 0.9 s. Felt, not seen.
  3. Crush and develop (Chapter II): the black point rises over 0.2 s until only the brightest of the picture is left (the faces, the gold); after the cut the next picture starts crushed and comes up over 1.0 s.
  4. The melt (Chapter III's faces): two whole icons laid over each other over five frames, set on His eyes, as the christ edit melts.
  5. Black to white, once, at 37.43. Black at the end, at 54.85.
- **Never:** a white frame or any flash, a strobe or flicker, a shake, a punch in or a zoom pulse, a whip, a warp or page bend, a blur transition, a speed ramp, a colour split, a light leak, a glow, rays, a sparkle, text that types or fades in, an editor's logo or end card. Nothing moves because the beat hit.
- **Flashing.** No more than one large black to white change in any second; the film has one in all (37.43).

## The words

Three lines, and no other word in the film. Each is Scripture word for word as the app has it (`data/bible`: the Old Testament is the Septuagint in Brenton's English, the New is the King James), and your script asserts each against `data/bible` every time it renders, as the christ edit's does:

| Shot | The line | The citation | Checked in `data/bible` |
|---|---|---|---|
| 15 | O people walking in darkness, behold a great light | Isaiah 9:2 | isaiah/9.json, verse 2, its first clause |
| 17 | For a child is born to us, and a son is given to us | Isaiah 9:6 | isaiah/9.json, verse 6, its first clause |
| 18 | But whom say ye that I am? | Matthew 16:15 | matthew/16.json, verse 15, its last clause |

- **Type.** DM Sans, the app's sans, from the export's own font file (the christ edit's `assets.py` takes it). The two Isaiah lines: Medium (500), 64 px, line height 1.18, ink `#111111` on `#FAFAFA`. The question: Medium, 76 px. Each citation: Regular (400), 34 px, `#5C5C5C` (6.4 to 1 on the ground, above the 4.5 the house asks; the ink is 18 to 1), 28 px below its line. Sentence case, as Scripture is printed; no capitals spaced out.
- **Where.** A block set left at x = 120, at most 760 px wide, its middle about y = 700: the upper part of the screen, clear of the buttons TikTok and Instagram stack on the right and the caption at the foot. Everything that must be read stays inside x 90 to 900 and y 250 to 1450.
- **Breaks.** "O people walking / in darkness, behold / a great light"; "For a child is born / to us, and a son / is given to us"; "But whom say ye / that I am?".
- **Time.** A line is on from its shot's first frame to its last, still: no typing, no fade, no letter moving on its own. The panel it sits on glides (scale 1.000 to 1.025 across the shot, the symmetric ease), so the words live without a pulse. The shortest line holds 3.19 s.

## The film, shot by shot

Times are seconds; frames at 60 a second in brackets. "W" is the width of the frame (1080 px). The **why** column is the justification he asks of every design.

### Chapter I, the night (0.00 to 18.51): light that edits

The pictures: one Nativity icon (see "The pictures"). Each shot is closer to the manger than the last.

| # | Time | Sound | Picture | Framing and light | Move | Out | Why |
|---|---|---|---|---|---|---|---|
| 1 | 0.00 to 2.25 (0 to 135) | Quiet intro | The night mountain and the black mouth of the cave; the swaddled Child a small white shape at the centre | The cave's mouth about 60% of W; one pool on the Child, radius about 0.22 W; all else near black | Push 1.000 to 1.040 | Hard cut at 2.25 | A small light in a great dark: the whole film in its first frame. The first second decides a scroll, so frame 1 is a picture, never black |
| 2 | 2.25 to 4.37 (135 to 262) | The bass lands | The Magi on horseback in the hills, small, riding toward the cave | The riders about 35% of W; the pool on them | Pan 4% of W in their direction of travel | Hard cut at 4.37 | Others are coming to the cradle through the night: the journey starts on the first hit |
| 3 | 4.37 to 6.73 (262 to 404) | The hook | The shepherds in the field; one looks up | His head about 25% of W; the pool on the faces | Push 1.000 to 1.035 | Hard cut at 6.73 | Those who keep watch by night (Luke 2:8): the viewer's own place in the story |
| 4 | 6.73 to 10.53 (404 to 632) | The hook; the bass goes out at 9.65; near silence 10.40 to 10.70 | The angels bowed over the top of the mountain, with the star's painted beam out of frame or left dark | The angels about 50% of W | Push 1.000 to 1.040; from 9.65 the pool closes (its radius and light fall together over 0.75 s, the symmetric ease) to near black by 10.40 | The dark cut at 10.53 | The cut hides inside the dark and the song's own silence, as reference 1 hides its cuts in the night |
| 5 | 10.53 to 11.71 (632 to 703) | The break; the instruments return at 10.80 | The cave from close: the manger faint in the black | The manger about 55% of W | Still; the pool opens out of black from 10.70 to 11.60 on the house curve | Hard cut at 11.71 | Arrival. The light finds the cradle before the bass returns, so the return lands on what was found |
| 6 | 11.71 to 13.82 (703 to 829) | The bass comes back | The manger, the ox and the ass leaning in | Manger and heads about 75% of W | Push 1.000 to 1.040 toward the Child | Hard cut at 13.82 | Closer. The beasts at the crib are the icon's own reading of Isaiah 1:3 (not written on screen) |
| 7 | 13.82 to 18.51 (829 to 1111) | The hook; the bass goes out at 16.63 (the break before the drop); the pause 18.25 to 18.50 | The swaddled Child in the manger, as close as the scan allows | The Child about 80% of W | Push 1.000 to 1.050, the longest shot of the film (4.69 s); from 16.63 the pool tightens until only the white of the swaddling is lit, and it is gone by 18.25 | Black through the pause, then the hard cut on the drop at 18.51 | The cradle, last and closest: the turn to the viewer of Chapter I. The longest, slowest shot is the tension before the drop; the bands the icon paints like a shroud are the last thing seen, and the pause before the drop is black |

### Chapter II, the Mother (18.51 to 36.40): a picture filmed as a scene

The picture: the Theotokos of Vladimir, alone. Cut like film coverage of a scene, each shot wider than the one before, ending on the whole icon. No crop is narrower than 1080 pixels of the scan (else it goes soft and blocky, as reference 2's red robe does).

| # | Time | Sound | Picture | Framing and light | Move | Out | Why |
|---|---|---|---|---|---|---|---|
| 8 | 18.51 to 20.92 (1111 to 1255) | **The drop**: the filter opens, the loudest hit so far | Her near eye, looking out of the icon at the viewer | The eye about 45% of W; the pool on it; full sharpness and warm colour from this frame | Push 1.000 to 1.030 | Hard cut at 20.92 | On the drop the picture opens as the sound does: out of black, sharp, warm, and she is looking at you. The stare into the lens was reference 2's peak; here it is the drop itself, a cut and nothing else (no flash, no shake, no punch in). Chapter I's last thing was the Child; Chapter II's first is His Mother's eye |
| 9 | 20.92 to 23.29 (1255 to 1397) | Bar line | The two faces, cheek against cheek | Both faces about 90% of W | Pan 5% of W from her face to His | Hard cut at 23.29 | Tenderness: the Mother is the cradle. The move joins the two faces |
| 10 | 23.29 to 25.66 (1397 to 1540) | Bar line | His hand at her neck, and His cheek | The hand about 40% of W | Pan along His arm, 4% of W | Hard cut at 25.66 | The embrace, the detail every reader of this icon remembers |
| 11 | 25.66 to 28.00 (1540 to 1680) | Bar line | The Child whole in her arms, the sole of His foot turned out | The Child about 70% of W | Push 1.000 to 1.030 | Hard cut at 28.00 | Wider: the coverage moves out as reference 2's does |
| 12 | 28.00 to 30.37 (1680 to 1822) | Bar line | Both to the shoulders, with the letters in the gold if the scan shows them | Both about 100% of W | Push 1.000 to 1.030 | Hard cut at 30.37 | Wider again: the gold ground enters |
| 13 | 30.37 to 32.70 (1822 to 1962) | Bar line; the music stops at 32.00 | Both to the waist, more gold | The pair about 85% of W | Push 1.000 to 1.025; at 32.00 the crush: over 0.2 s the black point rises until only the faces and the brightest gold are left, held so until 32.70 | Hard cut at 32.70 | Crush and develop on the song's own stop: the picture holds its breath with the music |
| 14 | 32.70 to 36.40 (1962 to 2184) | The music returns; everything stops at 35.85 | The whole icon, edge to edge, its wear and old repairs as they are | The icon about 92% of W, centred, on the dark ground | It develops up out of the crush over 1.0 s on the house curve, then pushes 1.000 to 1.030; from 35.85 it is crushed to black over 0.55 s | Black by 36.40 | The reveal by widening ends on the whole, the master shot of the scene. The song stops on it and it goes into the dark with the song |

### The silence (36.40 to 37.43)

Black, still. The song is at its deepest silence; one small sound at 36.90 changes nothing on screen. **Why:** the breath before the light. It is the only long black in the film, so the white that follows is felt as light.

### Chapter III, the light (37.43 to 56.66): two worlds

Two worlds, as reference 3 has them: **the Word in ink on a white ground, and the flesh in colour, the icons.** The words live on white; the faces live in colour.

| # | Time | Sound | Picture | Framing and light | Move | Out | Why |
|---|---|---|---|---|---|---|---|
| 15 | 37.43 to 42.21 (2246 to 2533) | Everything returns, quieter | White ground, and the first words of the film: "O people walking in darkness, behold a great light", Isaiah 9:2 | The text block as set in "The words" | The panel glides 1.000 to 1.025 | Hard cut at 42.21 | From black to white on the song's return: the people in darkness see the great light in the same instant they read it. The line speaks to the viewer ("O people... behold") |
| 16 | 42.21 to 46.90 (2533 to 2814) | Eight beats | The Child's face in eight icons of the Theotokos with the Child, each icon whole, set so His eyes are in the same place. One face on each beat (42.21, 42.82, 43.37, 43.98, 44.58, 45.16, 45.74, 46.35); each melts into the next over the five frames before its beat, so the new face is sharp on the beat | His face about 45% of W, His eyes at about y = 0.42 of the height; a wide pool, edges at about 45% | Still: the faces change, the camera does not | Hard cut at 46.90 | One face, painted by many hands over nine centuries: reference 3's faces swapped in place, with every icon kept whole (no face set on another icon's body) |
| 17 | 46.90 to 51.66 (2814 to 3100) | The strong onset at 46.90 | White: "For a child is born to us, and a son is given to us", Isaiah 9:6 | The text block | The panel glides 1.000 to 1.025 | Hard cut at 51.66 | What the light is: a Child. The verse the Church reads at the feast |
| 18 | 51.66 to 54.85 (3100 to 3291) | Bar line | White: "But whom say ye that I am?", Matthew 16:15, larger, alone | The text block, larger | The panel glides 1.000 to 1.020 | Hard cut to black at 54.85 | The turn to the viewer of the whole film: it ends on His question, asked of whoever is watching. Reference 3 ends the same way, on a question to "you" |
| 19 | 54.85 to 56.66 (3291 to 3400) | The last bass ends; the last knock at 55.12; the fade | Black; at 55.12 Purify's mark, still, centred | `public/purify-cross-mark.png` (177 by 311), drawn no larger than its own size, centred at (540, 960) | None | The file ends at 56.66 | The signature, as reference 3 signs off, with none of its glow. The answer to the question is left to the viewer |

## The pictures

- **The Nativity (Chapter I).** The Nativity of Christ from the festival tier of the Annunciation Cathedral in the Moscow Kremlin (about 1405, given to Andrei Rublev or his circle). Take the largest scan you can find (Wikimedia Commons or the museum's own). It must give the cave, the manger, the Magi, the shepherds and the angels each at 1080 source pixels or more across the crop the table draws. If no single scan does, take shots 2 to 4 from a second Russian Nativity of the 15th or 16th century held in Russia, and tell him.
- **The Theotokos of Vladimir (Chapter II).** Constantinople, early 12th century, Tretyakov Gallery (kept in the Church of St Nicholas in Tolmachi). The largest scan you can find; the eye in shot 8 needs 1080 source pixels across its crop.
- **The eight faces (shot 16).** Icons of the Theotokos with the Child where His face is clear and turned toward us, at a similar size once set on His eyes. To choose from: the Vladimir, the Donskaya, the Smolensk Hodegetria, the Kazan, the Tikhvin, the Feodorovskaya, Our Lady of the Sign of Novgorod, the Sinai Theotokos enthroned, the Pelagonitissa. Put them in the order of their centuries, the oldest first.
- **Where they are held.** None held in Greece or Italy: `lib/marketing/heritagePictures.ts` keeps those out of every video and post until he lifts it, and his new edit rule did not lift it. Every work named above is held in Russia, Egypt (Sinai) or North Macedonia.
- **The record.** Each picture goes into `docs/plans/promo-edits/edit-3/pictures.json`: what it is, where it is held, its page, its licence as the page states it, and the shots it is in. The files stay out of git.
- **Icons whole.** An icon is moved, cropped by the frame, lit and graded, and nothing else: nothing drawn into it, nothing painted out of it, no part of one icon set on another.
- **Nothing made by a machine.** No generated picture or footage. The Higgsfield tools in your list spend his credits: do not use them for this film.

## What exists (use it, do not rebuild it)

- `docs/plans/v1.9/video/release/christ-edit/`: `edit.py` renders a film from tables (shots, runs of faces with `melt` and `flow` set on the eyes, words asserted against `data/bible`, the pooled light, motion blur, luma printed beside a reference), `assets.py` makes the working copies, the eye marks and the font, and its README has the commands. Copy what you need into `docs/plans/promo-edits/edit-3/`; leave the old folder as it is.
- `docs/plans/promo-edits/edit-1/` and `edit-2/`: their records and tools, including the mark.
- `docs/plans/promo-edits/edit-3/sound_map.py` and `sound_marks.py`: this song's map, to run again.

## Asked of him before the storyboard

1. **The song's words.** In this clip, does anything sung clash with icons of the Mother of God? (The song's own music video is dark: a bedroom on fire, masked bodies, mannequins. Nothing of it is used, but some viewers know it.)
2. **The licence:** answered, no licence; TikTok ("no licence. this is going on tiktok").

## Deliver, in two steps

1. **The storyboard, for his yes or no.** Eleven stills from the real film, rendered by the real tools, at 1.20, 3.30, 8.00, 15.00, 18.60, 26.80, 34.00, 39.00, 44.00, 53.00 and 56.00 seconds. One page, made phone first from the design kit (`docs/brand/design-kit.md`), published as a private Artifact: under the stills, the song's timeline drawn with the three chapters and the silences on it; the reason for each choice; the pictures with their licences; the cost so far.
2. **At his yes, the film.** The master: 1080 by 1920, 60 frames a second, H.264 High profile at about 20 Mbps, the sound as AAC at 256 kbps, 3,400 frames (56.67 s), the sound at frame 0 and unchanged (no fade, no cut, no level change). A still for the post's cover (shot 8, her eye). The page: the film, the master to save, the reasons, the caption line naming the song, and the TikTok steps (the edits account, the sound already in the file, the library's sound if it is muted). The record. Say plainly on the page that a priest's yes is still his to get before it is posted, and that it is for the edits account, not a paid ad and not the store pages.

## Checks, before he sees anything

- Each word asserted against `data/bible` (the render stops if one differs).
- Every cut on its onset's frame or one frame before it; print each cut's frame beside the onset's. Above all the drop: shot 8's first frame is the drop's onset frame (1111 if the measure holds) or the one before, and frames 1095 to 1110 are black.
- The build and the drop: print the mean sharpness and saturation of Chapter I beside Chapter II's; the drop must be the largest change of both in the film.
- Luma for every frame, printed, against the floors in "The look". Chapter I's lit subject at 0.30 or more and the frame at 0.05 or more outside the dark cuts; Chapter II's frame at 0.12 or more outside the crushes.
- Large black to white changes: one, at 37.43.
- Every word and face inside x 90 to 900, y 250 to 1450.
- No crop under 1080 source pixels across.
- `pictures.json` complete; nothing held in Greece or Italy.
- The length is 3,400 frames and the sound starts at frame 0.
- By eye, stated in the record: no rays, no sparkle, no glow, no flash, no shake, no parchment or cream, no em dash.

## The rules that still bind (CLAUDE.md has them in full)

No rays or beams, no four-point sparkle, no side stripe, no parchment or cream ground, no em dash, no glow. Phone first. One version: no alternatives unless he asks. Stills before video. Every design is justified to him, choice by choice, and nothing goes out without his yes. Change nothing under `app/`, `components/`, `lib/`, `android/`, `ios/` or `supabase/`. No other chats, no subagents, no scheduled tasks.

## Spend

Read your cost with get_session. Tell him the cost at the storyboard and at the film. Ask him before passing $30 in all. (In session_01VuYTwcTkdWjfVG9Mi39XAx his word lifted that chat's own limits; the cost is still named to him before each step.)
