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
- `scripts/gate/ambience-sheet.mjs` (no Plus): 36 pass, **2 fail**: "The sea: takes Rain's place: moved 7px" and "Bell and stillness: stops: moved 9px" (limit 4). Run beside the 34-minute checker on 4 CPUs; queued to run again alone. If they hold, it is the sheet's hold-still (`useHoldStill` in `AmbienceSheet.tsx`) when the sheet is at full height and what stands above the tiles shrinks.
- `SELLS_PLUS=1 scripts/gate/ambience-sheet.mjs`: 10 pass, then the new preview part's own selector took the preview's window for its strip (both are a group named Ambience). Fixed in `ebc97dcb`; queued to run again.
- `scripts/mock-journal.mjs` with `WALK=1`, as a new reader without Plus and as one with nothing locked: running when this was written.

## Open

1. The results of the runs above, into build-95.md and the report.
2. The emails in real Gmail, Apple Mail and Outlook: with the first send, to him alone (a switch to `owner` is his word).
3. The shared journal page has no pixel check: it is the website's (`/p/[id]`) and needs a shared row; its rendering is held by its tests.
4. Seen, not changed (not the colour ask): the shell still sets spaced capitals (PURIFY, the small line, the micro labels), which the kit's letters do not. His word.
5. Housekeeping on this machine only: `/home/user/purifyapp/out` is a link to the export in the worktree `/home/user/wt-build` (excluded in `.git/info/exclude`); remove both when the walks end.

To run the checks again in a fresh container: `node scripts/gate/export.mjs`, then the four commands above from the checkout (the walks read `out/`).
