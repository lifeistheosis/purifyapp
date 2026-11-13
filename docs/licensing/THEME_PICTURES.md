# The looks' pictures

The pictures of the fourteen looks (1.9): the scene at the foot of a page, the
room behind it, and what stands in the place of the short rule at a chapter's
head. Policy, matching `SHARE_FLOWERS.md`, `SECTION_MEDIA.md` and
`icon-provenance.md`: **an image ships only if its source and licence are
recorded here.**

They live in `public/themes/` and are carried in the apps' bundle, so a look
is whole with no signal: 19 files, about 770 KB together. The stylesheet
names each one as a custom property (`app/globals.css`, "The looks (1.9)"),
and a property costs nothing until a look that uses it is worn.
`lib/reader/__tests__/themePictures.test.ts` holds every file to a row here,
every row to a file, every address in the stylesheet to a file, and every
drawing to the code that makes it.

Every picture is made by one script, so it can be made again:

```
node scripts/theme-pictures.mjs            # the nine drawings
node scripts/theme-pictures.mjs --painted  # those, and the eight painted ones (needs out/, from npm run build:android)
node scripts/theme-pictures.mjs --engraved # the Holy Mountain's and Forest's, each from its plate
node scripts/theme-pictures.mjs --kept     # Galilee's and Patmos's drawings, the land looks' first drawings and Fire's room, kept and not shipped (see the end of this page)
```

## Shipped: the drawings

Drawn by code in `scripts/theme-pictures.mjs`, as SVG, 390 wide (a phone's
width). Purify's own work. No photograph, no outside image, no font and no
traced source is in any of them: each is paths, circles and gradients written
out by the function named in the script's `DRAWINGS`, with a seeded number
series where a hand would vary (the firs, the tesserae, the stars), so the
same file comes out every time.

| File | Look | What it is | Source | Licence |
| --- | --- | --- | --- | --- |
| `nightsky-stars.svg` | Night sky | Small stars over the upper screen | Drawn by code | Purify's own |
| `nightsky-horizon.svg` | Night sky | The star over a lit horizon, at a chapter's head | Drawn by code | Purify's own |
| `incense.svg` | Incense | One plume of smoke rising from the foot of the page | Drawn by code | Purify's own |
| `mosaic.svg` | Mosaic | A band of hand-set tesserae at the foot of the page | Drawn by code | Purify's own |
| `mosaic-rule.svg` | Mosaic | A short row of tesserae, at a chapter's head | Drawn by code | Purify's own |
| `stone.svg` | Stone | The foot of a wall of cut blocks | Drawn by code | Purify's own |
| `damask.svg` | Damask | The cloth's own weave, a step lighter than the cloth | Drawn by code | Purify's own |
| `linen-rule.svg` | Linen | A line of red stitches, under a page's bar | Drawn by code | Purify's own |
| `linen-head.svg` | Linen | A stitched ornament, at a chapter's head | Drawn by code | Purify's own |

## Shipped: the painted ones

Painted by the app's own quote-picture code, `lib/share/drawVerseCard.ts`
and `lib/share/verseCard.ts`, on a canvas the shape of a phone (1080 wide),
then kept as WebP. The script turns those two modules to plain JavaScript and
runs them in a page of the native export; what it adds is only where on a
phone each picture stands. The grounds (Dawn's sky, the papers) are
gradients and shapes that code draws, with the quote
pictures' own fine grain, which keeps a dark gradient from banding. The
three plants are the public-domain plates already recorded in
`SHARE_FLOWERS.md`, used here exactly as the quote pictures use them.

| File | Look | What it is | Source | Licence |
| --- | --- | --- | --- | --- |
| `dawn-room.webp` | Dawn | The night above, the sky before sunrise coming up under it | Painted by the app's code, no outside image | Purify's own |
| `blush-room.webp` | Blush | Pink paper with a bloom of rose low on the page | Painted by the app's code, no outside image | Purify's own |
| `rose-room.webp` | Roses | Cream paper, with the two roses growing from the foot's corners | `rose-centifolia.webp` and `rose-regalis.webp` (Redouté, Les Roses, 1824), see `SHARE_FLOWERS.md` | Public domain |
| `rose-head.webp` | Roses | The two roses, at a chapter's head | The same two plates, their white paper taken out | Public domain |
| `lavender-room.webp` | Lavender | Lilac paper, with sprigs of lavender at the foot's corners | `lavender.webp` (Köhler's Medizinal-Pflanzen, plate 87, 1897), see `SHARE_FLOWERS.md` | Public domain |
| `lavender-head.webp` | Lavender | A sprig of lavender, at a chapter's head | The same plate, its white paper taken out, cut above its roots with a soft foot | Public domain |
| `olive-room.webp` | Olive | Pale green paper, with a branch of olive at the foot's corners | `olive.webp` (Köhler's Medizinal-Pflanzen, plate 229, 1897), see `SHARE_FLOWERS.md` | Public domain |
| `olive-head.webp` | Olive | A branch of olive lying across, at a chapter's head | The same plate, its white paper taken out | Public domain |

