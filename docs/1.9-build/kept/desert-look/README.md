# The Desert look: kept, not shipped

**What it is.** Desert was one of the looks made for 1.9 on 2026-11-10
(`docs/1.9-build/notes/themes-fable.md`, "The third set"): a Purify Plus
reading theme in the Land and sea family, worn over Light. A warm sand page
with a dark brown ink and a rust rubric, and at the foot of the screen three
dunes, one behind another, each a step deeper, in the last light.

**Its date.** Made on 2026-11-10, taken out on 2026-11-13.

**Why it is here.** On 2026-11-13 the land looks' feet were reworked at the owner's word, and the arbiter recommended that Desert come out rather than be redrawn. His answer, about 14:29 UTC: "all recs".
The looks had not been released, so only a tester ever had it. Nothing made
is deleted (the Vault, his word of 2026-11-09), so what Desert was is kept in
this folder, where the apps and the website do not reach: nothing in `app/`,
`components/`, `lib/` or `public/` loads a file from here.

Its first picture was kept for a while in `docs/1.9-build/kept/land-looks/`
as `desert-dunes.svg`, beside Forest's and Jordan's first pictures; it is
kept once, here, as `desert.svg`.

## What is in this folder

| File | What it is |
| --- | --- |
| `desert-look-2026-11-13.png` | One still of the look as it stood: John 1 on a phone, from the app's own export |
| `desert.svg` | The look's picture: three dunes in the last light, drawn by code. It was `public/themes/desert.svg` |
| `desert.css` | The look's rules, as they stood in `app/globals.css` |
| `words.json` | Its name and its one line under that name in the picker, in all 21 languages (`settings.paletteDesert`, `settings.paletteDesertHint`) |

Its entry in the registry (`lib/reader/readingModes.ts`, between Forest and
Jordan) was:

```ts
{
  id: "desert",
  label: "Desert",
  blurb: "The dunes of the Fathers in the last light",
  labelKey: "settings.paletteDesert",
  blurbKey: "settings.paletteDesertHint",
  family: "land",
  look: "light",
},
```

It stood first in `PREPAINT_LOOKS_LIGHT` (`lib/reader/prepaint.ts`), before
Jordan. `docs/licensing/THEME_PICTURES.md` records its picture under "Kept,
not shipped: Desert".

The code that draws the picture is still in `scripts/theme-pictures.mjs`
(`desert()`, in `KEPT_DRAWINGS`): `node scripts/theme-pictures.mjs --kept`
draws `desert.svg` again into this folder, and never into `public/themes/`.
`lib/reader/__tests__/retiredThemes.test.ts` holds the file here to what the
code draws, to the letter.

## What a device that stored it wears

Only a tester's device can hold the id `desert`, stored on it or arriving by
sync from an older build. It reads as Roses: the kept look nearest it by
ground and ink, worn over Light as Desert was, and Plus as Desert was, so the
same reader is entitled to it. Roses is a warm page (#eceae4 against
Desert's #efe2d9), a warm brown ink (#392327 against #361f17) and a red
rubric (#91213e against Desert's rust #6f2c16). Light stays light.

`RETIRED_THEMES` in `lib/reader/readingModes.ts` says so, and every reader of
a stored palette applies it; the pre-paint script says the same
(`PREPAINT_RETIRED` in `lib/reader/prepaint.ts`), so the app opens in Roses
from the first paint, with no frame of Light or of anything else. The server
refuses `desert` as it refuses any unknown palette.
`lib/reader/__tests__/retiredThemes.test.ts` holds all of this, that Roses is
the nearest, and that the app offers Desert nowhere.

## If it is ever wanted again

On the owner's word only. In this order:

1. The entry above back into `READING_THEMES`, and `"desert"` into the
   `ReadingTheme` union and into `PREPAINT_LOOKS_LIGHT`
   (`lib/reader/prepaint.ts`); `desert` out of `RETIRED_THEMES` and
   `PREPAINT_RETIRED`.
2. `desert.css` back into `app/globals.css`, each part in the place its note
   names; `desert.svg` back into `public/themes/` and `"desert.svg"` from
   `KEPT_DRAWINGS` back into `DRAWINGS` (`scripts/theme-pictures.mjs`), with
   its row in `docs/licensing/THEME_PICTURES.md`. Or a new foot, as the other
   land looks were given on 2026-11-13.
3. `settings.paletteDesert` and `settings.paletteDesertHint` back into the
   21 catalogs from `words.json`.
4. The Plus lines count the reading modes in words, in 21 languages
   (`plus.palettes.title`, `plus.palettes.body`, `plus.active.modes`,
   `premium.plus.readingModes.sub`, and the plan's row in
   `lib/premium/plans.ts`): each number goes up by one.
   `lib/premium/__tests__/plans.test.ts` reads them against the registry, in
   every language, and fails until they agree.
5. The tests that count the looks say how many there are; the unit suite
   names each one that has to follow.
