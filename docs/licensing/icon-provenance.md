# Icon and photograph provenance — `public/saints/icons/`

Policy, matching `audio-provenance.md`: **an image ships only if its source
and rights basis are documented here.** This file exists because two
contemporary works were found rendering in production on 2026-07-25 with no
license row anywhere in the repo.

## Contemporary works, used with permission

These are **not** public domain. They are modern studio icons by living
iconographers and both carry a visible watermark in the lower right corner
of the file. Leona confirmed on 2026-07-25 that Purify has the
iconographers' permission to use them.

| File | Subject | Iconographer | Watermark | Rights basis |
| --- | --- | --- | --- | --- |
| `praying3.jpg` | The father running to receive the Prodigal Son, with the fatted calf and the music of the feast | Tom Clark | `TomClarkIcons.com` | Permission confirmed by the owner, 2026-07-25. **Action: Leona to file the written permission (email or message) alongside this doc so the basis survives a rights audit.** |
| `icon4.jpg` | The father embracing the Prodigal Son, the swine and the far country behind him | Alevizakis | `IconsAlevizakis.com` | Permission confirmed by the owner, 2026-07-25. **Action: same, file the written permission.** |

Both render as the full-bleed backdrop of `/prayers` through
`components/prayers/PrayerSlideshow.tsx` (`PrayerSlideshowHero`, mounted at
`app/(app)/prayers/page.tsx`) at `opacity-[0.16]`. The watermark is not
legible at that opacity, which is a reason to keep the attribution recorded
here rather than relying on the image to carry it.

The other two frames in that slideshow, `praying2.jpg` (the Agony in the
Garden, inscribed Ἡ ΑΓΩΝΙΑ) and `praying.jpg` (a monk in prostration before
the icon of Christ in his cave), are undocumented and should be traced to a
source. They carry no watermark.

## Alt-text correction, 2026-07-25

The four `FRAMES` in `PrayerSlideshow.tsx` were misaligned by one position:
frame 0 was described as the cave prostration when it is the Agony, and
frame 2 as the Agony when it is the Prodigal Son. Every alt string was
re-checked against the image itself and corrected. When adding a frame,
open the file and look at it; do not infer the subject from the filename.

## The other 108 files in this directory

`public/saints/icons/` holds 110 images in total, referenced from
`Saint.iconUrl` in `lib/saints/saints.ts` and from `AUTHOR_ICONS` in
`lib/saints/icons.ts`. Neither carries a license field, and
`scripts/fetch-missing-icons.mjs` downloads from a Commons search without
inspecting the license at all. Contrast `scripts/fetch-shop-media.mjs`,
which rejects anything failing `PD_PATTERN` on
`extmetadata.LicenseShortName`.

Most are photographs of old icons and frescoes and are very likely PD-Art,
but "likely" is not the standard the rest of the repo holds. Two of the
four files inspected on 2026-07-25 turned out to be watermarked
contemporary works, so the exposure is not hypothetical.

**Open item:** run the whole directory back through a license check, using
the `fetch-shop-media.mjs` validation as the model, and record the result
here. This matters more as icons get promoted to hero scale, because a
72x96 medallion and a full-bleed backdrop are different rights postures for
the same file.

## Section photography

New general-purpose photography for the mobile section shells is recorded
in `SECTION_MEDIA.md` and carries the same required fields the history
media registry enforces: work, artist, date, source, license, evidenceUrl.
