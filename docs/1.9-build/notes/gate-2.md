# Gate 2.0: motion on, floating layers, the page's edge, transitions

Made on 2026-11-13 by Gate 2.0 (session_01VuYTwcBsPfuad62m3fX53p), at the arbiter's word, after his walk of build 95 (`build-95.md`). The pre-build gate had passed; then on his phone Discover's search opened with a glitch and not smoothly (note 5), and the Bible's "Highlighted" toast stood over another floating bar (note 7). His word that night: "after all of these checks and all this time".

## Why the gate missed them

- **No walk looked at a screen while it moved.** The guardrail walk (part 2) reads each screen at rest through checkMock, which stills every transition while it measures. The tap walk judges where things stand at fixed moments after a tap (twelve looks 60ms apart, then the screen at rest); only a saint's web was followed frame by frame. Note 5 lives in the 70ms between the tap and the search's first words.
- **No walk measured two floating layers against each other.** The tap walk's "covered" asks only what the finger meets at a control's middle; checkMock judges each piece alone.
- **No walk made a gesture.** Note 7 needs a double tap on a verse; the walks tap controls.
- **No walk measured a page's sideways spill** (the re-check's report, 2026-11-13).

## Where the walks turned motion off

Found on 2026-11-13, said in `scripts/gate/motion.mjs`:

- **checkMock** (`scripts/mock-check.mjs`, the still before its measure) sets `transition: none` and turns off scroll-driven entrances on every element while it reads a screen's colours, and puts them back after. The guardrail walk, the stripe walk, the sheet looks and the tap walk's sheet measure read their screens through it: a screen at rest, on purpose, which is why none of them saw a transition. Kept: a colour is read where it ends.
- **The words-on-pictures pass, the painted-ground check and the pixel audit** still transitions the same way while they read pixels. Kept, for the same reason.
- **Eight feature walks** (asked-again, faith-answers, learn, legal-sheet, plus-intro, plus-order, questions-top, reminders) ask the browser for reduced motion. On a phone the app's own switch ignores that question (`lib/ui/motionPreference.ts`), but the parts that read it directly (`lib/ui/motion.ts` osPrefersReducedMotion: the selection tools, the skeletons, the gift box, the prayer slideshow) go still there. Not changed here: each is its owner's walk, named for the arbiter to route.
- **export-walk.mjs** sets `purify.motion` off for ten of its walks, on purpose: each a check of the still path.
- **No walk pinned the app's motion.** On a phone the app samples its own frames four seconds after it opens and goes still on a device it judges slow (`lib/ui/deviceSpeed.ts`). In this container, three lanes at once, it judged the walks' phone "ok" every time (15 screens, 2026-11-13), so the walks saw motion; but nothing held it there, and the self-test plants a slow phone that the app turns still with no walk noticing.

Now every gate walk pins it and asserts it on every screen (`scripts/lib/motion.mjs`): the tap walk, the guardrail walk, the stripe walk, the eight gate probes and the motion walk. A screen whose motion is not what the walk asked for is not walked, and says why.

## The four checks

Each is a file in `scripts/gate/` with a self-test that fails on planted cases and passes the house's own; the measures run in the page (`scripts/gate/inpage.mjs`).

