# The Terms, the Privacy Policy and the shop's policy in one look (Fable Theology, 2026-11-10)

His word, about 16:30 UTC: "and also can you revamp the TOS design?" His "rec
yes to all" (about 16:45 UTC) gives the Privacy Policy and the shop's policy
the same look. The arbiter's brief: one set of stills first, in the house
style, from the app's own parts; checkMock on five palettes; not one word
changed, since it is approved legal text; and any change inside the text
components agreed with Admin, which holds them.

This file is the record. It was written with the work held back: nothing of it
was pushed before his yes on the stills.

## What a reader had

A label and one long column. The Terms ran to nineteen screens of a phone
with nothing to find a section by. The page said its name twice at the top
(the bar and a label). On the Privacy Policy ten of the twelve sections were
named by small grey captions, which a screen reader could not move by, and
one of its two boxes was edged in gold, against the house rule.

## What a reader has now

- **One quiet bar.** It takes the page's name once the head has gone up
  under it (the bar's own `revealTitleOn`), as Theology's pages do.
- **A head.** The text's mark on a plate (a quill, a lock, a van, from
  `components/ui/icons`) and the page's name, small, over the text's own
  title in Lora.
- **Contents.** Under the opening words, one folded row, "Contents" and how
  many sections. Opened, it is the text's own headings, each a row of 44px
  or more. A tap brings the section up under the bar. On a computer the same
  list stands beside the text as a rail that stays with the reader, the
  section being read in the full ink.
- **The words at the size a study is read at.** Section headings in Lora at
  21px, running words at 16.5px, lists and links to match. What a text sets
  in bold stays in the full ink, so the arbitration notice is as plain to see
  as it was.
- **The other texts at the foot**, as rows. The shop's policy is listed only
  where the shop is open (`lib/shop/flags.ts`).
- **The same in the sheet** that opens wherever the app says you agree
  (`components/legal/LegalSheet.tsx`, untouched): the same text, the same
  folded list, scrolling the sheet's own scroll.

## How the words were kept

- The three text components keep every word, every element and their order.
  Only their class strings changed, and each gained one line, the contents,
  under its opening words.
- Proved, not trusted: each text was compared before and after with its tags
  and classes stripped out, character for character. The Terms, 3,107 words;
  the Privacy Policy, 8,887 across English and German; the shop's policy, its
  23 catalog keys in order. Links and the order of elements were compared
  the same way.
- The contents list keeps no copy of any heading. It reads them from the
  page (`components/legal/LegalContents.tsx`), from the text's own root only,
  so it cannot name a section the text does not have, in any language.
- `TERMS_VERSION` and the Terms' date are untouched. No reader is asked to
  accept again.

## Files

| File | Change |
| --- | --- |
| `components/legal/legalStyle.ts` (new) | The one look: how a title, an opening paragraph, a heading, running words, a list, a link and a raised surface are set. |
| `components/legal/LegalContents.tsx` (new) | The contents: folded inside the text, or a rail beside it. Read from the page's own headings; scrolls by element, changes no address; the heading takes the keyboard's place after the scroll; instant with motion off. |
| `components/legal/LegalPage.tsx` (new) | The frame the three pages share: head, the rail on a computer, the other texts at the foot. The bar is each page's own to draw, as every page's is (`lib/nav/__tests__/backBar.test.ts`), and waits for the frame's head. |
| `components/legal/TermsText.tsx`, `ShopPoliciesText.tsx` | Classes from the shared file; the contents under the opening words. No word. |
| `components/legal/PrivacyText.tsx` | The same, in English and German alike. Its ten captions are headings (`h2`); its two boxes are raised trays; no gold. No word. |
| `components/privacy/PrivacyDe.tsx` | Draws the German text only; the page's name stands in the frame. |
| `app/(app)/terms/page.tsx`, `privacy/page.tsx`, `shop/policies/page.tsx` | Each is its bar and its text in the frame. The shop's policy stands under the shop's tabs and takes no bar of its own. |
| `lib/legal/__tests__/legalLook.test.ts` (new) | Holds the look to the shared file, the contents to the page's own headings and no address change, the frame to all three pages, and no gold, old sizes or side stripes. |
| `scripts/mock-legal-pages.mjs` (new) | Opens the three pages and the sheet on the native export, measures them, holds each to `checkMock` on five palettes, checks Arabic, and takes the stills. |

