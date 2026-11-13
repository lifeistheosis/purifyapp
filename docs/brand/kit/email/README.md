# The Purify email look

One look for every email Purify sends, and its first season, the Nativity Fast. Made by the Fable designer on 2026-11-13, at the owner's word: "we're still on like version 1 of like the email. So we can always make the email design better" (2026-11-12) and "yes auto but also we need to work on designs" (2026-11-13 04:39 UTC).

Open `index.html` to see it. One version of each, no variants.

**The app's default colours, in every email** (his word, 2026-11-13 about 16:44 UTC, on seeing the fasting companion on his phone: "keep all the emails default Purify colors. and also revamp the calendar design one"). Round 3. Every email is sent in one palette, Dark, the app's default: the page `#101013`, a card `#1d1d20`, the night card's well `#0b0b0e`, the app's white ink and its shares, the glowing white for the button and a feast's cross, and the calendar's own fasting colours. On a dark screen and on a light one, in a fast and out of it. Until round 3 the fast's emails wore Night sky (a navy page, `#05070d`, and a navy card, `#0f1420`) and every email turned to a white page in a purple grey ink (`#49424e`) where a reader's screen was light; both are gone. `check.mjs` fails a file that holds any colour that is not Dark's own, or that turns on the reader's scheme.

**No parchment** (his word, 2026-11-13 about 04:57 UTC: "and also stop using parchment for designs. (important because you always do this)"). `build.mjs` refuses to write an email on that ground, and `check.mjs` fails a file that holds it.

**Phone first** (his word, 2026-11-13 about 04:55 UTC: "the design must be optimized for mobile"). Each email is one column, drawn for 360 to 412 wide and let out to 600. Running text is 17px. Every button and link is 44 tall, so no link sits inside a sentence. The sizes written inline are the phone's; a wide screen's are the exception.

## What is here

| File | What it is |
|---|---|
| `reader.html` | The reader email, with the Sunday email as its sample. The monthly note and a release letter are built from the same pieces. |
| `reader-nativity-fast.html` | The same email in the Nativity Fast (15 November to 24 December). |
| `brief.html` | The owner's brief, with three small charts drawn in the email itself. |
| `img/` | The pictures the emails show: the mark, the night, the night cards' pictures (`hero-*.jpg`), the calendar's fast marks (`fast-*.png`), a feast's cross (`feast-cross.png`) and the button's arrow. All written by `build.mjs` from the app's own files. A file ending `-ink.png` or `-light.png` is the same mark in a light page's ink: only the check's own drawing shows it, and no email names it. |
| `shots/` | Each email as a mail client draws it, for the page. |
| `faces/` | Two open faces the stills are drawn in, since this machine has neither Georgia nor a phone's sans: Gelasio, made to Georgia's widths, and Roboto, Android's own. For the pictures and the check only. No email fetches a font. |
| `first-week-*.html`, `pick-up.html`, `fast-*.html` | The retention emails: see "The retention emails" below. |
| `index.html`, `retention.html` | The pages that show them. |
| `build.mjs` | Writes all of the above. `page.mjs` is the page's own words. |
| `check.mjs` | Holds all of it to the guardrails. |

```
node docs/brand/kit/email/build.mjs     # the emails, the pictures, the page
node docs/brand/kit/email/check.mjs     # checkMock on the five palettes, and the rest
```

Each email is one file for a mail client: tables and inline styles, no script, no font or stylesheet fetched. The inline colours are Dark, the app's default, and the head tells a mail client the email is dark already (`color-scheme: dark`), so none turns it. Nothing a reader needs is said only by a picture.

**One palette, written inline.** Three reasons: it is his word; it is what Purify sends today (`lib/email/theme.ts`, night); and a light scheme was never the same email for everyone, since Gmail reads no style block for a light screen and showed Dark while Apple Mail showed white. Now every reader has the one a reader of the app knows. The kit's first email template was light first; it gave way to this folder on 2026-11-13, so the kit holds one email look.

**Small.** Each email is under 30KB of HTML, far under the 100KB past which Gmail clips one, and each picture is under 100KB. The check holds both.

## The look

Nothing in it is new to Purify. Each piece is the app's own, set for a letter.

