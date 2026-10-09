# SSM board: hand-off for a local session

Written Oct 8, 2026 by a cloud session that could not reach the purify-ads repo. It is for the owner's local Claude, to finish when the cloud session's limit runs out.

## Where things stand

The live board is https://claude.ai/artifact/JEDHhLDpXNKDbWHCURNDjd, at version 19 (`1791504417-a30d`). Versions 8 to 19 were edited by hand on the page, not in `purify-ads/ssm`. The next `node ssm/ssm.mjs sync` that rebuilds and publishes the page will drop all of it unless it is ported first. The board's store carries the same warning (`ideas/open-2026-10-08`).

What the owner asked for, in order:

1. A voice list for recording MP3s: every idea numbered, with a mark per idea once its audio is done.
2. The old look was "super vibe-coded" (the purple stripe on the left most of all): redesign it with Impeccable (`pbakaus/impeccable`). RUBRIC came first, then the final call: "black and white, more minimal, optimized for desktop".
3. "Summarize TikTok, Instagram, YouTube to their logos" and "I don't want to scroll down and see a bunch of titles and a bunch of text".
4. Every morning: "if we posted a video, just clear off the questions for that video", then "integrating the routine with the things that need a yes or no".
5. A bigger Today title, with "a looping animation" of the stats going in and out beside it.
6. "Instead of a checklist ... make it a pop-up": Go through them opens one card at a time in the middle of the screen, with smooth animations in and out.
7. "Remove it from the Today screen ... leave it in the buttons": Today keeps the title, the numbers, two buttons and Up next. The list of asks moves behind the second button.
8. "Today should refresh my mind. Every single day, something new. I want what performed, what underperformed, how yesterday did, how today's doing ... ratios, percentages, make it look nice", with "clean animations" on the main section only. Today became the daily brief (version 17).
9. "Remove the clergy check notification" (version 18): the "Clergy check first" label is gone from the voice list and from Today's pick, and the "Clergy check" lines are left out of the What to say text shown under each idea. The ideas keep their `clergy` flag in the store, unshown, so it is one line to bring back.
10. "I don't see transitions. I don't see animations. I don't see things glowing. I want to see that ... a little flair ... nothing in the background" (version 19): the motion pass below.

## Job 1: port the page changes into ssm

Files in this folder:

- `board.css` is the whole stylesheet of version 13. It replaces the generated one. The font link becomes IBM Plex Sans (400, 500, 600) and IBM Plex Mono (400) instead of Inter.
- `main-script.diff` is every change to the page's main script against what ssm generated: the ideas snapshot reads the voice fields, `paint()` calls `paintVoiceMarks()` and `paintToday()`, a post record counts as decided, the new functions (`postedOn`, `paintToday`, `voiceRows`, `mk`, `pfIcon`, `paintVoice`, `paintVoiceMarks`) and the click branches `vo` and `vo-hide`.
- `tabs.js` is a second script after the main one. It shows one section at a time and sends every `#link` to the tab that holds its target. Without it the page shows every section, as before.
- `today-stats.js` is a third script: the numbers that go in and out beside the big Today title (views, followers, followers per platform, likes, the best post, posts on record, days since the last post, pieces in the works, voice lines recorded). It reads them all from the page itself, pauses under the pointer and in a hidden tab, and holds still for reduced motion. Its CSS is the last block of `board.css`.
- `review.js` and `review.html` are Go through them as a pop-up: a `<dialog>` (placed as the last child of `<main>`, so a hidden tab never hides it) showing one thing that needs a yes or no at a time, with its video, title, platforms, why, opening lines and buttons. Its buttons press the piece's own buttons, so every answer saves through the store exactly as before; it writes nothing itself. It takes over the `deck-on` click in the capture phase, so the old deck mode no longer opens. Changes keeps the card open for a note; any other answer moves to the next open card. Arrow keys move, Esc closes. Its CSS sits in `board.css` after the stats ticker.
- `today-dash.js` is a fifth script (version 17): Today as the daily brief. It draws, inside `#waiting`:
  - one fact from the numbers beside the two buttons, a different one each day (picked by the date, with Next to see the others), from about 16 sentence builders: the best post against its usual, what wins by kind, opening, length, day and hashtag, the top 3 share of views, the over and under split, each platform's share of views and followers, the usual post by month, saves and shares in every 1,000 views, engagement, days since the last post, TikTok against YouTube, views per follower, and Instagram posts still without numbers;
  - Platforms: a row per platform and a total (followers and views with their share of the whole, posts, the usual post, engagement, the last post), with the change since the reading before when there is one;
  - Yesterday and today: posts up, yes or no answered, voice lines recorded and ideas added, from the store's own timestamps, then views and followers gained since the reading before, the posts that gained most, and the days since the last post;
  - Every post against its usual: a dot per post on a log line from 0.1 times to 30 times its own platform's usual post (by likes on Instagram, which hides views), with the under, between and over split as percentages;
  - Overperforming and Underperforming: the five furthest from their usual each way;
  - Creatives to make: the best of each What is working group against the usual TikTok post (with what trails), the first three of Worth remaking, and a pick from the idea list that changes each day (Your pick first, then ideas with their voice recorded), with a link to its row in the voice list.
  It reads only the page (the copy text of Every post, which carries full dates and every number, joined to the table row at the same position for the piece; the account cards; the What is working groups and remakes) and the store (`decisions`, `posted`, `state`, `ideas`, `days`). It writes one document on its own: the page's reading of its numbers, to `days/<the date the numbers were read>`, once, when that document does not exist yet. Each panel plays its entrance when it comes into view, after the fonts are in, and again every time Today opens (the `ssm:today` event from `motion.js`): numbers roll, rows rise out of a blur, bars grow and flare at the tip, and on Every post against its usual the lines draw down, a scan line sweeps across and each post pops in where it landed, after which the posts at twice their usual or more keep a pinging glow (a lit halo in dark mode) and the best and the worst carry their number. The daily fact and the pick arrive word by word. Nothing moves while the Animations switch is off, and every number keeps its true value in the page while its row waits. Its CSS is the last block of `board.css`.
  - Class names: the board already uses `.tick` (the posted checklist) and `.g` (week chips), which this script first collided with. Its axis ticks are `.axt` and its group labels `.wg`. Check any new generic class against the generated stylesheet.
