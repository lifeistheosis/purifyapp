## How the set was made

`make.mjs` in this folder made every picture and wrote this file and `results.json` (the measured record of each picture). Nothing was drawn by hand and no file outside this folder was changed.

- **The app.** Branch `ccr-07896cf2-bo0afd` at `{{export}}`, one export for all five devices and all 41 pictures: `NEXT_PUBLIC_PLUS_ENFORCED_ANDROID=1 NEXT_PUBLIC_REVENUECAT_ANDROID_KEY=walk npm run build:android`, with the public settings the release workflow passes (`.github/workflows/android-apk.yml`): the website's public database address and public key, read from the live site's own script as `docs/1.9-build/notes/theology-fable.md` records and kept out of git, the site address, and the shop and community switches. The key named `walk` is a stand-in, a word and not a key, as `scripts/mock-journal.mjs` explains. It makes the export lock Plus the way the store builds do, so every screen is the one a new reader meets.
- **Made again, whole.** This set replaces the first one (made at `ae750022` in a plainer design, five of its screens made again by Updates once the app's notes below were mended). It was made in one run from one export, after those mends, in the design he chose on 2026-11-12.
- **The reader.** A new reader with no account and no Plus (`purify:plusFeatures` reads `0` on every screen). `purify:onboarded` and `purify:whatsNewSeen` are set to skip the welcome. The page is told it is the Android shell, where this export sells Plus. Each screen is reached the way the app goes there, and what is tapped is tapped as a finger taps it. Nothing is written into the app's page.
- **The day.** Every screen is taken on Sunday 6 December 2026, 9:30 in New York: St Nicholas the Wonderworker, in the Nativity Fast.
- **The look.** The night palette (the app's Dark), reduced motion on so each still is at rest.
- **The network.** The export is answered the way the phones' shells answer it (`scripts/lib/shell-server.mjs`). The only thing let out is a picture the app itself asks of purifyapp.net (some covers are not in the bundle), as on a phone with signal.
- **The picture.** Each screen stands in one of two ways, turn about through the eight (see "The design" below): upright and whole before a low hill, or as a plain slab turned to one side before a field of rolling lines (on Google Play, where no device is shown, that screen stands upright before the same field). Over it is one line in the house's heading face. The page wears the app's own stylesheet: the night ground from its token, lines in its ink, one soft pool of light. No hardware is drawn, and there are no rays, no side stripe, no sparkle, no pills and no gloss.

To make them again: `npm ci`, the build above, then `node docs/plans/v1.9/store/make.mjs` (about 25 minutes). One device or one screen: `node docs/plans/v1.9/store/make.mjs play-phone`, `node docs/plans/v1.9/store/make.mjs fathers`.

## What the stores ask, as read on 2026-11-12

**Google Play** (Play Console Help, "Add preview assets to showcase your app", support.google.com/googleplay/android-developer/answer/9866151):

- Feature graphic: 1024 by 500, JPEG or 24-bit PNG with no alpha. Keep the focal point toward the centre; no device imagery, no store badges, no words such as "Best", "#1", "Top", "New", "Free".
- Screenshots: JPEG or 24-bit PNG with no alpha, each side from 320 to 3840 px, the long side at most twice the short. Up to eight for each device type, at least two in all. For the larger formats on Play: at least four at 1080 px or more, 9:16 for portrait (1080 by 1920 or larger).
- Tablets and Chromebooks: at least four, between 1080 and 7680 px, 9:16 for portrait.
- The words on a picture take no more than a fifth of it. No ranking, award or price words, no call to action, nothing that dates quickly, no device imagery. Alt text of 140 characters or fewer.

**App Store** (App Store Connect Help, "Screenshot specifications", developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications):

- iPhone 6.9-inch, portrait: 1320 by 2868 (1290 by 2796 and 1260 by 2736 are also taken).
- iPad 13-inch, portrait: 2064 by 2752 (2048 by 2732 is also taken). Required when the app runs on iPad, which Purify does (`TARGETED_DEVICE_FAMILY "1,2"`).
- `.jpeg`, `.jpg` or `.png`, no alpha, one to ten for each device size.
- Apple's page is long and its size tables were read through a summary of the page, so treat these as read once and not twice. They are the sizes App Store Connect names, and it refuses a file of the wrong size at upload, so a mistake cannot ship.

How this set meets them: every file is a 24-bit PNG with no alpha at the exact size in its heading; eight for each device (Play's most; Apple takes up to ten); all portrait; the line takes about a sixth of each picture; no line names a price, a rank or a call to action. No hardware is drawn. On the App Store, four of the eight show the screen as a plain slab turned to the side (`variants/phone-3d/README.md` has why Apple allows a plain slab). On Google Play no device is shown at all: see "Play's two pieces of advice, followed" below.

## Choices made for him

Each is the plan's default where the plan has one. Any of them can be changed and the set made again.

1. **The night palette**, as `docs/launch/STORE-LISTINGS.md` says.
2. **The day, 6 December 2026.** A feast every reader knows, inside the Nativity Fast, so Today shows a saint, a fast and the count to Pascha at once. The day of the shoot itself, 12 November, has St Nilus among its saints, and his picture is on the heritage list.
3. **Eight screens, in one order on every device:** Today, the Greek, the Fathers, the journal, prayers, a saint, the calendar, a Father's work. Eight is the most Play takes. The plan named five; the journal is 1.9's lead, prayers is in the app's own name on Play, and the Bible is two pictures so the Greek and the Fathers each have their own.
4. **The Fathers on Genesis 1:1, St Basil the Great**, and not on John 1. The Fathers who comment first on John 1 are St John Chrysostom and St Augustine, whose pictures are on the heritage list, and St Cyril of Alexandria, whose icon is Cretan and whose rights row names no place it is held. St Basil's picture is the mosaic of St Sophia in Kyiv, and the words in the picture are his own, cited (NPNF II 8).
5. **The reading room is shown as a work opened**, St Athanasius, On the Incarnation (his cover is the icon from Sozopol, in Sofia). The room's own front page shows St Ignatius of Antioch's cover in its first row, a listed picture, and no scroll of it is clear of one on every device.
6. **The saint is St Basil the Great**, and not St John Chrysostom as the plan suggested: St John's picture is listed. St Basil is also the Father of picture 3, so the two pictures answer each other. St Nicholas, the day's saint, was tried first: on the tablets his life shows the three sisters' story at the size of a headline, and the word "prostitution" does not belong in a store picture.
7. **The design is his, chosen through five rounds** ("The design" below). The screen is whole in every picture, and no hardware is drawn in any.
8. **The Android phone's screen is 412 by 846**, the part of a 412 by 915 phone the app draws in, so the whole screen fits a 9:16 picture.
9. **The tablet sizes** are 1440 by 2560 (the app at 600 by 960) and 1800 by 3200 (the app at 800 by 1280), both 9:16.
10. **The iPhone and iPad pictures come from the same export** at Apple's sizes (440 by 956 and 1032 by 1376). The screens are the same web layer in both apps and none of the eight names a store. One export was the spend asked for.
11. **Today's one-question card is dismissed** with its own Dismiss button, as a reader would, so the day's saint, the Nativity star and the verse stand together.
12. **The feature graphic stands on a light ground**, the night as ink upon it: the app's cross, the wordmark as the app sets it (the sans, bold) and the Play listing's short description, word for word, over the front design's hill and its lines. The sky is a silver between white and the night, lighter where the light pools over the crest, and the hill keeps the house's night. It was first made on the night ground; it changed by his word, to follow Play's advice ("Play's two pieces of advice, followed", below).
13. **No line says "free".** The journal is free for everyone in 1.9, but Play asks for no price words on a picture. The listing's text says it.
14. **PNG throughout**, {{size}} in all.

## The design

His word, 2026-11-12, on the first set: "Control the screenshots in themselves, they look good. I kind of want a better design for the back though. Better design for the phone." Five rounds followed, all kept in `variants/` with what he said of each. His word at the end of them, on two pictures he sent back (the upright screen before the hill, and the turned phone before the field): "So in version 2.0, we're gonna work on those variants. But I guess just stick with this for now, where it's like front face, and then some of them are like face to the side."

So this set has two ways a screen stands, and they go turn about so the row in a store has a rhythm:

| Stands | Screens | What it is |
|---|---|---|
| **Front** | 01 Today, 03 the Fathers, 05 prayers, 07 the calendar | The screen upright and whole with a thin dark rim, before a low hill and the line of its crest, fainter lines rising over it, a soft light behind. |
| **Side** | 02 the Greek, 04 the journal, 06 a saint, 08 a Father's work | On the App Store: the phone as a plain slab with real thickness, turned to one side, before rolling lines that gather toward a horizon, a soft light where they meet the sky. On Google Play: the screen upright and whole, as in Front, before that same field (the record calls this `field`). |

The screens with the finest print (the Fathers' words, the calendar's days) stand front, where nothing is drawn in perspective.

### Play's two pieces of advice, followed

The first whole set went against two things Play's page puts under "Highly recommended" (Play Console Help, "Add preview assets to showcase your app", read 2026-11-12). Both were named to him as advice and not rules, and his word was: "Apply the change to 1 and 2."

1. **No device on Play.** The page, for the feature graphic and for screenshots alike: "Avoid inappropriate or repetitive image elements, such as: Device imagery (as this can become obsolete quickly or alienate some users)." So on Play's three device lists the four Side screens are not shown as a slab. They stand upright and whole before the field, which keeps the row's turn-about of two backs. The App Store's pictures keep the slab. In `make.mjs` this is one word on a device (`device: false`).
2. **No dark grey ground on the feature graphic.** The page: "Avoid using pure white, black, or dark gray as these colors can easily blend in with Google Play's background." So the graphic's ground is a silver between the two, with the night as its ink (choice 12).

What the page says of its own weight: "Requirements listed on this page are mandatory; failure to meet requirements may result in removal or suspension from Google Play", and of the rest, "Failure to comply with these guidelines will not impact your store listing page, but may result in changes to how your preview assets appear on Google Play or limit promotional opportunities." So neither was a rule; following both keeps the pictures open to Play's larger formats.

One thing left as it was, named to him: an upright screen keeps its round corners and a thin dark rim, as every Front picture has had from the first set. It is the screen's own outline, with no body and no hardware.

Kept for 2.0, by his word: the eclipse and stars designs (`variants/eclipse/`, eight compositions on the thirds), the lifted piece of the real screen (`variants/round-2/`), and the rest of `variants/`.

Each screen names how it stands in `make.mjs` (`stand: "front"` or `"side"` in SHOTS), and the two looks are one block of that file ("The design"). To make a screen again after a change in the app, no design work is needed: `node docs/plans/v1.9/store/make.mjs calendar`.

## The house's rules, answered

- **Only what is true in 1.9 for the reader it is shown to.** Every screen is free for every reader: Today, the Bible with the Greek beside it and the Fathers' commentary (`plus.crossrefs.keep`: "Every verse, the Greek beside it and the Fathers' commentary stay free"), writing in the journal (`plus.journal.keep`), the prayers, the saints, the calendar and the Fathers' works. No Plus feature is shown in use. The only word of Plus in the set is the app's own Plus button in the bar of Today and Prayers, which is what a reader without Plus sees.
- **Campaigns.** Not shown and not named. `make.mjs` reads the words in view on every screen and fails on one.
- **The heritage list.** `make.mjs` holds every picture in view on every screen (images, backgrounds, masks, posters) against `lib/marketing/heritagePictures.ts` by file name, and fails on one. None is in view in any of the 41. By eye as well, every picture in view was looked up in the rights rows: St Nicholas on Today and the calendar (the Kirillo-Belozersky row, Russia), St Basil (St Sophia, Kyiv), St Athanasius (Sozopol, now Sofia), the Prayers pictures (the Sinai Pantocrator, in Egypt, and icons held in Moscow, Sergiev Posad and Novgorod). None is held in Greece or Italy. `results.json` lists the pictures in view for each file, and any listed picture lower on the same page, out of the picture.
- **No other reader.** No Community, no profile, no reader's words or picture. St Basil's page shows a count of readers who asked for more of his writings, a number and no name.
- **The lines.** Short, in the house voice, sentence case, no em dash. Each reuses words the app or the listing already says: "the day's saint, fast, and appointed readings" and "every feast, every fast" (the listing), "Read with the Fathers" and "the Greek beside it" (the app), "by the Church's day" (the 1.9 note).
- **The look.** Black and white (the feature graphic the same two, the other way up: night ink on a silver ground). One soft pool of light in each picture and nothing else that glows. The hill's lines are arcs of one wide circle, side by side; the field's lines run across and only draw closer toward the horizon. Nothing fans out from a point. checkMock's `rays`, `stripe`, `sparkle`, `gold` and `palette` pass on every picture.
- **checkMock.** `node scripts/mock-check.mjs --self-test` passed on this export first ("every mistake caught, and the house's own parts pass"). Then every final picture was checked as the page it is rendered from, on all five palettes, all fifteen rules. The result for each is in the tables above.
- **Its by-eye list.**
  - *Built from the app's own component, rendered from the export; only the proposed change is new.* Yes: each screen is the export itself, untouched. The only new things are the line above it and what stands round and behind it.
  - *Icons from components/ui/icons. Plus shown with its mark, and never promised to every reader.* No icon was added. Plus appears only as the app's own button.
  - *Sample words plain: no reading of Scripture or of a Father written for the picture.* No word was written for a screen. Every word in a screen is the app's own content. St Basil's words are his, as NPNF prints them.
  - *Existing words first; a new line in the house voice.* See "The lines" above.

## For the arbiter: what checkMock says of the app's own screens

Each screen was also checked as the app's own page (`body`), though this folder may not change the app and a still has nothing to tap. What checkMock names on them now:

{{said}}

What it named on the first run, at `ae750022`, and how each was mended in the app on 2026-11-12 (`docs/1.9-build/PLAN.md`, 13bm; each held there at 390, 800 and 1032 wide, for a new reader and an open one, on the five palettes and the seventeen looks and in Arabic):

- **Words in a line (greek, fathers).** The interlinear's Greek words (`components/bible/VerseRow.tsx`, "Look up ...") and the glossed old words in a Father's text (`components/bible/GlossedText.tsx`, here "let") are buttons set inside a line of text, about 32 px and 24 px tall. They keep the size of the words they are, and each names the 44 px rule's own exception for a word in a sentence, with its reason.
- **The arrow beside "Continue reading" (fathers).** It did not mirror in Arabic: its button was pulled left, not to the start. It is pulled to the start now.
- **The wide calendar (calendar, 10-inch tablet and iPad).** The dots between New and Old, Prev, Today and Next are inked as the links are; the links are 44 to the touch, and the day's reading rows 44 tall; words set left or right are set at the start and the end. Held on the seventeen looks too, a fast's name is drawn toward the page's own ink on Light and the light looks, and three more lines are deeper there.
- **The wide journal (journal, 10-inch tablet and iPad).** The prompt under "Nothing written yet" is 44 to the touch.
- **By eye, Prayers on the 10-inch tablet and the iPad.** The banner showed the Pantocrator from the brow up, without his face. Across a tablet's column it is taller now and cut about his face, the verse over its lower part as on the phone (`play-tablet-10-05-prayers.png`, `appstore-ipad-13-05-prayers.png`).

The pictures show the app as it is. If a wide layout changes before release, `node docs/plans/v1.9/store/make.mjs calendar journal prayers` makes those pictures again.
