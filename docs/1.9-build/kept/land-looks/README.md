# The first foot pictures of Forest and Jordan: kept, not shipped

**What they are.** The drawings that stood at the foot of the screen in two
of the Land and sea looks made for 1.9 on 2026-11-10
(`docs/1.9-build/notes/themes-fable.md`, "The third set"): Forest's line of
firs and Jordan's rings on the water. Each was drawn by code. Desert's three
dunes were kept here too until the look itself came out the same day (his
"all recs", 2026-11-13 about 14:29 UTC): they are in
`docs/1.9-build/kept/desert-look/` now, with the rest of that look, so they
are kept once.

**Their date.** Made 2026-11-10, taken out 2026-11-13.

**Why they are here.** The owner's word, 2026-11-13 about 07:57 UTC: "also
honest in. the land and sea all the colors are nice it's just the designs at
the bottom that dont look good and darker colors usually fits purify well
(but the flowers fit the light themes)". So the looks keep their colours,
ids and names, and only the foot changed: Forest stands on a bough of silver
fir and its cone from an old plate, and Jordan has no picture.
The looks had not been released, so no reader ever had these. Nothing made is
deleted (the Vault, his word of 2026-11-09): nothing in `app/`,
`components/`, `lib/` or `public/` loads a file from here.

**What was wrong with them,** as the rework's chat judged them on the export:
the firs were a row of cut-out triangles that reads as clip art; the rings
were a target behind the last lines, nearer a signal icon than water.

## What is in this folder

| File | What it is |
| --- | --- |
| `forest-firs.svg`, `jordan-rings.svg` | The two drawings. They were `public/themes/forest.svg` and `jordan.svg` |
| `forest-2026-11-13.png`, `jordan-2026-11-13.png` | One still of each look as it stood: John 1 on a phone, from the app's own export |
| `land.css` | The two looks' rules, as they stood in `app/globals.css` |
| `words.json` | Each look's one line under its name in the picker, in all 21 languages, as it stood |

The code that draws them is still in `scripts/theme-pictures.mjs`:
`node scripts/theme-pictures.mjs --kept` draws the two again into this
folder, and never into `public/themes/`.

The rework is in `docs/1.9-build/notes/themes-fable.md`, section 65.
