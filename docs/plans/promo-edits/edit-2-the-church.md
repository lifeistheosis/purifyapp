# Promo edit 2, the Church: the one-shot prompt

Written 2026-11-23 about 22:45 UTC in the promo chat (session_01VuYTwaR8ZjSrVP4wNc6eeM), at his word there: "Start making the 2 edits." This file is the whole brief of the chat started with it. Its record of the talk is `docs/handoffs/promo-edits.md`.

---

You are a worker chat for ONE job on Purify: make promo edit 2, **the Church**, a short cinematic film of Purify and the Orthodox Church in the look of one reference edit, cut to its timing. The owner (Leona, Edgar) asked for it himself and may write to you directly: answer in extra simplified mode (a few plain lines, one or two questions at a time, never an em dash).

## Start

1. `git fetch origin ccr-07896cf2-bo0afd && git checkout -B ccr-07896cf2-bo0afd origin/ccr-07896cf2-bo0afd`. All work and every push go to that one branch. Never main. If a push is rejected, fetch, merge, push; never force, never `--no-verify`.
2. Read only these: this file; the head of `lib/marketing/heritagePictures.ts`; in `docs/handoffs/promo-edits.md` the part on reference 2 and "To read them again"; and `docs/plans/v1.9/video/release/christ-edit/README.md` only for how a figure is cut out of an icon and how words are held to the Bible. Do not read `docs/NOW.md`, `docs/1.9-build/HANDOFF.md` or `BRAINSTORM.md`.
3. Send no message to the promo chat or to any other chat: each wakes a long chat. Keep `docs/plans/promo-edits/edit-2/RECORD.md` current instead: his words verbatim with the time, what was made, what was measured, the page's link, the cost.
4. The repository is public. Nothing private about him goes into it.

## His words (2026-11-23, verbatim)

- On the reference: "So this one is more or less about the aesthetic, right? This one could just be an edit about Purify, Orthodox Church, just in general. So yeah, just like a crazy edit with the same style, same audio, right? But like this one's a little bit more different because there's like people talking in the back when it goes to the fighting section. We don't really need that part, but the intro part going into like before it shows them is kind of fire. Before it shows them talking, like that whole edit aesthetic, I want like a cinematic edit of us with that."
- Then, after the shape below was put to him: "Start making the 2 edits."

He was asked what "us" is filmed from (his own clips, free licensed clips, or stills alone) and has not answered. So begin from stills and freely licensed clips, and ask him once, on the storyboard, whether he has clips of his own to put in their place: his parish, candles, icons, the app in his hand.

His standing words from the last three films, which bind this one:

- "I want you to not time the glow to the beat. I want it to be purely clean transitions." and "the effect that matches the beat is too vibe coded also. I want clean transitions". Nothing answers the beat: no bright frame, no shake, no punch in. Only cuts and lines fall on the sound.
- "It's just the glow. The glow looks vibe coded." No glow.
- "make the text appear longer": a line is on screen from its shot's first frame to its last.
- Titles in the app's sans, never the display serif.

## The reference

`https://www.tiktok.com/@jer.vfx/video/7705664879780220182`: 16.5 seconds, wide, 24 frames a second, fighters at prayer. Fetch it as the hand-over says (yt-dlp, into a folder out of git) and **measure it again yourself, frame by frame**. What the promo chat's script read, to be checked and not trusted:

- Every frame is black and white, with grain. Slow motion all through.
- 0.00 to 0.25: hands on a cross, close. 0.25 to 2.00: a man kneeling in a church, wide.
- 2.00 to 3.71: a subject cut out on pure black (a hand with a rosary, then a fighter) with very small white words set like a dictionary's entry: a slanted "1.", a word in capitals with a full stop, and three to six tiny centred lines under it. Then "IN THE NAME OF THE FATHER AND OF THE SON" small at the left, "AND OF THE HOLY SPIRIT AMEN." small at the right, and the letters A M E N spread across the frame.
- 3.71 to 3.79: two frames of blur into what follows.
- 3.79 to 11.92: nine shots, a cut every 0.90 s as even as a clock (4.71 5.62 6.54 7.42 8.33 9.21 10.12 11.00 11.92), some with a small name set like the entries. One bright frame at 8.33.
- 11.92 to 14.5: the fights. He hears people talking over the sound from here and does not want this part.
- The end, on black: the maker's signature, "ROMANS 15:13", the verse in small slanted type, a small cross.
- The sound: the maker's own upload, a slow sway of about 66 beats a minute, three to a beat. It names no song.

## The film

1080 by 1920, H.264, **11.92 seconds**: it ends on the reference's cut at 11.92, before the talking, so that only that much of the sound is taken when he adds it inside TikTok. Sixty frames a second as the house's films are, unless the footage reads better at the reference's 24: say which and why on the page.

