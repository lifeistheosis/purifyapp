# Baton: Updates 94 (two cuts, and the replies' Try again)

Done 2026-11-15. Brief: Arbiter 14. Mend: `2f707b4f` (rebased over Updates 95's `b20824d5`). Runs: `docs/handoffs/updates-94-runners/`.

## The causes, as proved

Proved on a dev server under the apps' agent, with motion pinned and every address outside the app aborted, as Gate 4 ran. The probe is `probe94.mjs`: a requestAnimationFrame sampler started before a real tap, each frame stamped by `document.timeline`, with every View Transition's start, ready and end (the page's own `startViewTransition`, wrapped before the app loads), the loading outline and its fading copy, what `<main>` holds, the scroll and the words at the top of the screen. Times below are the dev server's, so slower than the export's; the order is what was proved.

- **Item 1, "Read it in Purify" (/prayers/bows/ to Canon XC of Trullo).** The link is `/councils/third-constantinople/the-canons-of-trullo#s91`, and the page writes all 102 canons (1,578 elements, 99,069 characters). **What the switch waits for:** that page, past the 200ms grace (`lib/ui/loadingGrace.ts`), so the route transition carries the bows guide into `app/(app)/councils/loading.tsx`, the councils' gallery outline (+467ms). **What it then draws:** the page in the outline's place (+1150ms, under the outline's fading copy), then three scroll steps a frame or a few apart: y 324 (the address's `#s91`), y 0 one frame later (`useLanding`'s first landing at a section's top, `components/saints/useWorkPlace.ts`), y 447 about 120ms later (`components/reading/QuoteFocus.tsx` bringing the quoted words up, "at once", two frames or a 120ms debounce after the text lands). 2 of 2 taps.
  With the grace held at 5 s (a dev-only edit, reverted), the page came inside the switch itself, with no outline, and **still stepped twice**: y 324 to 0 mid-transition, and 0 to 447 on the transition's last frame. So the outline is not the whole cause: the landing's steps are a cut whichever way the page arrives.
- **Item 2, "See all" (/reading/).** A page switch in name only: `seeAll="?length=under20"` is a link to the same page. The router made a soft visit (the fifth of a second Gate 4 measured), then `AddressSync`'s layout effect opened the room's search (`components/reading/ReadingRoom.tsx`, `onAddress`) in one frame: the rows unmount and the list mounts, with nothing moving it. `RouteTransition` pictures only a change of path, and /reading/ is not a page named by its query. So it is a row that opens in the page, and the house's way is an in-page move.
- **Item 3, a post's replies' Try again.** `loadReplies` set `"loading"` before its read, and the same function served the opening and the retry, so Try again swapped its card for the waiting rows and (with no signal) the card came back.

## The mend (`2f707b4f`)

- **Item 1.** The page opens at the words in one step. `QuoteFocus` makes its first look in a layout effect, after the router's scroll in the same change and inside a page switch's own picture, and, for a page that came after its outline, in the mutation that brings the words (before that change is painted); later looks keep the 120ms debounce. The reader's first landing at a section's top yields to the quotation once (`takeQuoteLanding` in `lib/reading/quoteFocus.ts`, taken with the request, 10 s at most). After: behind the outline's fading copy the page lands at y 447 in the frame its text is drawn, and nothing steps after; inside the switch, the same; reduced, at once and still. **Files outside the brief's list, said here:** `components/reading/QuoteFocus.tsx`, `lib/reading/quoteFocus.ts`, `components/saints/useWorkPlace.ts` (the causes are there; no running chat holds them). `MetanyGuide.tsx` and the document page needed no change.
- **Item 2.** `openListInPlace` in `components/reading/CoverRow.tsx`: a See all that is a query on the room is opened with `movePageUntil(() => pushState(null, "", href), awaitArrival(SEE_ALL_ARRIVED))`. The rows say the list has come from their layout effect's clean-up, in the change that draws it, so the screen as it stood is held until then and the two cross-fade; reduced, at once and still. The state is `null` on purpose: with the router's own state (the room's own writes pass it) Next does not hear the address and the room never opened (the first try, caught by the probe). A See all that is a path (the councils' shelf) is left to the router.
- **Item 3.** `readReplies(again)` is the read and the landing; `loadReplies` (the opening, and a notification's) sets `"loading"` and reads; `askRepliesAgain` (Try again) reads behind the card, and a read that fails again lands with no move. `retryKeepsCard.test.ts`'s LEFT is empty.
- No stylesheet change; no other look changes.

## Tests failing on the old code

With the five app files stashed and the tests kept: **7 of 12 fail**.
- `lib/ui/__tests__/landsOnceAndListInPlace.test.ts`, 5 of 5: the quotation's landing is taken once; QuoteFocus looks in a layout effect and as the words are drawn; the reader's top landing yields; See all moves in place, held until the list is drawn; the rows say so as they leave.
- `lib/ui/__tests__/retryKeepsCard.test.ts`, 2 of 7: the scan with LEFT empty names `loadReplies`; the replies ask again behind their card.
- `lib/ui/__tests__/gateRunOne.test.ts:85` pinned the old handler text (`void loadReplies()`) to check the button's 44px class; it now reads `void askRepliesAgain()`, the same button and class.

## Checklist

- `npm run typecheck`: **0**.
- eslint on the 7 changed code and test files: **clean**; the push guard's eslint on 8 files: ok.
- `npm run test:unit`: **exit 0**, files 1,226 passed and 1 skipped; tests 15,332 passed and 9 skipped. (The first run had the one `gateRunOne` failure above, mended in the commit.)
- `npm run build`: **exit 0**, 6,526 of 6,526 pages (shared files changed: `lib/reading/quoteFocus.ts`, `useWorkPlace.ts`, `QuoteFocus.tsx` in the frame). The public Supabase values were placeholders.
- The push guard passed (40s).

## The walk, after

One export of `2f707b4f` (`node scripts/gate/export.mjs`, exit 0; the key read into its own command, and 0 key-like strings in its log). `walks94.sh` ran one thing at a time, with nothing else running. Records: `updates-94-runners/walks/` (the walks' JSON gzipped, their text, `chain.txt`, `mock94.jsonl`).

- **`--online`, `--only /prayers/bows/,/reading/,/community/`, `--controls "Read it in Purify|See all"`**: both readers, motion on and `--reduced`, twice each. That is **8 walks, every one exit 0**: each tapped 5 "Read it in Purify" on /prayers/bows/ (Trullo's among them, found by its address in the JSON) and 7 "See all" on /reading/, with **0 failed and 0 unsure** on all three screens, the switch into each included. Left for the eye only: the other guide links' outline frames (Basil's On the Holy Spirit: 4 frames of outline, a one-frame dip at a fade's foot), as the walk lists them.

| finding (Gate 4, 3/3 offline, 2/2 online) | after (8 online walks, both readers, both lanes) |
|---|---|
| "Read it in Purify" cut, 54% in one frame at 991ms | **0/8** |
| "See all" cut, 51% in one frame at 195ms | **0/8** |

- **A post's replies' Try again with no network** (`replies94.mjs`: the feed read online the walk's way, then every address outside the bundle aborted, a post's replies opened to their card, Try again tapped twice with a frame sampler): motion on and reduced, **0 frames changed in 4 of 4 taps, no waiting state drawn**; the card stands at the same box (102px, its three elements) throughout. The chain's first four runs of this probe launched without the walk's main-web routes, so the feed drew its offline card and no post: those are dropped, and the probe now routes the main web as the walk does (`replies-*-3.txt`).
- **Item 4, checkMock `{ pixels: true }` on the feed's offline card** (`offline94.mjs`: Gate 4b's runner on `EVERY`, the 21 palettes and looks), the open reader at 390, 800 and 1032, en and ar: **0 failures before the tap and 0 after, 6 of 6**. The button is 104 by 47 (128 by 47 in Arabic), the finger meets it, it moves 0px on the tap, and the line comes into its held place. The layout shifts recorded (2 in English, 4 in Arabic) all fall 21 to 142ms before the tap, during checkMock's own pass; none after it.

## Left

- **What the switch waits for, itself.** The Trullo page still writes all 102 canons and shows one, so the switch to it can outlast the grace and show the councils' gallery outline (the wrong shape for a book) before the page. After the mend the page takes the outline's place in one step under its fading copy, and the walk passes it; making the page lighter, or its own outline, is a larger change than this brief's.
- Not run: a second export (none needed), and a phone walk.

## Budget

get_session read 91,687 from the first step to the end: it stopped moving after the first turn, as the brief says. My own count was about 150,000 when the cause was proved and the mend begun, and about 200,000 at the end, so past 150,000 I did only the brief's own steps (the mend, the checklist, the export, the walks, this baton and the report).
