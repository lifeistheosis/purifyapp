# Baton: Updates 40 (a fixer: the last faults of 1.9, round 6)

Written 2026-11-14 by Updates 40 (session_01VuYTwcSUykBm2uqC9Dz787), reporting to Arbiter 6 (session_01VuYTwchyeBnvHi6J8tiR9X). Card: `docs/roles/fixer.md`. Branch `ccr-07896cf2-bo0afd`. One export, of 4c6a04841 (`node scripts/gate/export.mjs`, the store's switches and the main web's public key). Stopped at the brief's line: items 1 and 2 done and proved, item 3 not started.

## Done (each with a test that fails on the old code)

1. **The saints' grid stands still with motion reduced (baton 39, Open 1), bf64b2cb.** The grid sits in a `relative mt-10` box in both states; the count ("21 saints") is `absolute bottom-full start-0 mb-2` in that 40px gap. Unfiltered page as it was. On the export: the reduced recording (`rec.mjs out /saints/ 'button[aria-pressed]' reduce 4 1`) **4 of 4 pass** (were 3 of 3 failing, 37px); motion on **2 of 2 pass**; the grid's top 1457px before and after the filter, English and Arabic; the count 14px under the century labels, 8px over the first card, at the start side in Arabic. checkMock with pixels on /saints/, unfiltered and filtered, 390/800/1032, the 21 in three groups, English and Arabic: **36 of 36 pass**. Test: `lib/saints/__tests__/gridStands.test.ts` (3 of 3 fail on the old code).
2. **The cart and the thank-you page, every checkMock rule (baton 39, Open 4), 4c6a0484.** Measured first on the dev probe (below), old code: 36 of 36 runs failed with a piece in the cart and on the thank-you page, 18 of 18 with the set. Mended: the agree box (the clickwrap) a 44 by 44 reach inside its label (rises only into its own 16px gap, stops short of Check out; box and label as drawn; termsAccepted and the ask-first untouched); the piece's, the set's and the order bump's names whole (`break-words`) and allowed to checkMock by their picture twin; Remove `hit-44` (19.5px wide in Arabic); `text-end` and `text-start` for the right- and left-set lines; `me-1.5` and `rounded-s/e-pill` (the drawer's steppers too); the greens deepen on Light (3.68 to 3.89:1 before); the struck prices from 40% to the house's 45% (2.26:1 on Light before), and off faintWords' list. On the export with the main web live: **54 of 54 pass** (cart with a piece, with the set, the thank-you page with its follow-up offer; 390/800/1032, the 21, English and Arabic). Finger taps **10 of 10**: the box ticked from 20px beside it and unticked from 12px above it, 18px above the label and Check out's edge not the label's, unticked Check out sends nothing and asks first, Remove in Arabic from 10px past its words, both names open their piece. Test: `lib/shop/__tests__/cartScreensHeld.test.ts` (14 of 15 fail on the old code; the one that passes on both guards the clickwrap).

Suite 15,035 passed with only faintWords failing (2), which asked for the raised prices to leave its list: then 4 of 4. Typecheck 0; lint clean; web build 0.

## Open

1. **The motion walk on /shop/, the piece's picture carried** (baton 39, Open 2; brief item 3). Not started: past 150,000 by my own count. On a fresh export of the head: `NODE_USE_ENV_PROXY=1 node scripts/motion-walk.mjs out --only /shop/ --online --json <file>`. Owner: the next fixer, or the gate.
2. /reading/ and /settings/reading-mode/: the gate's (the arbiter's call, 07:21).

## Gotchas

- **A fresh container has no node_modules:** `npm ci` first (about 3 minutes). Playwright 1.60 then loads from the repo; launch with `executablePath: "/opt/pw-browsers/chromium"`.
- **The dev probe:** `BUILD_TARGET=android next dev` refuses while `proxy.ts` is in the tree (middleware with `output: export`). Set it aside only while the probe runs and put it back before any commit or suite (`saintAddresses.test.ts` reads it). Web mode instead fails on `next/image` (purifyapp.net is not in remotePatterns). The probe, with `localStorage["purify:force-native"]="1"`, found every fault the export then confirmed mended.
- **The cart's discounted lines draw only with a discount:** seed the set (icon, rope, cross); the order bump's offer price draws then too.
- **checkMock reads struck text:** the house's struck price is `text-paper/45` (every palette raises 42 and up, not 40).
- **get_session's used_tokens read 0 all round:** count your own.
- Shell heredocs that run Python were refused by the safety check; write scripts with the Write tool.

## Where things are

The round's runners, copied beside this baton (`docs/handoffs/updates-40-runners/`): `mockrun.mjs <out|http://localhost:3100> <jsonl> <conc> <route@width@lang@group[@cart|@set][@order][@press]>...` (checkMock with pixels, main web live; group 0 = the five and two earned, 1 and 2 = the looks; `press` taps the second filter first); `rec.mjs <out> <route> <selector> <on|reduce> <times> [nth] [--online]` (one tap recorded and judged by frames.mjs on a fresh phone); `taps.mjs <out>` (this round's finger taps); `look.mjs <lang> <png>` (the saints' grid and count, measured).

His words that still apply: "A release ships finished" (2026-11-11), "Spend only what was asked" (2026-11-09).
