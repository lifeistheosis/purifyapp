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
| `prayers.v2.jpg` | prayers | Christ Pantocrator, St Catherine's Monastery, Sinai | Anonymous | 6th century | Public domain | [Commons](https://commons.wikimedia.org/wiki/File%3AChrist_Icon_Sinai_6th_century.jpg) |
| `discover.jpg` | discover | Menologion of Basil II, the Circumcision of Christ (f. 287) | Byzantine illuminators of the Menologion of Basil II | c. 985 | Public domain | [Commons](https://commons.wikimedia.org/wiki/File%3AMenologion_of_Basil_047.jpg) |
| `reading.jpg` | reading | Ostromir Gospels, the Evangelist Luke | Anonymous | 1056 | Public domain | [Commons](https://commons.wikimedia.org/wiki/File%3AOstromir_luke.jpg) |
| `you.jpg` | you | The Ladder of Divine Ascent, St Catherine's Monastery, Sinai | Anonymous (photograph by Florian Prischl) | 12th century | Public domain | [Commons](https://commons.wikimedia.org/wiki/File%3AThe_Ladder_of_Divine_Ascent.jpg) |

`prayers.jpg` was replaced on 2026-10-05, for 1.5.2. It is the bust of the
Sinai Pantocrator (629 by 660), cut with sharp from the copy of the same
Commons file the shop already carries (`public/shop/media/
christ-pantocrator-mounted.jpg`, recorded in `SHOP_MEDIA.md`), from 14px down
so the whole halo, the face and the shoulders are in it and the hands are
not. Nothing new was fetched. Its license was read again from Commons the
same day (LicenseShortName "Public domain", Copyrighted "False"). It is shown
whole, as an icon beside the section's words, and not cropped to a wide
plate: `portrait: true` in `lib/media/sections.ts`.

`prayers.v2.jpg` replaced it on 2026-10-17, for 1.7.1, under a new name so no
cache keeps the old one. The 1.5.2 cut carried the white of the scan along
its top and both sides, and the owner asked for Start here's icon, the same
file, to be zoomed "a little bit so it shows the face ... without the lines".
It is cut from the same shop copy, 486 by 512 from 72px in and 70px down: the
face, the hair and the beard whole, the gold of the halo around them, and no
white at any edge (`node scripts/check-picture-edges.mjs sections`). Nothing
new was fetched.

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
| `File:Hagia Sophia Deesis mosaic.JPG` | Shipped as the Prayers plate until 1.5.2, then withdrawn. The photograph is soft, and the 16:9 crop of it ended at the beard: the face of Christ was cut by the frame, and the wash over the plate's lower half hid what was left. The owner, 2026-10-05: "it just doesn't look good overall". A wide crop of a face that fills its picture will always cut it. |

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

## Theology subjects (1.8)

The pictures of the map at the head of Theology (`lib/theology/subjects.ts`),
written 640 wide to `public/theology/subjects/`. The owner gave his yes to
downloading public-domain icons on 2026-10-21. Each Commons page was read the
same day (its licence templates, not only the short name), and each picture
was opened and looked at before and after it was cut: the right subject,
whole heads and haloes, nothing outside the painted panel. A file whose page
also names a photographer's CC licence was refused: `0194Hb. Last Judgment,
1672.jpg` (PD-old-70 for the icon, but `self|cc-by-sa-4.0` for the
photograph) was opened, then dropped for the Tretyakov panel below.

| File | Work | Artist | Date | License | Source |
| --- | --- | --- | --- | --- | --- |
| `trinity.jpg` | The Holy Trinity, Tretyakov Gallery; cut 12 px inside the board edge | St Andrei Rublev | 1425 to 1427 | Public domain (PD-Art, PD-old-100-expired) | [Commons](https://commons.wikimedia.org/wiki/File:Andrey_Rublev_-_%D0%A1%D0%B2._%D0%A2%D1%80%D0%BE%D0%B8%D1%86%D0%B0_-_Google_Art_Project.jpg) |
| `mystical-supper.jpg` | The Mystical Supper, from the Dormition Cathedral of the Kirillo-Belozersky Monastery, Russian Museum; cut 10 px inside the board edge | unknown | 1497 | Public domain (PD-Art, PD-old-100-expired) | [Commons](https://commons.wikimedia.org/wiki/File:%D0%A2%D0%B0%D0%B9%D0%BD%D0%B0%D1%8F_%D0%B2%D0%B5%D1%87%D0%B5%D1%80%D1%8F._%D0%98%D0%BA%D0%BE%D0%BD%D0%B0_%D0%B8%D0%B7_%D0%A3%D1%81%D0%BF%D0%B5%D0%BD%D1%81%D0%BA%D0%BE%D0%B3%D0%BE_%D1%81%D0%BE%D0%B1%D0%BE%D1%80%D0%B0_%D0%9A%D0%B8%D1%80%D0%B8%D0%BB%D0%BB%D0%BE-%D0%91%D0%B5%D0%BB%D0%BE%D0%B7%D0%B5%D1%80%D1%81%D0%BA%D0%BE%D0%B3%D0%BE_%D0%BC%D0%BE%D0%BD%D0%B0%D1%81%D1%82%D1%8B%D1%80%D1%8F._1497.jpg) |
| `last-judgment.jpg` | The Last Judgment, Tretyakov Gallery; cut inside the dark board edge at top and bottom | anonymous Russian icon painter | first half of the 16th century | Public domain (PD-Art, PD-old-100) | [Commons](https://commons.wikimedia.org/wiki/File:%D0%A1%D1%82%D1%80%D0%B0%D1%88%D0%BD%D1%8B%D0%B9_%D0%A1%D1%83%D0%B4_-_Google_Art_Project.jpg) |
| `triumph-of-orthodoxy.jpg` | The Triumph of Orthodoxy, British Museum: a smaller copy of the history picture `triumph-of-orthodoxy.v1.jpg` (see HISTORY_MEDIA.md) | anonymous | between 1375 and 1425 | Public domain (PD-Art, PD-old-100-expired) | [Commons](https://commons.wikimedia.org/wiki/File:Triumph_orthodoxy.jpg) |

The other five subjects use icons the prayer pages already carry, recorded
in `lib/prayers/icons.ts`: Christ Pantocrator, the Theotokos of Vladimir,
Pentecost, the Anastasis and the Three Hierarchs.