## Shipped: the two made from a plate of a book

From 2026-11-13 (build 95 note 16: the sea looks came out, and the owner's
word on the land looks was "all the colors are nice it's just the designs at
the bottom that dont look good"). Each is made from one plate of an old
book, by `engraved()` and `plated()` in `scripts/theme-pictures.mjs`, and
each plate is kept in `docs/licensing/plates/`, which the apps do not carry.
Jordan has no picture from that day: its page's own colour runs to the
foot. Desert, the fourth land look, came out of the app the same day (see
"Kept, not shipped: Desert" below).

| File | Look | What it is | Source | Licence |
| --- | --- | --- | --- | --- |
| `athos.webp` | Holy Mountain | The monastery of St Paul under the mountain, as a night scene: the ridge, one soft light behind it, the walls lit | The plate "Monastery of St. Paul" in Athelstan Riley, Athos, or the Mountain of the Monks (London: Longmans, Green, and Co., 1887) | Public domain |
| `forest.webp` | Forest | A bough of silver fir at one corner of the foot and its cone at the other, in the look's own greens | Plate 54, Abies alba Miller, in Köhler's Medizinal-Pflanzen, volume 1 (Gera-Untermhaus: Fr. Eugen Köhler, 1883 to 1887) | Public domain |

### The Holy Mountain's plate

**The source.** Athelstan Riley (1858 to 1945), *Athos; or, The Mountain of
the Monks*, London: Longmans, Green, and Co., 1887, printed by Spottiswoode
and Co. The full-page wood engraving "Monastery of St. Paul" stands after
page 214; the book's list of illustrations says of its pictures "Mostly
engraved from the Author's photographs", and names no engraver. The scan is
the Internet Archive's, of the copy in Princeton Theological Seminary
Library: https://archive.org/details/athosormountaino00rile (leaf 243).

**Why it is free to use.** Published in London in 1887. Its author died in
1945, so his rights ended in the United Kingdom and the European Union at
the end of 2015; in the United States anything published before 1930 is in
the public domain. A plain scan of a flat old print adds no new right.

**What is kept of it.** `docs/licensing/plates/riley-1887-monastery-of-st-paul.jpg`:
the plate's picture alone, turned upright and cut inside its border, in
grey, 1400 wide. The apps do not carry it. No caption, page number, stamp or
mark of the library is in the cut.

**What is made from it.** The plate is not laid under the page as it is: an
engraving's hatching would be a grain behind the words. Three things are
taken from it. The ridge is the plate's own skyline, found column by column,
with one soft light drawn low behind it. The land is the plate's tones,
softened until no line of the hatching is left, a step above the look's
ground. The monastery's walls are the engraver's own lines, and the one lit
thing. It is drawn in the look's pale blue on the look's ground (#0e1420),
900 by 717, WebP at quality 86, about 18 KB. No ray of light, no stripe, no gold,
no label and no caption is in it. If the look's ground changes, the picture
is made again on the new ground.

### Forest's plate

**The source.** *Köhler's Medizinal-Pflanzen in naturgetreuen Abbildungen mit
kurz erläuterndem Texte*, edited by G. Pabst, volume 1, Gera-Untermhaus: Fr.
Eugen Köhler, issued 1883 to 1887. Plate 54, *Abies alba* Miller (the silver
fir), signed "W. Müller n. d. Nat." The same atlas the Garden's lavender and
olive come from (`SHARE_FLOWERS.md`). The scan is the Missouri Botanical
Garden's copy at the Internet Archive:
https://archive.org/details/mobot31753002839139 (leaf 342).

**Why it is free to use.** Printed in Germany in the 1880s, well over a
century ago; its artists and its publisher died before 1930. In the public
domain in the United States and in the European Union. A plain scan of a flat
old print adds no new right.

**What is kept of it.** `docs/licensing/plates/kohler-medizinal-pflanzen-54-abies-alba.jpg`:
the whole plate, 1500 wide. The apps do not carry it.

**What is made from it.** Two pieces, each cut by its outline: the bough
(the plate's A) and the cone on its twig (B). The plate's numbered details,
its lettering and its number are left on the plate. Each piece's paper is
taken out pixel by pixel, and the piece is redrawn in the look's own greens,
so no brown of the cone and no yellow of the pollen is in it. They stand at
the foot's two corners, turned to grow toward the middle, as the Garden's
flowers do: 900 by 400, WebP with its own transparency, about 69 KB. No
label, number or caption is in it.

## How they were made

Made on 2026-11-10 by the build of the looks
(`docs/1.9-build/notes/themes-fable.md`, "The third set" and what follows
it). The rooms are 1080 by 2337, WebP at quality 86; the heads are 1044 by
396 (348 by 132, three times over, so they are sharp on any phone), WebP at
quality 84 with their own transparency. In a room the flowers are the quote
pictures' own beds brought to 62 percent and planted on the tab bar's top
edge, so no flower lies under a word. For a head, a plate's white paper is
taken out pixel by pixel (the white share of each pixel becomes its
transparency), so the plate stands on any light page with no blend.

Each was opened and looked at on a phone's screen in its look before it was
kept: no label, number, caption or watermark is on any of them, and no ray
of light or side stripe is in any of them (`scripts/mock-check.mjs` holds
those on the screens that wear them). No gold or yellow is in any of them:
the one warm yellow there was stood in Fire's flames, and Fire is no longer
among them (below).

Two were brought down after they were first kept. `scripts/scene-check.mjs`
measures each picture on its own against its look's faintest text, and found
Dawn's sunrise reaching the lines still being read and Incense's plume at
seven tenths of its strength behind them (2.7:1 and 2.8:1). The sunrise now
keeps to a little over a quarter of the screen, and the plume is a wisp where
words are read and comes into its strength only at the foot.

Drawn and not used: Athos with a near headland (it read as a block),
Mosaic as scattered tiles (they read as pixels), Stone as an arcade (it read
as gravestones), Galilee's light as short strokes (they read as a menu
icon). The note above has each.

## Kept, not shipped: the Holy Mountain's first drawing

Until 2026-11-13 the Holy Mountain's picture was `athos.svg`: the peak of
Athos over still water at dusk, a silhouette drawn by code from the
mountain's known shape (a long shoulder and one steep summit), not from any
one photograph or map. Purify's own. The owner's word that day took the two
sea looks out and asked for the mountain to be reworked or removed, so the
drawing is kept where the apps do not carry it:
`docs/1.9-build/kept/athos-look/athos-peak.svg`, with the look's rules and
its words as they stood. `node scripts/theme-pictures.mjs --kept` draws it
again into that folder, and never into `public/themes/`.

## Kept, not shipped: the first pictures of Forest and Jordan

Until 2026-11-13 these two had a drawing at the foot, each drawn by code
and Purify's own: `forest.svg` (firs of the north with mist between them)
and `jordan.svg` (still water with rings going out over it). The owner's
word that day was that the land looks' colours are good and the designs at
the bottom are not. They are kept in `docs/1.9-build/kept/land-looks/`
(`forest-firs.svg`, `jordan-rings.svg`), with the rules and words as they
stood.
`node scripts/theme-pictures.mjs --kept` draws them again into that folder,
and never into `public/themes/`.

## Kept, not shipped: Fire

Fire was the eighteenth look. The owner took it out of the app's looks on
2026-11-10, the day it was made, before the looks were released ("also I
don't really like the fire theme", then "remove fire"). Nothing made is
deleted, so its picture is kept where the apps do not carry it:
`docs/1.9-build/kept/fire-look/fire-room.webp`, with the look's rules and its
words beside it and a note on what it was.

The picture is flames at the foot of the page, embers rising and going
quiet: painted by the app's own code as the others above were, from the
quote pictures' Fire look, which stays in the app. No outside image is in
it. Purify's own. `node scripts/theme-pictures.mjs --kept` paints it again
into that folder, and never into `public/themes/`.

## Kept, not shipped: Galilee and Patmos

Galilee and Patmos were the two looks of the sea, both in the Land and sea
family. The owner took them out of the app on 2026-11-13, after the first
1.9 test builds and before the looks were released ("remove the sea theme
from the app", and asked which of the two, "Both"). Nothing made is deleted,
so each drawing is kept where the apps do not carry it, with the look's
rules and its words beside it and a note on what it was:

- `docs/1.9-build/kept/galilee-look/galilee.svg`: the sea by night, the far
  hills, a soft pool of light on the water and three long glints. It was
  `public/themes/galilee.svg`.
- `docs/1.9-build/kept/patmos-look/patmos.svg`: a white wall and the sea
  beyond it, two fields of colour, the line between them and three long
  glints. It was `public/themes/patmos.svg`.

Both are drawn by code in `scripts/theme-pictures.mjs` (`KEPT_DRAWINGS`), as
the drawings above are: paths and gradients only, no outside image. Purify's
own. `node scripts/theme-pictures.mjs --kept` draws them again into those
folders, and never into `public/themes/`.

## Kept, not shipped: Desert

Desert was the fourth look of the Land and sea family, worn over Light. It
came out of the app on 2026-11-13, after the first 1.9 test builds and
before the looks were released (his "all recs" of about 14:29 UTC, which
took the arbiter's recommendation that it come out). Its picture,
`desert.svg` (three dunes in the last light, drawn by code, Purify's own),
is kept with its rules and words in `docs/1.9-build/kept/desert-look/`. It
was `public/themes/desert.svg`. `node scripts/theme-pictures.mjs --kept`
draws it again into that folder (`KEPT_DRAWINGS`), and never into
`public/themes/`.