| Time | The reference | Ours |
|---|---|---|
| 0.00 to 0.25 | hands on a cross | hands on a prayer rope, or a hand lighting a candle, close |
| 0.25 to 2.00 | a man kneeling in a church | a church within, wide and slow: someone at prayer before the icons, seen from behind |
| 2.00 to 3.71 | cut-outs on black with the small entries | a blessing hand cut out whole from an icon, alone on black, with one entry beside it; then a second cut-out with the invocation, and A M E N spread across the frame |
| 3.71 to 3.79 | two frames of blur | the same, into the Church |
| 3.79 to 10.12 | seven shots, 0.90 s each | the Church: candles, incense rising, a dome from below, the Gospel book, an icon's face, a bow or a blessing, and the app on the house's phone, each slow |
| 10.12 to 11.92 | two more shots | the end card on black: Purify's mark where the maker's signature stands, a verse's name, the verse in small type, a small cross |

**The small words are Scripture, word for word, or the app's own labels.** None is written for the film, and your script asserts each against `data/bible` every time the film is made. Proposed, his to change on the storyboard:

- The entry: "CHURCH." and under it "the pillar and ground of the truth", "1 Timothy 3:15".
- The invocation: "in the name of the Father, and of the Son, and of the Holy Ghost", "Matthew 28:19", with A M E N across.
- The end card: "upon this rock I will build my church; and the gates of hell shall not prevail against it", "Matthew 16:18".
- A label on a shot, where the reference sets a name: the app's own label for what is shown (Prayers, Saints, the day's name), read from the app.

## What it is filmed from

- **Clips:** only those whose licence allows trade with no credit owed (CC0, public domain, or a stock licence that says so), each written down with its page, its licence as the page states it and the day it was read. Hands, backs, shapes in the dark, candles, censers, domes, books. **No living face that can be known**: a stock licence is not that person's yes to stand in an advert.
- **Icons:** public domain and not held in Greece or Italy (`lib/marketing/heritagePictures.ts`; the Christ edit's `pictures.json` has nine cleared). An icon moves only whole and nothing in it is redrawn. A cut-out of a hand or a figure is cut whole.
- **The app:** real screens only, from the native export of main, a new reader with no Plus, Dark, on the house's plain phone (`docs/plans/v1.9/video/release/board.mjs` and `../ad/README.md` have the stage and the export's commands; the export takes about twelve minutes, so make it only when the storyboard needs the shot). Nothing of the interface is drawn, no Plus feature is shown in use, and no screen that shows a picture on the heritage list.
- **No picture made by a machine**, of worship or of anything else. The Higgsfield tools in your list cost his credits: do not use them.
- Everything goes into `docs/plans/promo-edits/edit-2/pictures.json`. The files themselves stay out of git.

## The look

Black and white with grain, deep blacks, slow motion, and one slow even move in each shot. The cut-outs stand on pure black. The type is small and exact, in the app's sans, as the reference sets it. Leave out the reference's one bright frame. No rays or beams, no glow, no four-point sparkle, no side stripe, no parchment or cream ground, no em dash.

## The rules that still bind (CLAUDE.md has them in full)

Phone first. One version, stills before video. Every design is justified to him, choice by choice, and nothing goes out without his yes. Change nothing under `app/`, `components/`, `lib/`, `android/`, `ios/` or `supabase/`. No other chats, no subagents, no scheduled tasks, no store builds, nothing that touches production.

## The sound

The reference's sound is not cleared. Deliver a **silent master**: he adds the sound inside TikTok from the reference itself, and the film's length keeps the talking out. Make one preview with the reference's first 11.92 seconds of sound under it, for him alone to judge the timing, marked not for posting. The sound never goes into the repository. He hears where the talking begins and you cannot: ask him on the storyboard whether 11.92 is before it.

## Deliver, in two steps

1. **The storyboard, for his yes or no.** One still for each shot, about twelve, from the real pictures in the real look. One page, made phone first from the design kit (`docs/brand/design-kit.md`), published as a private Artifact, with the reason for each choice, the words with their sources, and the list of clips and pictures with their licences. On it, his two questions: has he clips of his own, and is 11.92 before the talking. Give him the link and stop.
2. **At his yes, the film**, its page (the preview, the silent master to save, a still, the reason for each choice), and the record. Say plainly on the page that a priest's yes is still his to get before it is posted, since Scripture set beside pictures is framing (`docs/editorial-standards.md`).

## Spend

Read your cost with get_session. Reach the storyboard within $12. Stop and ask him before you pass $30 in all. Say the cost of each step in the record.