- **The page is the letter.** No card on a canvas. The words sit on the app's page colour, as a chapter does in the reader.
- **One palette: Dark, the app's default.** On every screen, in every season. No email turns light, and none wears another of the app's looks.
- **The masthead.** The app's cross and the wordmark at the start, the date or the kind of letter at the end, a hairline under them.
- **The opening.** A small line, the title, a line under it in italics, and the short rule: how a chapter opens in the app. A season puts its own picture above it.
- **The week.** A leaf of the calendar: the day in the margin, the name beside it. A feast is said in words, set heavier, and marked in the rubric's colour, which is white in the dark as the app has it.
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

## Why the emails look as they do

His word, 2026-11-13: "you must justify your designs". Each choice, its reason, and what it does for the reader. He answers yes or no to each design.

| The choice | Why | What it does for the reader |
|---|---|---|
| No card on a canvas: the page is the letter | A white or grey card centred on a canvas is every product's email. The app's reading page has no card either. | It reads as a page of Purify, not as a notice from a service. |
| It opens like a chapter: title, a line in italics, the short rule | The app's own opening. One look for every letter Purify sends. | The reader knows what this is and for when before reading a row. |
| The week as a leaf of the calendar, the day in the margin | The Sunday email is a calendar, and a reader scans it for one day. Service books set the day in the margin. | A day is found by its number in one pass of the eye. |
| A feast said in words, set heavier, in the rubric's white | The rubric is the Church's own way to mark a feast, and the app keeps it white in the dark. Never by colour alone. | Feasts stand out at a glance and still read for anyone who sees no colour. |
| The week's saint on the app's card, with the one button | It is Today's card. One button is one invitation. | The one thing to do next is plain, and 48px tall under a thumb. |
| In the fast: the night of the Nativity card, the star higher each Sunday | The owner chose that card for the fast in the app. Carrying it into the email makes the season one thing across both. | Six Sundays show the fast moving toward the feast without a word of urging. |
| In the fast: each day says its fast | "What may I eat this week" is the question a fast raises, and the calendar already answers it. | The email is useful on Wednesday, not only on Sunday. |
| The brief: what needs him first, then three figures, then three small charts | A brief is read in a minute on a phone. What needs a decision comes before what is only interesting. | He can stop reading after the first screen and have missed nothing urgent. |
| Charts drawn with table cells, every number also in words | A mail client runs no script and Gmail shows no SVG. | The charts appear in every client, and nothing depends on them. |
| One palette: Dark, the app's default, on every screen and in every season | His word: "keep all the emails default Purify colors". A light scheme was also never one email: Gmail showed Dark and Apple Mail showed white. | It is known as Purify at a glance, and it is the same email for everyone. |
| Georgia and Arial where Lora and DM Sans are not on the device | No font is fetched, by the house's rule, so the look must stand on what every device has. | It opens fast and never flashes from one face to another. |

## The Nativity Fast

The season is the same email, in the same default colours, with three things changed, each from the app. (Until round 3 it also wore the app's Night sky look; his word of 2026-11-13 took that out.)

1. **It opens on the night of the Nativity card** (`components/today/NativityStarCard.tsx`): the small stars, the hill, its lit edge and the star of eight points, by the card's own numbers (`lib/reading/nativityStar.ts`). The star's height is `starTop(day)`, so it stands a little higher in each of the fast's six Sunday emails: days 1, 8, 15, 22, 29 and 36. The night's ground is Dark's own well, as the card's is.
2. **The card's own words** stand in the opening: "Nativity Fast · day 1 of 40" and "The star rises a little each day".
3. **Each day says its fast**, in the calendar's own words and colours ("Fish allowed", "Strict fast"), and one line opens the path for the fast ("A path for the fast: the Fathers, a day at a time").

The star is the Octogram's eight points, never the four-point sparkle. The light around it is a soft pool, never rays.

Later seasons take the same place: a picture from the app above the opening and the season's own words, in the same default colours.

## The retention emails

Three kinds, six files, each one thing with one button, on the same look (his word, 2026-11-13: "perfect let's build and I say yes or no to the design. you must justify your designs"). See them in `retention.html`. The sending is the Retention emails chat's, behind a switch that stays off until his yes.

**Round 2**, at his word of 2026-11-13 about 05:31 UTC on seeing round 1: "retention emails could use a better design". Round 1 was words on black with a white bar for a button. Each email now opens on one night card, as the app's own cards stand on Today: the step's picture from the app, the step as the title at its foot, and the app's own button. Round 1 is in history at `344e972a`.

**Round 3**, at his word of 2026-11-13 about 16:44 UTC, with the fasting companion open on his phone: "keep all the emails default Purify colors. and also revamp the calendar design one". Every email is Dark (above), and the fasting companion's calendar is drawn again, as the app's own calendar stands on a phone: see "The fast's week" below. Round 2's week is in history at `36eeb55d`.

**Two rounds of type and button stand in `build.mjs` until his yes to this one.** The reader email and the owner's brief are his yes of 2026-11-13 ("yes look") and are written exactly as he saw them (`wear(1)`): their faces, their button across its card, their Unsubscribe as an outlined button. The retention emails wear round 2 (`wear(2)`): the faces a mail app has, the app's own pill, Unsubscribe as a plain link. Whether those three go to the reader emails too is his to say, through the arbiter; it is one line in each maker.

**Every word is the sending's own letter** (the arbiter's word, 2026-11-13, after the sending's tests refused round 2's first words: they claimed a reader had not prayed, had been away, joined a fast on its first day and keeps the new calendar, none of which the server knows). The look draws a letter and its frame exactly as `lib/email/retention/` makes them (`Look = (letter, frame) => …`, render.ts) and adds no sentence of its own. The six samples are real letters, taken word for word into `letters.sample.json` by `letters.sample.test.ts`, whose header says how to take them again.

