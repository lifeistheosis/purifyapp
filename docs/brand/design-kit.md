# The Purify design kit

His word, 2026-11-12 (`docs/1.9-build/BRAINSTORM.md`): "I want it to be the standard for everything we do, right? We're gonna be using Purify type of designs. And I really want the design to be a massive factor, because it's what keeps us apart from everyone else."

So everything a chat makes for people to look at starts from this kit, never from a generic template: artifacts, reports, briefs, drop kits, plans shown as pages, and emails. The kit is the app's own look, taken from its source. Nothing in it is new.

## Rule one: phone first

His word, 2026-11-13: "the design must be optimized for mobile." Everything is designed at phone width first (360 to 412), then widened. Most of what we make is opened on a phone, his first of all.

- Headings take a phone's sizes first: a title at 34px and a section at 22px (`text-title-sm`), rising with clamp() to 48px and 26px on wide screens.
- No orphan, no empty half-row and no two boxes of unequal height at any width, because no piece is a row of tiles: figures are rows, things to act on are rows in one tray.
- A chart fits 360 wide with every value over its mark, and room above its highest.
- An email is one column, 100% wide up to 600px, body text 16px or more, every tap target 44px or more.
- The check renders the page and every email at 360, 390, 412 and 1032, and fails on a sideways scroll. Look at a still at 390 yourself before sending.

## Rule two: never parchment

