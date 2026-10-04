# What we have done since 1.5

1.5.1 is a refinement patch, cut the same day as 1.5 (2026-10-04) at the
owner's word: "let's now do a v1.5.1 Refinement patch. optimize all the
builds so it's smooth while keeping the MB's optimized." Nothing a reader can
do is new. Everything here is about how much a page carries and how much the
apps weigh.

## How it was found

The 1.5 export was 720 MB in 10,091 files, and 462 MB of it was Bible
chapters. A probe of what the chapter page hands the reader, prop by prop,
across all 1,362 chapters:

| What | MB | Share |
|---|---|---|
| The Fathers' commentary | 31.4 | 33% |
| The Greek, word by word | 17.3 | 18% |
| A Strong's lexicon cut down to each chapter | 16.6 | 17% |
| The English tagged to pair with the Greek | 13.0 | 13% |
| Cross-references | 6.6 | 7% |
| The Greek as running text | 6.4 | 7% |
| The verses themselves | 5.3 | 5% |

96 MB of props. A client component's props are written into the page's HTML
and again into the payload the app reads between pages, so 96 MB became most
of 462. A reader who never switches the Greek on and never opens a commentary
was carrying all of it on every chapter.

## Fixes

- 📝 **Bible chapters carry their verses, and fetch the rest.** The Greek, the
  English tagged to pair with it, the cross-references and, in the apps, the
  commentary are static files (`app/bible-data/`), each read when it is asked
  for (`lib/bible/chapterData.ts`). The page says only which verses have
  something behind them. John 1: 1,184 KB of HTML to 122 KB, and 1,093 KB of
  payload to 73 KB. On the website the commentary stays in the page, so a
  search engine still reads it there.
- 📝 **One lexicon.** `app/bible-data/strongs.json`, 0.5 MB, in place of 16.6 MB
  of per-chapter copies.
- 📝 **The Fathers' works, in the apps, are files** (`app/saints-data/`), read as
  the page opens (`components/saints/LazyWritingReader.tsx`). Morals on Job
  was a 4.4 MB page and a second 4.2 MB payload. The website is unchanged.
- 📝 **The Saints tab** stopped handing the registry to its browser as a prop.
  The search beside it already carries the registry in the page's code, so it
  was there twice more: 455 KB of a 940 KB page.

## Silent

- A patch keeps its release's highlights and its release's announcement
  email (`featureRelease` in `lib/whatsNew/version.ts`). Without it, cutting
  1.5.1 before the 1.5 email went out would have turned that email into a
  letter about a refinement, and the top of What's New would have had no
  pictures.
- `scripts/release.mjs check` knows a patch from a release.

## Looked at and left alone

- **Every page's own weight.** A page is about 120 KB of HTML and 70 KB of
  payload before it says anything, most of it the list of code files each
  client component names. That is the framework's, and 1,917 pages of it is
  most of what is left. Not something to change on a release day.
- **The requests for other whole pages on every page open.** They are HEAD
  probes the router sends in an export, with no body. Moving between tabs is
  already a soft move on the page's payload.
- **`content-visibility` on verse rows,** for the scroll of a long psalm
  (Psalm 118 is 10,673 elements). It also clips anything that overflows a
  row, and a verse row opens menus and popovers. It needs its own look.
- **The verse of the day table** on Home and Today, 122 KB on the two pages
  the app opens to. A candidate for the same treatment next.
- **R8 on Android.** A few MB of code, and a risk to plugins nobody can test
  from here.