| File | What it is | The letter it draws |
|---|---|---|
| `first-week-1.html`, `-3`, `-7` | The first week's three steps. `firstWeek(how, day)` | `first_week`, the steps `morning`, `calendar`, `verse`. |
| `pick-up.html` | Pick up where you left off. `pickUp(how)` | `pick_up`, a reader's place in the Bible. A work and a patron saint draw the same way. |
| `fast-opening.html`, `fast-week.html` | The fasting companion, the Nativity Fast: its opening note and a week in. `fastingCompanion(how, which)` | `fasting_companion`, the pieces `open` and week 2. |

The look is one function, `retentionLook(how, letter, frame, { picture, stepNames })`, and the three names above are its samples. How a letter is drawn:

| The letter's | First week | Pick up | Fasting companion |
|---|---|---|---|
| `frame.eyebrow` | the masthead's end | the masthead's end | the masthead's end |
| `heading` | the title | the title | the title |
| `deck` | | the small line over the title | the line under the title |
| `paragraphs` | the first under the title, the rest quieter | drawn only for a patron saint, where it says more than the title | the label over the week |
| `days` | | | the fast's week: the days across, what each fast allows, the feasts on their card |
| `after` | | | the plan's line, then the calendar's own word on its rules, quieter |
| `action` | the one button | the one button | the one button |
| `frame.footer`, `unsubscribeHref` | the foot, and Unsubscribe as a plain link | the same | the same |
| `about` | chooses the picture and the step under the heavier rule | chooses the picture | chooses the night by `day` |

The pieces, all in `build.mjs`: `lead` (the night card), `steps` (the first week's strip), `weekStrip`, `fastMark` and `feastCross` (the fast's week), `button`, `footLinks`. `HEROES` names each night card's picture and the app's file it is cut from.

**The fast's week** (`weekStrip`) is the app's calendar on a phone (`components/calendar/PhoneCalendar.tsx`), top to bottom, with nothing of its own:

1. **The week**, as one row of the month: the day's name, its date (a feast's set heavier, as the month sets it), and under it the calendar's own marks: the fast's (the fish, the stalk of wheat, the grapes, the candle), and the cross where the day is a feast.
2. **What each fast allows**, as the calendar's day says it (`FastFact`): the mark in a disc of its own colour at 13% on the page, the fast's name from the calendar's legend, then each rule the week holds for it, word for word, under the days that keep it. A fast is named once, however many rules the week has for it.
3. **The feasts**, on the calendar's own card, a row each: the day in the margin as the Sunday email sets it, the cross with "Major feast" (the calendar's words for it, `calendar.legend.majorFeast`), and the feast's name.

Every register has its mark now (`FAST`): a plain fast day and a fast-free day are drawn, and a day with no fast has none, as in the app.

