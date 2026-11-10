# Icon and photograph provenance, `public/saints/icons/`

Policy, matching `audio-provenance.md`: **an image ships only if its source and
rights basis are recorded.** This file exists because two contemporary works
were found rendering in production on 2026-07-25 with no licence row anywhere
in the repo.

## Where the records live

Since 2026-08-10 the rows themselves are **`lib/saints/iconRights.ts`**, not
this document, and `lib/saints/__tests__/iconRights.test.ts` fails the build if
a file in the directory has no row.

This document is the policy, the narrative and the procedure. The registry is
the data. Do not duplicate rows here; they will drift.

The registry holds two maps:

- `ICON_RIGHTS`, files whose rights are settled. Every row was opened and looked
  at, and carries `inspectedOn` to say when.
- `UNVERIFIED_ICONS`, the debt. Each value records only what the bytes and the
  registries prove: which registry points at the file, its true container, its
  dimensions, its size. **No licence, no artist, no "probably PD-Art."** An
  inferred licence in a rights file is worse than an admitted gap, because the
  next reader believes it. The test enforces this: a note containing a licence
  word fails.

## The rule

**Open the file and look at it.** The licence field will not tell you whether
the picture is what you meant. Recorded incidents, all real:

| What was asked for | What came back |
| --- | --- |
| An Orthodox lampada oil lamp | An electrical wiring diagram captioned "VOLTS COLOR" |
| A Hagia Sophia interior | A frame dominated by the Ottoman calligraphic roundels, reading as a mosque on an Orthodox app |
| A Menologion of Basil II miniature | Public-domain plate, Vatican Library scan, diagonal RESERVED watermark across it |
| Four prayer slideshow frames | Three of the four alt descriptions were wrong, inferred from filenames |

Check the subject is what you meant, the crop has not cut off a face, and there
is no watermark. `inspectedOn` in the registry is written **only** by the
promote step of the fetch script, which is what makes the field mean anything.

## State on 2026-08-10

110 files, 17.10 MiB. **Three have settled rights. 107 do not.**

That is the debt, and it is now visible and bounded rather than invisible. The
test carries `MAX_UNVERIFIED = 107`, which may only fall. Together with the
completeness assertion this is the whole mechanism: a new file must appear in
one of the two maps, and putting it in the debt map breaches the ceiling, so
**the only way to add an icon is to add a rights-complete row**. The backfill
can take as long as it takes without the registry rotting.

`scripts/fetch-missing-icons.mjs` populated all 110 before it had a licence
gate. It has one now, but on the wrong axis: it still takes the first
licence-passing search hit with no subject check and no human step. That is why
the batch procedure below exists.

## Contemporary works, used with permission

Not public domain. Modern studio icons by living iconographers. Two carry a
visible watermark in the lower right of the file. Permission confirmed by the
owner on the dates recorded in `ICON_RIGHTS`.

All three render through `components/prayers/PrayerSlideshow.tsx` or
`Saint.iconUrl`. On `/prayers` the frames sit at `opacity-[0.16]`, where the
watermark is not legible, which is a reason to keep attribution recorded rather
than relying on the image to carry it.

**Open items, blocked on the owner:**

1. The iconographer of `john-the-baptist.jpg` is not recorded. Until it is, that
   image is attributed to nobody, which is weaker than the two rows beside it.
   The file is listed in `MISSING_ATTRIBUTION`, and the test holds that list to
   entries that really are permission rows, so it cannot be quietly forgotten.
   It arrived in the repo as `jjj.jpg`.
2. The written permissions for Tom Clark and Alevizakis are confirmed but not
   filed. `filedAt` is absent on both rows until they are.

## Adding an icon

1. Stage candidates with `scripts/fetch-saint-icons.mjs --stage`. It fetches up
   to three licence-passing candidates per target and writes a contact sheet
   rendering each at the three sizes the app actually uses.
2. **Open the contact sheet and look.** The heuristics in the script flag; they
   never approve. A metadata subject gate, a watermark flag, a near-duplicate
   check and a uniform-border flag will each surface a candidate for a human to
   judge, and none of them can tell you it is the wrong saint.
3. Promote with `--promote <slug> <n> --alt "..."`. The alt text is written
   while looking at the picture: who, what they hold, what is behind them, the
   inscription if legible. `alt="Icon of St X"` passes axe and tells a screen
   reader nothing, so the test rejects it.
4. Paste the printed row into `ICON_RIGHTS` and delete the file's line from
   `UNVERIFIED_ICONS` if it was there.
5. Update `MAX_ICONS_BYTES` in the test in the same commit as the files, so the
   diff shows the cost.

## Backfilling the 107

Three honest outcomes per file, and the third is not a failure:

- Trace it to its Commons original, confirm the local file **is** that file, and
  record the row.
- Obtain permission and record it as a `permission` row.
- Delete the file and let the placeholder render.
  `components/saints/SaintIcon.tsx` always draws a designed gold-frame-and-halo
  panel with the saint's initials underneath the image, so removal is not a
  visual regression.

Priority order: the twentieth-century figures first, since a photograph of a
modern person is the least likely to be public domain. `dumitru-staniloae.jpg`
and `iakovos-of-evia.jpg` are the clearest cases.

