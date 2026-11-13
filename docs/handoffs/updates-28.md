# Baton: Updates 28 (apply chat, Purify 1.9)

Session session_01VuYTwbwvWQrSikD9GnpZ3c, from 20:52 UTC on 2026-11-13, reporting to Arbiter 3. Written at 21:54 UTC, while the last walks ran.

## Pushed (ccr-07896cf2-bo0afd)

| Part | Commits | What |
|---|---|---|
| Notes 3, 4 and 6, the Fast and the Journal | `9f3a8ded`, `37ca3d75` | The held patch by `git am --3way`, clean. The website's shared page follows part 3 (Scripture raised with its place at its head, quotes on the page, the cover rounded at the head); `sharedPageView.test.ts`, 4 new tests failing on the old view. Updates 27 was told what Today's fast row takes (its baton carried it to Updates 29: `FAST_META`'s mark in its tone beside the day's name). |
| Note 22, the ambience photographs | `b5d9edb3` | The held patch, clean. The sea is Simonopetra (Angelos @ Ottawa, 2024, `File:Simonopetra Monastery, Mount Athos.jpg`, public domain: the photographer's own Public Domain Mark read on Flickr, and Commons' `PD-author-FlickrPDM`), recorded in `docs/licensing/AMBIENCE_PICTURES.md`. The Plus preview's strip wears the photographs through `components/player/AmbiencePhoto.tsx`, the sheet's own piece. Voice stays above Ambience in the player's ••• sheet. |
| The emails, round 3 | `0d83205d`, `f05d216b`, `6e159b45`, `ebc97dcb` | The held patch, clean; the kit's check passes. The account and order shell (`EMAIL_THEMES.night`) on Dark's slots, its Unsubscribe 44px (was 35). The retention look ported to `lib/email/retention/look.ts`, byte for byte to the kit's builder on its six letters, in `LOOKS`; `DESIGN_YES` holds his "yes to all"; every switch off. His page: https://claude.ai/artifact/Gcumt9ReKxJ6Yhy2Drh9Um (source in `docs/1.9-build/drafts/emails-round-3/shell/`). |

Each part: typecheck 0, eslint clean, the whole suite green (last 1,148 files, 14,730 tests), the web build green, the push guard passed. Records: `docs/1.9-build/notes/build-95.md` under notes 3, 4, 6 and 22, and "The emails, round 3".

## Checked on the round's export (cut from `b5d9edb3` by `scripts/gate/export.mjs`, 74.5 MB packed)

- `docs/1.9-build/held/fast-journal/xcheck.mjs fast,journal,sheet new`: **84 of 84 pass** (390, 800, 1032; English and Arabic; five palettes and every look; pixels). Six items left for the eye, all one known one: the writing sheet's last field under the tools.
- `scripts/gate/ambience-sheet.mjs` (no Plus), run again alone: 36 pass, **2 fail, real**: a third sound taking Rain's place moves The sea's tile 7px under the finger, and stopping one of two moves Bell and stillness 9px (limit 4). In `components/player/AmbienceSheet.tsx`, the hold-still (`useHoldStill`) as the per-sound volumes glide shut above the tiles.
- `SELLS_PLUS=1 scripts/gate/ambience-sheet.mjs`, run again alone (`ebc97dcb`'s selector): the strip's six photographs painted at 108px at every width in both languages, and the lock's checks pass; **3 fail**: The sea in the strip plays from a tap but its tile moves 13.3px; and checkMock with pixels on the Plus preview at 390 (English 94, Arabic 111; 800 and 1032 pass) on John 1's verses in the preview's window (for example 2.41 to 3.08:1 on Councils on the pixels under them). Not known yet whether that predates the photographs: the window is the strip's neighbour and was not changed.
- `scripts/mock-journal.mjs` with `WALK=1`: **40 of 40** flows as a new reader without Plus, **44 of 44** with nothing locked.

## Open

1. **Three faults before the next test build** (repeat with `node scripts/gate/ambience-sheet.mjs` and `SELLS_PLUS=1 node scripts/gate/ambience-sheet.mjs` on a fresh export; the sheet's two moves suspected in `useHoldStill`, `components/player/AmbienceSheet.tsx`, at full height) (pre-build gate, part 1, and contrast): the sheet's two moves, the strip's 13.3px move, and the preview's John 1 window at 390. Each needs a test that fails on the code now.
2. The emails in real Gmail, Apple Mail and Outlook: with the first send, to him alone (a switch to `owner` is his word).
3. The shared journal page has no pixel check: it is the website's (`/p/[id]`) and needs a shared row; its rendering is held by its tests.
4. **Decided by the arbiter (Arbiter 4, 22:50 UTC), for the next chat:** the account and order shell's spaced capitals go. Round 1's approved rule for the small line (sentence case, never capitals spaced out; his "yes to all", 20:47) covers the shell's small line and its micro labels (`lib/email/layout.ts`, `blocks.ts` `microLabel`), and the wordmark follows the kit's own letters. Not changed here.
5. Housekeeping on this machine only: `/home/user/purifyapp/out` is a link to the export in the worktree `/home/user/wt-build` (excluded in `.git/info/exclude`); remove both when the walks end.

To run the checks again in a fresh container: `node scripts/gate/export.mjs`, then the four commands above from the checkout (the walks read `out/`).