His word, 2026-11-13: "and also stop using parchment for designs. (important because you always do this)". No design stands on the parchment ground (`#f1e8d4`, the app's Light palette) or on any aged-paper, cream or sepia look.

- A design opens on the app's dark ground.
- Its light, when one is needed (the email's light mode, `data-theme="light"`), is a clean neutral: white (`--color-paper`) carrying the app's ink (`--color-ink`, `#49424e`), with the admin panel's neutral grey for a card.
- `tokens.css` still lists Parchment, marked "app only, never a design ground", for mockups of the app's own Light palette. No piece reads it, and in the kit the app's Light attribute draws the clean neutral.
- `check.mjs` fails a design with a parchment, cream or sepia ground, however it is worn (as it opens, light, a light system, each palette), and proves that measure with its own self-test first.

## Rule three: every design is justified

His word, 2026-11-13: "you must justify your designs". Each design delivered to him carries a short reason for each choice: what it is, why, and what it does for the reader. He answers yes or no, and nothing designed ships without his yes. The kit's own reasons are under "Why the kit looks as it does" below, and the emails' are in `email/README.md`.

## What is in `docs/brand/kit/`

One system: a page and an email are the same look, made of the same pieces.

| File | What it is |
|---|---|
| `tokens.css` | The tokens: the five palettes (Dark, the clean neutral Light, Black, Candlelight, Monastery; Parchment listed for app mockups only), the ink's shares, type, space, radius, motion, the Church's red, money's three hues and the Night sky look. Each names its line in `app/globals.css` or `app/admin/admin-theme.css`. |
| `pieces.css` | The pieces: title, section, the night, the lead, figures, chart, split, bars, table, figure, note, tray, list, card, button, footer. Built only from the tokens. |
| `artifact-template.html` | One self-contained HTML page holding the tokens and pieces, with every piece shown once, as a weekly brief. Start an artifact or a report from a copy of it. |
| `email/` | The emails, in the same look: the reader email, its Nativity Fast season and the owner's brief, with their own `README.md`, `build.mjs` and `check.mjs`. Start every email there. |
| `check.mjs` | Renders the page at 360, 390, 412 and 1032 and holds it to checkMock on the five palettes at each width, to no sideways scroll and to no parchment; then runs the emails' own check. `--write` refreshes the page from the two CSS files and the app's pictures. |

The kit's first email template (`email-template.html`, light first, by the kit's first chat) gave way to `email/` on 2026-11-13, so the kit holds one email look and not two. It is in the repository's history at `ef1bec40`.

## On claude.ai

The kit is also a claude.ai design system, so decks and designs start from Purify's look: https://claude.ai/artifact/PJnQQWqgVybxZKzy2H3tt5 (the five palettes as its themes, the type, space and radius, the brand book with the guardrails, and the pieces with live previews). It is the owner's and private until he shares it. When `tokens.css` changes, change the design system's `tokens.json` to match.

## When to use it

- **Always**, for anything made for the owner, a reader or the public to look at: an artifact, a report, a brief, a drop kit page, a release email, a chart.
- **Not** for app code. The app is the source; the kit follows it. Nothing under `app/`, `components/` or `lib/` imports the kit.
- **Not** for pictures of the app (store pictures, cards, promo stills): those are real screens from the export (CLAUDE.md, "Mockups"). The kit is for the page around them.
- **The look is Fable's** from 2026-11-13, at the owner's word on seeing the first page on his phone: "you can definitely make a way better design than this. and ensure everything is optimized." The tokens stay the app's own values; a token is added only when the app has it, naming its line.

## How to use it

1. Copy the template you need into your own folder. Keep its `<style>` block whole; delete the pieces you do not use from the body, never from the style.
2. Write the words in the house voice (`docs/brand/voice.md`): sentence-case headings, no em dashes, plain sample words, figures that say "not read" when they were not read.
3. Use the pieces as they are. A new need is a new piece in `pieces.css`, built from tokens, added here and passed by the check, not a one-off style in your page.
4. Check it: at 360, 390, 412 and 1032 on all five palettes with checkMock (the way `check.mjs` does), and look at a still at 390. Then send it.
5. For an artifact on claude.ai, publish the copied page. It opens on Dark; `data-theme="light"` gives the clean neutral light, and `data-reading-mode` on `<html>` wears the app's other palettes.

## The look, in five lines

- **A page opens the way a chapter opens in the app:** the mark, a small line, the title, a line under it in italics, the short rule. Centred, and nothing else on the page is.
- **One thing leads, and it stands on the night.** The app's Night sky look, once on a page, holds the one figure that matters most and its week. Everything after it is quiet.
- **Quiet things sit on the page itself,** as rows with hairlines between. A thing is raised only when it is a thing to act on, and then it is the app's own tray.
- **Every value is whole.** A chart says each number over its mark, since a phone has no hover. The eight-point star stands over the best day, once, in a soft pool of light.
- **Labels are sentence case** (`docs/brand/voice.md`), never capitals spaced out.

## Why the kit looks as it does

Each choice, its reason, and what it does for whoever reads the page.

| The choice | Why | What it does for the reader |
|---|---|---|
| The page opens like a chapter in the app: mark, small line, title, italic line, short rule | It is the app's own opening, so a page reads as Purify before a word is read. No other product opens this way. | He knows at once what the page is and for which week. |
| DM Serif Display for the title and the lead figure, Lora for words, DM Sans for labels and numbers | They are the app's three faces, each in the job the app gives it. | Names and sentences read like the library; figures scan like an instrument. |
| One figure leads, on the app's Night sky | A page of equal boxes says nothing is more important than anything else. The night is the app's own look and the Nativity card's, so the lead is unmistakably Purify. | The one number that matters is read first, in one glance, on a phone. |
| Thin columns, every value over its column, the week before as a dashed line | A phone has no hover, so a bar with no number is a guess. The dashed line is the app's own way to show the period before. | Every day's figure is read without a tap, and the week is set against the last one in the same picture. |
| The eight-point star over the best day, in a soft pool of light | It is the Nativity card's own star, used once and for a reason: it marks something true. Never the four-point sparkle, never rays. | The week's best day is found without reading seven numbers. |
| Quiet figures as rows, never tiles | His phone showed three tiles of unequal height with one left alone. Rows cannot orphan and are always the same height. | The name, what changed and the number sit on one line each, in the order the eye wants them. |
| Money as one bar by its parts, each part named with its amount | Money's hues are the admin chart's own, so the page and the panel agree. A name and an amount beside each means no part is told by colour alone. | Where the money came from is read as words and numbers, with the bar for proportion. |
| Things to act on are rows in the app's tray, with one card and one button | Three bordered cards and a loose white pill were the generic part. The tray, the chevron and the full-width button are the app's own. One button means one next step. | What needs him is a short list he can tap down, with the most important thing as the one button. |
| Sentence-case labels | The house voice asks for it, and capitals spaced out are the mark of a template. | Labels read as words. |
| Dark first, and a clean white light with the app's ink | His words: the dark palettes lead, and no parchment. | It looks like the app he knows, and stays readable where a screen is light. |
| Phone first: one column, 17px words, 44px targets | He reads on his phone, and so do most readers. | Nothing has to be pinched, and nothing is missed by a thumb. |
| Fast: one file under 100KB, no library, three faces with real fallbacks | A page that waits on a library is slower than the brief deserves. | It opens at once, and reads in Georgia and the system's sans if the faces do not load. |

## The pieces, in one line each

- **Title** (`.k-title`): the app's cross in the page's ink, a small line, the title in DM Serif Display (34px on a phone to 48px wide), one line under it in Lora italic, the short rule.
- **Section** (`.k-section`): a heading in Lora (22px on a phone), running text in Lora at 17px on a 68-character line, as in the emails. A hairline between sections, never down an edge.
- **The night** (`.k-night`): Night sky, the app's own look: its sky, its small stars, the light along its horizon. Dark on every palette, as the Nativity card is. Whatever stands in it reads the night's ink.
- **The lead** (`.k-lead`): the one figure that leads, large in DM Serif Display with the glowing white's soft light, a line of what changed in words, and its chart. On the night. Once on a page.
- **Figures** (`.k-stats`): the quiet ones, as rows: a name and what changed at the start, the number at the end. Rows at every width, never tiles.
- **Chart** (`.k-chart`): the app's own method (`components/admin/charts.tsx`): one ink, thin columns, the period before as a dashed line, a legend for two series or more, every value over its column. The star marks the best day.
- **Split** (`.k-split`, `.k-keys`): one whole by its parts, for money in by source: one bar in money's own hues with a gap of the page between its parts, and each part named with its amount and the week before. No part is told by its colour alone.
- **Bars** (`.k-bars`): what was most: a name, its count, a thin bar to the longest.
- **Table** (`.k-table`): figures side by side: the words in the serif, the numbers to the end in tabular figures, sentence-case headings, hairlines, a caption under it.
- **Figure** (`.k-figure`): a picture from the app, rounded as the app's cards are, with a caption that names where it comes from. A still of a screen at a phone's width wears `.k-phone` too: it takes the column on a phone and stands at 390 in the middle of a wide one.
- **Pair** (`.k-pair`): before and after, two stills of one thing side by side at every width, each with its word under it. For a change that is seen and not read (a colour, a shape); a change to be read goes one under the other. Not shown in the template, since it needs two stills.
- **Note** (`.k-note`): a small line and the serif in italics, set in from the line. It stands on its own type: no rule beside it, no box.
- **Tray** (`.k-tray`): the app's raised card (`.theology-tray`): a step of the card's colour down its height, a fine edge, a sheen along its top, a soft shade under it.
- **List** (`.k-list`, `.k-row`): things to act on, as rows in one tray, each a way in with the app's chevron. Never three cards side by side.
- **Card** (`.k-card`): one thing and its one button, as Today's card is in the app and the saint's card in the emails.
- **Button** (`.k-button`): the app's primary (a pill in the ink, the ground's colour for its words), 48px tall and across its card on a phone. One to a page. The quiet one (`.k-button-quiet`) stands in a hairline, and a link that stands alone (`.k-link`) is underlined and 44px tall.
- **Footer** (`.k-foot`): a hairline, "Edgar, the Purify Team" in italics, one small line.

