# The looks' pictures

The pictures of the seventeen looks (1.9): the scene at the foot of a page, the
room behind it, and what stands in the place of the short rule at a chapter's
head. Policy, matching `SHARE_FLOWERS.md`, `SECTION_MEDIA.md` and
`icon-provenance.md`: **an image ships only if its source and licence are
recorded here.**

They live in `public/themes/` and are carried in the apps' bundle, so a look
is whole with no signal: 23 files, about 690 KB together. The stylesheet
names each one as a custom property (`app/globals.css`, "The looks (1.9)"),
and a property costs nothing until a look that uses it is worn.
`lib/reader/__tests__/themePictures.test.ts` holds every file to a row here,
every row to a file, every address in the stylesheet to a file, and every
drawing to the code that makes it.

Every picture is made by one script, so it can be made again:

```
node scripts/theme-pictures.mjs            # the fifteen drawings
node scripts/theme-pictures.mjs --painted  # those, and the eight painted ones (needs out/, from npm run build:android)
node scripts/theme-pictures.mjs --kept     # Fire's room, kept and not shipped (see the end of this page)
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
| `athos.svg` | Holy Mountain | The peak of Athos over still water at dusk, in silhouette | Drawn by code | Purify's own |
| `forest.svg` | Forest | Firs of the north with mist between them | Drawn by code | Purify's own |
| `desert.svg` | Desert | Dunes in the last light | Drawn by code | Purify's own |
| `jordan.svg` | Jordan | Still water with rings going out over it | Drawn by code | Purify's own |
| `galilee.svg` | Galilee | The sea by night, a soft pool of light on the water | Drawn by code | Purify's own |
| `patmos.svg` | Patmos | A white wall and the sea beyond it | Drawn by code | Purify's own |
| `mosaic.svg` | Mosaic | A band of hand-set tesserae at the foot of the page | Drawn by code | Purify's own |
| `mosaic-rule.svg` | Mosaic | A short row of tesserae, at a chapter's head | Drawn by code | Purify's own |
| `stone.svg` | Stone | The foot of a wall of cut blocks | Drawn by code | Purify's own |
| `damask.svg` | Damask | The cloth's own weave, a step lighter than the cloth | Drawn by code | Purify's own |
| `linen-rule.svg` | Linen | A line of red stitches, under a page's bar | Drawn by code | Purify's own |
| `linen-head.svg` | Linen | A stitched ornament, at a chapter's head | Drawn by code | Purify's own |

The peak in `athos.svg` is a silhouette drawn from the mountain's known
shape (a long shoulder and one steep summit), not from any one photograph or
map.

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