- **The night card.** The app's own card ground (`bg-night-deep`, as the Pray now card and the Nativity card), a night on every palette. The picture is cut to the card's width and fades into the night at its foot, as the Prayers screen's picture does in the app.
- **The pictures are the app's own, never drawn for the email.** Morning prayers: the icon of the Resurrection (`lib/prayers/serviceArt.ts`). The calendar: a real screen of the 1.9 app, from the store pictures' export. Bookmarking a verse: the icon the app sets behind a shared verse (`lib/share/verseCard.ts`). Romans: its book's cover (`lib/readAloud/covers.ts`). The fast: the Nativity card's night on the reader's own day of it. `build.mjs` refuses a source on the heritage list, and the check holds each source to it.
- **One button, and it is the letter's.** The fasting companion's is the fast's reading plan where it has one, its prayer, or the calendar (`fastAction`).
- **No urging.** No countdown, no streak, no "you are missing out". The calendar is the only urgency Purify uses (`docs/brand/voice.md`).
- **No counsel.** The fasting companion says what the calendar says and nothing about how to keep the fast.
- **The first week's strip names no day.** A step goes out in a window and one already done is never sent (`plan.ts`), so the strip says only which of the three this is.
- **Pictures blocked.** Each picture's words stand on one line in a short band of the night; the title, the week, each fast's name with its days and its rules, and each feast are live text, and each disc keeps its fast's colour.
- **No verse is set.** No letter quotes Scripture today. `lead` can set one whole above the button, copied from the app's own text with its source, if a letter ever carries it.
- **Not drawn yet:** the night for days other than 1 and 8 in this folder (the main web holds all forty, `public/email/`).

### Why the retention emails look as they do

