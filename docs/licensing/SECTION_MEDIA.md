# Section media provenance

Imagery behind the mobile section mastheads. Policy, matching
`audio-provenance.md` and `icon-provenance.md`: **an image ships only if its
source and license are documented here.**

The allowed license set is the same one the history media integrity suite
enforces (`lib/history/__tests__/events.integrity.test.ts`): public domain,
PD-Art, CC0, CC BY, CC BY-SA. NC and ND are rejected by
`scripts/fetch-section-media.mjs`, because Purify is a commercial app and
because these are cropped to a masthead. Every shipped file below happens to
be public domain, so no attribution string is load-bearing, but
`SectionPhoto` renders the credit anyway.

## Shipped

| File | Section | Work | Artist | Date | License | Source |
| --- | --- | --- | --- | --- | --- | --- |
| `bible.jpg` | bible | Codex Sinaiticus, Matthew 6:4-32 | Anonymous | 4th century | Public domain | [Commons](https://commons.wikimedia.org/wiki/File%3ACodex_Sinaiticus_Matthew_6%2C4-32.JPG) |
| `prayers.jpg` | prayers | The Deesis mosaic, Hagia Sophia | Anonymous (photograph by Gryffindor) | 13th century | Public domain | [Commons](https://commons.wikimedia.org/wiki/File%3AHagia_Sophia_Deesis_mosaic.JPG) |
| `discover.jpg` | discover | Menologion of Basil II, the Circumcision of Christ (f. 287) | Byzantine illuminators of the Menologion of Basil II | c. 985 | Public domain | [Commons](https://commons.wikimedia.org/wiki/File%3AMenologion_of_Basil_047.jpg) |
| `reading.jpg` | reading | Ostromir Gospels, the Evangelist Luke | Anonymous | 1056 | Public domain | [Commons](https://commons.wikimedia.org/wiki/File%3AOstromir_luke.jpg) |
| `you.jpg` | you | The Ladder of Divine Ascent, St Catherine's Monastery, Sinai | Anonymous (photograph by Florian Prischl) | 12th century | Public domain | [Commons](https://commons.wikimedia.org/wiki/File%3AThe_Ladder_of_Divine_Ascent.jpg) |

## Rejected, and why

Kept here so the same candidates are not re-picked by a later run. **The
license field will not tell you any of this. Open the image and look at it.**

| Candidate | Why rejected |
| --- | --- |
| `File:Lampada.jpg` | Not an oil lamp. It is an electrical wiring diagram captioned "VOLTS COLOR". Returned as the top hit for "orthodox lampada oil lamp". |
| `File:Hagia Sophia Interior.jpg` | The frame is dominated by the Ottoman calligraphic roundels. On an Eastern Orthodox app's Discover surface it reads as a mosque. |
| `File:Menologion of Basil 326.jpg` | The 985 miniature is public domain, but the Vatican Library scan carries a diagonal "RESERVED" watermark across the image. |
| `File:Sanahin - Armenia (2933442321).jpg` | Armenian Apostolic, not Eastern Orthodox, and the frame is a bare grey stone hall that does not read as a reading room. |
| `File:Chora Church Constantinople (11).JPG` | Genuine Byzantine mosaic, but the frame is mostly exposed brick and a broken medallion, so it reads as ruin rather than library. |

## Today has no entry, on purpose

Today already carries the right photograph for its surface: the icon of the
day's commemorated saint, via `components/today/TodaySaintCard.tsx`. Its
verse hero is a designed night-sky card (stars, crescent, wave) that a
mosaic backdrop would fight. A Christ Pantocrator plate was fetched and then
dropped rather than shipped as decoration competing with content.
`lib/media/__tests__/sections.test.ts` fails on any orphan file in
`public/sections/`, so a future fetch that is not wired up will be caught.

## Adding a section image

1. Add the section to `SECTIONS` in `scripts/fetch-section-media.mjs` with
   hand-picked `preferred` Commons titles. Search is a fallback, not a
   source of truth: the first automated pass here got one of six right.
2. Run `node scripts/fetch-section-media.mjs <key>` (add `--force` to
   replace an existing file).
3. **Open the saved file and look at it.** Check the subject is what you
   meant, the crop has not cut off a face, and there is no watermark.
4. Paste the printed entry into `SECTION_MEDIA` in `lib/media/sections.ts`
   and tidy the Commons metadata, which is often duplicated or carries
   Wikidata date junk.
5. Add the row above. `lib/media/__tests__/sections.test.ts` fails if any
   entry is missing a rights field or its file is not on disk.
