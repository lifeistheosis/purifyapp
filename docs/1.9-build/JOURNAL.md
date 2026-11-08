# 1.9: the journal, finalized

Finalized on his word, 2026-11-08: "finalize the journal, and so we can move
on". Designed in brainstorm mode and not built; it is built when he says
start. How it was reached is in `notes/build-88.md` (note 3) and
`BRAINSTORM.md` ("Editorials"); the pictures were sent in chat, every one drawn
from the app's own parts and passing `scripts/mock-check.mjs`. Where he gave
no other word, Claude's recommendation stands as the final choice and is
marked so.

## What it is

One journal in two depths. **Everyone** has their own journal, a dated page of
their life with the Church's year. **Plus** has the full journal, built like
Notion's. The journal is the reader's own, made with Purify's tool: never the
Church's teaching. Only a reviewed piece would become an Editorial, and that
contributor system is on hold (his word: "I still need to talk to you about
that").

## Everyone

- **The journal, by the Church's day.** Today's page on top: the weekday large
  in Lora, the date and the day's feast or saints under it (from
  `lib/calendar/orthodox.ts`, `commemorationsOn`), Write, and the day itself
  to write from: today's readings (`dayReadings`: the Gospel and the Epistle)
  and today's highlights, each with a pen that begins a page about it. Past
  days below as pages, each headed by its weekday and its Church's day.
- **A page:** a title, the writer's words, Scripture as verse cards (verbatim
  from the app's Bible), quotes of one's own with one's own attribution, and
  highlights in the seven colours.
- **Notes on verses are pages on a verse.** Note in the verse's focus opens a
  page with the verse as its card; a saved note's small pen mark at the
  verse's end opens its page.
- **Sharing a page, one at a time, three a month** (Claude's recommendation,
  standing): as a link or a Community post, counted on the server where a
  share is made, never trusted from the app. The preview is Purify's own: the
  title and the Church's day on night, with the cross and the name.
- **Plus shown, never hidden:** what Plus adds is in the block menu and the
  styles with the Plus mark, and opens the upgrade sheet named for it; item
  12's lock counting measures which of them sells.

## Plus

- **The editor:** a cover, a title, a cover text, the Church's day, then
  blocks: Text, Heading, Verse, a Quote from the library, a Quote of one's
  own, Checklist, Image, Saint or feast, a reading, Callout, Divider.
- **Covers and images** from Purify's own artwork whose source is verified
  (`lib/saints/iconRights.ts` verified entries, the pictures of
  `lib/history/events.ts`), credited under the cover. A picture with no
  recorded source is not offered. Uploads come later, and only with review.
- **Styles, a designed set** of the house's own tokens, so whatever a writer
  picks still passes the guardrails: two fonts, Book (Lora) and Clean (DM
  Sans), which with their Noto fallbacks cover all 21 languages; colours from
  the seven highlight colours and the palette's inks; dividers as a plain
  line, a space or three dots, never an ornament drawn by hand; callouts as a
  soft box with an icon from the house set; text at the start or the centre,
  never left or right; sizes from the house scale. No gold (his rule of
  2026-10-31 keeps it for Plus profiles). A test holds every style against
  every palette, as `litPalette.test.ts` does for its surfaces.
- **Order:** notebooks, tags, search, From this day, sync on every device.
  Export and print stay free (changed while building, 2026-11-08, Claude's
  call, his to reverse): what a reader wrote is theirs to keep, the library's
  export is free and carries the journal, and keeping a reader's own words
  behind a subscription is the wrong side of the trust this app sells, and of
  the right to take one's data (GDPR, Article 20). Print is the website's way
  of keeping them; the apps have the export.
- **Sharing without limit,** whole notebooks too, the cover as the preview.
- **On a computer:** notebooks at the side, the page in a column of 720px;
  the same page on a phone, a tablet and a computer.

## Quoting anything

- **From anywhere in the app:** Purify's own hold pill (`lib/ui/pressCopy.ts`,
  on any paragraph of a prayer, a saint's life, a Father's work, a chant) and
  the verse's focus gain Quote in journal: the words land on today's page or
  a notebook's, with their source filled in and a way back to it.
- **In the editor:** the Quote block searches the same library: Scripture, the
  Fathers, the saints' lives, the prayers, the chants.
- **A library quote** is verbatim, cited, marked "Quoted from Purify's
  library", and not editable as the source's words; the writer's own words go
  around it. **A quote of one's own** carries the writer's attribution and
  never the library's mark, so hand-typed words are never dressed as a
  Father's (`docs/editorial-standards.md`).
- Scripture and one's own quotes for everyone; the whole library for Plus.

## Sharing, safely

- A shared page is an unlisted link to a copy of the page, kept out of search
  engines until reviewed, with Report on it, and marked as a reader's page
  made with Purify, so Purify's name is never lent to an unreviewed page.
- Its preview (1200 by 630) is drawn the way a profile's is
  (`app/(app)/u/[handle]/opengraph-image.tsx`): a Plus page's cover under its
  title, darkened behind the words so they read; a free page's title and
  Church's day on night; the cross and the name on both.
- Posted to Community, it is a post with its cover and title, and Community's
  Block and Report apply.

## The verse's focus, and its motion