| The choice | Why | What it does for the reader, and for coming back |
|---|---|---|
| Each email opens on one night card: the picture, the step as the title, the one button | It is how the app's own cards stand on Today: a night, with the words at its foot. Round 1 was words on black, which any product could send. | It is known as Purify before a word is read, and the whole ask fits the first screen of a phone. |
| The picture is the app's own for the step | Morning prayers wears the icon of the Resurrection in the app. The calendar is a real screen of the 1.9 app. The verse has the icon the app sets behind a shared verse. Romans has its book's cover. The fast has the Nativity card's night. Nothing is drawn or generated for the email. | What is seen in the email is met again in the app, so a second visit feels familiar. |
| The picture fades into the night at its foot | The Prayers screen does this in the app. A flat banner over a headline is the template every newsletter uses. | The title reads as part of the picture, so the eye lands on the step. |
| Type designed in Georgia, with each system's own sans | A web font does not load in most mail apps, and round 1 fell back to plain Times. Georgia is on Apple Mail and Outlook, and Android's Gmail gets Noto Serif. Nothing waits on a font. | The title is a sturdy bold serif on every phone. It never flashes, and never falls back to something dated. |
| The button is the app's own: a white pill with its arrow, as wide as its words | It is the Pray now card's "Begin". A bar across the page is the generic call to action. Outlook rounds no corner, so there the same pill is drawn as a shape. | It looks like the button the reader will press in the app, and it is 48 tall under a thumb. |
| Every word is the sending's own letter; the look adds none | The sending's letters are held by tests to say nothing the server cannot know: not that a reader has not prayed, has been away, joined a fast on its first day, or keeps the new calendar. | Nothing in the email is untrue of the person reading it, which is what makes the next one worth opening. |
| One button, and it stands inside the night card | An email that asks for two things gets neither. The button is the letter's own: for the fast, its reading plan. | One clear step, on the first screen, every time. |
| The first week's three steps as one strip, each by its letter's own heading | The list said the title over again. The strip says Morning prayers, The calendar and Bookmark a verse, with this email's under a heavier rule. It names no day, since a step already done is never sent. | A new reader sees three small things with an end, so the next is expected and not a surprise. |
| The fast's week stands as the app's calendar does on a phone: the week, what each fast allows, the feasts | Round 2 put all three in one navy card with small marks. The reader already knows the calendar's page; the email is that page for seven days, and nothing in it is drawn for the email. | It is read the way the calendar is read, so nothing has to be learned, and it is found again on Wednesday. |
| The week is one row of the month: the day's name, its date, the fast's mark, and the cross on a feast | It is the app's own month, cut to a week: the same marks in the same place, a feast's date set heavier. No card around it, as the month has none. | The whole week is read in one glance: where the strict days fall, and where the feasts are. |
| What each fast allows: its mark in a disc of its own colour, its name once, each rule under the days that keep it | It is how the calendar's own day says its fast. Round 2 said "Fish allowed" twice, once for each rule; now a fast is named once and each of its rules stands under its own days, in the calendar's own sentence. | "What may I eat on Wednesday" is answered by finding Wed, and no rule is guessed. |
| The feasts on the calendar's own card: the day in the margin, the cross with "Major feast", the name in the serif at its plain weight | The calendar lists a day's feasts on a raised card with these words and this cross. The margin is the Sunday email's. Round 2 set every name in bold, which shouted in a list where every row is a feast. | A feast in a fast is seen at once and read by its name, calmly. |
| Colour is never the only sign | Each fast has its mark, its name and its sentence, and each feast its cross and its words. With pictures blocked the discs keep their colour and every word still stands. | Nothing is lost to a reader who sees no colour, or no pictures. |
| The white pill and the calendar's fasting colours are the only colour | Purify's accents are the glowing white and the calendar's registers. Each is used once, for a reason. | Colour means something: white is the thing to press, and teal and red are the fast. |
| Unsubscribe is a plain underlined link | An outlined pill made it look like a second button. | It is honest and easy to find, and it competes with nothing. |
| The foot is the sending's own sentence: why it came, who sent it and from where. No streaks, no countdowns | These emails are opt-in, and the foot says which setting turned them on. The calendar is the only urgency Purify uses. | A reader who knows why it came and how to stop it does not feel followed. |
| Pick up is still the shortest email Purify sends | A picture, the reader's own place as the title, one button. It does not say how long they have been away. | It takes five seconds, which is what it has. |
| No counsel in the fasting companion | How a fast is kept is a priest's to say. | The reader trusts it to say only what the calendar says. |
| The app's default colours, on every screen: no Night sky, no light scheme | His word, on seeing the fasting companion in navy: "keep all the emails default Purify colors". The page is the app's page (#101013), a card the app's card (#1d1d20), the night card the app's well (#0b0b0e). | It looks like the app the reader opens every day, whichever phone and whichever mail app it is read in. |
| Every picture under 64KB and every email under 27KB of HTML | Gmail clips an email past 102KB, and a slow picture is a blank email on a phone. | It opens at once. |
| With pictures blocked, each email still says everything | Many mail apps block pictures until asked. Each picture has its words, and the title, the verse, the week and its key are live text. | Nothing is lost when the pictures are. |

## Where every colour comes from

`build.mjs` reads the design kit's tokens first (`docs/brand/kit/tokens.css`) when it runs, and the app's stylesheet (`app/globals.css`) for what the kit does not carry. No colour is typed into it, so the look moves when the kit and the app do. Every value is Dark's, the app's default (`SENT` in `build.mjs`).

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
| Each fast | `--fast-strict`, `--fast-fish`, `--fast-wine-oil`, `--fast-free`, `--fast-fast` | the app |
| The disc a fast's mark stands in | the fast's colour at 13% on the page, as `FastFact` lays it | the app |
| A feast's cross | `--k-accent`, which is the app's `--color-festal` | the kit |

The rubric and the fasting registers are for the kit to take in, if the kit chat agrees.

**No other palette is sent.** The check's own drawing still wears the kit's other palettes (its clean light, Black, Candlelight, Monastery), so each piece is known to hold 4.5:1 on all of them; no file a reader gets holds their colours.

A share is laid on the page and written as one plain colour, because Outlook reads no transparency.

The faces of the reader email and the brief are the ones `lib/email/theme.ts` names: Lora and DM Sans where a reader has them, Georgia and Arial everywhere else. Named, never fetched. The retention emails (round 2) are designed in the faces a mail app really has, since a web font does not load in most of them: Georgia, then Noto Serif for Android, for titles and words; Segoe UI, Roboto and Apple's own sans for labels and numbers. Named, never fetched.

## The brief's charts

Drawn with table cells, since a mail client runs no script and Gmail shows no SVG.

- **Seven days:** one series, so no legend. The last day is in the page's ink with its number over it, the six before it quieter.
- **Money in:** one bar in the money chart's own three colours, a gap of the page between its parts, and under it each part's name and amount in the page's ink. No part is told by its colour alone.
- **Opened most:** a name, its count, a bar to the longest.

There is nothing to hover in an email, so every number a chart needs is said in words beside it. A figure that could not be read says "not read", never 0. Every figure in `brief.html` is a sample made up for the drawing: the real ones are read when the email is made and are never written into the repository. No reader is ever named.

## The check

`node docs/brand/kit/email/check.mjs`, run on 2026-11-13 after round 3. It passed.

- **checkMock** (`scripts/mock-check.mjs`), all fifteen rules, on each email at 360, 390, 412 and 1032 wide, on Dark, Black, Candlelight, Monastery and the kit's clean light, and in Arabic's direction. Thirty-six runs for the nine emails, thirty-six passes. An email's colours are written inline, so the check draws the same marks with every colour a custom property and wears the palettes on that. Where checkMock wears the app's Light, the drawing wears the kit's clean light, never parchment.
- **The default colours only.** Every colour written in each file is Dark's own (`SENT`) or the night card's, which are Dark's well and its ink's shares; nothing in a file turns on the reader's scheme. Round 2's files fail it: each held the light scheme's thirteen colours, and the fast's two held Night sky's six or seven more.
- **No parchment.** No email and no page here holds the app's Light paper (#f1e8d4, #e7dcc1, #e6dcc4).
- **Phone first.** At each of the four widths nothing runs past the screen's edge and no word is cut by its box, measured against the width asked for, and for the retention emails in Georgia's widths (a phone's browser widens its own window to fit what spills, which hid a 3px spill until 2026-11-13). Stills were looked at by eye at 360, 390 and 1032.
- **The file a mail client gets is that drawing, on Dark.** With the reader's screen dark and with it light, every colour in it is the one the checked drawing wears on Dark: 114, 134 and 249 pieces in the reader emails and the brief, and 60 to 244 in the retention emails, each the same.
- **Nothing runs and nothing is fetched** but the pictures, and every picture has its words.
- **The heritage list** (`lib/marketing/heritagePictures.ts`): no picture here is on it, and none of the four files the night cards' pictures are cut from.
- **Small.** The emails are 6.5 to 26KB of HTML and the largest picture is under 64KB.

Named allowances, both listed by the check: the night is a dark island on every palette, and the money chart's colours for Plus and the Box are one on both of the panel's themes.

By eye: the icons are the app's own mark and no other; Plus is promised to no one; the sample week is the calendar's own for 15 to 21 November 2026 and no line of Scripture or of a Father was written for it; the words are the app's and the Sunday email's own wherever they exist.

**Not done here.** A look in real Gmail, Apple Mail and Outlook, with the phone set light and set dark, before any send. That look is also where a mail app that lightens a dark email by force would show itself; none is known to, and the head says the email is dark already. The pictures on the page are drawn by a browser, which honours more than Outlook does. In Outlook on Windows the corners are square and the faces Georgia and Arial; nothing depends on either.

## For the build

1. **The pictures need a home on the main web** before a send: everything in `img/` that an email names (the mark, the night for each day, the night cards' pictures, the five fast marks, a feast's cross, the arrow). The `-ink` and `-light` files are for the check's drawing and go nowhere. In these files they sit in `img/` beside the email, so the sender swaps `img/` for their address. Pick up needs one picture for each book's cover and each saved saint, cut the way `heroPicture` cuts Romans' (add a row to `HEROES`); a cover or saint on the heritage list is left out and the card stands on its words (give `lead` a picture only when there is one).
2. **The night is one picture a day.** `build.mjs` draws any day of the forty; only day 1 is drawn so far.
3. **Each day's fast** is `fastingStatus` in `lib/calendar/orthodox.ts`. `lib/email/weekly.ts` does not carry it yet.
4. **A finding in the Sunday email as it stands.** `weekAhead` names a day by its saint before its commemoration, so 20 and 21 November 2026 both read "The Most Holy Theotokos" where the calendar has "Forefeast of the Entrance of the Theotokos" and "Entrance of the Most Holy Theotokos into the Temple". The sample here uses the commemoration's name. This is for the arbiter to route; nothing in `lib/` was touched.
5. **The saint's picture** is left out when it is on the heritage list, and the card stands on its words.
6. **The company's name and postal address** in the foot come from `lib/email/consent.ts`, as now.
