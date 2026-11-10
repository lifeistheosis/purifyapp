# Build 90 on his phone (notes)

Android build 90 (run 42782850621, from `53dbb696` on `ccr-07896cf2-bo0afd`),
the test build of 2026-11-10 morning, on his "yes to the test build". It holds
every build 89 note, the page transitions, Easy Scroll, the new Florilegium and
Theology pages, the covers, both widgets' fixes, the 18 looks and their picker,
the new onboarding behind Testers, and campaigns' phase 1 switched closed. It
predates the Candlelight season and the Vespers mend (`827a65f2`, `d793da30`),
the Plus lines for the looks (`5b22c471`), the contrast sweep's later parts,
the palette names in 21 languages (`0128431a`), and the security updates.

What build 90 cannot show, so not bugs (it talks to the live 1.8 website):
campaigns, journal sharing, the new sync, the Bibles' downloads, the 1.9
counts, the Psalms move.

Brainstorm mode is on (his word, 2026-11-10 about 09:12 UTC: "Okay, brainstorm
mode on. I'm gonna start giving you critiques."). Each note says what he saw,
in his words with his screenshots; a chat finds the cause and the plan; nothing
from these notes is built until he says start. Work he approved before (the
campaigns, the security updates, the small fixes in flight) carries on.

## His notes

### 1. The account step's "Terms" and "Privacy Policy" open nothing; show them in a sheet (2026-11-10)

What he saw: in the onboarding, on the screen that says "Carry your prayers on every device", the line "By continuing you agree with our Terms and Privacy Policy": tapping Terms or Privacy Policy does not show them. His words: "So on the section on the onboarding where it says carry your prayers on every device, when it says by continuing you agree with our terms and privacy policy, when you click on terms and privacy policy, it doesn't actually show you the terms or the privacy policy. So I want to have either a pop-up show up with the terms, which is preferred actually, and you can easily scroll to see, and the privacy policy too."

Where it is (found by the Admin chat): the line is the Google and Apple buttons' notice, `signin.byContinuingYouAgreeToOur` in `components/auth/OAuthButtons.tsx`, which the account step draws. Its Terms and Privacy Policy are plain links to `/terms` and `/privacy`.

Why nothing shows: the tap does work, underneath. The onboarding is a full-screen layer over the app (`components/onboarding/OnboardingFlow.tsx`, `fixed inset-0 z-[100]`), drawn by `components/onboarding/FirstRunGate.tsx`, which decides again only on the home screen (`if (!home && !signup) return;`) and never takes the layer down when the page changes. So the app moves to the Terms page beneath the onboarding, the onboarding stays on top, and nothing seems to happen; a reader who then finishes lands on the Terms. It is not `c9e0d1a3`: that sent three links to pages the apps do not carry (the shop's contact form, the privacy page's robots.txt and llms.txt) to the website, while `/terms` and `/privacy` are in the apps and open with no signal as pages. The same thing happens wherever such a link sits inside a layer: Purify Plus's purchase sheet (`components/billing/PlusPaywall.tsx`) moves the page beneath itself, and the other purchase sheet (`KeptPaywall.tsx`) closes first, so the reader loses their place.

Planned (brainstorm, nothing built until his start):

1. **One sheet for the legal pages:** the house's own sheet (`components/ui/Sheet.tsx`), at full height, titled "Terms of Service" or "Privacy Policy", with the whole text in its own scroll, a 44px Close, the phone's Back closing it, and the reader returned to exactly where they were (the account step, the purchase sheet, the cart), nothing reset.
2. **One text for page and sheet:** the Terms and the Privacy Policy, English and German, move out of their pages into `components/legal/`, and both the pages and the sheet draw them, so the two can never say different things. The sheet loads the text when it opens: in the apps it is a file in the app, so it opens with no signal; on the website it is one request; no page carries it as a prop. A German reader sees the German text, as on the pages.
3. **One link everywhere the app says you agree:** a `LegalLink` that is an ordinary link to `/terms` or `/privacy` (it works without script, and on the website a middle click still opens the page) and opens the sheet on a tap. It replaces the bare links in the Google and Apple notice (sign-in, sign-up, the onboarding's account step), the sign-up form's checkbox (the sign-up page and the onboarding's own form), the sign-up page's line, the checkout's agreement (the cart and the buy bar), and both purchase sheets, where Apple asks for working Terms and Privacy links beside a subscription. The checkout also names the shipping and refund policy: in a sheet of its own the same way, or as the page it opens today (his call).
4. **Over whatever opened it:** the sheet stands above the layer it was opened from: over the onboarding (above its layer of 100) and over a purchase sheet (`lib/ui/overlay.ts` already counts layers), so no reader is sent beneath again.
5. **Nothing in the words changes:** the agreement lines stay as he approved them, the checkout's required agreement (`termsAccepted`) stays, and the whole text beside the action only makes the notice stronger.
6. **Held by:** a unit test that none of those places links to `/terms` or `/privacy` bare, and that the pages and the sheet draw the same text; a walk on the app's export (the account step, Terms, to the end, Close, still on the account step; the network off, then Privacy opens); and `checkMock` on the sheet in all five palettes.

### 2. Turning on notifications in the onboarding does not work; it just says "static" (2026-11-10)

What he saw: in the onboarding, the step that turns on notifications (reminders) does not work on build 90; it shows only the word "static". His words: "turning on notifications doesn't work it just says static (on the onboarding)".

What was found (the Fable onboarding chat, 2026-11-10; code and a walk of the export, no phone):

- **The word "static" is not in the app.** No line in any of the 21 catalogs and no code on this path can print it. So his sentence is read as dictated speech, "it just stays static": he tapped, and nothing turned on. If the word itself was on the screen, a screenshot is needed, because the app has nowhere to get it from.
- **Reproduced, for a reader with no account.** Walked on the export as the Android app, the way a fresh install of build 90 meets the questions after "Continue without an account": on "A nudge to pray, morning and evening", the tap on "Turn on reminders" asks the phone nothing. No Android question appears. The heading and the text stay where they are, and the button becomes the line "Reminders reach this device through your account. Sign in, and they turn on." with "Sign in". That is by design since 2026-10-31 (a reminder is kept with an account, `lib/push/native.ts`, `enableNative`), but the button says it will turn reminders on and it cannot. To a reader that is a button that does not work.
- **Signed in, it cannot be reproduced without a phone.** The tap asks the phone's question, asks Google for the phone's address, and waits for the website to keep it. Two weak places, both real and both old: only the wait for the website has a limit (10 seconds), so if the phone's own check or Google's answer never comes, the button stays on "…" for good; and every failure but two shows one sentence ("Reminders could not be turned on just now. Please try again in a moment.") with only "Continue" under it, whatever went wrong.
- **Ruled out.** Build 90 was built with its Firebase file (the run's log: "Wrote android/app/google-services.json", and Gradle processed it). And the reminders' own code in build 90 is the same, line for line, as what 1.8 runs today (`git diff origin/main -- lib/push app/api/push` is empty but for a test): what changed is the questions around it.
- **How it fits what is known of Android** (F-21, item 89, `lib/onboarding/reminderPromise.ts`): even when the step succeeds, no Android phone has been seen receiving a reminder since 1.6. So "it turned on" and "one arrived" are two proofs, and the phone walk needs both.

One fact from him settles which of the two he met: was he signed in when he tapped?

Planned (brainstorm, nothing built until his start):

1. **No button that cannot do what it says.** A reader with no account is never shown "Turn on reminders" in the questions. The new onboarding already does this (reminders are asked there only of a signed-in reader; the others meet the account card on Today), so it is true for every reader once the new onboarding is lit at release. For as long as the older questions can still be shown, the same rule goes into them: with no account the step opens with the sign-in line and "Sign in" at once, with no tap that leads nowhere first.
2. **The button never sticks.** Each wait on the phone gets a limit of a few seconds (the phone's own notifications check, the request to Google), beside the website's 10. The phone's own question has none: it waits on the reader. When a limit passes, the step says so and offers the tap again.
3. **Each failure in the house's words, and a way to try again.** Blocked in the phone's settings and not supported are said today. To add: no connection; the phone gave no address (Google Play services missing or out of date); the website did not keep it. Existing lines are used where they fit; any new line comes to him first, then the other 20 languages. "Try again" beside "Continue", never a dead end. Never a code word on screen.
4. **For testers only, the reason in plain words.** In Testers mode a small line under the sentence says which wait failed ("the phone did not answer", "Google gave no address", "the website said no"), so his next note names the cause and nobody has to guess from here. Readers never see it.
5. **The proof, on the phone walk (row 19, Android).** Signed in: the questions' step turns reminders on and its cards appear. Then a test reminder to his devices is watched arriving as a banner. Only then does Android turn to yes in `lib/onboarding/reminderPromise.ts`, and the account card may say its line there. If it turns on and nothing arrives, that is F-21, and the offer on Android is hidden until it is mended, as recommended to the arbiter.
6. **Held by:** unit tests that the step settles inside its limits when the phone never answers, and that a reader with no account is never drawn the button; the walk of the export run here, kept as a script, for both sets of questions; `checkMock` on any screen that changes.

### 3. The councils' Fathers: their pictures missing, or not framed right (2026-11-10)

What he saw: on an Ecumenical Council's page (the Second Council of Nicaea), under "The Holy Fathers principally associated", St Tarasius, St Irene and St Adrian show only a letter in a circle, and St John's icon is cut off-centre in its round frame (`build-90/03-council-fathers.png`). His words: "I noticed that in the ecumenical councils, the profile pictures of the Holy Fathers principally associated either don't show, or they do show and it's not framed correctly."

Also in his screenshot: at the top, the way back's chevron stands on the small heading "Seventh Ecumenical Council" ("S<venth"), with no plate under it over the picture.

Where it is: the faces for Updates 2 to find (note 3's covers and their faces; some come through the covers pack, which the live 1.8 website does not serve yet, so say which are a build 90 limit and which are real); the way back on the heading for Admin (the top plates of note 15).

Planned (brainstorm, nothing built until his start): every Father with an icon shows it, cut about the face and centred in its round frame, on every council page; a Father with no icon that passes our rules shows the house's plate, not a bare letter, or a related icon by the same rule as the borrowed covers; the way back stands on its plate, clear of the heading, on every page with a picture at its head. Held by a test and checkMock on the seven councils.

Found (Updates 2, 2026-11-10, on build 90's code, 53dbb696, and on the head, which draws the faces the same way; walked through all seven councils from the registry, and the live site asked for each portrait): the seven Ecumenical Councils name 31 Fathers' places, 17 with a picture and 14 without. Three causes, two of them real.
- Framing, real: the council's face (`components/councils/CouncilFathers.tsx`, `FacePicture`) centres every picture at its middle across and zooms it 1.9 times in the round (1.4 in the card), so a face standing to one side of its portrait is cut off-centre. The app already records where each face is (`lib/today/saintFaces.ts`: `COVER_FACES` for the website's portraits, `ICON_FACES` for the icons it carries), and the council's face does not read it. Worst: St John of Damascus (his face at 0.71 across), St Gregory the Theologian (0.65), St Cyril of Alexandria (0.36, on two councils).
- St Tarasius, a build 90 limit: his portrait is new in 1.9 and streams from the website, and the live 1.8 site answers 404 for it (`covers/authors/tarasius-of-constantinople.v1.jpg`; the older portraits all answer 200). He shows once the 1.9 website is deployed. With no signal he stays a letter, because the icon the app carries of him has no rights record.
- The bare letters, real: 14 places, 13 Fathers, have no settled picture: St Irene and St Adrian on the Seventh Council, and St Alexander, St Nectarius, St Memnon, St Juvenal (twice), St Celestine, St Anatolius, St Marcian, St Pulcheria, St Eutychius, St Sophronius and St Martin. The app carries an icon of each, but all thirteen are unverified (`lib/saints/iconRights.ts`: no source or licence recorded, not yet opened), so by the house's rule none may stand as his face.

Plan (Updates 2, nothing built until his start):
1. Every face cut about the face and centred: the council's face reads the face's place (`COVER_FACES`, `ICON_FACES`) and draws through Theology's face (`components/today/SaintFace.tsx`, `faceShift`, 7db55614) in the round and in the card, so there is one drawing of a framed face, not a second. It keeps its direction in Arabic, as Theology's does.
2. The thirteen unverified icons, and St Tarasius's, are opened and checked as the covers' were (a source on Commons or the like, public domain or CC0 first, CC BY with its credit on the credits page; the face's place recorded). Each that passes becomes his face, and St Tarasius's becomes his face with no signal.
3. Until his icon passes, a Father has no bare letter: he gets the house's plate (the dark plate a book with no cover wears, `components/covers/WorkCover.tsx`) in the round and in the card, with his name beside it as now. A borrowed icon is not planned for a face: the covers' own rule is that a borrowed picture is a book's and never stands as a person's face (`lib/reading/coverArt.ts`, `coverArtFor`, held by `lib/reading/__tests__/coverArt.test.ts`). A related icon in his place would put another saint's face over his name; that would need his word.
4. Held by `lib/councils/__tests__/page.test.ts` (every face with a picture carries its face's place; no Father is drawn as a bare initial), and by `checkMock` and stills on the seven councils' rows and cards, walked on the export with signal and without.

**The way back on the heading (found by the Admin chat).** Cause, on build 90 and at the head alike (the rule and its styles have not changed since build 90):

- A council's page uses the bar that starts clear over the page's picture (`MobileTopBar` with `overlay`), not the Bible reader's plates of note 15. At rest the way back stands well clear of the heading (on the export, its foot at 48px, the heading at 148px).
- Its plate is drawn: night at 55%, with no blur and no edge. Over a dark icon it barely shows, and it dims the words that pass under it instead of hiding them. In his screenshot it is there, a faint disc, with "Seven" greyed under the chevron.
- The bar turns solid only once the page's name (the `h1` that `revealTitleOn` names) has gone entirely under it: the observer's "gone" is the name's foot above the bar's. Words above the name (the council's ordinal line) and then the name itself pass under the clear bar first, under the plates and the chevron. On the Second Council of Nicaea that is from 105px of scroll until about 150px, and his screenshot stopped there.

Where else, measured on the app's export, scrolling every page whose bar starts clear over a picture 5px at a time:

- every council with a picture, from 105px (the ordinal line, then the name);
- Your rule, from 95px;
- a Theology topic, from 185px (a quoted line above the title);
- a Theology path, from 355px;
- a saint's page, the name itself, from 265px.

Chants come out clean. Campaign pages use the same bar (closed in these builds), so they take the same fix.

Planned for the way back (brainstorm, nothing built until his start):

1. **The bar turns solid when the page's first words reach it,** not when the name has gone. `MobileTopBar` gains `solidFrom`, the id of the head's first words, which defaults to the name, and watches that element's top cross the bar's foot. While it is wholly below the bar, the bar stays clear; once any of it is under the bar, the bar is solid. The bar's own title still waits for the name to go (two marks: one for the solid ground, one for the title), so no second name shows early.
2. **Each clear-bar page names its first words:** a council its ordinal line, a Theology topic its quoted line, a Theology path and Your rule their first lines. A saint and a chant keep the default, the name.
3. **The plate shows over any picture:** a fine edge of paper at 13%, as the new post page's Close has, so it reads on a dark icon too. At rest the bar stays clear, as today.
4. **Held by:** a test that every clear-bar page names its first words (or its name is its first word); the same scroll measurement as a script on the export, which must find no words under a button while the bar is clear on any of these pages; and `checkMock` on a council's head in all five palettes.

### 4. In Arabic and Urdu the app's English runs right to left (2026-11-10, found by Updates 2)

Not one of his notes. Updates 2 found it while mending the cross-references sheet (`8bab9b04`). It is on every build, and on the website. The arbiter's word (2026-11-10, 10:16 UTC): "plan option 1 properly, plan only (which containers, the walk-test in Arabic and Urdu that fails on any English block running right to left, how it is checked on the export)".

What a reader sees (`build-90/04-reader-john1-ar.png`): in Arabic or Urdu, the app's own English is set right to left, as if it were Arabic. Each line stands against the right edge. A sentence's full stop, comma or closing quote stands at the start of its last line (".was God"). A verse's number stands to the right of its words. And most of it is announced as Arabic or Urdu: TalkBack reads the English words in the page's voice.

Found (Updates 2, 2026-11-10, on the Android export at `8bab9b04` and on purifyapp.net):

- **The cause.** The app's words are English; only the interface is in 21 languages. For Arabic and Urdu the whole page is set right to left (`MessagesProvider` writes `<html lang="ar" dir="rtl">`), and English inherits that unless it says otherwise. 127 places in 70 files mark English `lang="en"` (for screen readers and the typefaces), but `lang` sets no direction, and only 8 of them carry a `dir`: the three mends of this morning (the Plus previews' page of Scripture `24634b8b`, Your mark and the cross-references preview `36388ac9`, the cross-references sheet `8bab9b04`), Settings' two sample verses, the Florilegium's starter page and the chants' live captions. 51 more places in 29 files set `lang={...}` from data (the lessons are German for a German reader and English for the rest; a downloaded Bible has its own language), and only the Bibles' own set a direction with it.
- **Measured.** One page of every route the export carries, in Arabic, reached the app's way and scrolled through. A block of English is the innermost block with no Arabic letters and 25 or more Latin letters. Of 86 routes, 49 show English running right to left: 2,618 blocks, 332 of them already saying `lang="en"`. By family: What's New 1,239 (every patch note); the saints 375 (their cards and lives); history 138; the dictionary 118; the prayers 95 (7 of 13 routes: the prayers' own lines); apologetics 81; the reading room 77; the Privacy Policy 72 and the Terms 37; Theology 55; the councils 50; Your plan and the Plus page 45 each; the walkthroughs 40; the Bible 39 (1 Chronicles 1, where many verses are shorter than 25 letters; John 1, measured verse by verse, 53 of 53); heresies 39; the parish finder 30; topics 23; the Fathers on a struggle 16; one each on the calendar, a chant, Credits and the FAQ. Urdu is the same (John 1: every verse). The 37 routes with none draw only the interface, or were empty in the walk because they show the reader's own things (Saved, the journal, the Florilegium). Sheets that open over a page were not reached.
- **The website** draws the same components: purifyapp.net/bible/john/1, asked with the Arabic language cookie, answers `<html lang="ar" dir="rtl">`, and its verse rows carry no direction of their own.
- **Seen beside it, not this note's:** Your plan and the Plus page (`lib/premium/plans.ts`) are written in English and German only, so an Arabic reader reads them in English. Translating them is translating subscription words, his call. Until then they take the same mark as the rest of the English.

The design (his call; the arbiter's recommendation): English always left to right, even under Arabic headings, which is the correct way to set one language inside another. The frame keeps the reader's direction: the bar and its way back, the tabs, the headings and labels in the reader's language, a row's order. Each block of English inside it runs left to right from the left edge, its numbers and marks where English puts them. The cross-references sheet is drawn this way since this morning (`build-90/04-crossrefs-sheet-ar.png`).

Plan (Updates 2, nothing built until his start):

1. **One rule: words say their language and their direction together,** on the smallest element that holds only those words. The app's English is `lang="en" dir="ltr"`. Where the language comes from data, the direction comes from it through one helper, `textDir(lang)` in `lib/i18n` (right to left for Arabic, Hebrew, Persian, Syriac and Urdu; left to right for the rest), never typed by hand. A reader's own words (the journal, a verse's note, a post, the names in the diptychs, a personal prayer) take `dir="auto"`, as the Florilegium, Saved and the Remember card already do, since they may be in any language.
2. **The marks already there:** the 127 `lang="en"` gain `dir="ltr"`, and the 51 `lang={...}` gain `dir={textDir(...)}`. Mechanical, one file at a time, each looked at. This alone mends the 332 blocks that already say `lang="en"`: the prayers' lines, the dictionary, the walkthroughs' verses, the topics' cards, the heresies' list, the apologetics' cards, the Fathers on a struggle, Theology's shelves.
3. **Where the English has no mark,** from the walk and the code (the component, then what it draws):
   - The Bible: the chapter's text column in `components/bible/ChapterReader.tsx` (every verse; its number on the left, the Greek beside it on the right), the introduction's text in `ChapterScreen.tsx`, `MultiVerseClient.tsx`, Compare's English row (`CompareSheet.tsx`, `lang="en"` today with no direction), the Fathers' commentary (`MobileCommentarySheet.tsx`, `StudyRail.tsx`), the word study's English (`WordStudySheet.tsx`) and `VerseFocus.tsx`.
   - The saints: `SaintCard.tsx` (the name, the titles, the epithet and the summary), `LifeSection.tsx`, `HymnsSection.tsx`, `MiraclesSection.tsx`, `DisciplesSection.tsx`, the saints' web (`WebConstellation.tsx`: its names and lines), a work's head and text (`WorkHead.tsx`, `WritingReader.tsx`, `WorkContents.tsx`; a council's document is drawn by the same) and Today's saint (`SaintWindow.tsx`).
   - The prayers, nearly all marked already (93 of their 95 blocks say `lang="en"`): the service's section titles in `PrayerStep.tsx` ("The Nicene-Constantinopolitan Creed" in the Hours), and the prayers' sheets (`ItemSheet.tsx`, `LibrarySheet.tsx`).
   - The councils: `CouncilMap.tsx` (the places' lists), `GalleryBand.tsx` (the cards' words), a council's page and its facts (`app/(app)/councils/[slug]/page.tsx`), and its documents (`CouncilReader.tsx`).
   - Theology and teaching: the Creed's page (`app/(app)/theology/creed/page.tsx`), `TopicReader.tsx`, `ApologeticsReader.tsx` and a heresy's page (`app/(app)/heresies/[slug]/page.tsx`).
   - History: `EventRow.tsx`, `EventArticle.tsx`, `EventThread.tsx`, `EventPeekSheet.tsx` and the pictures' captions (`EventPictures.tsx`).
   - The reading room: `PathView.tsx` and `DayThread.tsx`. The walkthroughs: a book's list of chapters (`ChapterList.tsx`, `BookWalkClient.tsx`: their lines of English) and their sheets (`WalkSheets.tsx`); and the liturgy guide (`GuideSheets.tsx`).
   - Every page that quotes: the source under each quote (`components/citations/SourceLine.tsx`, `CitationCard.tsx`), one mark each.
   - The rest: What's New (`app/(app)/whats-new/page.tsx`, `ChangelogControls.tsx`); the Terms, Privacy Policy, About and shop policy pages; the parish finder (`ParishFinderList.tsx`: the jurisdictions' names); the calendar's commemorations (`PhoneCalendar.tsx`); Credits; the FAQ; Your plan and the Plus page.
   The walk, not this list, says when it is complete.
4. **What does not change:** the interface, in the reader's language and direction; a row's own frame (its icon, its chevron), which stays with the page while its English words run left to right inside it; the Bibles in other languages, which already carry theirs (`lang={bible.textLang} dir={bible.dir}`); the Greek (`lang="grc"`), which takes left to right from its column.
5. **Held by:**
   - a unit test, `lib/i18n/__tests__/textDirection.test.ts`: every `lang="en"` in `app/` and `components/` carries `dir="ltr"` on the same element, every `lang={...}` carries `dir={textDir(...)}`, and `textDir` answers rightly for each of the 21 languages and the Bibles' own;
   - the walk, `scripts/rtl-walk.mjs`, after `npm run build:android`: one page of every route the export carries (reached as `scripts/stripe-walk.mjs` reaches them), in Arabic and in Urdu, with sample items placed first so that Saved, the journal and the Florilegium are not empty; then the sheets above, opened the app's way (a verse's Study for the commentary, the cross-references, Compare and the word study; a saint's work; a council's document; an event's peek; the liturgy guide). It fails on any block of English (the innermost block with no Arabic letters and 12 or more Latin letters) that runs right to left or does not say `lang="en"`, and names the route, the element and its first words. `--self-test` proves it on a page of its own: an English paragraph with no mark fails, one with `lang="en"` alone fails, one with both passes, and an Arabic line with an English name inside it is not counted;
   - a short section of `scripts/export-walk.mjs` with four pages in Arabic (John 1, a saint, a prayer, Today), so the routine walk catches a slip between full walks;
   - `checkMock` on each screen that changes (its `mirror` check passes on such a screen: the cross-references sheet, `8bab9b04`);
   - the phone walk (`docs/PHONE-WALK.md`): in Arabic, John 1 and a saint's life read left to right, and TalkBack reads a verse in an English voice.
6. **Checked on the export:** `npm run build:android`, then `node scripts/rtl-walk.mjs`: no block in Arabic or in Urdu, where today there are 2,618 on the routes alone; stills in Arabic of the reader, a saint, a prayer and an article, before and after; and the same walk in English finds nothing moved.

Size: about two days of one chat (12 to 16 hours). The 178 marks already there (mechanical); about 55 components and sheets with no mark (step 3's list, which the walk may lengthen); the reader's own words in about 6 places; the walk with its self-test (the largest single piece, about 3 hours); the unit test; and two export builds walked in both languages, with stills. No new words for translators, no migration, and nothing for the website beyond its next deploy.

### 5. Still no covers on St John Cassian's books (2026-11-10)

What he saw: in the reading room's rows "The passions" and "The virtues", The Institutes and The Conferences of St John Cassian still on the plain plate (`build-90/05-cassian-plates.png`). His words: "still no cover photos even though I told you to fix that".

What the record says: The Conferences took St Moses the Ethiopian's icon in `7c8bfb39`, pushed after build 90 was cut (from `53dbb696`); The Institutes kept the plate, since no old icon of St John Cassian or of the book passed the rules (Updates 2, 2026-11-10). Whether build 90 can show any of note 3's new covers at all, or only once the 1.9 website serves the covers pack, is asked of Updates 2.

Planned (brainstorm, nothing built until his start): every reading room book shows a cover in the next test build; The Institutes borrows a cover by the borrowed covers' rule (rec: St Pachomius, whose Egyptian rule the Institutes' first books describe), unless he names another; and the covers reach the test build itself, not only the release.

Found (Updates 2, 2026-11-10, on the code and on the live site):

- The apps carry no file under `/covers/`. `scripts/native-build.mjs` leaves `public/covers` out of the export, and the apps ask purifyapp.net for each such cover (`kind: "streamed"` in `lib/reading/coverArt.ts`), drawing the plate when no picture comes back. A cover made from an icon the app carries (`kind: "bundled"`, under `/saints/icons/`) shows anywhere, with no signal.
- The live 1.8 site has none of note 3's 15 new pictures: `covers/feelings/anger.v1.jpg` and `covers/councils/first-nicaea.v1.jpg` answer 404, while a portrait 1.8 already had (`covers/authors/anthony-the-great.v1.jpg`) answers 200. The covers pack is new in 1.9, so the live site serves no pack either. So build 90 shows note 3's covers only where they are an icon the app carries (Isidora of Tabenna's Life, wearing St Pachomius) or a portrait the 1.8 site already had. The four councils' icons, the eight How you feel doors and the three new portraits (St Anianus, St Arsenius, St Tarasius) are plates. Five new read-aloud covers of the Bible's books (Obadiah, Zechariah and three more) are streamed and answer 404 the same way.
- The Institutes has no cover at all, on build 90 and at the head: it has no row in `WORK_ART`, because the icon of St John Cassian that the app carries (`john-cassian.jpg`) is unverified (`UNVERIFIED_ICONS` in `lib/saints/iconRights.ts`: no source or licence recorded). The Conferences' borrowed cover (`7c8bfb39`) is the Anger door's file under `/covers/`, so in a test build it is a 404 as well.
- So the next test build shows none of these unless the 1.9 website is deployed first (a push to main, his word), or the pictures are in the app.

Plan (Updates 2, nothing built until his start):

1. **The two Cassian books drawn from icons the app already carries, at no cost in size.** The Institutes wears St Pachomius's icon (`pachomius-the-great.jpg`, verified): Books 1 to 4 set out the dress and the rule of the monks of Egypt, and Book 4 tells of the Tabennesiots, his monasteries. The Conferences wears St Moses the Ethiopian's carried icon (`moses-the-black.v2.jpg`, verified: the Dionysiou fresco of 1547, public domain) in place of the Anger door's file. It is the same saint (the first two Conferences are Abba Moses's) in a different icon of him: the door keeps its Novgorod icon, and a book no longer repeats a door's picture. If he would rather the Conferences keep the door's own icon, step 2 carries that file too. Both books then show in any build, offline, without the website. Isidora's Life already wears St Pachomius, so the room's rows are checked that the two never stand side by side.
2. **The rest of note 3 carried in the app as well as in the pack.** The 15 new pictures are kept in the export, where the build now takes all of `/covers/` out, and a cover is drawn from the app's own file first, the website's after. A picture changed after a store build still arrives through the pack. Size: 1.57 MB more in the apps as JPEG, 2.58 MB with each picture's AVIF beside it. The five new Bible covers would add 0.86 MB more as JPEG; they are his call, since the read-aloud screens show the manuscript plate without them. With this step, every reading room book and door shows its cover in the next test build, offline too.
3. **Held by:** a unit test in `lib/reading/__tests__/` that every reading room book and How you feel door with a cover draws a file the export carries, never a file only the website has; the export walk's section 41 (the covers settle) asking for the file in the export itself, where today it accepts any file under `public/covers`, which is the folder the export leaves out; and stills of The passions and The virtues on the export with the network off, with `checkMock`.
