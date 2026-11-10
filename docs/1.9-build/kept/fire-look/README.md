# The Fire look: kept, not shipped

**What it is.** Fire was one of the eighteen looks made for 1.9 on 2026-11-10
(`docs/1.9-build/notes/themes-fable.md`, "The third set"): a Purify Plus
reading theme in the Night family, worn over Dark. A black page with warm
ink, flames at the foot of the screen with embers rising and going quiet,
and an ember for the short rule at a chapter's head.

**Its date.** Made and taken out on the same day, 2026-11-10.

**Why it is here.** The owner's word that day, about 17:20 UTC: "also I don't
really like the fire theme", then, of the two ways offered (remove it, or
redesign it): "remove fire". The looks had not been released, so no reader
ever had it. Nothing made is deleted (the Vault, his word of 2026-11-09), so
what Fire was is kept in this folder, where the apps and the website do not
reach: nothing in `app/`, `components/`, `lib/` or `public/` loads a file
from here.

The share-picture style "Fire" (`picture.look.fire`, `lib/share/verseCard.ts`,
which he picked on 2026-10-30) is a different thing and stays in the app.

## What is in this folder

| File | What it is |
| --- | --- |
| `fire-look-2026-11-10.png` | One still of the look as it stood: John 1 on a phone, from the app's own export |
| `fire-room.webp` | The look's picture: the room behind the page, 1080 by 2337. It was `public/themes/fire-room.webp` |
| `fire.css` | The look's rules, as they stood in `app/globals.css` |
| `words.json` | Its one line under its name in the picker, in all 21 languages (`settings.paletteFireHint`) |

Its entry in the registry (`lib/reader/readingModes.ts`, between Dawn and
Incense) was:

```ts
{
  id: "fire",
  label: "Fire",
  blurb: "Flames at the foot of the page, embers rising in the dark",
  labelKey: "picture.look.fire",
  blurbKey: "settings.paletteFireHint",
  family: "night",
  look: "dark",
},
```

Its row in `docs/licensing/THEME_PICTURES.md` was: `fire-room.webp`, Fire,
"Flames at the foot of the page, embers rising and going quiet", painted by
the app's code with no outside image, Purify's own. That page still records
it, under "Kept, not shipped".

The code that paints the picture is still in `scripts/theme-pictures.mjs`:
`node scripts/theme-pictures.mjs --kept` (after `npm run build:android`)
paints `fire-room.webp` again into this folder, and never into
`public/themes/`.

## What a device that stored it wears

Only a tester's device can hold the id `fire`. It reads as Candlelight, the
nearest plain dark palette: black, warm, and Plus as Fire was, so the same
reader is entitled to it (`RETIRED_THEMES` in `lib/reader/readingModes.ts`;
the pre-paint script says the same, so the app opens in Candlelight from the
first paint). The server refuses `fire` as it refuses any unknown palette.
`lib/reader/__tests__/retiredThemes.test.ts` holds all of this, and that the
app offers Fire nowhere.

## If it is ever wanted again

On the owner's word only. In this order:

1. The entry above back into `READING_THEMES`, and `"fire"` into the
   `ReadingTheme` union and into `PREPAINT_LOOKS_DARK`
   (`lib/reader/prepaint.ts`); `fire` out of `RETIRED_THEMES` and
   `PREPAINT_RETIRED`.
2. `fire.css` back into `app/globals.css`, each part in the place its note
   names, and `fire-room.webp` back into `public/themes/` with its row in
   `docs/licensing/THEME_PICTURES.md`.
3. `settings.paletteFireHint` back into the 21 catalogs from `words.json`.
4. The Plus lines count the reading modes in words, in 21 languages
   (`plus.palettes.title`, `plus.palettes.body`, `plus.active.modes`,
   `premium.plus.readingModes.sub`, and the plan's row in
   `lib/premium/plans.ts`): nineteen and seventeen would become twenty and
   eighteen again. `lib/premium/__tests__/plans.test.ts` reads them against
   the registry and fails until they agree.
5. The tests that count the looks say how many there are; the unit suite
   names each one that has to follow.