1. **Motion on** (`scripts/lib/motion.mjs`, `scripts/gate/motion.mjs`). `pinMotion` gives the device the verdict "ok" (on) or "slow" (the still path), taken just now, so the app neither samples nor changes its mind during a walk; `assertMotion` reads `<html data-motion>`, the browser's own question, and any measure's stilling left behind. Self-test, on the export: 5 cases (a phone left to judge itself while its frames are slow goes still and fails; the pin holds through the same slow frames; a stilling left behind fails; the still path passes the reduced pass and fails a walk that asked for motion).
2. **Floating layers** (`scripts/gate/layers.mjs`). While two floating layers are on the screen (any fixed box, a stuck sticky one, the top layer, a popover placed absolutely), their drawn boxes must not meet. A layer is what it paints, each piece clipped as the screen clips it: a full-width wrapper that draws nothing is not counted, its pill is. A layer covering most of the screen is a ground; only what is in front of it is compared. Two layers meet where a reader sees one drawn over the other: not where a piece is wholly hidden behind an opaque box, nor where a piece sits wholly on another layer's bare ground over none of its words, pictures or controls. Self-test: 14 cases (note 7's shape fails; so do a sheet over part of the tab bar, a header stuck half under the top bar, a menu over the tab bar, a toast rising through a bar in passing; the bar stepped aside, two stacked with their own space, two that only touch, a modal sheet with its scrim, a sheet covering the tab bar wholly, a sheet's own footer, a header stuck below the top bar, a fade tucked behind the tab bar and a line on the top bar's bare ground pass).
3. **The page's edge** (`scripts/gate/page-edge.mjs`). What a reader reads or touches (words, a picture, a field, a control, a box that paints), where the boxes it sits in leave it drawn, must stand inside the width asked for, never innerWidth. A row that scrolls sideways carries what is past its end (the row itself is measured); a band or picture past both edges is a bleed; a fixed box is measured against the height too, and a sheet resting at its half rest carries what is past its foot. If the browser widened the page to fit a spill (innerWidth past the width asked for), that is said once with its cause. Words are clipped by their own box first (a title cut to one line with its ellipsis ends where its box ends). Self-test: 18 cases, in a page that clips as the apps do (html and body, `overflow-x: clip`) and in one that does not (where innerWidth grew to 536).
4. **Transitions** (`scripts/gate/frames.mjs`). A tap's change is recorded frame by frame: the screen's own frames (the DevTools screencast, one picture for each frame that changed) and, from inside the page, each frame's running animations (a View Transition's included), inline styles a script changes frame by frame, layout shifts and new boxes. It fails:
   - a **cut**: half the change in one frame, outside reduced motion, for a change over 8% of the screen, by two measures that must agree: the share of the way from the screen before to the screen after (by distance), and the share of the way along a fade through the ground (before at whole, the ground, after at whole);
   - a **blank**: frames with nothing drawn where the screen changes (each frame fitted as a share of the screen before plus a share of the screen after, under 35% together, and almost none of the changing region inked: under a seventh of what the lighter screen inks there, 3% at the least), between two screens that draw there, for more than a fifth of a second. A cross-fade's middle, two pages at half, shows about all of them; a page whose picture has come while its words follow is not empty; an empty reading area under the bars is;
   - a **flash**: something drawn for a frame or two and gone, judged only in frames where nothing travels (no animation of position, no View Transition, no script moving a box, no scroll);
   - a box **misplaced**: drawn first far from where it stands, with nothing moving it there;
   - a **jump**: a layout shift of 24px or more in one frame, of a box that had a size before;
   - with motion reduced, anything that **moves**.

   A step across a gap in the frames is "unsure", recorded again, never a pass. A short dip at the foot of a fade out and in (the house's own switch is empty for 50ms at the most) is listed for the eye. Self-test: 14 cases. In the walk, a card that opens a page showing its picture fails when no View Transition carried the picture (CLAUDE.md: "a card that opens its own page carries its picture into it"); a picture the page it opens does not show leaves with its page, as app/globals.css's own rule says. A tap the screen first answered after 350ms is listed for the eye.

   **Calibrated on the first full run (2026-11-13, 09:11 to 10:24 UTC, build 95's code).** That run reported 666 groups for the new reader, 335 of them "blank" and 101 "cut", far more than the screens show. Frame by frame on nine switches (`gate-2/calibration.md`), three rules were failing the house's own design: (1) "the screen emptied at once" failed the designed exit, which takes the page being left from whole to a fifth in one frame on purpose (app/globals.css: "The page being left is all but gone before the next one shows"); note 5 differs in kind, the screen before went to nothing in one frame, and the cut measure catches that alone; (2) the distance measure counted that same first frame as half the change whenever the page left drew much more than the page arriving, hence the second measure along the fade; (3) a frame was "blank" by the fit alone, which misreads a sheet in the middle of its rise and a page whose picture has come before its words, hence the ink. The card rule asked only whether a card had a picture; it now asks whether the page it opens shows it. "Misplaced" now counts only a box a reader could see (on the screen first or after), the outermost of what moved together: Discover's feed settling 3,000px below the screen gave 380 lines. And a blank's still now shows the emptiest frame of its run, not its first. Every self-test passes on the final code, and on build 95 notes 5 and 7 still fail (below). The run reported in the next section is on the branch's tip with the calibrated checks.

**The walk** is `scripts/motion-walk.mjs`: on each screen the page switch into it, the layers and the edge at its top, middle and end, a double tap and a hold on a verse or a Father's paragraph already on the screen (a walk's own scroll after the first touch is a reader's, and the reader puts its bars away for it), and every control (up to 30) tapped with real touch from the screen as it first stood, recorded, with the layers measured twice on the way (a crossing in passing is listed for the eye) and once at rest (a meeting there fails). The bars' own controls are walked on the first three screens they are met on. `--reduced` is the shorter still-path pass (six controls a screen). `--self-test` runs the four self-tests in turn.

Shared with the tap walk: `scripts/lib/tap.mjs` (markControls, the first touch, reach, the aim, the tap, the screen as it first stood), moved out of `scripts/tap-walk.mjs` unchanged; the tap walk's 35-case self-test passes on it. `scripts/lib/main-web.mjs`: the GET-only reader of the main web.

## The proof on the old code

**The export:** `npm run build:android` of `6193982d5` (build 95's code), cut 07:41 to 07:43 UTC, 6,473 pages, selling (`NEXT_PUBLIC_PLUS_ENFORCED_ANDROID=1` with `NEXT_PUBLIC_REVENUECAT_ANDROID_KEY=walk`). The switches stood in their release-day order: CAMPAIGNS_OPENING "testers", PICTURES_IN_STORE_BUILDS false, CAMPAIGN_NOTICES true, JULY_GROUPS_GO true, CARE_NOTE_SEND true. The main web's public key was read from purifyapp.net's own scripts into the export command alone (his standing word, "yes key always"), checked to be the anon role of the main web's project, and printed and written nowhere.

- **Note 5 fails:** Discover, `button "Search Purify"`: a cut, 71% of the change in one frame (about 150ms after the tap): the screen before is gone whole in one frame (the first frame after the tap draws 0.3% of the screen, between Discover's 29% and the search's 9%), and the search fades in after. The bar's own Search magnifier fails the same way (68%). The first proof also failed it as "blank, emptied at once"; that rule is retired (it failed the house's own switch), and with the calibrated checks note 5 fails as the cut it is (re-walked 10:36 to 10:41 UTC). Still: `gate-2/note-5.jpg` (before, the first frame after the tap, the next, at rest).
- **Note 7 fails:** John 1 (and John 3 in the re-walk), a double tap on a verse already on the screen: the toast `div[data-undo-bar] "Highlighted Undo"` is drawn over the reader's pill `div[data-reader-pill] "Chapter switcher"`, 364 by 59px at 13,699, its rounded edge and white Listen button above the toast. Still: `gate-2/note-7.jpg`.

## The gate's export was not the store's (the arbiter's item, 08:11 UTC)

Found by the Fable fresh-eyes chat, routed here ahead of the run: the store workflows hardcode `NEXT_PUBLIC_SHOP_ENABLED: "1"` and `NEXT_PUBLIC_COMMUNITY_ENABLED: "1"` (`.github/workflows/android-apk.yml` and `ios-release.yml` both), while the gate's recorded recipe (`gate-run-1.md`, `scripts/lib/sells-plus.mjs`) set only the two Plus values.

**Proved, against the gate's own environment** (2026-11-13, 08:50 to 08:55 UTC). On the export cut the gate's recorded way (`6193982d5`), every page of the shop is Next's 404 (each `index.txt` carries `NEXT_HTTP_ERROR_FALLBACK;404`; /shop/ draws "This page is not in our index.", 981px), and Discover has no Shop door. On the same commit cut with the store's switches, /shop/ is the shop inside the app ("Icons for the life of prayer.", 1,481px with no network), and Discover carries a Shop door to `/shop/` in the app. So in 1.9's gate the shop inside the app was walked as six 404 pages, and Discover without its door.

**Now:** the gate's export is `node scripts/gate/export.mjs`. It reads the store workflow's own export step at run time (`scripts/lib/store-switches.mjs`), takes every value the workflow writes as written, and for each value the store reads from a secret uses a named stand-in, said with its reason as it cuts:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`: the main web's own public values, read from purifyapp.net's scripts (his standing word).
- `NEXT_PUBLIC_SITE_URL`: https://purifyapp.net.
- `NEXT_PUBLIC_PLUS_ENFORCED_ANDROID` "1" and `NEXT_PUBLIC_REVENUECAT_ANDROID_KEY` "walk": the release position, with a stand-in key (the selling export as before). `NEXT_PUBLIC_PLUS_ENFORCED_NATIVE`, its legacy name: unset.
- `NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID`: unset (the walks are signed out).
- **The two the gate cannot match:** `NEXT_PUBLIC_CAMPAIGNS_ENABLED`, which the app no longer reads at all (campaigns follow the constant in `lib/campaigns/flags.ts`): unset. `NEXT_PUBLIC_EIKON_BOX_ENABLED`, which `lib/eikonBox/flags.ts` does read: unset, its safe default (the member screens say opening soon). If the store's secret is 1, the EIKON Box's member screens are not gated: its value is his to say.

A secret the gate has not named refuses the export. `lib/build/__tests__/gateSwitches.test.ts` fails when the gate's switches and either store workflow's disagree (proved on a planted iPhone shop switched off, and on a planted unnamed secret). The tap walk, the guardrail walk and the motion walk refuse an export whose shop is a 404 while the store's is open (`checkStoreExport`).

**Which is wrong, the comment or the switches:** the comment. `android-apk.yml` says the Shop tile "opens the website in the system browser; the /shop route tree itself stays web-only". The build says otherwise: `scripts/native-build.mjs` records that "the shop (EIKON marketplace) now ships in the app" and sets aside only `shop/seller`, and Discover's door is an in-app link to `/shop` (`components/mobile/DiscoverMobile.tsx`). The switches do what the build is made to do; the comment is stale. Whether the shop belongs inside the app is his call; neither is changed here.

## The run over the 128 screens at 390, both readers

**On the branch's tip, with the calibrated checks.** A first full run on build 95's code (09:11 to 10:24 UTC) is what showed the checks failing the house's own switch; it is not reported (the calibration above). The run reported here is on `70043ef22`, the branch tip at 10:45 UTC, cut with the store's switches (`scripts/gate/export.mjs`, 6,473 pages), both readers in their own lanes, two workers each, reading the main web: the new reader 10:49 to 12:01 UTC (128 screens, 1,373 taps), the open reader 10:51 to 12:02 UTC (128 screens, 1,365 taps); no screen left unwalked, two steps unsure. Then the still-path pass, 12:04 to 12:22 UTC (524 taps). The full lists, each finding with who saw it, its screens, its files and a still: `gate-2/run-tip.md` (412 findings, both readers merged; stills in `gate-2/tip/`) and `gate-2/run-tip-reduced.md` (92; `gate-2/tip-reduced/`).

**Notes 5 and 7 pass on the tip** (mended since build 95: `8f03f670`, `33b3d951`): the search opens from Today and from Discover with no cut, for both readers, and a double tap on a verse leaves the Highlighted toast over nothing.

### By cause, in the brief's scope (page switches and sheets)

1. **A page switch leaves the screen empty for a quarter to a third of a second.** 135 page switches pass through frames with nothing drawn where the page changes for more than a fifth of a second; 104 of them for 200 to 400ms. The cause, proved: `app/globals.css`, `.route-fade .cascade > *` sets `--cascade-start: var(--duration-route-enter)`, so a page's content waits 260ms after the switch before it starts to fade in, and `.route-fade :is(.page-open-title, ...)` (its words at 500ms) and `.route-fade .saint-head-in` do the same. The rule's own comment says why: "Waiting one `--duration-base` makes it fade, THEN cascade", written for the section fade before page switches had View Transitions. Now the page being left is gone by about 50ms, so the page arriving stands empty until its content starts. Recorded on the tip as it is, then with only those three start values set to zero: Discover to Saints 276ms empty, then a 74ms dip; Bible to Genesis 344ms, then 109ms; Apologetics to On atheism 370ms, then 116ms; the Discover tab from About 291ms, then 60ms: all four pass with the one change. The arbiter's first positive is this case. Sheets: `gate-2/cause-discover-saints-as-it-is.jpg`, `gate-2/cause-discover-saints-delay-zero.jpg`.
2. **A Bible chapter waits on something more.** With the delay at zero a chapter switch is still empty for 247ms (506ms as it is): a second wait on `app/(app)/bible/[book]/[chapter]/page.tsx`. 30 chapter switches in the run, 213 to 576ms.
3. **A page that fetches what it shows draws nothing while it waits**, then appears: a Father's work up to 1.4 seconds (`app/(app)/saints/[slug]/[work]/page.tsx`), a shop item up to 1.9 seconds and then the whole page in one frame (`app/(app)/shop/icons/detail/page.tsx`), Community 0.65 to 0.8 seconds (`app/(app)/community/page.tsx`). 18 switches over 600ms.
4. **A page that pops in at once** after its wait, half the change in one frame (14): the calendar from Today (on 11 of its screens), Sign in, Privacy, Fasting, a chant's page, two Fathers' works, a walkthrough, the shop item, midday prayers, a topic.
5. **The page jumps as it arrives** (42), in clusters:
   - the route's own box snaps up 51px a moment after arriving (`div[data-carried=forward]`, `components/layout/AppFrame.tsx`): five chants, the Theotokos, back to the Bible;
   - the council reader jumps 270px when it opens at a canon (`components/councils/CouncilReader.tsx`; five ways in);
   - on a chapter, the reader's pill rises 76px after the chapter arrives (`components/bible/MobileChapterPill.tsx`), its Listen button moves 48px sideways (`components/bible/ReadAloud.tsx`) and the verse count 25px (`components/bible/ChapterVerseStatus.tsx`);
   - Community's head grows 84px as the feed loads (`app/(app)/community/page.tsx`, six ways in), and its first post is drawn 80px from its place (misplaced, five);
   - lists that load and push the page: Reading plans 354 to 360px, Export 362px, Settings' "Your space" 131px, Today's prayer's fasting line 198px, the shop 153px, a shop category's row 170px sideways.
6. **A card's picture not carried** (30 cards, each opening a page that shows the same picture, with no View Transition carrying it): the theology path's nine plates (`components/theology/PathPlates.tsx`, into `app/(app)/theology/path/[subject]/page.tsx`), the seven councils from the theology library and the councils list (`components/theology/TheologyLibrary.tsx`, into `app/(app)/councils/[slug]/page.tsx`), saints from the theology hub (`components/theology/TheologyHub.tsx`), the shop's cards and the EIKON door.
7. **Sheets:** the Terms sheet rises empty ("Loading...") for about a quarter of a second before its words (`components/legal/LegalLink.tsx`); the Purify profile card snaps 240px taller at once when its rows arrive (`components/community/profile/ProfileViewer.tsx`).
8. **Layers that meet** (3): on the theology path the top bar is drawn over its step room, as the path opens and at rest (`components/nav/MobileTopBar.tsx` over `app/(app)/theology/path/[subject]/page.tsx`, 373 by 46px, the Back button over the step's words); on Alaska's mission at rest, the thread map over the parts bar (`components/history/EventThread.tsx` over `components/history/EventPartsNav.tsx`, 348 by 65px, the open reader).
9. **The page's edge** (1): on the Philokalia's page a source note carries a bare Wikisource address that cannot break, and its line runs 846px past the screen (`components/history/EventArticle.tsx:190`: the note has no break for a long word). 27 addresses of 60 characters or more stand in 12 files of `data/history/`, each a line off the screen on the same rule. A second edge finding, Chalcedon's related title, was the measure's own fault (the title is cut to one line with its ellipsis by its own box); withdrawn, the measure mended, a self-test case added.
10. **With motion reduced** (the still pass): the heads of Prayers and You still slide in (800 and 600ms): the still rule `:where([data-motion="reduce"]) .prayers-hero-in` counts one class and the entrance `.prayers-hero-verse.prayers-hero-in` two, so the entrance wins (`app/globals.css` 1951 to 1960, You's at 3331 to 3340, on the tip). Also the cart drawer slides in (300ms), the Plus and Pro buttons scale on a press (150ms), and the chevrons of the questions and of What's new turn (200ms). One shop item's "transform over 0ms" did not happen again when measured alone: unsure.

### For a ruling, not failed

- **In the page** (a tap that changes the screen without leaving it, and not a sheet): 60 cuts (a question opening, the history tabs, the saints' century filters, Settings' choices, the reading pager's Next and its parts, replies, the gathering's steps), 94 jumps (mostly a part opening and pushing what is below it), 9 misplaced, 8 flashes. The owner's rule names page switches; the brief names page switches and sheets. Listed in `run-tip.md`.
- **For the eye:** 21 crossings of two layers in passing; 137 and 140 slow answers; 649 and 647 dips (the house's own switch is one).

### The arbiter's three known positives, on the tip

1. **Discover to Saints:** caught, blank 276ms: cause 1 above. The Discover card's picture is not on /saints/, so by the house's own rule it leaves with its page and is not a "carried" fail; whether that door should carry its picture into a head on /saints/ is a design ruling.
2. **"Pray with chant?"** As measured on build 95: a single floating layer over the prayer's words, 3px above the tab bar, so not a meeting of two layers. Still: `gate-2/positive-2-chant-card.jpg`.
3. **A council's plate:** as before, a ruling (below). Still: `gate-2/positive-3-council-door.jpg`.

## Rulings asked of the arbiter

1. **Meetings in passing** are listed for the eye, not failed: the house's sheets rise as the bars behind them sink (app/globals.css, "What stands behind a sheet"), and the two cross in the frames between. A meeting still there at rest fails (note 7's). One line makes passing meetings fail, if that is the ruling.
2. **Dips** of a fifth of a second or less (the house's own switch is empty for 50ms at the most) are listed, not failed.
3. **Slow answers** (nothing on the screen moved for more than 350ms after a tap that changes page) are listed, not failed.
4. **The EIKON Box's secret** (`NEXT_PUBLIC_EIKON_BOX_ENABLED`): the gate walks it dark. Its store value is his to say.
5. **A council's plate** (positive 3): whether a cover-shaped box with only its ground counts as an empty picture.
6. **In-page changes:** whether a question opening, a tab, a filter or a pager's Next must move too, or only page switches and sheets (as the brief says).
7. **Discover's doors:** whether a door whose picture its page does not show must still carry it in (a head on the page it opens).

## How to run it

```
node scripts/gate/export.mjs [--cwd <checkout>]      (the gate's export: the store's switches, the main web's public key)
node scripts/motion-walk.mjs --self-test <out dir>   (the four checks' self-tests)
SELLS_PLUS=1 NODE_USE_ENV_PROXY=1 node scripts/motion-walk.mjs <out dir> --workers 2 --online --json new.json --shots shots-new
NODE_USE_ENV_PROXY=1 node scripts/motion-walk.mjs <out dir> --workers 2 --online --json open.json --shots shots-open
SELLS_PLUS=1 NODE_USE_ENV_PROXY=1 node scripts/motion-walk.mjs <out dir> --reduced --workers 3 --online --json reduced.json
```

Start each reader's walk in its own command (a pair joined with `&` in one command ran only its first here). Keep the machine otherwise quiet while they run: the transitions are timed, and a build or a test suite alongside slows the pages it times.

Timings in this container (4 cores): the export about four minutes; the four self-tests about four minutes; the two readers at once 72 minutes; the still pass 18 minutes.
