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
    verse?: { text: string; ref: string; href: string };  // the Verse of the Day
  }>;
};

type WidgetDay = {
  saint: string;                        // the lead commemoration
  note?: string;                        // its one line, e.g. "†303"
  fastLabel: string;                    // "Wednesday fast", "No fast"
  fastKind: FastKind;                   // "none" when there is no fast
  season?: { theme: Theme; title: string; line: string };
  nextFast?: { name: string; date: string; days: number };
  nextFeast?: { name: string; date: string; days: number };
};

type Theme = "pascha" | "nativity" | "theophany" | "dormition" | "lent";
```

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

`labels` keys, all optional, English when missing: `verseOfTheDay`,
`todayInTheChurch`, `thisWeek`, `today`, `noFast`, `morning`, `evening`,
`morningPrayers`, `eveningPrayers`, `minutes` ("{n} min"), `prayedToday`,
`nextRuleAt` ("{rule} at {time}"), `dayStreak`, `keepIt` ("Pray or read today
to keep it."), `keptToday`, `coming`, `days`, `nextUpdate`, `soon`,
`mySaint`, `nameDayIn` ("Name day in {n} days"), `nameDayToday`,
`chooseSaint`, `openToRefresh`, `weekdaysShort` (seven, Sunday first).

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
