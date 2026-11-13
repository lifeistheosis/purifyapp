# Baton: SSM board (the drop's words, the Vault, promo), 2026-11-13

Rotated at Arbiter 2's word (about 633,000 tokens, compacted once; OPERATIONS 2.2). No drop edit was made after the rotation was asked. Read this, `docs/NOW.md` and `docs/roles/ssm-board.md`.

## Role and scope

The 1.9 drop's words (`docs/plans/v1.9/drop.json`, the note's lines the drop leans on, the release email's points), the Vault on the SSM board, and the promo maker (`scripts/promo/`). Not ours: the store pictures and the release cards (Fable), the drop day and every send (his), store builds and the release.

## Done, with hashes

- The sparkle sweep in the promo: a shape measure for drawn four-point stars (`scripts/lib/four-point-star.mjs`) and its test in `promoLooks.test.ts`; 1.8's card look and edit frame 14 retired to the Vault (`8c891a552`).
- The fourteen Nativity Fast posts: new pictures, each day's reading, no star (`db2e91d97`). He posts from Sun 15 Nov, every three days.
- The heritage rule: the list of files and its test (`f29f993a2`, `c26d04d0e`, `986775804`).
- The 1.9 drop to final (`6a6cf8a5c`); the board message moved to the day a store serves 1.9, and "export it, or print it on the website" (`95ec4c0ba`); the video piece and the looks held (`77951c522`); ambient sounds on iPhone in the note and the App Store text, the counts and the voices held (`d76aecc82`).
- The Vault: the store variants' README (`3ecacd9df`); the board at v65.

## Open, each with its owner and next step

1. **Seven Bibles (next SSM chat, now).** The World English Bible is pushed (`0cac133df`). Seven already: the drop's `bibles` point (it names "the World English Bible"), the note, `releaseEmail.ts`. Still six: the drop's `line`, the figures list (`Six`), thirteen pieces (play-whats-new, appstore-whats-new, appstore-promo, discord-announcement, discord-short, community-post, board, discord-stores, letter, instagram-caption, tiktok-caption, push, discord-try) and `data/changelog/board.json`. First take "World English Bible" off the never list (it would refuse every piece that names it), then change each piece, adding English where a piece lists languages, then the figures, then `node scripts/release.mjs board --replace` for `board.json` (read its usage first), then `node scripts/drop.mjs kit 1.9` and the units.
2. **Campaigns (next SSM chat, at R5c).** "campaign" stays on the never list for every piece. The video's one campaigns scene is by his word (`scenes.mjs` marks it `byHisWord`); the `video` piece waits on R5c and on the video. At R5c the `step-campaigns-line` adds the note's line, takes "campaign" off the list, and the video's captions are written.
3. **Waiting on his answers (Arbiter 2 sends each).** The Holy Mountain's line after his yes on the land looks ("A monastery under the mountain, from an engraving of 1887"). The count once Desert goes (sixteen reading modes, fourteen looks): then block "seventeen reading modes" and "fifteen looks" too. The voices' line once they ship and he says yes: then lift "phone voice" and "phone's voice".
4. **The cards (Fable, then us).** His look at the 1.9 social cards (https://claude.ai/artifact/2H7zX18mPgJh9LMZnkw6bs); at his yes, `node scripts/drop.mjs waits cards --clear` and name the made set.
5. **The 1.8 drop kit page (us, on his word).** https://claude.ai/artifact/GjZi9fy6gEowrRMV2eTUdr, private, made 9 Nov for a 1.8 drop that never went; its "New Saint Additions" heading still shows the old sparkle (the app now uses a candle). Ask whether it goes to the Vault or is made again with `drop.mjs kit 1.8`.
6. **The board's source (us, at the next sync).** The published board is the only copy of the hand edits since 9 Nov (the Vault, the guardrail lines); purify-ads `ssm/` is not reachable from the cloud. Read it with the Artifact tool (writer) and build on that; port the edits into `ssm/` when it is reachable.
7. **The 1.9 promo stills (us, only on his ask).** `docs/1.9-build/PROMO.md`: seven stills from the walked build.

## Gotchas

- The never list matches a substring, in any case, in pasted pieces only (steps are not checked). Lift a hold before a piece says the word.
- D2.4 holds the release email's points to the drop's points word for word, and `releaseEmail.test.ts` caps the email under 260 words. It stands at 259: a point that grows must give a word back.
- Limits as they stand: App Store promo 170, Discord announcement 1,966 of 2,000, Community 2,284 of 4,000, App Store What's New 2,697 of 4,000, a notification 80 and 300.
- `patch-note-1.9.json` keeps one item to a line: edit it as text, then `node scripts/release.mjs note 1.9`. `drop.json` round-trips with two-space JSON.
- grep reads `lib/whatsNew/updateHierarchy.ts` as binary (a raw NUL): use `grep -a`.
- After a pull that changes the lockfile: `npm ci`, then `npx next typegen`.
- The branch is busy: a push can lose the race. Pull with rebase, check the drop again, push again.
- `.promo/` and the scratchpad belong to one container and go with it.

## His words that still apply

- "I just needed snapshots ... try not to do that next time." (2026-11-09)
- "Our vault is gonna have a bunch of stuff that's either unused or like we can use later and like reflect on it." (2026-11-09)
- "let's use all the photos" (2026-11-11), taken as "Keep them, never in ads": `lib/marketing/heritagePictures.ts`.
- "the Dropkit will be for Opus" (2026-11-12).
- "add the prayer campaigns to the video" (2026-11-13, about 07:21 UTC).
- "stop using parchment for designs", "the design must be optimized for mobile", "you must justify your designs" (2026-11-13).
- "I want everything fixed in v1.9 no pushing out to 2" (2026-11-13, note 25).

## Where things are

- The drop: `docs/plans/v1.9/drop.json` and `drop.md`; `scripts/drop.mjs`; `lib/drop/check.ts`; `docs/DROP.md`. The kit is written to `.release-logs/drop/1.9/` (not committed).
- The note: `docs/plans/v1.9/patch-note-1.9.json`, `patch-long-1.9.json`; the email: `lib/whatsNew/releaseEmail.ts`; the bundle's board: `data/changelog/board.json`.
- Promo: `scripts/promo/` (its README holds the rules), `lib/marketing/__tests__/`, `scripts/lib/four-point-star.mjs`.
- Posts: `docs/plans/v1.8/nativity-fast.md` and its folder. The 1.9 promo plan: `docs/1.9-build/PROMO.md`.
- The SSM board: https://claude.ai/artifact/JEDHhLDpXNKDbWHCURNDjd (shared by link, v65). Its Vault, newest first: the sea looks, the kit's first email template, AD 1's source, the 1.9 store variants, the Nativity posts' first pictures, the Fire look, the prayer wall, the 1.8 edit frames and reels, frame 14, the 1.8 cards, the edit's captions, the clips at full quality (https://claude.ai/artifact/D6suYVmZGy5BQcN1ibLHpa), the seven PR looks. Marked: frame 14 and the 1.8 cards carry the sparkle star; look 3 and frames 1 and 9 carry heritage pictures.
