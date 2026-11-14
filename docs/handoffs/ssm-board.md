# Baton: SSM board (the drop's words, the Vault, promo), 2026-11-14

Written at the end of the round Arbiter 5 sent at 05:51 UTC (one round, one push, one report). Read this, `docs/NOW.md` and `docs/roles/ssm-board.md`.

## Role and scope

The 1.9 drop's words (`docs/plans/v1.9/drop.json`, the note's lines the drop leans on, the release email's points), the Vault on the SSM board, and the promo maker (`scripts/promo/`). Not ours: the store pictures and the release cards (Fable), the drop day and every send (his), store builds and the release.

## Done this round

All of it is one commit, with this baton; its hash is in the report to the arbiter.

- **Seven Bibles.** The drop's line, the figures (Seven), the thirteen pieces (the World English Bible named where a piece names the Bibles, English where it lists languages), `data/changelog/board.json` by `release.mjs board --replace`, and "World English Bible" off the never list. Also the note's blurb and the long note's intro, which Updates 16 had left at six (`release.mjs note 1.9`), and the checklist's reason.
- **The holds after his yes to all (20:47).** Holy Mountain, Forest look and Jordan look lifted; Desert look kept (Desert is out). Counted in `lib/reader/readingModes.ts`: sixteen reading modes (Candlelight, Monastery, fourteen looks), as the app's own Plus lines say; "seventeen reading modes", "17 reading modes", "fifteen looks" and "15 looks" added to the never list.
- **The voices' hold made true.** The phone's own voices are in 1.9 (note 25, "Both"; his yes to the page, 18:53; `8c1e2bb6`), and the 1.9 note has no line for them, so "phone voice" and "phone's voice" stay until it does. Only Kokoro is out (the Vault). The arbiter's brief said 2.0 by his word of 2026-11-11; note 25 replaced that for the choice of voices.
- **The cards.** His yes recorded and the set named in the piece's note; the wait replaced, not cleared: cards 01 and 04 say six Bibles, and every screen is from `6633b789`.
- **Note lines drafted** for what shipped without one: `docs/plans/v1.9/note-lines-drafted.md` (nine lines and one change), for the arbiter. Not in the note, not in the table.
- **The Vault.** The board at v66: the 1.8 kit page, Desert, the land looks' first pictures, the fifteen screens' round 2, the documentary's first film, the 1.9 film's first cut and the Kokoro voice parts; the sea looks' entry brought up to date.

## Open, each with its owner and next step

1. **The cards (the arbiter routes; any chat with the export, no design work).** Made again from the drop's words on the export the gate passes, all six so every screen is final: `node docs/plans/v1.9/store/cards/cards.mjs`, then `node scripts/drop.mjs cards docs/plans/v1.9/store/cards/stills`; then clear the wait. When it clears, D4.2 asks for `madeIn`, which the kit prints as "in purify-ads" (`lib/drop/page.ts`), and these cards live in this repo: a small code fix, named to the arbiter.
2. **The note lines (the arbiter, then his yes in Admin).** Once line 1 (the voices) is in the note, take "phone voice" and "phone's voice" off the never list and the drop may carry a voices point; once line 2 (the looks) is in, a piece may count, and says sixteen.
3. **Campaigns (at R5c).** "campaign" stays on the never list. The video's one campaigns scene is by his word (`scenes.mjs` marks it `byHisWord`); the `video` piece waits on R5c and on the video. At R5c the `step-campaigns-line` adds the note's line, takes "campaign" off the list, and the video's captions are written.
4. **The store pictures (Fable's; the arbiter's call).** Made on 2026-11-12, before round 1 of the fifteen screens. Whether they are taken again on the final export, as the cards and the film will be.
5. **The board's source (us, at the next sync).** The published board (v66) is the only copy of the hand edits since 9 Nov; purify-ads `ssm/` is not reachable from the cloud. Read it with the Artifact tool (writer) and build on that; port the edits into `ssm/` when it is reachable.
6. **The 1.9 promo stills (us, only on his ask).** `docs/1.9-build/PROMO.md`.

## Gotchas

