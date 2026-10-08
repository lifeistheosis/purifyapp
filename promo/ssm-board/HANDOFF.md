# SSM board: hand-off for a local session

Written Oct 8, 2026 by a cloud session that could not reach the purify-ads repo. It is for the owner's local Claude, to finish when the cloud session's limit runs out.

## Where things stand

The live board is https://claude.ai/artifact/JEDHhLDpXNKDbWHCURNDjd, at version 14 (`1791498505-a787`). Versions 8 to 14 were edited by hand on the page, not in `purify-ads/ssm`. The next `node ssm/ssm.mjs sync` that rebuilds and publishes the page will drop all of it unless it is ported first. The board's store carries the same warning (`ideas/open-2026-10-08`).

What the owner asked for, in order:

1. A voice list for recording MP3s: every idea numbered, with a mark per idea once its audio is done.
2. The old look was "super vibe-coded" (the purple stripe on the left most of all): redesign it with Impeccable (`pbakaus/impeccable`). RUBRIC came first, then the final call: "black and white, more minimal, optimized for desktop".
3. "Summarize TikTok, Instagram, YouTube to their logos" and "I don't want to scroll down and see a bunch of titles and a bunch of text".
4. Every morning: "if we posted a video, just clear off the questions for that video", then "integrating the routine with the things that need a yes or no".
5. A bigger Today title, with "a looping animation" of the stats going in and out beside it.

## Job 1: port the page changes into ssm

Files in this folder:

- `board.css` is the whole stylesheet of version 13. It replaces the generated one. The font link becomes IBM Plex Sans (400, 500, 600) and IBM Plex Mono (400) instead of Inter.
- `main-script.diff` is every change to the page's main script against what ssm generated: the ideas snapshot reads the voice fields, `paint()` calls `paintVoiceMarks()` and `paintToday()`, a post record counts as decided, the new functions (`postedOn`, `paintToday`, `voiceRows`, `mk`, `pfIcon`, `paintVoice`, `paintVoiceMarks`) and the click branches `vo` and `vo-hide`.
- `tabs.js` is a second script after the main one. It shows one section at a time and sends every `#link` to the tab that holds its target. Without it the page shows every section, as before.
- `today-stats.js` is a third script: the numbers that go in and out beside the big Today title (views, followers, followers per platform, likes, the best post, posts on record, days since the last post, pieces in the works, voice lines recorded). It reads them all from the page itself, pauses under the pointer and in a hidden tab, and holds still for reduced motion. Its CSS is the last block of `board.css`.
- `build/1` to `build/7` are the exact transforms applied to the generated page, in order. Their paths point at the cloud scratchpad, so adjust them before running. Read them for the HTML changes the diff does not show:
  - the voice list block at the top of `#ideas`, and the morning line under the Today heading;
  - emoji taken out of section titles, nav links, buttons, summaries, pills and options (better: stop writing them in the ssm templates), and blank thumbnails labelled Edit, Saved, Text or Audio;
  - platform names replaced by their marks: `<span class="where pf" role="img" aria-label="TikTok" title="TikTok"><i class="ico ico-tiktok"></i></span>`, with class `where on pf` and label "Posted on TikTok" once posted; platform pills become `.pfh`, profile links `a.pfa` with an `aria-label`, table cells and headers `<i class="ico ico-x" role="img" aria-label="X">`; "TikTok: 29 on" becomes the mark plus "29 on", "For Instagram 6" becomes "For" plus the mark plus "6", "Next on TikTok" becomes "Next on" plus the mark;
  - the nav loses its "Voice list" link, because the list is the top of Ideas.
- The marks come from the app: `components/ui/icons/TikTok.tsx`, `components/ui/icons/Instagram.tsx` and the YouTube case of `components/community/profile/SocialLinkIcon.tsx`. The Shorts mark is drawn to match. All four sit in `board.css` as CSS masks.

What the page reads from the store, so `ssm sync` can file it:

- `ideas/*` carry `n`, `kind` (myth, series, history, shorts, long, note), `hook`, `pf`, `pick`, `clergy`, and `items` for the batch ideas.
- `state/vo.<idea>` or `state/vo.<idea>.<item>` are the MP3 marks, `{kind: "vo", done}`.
- `posted/<piece>.<platform>` are post records, from the owner's tap or from the morning check (`by: "morning check"`).
- `state/morning` is the morning line, `{kind: "morning", text, at}`.

Check after porting: Impeccable's detector on the built page (`impeccable detect --json <page>`) gave 0 findings at version 14, against 92 on the old page. Test the tabs, the voice list and Today against a stand-in store, by stubbing `window.claude.use("db")`.

## Job 2: the morning routine and the yes or no queue

The cloud routine is "Purify board morning check" (`trig_01L3rqfMYKCNYqkixdMJyhHh`). It runs daily at 7:51 Eastern, in a fresh session each time. It reads the last check from `state/morning`, looks at TikTok @purify.app, Instagram @purifymylife and YouTube @purifymylife, matches new posts to board pieces, writes `posted/<piece>.<platform>`, counts what still needs a yes or no, and leaves the morning line.

The cloud environment cannot reach tiktok.com, instagram.com or youtube.com today, because of its network policy. Until the owner allows them, the morning line says so.

It works better locally, where Chrome is signed in: Claude in Chrome can read the profiles, which the cloud cannot, and TikTok and Instagram hide much of a profile from logged-out visitors anyway. If a local scheduled task takes over, disable the cloud routine (`update_trigger`, `enabled: false`) so there is one writer.

The yes or no integration, which the owner asked for last:

- Done on the page (version 13): a post record counts as decided, so the piece leaves the queue (the "N left" count and deck mode) and its "Needs your call" pill hides. Today's questions and the Up next and week slots for a posted piece hide too, and the count under Today follows.
- Done in the routine's prompt: it counts what still needs a yes or no and puts the number in the morning line.
- Left for the local session: port it into ssm (Job 1), and have `ssm sync` file the post records and drop the needs flag from any piece with a post or a decision. Then the generated "N things need a yes or a no" card and the "N things wait on you" line are right after a sync, not only live.

## Other open items on the board

- AD 2's effects 01 to 10 still wait on the owner's yes or no.
- AD 3's script: confirm "bled" and "Unlocked".
- Access to purify-ads, so work like this lands in `ssm/` directly.
- The voice list holds 52 numbered ideas. The ones tagged "Clergy check first" go to a priest before anything is built.
