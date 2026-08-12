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

## Section photography

Recorded in `SECTION_MEDIA.md`, carrying the same required fields the history
media registry enforces: work, artist, date, source, licence, evidenceUrl.
`lib/media/__tests__/sections.test.ts` was written because this directory had no
provenance at all. It now has a suite of its own.
