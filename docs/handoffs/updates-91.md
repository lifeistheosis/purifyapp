# Baton: Updates 91 (the running line settled in the landing's frame; Community offline still)

Done 2026-11-15. Mend: `53d25c07`. Brief: Arbiter 14. Runs: `docs/handoffs/updates-91-runners/` (one export of `53d25c07`).

**Both mended and measured on the export.** The ten links: 0 findings with motion reduced (4 of 4 runs), and with motion on only the four layer crossings in passing that Updates 89 also listed (for the eye, not failures). Community offline: 0 layout shifts.

## Item 1: the running line, as proved

Proved on a dev server under the apps' agent with motion pinned, using `probe91.mjs line`: a rAF loop running before the move, as the walk's sampler does (`scripts/gate/inpage.mjs`), plus a MutationObserver on the line and the scroll event, each stamped with `document.timeline`'s time, which says which frame each fell in.

- **The walk's "582 then 530" is a read in requestAnimationFrame.** In Updates 89's runs it is kind `misplaced`, from the sampler's watch on new boxes ("drawn first at 0,582 then at 0,530"). No layout-shift entry came with it.
- **The order, Luke 10:25 from /bible/ (reduced):** the landing scrolls in its microtask (afa7603e). In the next frame (tl 6950.3) the scroll event fires, and the line's `onScroll` asks for an animation frame. That frame callback is queued after every one asked for before it. The sampler's callback, asked for a frame earlier, runs first and reads sy 3176 with the line shut ("v 1 of 42", fade 582). The line then opens later in the same frame (the mutation is stamped tl 6950.3). The next read has it open (530). This is the same picture Updates 89 read on its export, 2 of 2 runs.
- **James 1:19-20 from the anger collection at scroll 426 (reduced):** the line's first read, in its layout effect before the landing, is at the old page's scroll, so it opens with "v 5 of 27 · 2 min left". The landing then moves the page to 2043. The sampler in that frame still reads "v 5" at 2043, and the line takes "v 19 of 27" after it: the 27px.
- **The same with motion on:** the line opened at the old page's scroll and followed the arrival glide word by word ("v 6", "v 7", "v 8", "v 10" ... "· 2 min left" dropped near the end). That is the motion-on 27px, 1 of 4 runs.

## Item 2: Community offline, as proved

On dev with everything outside the dev server cut (`probe91.mjs community ... offline`), the same numbers as Updates 88's export: layout shift 0.0021, `div.mt-2` (the feed's box) from y 343 (h 399) to 347 (h 193).

- It happens in the commit where the feed fails: the tabs' outline gives way to the tabs, and the feed's outline to the card "We could not load the conversation just now."
- The tabs are not the cause. Outline and tabs are both 47.75px (the root is 17px).
- **The cause:** React keeps the outline's element (`div.pt-3`, padded) for the card (`div.mt-3`, a margin). The card's top margin met the box's own `mt-2` with nothing between them and collapsed through it into the larger: 12.75px instead of 8.5px. So the box was drawn 4.25px lower.
- The quiet card (no posts) had the same `mt-3`, so the same shift waited online on an empty feed.

## The mend (`53d25c07`)

- `lib/ui/readingPlace.ts`: `goOnArrival` marks a landing due from its call until it has run (`landingDue`). Just after the landing moves the page, it tells whoever hears (`onLanded`), in the same microtask (reduced) or frame (motion on). Even when the landing throws, the mark ends and the hearers are told.
- `components/bible/ChapterVerseStatus.tsx`: a shut line does not open while a landing is due. Its layout effect runs after `VerseFocusFlash`'s, since they are siblings in `ChapterScreen` in that order. The line settles from `onLanded` with `flushSync`, cancelling its pending frame. Its scroll handling (cd160f55) and the landing's timing (afa7603e) are unchanged.
  - Reduced: the chapter's first frame shows the line settled.
  - Motion on: the line stays shut through the arrival glide and opens once at its end, in its own 0fr to 1fr.
- `components/community/CommunityClient.tsx`: the offline card and the quiet card take no top margin of their own. Each now starts where the outline started, 4.25px higher than the card used to end up. Nothing else moves.
- Tried first and measured: padding the box (`pt-2`). The box stood still, but the reused element moved 12px inside it (0.0064). So that was taken out before the commit.
- `components/saints/MobileWorkPill.tsx` is untouched. A work's page lands through `components/saints/useWorkPlace.ts`, not `goOnArrival`, and its finding ("An Exact Expositio") stays at 0/4.

