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
| 11a | Set the phone to Arabic (from 1.9), open cold. Open John 1, the Morning Rule and a council's page | The bar, the tabs and the headings run right to left, in Arabic. Every block of English (the verses, the prayers, the council's account) runs left to right from the left edge, its full stops at the end of its lines and each verse's number at its left. With TalkBack on, a verse is read in an English voice |
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
| 19 | Signed in. First in the welcome questions (Settings, Testers, First open): on "A nudge to pray, morning and evening", tap Turn on reminders. Then wait for your next reminder, or ask for a test to your devices | The phone asks its question, then the two reminder cards appear. If it cannot, a sentence says so with Try again under it, never a button left on "…" (in Testers mode one more line says which wait it was). The reminder then arrives on this phone as a banner, with the cross in the status bar. On Android, say that it arrived: only then may the account card promise reminders there (`lib/onboarding/reminderPromise.ts`) |
| 20 | Sign out, then sign in (another account, if you have one) | Notifications stop while signed out, and come to the account now signed in |
| 21 | Before updating, with Plus, save a book to listen offline on the build you have. Update to this build, open it, turn on airplane mode, and play a saved chapter | It plays with no signal: a chapter saved before the update still plays after it. On the iPhone an update moves the app's folder, and the app finds each saved recording again at launch (`lib/readAloud/offline.ts`, checkSaved) |
| | **A chant kept on the phone (from 1.9).** The test app walks 22 to 25; 26 needs the 1.9 website live, with its admin. A browser cannot show any of it: only a phone writes the file and plays it back (`lib/chants/offline.ts`) | |
| 22 | With Plus, play a chant (Psalm 135 in English is a good one), leave its page, and open the player from the mini player | At the end of the title's line, the download mark with the size beside it (about 8.6 MB). Tapped, a ring fills, then the check stays. Tap the check: "Psalm 135 (English) is saved to listen offline" with Remove, over the controls. The ••• sheet's first row says the same |
| 23 | The same with an account without Plus (Android; on the iPhone Plus is open to every reader for now) | The mark opens the upgrade sheet on Listen offline, its line naming "a book's readings, or a chant". Nothing is saved |
| 24 | Airplane mode, swipe Purify away, open it cold, and play the saved version from the chant's page. Then Pray with chant, under a prayer | It plays from the start, its words lighting as it is sung; the versions not saved say "Plays with a connection". In Pray with chant the saved version can be chosen and previewed with no signal |
| 25 | Signal back on: in the player, tap the check, then Remove. Then airplane mode again | The mark comes back with its size, and the version says "Plays with a connection" again |
| 26 | **1.9 website live.** Save a version again, then in the admin (Content, chant takedowns) switch that recording off. On the phone, with a signal, swipe Purify away and open it, wait ten seconds, then open the chant. Switch the recording back on in the admin afterwards | The check is gone and the version says "Not available now"; with airplane mode on it does not play, so a recording taken down does not outlive the takedown on a phone that saved it. If it was playing when the list was read, the player is put away |
| | **The player outside the app, and what the app hands the widgets (1.9).** Until 1.9 neither reached the phone: each bridge handed its plugin back through a promise, which never settles (`lib/platform/nativePlugin.ts`). The test app walks all four; a browser cannot show any of them | |
| 27 | Android. Play a chant (Psalm 135 in English is a good one) and, once it sings, go to the home screen and pull down the shade; then lock the phone. Then the same with a chapter read aloud. Then open Purify, close the mini player, play a sound (Ambience, Rain) and leave again: pause it from the shade, play it, then stop it | Purify's player is in the shade and on the lock screen within a second or two: the name and the singer or reader, the cover, play or pause, and a bar you can drag to any point, and each answers. On Android 12 and older it also has 15 seconds back and forward (Android 13 and newer draw only play or pause there, and previous and next, which Purify has not got). It stays while the voice plays or is paused, and goes when the mini player is closed. A sound shows by its name, with no cover and no bar; pause stops it and keeps the player, play brings the same sound back, stop takes the player away (`lib/player/lockScreen.ts`) |
| 28 | iPhone. Play a chant, then lock the phone | The lock screen's Now Playing names the chant and its singer, with its cover; play, pause and the skip buttons answer, each skip 15 seconds, and the voice goes on with the screen locked. This is the web view's own, which 1.9 leaves as it was (`lib/prayers/persistentAudioStore.ts`) |
| 29 | Both phones. Bookmark a verse (in the Bible, tap a verse, then Bookmark verse) and open Today, where Remember the verse shows it. Add the Remember the verse widget to the home screen. Then look at the Streak and My saint widgets, with a prayer finished today and a saint chosen | The widget shows that verse's reference and the verse at the card's step, as Today's card does, never "Save a verse to remember it here". Streak shows your own count, and My saint your saint (`lib/widget/bridge.ts`) |
| 30 | Android. Close the mini player, so nothing plays, and leave Purify. Press play on headphones, or let a car connect. Then play a chant in Purify and press pause and play on the headphones | With nothing playing, the button does nothing in Purify, and Purify does not stop or say it has stopped, then or a little later. With the chant playing, the headphones pause it and play it (`media/PlayerButtonReceiver.java`) |
| 31 | Both phones. On You, under the verse (or on the Learn by heart card if nothing is kept), tap Change. Take a quote from the list; then Change again and type a line of your own; then Change and type a reference (John 3:16). Then open Today | Each one opens to practise at once and stands on You's card: a quote under whose words they are, opening its place in the book; your own line marked "Added by you" with no Share; the verse under its reference. Today's card asks the one chosen, with Change under it. Without Plus, Show the words carries the lock and choosing stays open |

## After

The download size the store shows for the build, if it shows one, is worth a
line too: it has never been written down anywhere else.
