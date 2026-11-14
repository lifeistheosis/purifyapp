# Baton: Updates 56 (a fixer: the round's checks, the councils' close on the export)

Written 2026-11-14 about 20:40 UTC by Updates 56 (session_01VuYTwe36rKzHRDQSukfQUc), started by Arbiter 11 (session_01VuYTway6AnM43r8vMWFcJ4); the report goes to Arbiter 12 (session_01VuYTwaP8WgZ37rrBAdEp4z), at Arbiter 11's word on rotating. Card: `docs/roles/fixer.md`. Branch `ccr-07896cf2-bo0afd`. The main item (Updates 54's steps 4 and 5) is done; the only-if-room items were not started, at the line, and go to round 3's checks (Updates 58), as Arbiter 11 said.

## Done

1. **One export of 5c3c37a9a** (`node scripts/gate/export.mjs`, clean tree): exit 0, 205.2 MB on disk in 7,372 files, 75.1 MB packed (ceilings 240 and 85; the same as at 110349fe1). The head holds 775653141 (avifFor) and a9e63f50 (For the living's edge). Updates 55's picture sheet had not landed, so item 2e did not apply.
2. **The grep proof** (Updates 54's open 1): the relative `/history/media/*.avif` names in `out/` are 7, exactly the seven carried (`lib/media/carriedCovers.json`, historyAvif). Every other AVIF name in the export is at `https://purifyapp.net`, as expected.
3. **checkMock with pixels, 288 specs** (`mockrun54.mjs out <jsonl> 3`, the 16 routes x 390/800/1032 x en/ar x groups 0/1/2): exit 0, 288 of 288 ran, 0 failures, 0 page errors, 0 unmeasured (1,212 allowed). No fault in the runner: it ran clean the first time.
4. **The taps, a345c6508** (`taps54.mjs out <shots> <json>`). First run: exit 0, but 66 of 85 passed, 7 expected, 12 failed, all the runner's fault: seven documents doors (the five, Antioch, Orange) were tapped at the bottom of the screen under the tab bar and opened Discover; the two heads' blurred preview was scored as a fail; the heads' own AVIF asks were scored as a fail; Orange's one Father was looked for in a row that CouncilFathers draws only for two or more. Mended in the runner (door scrolled to mid-screen with a check that the tap point is on it; blurred preview loaded = expected; a local head's own AVIF = expected, any other History AVIF asked of the website still fails; St Caesarius read on his card; a fault now fails the run). Second run: **exit 0, 72 of 84 passed, 12 expected, 0 failed**: all eight doors open their shelves (tap point on the door), batch 1's seven Fathers show and tap to their cards, St Irene's letters' cover shows her solidus, the room's two shelves tap through, no empty round anywhere.
   - The 12 expected, all because the live site answers 404 until the merge: Sardica's and Antioch's heads keep their blurred preview (loaded), their windows and books hide (door, room x2, shelves x2), their heads ask for their own AVIF, Orange has no books (his rule: the plate), and St Caesarius's card shows his name on the plate with its cross (`imgs: []`, `plate: true`).

No fault was found, so nothing was mended in the council files or `lib/media/streamed.ts`.

## Open, each with its owner and next step

1. **Item 2 of my brief** (Updates 58, round 3's checks): (a) note 2's export side: `NATIVE=1 node scripts/keyboard-sheet-walk.mjs <base>` on out/ for journal, and for living step 300, then checkMock `{ pixels: true }` on both sheets (Updates 52's open 5, Updates 53's open 4); (b) the ambience preview on Councils at 390 in English (Updates 51's open 2): `SELLS_PLUS=1 node scripts/gate/ambience-sheet.mjs`, look at the screenshot before any change; (c) a quote's looks tapped (Updates 51's open 3, `quote51.mjs`); (d) the other keyboard sheets (Updates 53's open 3), walk and name only; (e) the picture sheet walk once Updates 55's push is in an export.
2. **The three pictures carried** (the arbiter, on his yes): not carried, as briefed.
3. **Usage, named, not a fault in the brief**: on Sardica and Antioch 268, the head (`components/councils/CouncilHero.tsx`, its `picture.avif` from `lighter()`) asks purifyapp.net for the same AVIF 3 times per visit while it answers 404. After the merge it answers 200; whether the three become one is worth a look by whoever holds CouncilHero (his word: "take into account usage also").

## Gotchas

- During the export, `scripts/native-build.mjs` moves the web-only pages out (1,457 paths showed as deleted). A stop hook then asks for a commit: never commit them. They come back when the export exits; the tree was clean after it.
- Tap a link mid-screen (`scrollIntoView({ block: "center" })`): at 390 the tab bar covers the bottom of the screen and takes the tap.
- CouncilFathers draws its row of rounds only for two or more Fathers; one Father is on the card.
- checkMock at concurrency 3 beside the taps took about 45 minutes (the slowest spec 270 s).
- get_session lagged: 103,232 at the second read, 120,950 for the rest of the run.
