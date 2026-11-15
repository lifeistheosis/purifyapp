# Baton: Updates 84 (Gate 3c groups 5 and 8: things on a reader's page moved after it arrived)

Done 2026-11-15. Mend: `cd160f55`. Brief: Arbiter 14. Runs: `docs/handoffs/updates-84-runners/`.

## The causes, as proved

Proved on a dev server under the phone's user agent with the app's motion pinned, reading each frame in requestAnimationFrame, the browser's layout-shift entries (what the walk judges by) and a MutationObserver on `<main>`.

1. **The running line opened a frame behind the page** (group 8, the "verse span", and the reduced half of group 5). Both lines (`components/bible/ChapterVerseStatus.tsx`, `components/saints/MobileWorkPill.tsx`) opened from an IntersectionObserver on the title, which answers after the frame is drawn. A verse link lands: the page is drawn at the verse with the line still shut, and in the next frame it opens. The "span at x 0" the walk saw is `.pill-fade`, the fade under the pill, which rises to the open line (globals.css, the rule after `.pill-fade`): y 582 shut, 530 open. Probe, Ephesians 4:26-27 reduced: one frame scrolled to the verse, line shut, fade at 582; the next, line open, fade at 530. The work: one frame at its place, line shut; the next, open.
2. **The running line opened partway through a glide** (group 5, motion on). A verse link glides to its verse (`goToReadingPlace`, smooth). The title went up partway, the line opened with "v 21 of 32 · 1 min left" and counted on; when under 200 words were left the minutes went, the centred pill lost about 52px and its box moved 25 to 27px sideways (the still: "v 21 of 32 · 1 min left" then "v 23 of 32").
3. **The template's wrapper moved 51px under the way back** (group 8, the pages). `app/(app)/template.tsx` wraps each page in `.route-fade`. Next keeps a template while the first segment stays the same, so on /bible/multi/ to /bible/, /chants/ to a chant and /saints/ to a saint the same wrapper stays and its page is replaced inside it. The way back (NativeBackBar, 51px) shows on the first of each pair and not the second. Probe: the bar's removal and the new page's insertion are one mutation batch in one frame, and the layout shift is the wrapper (the node whose text is the new page's, 0,51 to 0,0). No frame showed the new page low; the box that moved is the one that carries the entrance fade.
4. **One offset?** No. Groups 5 and 8 share cause 1 (the fade's 52px is the open line's height, not the bar), and the pages' 51px is the way back (cause 3). Both read about one bar.

## The mend (`cd160f55`)

- Both running lines read open and their words in the frame the page moved and set them in it (`flushSync` from the scroll's requestAnimationFrame), and once before the first paint (a layout effect). No observer.
- `goToReadingPlace` marks a glide; `gliding()` holds until the page lands (or 2 s, a reader's touch stopping it short). A shut line waits it out and opens once, with the landing verse's words, in its own 0fr to 1fr motion. An open line follows the page as before.
- Reduced motion: `.route-fade` is `display: contents` (it has no fade to carry there). Nothing on screen changes; the pages stand straight in `<main>`.

## Tests failing on the old code

`lib/ui/__tests__/arrivalPlace.test.ts`, 10 cases, all 10 fail before the mend: the glide is known while it runs, is let go after `GLIDE_MS`, and is never set for a trip made at once; each line has no observer, settles with `flushSync` in the frame, reads before the first paint and waits out a glide while shut; the reduced wrapper is `display: contents`.

## Checklist

typecheck 0; unit suite 1210 files passed, 15255 tests (one existing test held the line's literal `const n = verseAtReadingPlace();`, kept); eslint clean on the changed files; `npm run build` (web) passes; push guard passed.

## The walk, after (export of the head, `--controls` on these findings)

One export of `cd160f55`'s head; `--only` the six source screens, `--controls` the ten named links, one worker, both readers, motion on then `--reduced`, twice each (8 runs; every named control reached, 0 control errors). Runs: `docs/handoffs/updates-84-runners/`.

| finding | before (Gate 3c) | after |
|---|---|---|
| motion on: running line, Ephesians 4:26-27 | 4/4 | 0/4 |
| motion on: running line, James 1:19-20 | 4/4 | 0/4 |
| reduced: running line, An Exact Exposition | 3/4 | 0/4 |
| reduced: page 51px, Back to the Bible | 4/4 | 0/4 |
| reduced: page 51px, Psalm 135 | 4/4 | 0/4 |
| reduced: page 51px, Words and history | 4/4 | 0/4 |
| reduced: page 51px, The Mother of God | 4/4 | 0/4 |
| reduced: fade 582 then 530, five chapters (Ephesians 2, Luke 10, Psalms 4, Ephesians 4, James 1) | 4/4 each (Luke 10 open 2/2) | 4/4 each, unchanged |
| reduced: running line 27px, James 1:19-20 | not seen | 4/4, new |

Also seen, outside these controls: the walk's own arrival on /bible/multi/ from / drew blank for 18 frames, about 0.3 s (motion on 3/4, reduced 2/4); Gate 3c saw it once. Only layer crossings (for the eye) otherwise.

## Left

- **The verse a link points to is not in place from the first frame (reduced).** The fade still rises 582 to 530 on all five chapters, and James 1's line now moves 27px. What the after runs say: the page is drawn before it stands at the verse (at its top, then at the verse, and on James 1 at a first place and then a corrected one: the dev probe saw the same on the work page, 2962 then 3009). Before the mend the line opened a frame late, after the correction, so James 1's line did not move; it now opens with the first place and moves at the correction. The landing itself (components/bible/VerseFocusFlash.tsx calling goToReadingPlace, and whatever corrects it) was not read: past 150,000, so no second mend and no second export. The next fixer: put the chapter at its verse before the first paint and in one step, then the line and the fade (already settled in the same frame) follow it.
- The blank on /bible/multi/'s arrival from / above: not these findings, not read.
