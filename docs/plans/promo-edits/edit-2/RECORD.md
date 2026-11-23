# Promo edit 2, the Church: the record

The brief is `../edit-2-the-church.md`. This chat is session_01VuYTwaL9B8MePq2DHwaw7z, started 2026-11-23 22:05 UTC by the promo chat at his word. All times are UTC.

## Where it stands

**The film's second cut is made and put to him** (2026-11-23, about 22:52), at his word for more effects and transitions. The first cut was put to him about 22:41. The film's page: https://claude.ai/artifact/9u3KBCTgwokQAvmuCfp5CU (private, his own). The storyboard's page: https://claude.ai/artifact/LmaN8bkhnrYHj9BfNiSsRo. The silent master and the preview were also sent to him as files in the chat.

Still his, and said on the film's page:

1. Is 11.92 seconds before the talking begins? He did not answer; the film ends there as the brief set it.
2. Has he clips of his own? He did not answer; the film is made from the stills and clips of the storyboard.
3. A priest's yes before it is posted (`docs/editorial-standards.md`).
4. The Mixkit licence's full text, read once in a browser.

## His words

- 2026-11-23, in the promo chat, as the brief gives them: "So this one is more or less about the aesthetic, right? This one could just be an edit about Purify, Orthodox Church, just in general. So yeah, just like a crazy edit with the same style, same audio, right? But like this one's a little bit more different because there's like people talking in the back when it goes to the fighting section. We don't really need that part, but the intro part going into like before it shows them is kind of fire. Before it shows them talking, like that whole edit aesthetic, I want like a cinematic edit of us with that."
- Then: "Start making the 2 edits."
- In this chat, about 22:35, on the storyboard: "Story, but look, it looks nice. Finish." Taken as his yes to the storyboard as it stood and his word to make the film. He answered neither question.
- About 22:43, on the first cut: "Add more effects, transitions, and just make it better overall." Taken with his standing words still binding (no glow, no bright frame, no shake, no punch in on the beat, clean transitions): the additions come out of the pictures themselves and none is laid on top. What was left out, and why, is on the film's page for him to overrule.

## What was made (22:05 to 22:35)

| File | What it is |
|---|---|
| `board.py` | Makes the two cut-outs, the twelve stills and the film, 1080 by 1920, in the look. Asserts every line of Scripture against `data/bible` and reads the two labels from the app's English catalogue, every time it runs. |
| `page.py` | Builds the storyboard's page and the film's page from the design kit's own head and style. |
| `pictures.json` | Everything the film is made from, in the order of its shots: its page, its licence as the page states it, the day it was read, where it is used. |

Out of git, in `.promo/promo-edits/edit-2/` (lost with the container; the three files above make it again): the pictures, the clips, DM Sans, the app's screens, the cut-outs, the stills and the page.

The app's screens are real: the native export of main `60c400d3f` (a worktree, `node scripts/gate/export.mjs --platform android`, about fifteen minutes with the install), taken with the Christ edit's own `screens.mjs` as a new reader with no Plus, Dark, Sunday 6 December 2026.

The page passed `node docs/brand/kit/check.mjs --page` on the five palettes at 360, 390, 412 and 1032, and was looked at once at 390.

## The shots, as put to him

24 frames a second, 286 frames, 11.92 s. Cuts in frames: 0, 6, 48, 70, 89 (two frames of blur), 91, 113, 135, 157, 178, 200, 221, 243, 286.

1. A hand sets a lit taper (Coverr clip). 2. The icon screen of the wooden church at Kondopoga (photograph). 3. The blessing hand cut whole from a Pantocrator, with "1. CHURCH. the pillar and ground of the truth, 1 Timothy 3:15". 4. The figure whole with the halo, with "in the name of the Father, and of the Son, and of the Holy Ghost, Matthew 28:19" and A M E N (Matthew 28:20). 5. Candles (Coverr clip). 6. A censer (photograph). 7. A dome of 1850 from below (photograph). 8. The service book in a priest's hands (Mixkit clip), labelled Prayers. 9. The Gospel in His hand, Vysotsky Pantocrator. 10. The face of the Sinai Pantocrator. 11. The app's Today on a plain phone, labelled Today. 12. The end card: Purify, Matthew 16:18, the verse, Purify's cross.

