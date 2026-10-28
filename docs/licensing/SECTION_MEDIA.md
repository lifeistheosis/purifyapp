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
| `prayers.v3.jpg` | prayers | Christ Pantocrator, St Catherine's Monastery, Sinai | Anonymous | 6th century | Public domain (PD-Art, PD-old-100-expired) | [Commons](https://commons.wikimedia.org/wiki/File%3AChrist_Icon_Sinai_6th_century.jpg) |
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

`prayers.v3.jpg` replaced it on 2026-10-28, for 1.8, when Prayers came to open
on this picture full width (`components/mobile/PrayersHero.tsx`), where the
486 by 512 cut looked soft on a phone. It is the same framing, cut this time
from the Commons original itself rather than from the shop's smaller copy of
it: the original is 801 by 1528 (the shop's copy is that file brought down to
629 by 1200), and the cut is 619 by 652 from 92px in and 89px down, at the
original's own pixels, nothing enlarged. That is all the file holds, so the
gain is modest: 1.27 times as wide, from a first-generation file. The licence
was read again on the file page that day: `{{PD-Art|PD-old-100-expired}}`.
The picture was opened and laid beside v2 at the same size before it went in
(the framing and the colour match), and it has no white at any edge. 619 by
652, 104 KB, JPEG (mozjpeg) at quality 86, as dense as v2. Start here shows
the same file, at 168px at most.

`prayers.v2.jpg` stayed in `public/sections/` for a day, as the onboarding
pictures' stand-in (`lib/onboarding/pictures.ts`). When the two branches met
on release/1.8 the stand-in moved to `prayers.v3.jpg` and v2 left the disk
(2026-10-28).

Two larger scans of the same icon are on Commons, and neither is used, because
each is another photograph and so a change of picture, not more pixels of this
one. They are listed under "Rejected" below, so the next run sees them.

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
| `File:Spas vsederzhitel sinay.jpg` | The Sinai Pantocrator at 2023 by 3774 (PD-Art, PD-old-100-expired), which would give the Prayers hero 1290 wide. Not used in 1.8: it is another photograph of the icon, cooler than the one Purify shows, with the halo paler, the hair near black and a blue-grey ground at the corners. Whether that is worth it is the owner's call. |
| `File:CHRIST PANTOCRATOR-SINAI(6th Century).jpg` | The Sinai Pantocrator at 7264 by 13120 (50 MB). A third photograph: browner and greener, cut inside the board so the halo meets the top edge. Not used. |
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

## Discover's pictures (1.8)

The pictures on Discover's bands (`components/mobile/DiscoverMobile.tsx`,
`public/discover/tiles/`). In 1.7 each was cut, 507 by 396, from a picture the
app already carried, and drawn as a small tile. From 1.8 each is a band the
width of the page: about 390 CSS px on the widest phone, up to 840 in the apps
on a tablet. So on 2026-10-28 every one whose source is on record, and whose
original holds more pixels than the tile, was cut again from that Commons
original. The same works and the same framing: the box was found by matching
the old file against the original, and the colour was checked against the old
file. Cut at the original's own pixels, or brought down to 1352 wide (three
times the widest phone band, and 8/3 of the old 507, so the shape is exact).
Nothing enlarged. WebP at quality 72 (effort 6, smart subsampling): the dark
robes were checked close up for banding and have none. Each original was
opened and looked at before it was cut, each cut was laid beside the old file
at the same size, and none has white at an edge
(`node scripts/check-picture-edges.mjs discover/tiles`). Each licence below was
read on its file page that day. The downloaded originals are not kept in the
repository. Each new cut has a new name (`calendar.v2.webp`), so no cache
keeps the old picture, and the old file is gone.

