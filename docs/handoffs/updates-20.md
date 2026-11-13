# Baton: Updates 20 (a fixer: Gate 2.0's last findings, 1.9)

Written 2026-11-13 by session_01VuYTwaCypD3wX38ZRkTSy2 (Updates 20), reporting to Arbiter 2 (session_01VuYTwbacb8geNS4VjyJwQh), rotated at its context budget (200,000 tokens). Card: `docs/roles/fixer.md`. Branch `ccr-07896cf2-bo0afd`. Read first: this baton; `docs/handoffs/updates-18.md` for the mechanism (a state set in a layout effect, an effect, an observer or a fetch renders after the View Transition's picture; know it in the render on the device, or write it on the DOM in a layout effect) and the earlier gotchas.

## Role and scope

Finish Gate 2.0's findings in the arbiter's order, each with a test that fails on the old code, proved by the gate's walks on an export cut by `scripts/gate/export.mjs`. Nothing changes how a screen looks at rest without his yes; a contrast fault is mended with the least visible change that passes checkMock on every palette.

His rulings (2026-11-13, "all recs", relayed): in-page changes that move content (a tab, a pager's Next, a question opening, a card dismissed) move as page switches do; a filter or a count may change at once. Discover's doors carry no picture into a page that does not show it. A council's plate: stills for his yes first.

## Done (hashes in the report; RESULTS below)

- `5964bbc1` **checkMock wears the two earned palettes.** `EARNED` (Councils, Cappadocian, the registry's collection palettes), `WORN` (the five and the two: checkMock's default now), `EVERY` (WORN and the looks: what the looks' callers pass), `paletteGaps()`. Self-test case in `scripts/mock-check.mjs --self-test` (runs first, no browser) and `lib/ui/__tests__/earnedPalettes.test.ts`. Callers moved to EVERY: mock-own-words, mock-campaigns, gate/ambience-sheet. The guardrail walk's default now measures seven palettes.
- `5964bbc1` **The walks draw the chapter's discussions.** `scripts/lib/main-web.mjs`: `STAND_INS`, `standInFor(url, answer)`, `stoodIn`; the guardrail walk with `--online` answers an empty `/api/community/posts?chapter=` with one stand-in post in plain words and prints "stand-ins drawn" at its end. Test `lib/build/__tests__/standIns.test.ts`.
- `5964bbc1` **The discussions card on paper:** `bg-black/15` is the one dark well Light does not warm (globals.css "Wells": only /20 and /30), so the name and age read 4.24:1 on Light and the face's letter ("A", `CommunityAvatar`'s initial) 3.86 to 4.01 on Light and the light looks. On paper the card keeps its border and no well (`[html[data-reading-mode=parchment]_&]:bg-transparent`). Tried first: the house's warm well, which still left the letter at 4.41 to 4.50 on six light looks. With no well every palette passes at 390 (English, Arabic), 800 and 1032. Test `lib/bible/__tests__/chapterDiscussionsInk.test.ts`.
- `80de39ef` **Cause 3:** the gift (signed-out ticket known in the render; a failed read no longer replaces it; the read still runs and its answer stands), the shop (`catalogue = pool ?? (poolError && (data || error) ? collection : null)`), a category's chips (`waiting` holds the row unseen until the counts), and **the reader's pill's fade** (below). Tests in `lib/ui/__tests__/arrivesWhole.test.ts` (three new), `runningLineGround` and `readerScreen` follow the fade.
- **The "span" jumps into a chapter were the pill's fade, not the pill:** `.pill-fade` grew 48 to 52px by a `height` transition when the running line opened (a chapter arriving at a verse, its title above), on the page's thread, landing in one frame under the walk's load. It is now laid out at the open height and shifted down by `translateY(calc(4.125rem - 18px))` while closed; opening moves it on a transform. Same look at rest, open or closed. It covers the chapter pill, the dock and the work pill (the baton's "work pill, a span 30px").

## The proof walk of cb1f2333 (owed, done)

Gate 2.0's motion walk, both readers, `--online`, on the export of `a24ae34ab` (cut by `scripts/gate/export.mjs`), the same 11 screens; new reader 214 taps, open reader 213, none unsure. Against Updates 18's baseline on `823d24e0`:
- **Held:** Listen's 48px sideways (gone); the flow bar's 76px (gone); Export's 362px (gone); Change email's 75px (gone).
- **Community's switch, in part:** with an answer kept on the device the place no longer closes, but from a cold start with nothing kept (the walk, and every existing reader's first launch of 1.9 if Community is opened before `/api/campaigns/open` answers) the posts are drawn 81px low and rise ("misplaced", both readers, from / and from Discover's Chat). Not mended: drawing no switch until a yes would make every new reader's switch open late on release day. The arbiter's call.
- **Still there, as expected (owned below):** the gift 52px, the shop category's chips 170px (both mended in `80de39ef`, not yet walked), the in-page list, the shop item's blank (cause 7), the Paschal Homily's blank (cause 7), the shop card's picture not carried (cause 8), the profile card's 240px.

**This round's mends, proved** on the export of `80de39ef` (the gate's export), the motion walk on /gift/, /shop/category/all/, /shop/, /bible/ and /, both readers, 128 taps each, none unsure: the gift's 52px (arrival and Try again) and its flash, gone; the chips' 170px, gone; every fade jump into a chapter (Today's and the Bible's readings), gone. Left on those screens: Today's Dismiss and "2 more" (open item 6), the Paschal Homily's and the shop items' blanks (cause 7), the shop card's picture not carried (cause 8). `node scripts/mock-check.mjs --self-test` passes on that export with the lists' case.

