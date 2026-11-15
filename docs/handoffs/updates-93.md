# Baton: Updates 93 (the offline cards' Try again)

Done 2026-11-15. Brief: Arbiter 14. Mend: `e19914b2`. Runs: `docs/handoffs/updates-93-runners/`.

## The cause, as proved

Proved on a dev server under the apps' agent, with motion pinned and every address outside the app aborted, as Gate 4 ran. The probe is `probe93.mjs`: a requestAnimationFrame sampler started before a real tap, with each frame stamped by `document.timeline`. The records are `probe-before-on.txt`, `probe-after-on.txt` and `probe-after-reduce.txt`.

- **/campaigns/** (and its four pages, all one gate): Try again called `askCampaignsAgain`, which set the answer back to null and told every page. So `CampaignsGate` drew the door's waiting line (`DoorAsking`, "Loading…") in the card's place. With no signal the read fails at once, so the card came back the next frame. Card gone at tl 6907.9 (main 7 to 3 elements), back at tl 6924.6. 2 of 2 taps.
- **/shop/stores/** (the same hook under /shop/ and a category): `useAsyncData`'s `reload` set `loading: true, error: null`, so the page drew its skeleton for 2 frames (tl 4134.1 to 4167.5, 52 to 82 elements). 2 of 2.
- **/community/moderate/**: the handler set `{ state: "loading" }` before `load()`, so the skeleton rows showed for 1 frame (13 to 36 elements). 2 of 2.
- **/community/**: the feed's card stays (its reload keeps the result), but the "No signal" line went in under the button at the first tap. It is two lines at 390, 43px with its margin 56px, so the card grew from 193 to 249px in one frame and "Speak with charity" dropped from 569 to 625. The second tap changes nothing, because the line is already there.
- **What the walk saw that Gate 4b's runner did not:** the same thing, judged by another rule. 4b's own record has the paragraph dropping 56px ("P y 550 to 606"). Its pass rule was the button's own top (0px, "nothing above the finger moves"), so the paragraph went down as a layout shift below the finger. The walk judges every box on the screen, and with motion on a section moving in one frame is rule 1. With motion reduced the walk allows it as an in-page change at once, which is why the 56px was a fault with motion on only.

## The mend (`e19914b2`)

The rule, one for every offline card: **Try again asks behind the card it was tapped on.** No waiting state is drawn in the card's place. Only the answer takes it: the page when the server is reached, the same card when it is not. So a retry with no signal changes nothing on the screen. Words a failed retry adds come into a place the card holds from its first frame. `lib/ui/__tests__/retryKeepsCard.test.ts` finds every Try again in `components/` and holds the rule.

- `lib/campaigns/useCampaignsOpen.ts`: `askCampaignsAgain` asks with `ask(true)` behind the standing answer, and no page is told it is asking. This also stops Community's switch reading null for a frame during a re-ask.
- `lib/shop/useAsyncData.ts`: `reload` only re-runs the read. All 13 shop pages with `ShopError` share it.
- One line dropped from each Try again: moderation, the profile sheet, the account gate, the merchant gate, blocked readers, muted readers, Pray together's campaigns, the campaign board and My campaigns. Each of those reads already sets its card or its answer when it comes.
- The EIKON Box: the reset is dropped too, and a read that answers now clears the error itself (before, only the tap cleared it).
- Community's feed card, and only that card: the "No signal" line's place is held from the card's first frame by the same words, unseen (`invisible`, aria-hidden), in a one-cell grid. Each tap's words come into that cell with `rise-in`, the house's motion; with motion reduced they come at once and still, by its rule in `app/globals.css`. The live region now stands from the first frame, so each tap's words are heard as they come. The line shows only while the feed was not reached, so with the network there nothing changes.

**Left, by name:**
- A post's replies' Try again (`loadReplies` in `CommunityClient.tsx`) sets "loading" before its read. The brief gave me only the feed's card in that file, and the replies' waiting rows grow and fold the card with the page's glide. It is listed in the test's `LEFT`, and that test fails once the replies are mended, so the list stays true.
- Looked at and not the pattern: the gift page (it keeps its line standing, since Gate 2.0), the ambassador dashboard (keeps its card), the campaign notes (keep their result), the pending reply's Try again (a send), the admin panel (stashed out of the apps) and `app/error.tsx` (React's boundary reset).

## Tests failing on the old code

With the 13 app files stashed and the tests kept, 8 cases fail:
- `lib/ui/__tests__/retryKeepsCard.test.ts`, 4 of 7: the scan names nine handlers that set a waiting state (the account gate, blocked, muted, the campaign board, My campaigns, Pray together, moderation, the profile sheet, the merchant gate); the shop's reload sets loading; `askCampaignsAgain` tells the pages it is asking; the EIKON Box's read does not clear its error.
- `lib/campaigns/__tests__/doorStates.test.ts`, 2: the door reads "asking" after the tap, and the page is shown "asking" before "unreached".
- `lib/today/__tests__/offlineAnswers.test.ts`, 2: the line is drawn only after a tap, so its place is not held.
- `lib/campaigns/__tests__/doorHold.test.ts:93` pinned the old "asking" and now holds "unreached". It still checks that nothing holds once answered.

## Checklist

On the mend before the rebase (`1f3af824`), then rebased to `e19914b2` over Updates 92's three commits, none of them in these files:
- `npm run typecheck`: **0**.
- eslint on the 17 changed code files: **clean**.
- `npm run test:unit`: **exit 0**. Files 1,224 passed and 1 skipped; tests 15,320 passed and 9 skipped. (The first run had 1 failure, `doorHold.test.ts:93`, the pinned "asking" above; it is mended in this commit.)
- `npm run build`: **exit 0**, 6,526 of 6,526 pages. Two shared files changed (`useAsyncData.ts`, `useCampaignsOpen.ts`); no CSS changed. The public Supabase values were placeholders, since nothing reads them in a build.
- The push guard passed (31s).
- **Not run:** checkMock with pixels at three widths, five palettes and fourteen looks. Nothing drawn changed except Community's offline card, which is now its after-the-tap height from its first frame (the words unseen in the held place).

## The walk, after

One export of `e19914b2` (`node scripts/gate/export.mjs`, exit 0; the key read into its own command, and 0 key-like strings in its log). `walks93.sh` ran one walk at a time, with nothing else running. Records: `updates-93-runners/walks/` (the JSON gzipped, and `summary.txt` from `sum91.mjs`).

- **No network**, `--only` Gate 4's ten screens, `--controls "Try again"`: both readers, motion on and `--reduced`, twice each. That is 8 walks, each with 10 screens and **10 taps, one Try again on every screen**, 107 controls reached, **0 findings**, 0 unsure, 0 errors and 0 control errors.
- **`--online`**, the same screens: both readers, both lanes, once each. That is 4 walks. The pages load as themselves, so no card and no Try again is drawn (0 taps). They reached 331 controls, with **0 findings** and 0 errors.

| finding (Gate 4, the new reader, 3/3) | after (8 offline walks, both readers) |
|---|---|
| flash on Try again, /campaigns/ and its four pages, motion on and reduced | **0/8** |
| flash on Try again, /shop/, /shop/category/all/, /shop/stores/ | **0/8** |
| flash on Try again, /community/moderate/ | **0/8** |
| /community/ jump 56px on Try again, motion on (reduced: allowed) | **0/4 motion on, 0/4 reduced** |

The dev probe before and after agrees: see the cause above and `probe-after-*.txt`. After the mend, no waiting state is drawn on any of the four screens in either lane, 2 of 2 taps. Community's card is 249px from its first frame, and the paragraph below stays at 625. The only change on /campaigns/ with motion on is the house's 1px tap press.

**Not done:** a second export (none was needed), checkMock with pixels on Community's offline card (above), and the replies' card (left, above).

## Budget

get_session read 102,452 from the first step to the end: it stopped moving after the first turn, as the brief says. My own count was about 135,000 when the mend was pushed and about 160,000 at the end. Past 150,000 I started nothing new, only the brief's own steps: the walks' records, this baton and the report.
