# Settings' words, before and after (build 95 note 19)

His word, 2026-11-13 about 07:59 UTC: "also I noted in the settings there is alot of overexplaning and ambiguity also with the title names. make it clean clear and simplified."

The rule each line was held to: a title says plainly what the control is; a line stands under it only where the title cannot say it alone, one short sentence, never how the control works inside; nothing untrue about Plus, Pro or what is free; plain voice, no em dashes.

Waiting on his yes. Nothing here is in the app until then. After his yes, every one of the 21 languages carries the new words (none keeps the old), and the keys no screen reads any more are removed.

Status: **proposed** (Updates 11, 2026-11-13). His page, with the scroller's stills and recording from the export and this table: https://claude.ai/artifact/8FLKFQDUhaVExnP59vzjL3

## What changes

In the order Settings shows them. "Removed" means the line no longer stands under that title.

### Your account

| Row | Before | After | Why |
|---|---|---|---|
| Notifications, line (`settings.notificationsHint`) | Prayer reminders and email, both off by default. | Prayer reminders and email. | Says what is inside; "off by default" is how it works. |
| Show my supporter mark, line (`settings.showSupporterMarkHint`) | A small cross beside your name in the community while your Plus or Pro subscription is active. It tells other readers which you hold; turn it off to keep that to yourself. | A small cross by your name in Community while you have Plus or Pro. | Three sentences become one. The switch itself says it can be turned off. True: Plus is the cross, Pro the same cross in a ring (components/community/SupporterMark.tsx). |
| Sign in (signed out), line (`common.optional`) | Optional | Removed | "Optional" under "Sign in" read as a riddle. |

### Your space