2026-11-10 (November's saints, 1.9): `iakovos-of-evia.jpg` is gone, with
St Gabriel of Georgia's, St Arsenie of Prislop's and St Philoumenos's: no
public-domain picture of any of them was found, and their pages stand on the
plate, as St Paisius Velichkovsky's does until the painter and date of his
one old portrait are found. The other eight of November's unrecorded icons
are settled in lib/saints/iconRights.ts (the block "November's saints, the
thirteen older icons").

## The Desert Fathers' sayings (2026-10-31)

Today stands each Father beside his saying (1.8, round 3 r3-21, the owner's
pick A). The owner chose two pictures from sheet r3-22
(`Homebase/boards/purify-master/variants/r3-22-desert-icons.png`, candidates
and their `sources.json` in `Homebase/boards/purify-master/r18/icon-candidates/`).
Both are public domain on their Commons pages, were opened and looked at
before they were cut and again after, and have their rows in `ICON_RIGHTS`:

| File | The work | Commons page and licence line |
| --- | --- | --- |
| `moses-the-black.v2.jpg` | St Moses the Ethiopian, fresco by Tzortzis (Zorzis Foukas), Dionysiou Monastery, Mount Athos, 1547, inscribed with his name and "the Ethiopian"; its upper part, cut above a white loss on his robe, 465x560 | [File:Venerable Moses. Tzortzi (Zorzis) Foukas. Fresco. Athos (Dionysiou).jpg](https://commons.wikimedia.org/wiki/File:Venerable_Moses._Tzortzi_(Zorzis)_Foukas._Fresco._Athos_(Dionysiou).jpg), public domain, `{{PD-old-70}}` |
| `fathers-of-sinai.jpg` | The Holy Fathers of Sinai, St Catherine's Monastery, early 13th century; the panel, cut inside the white of the scan round its worn edges, 618x800 | [File:Saints of Sinai.jpg](https://commons.wikimedia.org/wiki/File:Saints_of_Sinai.jpg), public domain, `{{PD-Art\|PD-old-100-expired}}` |

The fresco stands beside Abba Moses' sayings and, in place of the modern icon
`moses-the-black.jpg` (painter and source never found, so it was in the debt
and is now deleted), on St Moses the Ethiopian's own page. The Fathers of
Sinai stand beside Abba Isaac's saying, of whom no icon exists, and beside any
Father with no picture of his own. `lib/today/saintFaces.ts` keeps where each
face is (`ICON_FACES`, the point and the circle as the sheet cut them) and who
stands beside which saying (`SAYING_FACES`).

## Faces for the saints' words (2026-10-31)

The day's saint stands beside his words on Today the same way. The owner
chose four faces from sheet r3-23
(`Homebase/boards/purify-master/variants/r3-23-saint-faces.png`, candidates
and their `sources.json` in `Homebase/boards/purify-master/r18/icon-candidates/`),
each public domain on its Commons page, opened and looked at before it was
cut and again after, with its row in `ICON_RIGHTS`:

| File | The work | Commons page and licence line |
| --- | --- | --- |
| `john-chrysostom.v2.jpg` | St John Chrysostom, mosaic in the south-east conch of the nave, Hosios Loukas, Boeotia, early 11th century, scanned from M. Chatzidakis, Byzantine Art in Greece; his head and shoulders, cut inside the white page of the book, 640x800 | [File:Hosios Loukas (nave, south east conch) - John Chrysostom - detail.jpg](https://commons.wikimedia.org/wiki/File:Hosios_Loukas_(nave,_south_east_conch)_-_John_Chrysostom_-_detail.jpg), public domain, `{{PD-old}}` |
| `cyril-of-jerusalem.v2.jpg` | St Cyril of Jerusalem, fresco, Gracanica monastery, Kosovo, about 1321 (Commons: 14th to 16th century), named in Slavonic; the upper part, 293x366 | [File:Serbian Fresco Icon of Saint Cyril of Jerusalem.jpg](https://commons.wikimedia.org/wiki/File:Serbian_Fresco_Icon_of_Saint_Cyril_of_Jerusalem.jpg), public domain, `{{PD-old-70}}` |
| `photius-the-great.v2.jpg` | Patriarch Photius at prayer, the Madrid Skylitzes, fol. 107, 12th century (Commons: 11th), labelled the Patriarch Photius; the upper part, 378x472 | [File:Patriarch Photius, Madrid Skylitzes.jpg](https://commons.wikimedia.org/wiki/File:Patriarch_Photius,_Madrid_Skylitzes.jpg), public domain, `{{PD-Art\|PD-old-100}}` |
| `justinian-the-great.v2.jpg` | The Emperor Justinian I and his court, apse mosaic of San Vitale, Ravenna, before 547, scanned from E. Ferte, L'art de Byzance (Mazenod, 1981); his head and shoulders with the courtiers beside him, 640x800 | [File:Mosaic of Justinian I - Basilica San Vitale(6th Century).jpg](https://commons.wikimedia.org/wiki/File:Mosaic_of_Justinian_I_-_Basilica_San_Vitale(6th_Century).jpg), public domain, `{{PD-Italy}}`: the scan is an Italian simple photograph more than 20 years old, not tagged PD-Art |

Each takes the place of the file its saint's page showed, which had no
recorded source and is now deleted: `john-chrysostom.jpg` (a standing figure,
140x420), `cyril-of-jerusalem.jpg` and `photius-the-great.jpg` (modern icons)
and `justinian-the-great.jpg` (a San Vitale crop whose photograph was never
traced). St John Chrysostom's streamed cover is unchanged; the mosaic is the
picture the app carries for when the cover cannot be had. St Alexander of
Alexandria has none: no public-domain icon of him with a face that can be
checked was found, so his words keep the lit cross. `lib/today/saintFaces.ts`
keeps each face's point and circle as the sheet cut them (`ICON_FACES`).

## Section photography

Recorded in `SECTION_MEDIA.md`, carrying the same required fields the history
media registry enforces: work, artist, date, source, licence, evidenceUrl.
`lib/media/__tests__/sections.test.ts` was written because this directory had no
provenance at all. It now has a suite of its own.
