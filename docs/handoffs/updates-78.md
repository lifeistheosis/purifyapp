# Baton: Updates 78 (Community's held place closing on a direct open, 1.9)

Written 2026-11-15 by Updates 78 (session_01VuYTwbV3Ea4pNGwDbAYjL4), a fixer started by Arbiter 14 (session_01VuYTwdsjnmK235qQJH2FGJ). Item: on a direct open of /community/, the Pray together switch's held place closed and moved the sign-in line and every post up 77px (the pre-build gate's rule 1; Updates 77's after measure). Touched: lib/campaigns/doorPrepaint.ts (new), lib/campaigns/useCampaignsOpen.ts, app/globals.css (the door's rule), app/layout.tsx (one pre-paint script, outside my listed files, beside the five already there), lib/campaigns/__tests__/doorPrepaint.test.ts (new), lib/ui/__tests__/arrivesWhole.test.ts (one pinned line), docs/handoffs/updates-78-runners/doorwatch.mjs (new). Not touched: CommunityHead.tsx, CommunityClient.tsx, halves.ts, readyAhead.ts, prayAndTalk.test.ts, halves.test.ts.

## Cause, proved

- The head keeps the switch's place (`.community-door-place`, CommunityHead.tsx:94) while the answer is null (halves.ts, prayDoor "waiting"), and closes it on the house curve when the answer is no ("shut").
- The page's HTML always holds it: `useCampaignsAnswerForSwitch` answers null on the server, so the exported HTML of /community/ is drawn with the place before the app runs, for every reader.
- Updates 18's kept no (useCampaignsOpen.ts) is read only once the app runs. On a page switch that is the first frame; on a direct open the HTML has already drawn the place.
- On the export of bf862330, a new reader's direct open (no answer kept): the sign-in line moves up 17.2, 14.8, 12, 9.2... then the posts 23.7, between 1.9 and 2.8 s, 5 to 8 layout shifts, all on the section under the head (below).

## What the device can know before the first paint

- **The no the server gave this device last time** (the kept answer): on the website and in the apps.
- **On the website, a reader with no account, while the server opens campaigns to its admins alone.** The website is the server's own build: its server bakes its position (`serverOpening()`, opening.ts) into the HTML. At "testers" on the main web a reader with no account is told no. The test web lifts "testers" to "open", so it bakes false.
- **Not in the apps, for a reader with no answer kept.** A store build cut at "testers" asks a website that may already say "open" to every reader (flags.ts, release day steps 3 and 4). A device-alone no there would hold no place at the public launch, and the switch would push the page down for every new reader. So the apps decide only by the kept answer.
- **Ask ahead:** it is already done. `useAskCampaignsAtFirstLaunch` (AppFrame) asks at the first launch with no answer kept, so Community through any other screen already knows (the Chat door: 0). readyAhead.ts fetches no data by its own rule ("nothing from outside the bundle"), so I left it alone. Asking at sign-in would refresh a kept answer for a new account; it was not needed for this item and is not done.

## Done, with hashes

- **bf862330** (the mend and its test).
  - `lib/campaigns/doorPrepaint.ts`: a pre-paint script (no imports but a constant, as streakPrepaint.ts) that marks `<html data-pray-door="none">` where the device knows the answer is no (above).
  - `app/layout.tsx` runs it with the nonce, after STREAK_PREPAINT: `doorPrepaint(!IS_STATIC_EXPORT && serverOpening() === "testers")`. The apps' export bakes false, and the script checks the apps' user agent and Capacitor as well.
  - `app/globals.css`: `:root[data-pray-door="none"] .community-door-place { display: none; }`. The HTML's held place is not drawn under the mark.
  - `useCampaignsOpen.ts`: the switch's answer reads the same mark as a no (`readAnswerOrKnownNo`, `campaignsAnswerForSwitchNow`), so once the app wakes the door is "none" (no place) and nothing is taken away. A live yes still opens the door over the mark.
- **No other look changes.** A reader with no known no sees what they saw. When the answer is yes, the switch still comes into its place with its fade.
- **The test**, lib/campaigns/__tests__/doorPrepaint.test.ts (11 cases):
  - runs the script in a vm over stored devices: kept no marked on the web and in the apps; a website reader with no account marked; a session in a cookie (whole or chunked) or in localStorage left alone; never the second rule in the apps; a kept yes never read; blocked storage harmless.
  - holds the hook: unmarked is null ("waiting"), marked is false ("none"), and a live yes still opens.
  - holds the wiring: the layout's script with its nonce, and the CSS rule.
  - On the old code it fails (the module is absent); on the mend 11 of 11 pass.
