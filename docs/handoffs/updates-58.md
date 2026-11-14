# Baton: Updates 58 (round 3's checks, build 97)

Written 2026-11-14, at the line. get_session read 102,630 (frozen) for the first half, then 176,574 after item 1's runs: past the brief's 150,000, so item 2 was not started.

## Role and scope

Round 3's checks chat (docs/roles/fixer.md), from Arbiter 11's brief of about 20:07, reporting to Arbiter 12. Changed scripts/keyboard-sheet-walk.mjs (it takes a folder in place of the address) and added docs/handoffs/updates-58-runners/mockrun58.mjs. No app file touched.

## Done, with hashes

- **The export:** `node scripts/gate/export.mjs`, exit 0, cut from aeb855fdf on a clean tree: 205.2 MB on disk in 7,372 files, 75.1 MB packed (ceilings 240 and 85). It holds c3ec4f66, 2ad9c99c, a9e63f50 and 87d8d82e. No file under app/, components/, lib/ or public/ changed from aeb855fdf to 562b2ed8a, so it stands for that head.
- **Word study walk** (no argument, the Plus stand-in): its first run on an export needed no mend. 16 ok, "all held", exit 0. The edge at 126.6 in all 151 frames on each tab change, en and ar, 1x and 1.3x; title 163.5 and 160.3; tabs 413.8 and 522.3; a verse followed from each list (matthew/5#v32, genesis/4#v23), the sheet closed; no page errors.
- **Picture tabs walk** (no argument): 126 ok, 0 FAIL, "all held", exit 0, all 21 languages at both sizes. Edge 127 (1x) and 126.6 (1.3x) on every tab; Save and Share to 796.3, the save line to 822.8, held with the body scrolled; the slider 44px in all 42 runs.
- **Keyboard sheet walk on out/** (562b2ed8a lets it take `out`): `NATIVE=1 ... out journal step 300` ok, exit 0 (the field 247.4 at the tap, as the keyboard comes and at rest; edge 12.8). `... out living step 300` ok, exit 0 (edge 110.6 before the keyboard and at rest; the field 266.3 at rest).
- **checkMock `{ pixels: true }`** (808144158, mockrun58.mjs): 42 specs (7 states at 390, 800 and 1032, en and ar), each measured on three groups (the five palettes and the two earned; looks 1 to 7; looks 8 to 14): 126 measures, 0 runner errors, 0 page errors, 2 words unmeasured. Word study on each testament, Look, Words, the journal's sheet and For the living's sheet: 0 fails. 72 fails, all one word: Open 1.

## Open, each with its owner

1. **The Size tab's ratio on the chosen chip** (next fixer, at the arbiter's word). components/share/PictureSheet.tsx:460, `text-night/55` on the chosen chip (`ON`, `bg-paper`, line 115): "9:16" (Story, the default shape) at 3.73:1 at its least, needs 4.5:1, on 12 of 21 palettes (Dark, Candlelight, Monastery, Councils, Cappadocian, Night sky, Dawn, Incense, Holy Mountain, Forest, Mosaic, Damask), at every width, en and ar. Not from this round: the line is at least as old as f7bbe0940 (where the clone's history starts), before 2ad9c99c. Not mended: past the 150,000 line, and its checklist needs a second export. Next step: a darker tone that holds 4.5:1 on all 21 (measure it), a test that fails on `/55`, the checklist, then mockrun58 on `pic-2`.
2. **Item 2** (the next checks chat): not started; Updates 56's baton (cf3335fbb) does not do it either. (a) The ambience preview on Councils at 390 in English (updates-51.md Open 2). (b) A quote's looks tapped (updates-51.md Open 3). (c) The florilegium picker with several gatherings, and a campaign sheet if one can be reached (updates-53.md Open 3).
3. **The phone walk** (updates-55.md Open 3, the owner): Share's share sheet and a gesture bar's inset, which headless cannot show.

## Gotchas

- The keyboard walk takes `out` (any folder) in place of the address and opens screens with go(): the shell hands a hard load of an inner address the front door.
- `node docs/handoffs/updates-58-runners/mockrun58.mjs out <jsonl> 2 <state@width@lang>...` took about 50 minutes for 42 specs, two at once on four cores. A spec that fails to open leaves a screenshot beside the jsonl.
- A push can lose a race to another chat's docs push during the guard's run; rebase and push again (the second guard pass took 26s).
