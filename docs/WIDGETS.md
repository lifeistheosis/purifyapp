# Purify's home screen widgets

Written 2026-10-14, when the owner kept the widgets in 1.6 ("dont push
anything that we finished into v1.7"). The designs are the approved mock,
https://claude.ai/artifact/EnMvUF5FChmFRpcFj6kjGL (source:
`Homebase/boards/purify-master/widgets/widgets.html`), in the Night look he
picked. This file is the contract between the three parts that build them:
the data the build bakes, what the app hands the widgets, and the widgets on
each phone.

## The seven families

A family is one entry in the phone's widget picker. Its variants are chosen
when it is placed (Android: a small configure screen; iPhone: Edit Widget).

| Family | Variants | Tap opens |
|---|---|---|
| Verse | Minimal (default), On Mosaic art | The verse in the Bible |
| Today | Saint and fast (default), The week, Rotating | The Calendar |
| Pray now | one: morning until 17:00, evening after | The rule, ready to begin |
| Streak | Number (default), Ring | Today |
| Countdown | Next fast (default), Next feast, Next Purify update | The Calendar (the update: What's New) |
| My saint | one: the reader's patron saint | That saint's page |
| Mosaic | The season (default), The cross, The lampada | Today |

Rules that hold for every one:

- Night look only (his pick on the mock, 2026-10-10): near-black card, paper
  text, the app's own fonts and tokens, red only for the streak and the
  update countdown's last days. Never gold or yellow.
- Every word comes from the app: the day's saint and fast from our calendar,
  the verse from the Verse of the Day, the labels in the app's language.
  Nothing is made up on the phone.
- No date arithmetic about the Church's calendar in Java or Swift. The build
  bakes each civil day's answers, in both reckonings; a widget looks up
  today's key and picks a side (lib/widget/dayTable.ts says why).
- Saint names stay English in every language, as in the app.
- No digital prayer rope, no counter widget (banned 2026-10-10).
- Icons: only those with cleared rights (`rightsCleared` in the data). The
  rest fall back to the text version.

## 1. What the build bakes: `widget-day-table.json`, version 3

`scripts/emit-widget-data.mjs` writes `public/widget-day-table.json`, which
lands in the app bundle (Android reads it from the APK's assets; the iPhone
extension carries its own copy). It holds 400 civil days from yesterday:

```ts
type WidgetDayTable = {
  version: 3;
  from: string;                         // first civil date, YYYY-MM-DD
  days: Record<string, {
    new: WidgetDay;                     // a New Calendar reader's day
    old: WidgetDay;                     // an Old Calendar reader's day
    verse?: {                           // the Verse of the Day
      text: string;
      ref: string;
      href: string;
      machine?: Record<string, { text: string; ref: string; note: string }>;  // TEMPORARY, below
    };
  }>;
};

type WidgetDay = {
  saint: string;                        // the lead commemoration
  note?: string;                        // its one line, e.g. "†303"
  fastLabel: string;                    // "Wednesday fast", "No fast"
  fastKind: FastKind;                   // "normal" or "fast-free" when there is no fast
  fastRule: FastRuleId;                 // the badge in the app's language: labels["fast." + fastRule]
  season?: { theme: Theme; title: string; line: string };
  nextFast?: { name: string; date: string; days: number };
  nextFeast?: { name: string; date: string; days: number };
};

type Theme = "pascha" | "nativity" | "theophany" | "dormition" | "lent";
```

`verse.machine` is TEMPORARY (lib/today/machineVerse.ts, from 1.7.1): the day's
verse machine-translated into a language that has no Bible in the app yet,
keyed by language code, with its reference in that language and already in
capitals by that language's rules ("LUKA 4:22"), and `note`, the shortest
honest form of its label ("Makine çevirisi", machine translation). A widget
shows it in place of the English only when the reader's language (the label
`language`, section 2) has an entry with both `text` and `note`, and then
always with the note on a line of its own under the reference. The tap still
opens the English verse in the Bible. Every other reader's widget is as it
was. It goes when the language has a public-domain Bible of its own.