- **arrivesWhole.test.ts** pinned Updates 18's exact line, `readAnswerOrKeptNo`. It now pins the same kept no with the mark beside it (reason in the test).

## The checklist

- `npm run typecheck`: 0.
- `npm run test:unit`: 1 failure on the first run (the pinned line above), fixed and rerun; the run before that fix: 1205 files passed, 1 skipped, 15222 tests passed.
- eslint on every changed file: clean.
- `npm run build` (web): exit 0.
- The push guard on bf862330: every check passed.
- The export: `node scripts/gate/export.mjs`, cut from bf862330, exit 0. Its HTML carries the apps' form of the script (no website rule).
- checkMock and the palettes: not run. No look changes; the held place is hidden only where it would have closed.

## The after measures

On the export of bf862330, 390x844, CPU 4x, online (main web), with `doorwatch.mjs` (`out <jsonl> <spec>...`):

| Spec | What | Sign-in and posts moved | Layout shifts |
|---|---|---|---|
| `direct@en@4@1`, `@2`, `@3` | new reader, nothing kept | 77px in 12 to 24 steps, 1.9 to 2.8 s | 8, 5, 5 |
| `direct@ar@4@1` | the same, in Arabic | the same | 7 |
| `direct@en@4@1@keptno` | the server's no kept | 0 (sign-in first seen at y 231, posts at 343 and 617) | 0 |
| `direct@ar@4@1@keptno` | the same, in Arabic | 0 | 2 (see below) |
| `door@en@4@1` | the Chat door | 0 | 0 |
| `direct@en@4@1@open` | yes, intercepted (asked 1) | 0 | 0 |

- **The new reader's direct open in the apps still moves**: the case left (below), and expected.
- **The kept no's direct open**: no place drawn. This is the realistic state in the apps once the first launch's ask has come back. Before the mend, the HTML drew the place here and the app took it away as it woke.
- **Open:** the switch comes into the held place with its fade. The sign-in line stands at y 308 and the posts at 420 and 694 from their first frame, and nothing moves.
- **The two Arabic shifts** are in the new reader's Arabic run as well (1238 and 1675 ms there; 1275 and 1789 ms here). They are scored 0.0001 and 0.0103, on the sign-in link "تسجيل الدخول" and its text, with no change in their top or height: a sideways move or a change in width, not the door. Not proved what; not mine.

## The deep Back measure (`back@en@4@1`)

- Opened /community/ with the no kept, put post 20 in the middle (scrollY 6254, its top at 52.3), and tapped its first control (the author's picture, no label).
- The profile opened as a dialog over the feed. scrollY went to 6251 and post 20's top to 55.3: a 3px move as the profile opened. Measured once; cause not read.
- Then Back (history.back): it left Community for "/" (0 posts). The profile sheet adds no history entry, so a browser's Back does not close it; in the apps the hardware Back goes through the app's own handler, which this runner cannot drive.
- So whether the reader returns to post 20 with nothing stepping is **not measured**. That needs the Back the app gives (the sheet's own close, or a runner that fires the app's back handler).

## Left, and for whom

- **Cases where a held place still closes** (the device cannot know):
  1. In the apps, a reader with no answer kept whose first screen is Community: a link or notification into Community before the first launch's ask has ever come back, or after storage was cleared. This includes the first launch of 1.9 after an update from 1.8, if a notification opens it on Community. It closes only while the server says no to that reader. At the public launch (main web open) the answer is yes and nothing moves.
  2. On the website, a signed-in reader with no answer kept (rare: the first page's ask keeps one).
  3. A kept yes the server now answers no (an admin taken off the list, or the main web moved back).
- **Kept no, then a yes** (Updates 18's trade, unchanged): the switch arrives into no place and pushes the page down once. With the website rule this can also meet a website page cut before a move to open.
- **For the arbiter to route:** the 3px move as a profile opens deep in the feed; the Arabic sign-in link's sideways shift; the deep Back through the app's own Back, unmeasured.
- One export, no second: the first showed no fault in the mend.
