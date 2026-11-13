# Baton: Updates 29, the apply chat (round 1 of the fifteen screens; notes 29, 17, 9)

Written 2026-11-13 about 22:55 UTC by Updates 29 (session_01VuYTwbDS8BxAGNfrZDk2WB), rotated past 200,000 tokens at Arbiter 4's word after a worker restart stopped its checks. Card: `docs/roles/fixer.md`. Report to Arbiter 4 (session_01VuYTwcgDURTqVoLw8nQD9m); round 1's hash goes to Arbiter 4 (the round 2 Fable chat is archived).

## Role and scope

Apply his "yes to all" (2026-11-13 about 20:47 UTC): round 1 of the fifteen screens, then notes 29, 17 and 9, each with the fix checklist (OPERATIONS section 5) and its own push.

## Done (held, not pushed as code)

`docs/1.9-build/redesign/round-1/updates-29-held.patch`: three commits for `git am --3way`, proved to apply on 62b2c669 in a throwaway worktree. It supersedes `applied.patch` (it is that patch plus the following):

1. Round 1 itself (Updates 27's build), with the **seven old-form tests all rewritten** to the new design, none weakened: faintText (the track's `:is(button, a)` selectors; the tray rows' kind line at `text-detail` /65, still held to 4.5:1), litPanels x2 (the lit choice: checked, pressed or selected), compose (the doors on the house's track, a name and no icon), leaf (nothing carried from Heresies' rows), ways x2 (Heresies' row: its name and who taught it, no tile, 60px), wordsOnPicturesMends (the hour card is gone; the hour stands on the lead's own night, `dark-island`). The four the subagent touched (studyGate, starters, gatheringPages, lookSurfaces) were read: they hold the new design, not weaker.
2. **Rule 1** on Today's other states: FirstStepsNudge, RememberCard (its answer; the Plus try page shows the same card) and FirstLiturgyReminder take round 1's quiet outlined button. WidgetTip's white Done is its own sheet's one button, excepted by name.
3. **Rule 3** in the stylesheet: `.set-well-ref`, `.gift-eyebrow`, `.tour-brand` in sentence case, caption size, semibold. `.set-well-ref` is Settings (Updates 26): tell it when this is pushed.
4. Faults checkMock found on the export, mended: the saint band's English line in Arabic ran onto the picture (2.58 to 4.17:1; now `rtl:text-right`); the Nativity star's line in Arabic read "St. Hymns on the Nativity" (title and byline now one English run); rule 3's ink, 45 small lines in 26 files at /45 to /52 raised to /55 (Theology's "1 of 9" read 4.39:1 on Cappadocian at 800 and 1032; ProfileCard and ProfileViewer are Updates 25's, tell it); RememberCard's "Remember the verse · Purify Plus" 4.31 to 4.47:1 on four light looks (ink /80 on the light looks alone); the tour's horizon placed with `left-1/2` (checkMock's mirror rule; now `start-1/2 rtl:translate-x-1/2`).
5. Tests: `fifteenScreens.test.ts` (no other white button in any part Today imports; no stylesheet rule in capitals; no small line under /55; the RememberCard and tour mends), two in `churchToday.test.ts`. Every new or rewritten assertion fails on the old code (21 proved on a worktree of 3d8f9b54; each later one by removing its fix).

## Checks before the restart