## Dev, after (the probe)

- Luke 10 (reduced): the first read is sy 3176, fade 530, "v 25 of 42 · 2 min left". The line's mutation is stamped one frame before the scroll event's frame.
- James 1 from 426 (reduced): the first read is sy 2037, fade 530, "v 19 of 27".
- James 1 (motion on): the line is shut ("v 1 of 27", fade 582) in every frame of the glide.
- Community offline: no layout shifts, reduced and motion on.

## Tests failing on the old code

With the three app files stashed and the tests kept, 8 of 10 cases fail:

- `lib/ui/__tests__/lineHearsLanding.test.ts`, 6 of 7 fail:
  - the line is told in the landing's own microtask, after the move and before anything queued after it;
  - with motion on, it is told in the glide's first frame;
  - a landing that throws still ends and is heard;
  - a line that stopped hearing is not told;
  - the chapter's line waits while a landing is due;
  - it settles from `onLanded` with `flushSync`.
  - The one that passes is the precondition that `VerseFocusFlash` arrives through `goOnArrival`.
- `lib/community/__tests__/feedBoxStill.test.ts`, 2 of 3 fail: neither the offline card nor the quiet card has a top margin of its own. The one that passes is the precondition (the states are found, the outline is padded).

## Checklist (on 5333d0e2, rebased to 53d25c07 over docs only)

- typecheck **0**; eslint **clean** on the 6 changed files.
- `npm run test:unit` **exit 0**: files 1223 passed, 1 skipped; tests 15312 passed, 9 skipped.
- `npm run build` **exit 0**, 6526 of 6526 pages. `readingPlace.ts` is shared. Public Supabase values were placeholders, since nothing reads them in a build.
- The push guard passed (40s).
- `node scripts/gate/export.mjs` **exit 0** on 53d25c07.
- **Not run:**
  - checkMock with pixels on Community offline at three widths, five palettes and fourteen looks. The card moved up 4.25px; nothing else drawn changed.
  - A tap of Try again. The walk taps only its named control there (Ask a Priest).

## The walk, after (export of `53d25c07`)

`walks91.sh` ran one walk at a time, with nothing else running:

- `--only` the six source screens and `--controls` the ten links: both readers, motion on then `--reduced`, twice each. That is 8 walks with every named control reached (14 tapped with motion on, counting the bars' own; 10 reduced), 0 errors and 0 control errors.
- Then `--only /community/` offline (no `--online`) with `--controls "Ask a Priest"`: both readers, motion on and reduced, twice each. That is 8 walks with 0 findings and 0 errors.

| finding | before (Updates 89 after) | after |
|---|---|---|
| reduced: fade 582 then 530, Luke 10, Ephesians 2, Psalms 4, Ephesians 4 | 4/4 each | **0/4 each** |
| reduced: fade 582 then 530, James 1 | 0/4 | 0/4 |
| reduced: running line 27px, James 1:19-20 | 1/4 | **0/4** |
| motion on: running line 27px, James 1:19-20 | 1/4 | **0/4** |
| motion on: running line, Ephesians 4:26-27 | 0/4 | 0/4 |
| reduced: running line, An Exact Exposition | 0/4 | 0/4 |
| reduced: page 51px, the four links | 0/4 each | 0/4 each |
| /bible/multi/ arrival from /, blank | motion on 1/4, reduced 1/4 | 0/4, 0/4 (Updates 90's mend is in this head, not mine) |
| Community offline, DIV 343 to 347 (Updates 88, `door88.mjs`) | 0.0021, 2 of 2 | **no layout shifts, 4 of 4** (reduced 2, motion on 2) |

- **Motion on, for the eye:** each walk lists 4 or 5 "layers in passing", the same crossings Updates 89 listed:
  - the top bar over the work's progress line and over Luke 10's;
  - the pill over the tab bar on both;
  - in 3 of 4 walks, the top bar over the work's outline ghost.
- `sum91.mjs` prints every walk's line from the JSON.

## Left

- checkMock with pixels and Try again tapped on Community offline (above).
- The work's line hears no landing, because a work does not land through `goOnArrival`. It measures clean (0/4). If `useWorkPlace` ever lands a place before the first paint, it should go through `goOnArrival` so that line hears it too.

## Budget

get_session read 91,664 from the start until the baton, then 267,362 at the end (it runs far ahead, as the brief says). My own count was about 155,000 at the end. Nothing new was started past 150,000 except this baton and the report.