## Agreed with Admin (19:16 UTC)

Admin had nothing unpushed in these files and said yes to the four changes,
with conditions, all met: each text's outer element, language and direction
untouched; links underlined; headings read from the text's own root and never
the document (the same text can be on the page and in a sheet at once);
scroll by element, no id and no hash, so Back still closes the sheet in one
press; a real button with `aria-expanded`; rows, not pills; rendered closed
until mounted; the rail on a computer only (a tablet in the apps keeps the
folded list); the foot's rows are links, so the switch is the house's page
transition. Admin reads the patch before it is pushed.

## Choices he can change

1. The contents are folded on a phone, so the text starts on the first
   screen. They could stand open.
2. The marks: a quill, a lock, a van.
3. The foot leads to the other texts.
4. The Privacy Policy's ten captions became headings: the same words, a
   different rank.

## Checked, on the held patch

- `npm run typecheck`: 0 errors.
- The legal tests (`lib/legal`, with Admin's `legalSheet`, `privacyLevel`,
  `termsDate` and `recordAcceptance`, and `lib/admin`'s `privacyLines`), the
  direction rule, no side stripes, no rays: passing.
- `npm run build:android`: green.
- `node scripts/mock-legal-pages.mjs`, on the export: the three pages and the
  Terms in the sheet pass `checkMock` on all five palettes, all ten checks,
  with the contents open. Measured: one bar and one way back; the mark on
  the first screen; nothing wider than the screen; the contents' count equal
  to the text's sections and their rows equal to its headings, word for word
  and in order; every row 44px or more; a tap landing its section under the
  bar with the address and the history as they were; in the sheet, the
  sheet's own scroll moved and the page beneath did not; a link inside to the
  Privacy Policy bringing its own list; in Arabic, the frame mirrored, the
  list's name the reader's, the English headings left to right and marked
  English.
- `node scripts/legal-sheet-walk.mjs`: all clean, in both arms.
- By eye, on stills: the Terms at 390 (as it opens, contents open, section
  13 after a tap, the foot), the sheet (as it opens, contents open), the
  Privacy Policy (as it opens, its two boxes), the shop's policy, the Terms
  in Arabic; on a computer, the Terms (as it opens, reading section 13), the
  Privacy Policy, and the sheet.

Still to run before the push, on the final tree: the full unit suite, lint,
the Android export again (two small changes came after the one above: the
rail kept to a computer, and the contents' English names aligned by the rows'
rule under Arabic), `rtl-walk` on the two pages, and the website build.

## His yes, and what changed before the push (2026-11-10, about 20:07 UTC)

His word, to his decisions page: "Yes to all recommended suggestions. Do them
all." Call 21 there was this look, "as shown" (`docs/1.9-build/BRAINSTORM.md`).

Two things are different from the patch as it was held, neither in the words
and neither on a phone:

- **The bar is each page's own again.** The held patch had the frame draw
  the bar. Only a page or a layout may mount one
  (`lib/nav/__tests__/backBar.test.ts`), so the Terms' and the Privacy
  Policy's pages draw it, as they did before, and it waits for the frame's
  head (`revealTitleOn={LEGAL_PAGE_NAME}`). What a reader sees is the same.
- **The rail's rows on a computer are 44px, not 36.** The wide still showed
  the rows drawn closer under a mouse. The app's floor for anything pressed
  has no smaller size for a pointer, and the count of small targets may only
  fall (`lib/ui/__tests__/touchTargets.test.ts`), so the rows are 44px for
  everyone. The Terms have seventeen sections: on a window too short for
  them the rail scrolls inside itself and keeps the row of the section being
  read in sight, moving itself alone and never the page.