- At round 1 plus 2 and 3 (59323a5e local): whole suite **1,148 files, 14,718 tests passed, 0 failed**; typecheck 0 (after `npx next typegen`); lint on the 68 touched source files 0 errors (one old warning, FlorilegiumDetail's `window.location.assign`); web build exit 0. After item 4: the nearest 197 test files, 3,563 tests passed; lint clean. The whole suite was not run again after item 4.
- checkMock with pixels, on the export cut from 59323a5e: batch A, 66 stills (Today: morning, days kept, a great feast, the Nativity Fast evening, 800, 1032, Arabic; Theology, Heresies, Apologetics, Topics, Plans, the Creed, a path, a council, St John Chrysostom with the doors pinned, the Florilegium, Community, Start a campaign, Settings, the gift; at 390 on the five palettes, the two earned and the fifteen looks; at 800, 1032 and in Arabic on the seven): **63 passed**, the 3 that failed are mended in item 4. Batch B (51 stills), stopped by the restart at 15: 12 passed, today-remember, today-tour and today-tour-ar failed, mended in item 4.

## Open, in order (each with the fix checklist)

1. Round 1: apply the held patch; the whole suite; one export (`node scripts/gate/export.mjs`, in the main checkout); checkMock again on the eight that failed and on batch B in full, then the mocks below; the taps (`node scripts/tap-walk.mjs out --only /,/theology,/heresies,/apologetics,/topics,/plans,/saints/john-chrysostom,/florilegium,/community,/campaigns/new,/settings,/gift,/terms` plus RememberCard, FirstStepsNudge and FirstLiturgyReminder tapped in their states); push it alone; its hash to Arbiter 4; tell Updates 26 (`.set-well-ref`, ReaderPrefs' small lines) and Updates 25 (ProfileCard, ProfileViewer, CommunityClient small lines). Record it under note 25 in `docs/1.9-build/notes/build-95.md` and in the redesign README's table.
2. Note 29, `docs/1.9-build/drafts/build-95-note-29-applied.patch`.
3. Note 17, `docs/1.9-build/drafts/build-95-note-17.patch`.
4. Note 9, `docs/1.9-build/drafts/build-95-note-9.patch` (three commits; in `docs/brand/design-kit.md` keep both texts).

## Gotchas

- Never `git reset --hard` (auto mode asks the owner and the chat stalls). Prove a patch with `git am` in a throwaway `git worktree`, then `git worktree remove --force`.
- A worktree with a symlinked `node_modules` runs vitest but not `next build` (Turbopack cannot find next): cut exports in the main checkout, one at a time.
- An export wipes `out/`: move it aside (`mv out <scratch>/out-rN`). The mock scripts read `out/`; a symlink `out` is not ignored by git (the ignore names a directory), so remove it before any commit.
- A still on all 22 palettes takes about 4 minutes; on the seven, about 80 seconds. Three at once on this machine.
- The mocks for the screens that need the website: `node scripts/mock-campaigns.mjs 1 01,03,04,09,10,25,42 <dir>` (campaign card, campaign doors, Start a campaign, a profile's doors), `node scripts/export-walk.mjs --sections 47,50` (the composer's doors, a profile), `mock-florilegium.mjs`, `mock-leaf-pages.mjs`, `mock-legal-pages.mjs`. They hold the seven palettes, not the looks.
- Today's states (a subagent's map): FirstStepsNudge `purify:firststeps.eligible=1`; RememberCard `purify:bookmarks` with John 3:16 and `purify:remember` with its text; FirstLiturgyReminder `purify:firstLiturgy={"v":1,"going":true,"kind":"greek","date":"<within 6 days>","checked":[]}`; Prayed `purify.prayers.evening.dates` holding today from 17:00; the tour `purify:whatsNewSeen=1.8`; StreakAtRisk on `/prayers/today` after 18:00 with yesterday kept and not today.

## His words that still apply

- "yes to all" (2026-11-13 about 20:47 UTC): every design page, every answer.
- "I want everything fixed in v1.9 no pushing out to 2" (2026-11-13 about 08:13 UTC).
- "yes key always" (2026-11-13): the main web's public anon key read into one export command, never printed, written or committed.

## Where things are

- The held work: `docs/1.9-build/redesign/round-1/updates-29-held.patch`.
- The runner: `docs/1.9-build/redesign/tools/shots-every.mjs <export> <out> <plan.json> --jobs=3`: round 1's `shots.mjs` with `every: true` for the fifteen looks, `expect` for a part that must be on the screen, and stills in parallel.
- The rules: `docs/1.9-build/redesign/README.md`, "Round 1, in short".
