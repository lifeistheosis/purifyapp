# Promo edit 2, the Church: the record

The brief is `../edit-2-the-church.md`. This chat is session_01VuYTwaL9B8MePq2DHwaw7z, started 2026-11-23 22:05 UTC by the promo chat at his word. All times are UTC.

## Where it stands

**The storyboard is put to him and waits for his yes or no.** Nothing is filmed. The page: https://claude.ai/artifact/LmaN8bkhnrYHj9BfNiSsRo (private, his own; version 1, 22:33).

Two questions are on the page and are his to answer:

1. Has he clips of his own (his parish, candles, icons, a censer, the app in his hand)?
2. Is 11.92 seconds before the talking begins? He hears it; a chat cannot.

## His words

- 2026-11-23, in the promo chat, as the brief gives them: "So this one is more or less about the aesthetic, right? This one could just be an edit about Purify, Orthodox Church, just in general. So yeah, just like a crazy edit with the same style, same audio, right? But like this one's a little bit more different because there's like people talking in the back when it goes to the fighting section. We don't really need that part, but the intro part going into like before it shows them is kind of fire. Before it shows them talking, like that whole edit aesthetic, I want like a cinematic edit of us with that."
- Then: "Start making the 2 edits."
- In this chat: none yet.

## What was made (22:05 to 22:35)

| File | What it is |
|---|---|
| `board.py` | Makes the two cut-outs and the twelve stills, 1080 by 1920, in the look. Asserts every line of Scripture against `data/bible` and reads the two labels from the app's English catalogue, every time it runs. |
| `page.py` | Builds the storyboard's page from the design kit's own head and style. |
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

## Before the film, at his yes

- The hand's cuff is cut straight in the still; cut it along the cuff's own line.
- One slow even move for each shot, and the two frames of blur.
- The phone: the house's stage (`docs/plans/v1.9/video/release/film.mjs`) in place of the plain body `board.py` draws.
- The preview with the reference's first 11.92 s of sound, marked not for posting; the silent master; the film's page.
- A priest's yes is his to get before it is posted (`docs/editorial-standards.md`).

## Cost

Not read. get_session shows no cost and no token count while this chat's first turn is still open (context_usage reads 0), so no figure can be given honestly. The brief's limit to the storyboard is $12; the promo chat or the arbiter can read this session's cost once the turn has closed. Nothing that costs his credits was used: no Higgsfield tool, no other chat, no subagent, no scheduled task.