His pick C (2026-11-08): a tap on a verse steps the page back and lifts the
verse into a card, the colours above it and the tools below (Copy, Share,
Image, Note, Study). Its motion is in `notes/build-88.md`, note 3: the house's
curve and durations, about 0.8s to open in reading order, a two-step close
about a third of that, a plain fade under reduced motion, no blur. Study opens
as cards; notes 1 and 2's fixes (the computer's menu on a hold, a scroll's end
selecting a verse) stand.

## How it holds to the guardrails

Drawn from the house's parts, never by hand; every screen built passes the
rules `scripts/mock-check.mjs` measures (contrast on all five palettes with
note 4's rule for Light, 44px targets, no character as an icon, palette
tokens, no gold, no side stripes, Arabic mirroring, no em dash); no
backdrop-filter; the house's motion tokens; Plus never hidden; the editorial
standards in readers' pages; shares and their count made through API routes
(zod, a rate limit, the service role), reads proven by RLS.

## For the build

- Pages stay on the device first (`lib/journal/entries.ts`, as the journal's
  records are now) and sync for Plus as today. A page's words become blocks;
  an entry written before is one Text block, moved on the device.
- Sharing needs the server: a table of shared pages (a copy of the page, its
  owner, when, whether withdrawn) and the month's count. That is a migration,
  so its SQL waits for his sign-off before the merge, and is written to run
  twice (`AGENTS.md`).
- The shared page and its preview are website routes on purifyapp.net, set
  aside from the native export as the other web-only trees are; the apps open
  the link.
- The new words (Add a block, Text, Verse, Words of the Fathers, Checklist,
  Image, Saint or feast, Callout, Divider, Share this page, the shares left
  this month, Post to Community, the Plus line, Quoted from Purify's library,
  Quote in journal, Book, Clean) are written in all 21 languages when built.

## Built

- **Step 1a, 2026-11-08** (`b2527e16`): today's page (the weekday in Lora, the
  date, the feast or saints, the fast, Write, today's readings and
  highlights, each with a pen) and each past day headed by its weekday and
  its Church's day (`lib/journal/churchDay.ts`).
- **Step 1b, 2026-11-08:** writing is free. The Plus card is gone from the
  journal and the Write button carries no mark; From this day and the
  journal's search are Plus, shown with the Plus mark and opening the sheet
  named for the journal. The paywall's journal row is now "The full journal"
  (search and From this day, until step 2 adds the rest), and the pricing
  pages list the journal among what is free. New words in all 21 languages,
  drafted by Claude: they wait for his eye with the rest of 1.9's.
- **Step 1c, 2026-11-08:** the page. An entry is a title, the words, verse
  cards, quotes of one's own and highlights, written in the journal's sheet
  with Verse, Quote and Highlight at its foot. A page is kept in the entry's
  body as plain text (`lib/journal/page.ts`), so the server, the sync, the
  export and an older build carry it unchanged and need no migration; a verse
  card keeps only its reference and shows the app's own words, so it can
  never carry words the Scripture does not. A verse's note stays words alone.
  Checked in a phone-sized browser: written, kept, reopened as it was, and
  `checkMock` passing on the sheet, its tools and the list on all five
  palettes and in Arabic.
- **Step 1d, 2026-11-08:** Quote in journal. A verse's Study has it (free);
  the hold pill has it on the library's pages only (prayers, saints, chants,
  councils, the catechism, history, topics, plans, the Bible's commentary;
  `lib/journal/libraryPlaces.ts`), Plus's, with the Plus mark's padlock
  without it. The quote goes at the end of the page being written, or begins
  one, and the journal opens on it. A library quote is the block's words
  verbatim, cited by its page, marked "Quoted from Purify's library", never
  edited in the sheet, with Open back to its page, and it may only lead
  inside the app. **For step 3:** a shared page must check each library
  quote against its page before it wears the mark in public, since a page's
  text can be edited by hand in an older build.

## Step 2, how it is kept (Claude's design, 2026-11-08)

Everything a Plus page adds is kept in the page's text, as step 1's blocks
are (`lib/journal/page.ts`), so it syncs, exports and survives an older build
with no migration:

- **Blocks:** a heading (`## `), a checklist (`- [ ] ` and `- [x] `), a
  divider (a line, a space or three dots), a callout (a soft box with an
  icon from the house's set), a saint or feast (a card from the app's own
  calendar and saints), a reading (a card like today's readings), an image
  (only the artwork whose source is verified).
- **Properties** under the title: the notebook a page is in and its tags,
  by name. A notebook is the pages that name it, so it needs no list of its
  own to keep in step.
- **Style:** the page's font (Book or Clean) and alignment (the start or the
  centre), from the house's set only, held against every palette by a test.
- **A free reader** sees the Plus blocks and styles in the menu with the Plus
  mark, and a page made on Plus stays readable without it: the words are
  never locked away.

## The order, when he says start

1. The journal by the Church's day; the page's core (title, words, verse
   cards, one's own quotes, highlights); notes as pages; Quote in journal.
2. Plus: covers, every block and style, notebooks and tags, From this day,
   the computer's layout.
3. Sharing: the server table and the count, the link page and its preview,
   Post to Community.
4. Later: the contributor system (on hold), uploads with review.

## Still open

- The SQL for sharing, when it is written: his sign-off.
- The contributor system: to talk.
- The free limit of three a month: kept or moved on item 12's numbers.
