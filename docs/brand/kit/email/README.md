# The Purify email look

One look for every email Purify sends, and its first season, the Nativity Fast. Made by the Fable designer on 2026-11-13, at the owner's word: "we're still on like version 1 of like the email. So we can always make the email design better" (2026-11-12) and "yes auto but also we need to work on designs" (2026-11-13 04:39 UTC).

Open `index.html` to see it. One version of each, no variants.

**No parchment** (his word, 2026-11-13 about 04:57 UTC: "and also stop using parchment for designs. (important because you always do this)"). The dark palettes lead. Where a reader's screen is light, the email is a clean white carrying the app's ink, never the app's Light palette's paper and never a cream or sepia look. `build.mjs` refuses to write an email on that ground, and `check.mjs` fails a file that holds it.

**Phone first** (his word, 2026-11-13 about 04:55 UTC: "the design must be optimized for mobile"). Each email is one column, drawn for 360 to 412 wide and let out to 600. Running text is 17px. Every button and link is 44 tall, so no link sits inside a sentence. The sizes written inline are the phone's; a wide screen's are the exception.

## What is here

| File | What it is |
|---|---|
| `reader.html` | The reader email, with the Sunday email as its sample. The monthly note and a release letter are built from the same pieces. |
| `reader-nativity-fast.html` | The same email in the Nativity Fast (15 November to 24 December). |
| `brief.html` | The owner's brief, with three small charts drawn in the email itself. |
| `img/` | The pictures the emails show. |
| `shots/` | Each email as a mail client draws it, dark and light, for the page. |
| `index.html` | The page that shows them. |
| `build.mjs` | Writes all of the above. `page.mjs` is the page's own words. |
| `check.mjs` | Holds all of it to the guardrails. |

```
node docs/brand/kit/email/build.mjs     # the emails, the pictures, the page
node docs/brand/kit/email/check.mjs     # checkMock on the five palettes, and the rest
```

Each email is one file for a mail client: tables and inline styles, no script, no font or stylesheet fetched. The inline colours are the dark scheme, the app's default. One style block in the head turns it to the clean light where a client says the reader's screen is light. Nothing a reader needs is said only by a picture.

**Dark is the scheme written inline, and the kit's first email template did it the other way round** (`docs/brand/kit/email-template.html` as it landed was Light inline, Dark by the head). Three reasons for dark here: the dark palettes lead, by his word; it is what Purify sends today (`lib/email/theme.ts`, night); and a client that darkens a light email by force (Gmail's apps do) reads no style block, so it would leave the mark in ink on a darkened page, where a dark email is left as it is. One of the two files should give way; that is for the kit chat and the arbiter.

## The look

Nothing in it is new to Purify. Each piece is the app's own, set for a letter.

- **The page is the letter.** No card on a canvas. The words sit on the app's page colour, as a chapter does in the reader.
- **Dark leads, and the light is clean.** Dark is the app's default. The light is the app's own white (`--color-paper`) and its ink for a white page (`--color-ink`), with a card one step of that ink off the page.
- **The masthead.** The app's cross and the wordmark at the start, the date or the kind of letter at the end, a hairline under them.
- **The opening.** A small line, the title, a line under it in italics, and the short rule: how a chapter opens in the app. A season puts its own picture above it.
- **The week.** A leaf of the calendar: the day in the margin, the name beside it. A feast is said in words, set heavier, and marked in the rubric's colour where the page has one (red on a light page).
- **The card.** The week's saint as Today's card stands: a raised card, a small line, the name, and the app's own button across it. One button to an email.
- **The foot.** Why the email came, who sent it, and the Unsubscribe button, which every email carries (his word, 2026-10-06).
- **Labels are sentence case**, as `docs/brand/voice.md` asks and as the app's own cards set them. No capitals spaced out.

### Which pieces each letter uses

