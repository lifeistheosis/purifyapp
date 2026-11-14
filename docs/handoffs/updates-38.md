# Baton: Updates 38 (a fixer: the last faults of 1.9, round 4)

Written 2026-11-14 by Updates 38 (session_01VuYTwdp6mHuKVGSvGVL1n7), reporting to Arbiter 6 (session_01VuYTwchyeBnvHi6J8tiR9X; the brief was Arbiter 5's). Card: `docs/roles/fixer.md`. Branch `ccr-07896cf2-bo0afd`. Measured on the export of 3e4827cf, checked on the exports of 08365a9c and 7a966fba (the second checking export for one mend found on the first; OPERATIONS 5: a change after an export is a new export). Rotated at its line with the checks below left.

## Done (each with a test that fails on the old code)

1. **checkMock with pixels owed (Open 2 and 3), export of 3e4827cf:** /theology/, /councils/, /councils/first-nicaea/, /theology/path/christ/ at 390, 800, 1032, the 21, English and Arabic: 70 of 72 pass. The 2: /theology/ in Arabic at 800 and 1032 on Monastery, the first step's "1 of 9" at 4.37:1 over the step's picture as it fades. Mended (Monastery's tray count at 66, as the earned palettes'); on the export of 7a966fba /theology/ passes 18 of 18.
2. **EIKON still under reduced motion (Open 6):** one escape after the @supports block; comments corrected in the stylesheet, EikonStory, EikonBoutique and inpage.mjs; the front page's phones untouched (the export never draws them). Reduced, a scroll on the Virgin of Vladimir piece: old export "moves: transform with the scroll" on three pieces; new: passes.
3. **The frames judge reads the compositor's outline (Open 5):** `outlineStill` in scripts/gate/frames.mjs. Self-test: the two outline-still cases MISSED with the old judge (blank, 281ms), pass with the new; the bare ground after it still fails blank; the whole self-test passes. `--self-test --only <kind>` added.
4. **Morals on Job (Open 1):** a place more than two screens away cross-fades into place (`beyondGlide`, lib/ui/readingPlace.ts; useLanding). Frames: old export blank 265 and 367ms mid-glide; new export 2 of 2 pass, landing at the same place.
5. **The shop's piece carries its picture (Open 4):** the stretched link carries its card's picture (`pictureOf`, routeMotion), the outline shows the picture a list read this visit (`peekPiecePicture`) and takes it, the gallery's first takes it back.
6. **Jumps and cuts (Open 7):** Theology into a topic (cut, 51% at 113ms: the tap's progress turned the hub's head; told after leaving): old fails, new 2 of 2 pass. Saints' filters (movePage): old jump 37px, new 2 of 2 pass with motion on. The shop from Today (153px at 968ms: Shop by saint's place held while New in's bones stand): old 1 of 2 failed, new 3 of 3 pass. Search's strip, reduced (dictionary tab 86 to 663px): waits for the library's and Theology's lists; the first mend (library only) still failed 1 of 4 on 08365a9c, so 6721be4a waits for Theology's too. Its recording on the final export is not done (Open 2).

## Open

1. **The shop's screens fail checkMock, on the old export as on the new (16 failures at 390 English, identical):** "15% off as a set, saving $11.24" and "The set ships free" under 4.5:1 on Light (4.24), Jordan (4.44), Roses (4.34) and more looks, at every width and in Arabic, on /shop/ and the piece page; "See all" 39.4 by 46px and the cards' links under 44px on /shop/; an input 17 by 17px and "+ $4.99 standard shipping" on the piece page. Data-driven (the main web's live set offer, --online), not this round's code. The runner is described below.
2. **Search's strip on the export of 6721be4a/7a966fba:** record `button[aria-label*="search" i]` on /fathers-on/anger/, reduced, four or more times (the fault was one in four).
3. **/reading/ checkMock with pixels (owed, Open 3):** not finished: one run takes over twenty minutes under load (3 at a time). And /settings/reading-mode/ at 1032 English on the five and the two earned.
4. **The saints' filters, reduced:** a filter changes the century timeline's bars at once, and a count label riding its bar moves 43px (the gate's jump, 116ms). Motion on passes (the move pictures it). The arbiter's call: the gate takes a shift in the frame after a tap with motion reduced as part of the allowed cut, or the timeline's numbers stand on a fixed line.
5. **Not reproduced:** the cut into Messages from /shop/ (5 recordings pass on 3e4827cf). The motion walk on /shop/ was not run on the final export.

## The runner (scratch)

```js
// node mockrun.mjs <outDir> <jsonl> <concurrency> <route@width@lang@group>...  (group 0: WORN, 1: LOOKS[0..6], 2: LOOKS[7..])
// context: viewport, isMobile under 700, hasTouch, NATIVE_UA, motionOptions("on"), pinMotion; lang: locale, purify_locale cookie,
// CapacitorStorage.purify_locale; serveLikeTheShell(out); mainWeb routes for purifyapp.net, onrender and public storage;
// go(page, route); wait 3s; checkMock(page, "body", { pixels: true, palettes: GROUPS[g] }).
```
