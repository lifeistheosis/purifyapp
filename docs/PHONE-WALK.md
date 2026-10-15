# Walking a build on a real phone

Before a build goes to its store, it is walked on a real phone: one Android
phone and one iPhone, once each. Written 2026-10-14, with the drop of 1.6.

A browser walk (`node scripts/export-walk.mjs`, `docs/RELEASE.md`) runs the
apps' pages with no network, and it cannot show what only a phone does: the
logo screen lifting, the back button, the soft tick, the widget, the icon's
shortcuts. A store's review does not look for any of that either. So a hand
does, before the build is handed over.

Tick each line yes or no, and tell us only the no's, in a line or two. We
write it down in your words:

```
node scripts/drop.mjs phone android --words "all yes, the widget took two tries" --build 74
node scripts/drop.mjs phone ios --words "all yes"
```

Nothing goes to a store before that store's walk is written down: neither its
"What's new" text nor the submission (`docs/DROP.md`, rule D3.5). You may send
one ahead anyway; we then record it with `--early` and your words, and it
stays in every check as a warning.

## Which build

- **The build that is going to the store,** whenever there is one. On Android,
  the build in Play Console's internal testing track: open the testers' link
  once on the phone, and the Play Store app offers it as an update. On the
  iPhone, the build in TestFlight, once App Store Connect has processed it.
  Say its number when the walk is written down (`--build`).
- **The Android test app,** before there is a store build. It walks
  everything below except the last two lines, which need the live site.
  There is no test app for the iPhone: it is walked on TestFlight.

## The Android test app

`C:/Users/Edgar/Homebase/tools/android/build-test-app.mjs` builds it on this
PC, from a worktree with nothing uncommitted and the apps' web bundle that has
already passed its walk (by default the Design Board's copy,
`tools/purify-phone/app`):

```
node C:/Users/Edgar/Homebase/tools/android/build-test-app.mjs <worktree> [<bundle folder>]
```

One build at a time on this PC: not beside a web or native build. It writes
`boards/purify-master/test-app/Purify-Test.apk` under `C:/Users/Edgar/Homebase`,
with `Purify-Test.json` beside it saying which commit, when, and how large.

It is a debug build named "Purify Test". Its id ends in `.test`, so it
installs beside the store app as a second icon, and never replaces it or
shares its data. It is a stand-in: it has no address for the live site, so
the shop, Chat, sign-in, sync and purchases show what they show with no
connection, and nothing it does reaches production. Reading, prayers, saints,
the calendar, the widget, the back button, how it opens and how it feels are
all real.

To put it on the phone, either:

- **Copy the file across** (a USB cable, or send it to yourself) and open it on
  the phone. Android asks once whether the app you opened it from (Files,
  Drive, your mail) may install apps: allow it for that app only.
- **Or install it over USB,** with the phone's Developer options and USB
  debugging on, the phone plugged in, and the prompt on the phone accepted:

  ```
  C:/Users/Edgar/Homebase/tools/android/sdk/platform-tools/adb.exe install -r C:/Users/Edgar/Homebase/boards/purify-master/test-app/Purify-Test.apk
  ```

  `-r` replaces an older test app and keeps its data.

## The walk

| # | Do this | Yes if |
|---|---|---|
| | **Opening** | |
| 1 | Swipe Purify out of recent apps, then open it | The logo screen lifts quickly and Today fills in. No white flash, no blank screen, no logo that stays |
| 2 | The same, with the light palette on | Nothing dark shows before a light Today |
| 3 | Go to the home screen, then back to Purify | It is where you left it, with no logo screen |
| | **Moving around** | |
| 4 | Tap every tab on the bar | Each opens, every word on the bar is whole (none cut with dots), and the tab you are on is lit |
| 5 | Open a sheet, then three screens deep, then go back | Android's back button closes the sheet first, then walks back one screen at a time. On the iPhone the arrow at the top does the same |
| | **Reading** | |
| 6 | Today | The date, the day's saints and the readings card. The readings open |
| 7 | Open a Bible chapter, scroll to its end, hold a verse | Purify's own Copy comes up, not the phone's blue selection. Pasted somewhere, it is the verse and its reference |
| | **Finding and sharing** | |
| 8 | Search a verse ("John 3:16"), a saint, a setting | Each is found, and each result opens |
| 9 | Share a verse as a picture | The share sheet opens, and the picture saves and looks right |
| | **Settings and a second language** | |
| 10 | Settings: open each part and come back. Change the palette | Every part opens, and the palette stays after a cold open |
| 11 | Set the phone to a second language (Greek is a good one), open cold | Purify opens in it from the first screen. English never flashes, and dates and book names follow |
| | **No signal** | |
| 12 | Airplane mode, open cold, open five screens | They all open. Anything that needs the network says so plainly |
| | **The phone itself** | |
| 13 | Add each of Purify's seven widgets to the home screen (hold an empty spot, then Widgets on Android or + on the iPhone), pick a look where it offers one, then tap it | Each shows today's real words in Purify's dark look, never an empty card, and opens its own screen: the verse in the Bible, the Calendar, the prayers, Today, your saint. The tip at the foot of Today (it waits two days after a first open) says how to add one. On the iPhone, the verse, Today in the Church, the streak and the countdown also go on the lock screen |
| 14 | Hold the Purify icon, and try each shortcut from a closed app and from the background | Each opens its own screen |
| 15 | Finish a prayer rule, then save a verse, then remove the save | One soft tick for each of the first two, never a buzz. Nothing for the removal |
| 16 | Open the build you are walking | It does not ask to be updated. Older apps are asked only once the store serves this build (`lib/appUpdate/release.ts`) |
| | **Store build only** | |
| 17 | Sign in with Google, and with Apple on the iPhone | You come back into the app, signed in |
| 18 | Tap a notification | It opens its screen |
| 19 | Signed in, with notifications on in Settings: wait for your next reminder, or ask for a test to your devices | It arrives on this phone as a banner, with the cross in the status bar |
| 20 | Sign out, then sign in (another account, if you have one) | Notifications stop while signed out, and come to the account now signed in |

## After

The download size the store shows for the build, if it shows one, is worth a
line too: it has never been written down anywhere else.
