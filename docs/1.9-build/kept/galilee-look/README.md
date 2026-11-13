# The Galilee look: kept, not shipped

**What it is.** Galilee was one of the looks made for 1.9 on 2026-11-10
(`docs/1.9-build/notes/themes-fable.md`, "The third set"): a Purify Plus
reading theme in the Land and sea family, worn over Dark. A deep blue-green
page with a cool white ink, and at the foot of the screen the Sea of Galilee
by night: the far hills, the water's edge, a soft pool of light on the water
and three long glints, each quieter than the last.

**Its date.** Made on 2026-11-10, taken out on 2026-11-13.

**Why it is here.** The owner's word on 2026-11-13, about 07:52 UTC, after
walking the first 1.9 test build (build 95):
"remove the sea theme from the app and the mountain either needs a rework or it gets removed".
Asked which sea theme, Galilee or Patmos, he answered "Both" (about 07:54 UTC;
build 95 note 16). The looks had not been released, so only a tester ever had it.
Nothing made is deleted (the Vault, his word of 2026-11-09), so what Galilee
was is kept in this folder, where the apps and the website do not reach:
nothing in `app/`, `components/`, `lib/` or `public/` loads a file from here.

Patmos, the other look of the sea, is kept beside it in
`docs/1.9-build/kept/patmos-look/`. The Holy Mountain is not part of this: it
is being reworked, for his yes or no.

## What is in this folder

| File | What it is |
| --- | --- |
| `galilee-look-2026-11-13.png` | One still of the look: John 1 on a phone, on the export of the round that took it out, wearing this folder's own rules and picture (so the still is also the proof that the folder holds the whole look) |
| `galilee.svg` | The look's picture: the sea by night, 390 by 300, drawn by code. It was `public/themes/galilee.svg` |
| `galilee.css` | The look's rules, as they stood in `app/globals.css` |
| `words.json` | Its name and its one line under that name in the picker, in all 21 languages (`settings.paletteGalilee`, `settings.paletteGalileeHint`) |

Its entry in the registry (`lib/reader/readingModes.ts`, between Jordan and
Patmos) was:

```ts
{
  id: "galilee",
  label: "Galilee",
  blurb: "The sea by night, and the light lying on the water",
  labelKey: "settings.paletteGalilee",
  blurbKey: "settings.paletteGalileeHint",
  family: "land",
  look: "dark",
},
```

It stood in `PREPAINT_LOOKS_DARK` (`lib/reader/prepaint.ts`), between Forest
and Mosaic. Its row in `docs/licensing/THEME_PICTURES.md` was: `galilee.svg`,
Galilee, "The sea by night, a soft pool of light on the water", drawn by code,
Purify's own. That page still records it, under "Kept, not shipped".

The code that draws the picture is still in `scripts/theme-pictures.mjs`
(`galilee()`, in `KEPT_DRAWINGS`): `node scripts/theme-pictures.mjs --kept`
draws `galilee.svg` again into this folder, and never into `public/themes/`.
`lib/reader/__tests__/retiredThemes.test.ts` holds the file here to what the
code draws, to the letter.

## What a device that stored it wears

Only a tester's device can hold the id `galilee`, stored on it or arriving by
sync from an older build. It reads as Forest: the kept look nearest it by
ground and ink, worn over Dark as Galilee was, and Plus as Galilee was, so the
same reader is entitled to it. Forest's page is a dark of the same depth with
the same green in it (#0b1711 against Galilee's #06181d, which leans to blue),
its ink a cool white (#edf5ef against #eaf6f6), its rubric the same, and it is
of the same family. The Holy Mountain comes next by ground and ink, and it is being
reworked or removed, so it stands in for nothing.

`RETIRED_THEMES` in `lib/reader/readingModes.ts` says so, and every reader of
a stored palette applies it; the pre-paint script says the same
(`PREPAINT_RETIRED` in `lib/reader/prepaint.ts`), so the app opens in Forest
from the first paint, with no frame of Dark or of anything else. The server
refuses `galilee` as it refuses any unknown palette.
`lib/reader/__tests__/retiredThemes.test.ts` holds all of this, that Forest is
the nearest, and that the app offers Galilee nowhere.

## If it is ever wanted again

On the owner's word only. In this order:

1. The entry above back into `READING_THEMES`, and `"galilee"` into the
   `ReadingTheme` union and into `PREPAINT_LOOKS_DARK`
   (`lib/reader/prepaint.ts`); `galilee` out of `RETIRED_THEMES` and
   `PREPAINT_RETIRED`.
2. `galilee.css` back into `app/globals.css`, each part in the place its note
   names; `galilee.svg` back into `public/themes/` and `"galilee.svg"` from
   `KEPT_DRAWINGS` back into `DRAWINGS` (`scripts/theme-pictures.mjs`), with
   its row in `docs/licensing/THEME_PICTURES.md`.
3. `settings.paletteGalilee` and `settings.paletteGalileeHint` back into the
   21 catalogs from `words.json`.
4. The Plus lines count the reading modes in words, in 21 languages
   (`plus.palettes.title`, `plus.palettes.body`, `plus.active.modes`,
   `premium.plus.readingModes.sub`, and the plan's row in
   `lib/premium/plans.ts`): each number goes up by one.
   `lib/premium/__tests__/plans.test.ts` reads them against the registry, in
   every language, and fails until they agree.
5. The tests that count the looks say how many there are; the unit suite
   names each one that has to follow.
