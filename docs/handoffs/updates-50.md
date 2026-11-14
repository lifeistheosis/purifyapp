# Baton: Updates 50 (a fixer: build 97 note 4's open places)

Written 2026-11-14 by Updates 50 (session_01VuYTwad3Re6SzEzoopU4jX), started by Arbiter 8 and reporting to Arbiter 9 (session_01VuYTwcHwXfgMdJsBmjkrq5). Card: `docs/roles/fixer.md`. Branch `ccr-07896cf2-bo0afd`. Stopped at the brief's line after the push: get_session read 333,547 tokens ($10.20). Steps 1 to 3 of the brief are done and pushed; step 4, the export side, is open for a checks chat.

## Done (e597f1e9)

1. **A way in for a local council's own picture:** `lib/councils/pictures.ts` (History's shape and folder); `councilPicture` (`lib/councils/page.ts`) draws it where it draws the seven's: the head, the books' windows, the documents fan on the page, the shelf's backdrop. Credit line at the page's foot; as CC BY-SA photographs, on the Credits page (`lib/credits/photos.ts`). Streamed from the website as History's pictures are, not carried. `scripts/history-media.mjs` reads the new registry for its AVIFs and previews.
   - **Sardica (343):** the Sardica panel of the 1169 mosaics, Church of the Nativity, Bethlehem; Thaler Tamas, CC BY-SA 4.0, [FotoThalerTamas8](https://commons.wikimedia.org/wiki/File:Church_of_the_Nativity_(Bethlehem)_FotoThalerTamas8.jpg). `public/history/media/council-of-sardica.v1.jpg` 1280 by 735, 334,655 bytes; AVIF 237,393.
   - **Antioch (268):** the same wall's Antioch panel, whose words name the synod of 33 bishops before the first council, against Paul of Samosata (so 268, not 341); a detail of Thaler Tamas's photograph of the wall, CC BY-SA 4.0, [FotoThalerTamas9](https://commons.wikimedia.org/wiki/File:Church_of_the_Nativity_(Bethlehem)_FotoThalerTamas9.jpg). `council-of-antioch-268.v1.jpg` 838 by 470, 139,385 bytes; AVIF 83,628. Softer than Sardica's: seen from below, leaning, a lamp chain across it.
2. **St Caesarius of Arles (Orange 529), who has no page:** Callot's etching for 27 August (1636), the Met's scan, CC0 (object 419945, "isPublicDomain": true). His slug on the council's Father names a row among the covers (`lib/reading/authorCovers.ts`, `lib/today/saintFaces.ts`); `fatherFaces` reads a cover by that slug when there is no saint page, and gives no link. `public/covers/authors/caesarius-of-arles.v1.jpg` 600 by 750, 99,398 bytes; AVIF 48,097.
3. **Every other place takes the form the gate accepts:** a `permission:` entry with its section in `docs/1.9-build/ICON-PERMISSIONS.md` ("The councils"). Heads dropped by his rule, their own books on the room's plate: Carthage (256), Ancyra, Neocaesarea, Gangra, Antioch (341), Laodicea, Constantinople (394), Carthage (419), Orange (its window undated), Jerusalem (1672). Fathers on the plate with its cross: St Nectarius, Firmilian, Malchion, Dositheos II. No place waits on a search.
4. **Tests:** everyCouncilAPicture and doorPlate fail 6 of 11 on the old wiring (page.ts, fathers.ts, councils.ts put back) and pass on the new; page, carriedPictures (now about the seven only) and photos brought in line. Typecheck 0; lint clean on the 15 changed files; the whole suite 15,111 passed, 1 failed (`lib/share/__tests__/pictureSheet.test.ts`, stale and not mine, mended by Updates 51 in 110349fe: 6 of 6 on the rebased head). The push guard passed every check.
5. **Records:** `docs/licensing/HISTORY_MEDIA.md`, `docs/licensing/COVER_ICONS.md`, build 97 note 4 (the Updates 50 paragraph).

Every picture was opened and looked at before it landed; edges by `scripts/check-picture-edges.mjs`: all three clean.

## Open

1. **The export side (owner: a checks chat, on one export of the head):** the web build (shared files changed: `lib/history/media.ts`, `lib/credits/photos.ts`); checkMock `{ pixels: true }` at 390, 800 and 1032, five palettes, the fourteen looks and Arabic, on batch 1's pages (/councils/ephesus/, chalcedon, second-constantinople, third-constantinople, second-nicaea) and mine: /councils/sardica/, /councils/antioch-268/, /councils/orange-529/, their document pages, /reading/councils/sardica/, /reading/councils/antioch-268/, /reading/councils/ and /credits/; the faces seen (batch 1's six, St Irene's letters' cover, St Caesarius at Orange), no empty round; the heads, books and shelves tapped. In an export the new files are asked of the live website, which has them only from the merge: expect the blurred preview at the two heads, the plate on their books, and St Caesarius's plate with its cross, unless the check serves the website's files.
2. **The bundle's size:** not measured (no export). By the code the export carries none of the six new files (`STREAMED_ROOTS` in `lib/media/streamed.ts`, set aside by `scripts/native-build.mjs`; none is in `carriedCovers.json`); it grows by two 24px previews in `lib/history/mediaPreviews.ts` (under 1 KB) and the registry's code. The checks chat names the export's figure against the last one.
3. **The arbiter's calls:** (a) carry the two AVIFs in the apps, so the heads show offline? +321,021 bytes, and with the seven's (about 0.82 MB) it passes the 0.9 MB bound `lib/media/__tests__/carried.test.ts` holds for his yes, so it needs his word; (b) Antioch's softer picture kept, or dropped by his rule; (c) on the website, books and shelves of the two load the JPEG, since `avifFor` offers an AVIF for a /history/ picture only when carried (a small follow-up).

## Gotchas

- **Commons refuses this container** (429, its robot policy). Do not retry with another user agent: the auto mode check refuses it, rightly. Files came through the web-fetch tool; the Met's own API worked (its v1 search is retired; v1.1 works).
- **Never ask a fetch agent to open every file in a category:** one such read cost 440,149 subagent tokens (37 file pages). Ask for titles, then fetch one file.
- `getSaint` returns null, not undefined. A council Father's `slug` may now name a cover with no saint page (`CouncilFather.slug`'s comment says so).

## His words that still apply

- 2026-11-14 about 16:02 UTC: "please ensure every photo is accounted for and not missed in the councils section (even the local synods and book covers)".
- 2026-11-14 16:28 UTC: "fix those things. try and take into account usage also".
- 2026-11-13 about 14:29 UTC: a council's plate takes its real picture where one is allowed and is dropped where not.
- 2026-11-10: never another saint's face.