## Choices that are mine, and his to overrule

- **The picture stands 1080 by 1440 inside the 1080 by 1920 frame**, with black above and below. The brief says 1080 by 1920; the frame is that, and the picture is a window in it. Reasons on the page.
- **24 frames a second, not 60.** The clips are 24 and 25. At 60, the frames between would be made by a machine.
- **Left out:** the reference's bright frame at 8.33 (the brief's word), and also its one frame of block glitch at 2.00 and its flicker at 9.12. Kept: the two frames of blur at 3.71.
- **The entry keeps the reference's slanted "1."** though ours has one entry and not two.
- **The Gospel book is from an icon**, not from stock: no clean clip of one was found.
- **Purify's cross is the end card's cross**: one cross, not the mark and a cross.

## The reference, measured again (all 396 frames)

`https://www.tiktok.com/@jer.vfx/video/7705664879780220182`, fetched with yt-dlp into the scratchpad: 1206 by 720, 24 fps, 396 frames, 16.5 s. Every frame is grey to the last pixel (the spread between the three colours is 0.0 in all of them).

Where it differs from the promo chat's reading:

- 0.00 to 0.25 is two shots: hands on a cross (frames 0 to 2), a stone carved with a cross (3 to 5).
- 0.25 to 2.00 is a man sitting bowed on a bed's edge under a cross on a wall, with a candle stand: a room, not a church, and he is not kneeling. A small "GOD" comes in at 1.12.
- Frame 48 (2.00) is one frame of block glitch.
- 2.04 to 2.92 the hand with the rosary, with two entries: "1. CHRISTIANITY." at the left and "2. CATHOLICISM." at the right, each with six tiny centred lines. 2.92 to 3.67 the fighter, with the invocation left and right and A M E N spread.
- 3.67 to 3.79: a smear (frame 88), two black frames (89, 90), then the next shot comes in smeared (91).
- The clock is 22 frames, 0.917 s: cuts at frames 91, 113, 135, 157, 178, 200, 221, 243, 264, 286. Frames 91 to 178 are one scene cut four ways. One extra cut at 250 (10.42).
- Bright frames at 200 and 201 (8.33). A flicker at 219 and 220 (9.12).
- From 8.33 a tiny line along the foot: "JER / HOPE", "FAITH", "2026".
- The end card stands from frame 351 (14.6).

The sound was not measured in this chat and nothing was heard.

## What could not be had

- **Someone at prayer before the icons, incense rising, a bow or a blessing, a prayer rope in the hand.** Pexels answers a browser check and Pixabay refuses, so neither was read. Unsplash's own search could not be used. Coverr and Mixkit hold Catholic and general footage; the three clips used are what fits. Wikimedia Commons limited this container's requests hard: its search answered twice in twenty tries.
- A public domain photograph of a prayer rope is on Commons (`File:Eastern-Orthodox-prayer-rope_2006-06-02.jpg`, released by its author); the file itself was refused (429) four times.
- **Mixkit's licence text** opens in a window that was not read. Its page says the clip is free for commercial use and names the licence; that no credit is owed is known of that licence, not read today. Read it once before posting.
- The 1080 file of the Mixkit clip needs an account; the 720 file is used and is enlarged twice over.

## The film (22:35 to 22:41)

`board.py film` makes every frame from the same table of shots the stills come from, and `board.py sound <the reference's file>` makes the preview. Out of git, in `.promo/promo-edits/edit-2/film/`:

| File | What it is |
|---|---|
| `purify-the-church.mp4` | The **silent master**: 1080 by 1920, H.264, 24 fps, 286 frames, 11.917 s, 62 MB. This is what is posted, with the sound added inside TikTok from the reference itself. |
| `purify-the-church-PREVIEW-not-for-posting.mp4` | The same picture with the reference's first 11.917 s of sound and the line "Preview. Not for posting." at its head. For him alone to judge the timing. Never posted. |
| `purify-the-church-page.mp4`, `purify-the-church-preview-page.mp4` | Lighter copies (720 by 1280) that play on the film's page. |