- `motion-pref.js` and `motion.js` (version 19) are the motion pass. `motion-pref.js` must run before every other script: it sets `data-motion` on the root from the board's own Animations switch (`localStorage` key `ssm.motion`, on unless set to "off") and opens `window.ssmGate` once the page and its fonts are in. The board no longer stands still because the device asks for reduced motion: the owner asked for the motion twice and, before this, a device with Reduce Motion on showed none of it. Every `@media (prefers-reduced-motion)` block in `board.css` became rules under `:root[data-motion="off"]` (or `:root:not([data-motion="off"])`), and `today-stats.js`, `review.js` and `today-dash.js` read the switch through a `still()` function, so turning it off stops everything at once. `motion.js` runs last: a part of the board rises into place when its tab opens, one marker slides between tabs in the sections list, Today gets its `ssm:today` event each time it opens, the numbers beside the Today title carry a live dot, the count on Go through them pings, and the header carries the switch. Hover: the big buttons lift, the panels sharpen, the rows slide. Nothing moves in the background. Its CSS is the last block of `board.css`.
- Today's two buttons (version 16): "Go through them" with the count of open decisions, and "Questions for you" with the count of Today's other asks, opening the same pop-up in a second mode (one ask per card, with an Open it button that goes to its tab). The asks list, the "N things wait on you" line and the card's heading and text are hidden, not deleted, so the counts and the Today clearing still read them. Asks that repeat a decision card are left out: one linking to a `.needs` piece, and ssm's summaries ("need your call", "are with you"). The ssm template should give the button card the class `decide-card`, which version 16 adds by hand.
- `build/1` to `build/12` are the exact transforms applied to the generated page, in order. Their paths point at the cloud scratchpad, so adjust them before running. Read them for the HTML changes the diff does not show:
  - the voice list block at the top of `#ideas`, and the morning line under the Today heading;
  - emoji taken out of section titles, nav links, buttons, summaries, pills and options (better: stop writing them in the ssm templates), and blank thumbnails labelled Edit, Saved, Text or Audio;
  - platform names replaced by their marks: `<span class="where pf" role="img" aria-label="TikTok" title="TikTok"><i class="ico ico-tiktok"></i></span>`, with class `where on pf` and label "Posted on TikTok" once posted; platform pills become `.pfh`, profile links `a.pfa` with an `aria-label`, table cells and headers `<i class="ico ico-x" role="img" aria-label="X">`; "TikTok: 29 on" becomes the mark plus "29 on", "For Instagram 6" becomes "For" plus the mark plus "6", "Next on TikTok" becomes "Next on" plus the mark;
  - the nav loses its "Voice list" link, because the list is the top of Ideas;
  - Today (version 17): the decide card and a new `<div class="lede" id="dash-lede" hidden>` share a `<div class="dash-top">`, and `<div class="dash" id="dash" hidden></div>` follows it, before Up next.