| Letter | Opening | Body | Card |
|---|---|---|---|
| The Sunday email | "The week ahead", the week's dates | The week | The week's saint |
| The monthly note | The month | Figures (the brief's three across) for what was added, then a paragraph | "See what is new" as the button, on its own |
| A release letter | The release's name, its own name under it | The release's picture, then its points as paragraphs with a name set heavier | "See everything that is new" |

A release's picture and each point's screenshot are the release's own, and each is checked against the heritage list before it goes in.

## The Nativity Fast

The season is the same email with four things changed, each from the app.

1. **It wears Night sky in the dark** (`html[data-look="nightsky"]` in `app/globals.css`). On a light screen it wears the clean light.
2. **It opens on the night of the Nativity card** (`components/today/NativityStarCard.tsx`): the small stars, the hill, its lit edge and the star of eight points, by the card's own numbers (`lib/reading/nativityStar.ts`). The star's height is `starTop(day)`, so it stands a little higher in each of the fast's six Sunday emails: days 1, 8, 15, 22, 29 and 36. The night stays a night on every palette, as the card does (`dark-island`).
3. **The card's own words** stand in the opening: "Nativity Fast · day 1 of 40" and "The star rises a little each day".
4. **Each day says its fast**, in the calendar's own words and colours ("Fish allowed", "Strict fast"), and one line opens the path for the fast ("A path for the fast: the Fathers, a day at a time").

The star is the Octogram's eight points, never the four-point sparkle. The light around it is a soft pool, never rays.

Later seasons take the same place: a picture from the app above the opening, one of the app's looks in the dark, the season's own words.

## Where every colour comes from

`build.mjs` reads the design kit's tokens first (`docs/brand/kit/tokens.css`) when it runs, and the app's stylesheet (`app/globals.css`) for what the kit does not carry. No colour is typed into it, so the look moves when the kit and the app do.

| In the email | Token | From |
|---|---|---|
| The page | `--k-ground` | the kit |
| A raised card | `--k-card` | the kit |
| Headings | `--k-ink` | the kit |
| Running text | `--k-ink-2` (the ink at `--k-ink-2-share`) | the kit |
| Labels and quiet lines | `--k-ink-3` (the ink at `--k-ink-3-share`), lifted where a palette needs it to hold 4.5:1 on a card as well as the page | the kit |
| Hairlines | `--k-line` | the kit |
| A control's edge, the short rule | `--k-line-strong` | the kit |
| A chart's quiet marks | the ink at the share that holds 3:1 | the kit's ink |
| The button, and its words | the ink, the ground | the kit |
| Money in, by source | `--k-money-shop`, `--k-money-plus`, `--k-money-box` | the kit |
| The night's ground | `--k-well` of Dark | the kit |
| A feast's mark | `--ink-rubric` | the app |
| Each fast | `--fast-strict`, `--fast-fish`, `--fast-wine-oil`, `--fast-free` | the app |
| Night sky's page, card and ink | `html[data-look="nightsky"]`, at Dark's shares | the app |

The last three are for the kit to take in, if the kit chat agrees: the rubric, the fasting registers and the looks.

**The clean light.** The kit's light was parchment when this was built, so the light here is the app's own pair for a white page: `--color-paper` (white) for the ground and `--color-ink` for the ink, a card at 4 percent of that ink on the page, and the kit's shares for Light. The rubric and the fasting registers on a light page are the ones the app's Light palette has, since they are its inks for a light page and not its paper. When the kit's light lands as a clean neutral in a block of its own (`:root[data-theme="light"]`), `build.mjs` reads it from there first.

A share is laid on the page and written as one plain colour, because Outlook reads no transparency.

The faces are the ones `lib/email/theme.ts` names: Lora and DM Sans where a reader has them, Georgia and Arial everywhere else. Named, never fetched.

## The brief's charts

Drawn with table cells, since a mail client runs no script and Gmail shows no SVG.

- **Seven days:** one series, so no legend. The last day is in the page's ink with its number over it, the six before it quieter.
- **Money in:** one bar in the money chart's own three colours, a gap of the page between its parts, and under it each part's name and amount in the page's ink. No part is told by its colour alone.
- **Opened most:** a name, its count, a bar to the longest.

There is nothing to hover in an email, so every number a chart needs is said in words beside it. A figure that could not be read says "not read", never 0. Every figure in `brief.html` is a sample made up for the drawing: the real ones are read when the email is made and are never written into the repository. No reader is ever named.

## The check

`node docs/brand/kit/email/check.mjs`, run on 2026-11-13. It passed.

- **checkMock** (`scripts/mock-check.mjs`), all fifteen rules, on each email at 360, 390, 412 and 1032 wide, on Dark, Black, Candlelight, Monastery and the email's clean light, and in Arabic's direction. The season's email is held on Night sky as well. Twelve runs, twelve passes. An email's colours are written inline, so the check draws the same marks with every colour a custom property and wears the palettes on that. Where checkMock wears the app's Light, the drawing wears the clean light, since that is what an email is sent in on a light screen.
- **No parchment.** No email and no page here holds the app's Light paper (#f1e8d4, #e7dcc1, #e6dcc4).
- **Phone first.** At each of the four widths nothing runs past the screen's edge and no word is cut by its box. Stills were looked at by eye at 360, 390 and 1032.
- **The file a mail client gets is that drawing.** With the reader's screen dark, every colour in it is the one the checked drawing wears on Dark (Night sky in the fast), and with it light, the clean light: 115, 135 and 250 pieces, each the same.
- **Nothing runs and nothing is fetched** but the pictures, and every picture has its words.
- **The heritage list** (`lib/marketing/heritagePictures.ts`): no picture here is on it.

Named allowances, both listed by the check: the night is a dark island on every palette, and the money chart's colours for Plus and the Box are one on both of the panel's themes.

By eye: the icons are the app's own mark and no other; Plus is promised to no one; the sample week is the calendar's own for 15 to 21 November 2026 and no line of Scripture or of a Father was written for it; the words are the app's and the Sunday email's own wherever they exist.

**Not done here.** A look in real Gmail, Apple Mail and Outlook, light and dark, before any send. The pictures on the page are drawn by a browser, which honours more than Outlook does. In Outlook on Windows the corners are square and the faces Georgia and Arial; nothing depends on either.

## For the build

1. **The pictures need a home on the main web** before a send: the night for each day, and the mark in the light page's ink. In these files they sit in `img/` beside the email, and the saint's picture is a copy of the library's own.
2. **The night is one picture a day.** `build.mjs` draws any day of the forty; only day 1 is drawn so far.
3. **Each day's fast** is `fastingStatus` in `lib/calendar/orthodox.ts`. `lib/email/weekly.ts` does not carry it yet.
4. **A finding in the Sunday email as it stands.** `weekAhead` names a day by its saint before its commemoration, so 20 and 21 November 2026 both read "The Most Holy Theotokos" where the calendar has "Forefeast of the Entrance of the Theotokos" and "Entrance of the Most Holy Theotokos into the Temple". The sample here uses the commemoration's name. This is for the arbiter to route; nothing in `lib/` was touched.
5. **The saint's picture** is left out when it is on the heritage list, and the card stands on its words.
6. **The company's name and postal address** in the foot come from `lib/email/consent.ts`, as now.