`days` in nextFast and nextFeast is counted by the build from that civil day,
so a widget never subtracts dates. `season` is set only on the days a season
widget turns itself on: Pascha to the eve of the Ascension ("Christ is
risen!" / "Truly He is risen!"), the Nativity to the eve of Theophany
("Christ is born!" / "Glorify Him!"), Theophany to its leave-taking, the
Dormition to its leave-taking, and Great Lent ("Great Lent" / "Day 12 of
40"), each in the reader's reckoning. On other days the Season variant shows
the cross.

## 2. What the app hands the widgets

The app writes these when they change, and asks every widget to redraw.
Android: SharedPreferences `PurifyWidget`, through the `WidgetBridge` plugin.
iPhone: the App Group's UserDefaults, same keys, through the same plugin name.

The plugin has one method on both phones, `update({ entries })`, where
`entries` maps some of the keys below to string values (JSON already
stringified). It stores only these six keys, ignores any other, and then
redraws every placed widget. The app's side is `lib/widget/bridge.ts`; it
never calls the plugin on the website and never sends a value that has not
changed since the last call.

| Key | Value | Written when |
|---|---|---|
| `calendarStyle` | `"new"` or `"old"` | the reader's calendar setting changes, and on every open |
| `labels` | JSON object of label strings (below), in the app's language | the language changes, and on every open |
| `streak` | JSON `{ count, keptToday, week: boolean[7], on: "YYYY-MM-DD" }` | the streak changes, and on every open |
| `prayed` | JSON `{ morning: "YYYY-MM-DD" or null, evening: "YYYY-MM-DD" or null }` | a morning or evening rule is finished |
| `patron` | JSON `{ slug, name, nameDay: "YYYY-MM-DD", icon: "public/..." or null }` or absent | the reader's patron saint changes, and on every open |
| `update` | JSON `{ name, version, date: "YYYY-MM-DD" or null }` | on every open (from the packs when they carry one) |

A value a widget cannot read is treated as absent, and every widget has an
honest absent state ("Open Purify to see your streak", "Choose your saint in
Purify").

`labels` keys, all optional, English when missing. Every value is a plain
string the widget sets as it is, already in the app's language and already
filled in, so a widget never formats a sentence:

- Faces: `verseOfTheDay`, `todayInTheChurch`, `thisWeek`, `today`, `noFast`,
  `morning`, `evening`, `morningPrayers`, `eveningPrayers`,
  `morningMinutes` ("8 min"), `eveningMinutes`, `prayedToday`,
  `afterMorning` ("Evening prayers at 5 pm"), `afterEvening` ("Morning
  prayers tomorrow"), `dayStreak`, `keepIt` ("Pray or read today to keep
  it."), `keptToday`, `coming`, `days`, `day` (after the number one only), `today0` (what a countdown says on the
  day itself), `nextUpdate`, `soon`, `mySaint`, `nameDayToday`,
  `nameDayIn` (with `{n}` for the number of days, the one placeholder a
  widget fills), `chooseSaint`, `openToRefresh`, `openForStreak`.
- Dates: `weekdaysShort`, `monthsLong` and `monthsShort`, each one string
  joined with `|`, Sunday first and January first.
- The app's language: `language`, its code (for example "tr"), the one entry
  that is not a word to show. A widget reads it only to pick the day's verse
  in that language from the table's machine translations (section 1).
- The fast's badge: `fast.<rule>` for every rule id the table carries in a
  day's fastRule (the app's own calendar.fast.<rule>.label), so the chip is
  in the reader's language; the table's English fastLabel when one is missing.
- The configure screen: `variant.verse.minimal`, `variant.verse.mosaic`,
  `variant.today.day`, `variant.today.week`, `variant.today.rotating`,
  `variant.streak.number`, `variant.streak.ring`, `variant.countdown.fast`,
  `variant.countdown.feast`, `variant.countdown.update`,
  `variant.mosaic.season`, `variant.mosaic.cross`, `variant.mosaic.lampada`,
  `chooseLook` (the screen's title), `done`.
- Season words, when the app has them in its language (else the table's
  English): `season.pascha.title`, `season.pascha.line`,
  `season.nativity.title`, `season.nativity.line`, `season.theophany.title`,
  `season.theophany.line`, `season.dormition.title`, `season.dormition.line`.
  Lent sends none: its line counts the days and its theme also covers Palm
  Sunday and Holy Week, so those stay in the table's English.

`update` comes from `data/changelog/next-update.json` (`name`, `version`,
`date`, each null until the owner sets the next update). The content packs
carry the same file as their `release` pack (docs/PACKS.md), and the app
prefers the pack's copy, so a date set or moved there reaches the widgets
with a website deploy and no store build.

## 3. Tapping a widget

A tap opens the app at one screen through the shortcut path
(`ShortcutActivity` on Android): `net.purifyapp.purify://widget/<target>`.
The targets are fixed and checked by `lib/widget/open.ts`, the same way
`lib/shortcuts/shortcuts.ts` checks the icon shortcuts:

- `widget/verse/<book>/<chapter>/<verse>` (book and numbers checked)
- `widget/calendar`, `widget/today`, `widget/whats-new`
- `widget/pray/morning`, `widget/pray/evening`
- `widget/saint/<slug>` (slug checked against the saints the app knows)

Anything else opens Today.

## 4. Android

Package `net.purifyapp.purify.widget`. One provider per family, all sharing
`WidgetData` (reads the asset once and the preferences), `WidgetLooks`
(colours and text sizes), `WidgetClock` (today's key, and one inexact alarm
for the next local midnight, plus 17:00 for Pray now) and `WidgetRefresh`
(redraw every family). The old `DayWidgetProvider` keeps its class name, so a
widget a reader has already placed becomes the Today family's default variant
instead of disappearing.

Mosaic art is baked into drawables (`res/drawable-nodpi/mosaic_*.webp`) from
the mock's own engine, `widget-art.js`, so the phone draws a picture and never
runs the engine. A widget that cannot load its data says so plainly, never
shows an empty card.

## 5. iPhone

A WidgetKit extension (`ios/App/PurifyWidgets`), its own App ID and
provisioning profile, and an App Group shared with the app
(`group.net.purifyapp.purify`). It reads its own copy of the day table and the
App Group's UserDefaults. Lock screen widgets (iOS 16+): the streak ring, the
verse, the days to the next fast, and the saint. It cannot be built on the
Windows PC: it is proven by a CI build the owner starts and a walk on his
phone. Apple's side (App ID, App Group, profile) is set up by the owner; the
steps are in `docs/IOS_BUILD_SETUP.md`.