Measured on the finished master: 286 frames; cuts at frames 6, 48, 70, 89, 90, 91, 113, 135, 157, 178, 200, 221, 243, which are the reference's own; no colour in any frame (the spread between the three colours is 0.0). The words were asserted against `data/bible` in the same run. The render takes about a minute on four cores.

How the film differs from the storyboard's stills, and from the brief:

- **The clips play as they were filmed.** The reference is slowed; slowing ours would need frames made by a machine. Each still photograph and icon has one slow, even move (a push of 2 to 6 in a hundred, or a slide of some 45 pixels of the source), and none answers the sound.
- **The hand ends at its cuff over a fall of fifty pixels into black**, not a hard line. Telling skin from sleeve by colour was tried first and left a ragged end.
- **The phone is the plain body `board.py` draws**, as on the storyboard he said yes to, not the house's stage of `film.mjs`.
- **The end card has no grain.**
- The two frames of blur are the figure and then the candles, each drawn out 170 pixels down its height.

The film's page passed `node docs/brand/kit/check.mjs --page` on the five palettes at the four widths. By eye on three frames of the master: no rays, no glow, no bright frame, no star, no stripe, no parchment.

Not done, and why: nothing was heard, so whether the cuts sit well on the sound is his to judge on the preview.

## The second cut (22:43 to 22:52)

Same length, same cuts, same words. `board.py` holds it all: `clip_frames`, `POOL`, `WEAVE`, `THROUGH_BLACK`, `DISSOLVES`, `SMEARS`, and shot 3's draw back in `build`. `board.py strip <frames>` makes a row of frames for looking over a transition.

Added, each with its reason on the page:

- **Slow motion.** The three clips at half speed: every second frame as filmed, the one between the mean of its two neighbours. This corrects the first cut's page, which said slowing needed frames made by a machine; a mean of two real frames is not that.
- **The hand draws back into the figure** over its last six frames (64 to 69), six moments blended in each frame, to the place and size it has in the whole icon; the figure stands up about it at 70.
- **Through black:** the church out (44 to 47), the hand in (48 to 50, its words whole from 48), the phone out (239 to 242), the film's close (283 to 285).
- **Three dissolves** of four frames with the cut in their middle: 113 (candles into the censer), 178 (book into book), 221 (His face into the app).
- **One more blur:** 133 to 136, the censer thrown up into the dome. The reference's own at 89 to 91 is kept.
- **Plain cuts left:** 6, 157, 200.
- **Film in the gate:** a weave of about a pixel, a lamp that wavers by some three in a hundred on two slow waves that are not the sound's, and one soft pool of light toward the window's corners.
- **The words open:** A M E N from one word to the spread; CHURCH, Prayers and Today widen as their shots run. Every line still stands from its shot's first frame to its last.

Left out, and said so on the page: glow, a bright frame, a shake, a punch in (his standing words); a glitch frame, light leaks, dust and scratches (laid-on stock effects); depth moves in the photographs (they need parts painted in).

Measured on the finished master: 286 frames, 1080 by 1920; no colour in any frame; the brightest frame's mean is 65 in 255 (frame 155, the dome); the film's mean is 33. The first cut's blur frames were each one row too tall, which pushed every later frame down by a row or two in that file; the second cut mends it (`smear`).

The stills in the work folder are now each shot's middle frame.

## Cost

By get_session, read at about 22:43: **$10.06** through the first cut (the storyboard, the film, both pages), with 315,000 tokens of context. The storyboard was within its $12. The second cut is not in that figure: a turn's cost shows only once it has closed. At some 315,000 tokens each step here costs about $0.20, and the second cut took about fifteen, so expect about $13 to $14 in all; read it again before more work. The $30 line has not been passed.

This chat is past the 200,000 token line of `docs/OPERATIONS.md`. A further round of changes is cheaper from a fresh chat started on this record and `board.py`.

Nothing that costs his credits was used: no Higgsfield tool, no other chat, no subagent, no scheduled task.