| Row | Before | After | Why |
|---|---|---|---|
| Section line (`settings.spaceHint`) | What you told us when you arrived. Purify shapes Today around it, and you can change it any time. | These shape what Today shows you. | One sentence. The title stays: the 1.6 release note sends readers to "Your space". |
| Familiarity (`settings.level`) | Familiarity | Familiarity with the faith | "Familiarity" alone left the reader asking: with what? |
| Fasting on Today, line (`settings.fastingHint`) | The full rule, a plain line on fast days, or nothing at all. | Removed | The three choices and the line under the chosen one already say it. |
| First focus (`settings.focus`) | First focus | Main interest | "First" was the riddle. The cards are interests (Daily quiet, Study, The saints' lives). |

### Reading

| Row | Before | After | Why |
|---|---|---|---|
| Section line (`settings.readingHint`) | These apply everywhere, not only in the Bible and the Fathers. | Removed (here and on the Reading mode page) | Overexplains; choosing a mode shows it at once across the app. |
| Candlelight at Vespers (`bible.vespers.title`) | Candlelight at Vespers | Candlelight at night | Says when, for every reader, an inquirer too. |
| its line (`bible.vespers.hint`) | On by itself at sunset, when the Church's day begins, and off in the morning | On at sunset, off in the morning. | The exact hours, in six words. |
| Candlelight keeps the season (`bible.season.title`) | Candlelight keeps the season | Candlelight in the fasts | The riddle named plainly. |
| its line (`bible.season.hint`) | Its soft light takes the colour of the Church's long fasts, violet or deep blue | Violet in Great Lent, blue in the Nativity and Dormition fasts. | Which colour, when. True to lib/reader/candleSeason.ts. |
| Reader font (`ui.readerFont`) | Reader font | Font | "Reader" could mean the person or the Bible's reader. |
| its line (`settings.fontHint`) | The face of the body text. | Removed | Each face is drawn in itself, with its name. |
| Reader size (`ui.readerSize`) | Reader size | Text size | Plain. |
| its line (`settings.sizeHint`) | How large the body text appears at default zoom. | Removed | The verse above the slider shows the size. |
| Interlinear by default, line (`settings.interlinearHint`) | Show the original language beside the English when a chapter has it. | The Greek beside the English, where a chapter has it. | Names the language. The title stays: "Interlinear" is the Bible's own button. |
| Clicks as you scroll (`settings.clicks`) | Clicks as you scroll | Haptic feedback | His own word, and it covers the click when a rule is done too. |
| its line (`settings.clicksHint`) | A light click in your hand as each prayer, chapter or event passes, and when a rule is complete. Off keeps the phone still. | A light click as you scroll, and when you finish a prayer rule. | One sentence; the switch says off. |
| Reading mode, the goal line once a goal is tapped (`settings.paletteEarnCouncils`) | Read every council's page to the end to earn Councils: {count} of {total} so far. | Read every council's page to the end to earn it. | The count is already on the page above it ("0 of 19"). |
| (`settings.paletteEarnCappadocian`) | Read one work by each of the three Cappadocian Fathers to the end (St Basil the Great, St Gregory the Theologian, St Gregory of Nyssa) to earn Cappadocian: {count} of {total} so far. | Read one work each by St Basil the Great, St Gregory the Theologian and St Gregory of Nyssa to the end to earn it. | Shorter, the three still named. |
| (`settings.palettePlusNote`, only for a reader without Plus) | It is a Purify Plus palette. | It needs Purify Plus. | Plain, and true: an earned palette is worn with Plus (lib/reader/earned.ts). |

### The calendar

| Row | Before | After | Why |
|---|---|---|---|
| Section line (`settings.calendarHint`) | Which reckoning the saint of the day, the fast, and the readings follow. | Removed from Settings | The row now says it. The words stay in the catalog: the first-week calendar email quotes them (lib/email/retention/letters.ts), and that email waits on his yes as it stands. |
| Calendar reckoning (`ui.calendarReckoning`) | Calendar reckoning | Calendar you follow | The riddle named plainly. Choices stay New and Old (Julian). |

### Motion (on the web and the computer app, when a reader has asked for less motion)

| Row | Before | After | Why |
|---|---|---|---|
| Section line (`settings.motionHint`) | Steps that slide in, cards that rise, the ring that fills. | Removed | Overexplains. |
| Animations, line (`settings.animationsHint`) | Off keeps every screen still. | Removed | The switch says it. |

### On this device (the phone apps)

| Row | Before | After | Why |
|---|---|---|---|
| Section line, nothing kept (`settings.storageHint`) | What is kept here to read and listen to without a signal. | Saved here for reading and listening offline. | Plainer. |
| Section line, with a size (`settings.storageTotal`) | {size} kept here, to read and listen to without a signal. | {size} saved here for reading and listening offline. | The same words, with the size. |
| This week's readings, line (`settings.storageWeekHint`) | The coming week's, kept by themselves on Wi-Fi and removed when their day has passed | Saved on Wi-Fi and removed after their day | The title already says "this week's". |
| Nothing kept (`settings.storageEmpty`) | Nothing is kept here yet. Download a Bible from the reader's translations, or save a book to listen offline from the player. | Nothing saved yet: download a Bible in the reader or save a book in the player. | One sentence, still says where. |

### Discord status (the computer app only)

| Row | Before | After | Why |
|---|---|---|---|
| Section line (`settings.discordHint`) | Desktop app only. Lets the Discord app on this computer show your friends that you are in Purify. Nothing is sent to Purify, and it stays off until you choose. | Show your friends on Discord that you are in Purify. | One sentence. It shows only in the computer app, and the Show switch says when nothing is sent. |
| Reading, its note (`settings.discordReadingNote`) | Works for Scripture and for the saints' writings. The picture is the portrait of whoever wrote it. Prayer only ever shows as “At prayer”, and your account, messages and the shop are never shown. | Prayer shows only as “At prayer”, and your account, messages and the shop are never shown. | Keeps the one promise that matters; the mode's own line says what it works for. |
| Patron saint, name day line (`settings.discordNameDayHint`) | On the day itself, friends see “Name day today”. The date follows your calendar, New or Old. | On the day, friends see “Name day today”. | How the date is found is how it works inside. |
| Live progress bar, line (`settings.discordLiveBarHint`) | Moves as you read. A bar and a percent, never a clock. | Moves as you read, never a clock. | One sentence; keeps that no time is shown. |

### Testers mode (admins only)

| Row | Before | After | Why |
|---|---|---|---|
| Section line (`testers.hint`) | For admins. See Purify as another reader does. Nothing here is counted, and your account keeps your own answers. | See Purify as another reader does, with nothing counted. | One sentence. |
| Where they come from (`testers.from`) | Where they come from | Faith background | Plain. Not "Background", which the looks also have. |
| Familiarity (`settings.level`) | Familiarity | Familiarity with the faith | As above. |
| A test's version to look at (`testers.version`) | A test's version to look at | Test version | Plain. |
| Preview as signed out, line (`testers.signedOutHint`) | See the welcome questions and Today as a reader with no account meets them. You stay signed in. | You stay signed in. | The title says the rest. |
| its line while on (`testers.signedOutOn`) | On. You are still signed in. Tap to turn it off. | On. Tap to turn it off. | Shorter. |
| First open (`testers.firstOpen`) | First open | See the welcome questions | Says what it opens. |
| its line (`testers.firstOpenHint`) | The welcome questions again, as a new reader meets them. | Removed | The title says it. |
| Back to my own (`testers.back`) | Back to my own | Back to my own answers | Plain. |
| its line (`testers.backHint`) | Your own answers, put back exactly as they were. | Removed | The title says it. |

### The page itself

| Where | Before | After | Why |
|---|---|---|---|
| On a computer, under the heading (`settings.subtitle`) | How the app reads, reckons the day, and speaks to you. Everything here is kept on this device. | Removed | No longer true: the account rows are kept with the account. The phone has no such line. |
| The page's description for search engines (English only) | Reading palette, font and size, the interlinear default, the calendar reckoning, and the language Purify speaks to you in. | Your account, reading mode, font and text size, the calendar you follow, and the language Purify speaks to you in. | Follows the new names. |

## Kept as they are, and why

- Section titles: Your account, Your space, Reading, The calendar, Motion, Language, Home screen, Data, On this device, Purify, Discord status, Testers mode. Each says what it holds. "Your space" stays because the 1.6 release note sends readers there by that name.
- Profile (its line is the reader's own email), Security, Notifications, Show my supporter mark, Your journal ("What you write, and your notes on verses"), Your Florilegium ("The lines you keep", the Florilegium's own line on its page and in You), Fasting on Today and its three choices, Reading mode (its line is the mode that is on), Interlinear by default, Patron saint, Purify widget ("The day's saint and the fast, on your home screen", and Show me how), Export your library ("Download everything you have gathered."), Delete account, Privacy, Support Purify, What's new, About, Sign out.
- The choices and the line under each, from the first run: Completely new, Learning, Practicing; Strict rule, Modified rule, Hidden; the interests and their Day 1 card. They are onboarding's words, which he has already seen there.
- The palettes' names, Purify Plus under a paid one, how far the reader is ("0 of 19"), and Earned by reading.
- Patron saint: the row's name stays. Its chooser is Updates 10's rework (build 95 note 17); no key is touched by both chats.
- Discord status: every other line (what friends see, the switches' on and off lines, the season colours) says what is shown, which is the promise a reader turns it on for.
- On the Reading mode page, the four families' lines ("The hours of the dark, and what lights them", "The places the Church has prayed in", "Paper and flowers", "What the hands of the Church have made") stay: they are the looks' own words, not Settings'. Say if they should be plainer too.

## Where the same words show elsewhere

A changed line changes everywhere it is drawn, which keeps one control saying one thing:

- Candlelight at night and Candlelight in the fasts: also in the Bible's own settings sheet (the same two switches).
- Font, Text size, Calendar you follow: also on the account's data page, in search results, and as the spoken name of the calendar page's New and Old switch. Search keeps the old names as words it finds ("reader font", "reckoning").
- The supporter mark's line: also on the account's data page and on the Plus page's "Your mark in Community".
- Familiarity with the faith: also in Testers mode.
- The goal lines and It needs Purify Plus: also under the Bible's own shelf and on the Reading mode page.
- Not changed, though Settings stops drawing them: "Which reckoning..." (the calendar email quotes it) and "How large the body text appears..." (the account's data page still draws it).

## Note 18, the scroller: why each choice

The reading modes in Settings were two rows: the five, then Councils and Cappadocian under them (components/settings/ReadingModePages.tsx, ModePages). The chooser of the same name in the Bible's own settings sheet (components/reader/ReadingModeChips.tsx) was already one swept row, with the same pages and no click; the Reading mode page (components/settings/ReadingModeGallery.tsx) is a row per family. Only Settings' row changes.

| The choice | Why | What it does for the reader |
|---|---|---|
| One row, swept sideways | His word: a clean scroller rather than stacks. | Every mode is one sweep away, in one line. |
| Larger pages, 81px under 400px wide and 89px from there | Sized so the page at the edge shows between a quarter and three quarters at 360 to 430 (lib/settings/__tests__/modeRow.test.ts does the sums). | Each page reads as a page, and it is plain there is more. |
| It comes to rest on a page (scroll-snap, mandatory, at each page's start) | A short sweep moves one page; a quick one passes several and settles on one. | The row always rests tidy. |
| The chapter strip's click as each page passes (lib/ui/scrollTicks.ts) | The phone apps only; none with Haptic feedback off. | Each page is felt going by. |
| The page that is on in sight when Settings opens (lib/settings/modeRow.ts) | The row alone moves, never the screen; still before the screen is up and under reduced motion. | A look such as Holy Mountain is never hidden past the edge. |
| Councils and Cappadocian on the same row, with how far the reader is | They are modes like the rest. Note 27 (the Fable chat on the looks) will redraw their cards. | Nothing earned or to earn is in a second row. |
| The gap between pages equals the row's margin, 16px | The page before the one at rest ends exactly at the edge. | No sliver of a page stands at the edge like a stripe. |
| Mirrored in Arabic, 44px and more, all eight on one row on a computer | Logical sides only; pages 69px and more at every width. | The same for every reader and every hand. |

Proved on the export (2026-11-13): a short drag moves one page with one click; a quick drag passes several with a click each and rests on a page; the screen does not move; Holy Mountain on opens with the row at it. In the test browser a drag past the row's ends is that browser's own Back gesture (the house's First focus row does the same); a phone's WebView has no such gesture and the app has none of its own.

