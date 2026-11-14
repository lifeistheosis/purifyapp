# Baton: Updates 51 (a checks chat: the export side of code already pushed, round 2)

Written 2026-11-14 about 19:20 UTC by Updates 51 (session_01VuYTwdujMJ8uW1gmUYL6oP), started by Arbiter 8, reporting to Arbiter 10 (session_01VuYTwcuYQvA4yvEArbLWUc) at Arbiter 9's word. Card: `docs/roles/fixer.md`. Branch `ccr-07896cf2-bo0afd`. Stopped at the line: past 150,000 by get_session, every run of the brief done or tried; this baton is the last push.

## Done, each with its output

1. **The stale picture sheet test, mended: 110349fe1.** `lib/share/__tests__/pictureSheet.test.ts` now reads `<TabLayer on={tab === "look"}>\s*{quote ? (\s*<QuoteLooks`, the same claim (on Look, a quote opens its own looks). Proved both ways: it fails when the quote's looks move to the Words layer, and when the quote branch is never taken; it passes on the head. The whole suite: exit 0 after 210s, files 1190 passed and 1 skipped, tests 15,109 passed and 9 skipped (15,118). The guard passed (typecheck, eslint, related tests).
2. **One export at 110349fe1** (`node scripts/gate/export.mjs`): exit 0 after 135s, 205.2 MB on disk in 7,372 files, 75.1 MB packed (ceilings 240 MB and 85 MB). The key checked to be the anon role, in the log nowhere. It sells Plus as the store's does. Not in it: e597f1e9 (Updates 50) and 87d8d82e (Updates 52), pushed after.
3. **Section 55** (`PW_CHROMIUM=/opt/pw-browsers/chromium node scripts/export-walk.mjs out --sections 55`): every check passed, exit 0 after 555s. Build 93 note 2's flick, which failed once on the old export (53, 28, 30, 0, 28px), held at all three sizes: 13, 28, 28, 28, 28 at 360x740; 28, 28, 34, 28, 28 at 390x844; 28, 24, 27, 27, 28 at 820x1180 (the limit 45). Held drags 0px at every size. Updates 48's block passed on morning, the First Hour and evening, motion on and off: Begin stands the first line over the band's middle (-2px), every click as a new prayer's first line reaches the middle, lit in the same frame (5 of 5, 4 of 4, 5 of 5), the line lit at every rest is the one over the middle (30 of 30 each). **65441843 is not the flick's cause:** it was already in the old export (5f18e34a4), the prayer code is the same in both exports, and the same code now passes 15 of 15 flicks; its stylesheet change is comments only and `useLitLine.ts` only listens to scroll during a flick (`goToReadingPlace` runs from Begin alone). The one 53px reads as the timing of the walk's synthetic touches. Nothing mended.
4. **The two sheet walks:** `node scripts/sheet-scroll-walk.mjs`: all held, 25 of 25, exit 0 after 85s (the upgrade sheet's 14 pages to try; on the ambience page the window gives its scroll back, 438 to 0, the sheet moved 0 and open). `node scripts/picture-tabs-walk.mjs`: all held, 42 of 42 (21 languages, the phone's own and largest text), exit 0 after 341s; the edge, title and picture stand still across Look, Words and Size (en: 127, 164, 210.9).
5. **The plans tapped** (`plans49.mjs`, the stand-in subscriber in the browser only): 10 of 10 in English with motion on, 10 of 10 with motion reduced, 10 of 10 in Arabic. Never begun: no count, no bar. Begin opens Matthew 1 with the plan's bar; back: no zero. Mark day 1 read: "1 of 89 days read", the bar at 1%. The list's Continue card: no bar, then its bar from one. Untick: nothing again, on both. Five writes answered in the browser, never sent (PATCH profiles, POST user_kept three times, POST /api/prayer/sync).
6. **checkMock with pixels** (`mockrun49.mjs`, 108 specs: prayer, plan0, plan1, list, picture, words at 390, 800 and 1032, en and ar, the three groups): exit 0 after 495s; no errors, no page errors, 90 clean. **18 fail, all one target, all on the verse picture's Words tab:** the Text size slider (`input "Text size"`, `.picture-range` in `app/globals.css`) is 36px tall, needs 44 (311.2 by 36 at 390, 359.2 by 36 at 800), every width, both languages. Note 9 (51e8a8168) did not touch it: it is older and shows now because this round checked Words for the first time.
7. **The ambience preview** (`SELLS_PLUS=1 node scripts/gate/ambience-sheet.mjs`): 22 of 23, exit 1 after 726s. **The one fail: checkMock at 390 in English on the Councils look:** "Ambience is part of Purify Plus" 2.92:1 and "Every word you read, and the chant under your pr..." 2.29:1, both need 4.5:1. The same look passes at 800 and 1032 in English and at all three in Arabic.

## Open, each with its owner and next step

1. **The Text size slider at 36px** (owner: Updates 53, who holds the sheet files, at the arbiter's word). The likely mend is `height: 44px` on `.picture-range`, but the Words layer is the tallest of the three and sets the panel, so the sheet grows 8px; note 9's walk (`picture-tabs-walk.mjs`) and checkMock on `words` after it.
2. **The ambience preview on Councils at 390 in English** (owner: the arbiter names one; the page is note 8's). First run the ambience sheet again to see if it repeats; only English at 390 failed, which may be the words falling on a light part of the backdrop at that width, or a picture not painted when measured. Look at its screenshot before any change.
3. **A quote's picture opening its own looks, tapped on the export: not proved** (owner: the next checks chat). `docs/handoffs/updates-51-runners/quote51.mjs out <json> [en|ar]` taps Today's share on the saying or saint band (`[data-saying-share], [data-saint-share]`; today has a headline saint, so Today shows the saint's band, `ChurchTodayRail.tsx` line 218), then checks Look, a layout kept across a look, Words and back, and the sheet standing still. Twice it found no share control in 45s, in English and Arabic, with no page errors. Next step: a screenshot of `/` when the wait fails, to see what Today shows; the band may need a scroll before it renders. The static claim is held by the mended test.
4. **His phone only:** note 1's click with the glow (Android's 10ms pulse, iOS's selection click); note 8's thumb on the Plus preview's Bible window; the slider's feel once mended.

## Gotchas

- get_session read 141,031 before any long run here, far above a guess from the turns: read it before the first long run, not after.
- A native export stashes the web-only routes (the seller shop, support contact and others) while it runs; `git status` then shows them deleted and the stop hook asks for a commit. Never commit them; they come back when it exits.
- The picture sheet's quote is opened from Today's saint band on a day with a headline saint, not from the saying card.

## His words that still apply

- Note 1 (2026-11-14 about 15:56): "it should glow the quite in the middle of the users screen. and also the haptic feedback should move you and glow to the next section (rather than haptic feedback on a arbitrary feeling line with no visual hook)".
- 2026-11-14 16:28: "fix those things. try and take into account usage also". 13:57: check only what you touch.

## Where things are

- The runners: `docs/handoffs/updates-49-runners/` (plans49, mockrun49, stand49, faces49) and `docs/handoffs/updates-51-runners/quote51.mjs`.
- The faces (`faces49.mjs`) were not mine: Updates 50 runs them with its council changes.