- The never list matches a substring, in any case, in pasted pieces only (steps and notes are not checked). Lift a hold before a piece says the word.
- D2.4 holds the release email's points to the drop's points word for word, and `releaseEmail.test.ts` caps the email under 260 words.
- Room, as the drop counts it (code points, 2026-11-14): App Store promo 149 of 170, Discord announcement 1,981 of 2,000, Community 2,299 of 4,000, App Store What's New 2,726 of 4,000, a notification 80 and 300.
- `patch-note-1.9.json` keeps one item to a line: edit it as text, then `node scripts/release.mjs note 1.9` (it rewrites the 1.9 entries in `entries.json` and `patches.json` and the checklist's statuses, keeping a skipped category's reason). `drop.json` round-trips with two-space JSON.
- The cards' words are read from `drop.json` by `cards.mjs`, and the caption's sentences must match the points' names ("Seven more Bibles."), or it cannot find its point.
- The board is 2.4 MB: read it with the Artifact tool, then publish `edits` on the saved copy with its `url`; never rewrite it whole.
- The clone is shallow (about 50 commits): an older hash may not be in it.
- vitest keeps a scratch test's `console.log` to itself: write to a file in the scratchpad.
- grep reads `lib/whatsNew/updateHierarchy.ts` as binary (a raw NUL): use `grep -a`.
- A fresh container: Node 24 is at `/opt/node24/bin`; `npm ci` before the tests, and after a pull that changes the lockfile, then `npx next typegen`.
- The branch is busy: a push can lose the race. Pull with rebase, check the drop again, push again.
- `.promo/` and the scratchpad belong to one container and go with it.

## His words that still apply

- "I just needed snapshots ... try not to do that next time." (2026-11-09)
- "Our vault is gonna have a bunch of stuff that's either unused or like we can use later and like reflect on it." (2026-11-09)
- "let's use all the photos" (2026-11-11), taken as "Keep them, never in ads": `lib/marketing/heritagePictures.ts`.
- "the Dropkit will be for Opus" (2026-11-12).
- "add the prayer campaigns to the video" (2026-11-13, about 07:21 UTC).
- "Both" (note 25, 2026-11-13): the choice of voices, by the phone's own voices, and the World English Bible, both in 1.9.
- "stop using parchment for designs", "the design must be optimized for mobile", "you must justify your designs" (2026-11-13).
- "I want everything fixed in v1.9 no pushing out to 2" (2026-11-13, note 25).
- "yes to all" (2026-11-13, about 20:47 UTC): every design page, the land looks with Desert out, and the 1.9 social cards.

## Where things are

- The drop: `docs/plans/v1.9/drop.json` and `drop.md`; `scripts/drop.mjs`; `lib/drop/check.ts`; `docs/DROP.md`. The kit is written to `.release-logs/drop/1.9/` (not committed).
- The note: `docs/plans/v1.9/patch-note-1.9.json`, `patch-long-1.9.json`; the drafted lines: `docs/plans/v1.9/note-lines-drafted.md`; the email: `lib/whatsNew/releaseEmail.ts`; the bundle's board: `data/changelog/board.json`.
- The cards: `docs/plans/v1.9/store/cards/` (`cards.mjs`, `stills/`, README); small copies in `docs/plans/v1.9/cards/`.
- Promo: `scripts/promo/` (its README holds the rules), `lib/marketing/__tests__/`, `scripts/lib/four-point-star.mjs`. The 1.9 film: `docs/plans/v1.9/video/`.
- Posts: `docs/plans/v1.8/nativity-fast.md` and its folder. The 1.9 promo plan: `docs/1.9-build/PROMO.md`.
- The SSM board: https://claude.ai/artifact/JEDHhLDpXNKDbWHCURNDjd (shared by link, v66). Its Vault, newest first: the 1.8 kit page, Desert, the land looks' first pictures, the fifteen screens' round 2, the documentary's first film, the 1.9 film's first cut, the Kokoro voice parts, the sea looks, the kit's first email template, AD 1's source, the 1.9 store variants, the Nativity posts' first pictures, the Fire look, the prayer wall, the 1.8 edit frames and reels, frame 14, the 1.8 cards, the edit's captions, the clips at full quality, the seven PR looks. Marked: the 1.8 kit page, frame 14 and the 1.8 cards carry the sparkle star; look 3 and frames 1 and 9 carry heritage pictures.
