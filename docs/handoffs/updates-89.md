# Baton: Updates 89 (a verse link's chapter in place from the first frame; the /bible/multi/ blank)

Done 2026-11-15. Mend: `afa7603e`. Brief: Arbiter 14. Runs: `docs/handoffs/updates-89-runners/` (one export of `afa7603e`).

**Partly mended.** The chapter now stands at its verse from its first frame, but on the export the running line still opens one frame after it (the fade 582 then 530 on four chapters). The /bible/multi/ blank is proved and not mended.

## The causes, as proved

Measured on a dev server under the phone's user agent with the app's motion pinned (rAF reads, layout-shift entries, a MutationObserver on `<main>`), then on the export.

1. **The landing came after the first paint** (reduced). `VerseFocusFlash` landed from a passive effect and then a frame (`useEffect`, then `requestAnimationFrame`). Before that, the chapter was drawn where Next left it. For a range (`#v19-20`), Next does not scroll, because no element carries that id ("a missing hash target is still a handled scroll intent"), so the page keeps the scroll of the page left: dev, James 1 drawn at y 426, the old page's scroll, then at 2043. For a single verse (`#v25`, Luke 10), the intent was used up by the loading state's commit, so the chapter was drawn at y 0 and then stood at 3176.
2. **The running line heard of the landing a frame late** (reduced). The landing scrolled inside a frame's callbacks, after that frame's scroll steps. So the line (cd160f55: it settles from the scroll event's frame) moved one frame after the page. Dev, before: Luke 10 and Ephesians 4 were at the verse with the line shut (fade 582), then open (530), and the pill's row shifted 15px. James 1 was at the verse with "v 5 of 27 · 2 min left", then "v 19 of 27": the line moved 27px sideways (a layout-shift entry).
3. **Nothing corrected the landing on these chapters.** On dev and on the export the page did not move after the landing (James 1 2043, Luke 10 3176, Ephesians 4 2913). The "first place and then a corrected one" was cause 1 (the old page's scroll, then the verse). `holdAtReadingPlace` did not fire.
4. **The /bible/multi/ blank** (not mended). On the export, Next swaps in the new layout's `<main>` empty (t81). The page's own section comes 360ms later (t459), twice in two runs. No route outline (`[data-route-loading]`) was ever there. The page is `<Suspense fallback={null}>` around `MultiVerseClient` (`app/(app)/bible/multi/page.tsx`): the boundary is new on arrival, so it draws its fallback, nothing, while the client module loads. Dev did not show it, even with the late chunks held back 600ms (the dev router waits for them).

## The mend (`afa7603e`)

- `VerseFocusFlash` runs in a layout effect. On arrival with motion reduced, it lands through `goOnArrival` (`lib/ui/readingPlace.ts`), which runs it in a microtask: after the whole commit, Next's own scroll for the route included, and before the browser paints. It is no longer inside a frame's callbacks.
- With motion on, the landing still glides from the next frame, as before. A change of the hash on the page still waits a frame. A landing never runs for a page that has already gone (`live`).

## Tests failing on the old code

`lib/ui/__tests__/verseLanding.test.ts`, 5 cases, all 5 fail before the mend:

- with motion reduced, the landing runs in a microtask and never in a frame;
- with motion on, it glides from the next frame;
- it is set off from a layout effect;
- an arrival goes through `goOnArrival`, and only a change of the hash waits a frame;
- a page already left never lands.

## Checklist

- typecheck 0.
- Unit suite: 1216 files passed (1 skipped), 15288 tests.
- eslint clean on the changed files.
- `npm run build` (web) passes (`lib/ui/readingPlace.ts` is shared).
- The push guard passed.

## The walk, after (export of `afa7603e`)

`--only` the six source screens (/apologetics/atheism/, /bible/, /bible/multi/, /chants/, /reading/collections/anger/, /saints/). /bible/multi/'s arrival is from /. `--controls` the ten named links, one worker, both readers, motion on then `--reduced`, twice each: 8 runs, every named control reached, 0 errors, 0 control errors.

The walk cuts a control's name at 40 characters, so the pattern is "An Exact Expositio". "An Exact Exposition" matches nothing (a first chain run with it was thrown away).

| finding | before (Updates 84 after) | after |
|---|---|---|
| reduced: fade 582 then 530, Luke 10, Ephesians 2, Psalms 4, Ephesians 4 | 4/4 each | 4/4 each, unchanged |
| reduced: fade 582 then 530, James 1 | 4/4 | 0/4 |
| reduced: running line 27px, James 1:19-20 | 4/4 | 1/4 (not repeated) |
| motion on: running line 27px, James 1:19-20 (cd160f55's) | 0/4 | 1/4 (not repeated) |
| motion on: running line, Ephesians 4:26-27 (cd160f55's) | 0/4 | 0/4 |
| reduced: running line, An Exact Exposition (cd160f55's) | 0/4 | 0/4 |
| reduced: page 51px, Back to the Bible, Psalm 135, Words and history, The Mother of God (cd160f55's) | 0/4 each | 0/4 each |
| /bible/multi/ arrival from /, blank 296 to 302ms | motion on 3/4, reduced 2/4 | motion on 1/4, reduced 1/4 |

Layer crossings were seen for the eye only. On dev before the mend, the same 27px line move after the glide (motion on) showed in two of two runs, so the motion-on 1/4 may not come from this change. It is not proved either way.

## Left

- **The running line opens a frame after the landed page, on the export** (reduced, four chapters). Probe on the export, Luke 10 from /bible/: the new page's first read stands at the verse (y 3176, verse at 322) with the line shut and "v 1 of 42" (fade 582). The next frame, 50ms later, has it open with "v 25 of 42 · 2 min left" (530). A mutation in `<main>` falls between the two (t282). Dev settles the line in the first frame and the export does not, so on the export the scroll event's frame is not the first painted one. The next step is to settle the line from the landing itself, in the same microtask: the line's settle run after the landing, or the landing telling the line. That means changing `components/bible/ChapterVerseStatus.tsx`, which this brief held as cd160f55 left it, so it was not touched. Then measure again on an export.
- **The /bible/multi/ blank** (cause 4). The mend is a fallback that draws the page's own first state instead of nothing, needing no client module: `Shell` in a module of its own (no `use client`), with the loading line. But a search arrival (`?q=`) would then gain its query line when the client renders, and that line moves the loading line: a shift. Either the fallback leaves room for that line, or the suspension goes to the route's loading boundary (`app/(app)/bible/loading.tsx`, AfterAMoment, which keeps the page the reader is on in front of them). Past 150,000 here, so not mended. Updates 90 is on "the empty arrivals"; check before taking it.
