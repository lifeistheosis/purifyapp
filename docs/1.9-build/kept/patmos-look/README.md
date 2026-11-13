# The Patmos look: kept, not shipped

**What it is.** Patmos was one of the looks made for 1.9 on 2026-11-10
(`docs/1.9-build/notes/themes-fable.md`, "The third set"): a Purify Plus
reading theme in the Land and sea family, worn over Light. A white page with
a near black ink and Aegean blue for its links, and at the foot of the screen
a white wall and the sea beyond it: two fields of colour, the line between
them and three long glints, each quieter than the last.

**Its date.** Made on 2026-11-10, taken out on 2026-11-13.

**Why it is here.** The owner's word on 2026-11-13, about 07:52 UTC, after
walking the first 1.9 test build (build 95):
"remove the sea theme from the app and the mountain either needs a rework or it gets removed".
Asked which sea theme, Galilee or Patmos, he answered "Both" (about 07:54 UTC;
build 95 note 16). The looks had not been released, so only a tester ever had it.
Nothing made is deleted (the Vault, his word of 2026-11-09), so what Patmos
was is kept in this folder, where the apps and the website do not reach:
nothing in `app/`, `components/`, `lib/` or `public/` loads a file from here.

Galilee, the other look of the sea, is kept beside it in
`docs/1.9-build/kept/galilee-look/`. The Holy Mountain is not part of this: it
is being reworked, for his yes or no. The island itself is still in the app
where it belongs, and nothing of that was touched: the icon of St John on
Patmos on the Revelation's cover, and St Prochorus, his scribe there.

## What is in this folder

| File | What it is |
| --- | --- |
| `patmos-look-2026-11-13.png` | One still of the look: John 1 on a phone, on the export of the round that took it out, wearing this folder's own rules and picture (so the still is also the proof that the folder holds the whole look) |
| `patmos.svg` | The look's picture: the wall and the sea, 390 by 220, drawn by code. It was `public/themes/patmos.svg` |
| `patmos.css` | The look's rules, as they stood in `app/globals.css` |
| `words.json` | Its name and its one line under that name in the picker, in all 21 languages (`settings.palettePatmos`, `settings.palettePatmosHint`) |

Its entry in the registry (`lib/reader/readingModes.ts`, between Galilee and
Blush) was:

```ts
{
  id: "patmos",
  label: "Patmos",
  blurb: "A white wall, and the sea beyond it",
  labelKey: "settings.palettePatmos",
  blurbKey: "settings.palettePatmosHint",
  family: "land",
  look: "light",
},
```

It stood in `PREPAINT_LOOKS_LIGHT` (`lib/reader/prepaint.ts`), between Jordan
and Blush. Its row in `docs/licensing/THEME_PICTURES.md` was: `patmos.svg`,
Patmos, "A white wall and the sea beyond it", drawn by code, Purify's own.
That page still records it, under "Kept, not shipped". Ten languages spelled
its name as English does, and `lib/i18n/__tests__/paletteNames.test.ts` let
go of those ten exceptions with it.

The code that draws the picture is still in `scripts/theme-pictures.mjs`
(`patmos()`, in `KEPT_DRAWINGS`): `node scripts/theme-pictures.mjs --kept`
draws `patmos.svg` again into this folder, and never into `public/themes/`.
`lib/reader/__tests__/retiredThemes.test.ts` holds the file here to what the
code draws, to the letter.

## What a device that stored it wears

Only a tester's device can hold the id `patmos`, stored on it or arriving by
sync from an older build. It reads as Linen: the kept look nearest it by
ground and ink, worn over Light as Patmos was, and Plus as Patmos was, so the
same reader is entitled to it. Linen's page is the same white (#f6f4ef against
Patmos's #f7f7f5) and its ink a near black (#1f1b1a against #18202e); its
links are Linen's red where Patmos's were blue. Jordan, of Patmos's own
family, keeps water in its picture, but its page is a pale aqua a step darker
and its ink a teal, so more of what the reader reads on would change.

`RETIRED_THEMES` in `lib/reader/readingModes.ts` says so, and every reader of
a stored palette applies it; the pre-paint script says the same
(`PREPAINT_RETIRED` in `lib/reader/prepaint.ts`), so the app opens in Linen
from the first paint, over Light as Patmos was, with no frame of Dark or of
anything else. The server refuses `patmos` as it refuses any unknown palette.
`lib/reader/__tests__/retiredThemes.test.ts` holds all of this, that Linen is
the nearest, and that the app offers Patmos nowhere.

## If it is ever wanted again

On the owner's word only. In this order:

1. The entry above back into `READING_THEMES`, and `"patmos"` into the
   `ReadingTheme` union and into `PREPAINT_LOOKS_LIGHT`
   (`lib/reader/prepaint.ts`); `patmos` out of `RETIRED_THEMES` and
   `PREPAINT_RETIRED`.
2. `patmos.css` back into `app/globals.css`, each part in the place its note
   names; `patmos.svg` back into `public/themes/` and `"patmos.svg"` from
   `KEPT_DRAWINGS` back into `DRAWINGS` (`scripts/theme-pictures.mjs`), with
   its row in `docs/licensing/THEME_PICTURES.md`.
3. `settings.palettePatmos` and `settings.palettePatmosHint` back into the 21
   catalogs from `words.json`, and the ten languages that spell Patmos as
   English does back into `SAME_AS_ENGLISH`
   (`lib/i18n/__tests__/paletteNames.test.ts`).
4. The Plus lines count the reading modes in words, in 21 languages
   (`plus.palettes.title`, `plus.palettes.body`, `plus.active.modes`,
   `premium.plus.readingModes.sub`, and the plan's row in
   `lib/premium/plans.ts`): each number goes up by one.
   `lib/premium/__tests__/plans.test.ts` reads them against the registry, in
   every language, and fails until they agree.
5. The tests that count the looks say how many there are; the unit suite
   names each one that has to follow.