- The marks come from the app: `components/ui/icons/TikTok.tsx`, `components/ui/icons/Instagram.tsx` and the YouTube case of `components/community/profile/SocialLinkIcon.tsx`. The Shorts mark is drawn to match. All four sit in `board.css` as CSS masks.

What the page reads from the store, so `ssm sync` can file it:

- `ideas/*` carry `n`, `kind` (myth, series, history, shorts, long, note), `hook`, `pf`, `pick`, `clergy`, and `items` for the batch ideas.
- `state/vo.<idea>` or `state/vo.<idea>.<item>` are the MP3 marks, `{kind: "vo", done}`.
- `posted/<piece>.<platform>` are post records, from the owner's tap or from the morning check (`by: "morning check"`).
- `state/morning` is the morning line, `{kind: "morning", text, at}`.
- `days/<YYYY-MM-DD>` is a reading of the numbers: `{kind: "day", date, by, at, followers: {tiktok, instagram, youtube}, views: {tiktok, youtube}, likes, posts, pv: [{a: "p-<piece>", pf, v}]}`. `by` is "board" (the page, from its own numbers, once per new read date) or "morning check". Today compares the newest reading with the one before it, field by field, and prefers a reading newer than the page's own for followers and views. A platform is left out of `views` unless every one of its posts was read, because a partial sum would read as a drop.

Check after porting: Impeccable's detector on the built page (`impeccable detect --json <page>`) gave 0 findings at versions 16 and 17, against 92 on the old page. Test the tabs, the voice list and Today against a stand-in store, by stubbing `window.claude.use("db")`.

## Job 2: the morning routine and the yes or no queue

The cloud routine is "Purify board morning check" (`trig_01L3rqfMYKCNYqkixdMJyhHh`). It runs daily at 7:51 Eastern, in a fresh session each time. It reads the last check from `state/morning`, looks at TikTok @purify.app, Instagram @purifymylife and YouTube @purifymylife, matches new posts to board pieces, writes `posted/<piece>.<platform>`, counts what still needs a yes or no, and leaves the morning line.

The cloud environment cannot reach tiktok.com, instagram.com or youtube.com today, because of its network policy. Until the owner allows them, the morning line says so.

It works better locally, where Chrome is signed in: Claude in Chrome can read the profiles, which the cloud cannot, and TikTok and Instagram hide much of a profile from logged-out visitors anyway. If a local scheduled task takes over, disable the cloud routine (`update_trigger`, `enabled: false`) so there is one writer.

The yes or no integration, which the owner asked for last:

- Done on the page (version 13): a post record counts as decided, so the piece leaves the queue (the "N left" count and deck mode) and its "Needs your call" pill hides. Today's questions and the Up next and week slots for a posted piece hide too, and the count under Today follows.
- Done in the routine's prompt: it counts what still needs a yes or no and puts the number in the morning line.
- Done in the routine's prompt (version 17): step 6 writes the day's numbers to `days/<date>` from what it read, so Today shows the change since yesterday. Until the platforms can be read, the only reading is the page's own, and Today says when the numbers were read.
- Left for the local session: have `ssm sync` write `days/<read date>` itself whenever it reads new numbers (today the page writes it only when it is opened), and port it into ssm (Job 1), and have `ssm sync` file the post records and drop the needs flag from any piece with a post or a decision. Then the generated "N things need a yes or a no" card and the "N things wait on you" line are right after a sync, not only live.

## Other open items on the board

- AD 2's effects 01 to 10 still wait on the owner's yes or no.
- AD 3's script: confirm "bled" and "Unlocked".
- Access to purify-ads, so work like this lands in `ssm/` directly.
- The voice list holds 52 numbered ideas. The owner had the clergy check label taken off the board (version 18); nine ideas still carry `clergy: true` in the store. `docs/editorial-standards.md` still sends doctrinal framing to clergy review before it ships, so a script built from one of those ideas goes through that review as before. One fact note stays in the Psalm 137 idea ("not in Purify: confirm with clergy"), because that claim is not in the app yet.
