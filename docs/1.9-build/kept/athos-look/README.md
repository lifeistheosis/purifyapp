# The Holy Mountain's first look: kept, not shipped

**What it is.** The Holy Mountain (`athos`) as it was made for 1.9 on
2026-11-10 (`docs/1.9-build/notes/themes-fable.md`, "The third set"): a Purify
Plus reading theme in the Land and sea family, worn over Dark. A navy page (it still is: his word the same day was that the colours are good),
and at the foot of the screen the peak of Athos in silhouette over still
water at dusk, drawn by code.

**Its date.** Made 2026-11-10, reworked 2026-11-13.

**Why it is here.** The owner's word, 2026-11-13 about 07:52 UTC: "remove the
sea theme from the app and the mountain either needs a rework or it gets
removed". Galilee and Patmos came out; for the mountain he chose "Fable
reworks it". The look keeps its id and its name, so no reader's choice
changes; what changed is its picture and the line under its
name. The looks had not been released, so no reader ever had this one.
Nothing made is deleted (the Vault, his word of 2026-11-09), so what it was
is kept in this folder, where the apps and the website do not reach: nothing
in `app/`, `components/`, `lib/` or `public/` loads a file from here.

**What was wrong with it,** as the rework's chat judged it on the export:
the peak was a flat triangle with nothing in it, which read as a stray shape
behind the dock and the cards; a hard bright line (the horizon) crossed
every screen just above the bars; in the picker its small page could not be told from its
neighbours'; and it stood on the sea, which he had just taken out.

## What is in this folder

| File | What it is |
| --- | --- |
| `athos-look-2026-11-13.png` | One still of the look as it stood: John 1 on a phone, from the app's own export |
| `athos-peak.svg` | The look's picture. It was `public/themes/athos.svg` |
| `athos.css` | The look's rules, as they stood in `app/globals.css` |
| `words.json` | Its one line under its name in the picker, in all 21 languages, as it stood |

The code that draws the picture is still in `scripts/theme-pictures.mjs`
(`athosPeak`): `node scripts/theme-pictures.mjs --kept` draws
`athos-peak.svg` again into this folder, and never into `public/themes/`.

The rework is in `docs/1.9-build/notes/themes-fable.md`, section 65.