In an email the same pieces are drawn with tables and inline styles (`email/build.mjs`): the opening, the week as a leaf of the calendar, figures, columns, the split, bars, the card and its button.

## The rules it keeps

Every guardrail in CLAUDE.md holds for anything made from the kit:

- No light rays, no side stripes, no sparkle star (the `Sparkle` icon or the glyphs), no gold, yellow or amber (`lib/ui/goldTone.ts`).
- Pills only for a button or a small choice on the screen, never a list of places to go.
- Contrast at 4.5:1 on all five palettes; every control 44px; logical sides (start and end) so Arabic mirrors.
- No em dashes in any word. No reading of Scripture or of a Father written for a sample. Plus never promised to every reader.
- An icon is one from `components/ui/icons`, never a typed character.

The accent the app calls "gold" (`--color-gold`) is a glowing white on the dark palettes and an ink grey on Light, by his rule of 2026-10-28. The kit calls it `--k-accent` so nobody reads the name as a colour to use.

## Checking

```
node docs/brand/kit/check.mjs                # the page and the emails, five palettes, 360 390 412 1032
node docs/brand/kit/check.mjs --write        # after a change to tokens.css or pieces.css
node docs/brand/kit/check.mjs --shots <dir>  # and a still of the page on each palette at 390
node docs/brand/kit/check.mjs --page <file>  # a page made from the kit, held to the same measures
node docs/brand/kit/email/check.mjs          # the emails alone
```

It needs Playwright (`npm ci`, or the session's own). It fails when the page or an email fails a checkMock rule, scrolls sideways, or stands on parchment, and when the page no longer holds the two CSS files and the app's pictures as written. The emails' check also holds each email's file under 100KB, so Gmail never clips it, and each picture under 100KB. Named allowances: the night is a dark island on every palette, and money's two hues are the same on both themes in the app's admin too.

When the app changes a token (a palette, the type, the curve), change `tokens.css` to match, naming the line, run `--write` and the check, and say so in your report.

## Emails, in particular

Email clients run no scripts, many draw no SVG and Outlook reads no transparency, so an email does layout with tables and colour with inline styles in plain colours, written by `email/build.mjs` from the kit's tokens. Dark leads: the dark scheme is the one written inline, and a style block turns it to the clean neutral light where a client says the reader's screen is light. It is never parchment. An email's pictures each have their words, and nothing is fetched but pictures. Before a send, see it in Gmail, Apple Mail and Outlook, light and dark (`docs/plans/owner-desk.md`, section 3). The whole of it is in `email/README.md`.

