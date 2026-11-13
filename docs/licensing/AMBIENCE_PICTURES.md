# The ambience sounds' photographs

One photograph on each sound's tile in the ambience sheet (build 95, note 22,
the owner's word of 2026-11-13: "I want each button to have a photo of the
corresponding aesthetic of the sound ... ensure the photos are fitting").
Policy, matching `SECTION_MEDIA.md` and `icon-provenance.md`: **a picture
ships only if its source and licence are recorded here.** Public domain or
CC0 first; a CC BY or CC BY-SA photograph only with its photographer named on
the credits page, as its page asks (`lib/credits/photos.ts` reads them from
`lib/ambience/ambience.ts`). Never a picture made by AI, and never a
photograph of a contemporary icon.

They live beside the sounds in `public/audio/ambience/` and ride in the apps'
bundle, so a tile has its picture with no signal: each a JPEG of 288 by 216
(twice the tile's picture at its widest), together about a tenth of a
megabyte. `lib/ambience/__tests__/photos.test.ts` holds each file to its size,
its record here and its licence.

## Shipped

| File | Sound | What it shows | Photographer | Taken | Licence | Source |
| --- | --- | --- | --- | --- | --- | --- |
| `rain.jpg` | Rain | Raindrops on a window at night, Brastad, Sweden | W.carter | 2019 | CC0 | [Commons](https://commons.wikimedia.org/wiki/File:Raindrops_on_a_window_in_Brastad_3.jpg) |
| `birds.jpg` | Morning birds | A song thrush singing at the tip of a spruce, Oulu, Finland | Matti Virtala | 2021 | CC0 | [Commons](https://commons.wikimedia.org/wiki/File:Turdus_philomelos_Oulu_Finland_2021-05-12.jpg) |
| `bell.jpg` | Bell and stillness | The bell in the bell gable of a chapel at Trachili, Euboea, Greece | Jebulon | 2016 | CC0 | [Commons](https://commons.wikimedia.org/wiki/File:Bell_gable_Trachili_Euboea_Greece.jpg) |
| `peal.jpg` | Cathedral bells | A great bell, with the bells beyond it, in the belfry of the Rostov Kremlin | Aleksandr Sigachyov | 2025 | CC0 | [Commons](https://commons.wikimedia.org/wiki/File:Rostov_Kremlin_-_Bell_Tower_-_2025-08_-_p11.jpg) |
| `sea.jpg` | The sea | The Monastery of Simonos Petra on its rock above the sea, Mount Athos | Angelos @ Ottawa | 2024 | Public domain | [Commons](https://commons.wikimedia.org/wiki/File:Simonopetra_Monastery,_Mount_Athos.jpg) |
| `wind.jpg` | Wind | Gergeti Trinity Church alone on its ridge below Mount Kazbek, Georgia | Avisadehh | 2014 | CC0 | [Commons](https://commons.wikimedia.org/wiki/File:GERGETI_TRINITI_FROM_A_DISTANCE.%D7%9B%D7%A0%D7%A1%D7%99%D7%99%D7%AA_%D7%92%D7%A8%D7%92%D7%98%D7%99_%D7%98%D7%A8%D7%99%D7%A0%D7%99%D7%98%D7%99_%D7%9E%D7%9C%D7%9E%D7%98%D7%94.jpg) |

Each page gives `AttributionRequired` false, so no credit is owed; the
photographers are named here all the same. Five are CC0, their photographers'
own uploads. A church or a chapel in rain was looked for and found only under
CC BY-SA (a lattice window at the Iversky Monastery, Valdai), so the window's
rain stands as the recording does.

**The sea is Simonopetra** (his word, 2026-11-13 about 14:29 UTC, applied by
Updates 28 the same evening). Until then it was a wave on a pebble beach
(Erwan Hesry, 2016), which came to Commons from Unsplash and whose licence
review there was still to be done; Simonopetra, public domain, was named to
him as the swap, and he took it. The photograph is the monastery's tower and
its wooden balconies on the rock, the sea beside it and the haze beyond, at
dusk. Its licence was read at the source on 2026-11-13: on Flickr
(https://www.flickr.com/photos/194609185@N08/53874839234/, owner
194609185@N08, "Angelos @ Ottawa", taken 2024-07-22) the photographer's own
Public Domain Mark (https://creativecommons.org/publicdomain/mark/1.0/), and on
Commons `PD-author-FlickrPDM` (the author's release into the public domain),
with FlickreviewR 2's review of the same mark on 2025-05-16; `extmetadata`
gives `LicenseShortName` Public domain, `Copyrighted` False. The file was taken
from Commons' 1280px rendering, cut to 4:3 round the tower and the sea (640 by
480 from 640, 100), and made as the others were.

## How they were made

Each photograph's licence was read on its Commons page through the Commons
API on 2026-11-13 (`extmetadata`: LicenseShortName, LicenseUrl, Artist), and
each was opened and looked at before use: fitting the sound, sharp, with no
watermark, no words and no person as its subject, and none in a category or
description that says it was made by AI. Each was cut to 4:3 round its
subject, scaled to 288 by 216 and saved as a JPEG (`ffmpeg`, quality 4); its
`ground` in `lib/ambience/ambience.ts` is the file's mean colour, which shows
under it until it paints.
