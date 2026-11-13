# Purify 1.9: the video

His word, 2026-11-13 about 07:15 UTC: "make me a animated video of v1.9. with buttons that animate and screens that animate and move that has transitions and effects. ensure it showcases new screens, new saints, new books, etc"

One version, made on 2026-11-13 by the two scripts in this folder: vertical, 1080 by 1920, H.264, silent, for a phone feed. The file is not in git (`.promo/v1.9-video/purify-1.9.mp4`, where `.gitignore` keeps what the promo maker makes); it plays on its page, https://claude.ai/artifact/XTc83SKMWZgAd5sMZUvgoA (his, and private until he shares it), with the reason for each scene. `RECORD.md` here is the measured record of the file that was made: its length and size, each scene, each take's pictures and what checkMock said.

## What it is

Every screen in it is the 1.9 app itself, filmed while a finger works it. Nothing of the app's interface is drawn. The buttons' press, the page transitions (the app's View Transitions on the house curve), the sheets rising and a card carrying its picture into its page are the app's own motion at its own speed. Around the screens the video adds four things only: the ground, the words, the picture moving in and out, and a soft round where the finger is.

- **The app.** The native export of branch `ccr-07896cf2-bo0afd` at `04b7036a4`, cut as the store pictures' was (`../store/README.md`): `NEXT_PUBLIC_PLUS_ENFORCED_ANDROID=1 NEXT_PUBLIC_REVENUECAT_ANDROID_KEY=walk npm run build:android` with the public settings the release workflow passes. The website's public database key was read from the live site's own script into that one command and written nowhere.
- **The reader.** A new reader with no account and no Plus (in the campaigns' take, the stand-in's signed-in sample reader, also with no Plus) (`purify:plusFeatures` reads `0` at the end of every take, or the take fails). The welcome is skipped as the store pictures skip it, and Today's one-question card is put away with its own Dismiss button before the film rolls.
- **The day.** Sunday 6 December 2026, 9:30 in New York, the store pictures' own day: St Nicholas, in the Nativity Fast, so Today shows the fast's night.
- **The look.** The app's Dark. The ground is the store pictures' front look, which he chose for 1.9: the night, a low hill and the line of its crest, one soft pool of light. No parchment, no rays, no side stripe, no sparkle, no pills, no hardware.
- **The type.** The app's own faces out of the export: DM Serif Display for the title, DM Sans for the small line.
- **The words.** None is written for the video. Each is read, when the video is made, from the drop (`../drop.json`), from the store pictures' lines (`../store/results.json`) or from the app's own labels. `scenes.mjs` only says where a title breaks, and `compose.mjs` refuses lines that do not join back into the words they came from, a word on the drop's never list, a dash in place of words, and "free" outside the drop's own two sentences.
- **Prayer campaigns, at his word** (2026-11-13 about 07:21 UTC: "add the prayer campaigns to the video"). They are shown as 1.9 builds them: the board, a campaign's page, and joining one. The website still answers closed, so that take is answered by the stand-in the campaigns' own walk uses (`scripts/mock-campaigns.mjs`, read as it stands by `campaignStandIn` in `lib.mjs`): its sample campaigns in plain words, with its "today" set to the film's day. Production is never asked. The prayer on the page is the app's own. No campaign picture and nothing to add one with is in view (pictures come in 1.9.1), and that take fails if one is named. The scene's words are the app's own labels, "Pray together" and "Prayer campaigns"; the drop does not name campaigns until they open, so `scenes.mjs` says by whose word the scene may (`byHisWord`). **The video can be posted only once campaigns are open to every reader** (release day's step 3, `lib/campaigns/flags.ts`).
- **Not in it.** Outside that one take, a take fails if a campaign is named in view. No picture on the heritage list (`lib/marketing/heritagePictures.ts`) is in any frame: what is in view is read several times a second all through each take, and a take fails if one passes. No other reader, no Community wall, no profile. No Plus feature is shown in use: Study is the sheet as a reader with no Plus meets it, each Plus part under the app's own mark, and in Reading mode only a free look is chosen. No Land and sea look is in the picture: Galilee and Patmos are leaving the app and the others' pictures are being reworked (the arbiter, 2026-11-13), so the Reading mode scene stays on the free looks and the Night row.
- **Sound.** None. The file has no sound stream. He sets his own.

## How it is made

`lib.mjs` opens the app and films it; `record.mjs` holds the takes; `scenes.mjs` is the cut (which moment of which take, the words, where the picture stands, and why); `compose.mjs` draws every frame and writes the file; `page.mjs` writes the page he sees it on.

**Filming.** The browser's own screencast, which is what Playwright's video is made from, kept picture by picture instead of squeezed into a video file. Its pictures are one pixel to one of the screen's, so the camera's browser is given a screen of two and a half device pixels to one (`--force-device-scale-factor`): each picture is then 1030 by 2115 for a phone of 412 by 846, sharp enough to stand close on a 1080 video. The browser hands over about eighteen such pictures a second. To hold a quarter-second page transition in more than five of them, the app's clock runs six times slower while it is filmed (its timers, its animation frames, its animations and transitions together) and the film is played back six times faster: over a hundred pictures for each second of the app's own time. What is seen is the app's own motion at its own speed.

Three things were learned on the way and are held in `lib.mjs` so they are not learned twice. A pull has to leave the browser's touch slop at once, or the slowed clock lets the browser's own long-press through (the first verse take opened a verse's tools under a pull). A hold is timed so the browser's half second ends where half a second of the app's time ends. And a picture must not be asked for at a scale (a screenshot with a clip): that interrupts a scroll under the finger, and the page travels about three fifths as far as the finger does.

**The finger.** Taps, a hold and pulls are sent as touches on the glass (`Input.dispatchTouchEvent`), never as a script inside the page. A tap stays down 130 ms so a button's own press is seen. A pull eases to a stop so nothing is flung. Where a take goes somewhere before the film rolls (to a saint's page, to a chapter), it goes by the app's own router, as the store pictures do.

**Composing.** One page, 1080 by 1920, wearing the app's own stylesheet: its palette tokens, its faces, and every move on `--ease-house`. `compose.mjs` sets the page to each sixtieth of a second in turn, takes it, and ffmpeg writes the frames as H.264 in two passes to a size under 15 MB.

## Making it again

```
npm ci
# the export, as ../store/README.md says (it needs the website's public database address and key)
node docs/plans/v1.9/video/record.mjs            # the ten takes, about 12 minutes
node docs/plans/v1.9/video/compose.mjs --check   # checkMock on each scene's words
node docs/plans/v1.9/video/compose.mjs --sheet   # one still a scene, to look at
node docs/plans/v1.9/video/compose.mjs           # every frame, then the file
node docs/plans/v1.9/video/page.mjs --artifact=<file.html> --video=<address> --poster=<address>   # the page, and RECORD.md
```

One take again: `node docs/plans/v1.9/video/record.mjs journal`. A take without film, with a still at each look: `--dry`. One scene's moments side by side: `compose.mjs --sheet 6 --scene journal`. To change the cut (a scene's length, where the picture stands, where a title breaks), change `scenes.mjs`; nothing else needs touching. To change a word, change the drop.

## The house's rules, answered

- **Real screens only.** Every screen is the export, filmed. The only thing drawn over a screen is the soft round where the finger is.
- **Only what is true in 1.9 for the reader it is shown to.** Each scene's words are the drop's or the store pictures', which were held to the note. Plus is named where a scene is about Plus ("Study a verse, in Purify Plus") and is marked on the screen by the app.
- **The heritage list.** Read all through every take, by file name, and by eye on the stills. The cut avoids three screens a reader would expect because each shows a listed picture: the reading room's front page (St Ignatius's cover), the councils' list (the First Council's cover) and St Andrew's web (the Apostle Bartholomew). St Athanasius's writings, the Creed line by line and St Amphilochius's web stand in for them.
- **Campaigns.** Shown at his word, as 1.9 builds them, from the walks' own stand-in, with no picture; and the video waits for campaigns to open before it is posted.
- **No parchment, and phone first.** The ground is the night. The title is 84 px on a 1080 picture, about 30 on a phone; the screens stand close enough that the app's own words can be read in a feed.
- **No rays, no side stripe, no sparkle, no pills.** The light is one soft pool. checkMock's rules pass on each scene's page (`RECORD.md`).
- **Every design is justified.** `scenes.mjs` carries a reason for each scene, and the page prints them under "Why it looks this way".
- **One version.** No variants were made, so nothing goes to the Vault. The stills taken while it was cut are working files in `.promo/` and are not kept.

The page is published from a copy `page.mjs` writes outside the repository, with the video and one still in the page's own asset store. Under the video it has one button, Save the video, which hands him the file itself (the page's `downloads` capability; it shows only where the view can save, and nothing is saved unless he says yes). A new session that has to change the page builds the copy again and publishes it to the same address.
