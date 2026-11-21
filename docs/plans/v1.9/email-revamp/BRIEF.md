# The email revamp: the brief

His word, about 2026-11-21 03:58 UTC, after seeing the 1.9 release email as it would be sent: "revamp the whole email design".

**Status:** stage 1 (one design for his yes) goes to one fresh chat with a cap, at his choice. Nothing in `lib/email` changes in stage 1.

## His four answers (asked as four choices)

1. **Direction:** "all 3". A hero picture of the app and a real screen beside each main point; big clean headings, more space and shorter lines; each new thing in its own card, like the app's What's New.
2. **Fonts:** "All sans". The app's clean sans everywhere, as he asked of the ad's titles the day before ("the minimalist, like, better font").
3. **Scope:** "Release email first". One design for his yes, then the same look rolls out to the others.
4. **Where:** "One fresh chat, capped", at about $12 for the first design.

## What exists today

- The letter every reader email wears: `lib/email/kitLetters.ts`, `lib/email/kit.ts`, the palette `KIT_DARK` in `lib/email/theme.ts`, chosen by `READER_EMAIL_LOOK` in `lib/email/look.ts` ("2" today). It is a plain dark letter: a small mark, a serif title, paragraphs and one white button.
- The release email's words: `releaseBody` in `lib/email/templates/contentBodies.ts`, from the release's note and its letter (`lib/whatsNew/releaseEmail.ts`). `node scripts/release.mjs email` writes it to `.release-logs/email/` (it passes since 2026-11-21).
- The first-send guard: when the look's version changes, the first email that would go out by itself goes to him alone until he says he has seen it (`lib/email/look.ts`, `lib/admin/autoSends.ts`).
- The design kit and its check: `docs/brand/design-kit.md`, `docs/brand/kit/` (its `check.mjs` fails a design on parchment).
- Real screens of 1.9 to draw from: the store pictures and their script (`docs/plans/v1.9/store/`), or the native export of main `6700c2e65`.

## Stage 1: one design, for his yes or no

The 1.9 release email in the new look, as one HTML file and its picture at phone width, on a page of his own with a short reason for each choice. One version, no variants.

- **Real screens only.** Every picture of the app is the app's own screen, from the store pictures' takes or the export of main `6700c2e65`. No interface is drawn by hand. Pictures carry alt text, and the email still reads with pictures off.
- **The words are the email's own words today** (the note's and the letter's). Nothing is written new except, if needed, a short line that the app or the note already says. Plus is named where a point is about Plus. No em dashes.
- **It must work as an email:** tables and inline styles, dark, made at 360 to 412 wide first and then widened, a sans stack that falls back well (`'DM Sans', Arial, Helvetica, sans-serif`), buttons at least 44 px high, words at 4.5 to 1 or better, the whole HTML under 100 KB so Gmail does not clip it, and the footer kept whole (why they get it, the company and its postal address, Unsubscribe).
- **The house's rules:** no parchment, no rays, no side stripes, no sparkle; pills only for a small choice; cards are the app's kind of card, not a stripe beside a quote. checkMock and the kit's check pass on the design's page.
- **Out of stage 1:** changing the sender. Wiring the look into `lib/email`, raising `READER_EMAIL_LOOK` (which arms the first-send guard), the tests, the other emails (welcome, Sunday, account, order) and the push to main that carries it to readers are stage 2, each at his yes.

## The cap

About $12 for stage 1. A chat cannot read its own cost inside a turn, so it counts instead: it stops and delivers what it has by 60 tool calls or 150,000 tokens of its own count, whichever comes first. He can lift the cap by saying so in that chat.
