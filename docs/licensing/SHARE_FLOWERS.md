# Flower plates for the share pictures

The botanical plates the quote pictures' flower looks grow from the foot of
the picture (1.8, round 3 r3-11b: Rose garden, Lavender and Olive; the owner's
"flowers ... be broad all around"). Policy, matching `SECTION_MEDIA.md` and
`icon-provenance.md`: **an image ships only if its source and licence are
recorded here.**

They live in `public/share/flowers/` and are carried in the apps' bundle, so
a picture is made on the phone with no signal: about 150 KB together, as
WebP. `lib/share/verseCard.ts` (FLOWER_PLATES) holds each one's size, and
`lib/share/__tests__/quoteCard.test.ts` holds those sizes, and a row here, to
every file.

## Shipped

| File | Subject | Work | Artist | Date | Licence | Source |
| --- | --- | --- | --- | --- | --- | --- |
| `rose-centifolia.webp` | Rosa centifolia foliacea | Les Roses, Paris, 1817 to 1824, a painted engraving (Library of Congress scan) | Pierre-Joseph Redouté | 1824 | Public domain | [Commons](https://commons.wikimedia.org/wiki/File:Redoute_-_Rosa_centifolia_foliacea.jpg) |
| `rose-regalis.webp` | Rosa gallica regalis | Les Roses, Paris, 1817 to 1824, a painted engraving | Pierre-Joseph Redouté | 1824 | Public domain | [Commons](https://commons.wikimedia.org/wiki/File:Redoute_-_Rosa_gallica_regalis.jpg) |
| `lavender.webp` | Lavandula angustifolia | Köhler's Medizinal-Pflanzen, plate 87 | Franz Eugen Köhler | 1897 | Public domain | [Commons](https://commons.wikimedia.org/wiki/File:Lavandula_angustifolia_-_K%C3%B6hler%E2%80%93s_Medizinal-Pflanzen-087.jpg) |
| `olive.webp` | Olea europaea | Köhler's Medizinal-Pflanzen, plate 229 | Franz Eugen Köhler | 1897 | Public domain | [Commons](https://commons.wikimedia.org/wiki/File:Olea_europaea_-_K%C3%B6hler%E2%80%93s_Medizinal-Pflanzen-229.jpg) |

## How they were made

Each plate's licence was read on its Commons page through the Commons API on
2026-10-30, by the design job that drew the sheet
(`Homebase/boards/purify-master/variants/r3-11b-art/sources.json`), and each
was opened and looked at before use: the plate's caption and engraver's lines
cropped off, Köhler's numbered dissection details painted white, the paper
lifted to pure white so that a multiply blend lets it vanish into a light
ground. Redouté died in 1840 and Köhler's plates were printed in 1897; both
works are long out of copyright, and a faithful scan of a flat public-domain
work adds none.

For the bundle they were opened again on 2026-10-30 and brought down with
sharp to the size the picture draws them at (the roses 520 wide; the lavender
and the olive at their own 258 and 471), as WebP at quality 80: 36, 53, 28
and 33 KB. Laid over the Blush ground and looked at, each is the flower it
names, whole, with no label, number or watermark left on it.

Looked at and not used: Redouté's Rosa gallica purpuro-violacea magna (a deep
red pair, left out for size), Köhler's Vitis vinifera (mostly cut-away
flowers and seeds) and Redouté's Lilium candidum (its yellowed paper would
need more cleaning than the others).
