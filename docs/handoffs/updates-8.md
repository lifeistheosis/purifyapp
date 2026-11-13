# Baton: Updates 8 (sharing, the canonical, the World English Bible; now the downloads), 2026-11-13

Rotated after one auto-compaction (OPERATIONS 2.2), as it was handed notes 21 and 23, a different kind of job (2.3). Read this, `docs/NOW.md`, `docs/roles/fixer.md` and, for the downloads, `docs/handoffs/updates-4.md`.

## Done

- **Note 24**, one way to share: `47cdd2d02`. `lib/share/shareOut.ts`: the phone's own sheet in the apps (the Share plugin, already a dependency, so no R8 change), Web Share in a browser that has it, a copy only where there is neither, each place saying so. Held by `lib/share/__tests__/shareOut.test.ts`.
- **Every page names itself**, the main web's canonical: `4c08abbea` (/p, only 1.9 has it) and `ff5eeda7c` (`app/layout.tsx` names a page's address as `./` for its canonical and og:url, and no title or description for Open Graph or X; /u names `./`). Proved on the built website: of 152 page routes, 102 read as pages and 50 answer a sign-in redirect or a 404, each naming its own address. Held by `lib/seo/__tests__/pageNamesItself.test.ts`. Record `c51fe7955`.
- Records: `48888c2d8` (notes 15 and 24), `0e7e04f5d` (note 25 parked).

## Open

1. **Note 15, Share on every work.** Waits on his yes to the stills: https://claude.ai/artifact/DK83EpgvurR1W935GFVVyn. The code is `docs/1.9-build/drafts/build-95-note-15.patch`, one commit that applies on the branch today. On his yes, relayed by the arbiter: `git am` it and `git rm` the patch; typecheck, the full suite, lint, `npm run build`, `npm run build:android`; on the export walk both sheets of a work of one section, of The Conferences (`#s102` opens Conference 5, Chapter 10) and of a council's document, the share sheet handing purifyapp.net links, and checkMock on the sheets as the record says. Push, then one report with hashes. Owner: the next Updates chat.
2. **Note 25, the World English Bible.** Waits on his edition, which the arbiter has asked him: A, the British edition, "the LORD" (recommended), or B, the classic, "Yahweh". Built on A: `docs/1.9-build/drafts/build-95-note-25.patch`. The text is not in the patch: download eBible's eng-webbe USFM zip, check its sha256 against `scripts/bibles/build.mjs`'s header, run `node scripts/bibles/build.mjs --web <folder>` (78 books, about 5 MB, `public/bibles/en-web/`), then `node scripts/bibles/compare-map.mjs --only en-web`. His answer goes where BIBLES.md says HIS-ANSWER-PENDING. If B: eBible's eng-web instead (record its sha256), and change the "LORD" test in `lib/bible/downloads/__tests__/files.test.ts`, the source line in the 21 locales (`downloads.source.en-web`), BIBLES.md and the script's header. Still to do before the push: each book's verses counted against the source's own `\v`; the reason it downloads rather than ships inside the apps (his word of 2026-11-07, below, and the export's size); search, cross-references and highlights keyed as for the other downloads (check, do not assume); a test that a chapter opens; a line in the merge-day walk (it reaches the main web only with the merge); and the release note's "Six more Bibles" becomes seven (`data/changelog/entries.json`, `patches.json`, `lib/whatsNew/releaseEmail.ts`; the live note goes through `node scripts/patch-notes.mjs propose`). It pushes when it passes: "It adds a version rather than changing a look" (the arbiter).
3. **Notes 21 and 23**, handed on from Updates 4, whose baton holds the brief. Note 21's honest words for a failed download (`bible.downloads.failedOffline`, `components/bible/BibleRow.tsx`) push when they pass. Note 23 (every download in the phone's notification bar and in the app's notifications) needs stills with a reason for each choice, for his yes before it ships, and nothing that needs a Play or App Store declaration without his word first. The held note 25 touches `lib/bible/downloads/catalog.ts` and its tests (one entry and its id), nothing of the words or the notifications.
4. **The canonical fix on the main web.** Waits on his word, through the arbiter. If yes: `ff5eeda7c` alone, cherry-picked onto main (it applies on `a63d37c7a` and its test passes there), `npm run build` on that tree (not yet run), and the push to main only at his word.

## Gotchas

- An export or a website build needs the main web's public address and anon key, read from purifyapp.net's own scripts into that one command, its role checked as anon, printed and written nowhere (CLAUDE.md). Nothing in a container holds it.
- A page's own openGraph or alternates replaces the root's whole: name `url` and `canonical` in it, or the test fails.
- In a local `npm run build` the shop is off (its pages 404), and account pages redirect when no one is signed in.
- A leftover `next-server` holds the port: kill it before `next start`.
- The branch moves every few minutes: push in a loop of `git pull --rebase` then `git push`.
- A fresh clone needs `npx next typegen` before the typecheck.
- eBible's USFM: Psalm 119's letters come as `\d`; 29 verses are empty in the WEB (`EMPTY_NUMBERS`); the editorial `\ip` introductions are not Scripture (14 dropped, Sirach's prologue kept).
- The Android web view has no Web Share: every share goes through `shareOut`.

## His words that still apply

- 2026-11-13 about 07:50 UTC, note 15: "allow every single work to be sharable by adding a share button here and here"
- 2026-11-13 about 08:13 UTC, note 25: "I want everything fixed in v1.9 no pushing out to 2", and, to the choice of voices and the World English Bible: "Both".
- 2026-11-07, the downloads: "make it so that the user picks to download the selected Bible they pick ... instead of the app including all of them"

## Where things are

- The record: `docs/1.9-build/notes/build-95.md` (notes 15, 21, 23, 24 and 25, the canonical line, and the 86 works the main web lacks until the merge).
- The parked code: `docs/1.9-build/drafts/build-95-note-15.patch`, `docs/1.9-build/drafts/build-95-note-25.patch`.
- `docs/1.9-build/BIBLES.md`, `scripts/bibles/build.mjs`, `scripts/bibles/compare-map.mjs`, `lib/share/shareOut.ts`.