| File | Door | Work | Artist, as the page gives it | Date of the work | Licence, read 2026-10-28 | Source | The cut |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `reading.v2.webp` | Reading | Christ Pantocrator of the Vysotsky range, Tretyakov Gallery: the open Gospel in his hand | a Byzantine master, anonymous | 1387 to 1395 | Public domain (PD-old) | [Commons](https://commons.wikimedia.org/wiki/File:Christ_Pantocrator_from_Vysotsky_chin_(14c,_Tretyakov_gallery).jpg), 1300 by 2031 | 910 by 711 at 364,1127, no resize; 124 KB (was 507 by 396, 44 KB, from the shop's copy `deesis-wooden-diptych.jpg`) |
| `history.v2.webp` | History | The Triumph of Orthodoxy, the British Museum: its upper half | anonymous | between 1375 and 1425 | Public domain (PD-Art, PD-old-100-expired) | [Commons](https://commons.wikimedia.org/wiki/File:Triumph_orthodoxy.jpg), 1482 by 1886 | 1351 by 1055 at 66,57, no resize; 416 KB (was 507 by 396, 76 KB) |
| `councils.v2.webp` | Councils | The same icon: the fathers along its lower half | anonymous | between 1375 and 1425 | Public domain (PD-Art, PD-old-100-expired) | [Commons](https://commons.wikimedia.org/wiki/File:Triumph_orthodoxy.jpg), 1482 by 1886 | 830 by 648 at 341,1028, no resize; 142 KB (was 507 by 396, 59 KB) |
| `theology.v2.webp` | Theology | The Holy Trinity, Tretyakov Gallery | Andrei Rublev | early 15th century (the page gives no date) | Public domain (PD-Art, PD-old-100-1923) | [Commons](https://commons.wikimedia.org/wiki/File:Angelsatmamre-trinity-rublev-1410.jpg), 1300 by 1619 | 1114 by 870 at 93,281, no resize; 207 KB (was 507 by 396, 65 KB, from the shop's copy `holy-trinity-rublev-mounted.jpg`) |
| `calendar.v2.webp` | Calendar | The Menologion of Basil II, the Circumcision of Christ (Vat. gr. 1613, f. 287) | the Menologion's illuminators | about 985 (the page gives the 11th century) | Public domain (PD-Art, PD-old-100-expired) | [Commons](https://commons.wikimedia.org/wiki/File:Menologion_of_Basil_047.jpg), 2244 by 1504 | 1571 by 1227 at 449,260, brought down to 1352 by 1056; 554 KB, heavy because the scan is grainy (was 507 by 396, 74 KB, from `sections/discover.jpg`) |
| `shop.v2.webp` | Shop | St George, Novgorod school, Tretyakov Gallery | unknown | 15th century | Public domain (PD-Russia) | [Commons](https://commons.wikimedia.org/wiki/File:Saint_George_icon._Novgorod_icon-painting_school,_15th_cent..,_Veliky_Novgorod,_Russia._Tretyakov_Gallery.jpg), 3888 by 5152, stored upside down and turned by its own orientation flag | 2920 by 2281 at 519,707 of the turned picture, brought down to 1352 by 1056; 191 KB (was 507 by 396, 37 KB, from the shop's copy `st-george-mounted.jpg`) |
| `start.v2.webp` | Start here | Christ Pantocrator, St Catherine's Monastery, Sinai: the slice on his eyes | unknown | 6th century | Public domain (PD-Art, PD-old-100-expired) | [Commons](https://commons.wikimedia.org/wiki/File:Christ_Icon_Sinai_6th_century.jpg), 801 by 1528 | 721 by 563 at 39,152, no resize; 79 KB (was 507 by 396, 30 KB, from the shop's copy `christ-pantocrator-mounted.jpg`). The most this file holds; see `prayers.v3.jpg` above |
| `parishes.v2.webp` | Find a parish | St John Chrysostom, mosaic in Hagia Sophia | a Byzantine mosaicist of the 9th century | end of the 9th century | Public domain (PD-Art, Yorck Project) | [Commons](https://commons.wikimedia.org/wiki/File:Byzantinischer_Mosaizist_des_9._Jahrhunderts_003.jpg), 2024 by 1821 | 885 by 691 at 572,73, no resize; 63 KB (was 507 by 396, 47 KB, from History's `chrysostom-at-constantinople.v1.jpg`) |

Kept as they were, 507 by 396, and why:

| File | Door | Work | Why it was not cut again |
| --- | --- | --- | --- |
| `saints.webp` | Saints | The Three Hierarchs, a Novgorod icon before 1917 | Cut in 1.7 from the prayer icon `public/icons/prayer/three-hierarchs.v2.jpg`. `lib/prayers/icons.ts` records the work and its licence (PD-Russia-expired), but not which Commons file it came from (v3.5, 2026-05-19), so there is no recorded original to cut again. |
| `walkthroughs.webp` | Walkthroughs | The Anastasis, a Russian icon of about 1500 | Cut in 1.7 from the prayer icon `public/icons/prayer/anastasis.jpg`. The same gap: the work and its licence (PD-Art) are recorded, its Commons file is not. |
| `chat.webp` | Chat | The Descent of the Holy Spirit, Novgorod school, the turn of the 15th and 16th centuries | Cut in 1.7 from History's Pentecost picture of 1.6, recorded in that release's `lib/history/events.ts` as [File:The Descent of the Holy Spirit Novgorod.jpeg](https://commons.wikimedia.org/wiki/File:The_Descent_of_the_Holy_Spirit_Novgorod.jpeg) (public domain). The original on Commons is 545 by 727, the same pixels the tile was cut from: there is nothing larger. |
| `chants.webp` | Chants | The heavenly host, from the Nativity icon the shop carries (Royal Collection RCIN 403381, `SHOP_MEDIA.md`) | The angels fill only 491 px of the original's width, fewer than the 507 the tile already has (1.7 enlarged them from the 415 px of the shop's copy). A cut from the original would hold a little more detail but no more pixels, and the picture is a stand-in until the owner picks the Chants icon, so it was left. |

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
