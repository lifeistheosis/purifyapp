# The emails, round 3: held, not shipped

His words, 2026-11-13 about 16:44 UTC, with the fasting companion open on his
phone (`docs/brand/kit/email/his-note-2026-11-13.png`): "keep all the emails
default Purify colors. and also revamp the calendar design one".

Made by the Fable designer (session_01VuYTwaZ1a8DbrXRnQEaCLZ) the same day.
Nothing here is loaded by the app, and nothing was sent. It waits on his yes or
no, on https://claude.ai/artifact/PsWzPU7ycgdmGzFjzLYdz5 (private; the page's
own source is `page.html`, its pictures `stills/`, its maker `make-page.mjs`).
On his yes an Opus chat applies `held.patch`: `lib/email` is app code, and the
sending's first-send guard is armed.

## The two things he answers

1. **The default colours, in every email.** One palette, Dark, the app's
   default (page `#101013`, card `#1d1d20`, the night card's well `#0b0b0e`,
   the app's white ink and its shares, the glowing white `#eaeaec`, the
   calendar's fasting colours), on a dark screen and on a light one, in a fast
   and out of it.
2. **The fasting companion's calendar, drawn again**, as the app's calendar
   stands on a phone: the week as one row of the month, what each fast allows
   (the calendar's own FastFact), and the feasts on the calendar's card.

## What was not the default (the audit)

Every colour written in each email of `docs/brand/kit/email/` at `36eeb55d`,
against Dark's own:

- **Night sky**, in the fasting companion's two emails and the Sunday email in
  the Nativity Fast: page `#05070d`, card `#0f1420`, ink `#edf0f6` and its
  shares `#b3b6bc` `#85878d`, lines `#1c1e24` `#33363c`. Six or seven
  colours an email. In the app: `KIT_NIGHT_SKY` (`lib/email/theme.ts`), worn by
  `kitLetter` when `body.season` is the Nativity Fast.
- **The light scheme**, in all nine emails, where a mail app follows a phone
  set light: page `#ffffff`, card `#f3f3f3`, ink `#49424e` and its shares
  `#5b5560` `#6d6871` `#8b868e`, lines `#edeced` `#dbd9dc`, rubric
  `#962820`, the fasts `#a82828` `#1e6e68` `#7040a0` `#167652`, money
  `#2a78d6`. Thirteen colours an email. In the app: `KIT_LIGHT`, in every
  letter's style block (`lib/email/kit.ts` `sheet`).
- **Already the default, and not moved:** the night card (Dark's well and its
  ink's shares), the Sunday email outside a fast, the brief, the first week's
  three and where you left off on a dark screen. Their stills are the same
  bytes before and after.

Taking the light scheme out is the larger of the two readings of his words. It
is what "all the emails default Purify colors" says, and it also ends a real
difference: Gmail does not follow a phone's light setting inside an email, so
its readers saw Dark while Apple Mail's saw white. If he says no to that part
alone, the way back is `sheet()` and the `only-light` pictures in
`build.mjs` and `kit.ts` as they stand at `36eeb55d`.

## What `held.patch` holds

Made against `745e45f1` (this folder's own commit is on top of it; the patch
touches nothing here). 35 files, 327KB with its small pictures.
`git apply --check --binary` passed on that commit.

- `docs/brand/kit/email/build.mjs`: `SENT` (Dark) is the one palette; Night
  sky and the light style block are gone; `weekStrip` is the new calendar;
  every fasting register has its mark (`FAST`), and a feast its cross
  (`feastCross`); six new slots (`fastFast`, five tints, `festal`).
- `check.mjs` there: each file is held to Dark piece by piece on a dark screen
  and a light one, and fails on any colour that is not Dark's own or on
  anything that turns on the reader's scheme.
- `README.md`, `page.mjs` there, and `docs/brand/design-kit.md`: the words,
  with the reason for each choice.
- The nine emails and the two pages as `build.mjs` writes them, and the marks
  in `img/` (the fast marks redrawn at 20px; `fast-free`, `fast-plain`,
  `feast-cross` new).
- `lib/email/theme.ts`: `KIT_NIGHT_SKY` and `KIT_LIGHT` gone, the six new
  slots in `KIT_SLOTS` and `KIT_DARK`. `lib/email/kit.ts`: no light block,
  `color-scheme: dark`, one cross. `lib/email/kitLetters.ts`: the fast's
  Sunday email wears `KIT_DARK`; `KIT_ASSETS` has no `crossInk`.
- Tests: `lib/email/__tests__/kit.test.ts`, `kitLetters.test.ts`,
  `lib/admin/__tests__/ownerBrief.test.ts`. Seven of them fail on the old
  code (run with the three `lib/email` files put back).
- `public/email/cross-ink.png` deleted: no letter names it any more.

Not in the patch: `docs/brand/kit/email/shots/`. The build writes them.

## To apply it, on his yes

```
git apply --index --binary docs/1.9-build/drafts/emails-round-3/held.patch
git rm docs/brand/kit/email/shots/*.light.png
node docs/brand/kit/email/build.mjs        # writes shots/ (and img/, the emails, the pages: no change to what the patch brought)
node docs/brand/kit/check.mjs              # the kit page, then the emails
npm run typecheck && npm run test:unit && npm run lint
```

Then the fix checklist, and the commit. If he says yes to one of the two and
no to the other, do not apply it: ask for the patch to be cut again.

**The retention look is still not in the app** (`LOOKS` in
`lib/email/retention/render.ts` is empty). When it lands, it lands from the
builder as this patch leaves it, and its pictures go to `public/email/`: the
four `hero-*.jpg`, `fast-fish`, `fast-strict`, `fast-wine-oil`,
`fast-plain`, `fast-free`, `feast-cross` and `arrow` (the `.png` of each,
never the `-ink` or `-light` ones, which only the check's drawing shows).

## What was measured, with the patch applied

- `node docs/brand/kit/check.mjs`: the kit page and the emails pass. checkMock
  on each of the nine emails at 360, 390, 412 and 1032, thirty-six runs, on
  the five palettes and in Arabic's direction; every file Dark piece by piece
  on a dark and a light screen; every colour written in every file Dark's
  own; 6.5 to 26KB of HTML; no picture over 64KB; none on the heritage list.
- `npm run test:unit`: 1,129 files, 14,574 tests passed, 9 skipped.
  `npm run typecheck`: 0. `eslint` on the six `lib` files: 0.
- The page: `node docs/brand/kit/check.mjs --page docs/1.9-build/drafts/emails-round-3/page.html` passes.
- By eye at 390: the opening, the week in, the Sunday email in the fast, and
  the opening with pictures blocked.

Not done: a look in real Gmail, Apple Mail and Outlook, with the phone set
light and set dark. Not built: the native exports (no page of the app
changed). The page was not seen on a phone; its fourteen pictures are
published with it as its own files.

## Found and not touched

- **The account and order emails' shell** (`lib/email/theme.ts`
  `EMAIL_THEMES.night`, drawn by `layout.ts` and `blocks.ts`) was outside this
  job's list. Its canvas is the app's well (`#0b0b0e`) and its card the app's
  card, but its inks are near the default and not it: heading `#f4f4f5`, body
  `#d6d6da`, a purple grey for quiet words `#a39ea8`, line `#2e2e33`, well
  `#141417`. If "all the emails" means these too, they take the same slots
  (`KIT_DARK`); that is a look he has not seen, so it wants its own stills.
- **The kit's own page** (`pieces.css`, `.k-night`) still leads on Night sky.
  It is a page, not an email, and he said yes to it.