**checkMock on the touched screens** (pass A, by colour, on all 22 palettes: the five, the two earned, the fifteen looks), on `a24ae34ab`, new reader: Settings, Community, Reading plans, Today's prayer, Nicaea's Symbol of the Faith, Alaska, 1 Thessalonians 5, Export, Change email, and the legal sheet (Terms and Privacy Policy, opened from Sign in) pass at 390, 800 and 1032 in English and Arabic, except: the chapter's discussions card (mended in `5964bbc1`, measured passing in the page at 390 English and Arabic, 800, 1032) and Community at 800, 1032 and 390 Arabic, which ran past the runner's 150s limit and were not measured (390 English passed). **Owed:** Community at those three by colour with `--limit 900`, and pass B, the pixels pass, at 390 on the screens that left words on a picture: Settings (70), Community (41), the council (2), the legal sheet (31 and 49).

## Open, in the arbiter's order, with what is known

1. **Community's first launch** (above): the arbiter's call.
2. **checkMock owed** (above). Pass B, the pixels pass, only where words on a picture were left: about 40s a palette a screen, because the pass photographs the page on each palette even where no word stands on a picture (Settings: 82s for two palettes). Runner: `docs/handoffs/updates-20-touched-check.mjs` (copied from the scratchpad; run from the repo root with `--pixels never|auto|always`, `--only`, `--widths`, `--locales`; `sheet:/signin/:0` opens the legal sheet, `part:<page>:<selector>` measures one part).
3. **The Purify profile card's 240px** (`ProfileViewer.tsx`, the shared `useDraggableSheet` smoothHeight, used by this card alone). Not mended. What I found by reading: the walk's jump is Chrome's layout shift API (`scripts/gate/inpage.mjs` shifts, `frames.mjs` line 495 on), which compares layout boxes, so carrying the growth on a transform alone will still be reported if the box's top moves in layout (it does: the panel is pinned to the foot, `items-end`). The panel has to keep its top in layout: lay it out at its cap (`max-h-[92dvh]`) and rest it shifted down by cap minus content through the hook's `paint`, or anchor it at the top and translate it down. And the seed has no `status` (the feed's posts carry none: adding it is a server change to `/api/community/posts`, which reaches the apps only from the merge), so the status line arriving drops the ⋯ row 30 to 51px inside the card anyway. Probe with `scripts/gate/probe.mjs --cpu 4` before and after.
4. **The work pill:** its sideways "Chapter 3 of 14" (27px) is the running line's own text changing width (the minutes left come a frame after it opens): a count, which his ruling lets change at once; its "span 30px" was the fade, mended. The pill's `level` (names stepping down) is still a state set in a layout effect; no walk named it, so it was left.
5. **In-page faults under his ruling** (the arbiter's item 4). The sort of run-tip's in-page list is done: `docs/handoffs/updates-20-inpage-sorted.md` (every one of the 154 findings once). **74 faults** (36 cuts, 38 jumps; 0 likely mended), **72 allowed** (24 cuts, 48 jumps: the saints' and chants' filters, Settings' radios, the calendar's New/Old switch, "Keep this gathering"), **6 other** (sheets and full-screen layers: the chant picker, the profile card, the councils' atlas, the dictionary's search), **2 unsure** (one question settles both: is a line a tap shows or takes away, "Please agree to the Terms... first" on a shop item's Buy now and on /signup/, a label that may change at once, or content that must move?). Faults by screen: /calendar/ 11 (each day's fast row lands 56px sideways a frame after its panel fades in), /community/ 9 (replies, Read more), /faq/ 9 (questions opening), /plans/acts/ 5 (Mark day N as read), Alaska 4 (the parts row: links that scroll at once), /theology/comma-johanneum/read/ 4, /start/first-liturgy/ 4, /prayers/ 4, Today 3 (Dismiss, "2 more"). Two calls to show the arbiter: Settings' c28 is the Councils palette's goal tile opening a line (a fault, not a radio); the calendar's day taps read as tabs. Counts were reported before any mend, as asked. None mended.
6. **The four named in-page faults** (Today's Dismiss on the "One question, so Purify can fit you" road card, `components/onboarding/RoadCards.tsx`, the verse 178px; "For today's saints, 2 more" 27px, `components/today/ChurchTodayRail.tsx`; a plan's "Mark day N as read" 41px with the streak line misplaced; Alaska's tabs, cuts): not started. A card dismissed needs to leave with motion (collapse and fade on the house curve) so the verse glides; there is no shared in-page transition helper yet (`lib/ui/routeMotion.ts` is page switches only).
7. **Causes 7, 8 and 9 and the shop item's zero-length transform:** not started; Updates 18's notes stand.

## Gotchas

- **A runner in the scratchpad cannot import playwright by name:** import `<repo>/node_modules/playwright/index.mjs`.
- **checkMock's pixels pass is the cost:** measure by colour first (`pixels: false`), and pass pixels only where `unmeasured` is left.
- **The export wipes `out/`:** a checkMock or walk reading `out/` must end before the next export. Copy an export (`cp -a out <dir>`) to walk it while working.
- The motion walk's "span at x=0" under a pill is `.pill-fade`; read `file` in the walk's JSON finding (it names the box's component) before guessing.

## His words that still apply

- 2026-11-10: "Every page switch is a transition" (CLAUDE.md).
- 2026-11-11: "No, not 1.9.1. Again, all of it is going into version 1.9."
- 2026-11-09: spend only what was asked; one export per round.
- 2026-11-13: "yes key always".

## Where things are

- Walk logs and stills of this round: `/home/user/walks/proof/` (while the container lives).
- The in-page sort: `docs/handoffs/updates-20-inpage-sorted.md`.
- The checkMock runner: `docs/handoffs/updates-20-touched-check.mjs`.
