# The 1.9 film: the five second sample

His words (`docs/1.9-build/BRAINSTORM.md`, 2026-11-13). On the first cut, about 16:40 UTC: "not bad it's looks good but I wanted it to be more animated (I.e button move onto the screen and the actual cards move on the app and fit into place and it transitions to each screen etc)". At about 18:53 UTC, "all recs": his yes to a five second sample of the new motion now, and the whole film only once the 1.9 screens are final.

This folder is that sample: one version, one render, five seconds, 1080 by 1920, H.264, silent, like the first cut. The file is not in git (`.promo/v1.9-video/sample/purify-1.9-sample.mp4`); it plays on its page, https://claude.ai/artifact/2c2fUbeTFjCMYduQQQ7zBs (his, and private until he shares it), with one still and the reason for each choice. `RECORD.md` is the measured record. It waits for his yes or no.

**It shows the motion, not Today's final look.** Today may change with the fifteen screens' redesign. When it does, only `PIECES` in `cut.mjs` changes.

## What it is

Today is built on the screen by its own cards and buttons, then one tap opens the next screen.

- **Every piece is the app's own element.** The app is opened as the first cut opens it (`../lib.mjs`): the native export, a new reader with no Plus, Dark, Sunday 6 December 2026. Today loads whole. Then `take.mjs` finds each piece in the app's own page (the top bar and its three buttons, the day's line, St Nicholas's picture and name, the two buttons, the streak and its seven days, the Nativity Fast card, the verse of the day, the tab bar and its five tabs), holds it just outside the screen, rolls the film on the bare screen, and lets the pieces go in turn. Nothing is drawn and nothing is copied: the element that moves is the element a reader taps.
- **The app's layout is never touched.** A piece is moved with `translate` and `scale`, which leave every other element where it is, so each comes to rest exactly where the app put it. The take fails unless Today reads word for word after the build as it did before.
- **The motion is the house's.** Every piece travels on `--ease-house`, read from the app's stylesheet when the take is made. Things settle. Nothing bounces, overshoots or spins.
- **The change of screen is the app's.** A finger taps Hymns of the feast (a touch on the glass, as in the first cut) and the app opens St Nicholas's page by its own View Transition and that page's own opening. His page is opened once before the film and left, as on a phone that has shown it before, so the film does not wait on the network for his picture.
- **The ground and the words are the first cut's.** The night, the store pictures' hill, one soft pool of light, and the store pictures' line for Today. So the only new thing to judge is the motion.

What the film adds is the order and the travel of the pieces, the ground, the words and the soft round where the finger is. The pieces, where they rest, and everything after the tap are the app's.

## Making it again

```
npm ci
node scripts/gate/export.mjs --platform android          # the export, as the gate cuts it
node docs/plans/v1.9/video/sample/take.mjs               # the one take, about a minute (--dry: stills, no film)
node docs/plans/v1.9/video/sample/compose.mjs --check    # checkMock at four moments
node docs/plans/v1.9/video/sample/compose.mjs --sheet    # moments side by side, to look at
node docs/plans/v1.9/video/sample/compose.mjs            # the 300 frames, then the file
node docs/plans/v1.9/video/sample/page.mjs --artifact=<file.html> --video=<address> --still=<address>   # the page, and RECORD.md
```

`cut.mjs` is the cut: the length, the tap, where the picture stands, and each piece with the side it comes from, when, for how long and why. `compose.mjs` is the first cut's stage kept to one scene (that script runs when imported, so its page is written out again here). The page is published from a copy outside the repository, with the video and the still in the page's own asset store; a new session that has to change it builds the copy again and publishes to the same address.

## The house's rules, answered

- **Real screens only.** Every piece is the export's own element; the only thing drawn over the screen is the finger's round.
- **The heritage list.** Read all through the take by file name; the take fails if one passes. In view: St Nicholas's two pictures, neither on the list.
- **No campaign named** in view; the take fails if one is. **Plus** is the app's own button in Today's top bar as a reader with no Plus sees it; nothing of Plus is shown in use or promised.
- **No parchment, phone first.** The ground is the night; the page passes the kit's check at 360, 390, 412 and 1032 on five palettes.
- **No rays, no side stripe, no sparkle, no pills, no em dash.** checkMock passes on the film's page at four moments (`RECORD.md`).
- **Every design is justified.** `cut.mjs` carries a reason for each piece, and the page prints them with the reason for each choice.
- **One version, one render.** No variants were made, so nothing goes to the Vault. Stills taken while it was cut are working files in `.promo/`.

## For the whole film

If he says yes, each screen of the whole film gets its own `PIECES` list and its own tap, and the film is made only once the 1.9 screens are final. That is a longer render and is asked of the arbiter first.
