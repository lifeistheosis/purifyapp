# Baton: Updates 72 (the shop's "couldn't reach" jump from Discover's Shop door)

Written 2026-11-14 about 23:45 UTC by Updates 72, a fixer started by Arbiter 14 (session_01VuYTwdsjnmK235qQJH2FGJ). The item is mended and proved; one finding outside its files is open.

## What it was

- **The walk before** (export `5c4bd9562`, offline, `--only /discover/`): 22 tapped, 1 FAIL. The Shop door: `div "We couldn't reach the shop..." jumped 208px in one frame (from 0,544 to 0,336), 258ms after the tap`.
- **The app, not the walk.** Offline the shop's three reads (home, config, catalogue) fail, and the home's failure can be drawn before the catalogue's. The error stood under Shop by saint's held row (132px and its 20px margin) and under the featured card still holding its icon's place (275px at 390 wide). When the catalogue failed too, both let go (the card to 220px): 152 + 55 = 208px.
- **What the error replaced:** New in's bones (a place of another height, about 700px), with the two held places above them left standing.
- **The same fault when all three fail at once** (probe, direct arrival): the card dropping its icon's place moved its own search button 153px and its line 26px. That would have been the walk's next finding.

## The mend (`d9430475`)

- `components/shop/ShopHomeClient.tsx`: the error is drawn once the catalogue has answered or failed (`error && settled`), and New in's bones stand until then (`loading || !settled`). The error takes their place in one frame, with nothing above it still held.
- `components/shop/FeaturedIcon.tsx`: `unreachable` keeps the icon's place, still (no pulse), when the shop cannot be read. The card holds 275px at 390 (English) from its wait to the error.
- The words are unchanged. Online nothing differs: with no error the conditions are the old ones.
- **Test** `lib/shop/__tests__/shopHomeUnreachable.test.ts`: on the old code 3 of 5 fail ("Shop by saint still held over the error (settled false, loading false, error true)"; "the card's side column (settled true, loading false, error true): expected false to be true"; the kept place's pulse). All 5 pass on the new.
- **Checks:** typecheck exit 0; `npm run test:unit` exit 0 (1200 files passed, 1 skipped; 15186 tests passed, 9 skipped); eslint clean on the 3 files. The web build was not run (no CSS, no shared file). The push guard passed (35s).

## After (export `d9430475f`)

- Probe, offline: the card stays at 275px through the error. The only shift is the trust row rising from off screen (from 0,0,0,0), which the judge reads as a box coming into being.
- Walk `/discover/` offline: 22 tapped, 0 failed, 0 findings, exit 0.
- Walk `/discover/` online: 22 tapped, 1 failed. It is not the shop (below).
- checkMock `{ pixels: true }` on the shop home in its error state (the whole home), at 390, 800 and 1032, in English and Arabic, on the five palettes and the fourteen looks: 0 failures and 0 unmeasured in each. The 1 allowed at 800 and 1032 is the existing `stripe` allowance between the foot's two doors.

## Open

| What | Owner | Next step |
|---|---|---|
| `/discover/` online, the Chat door: the feed's "Announcement" article drawn first at 9,698 then at 9,617, 679ms after the tap (misplaced). It lands on `app/(app)/community/page.tsx`. | a fixer for the community feed (not this chat's files) | Seen once on `d9430475f`. Not walked online on `5c4bd9562`, so its age is unknown. Reproduce with the walk, `--online --only /discover/`; the still is `discover-c13-misplaced-0.png`. |

## Gotchas

- The export moves 1,457 web-only routes out of `app/` while it builds, and the stop hook asks to commit them as deleted. Never commit then.
- On Discover, `probe72.mjs`'s door tap lands on a heading, not on the door's link. Use `--direct` (`router.push` to `/shop/`).

## Where things are

`docs/handoffs/updates-72-runners/probe72.mjs` shows the shop's arrival with every layout shift, its box and its time, offline or `--online`, `--direct`. `mock72.mjs` runs checkMock with pixels on the shop's error state for each `width@lang` given, with stills written to `$SHOTS`.
