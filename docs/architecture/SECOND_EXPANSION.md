# Second expansion: search, narration, typography, share

**UI/UX and systems architecture for categorised search, spoken reading,
accessible typography, and share cards.**

Status: specification. Nothing here is implemented.
Written 2026-08-11 against `05e171c9` on `release/1.1`.

---

## How to read this document

The brief that produced this document described four greenfield features. Three
of the four are not greenfield.

Search ships, with seven categories and a lazy corpus. Typography ships, with
four sizes, three families, three leadings and four palettes. Audio playback
ships, with a route-surviving singleton and MediaSession already wired. Only the
share card is genuinely new.

So the value of this document is the same as its predecessor's: being accurate
about what is there, what is broken, and what is actually missing. Every claim
carries a `file:line`. Every number was read or computed. Where a number is an
estimate, it says so.

**Section 0.2 is the part to act on first.** It records six defects already in
production, four of which are worth fixing whether or not anything else here is
ever built.

One instruction from the brief is not followed, and section 1.3 says why with a
measurement rather than an opinion.

---

## 0. Ground truth

### 0.1 What ships today

| Capability | Where | Notes |
|---|---|---|
| Command palette | `components/search/CommandPalette.tsx` | Cmd+K, 7 groups, lazy corpus fetch |
| Phone entry to search | `components/search/SearchTrigger.tsx` | Dispatches `purify:search-open`; landed in 1.1 (`32ed9def`) |
| Corpus as a static file | `app/search-corpus.json/route.ts` | `force-static`, lands at `out/search-corpus.json` |
| Dormant full-text | `lib/content/repository.ts:149` | `searchLibrary()`, `title LIKE ? OR body LIKE ?`; called only from tests |
| Reader size, font, leading | `components/reader/ReaderPrefs.tsx` | 4 sizes, 3 families, 3 leadings |
| Reading palettes | `lib/reader/readingModes.ts` | 4 themes; `FREE_THEMES` holds a public promise |
| Prefs persistence | `components/reader/ReaderPrefs.tsx:50-54` | localStorage + `useSyncExternalStore` + `purify:reader-prefs` |
| Audio singleton | `lib/prayers/persistentAudioStore.ts` | Module-scope `HTMLAudioElement`, never in the DOM |
| Persistent transport | `components/prayers/NowPlayingBar.tsx` | Mounted in the root layout, `--now-playing-h` contract |
| MediaSession | `persistentAudioStore.ts:113-132`, `:169-180` | play/pause/stop, title/artist/album |
| Audio ducking | `persistentAudioStore.ts:228` | `duckFor()`, the one cross-feature audio primitive |
| Text share | `components/ui/ShareButton.tsx` | `navigator.share` with a clipboard fallback |
| Selection and highlight | `docs/architecture/HIGHLIGHT_AND_FLORILEGIUM.md` | Agreed architecture, merged into 1.1 |

Measured, not assumed:

| Quantity | Value | How |
|---|---|---|
| Search corpus | 313 entries, 59,644 bytes | `out/search-corpus.json` |
| Corpus by group | Saints 144, Bible 77, History 40, Prayers 22, Councils and Heresies 18, Other 7, Topics 5 | same file |
| Corpus haystack | 23,803 characters, mean 76 per entry | `label + sublabel + keywords` |
| Anthem audio | 8,259,986 bytes for three files | `public/audio/` |
| Type scale | 11, 12, 13, 14, 17, 19, 22, 28, 32, 40, 48, 56 px | `app/globals.css:100-111` |
| Reader ladder | sm 14→17, md 17→19, lg 19→22, xl 22→28 px | `ReaderPrefs.tsx:60-72` |
| Tab bar token | `0px` at `:root`, `86px` under `html.is-native` | `globals.css:224`, `:277` |
| Now-playing token | `62px` web, `56px` native | `globals.css:239`, `:242` |

Native reality, because it decides section 2:

- `ios/App/App/Info.plist` has **no `UIBackgroundModes` key at all.**
- `android/app/src/main/AndroidManifest.xml` has **no `<service>` element** and
  no `FOREGROUND_SERVICE` permission. Its only permissions are `INTERNET` and
  `POST_NOTIFICATIONS`.
- The repo contains **no bespoke native plugin**. `AppDelegate.swift` and
  `MainActivity.java` are Capacitor boilerplate plus APNs forwarding and
  `EdgeToEdge.enable`.
- `@capacitor/share` and `@capacitor/filesystem` are installed and registered in
  gradle, and **neither is imported anywhere** in `lib/`, `components/` or `app/`.
- The Android FileProvider is already declared at `AndroidManifest.xml:36-44`,
  and `NSPhotoLibraryAddUsageDescription` is already in `Info.plist`. Share cards
  therefore need no new native configuration.

### 0.2 The defect register

Seven defects, each verified against the file. D1 through D4 and D7 are worth
fixing on their own merits, whether or not any feature in this document is ever
built. D7 costs two lines.

**D1. The lock screen has never worked, and on Android the API is not even
there.** `persistentAudioStore.ts:113-132` registers MediaSession handlers for
play, pause and stop, under a comment promising "the OS / lock screen /
Bluetooth controls can play/pause the anthem". Two independent reasons it does
nothing:

- **Android.** `navigator.mediaSession` is not implemented in the Android
  WebView at all. MDN browser-compat-data records `webview_android` as
  `version_added: false` for `MediaSession` (crbug 40611412). The whole block is
  dead code in the Android build, guarded into silence by its own
  `if ("mediaSession" in navigator)` check.
- **iOS.** The API exists in WKWebView, but `Info.plist` has no
  `UIBackgroundModes: audio`, so the audio session is torn down on lock
  regardless of what handlers are registered.

So the anthem stops when the phone locks on both platforms, and on Android it
would stop even with a background mode. This is the largest gap in the codebase
between what the code appears to do and what a reader experiences.

**D2. MediaSession never reports position.** `setPositionState` is called
nowhere in the repo. The OS scrubber shows no elapsed time and no duration, and
cannot be dragged. `seekbackward`, `seekforward` and `seekto` are not registered
either, which matters more for spoken word than for music.

**D3. Dismissing the player leaves a ghost on the lock screen.**
`unload()` at `persistentAudioStore.ts:266-280` pauses, clears `src`, and resets
the snapshot, but never nulls `navigator.mediaSession.metadata`. The OS keeps
showing the anthem after the reader has dismissed it.

**D4. The scorer rebuilds its entire index on every keystroke.**
`CommandPalette.tsx` `score()` calls `normalize()` on the label and on the
concatenated haystack per entry per keystroke, and constructs a fresh `RegExp`
per entry. That is 23,803 characters of NFD normalisation and 313 regex
compilations per character typed. Measured cost and the fix are in section 1.3.

**D5. Text scaling reaches two surfaces out of roughly seven.** The Size control
in `/settings` changes the Bible chapter reader and saints writings. It does not
change prayers, saint lives, theology, apologetics, heresies or topics. Prayers
are the app's primary surface. `components/prayers/PrayerRuleReader.tsx:390`
hardcodes `text-body` and does not import `useReaderPrefs` at all.

**D6. The app ignores the reader's own phone text size.** Every step of the type
scale is a hard px value in the `@theme` block (`globals.css:100-111`), and the
reader ladder swaps utility classes rather than scaling a root size. Setting an
iPhone or an Android phone to its largest accessibility text size changes
nothing in Purify. This is the first thing an accessibility reviewer checks and
it is currently absent.

**D7. The pricing page sells a palette that is free.**
`lib/premium/plans.ts:123` describes the Pro reading-modes perk as "Focus,
Candlelight, Monastery, and **Parchment** reading", and `:209` repeats it in
German. `lib/reader/readingModes.ts:43` puts `parchment` in `FREE_THEMES`, and
`lib/reader/__tests__/readingModes.test.ts` exists specifically to keep it
there, because Parchment is light mode and light mode was promised free on
2026-07-25.

So the pricing page currently contradicts the commitment that this very release
was written to honour. This is unrelated to all four features, costs one line in
each locale, and is the cheapest honesty fix available in the tree. It should
not wait for any of this work.

### 0.3 Three findings this document could not verify

1. **Whether licensed Scripture may be rendered into an image.** NKJV, NIV and
   NLT arrive from API.Bible behind `BIBLE_API_KEY`. Redistributing that text
   inside a generated image is a different grant from displaying it in the app.
   The terms were not located in `docs/licensing/`. Section 4.1 designs for the
   restrictive reading until someone reads the contract.
2. **The real cost of narration audio.** No narration exists yet, so the
   per-minute byte cost is extrapolated from the anthem, which is one voice at
   one bitrate. Section 2.2 labels that figure an estimate.
3. **Low-end phone CPU multiplier.** Section 1.3's phone figures apply a 5x
   slowdown to desktop measurements. That multiplier is a convention, not a
   measurement on Edgar's test devices.

---

## 1. Categorised search

### 1.1 What the brief asked for, against what is there

The brief asks for results bucketed into Scripture, Saints, Prayers and
Commentaries. Three of those four already exist as `SearchGroup` members in
`lib/search/types.ts`, and `GROUP_ORDER` already renders them in a fixed order
with display-serif group headings. The palette already groups.

`Commentaries` is the one genuinely missing bucket, and it is missing for a
structural reason rather than an oversight: Bible commentary is not a packaged
content type. `scripts/build-content-package.mjs` emits 1,008 records across
`bible_chapter`, `saint`, `saint_writing`, `feast`, `council`, `prayer`,
`theology`, `history_event` and `apologetics`. Commentary is none of them. On
native it survives only as pre-rendered HTML inside the static export, because
the chapter page is `dynamicParams = false` and `loadCommentary` runs at build
time. There is no record to index.

### 1.2 The real gap is depth, not categories

The corpus indexes `label`, `sublabel` and `keywords`. Nothing else. 196 of 313
entries carry keywords; 304 carry a sublabel.

Every builder loop confirms it. Bible pushes the book name and a chapter count.
Saints push name, epithet and byname, not `shortBio`, not `life`, not `works`,
not `quotes`. Prayers push title and description, never the prayer text.

So a reader can find the book of Habakkuk by typing its name, and cannot find
the verse they half-remember by typing four of its words. They cannot find a
saint by a phrase from their life, or a Father by a line from a homily. For an
app whose whole value is a body of text, the search index contains no text.

That is the gap worth closing, and it is not the gap the brief described.

The size of the gap, measured: the Bible commentary body alone is **19,544,441
characters**, against the 23,803 characters the palette scans today. That is
821 times the current haystack, and it is one of four content bodies. Any design
that routes it through the existing synchronous filter is wrong by three orders
of magnitude, which is what section 1.5 is for.

### 1.3 The threading instruction, answered with a measurement

The brief requires that filtering happen off the main thread, in a
`DispatchQueue` or a coroutine, to hold 60fps.

Neither primitive exists here. This is a Next.js static export inside a
WKWebView and an Android WebView; the available primitives are a Web Worker,
`useDeferredValue`, or time-slicing. So the question is whether any of them is
warranted.

Benchmarked against the real corpus, running the shipped `score()` verbatim:

| | Per keystroke |
|---|---|
| As shipped, 313 entries | **1.135 ms** |
| With haystacks precomputed and the regex hoisted | **0.027 ms** |
| Speedup | **41.9x** |

Against a 16.7ms frame that is 15x headroom as shipped. Applying a 5x low-end
phone multiplier (an estimate, see 0.3) gives roughly 5.7ms, which is a third of
a frame for a filter that runs while the user is typing. Not good, not a
dropped frame.

**A Web Worker is not justified, and would make things worse.** It adds a bundle
chunk, a message hop, and a structured-clone of results on every keystroke, to
move 1.135ms of work that a precompute removes 42x of for free. Ship the
precompute.

The corpus would have to reach roughly 4,600 entries on a desktop, or roughly
920 on a low-end phone, before the shipped scorer blew a frame. After the
precompute in 1.4 those figures rise by a factor of 42. Full-text commentary
would pass even the raised threshold on the first few chapters. **That is
exactly why full text must not go through this filter at all**, and section 1.5
routes it to SQLite instead, where the work happens off the JS thread by
construction. The brief's instinct was right; the mechanism it named was wrong
for this codebase.

Three further reasons a worker is the wrong tool here, each of which would have
been discovered late and expensively:

- **The origin the brief assumes does not exist on iOS.** Android serves the
  bundle from `https://localhost`; iOS serves it from `capacitor://localhost`, a
  custom scheme handled by `WKURLSchemeHandler`. `capacitor.config.ts` says so
  in its header comment, and `scripts/native-build.mjs` repeats it. A worker
  entry chunk and every module chunk it pulls become separate round trips
  through that scheme handler.
- **`requestIdleCallback` does not exist in WebKit.** It is behind a feature
  flag in Safari and unavailable in WKWebView, so an idle-time slicer is dead on
  iOS before it is written. The portable slicer is `MessageChannel`.
- **Neither native gate would catch a regression.** `npm run build:android` and
  `npm run build:ios` assert that the export completes, not that a worker chunk
  resolves at runtime. The first observation would be on a TestFlight device,
  which is the most expensive place in this project to observe anything.

`useDeferredValue` is worth adding, but be honest about what it does. It lets
the input paint the keystroke before the list re-renders. It does not move one
byte of work off the main thread, because a synchronous pass inside a `useMemo`
runs to completion uninterrupted. It converts "the input lags" into "the input
is instant and the list is one frame behind", which is the right trade, and it
is not a substitute for 1.4.

### 1.4 The precompute

Normalise once, when the corpus lands, not once per entry per keystroke.

```ts
// lib/search/types.ts

/** A corpus entry with its match surfaces pre-normalised. */
export type IndexedItem = SearchItem & {
  readonly nLabel: string;
  readonly nHay: string;
};
```

```ts
// components/search/CommandPalette.tsx

// Diacritic-folded once per corpus load. The palette used to fold every
// label and every haystack on every keystroke, which cost 1.135ms per
// character against 313 entries and would have grown linearly with the
// library. Folding here makes the per-keystroke pass 0.027ms.
function indexCorpus(items: SearchItem[]): IndexedItem[] {
  return items.map((item) => ({
    ...item,
    nLabel: normalize(item.label),
    nHay: normalize(
      `${item.label} ${item.sublabel ?? ""} ${item.keywords ?? ""}`,
    ),
  }));
}

function scoreIndexed(item: IndexedItem, q: string, wordStart: RegExp): number {
  if (item.nLabel.startsWith(q)) return 0;
  if (wordStart.test(item.nLabel)) return 1;
  if (item.nLabel.includes(q)) return 2;
  if (item.nHay.includes(q)) return 3;
  return -1;
}
```

The `wordStart` regex is built once per query in the `useMemo`, not once per
entry. That single hoist is most of the 42x.

`loadCorpus()` returns `IndexedItem[]` and `corpusCache` holds the indexed form,
so the cost is paid once per app open and shared by every mount, exactly as the
raw corpus is today.

### 1.5 Full text, and asynchronous categorisation

Two sources, one result list. The title source is synchronous and instant. The
body source is asynchronous and arrives late.

```ts
// lib/search/query.ts

export type ResultSource = "title" | "body";

export type QueryResult = {
  readonly item: SearchItem;
  readonly source: ResultSource;
  readonly rank: number;
};
```

Title matches come from the indexed corpus as above. Body matches come from
`searchLibrary()` in `lib/content/repository.ts:149`, which already exists,
already does `title LIKE ? OR body LIKE ?` against a `search_index` table, and
is currently called only from tests. `lib/content/schema.ts` records why it is
LIKE and not FTS5:

> FTS5 is not guaranteed on every backend, so search uses a plain indexed table
> plus LIKE, which is plenty for a bounded offline corpus; a true FTS index can
> land later without changing the repository contract.

That contract is the reason this is cheap. Wiring the palette to `searchLibrary`
does not commit the project to LIKE forever.

It is also the reason no worker is needed for the body source. On iOS and
Android, `@capacitor-community/sqlite` executes SQL on the native side: the JS
call is asynchronous and the query runs on a native thread. The work is already
off the WebView main thread, with no chunk plumbing, no custom-scheme risk, and
no second copy of the index in JS heap.

Three things to verify before committing to an FTS5 upgrade later, none
optional:

1. That the plugin's bundled SQLite is compiled with `SQLITE_ENABLE_FTS5`. It
   usually is. "Usually" is how this repo has been burned before.
2. **The web path is different and must be designed, not assumed.** On
   purifyapp.net the same plugin falls back to `jeep-sqlite`, which is sql.js
   compiled to wasm and runs on the main thread after downloading a wasm blob.
   One implementation does not cover both targets. Web should use a server-side
   search endpoint on the existing API tree, which is already stashed out of the
   export and called remotely.
3. The size of a prebuilt index against the store download budget, which
   section 2.2 shows is already tight.

Prerequisites, in order:

1. Add `commentary` as a record type in `scripts/build-content-package.mjs`, so
   commentary has a row to index. `lib/content/manifest.ts` already derives the
   search body from the record's `json` at import time via `searchBodyFor`, so
   the indexing itself is free once the record exists.
2. Add `Commentaries` to `SearchGroup` and to `GROUP_ORDER` in
   `lib/search/types.ts`.
3. Map `searchLibrary` record types onto `SearchGroup`.

The debounce is on the body source only. Title matches must never be debounced;
they are what makes typing feel instant.

```ts
// Body search runs against SQLite, which is off the JS thread already.
// Debounced because it is I/O, not because it is slow to compute.
useEffect(() => {
  const repo = repository;
  const q = query.trim();
  if (!repo || q.length < 3) {
    setBodyResults([]);
    return;
  }
  let alive = true;
  const id = setTimeout(() => {
    void repo
      .searchLibrary(q, { limit: 20 })
      .then((rows) => {
        if (alive) setBodyResults(rows.map(toQueryResult));
      })
      .catch(() => {
        // A body search that fails leaves the title results standing.
        if (alive) setBodyResults([]);
      });
  }, 180);
  return () => {
    alive = false;
    clearTimeout(id);
  };
}, [repository, query]);
```

**Two constraints that are easy to get wrong.**

`useRepository()` returns null on the web (`components/content/ContentProvider.tsx`).
The website keeps title-only search. Say so in the empty state rather than
letting a web reader conclude the library does not contain what they asked for.

Results must not reflow under the reader's thumb when the body source lands.
A group that is going to receive body results reserves its slot as soon as the
query is long enough to trigger one, and fills it in place. A row that moves
after a finger has started travelling toward it is worse than a row that arrives
late.

### 1.6 Accessibility

The palette is a `role="dialog"` with `aria-modal`. Axe runs in CI and will
block, so the additions are not optional:

- The input is `role="combobox"`, `aria-expanded`, `aria-controls` pointing at
  the list, and `aria-activedescendant` pointing at the active row's id. The
  arrow-key model already exists in `onKeyDown`; it is currently invisible to a
  screen reader because nothing announces the active row.
- The list is `role="listbox"`; each group is `role="group"` with
  `aria-labelledby` on its heading; each row is `role="option"` with
  `aria-selected`.
- A visually hidden `aria-live="polite"` region announces the result count, and
  announces again when body results arrive. Without it, an asynchronous second
  wave of results is silent.
- Every row id must be stable, because `aria-activedescendant` refers to it.

### 1.7 What not to do

Do not add a search library. `CONTRIBUTING.md` forbids dependencies without a
real need, the corpus is 313 entries, and the measured cost of the shipped
scorer after a precompute is 0.027ms. Fuse, FlexSearch, MiniSearch and Lunr all
solve a problem this app does not have.

Do not precompute a fuzzy index in `buildCorpus.ts`. Its own comment already
declines to, for the right reason.

---

## 2. Narration

### 2.1 What is being built, and what is not

The brief asked for device text-to-speech via `AVSpeechSynthesizer` and
`android.speech.tts`. That is not what this section specifies.

The operator is sourcing narration audio from ElevenLabs. So the feature is a
playback architecture over prerecorded files, which is the `studio-audio` perk
already sold in `lib/premium/plans.ts:125-130` as "Professionally narrated
Scripture, saints, and Orthodox History", marked `soon: true`. Device synthesis
appears only in 2.7, as a fallback for surfaces with no recording.

This changes the engineering less than it looks. Prerecorded audio and
synthesised speech need the same transport, the same lock-screen integration,
and the same route-surviving singleton. It changes the honesty questions a great
deal, and those are in section 6.

### 2.2 The constraint that shapes everything: narration cannot be bundled

Three anthem files are 8,259,986 bytes for roughly nine minutes. The app already
treats bundle size as a hard limit: `lib/gifts/chime.ts:5-9` synthesises a
single chime rather than sampling it because "the Android bundle is already far
too large", and `lib/ambience/ambience.ts` holds back a track for related
reasons.

The narration surface is 463 Bible chapters, 144 saints and 121 writings. At the
anthem's rate that is gigabytes (an estimate, see 0.3, but no plausible bitrate
brings it inside an APK).

So narration streams, and offline is opt-in per item. That is a different
posture from everything else in this app, which ships its content inside the
bundle and reads it locally. Two consequences must be designed rather than
discovered:

- `public/sw.js:126` returns early, without `respondWith`, for any path starting
  `/audio/`, because the Cache API rejects the 206 partial responses that range
  requests produce. Streaming narration is therefore never cached by the service
  worker. Downloaded narration goes through `@capacitor/filesystem`, not the SW.
- That check is a path prefix, not a content type. Narration served from any
  other path falls into the `staleWhileRevalidate` catch-all at `sw.js:156` and
  breaks on the first range request. **Every narration URL stays under
  `/audio/`.**

### 2.3 Extend the singleton, do not add a second one

`lib/prayers/persistentAudioStore.ts` owns one `HTMLAudioElement` at module
scope, never inserted into the DOM, which is what makes playback survive
navigation and unmounting. Its own header records the bug this replaced: an
`<audio ref>` inside a page component died mid-line the moment the reader
navigated away.

A second module-scope element would fight it for `navigator.mediaSession`, which
is global on `navigator` and has no per-element scoping.
`components/ambience/AmbienceController.tsx` is the existing precedent for a
second element, and it deliberately stays out of MediaSession entirely.

Narration goes through `setTrack`. That buys route-surviving playback, the
`NowPlayingBar` transport, and the `--now-playing-h` clearance contract that
four other fixed elements already honour, for free.

### 2.4 Store work

```ts
// lib/prayers/persistentAudioStore.ts

export type AudioSnapshot = {
  src: string | null;
  title: string | null;
  artist: string | null;
  playing: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  loopMode: LoopMode;
  /** Where the transport should return the reader. Narration is not the
   *  anthem, and NowPlayingBar hardcoded the anthem's route. */
  returnHref: string | null;
  /** Set for narration so the player can name the voice. The perk copy
   *  promises narration; the reader is owed the truth about its source. */
  voice: VoiceCredit | null;
};
```

Fixing D1 through D3, and generalising the bar:

- `setPositionState` on `loadedmetadata`, on `durationchange`, and after every
  seek. Without it the OS scrubber is inert.
- Register `seekbackward` and `seekforward` with a 15-second offset, and
  `seekto`. Spoken word needs a skip-back that music does not.
- Set `MediaMetadata.artwork`. Nothing sets it today, so the lock screen and any
  Bluetooth head unit show a blank tile.
- Null `navigator.mediaSession.metadata` in `unload()`.
- Set `navigator.mediaSession.playbackState` explicitly rather than letting the
  browser infer it.
- `NowPlayingBar.tsx:33` hardcodes `PLAYER_HREF = "/prayers/anthem"` and
  suppresses itself on that route. Both become `returnHref`-driven.
- Reuse `duckFor()` for coordination against the prayer rope bell rather than
  inventing a second scheme. `components/prayers/PrayerRope.tsx:114` is the
  precedent.

### 2.5 The native work

This would be the first bespoke native code in the repo. It is small, and it is
the only way D1 gets fixed.

**iOS.** `Info.plist` gains:

```xml
<key>UIBackgroundModes</key>
<array>
  <string>audio</string>
</array>
```

and `AppDelegate.swift` gains an audio session. `.spokenAudio` is the correct
mode for narration and changes how the system ducks other apps against it:

```swift
import AVFoundation

private func configureAudioSession() {
  // Narration must survive the lock screen. Without an active .playback
  // session the WebView's audio is torn down on background, which is why
  // the MediaSession handlers in persistentAudioStore have never worked.
  do {
    try AVAudioSession.sharedInstance().setCategory(
      .playback,
      mode: .spokenAudio,
      options: []
    )
    try AVAudioSession.sharedInstance().setActive(true)
  } catch {
    // A failed session must not take the app down. Playback degrades to
    // foreground-only, which is exactly today's behaviour.
  }
}
```

**Android.** More work than iOS, because `navigator.mediaSession` does not exist
in the Android WebView (D1). Everything the lock screen shows must come from a
native `MediaSession`, so the web layer's MediaSession calls are iOS-only and
Android needs a real bridge.

The manifest gains the permissions and a typed service. Android 14 rejects a
media foreground service that does not declare its type:

```xml
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />

<service
    android:name=".NarrationService"
    android:foregroundServiceType="mediaPlayback"
    android:exported="true">
  <intent-filter>
    <action android:name="androidx.media3.session.MediaSessionService" />
  </intent-filter>
</service>
```

`NarrationService` extends `androidx.media3.session.MediaSessionService`, which
builds and maintains the media-style notification and manages `startForeground`
itself. **The trap**: from Android 13 the system derives the lock-screen buttons
from `PlaybackState` actions, and a custom player must declare metadata commands
or the notification silently never appears at all. Include
`COMMAND_GET_CURRENT_MEDIA_ITEM` and `COMMAND_GET_METADATA` alongside
`COMMAND_PLAY_PAUSE`, `COMMAND_STOP` and the seek commands. A missing metadata
command produces no error and no notification, which is the worst possible
failure shape.

Audio focus is manual. media3 handles focus for ExoPlayer, not for a player
wrapping the WebView's audio, so `AudioManager.requestAudioFocus` with an
`OnAudioFocusChangeListener` is the app's job.

`POST_NOTIFICATIONS` is already declared at `AndroidManifest.xml:53` for the
push plugin, and the only other permission is `INTERNET` at `:49`. Useful
nuance: media-session notifications are exempt from the Android 13
`POST_NOTIFICATIONS` denial behaviour, so a reader who refuses prayer reminders
still gets working lock-screen transport.

**One owner rule.** The anthem and narration must go through the same native
media-session bridge. Two independent Now Playing owners fight over one
lock-screen slot, and the loser is whichever registered first.

**Both changes alter store review posture.** Section 5 sequences them last for
that reason, and section 6 asks the operator to confirm the timing.

### 2.6 Chunking the text

Needed for follow-along highlighting, and for the fallback. The content shapes
differ per surface and one is hostile.

| Surface | Shape | Anchor | Verdict |
|---|---|---|---|
| Public-domain Scripture | `Verse[] { n, text }`, `lib/bible/load.ts` | `#v{n}` exists | Ideal. `verse.text` is the clean source string |
| Saints writings | `Section.paragraphs: string[]`, `lib/saints/load.ts` | `#p-{section}-{idx}` exists | Ideal |
| Theology, apologetics | `EssayBlock[]` discriminated union, `lib/theology/load.ts` | needs anchors | Clean. Skip `heading` and `list` or read them differently |
| Prayers | one string, `\n\n` stanzas, `whitespace-pre-line` | none | Split the source string, not the DOM |
| Licensed Scripture | opaque `dangerouslySetInnerHTML` | none | Must walk the DOM excluding `.f`, `.x`, `.lic-f`, `.lic-x` |

Three traps:

1. **Read from source data, never from the DOM.** Works with 20 or more sections
   accordion-collapse (`ACCORDION_THRESHOLD = 20` in
   `components/saints/WritingReader.tsx`), so only expanded sections exist in
   the DOM. A DOM-based reader would narrate a fraction of a homily and stop.
2. **Licensed Scripture will read its own footnotes aloud** if the extraction is
   naive. The USX markup interleaves footnote and cross-reference bodies with
   verse text, and a `useEffect` only relocates them after hydration.
3. **Strong's-tagged verses are split into per-word spans**, so `innerText` picks
   up verse numbers. `verse.text` is the string to use;
   `components/bible/VerseRow.tsx:185` already relies on it for copy.

### 2.7 The device-speech fallback

Only for surfaces with no recording, and only behind an explicit reader choice.

**There is no web speech fallback on Android.** MDN browser-compat-data records
`SpeechSynthesis` as `version_added: false` for `webview_android`
(crbug 40417848), and the Android WebView is exactly what Capacitor runs. Any
plan that lists `window.speechSynthesis` as the cross-platform fallback is
wrong on half the readership.

On iOS, `speechSynthesis` does exist in WKWebView and proxies to
`AVSpeechSynthesizer`, but it is a degraded in-app-only mode: no lock-screen
entry, silenced by the ringer switch because JavaScript cannot touch
`AVAudioSession`, and killed on lock. `getVoices()` also returns empty until
`voiceschanged` fires, so any voice picker must wait on that event rather than
reading synchronously on mount.

So the honest fallback matrix is: iOS gets degraded in-app speech, Android gets
nothing until a native `TextToSpeech` path is written. The UI must say which,
rather than offering a control that does nothing on half the devices.

If a native speech path is ever written, note that the obvious off-the-shelf
option does not help: `@capacitor-community/text-to-speech` sets
`usesApplicationAudioSession = false` on iOS, which bypasses the app's audio
category entirely, and its documented `category` parameter is accepted and never
used. Its Android half is a bare wrapper with no service, no session and no
audio focus. It is the opposite of what this design needs, not a head start.

### 2.8 Leak and lifecycle safeguards

The brief asked for these specifically. Each is a real mechanism in this
codebase, not a generic caution.

| Hazard | Mechanism | Guard |
|---|---|---|
| Duplicate audio elements | A second module-scope element competes for the global `navigator.mediaSession` | One element. Narration goes through `setTrack`. A doctrine test asserts a single `new Audio(` in `lib/` |
| Re-render storm | `update()` allocates a fresh snapshot per patch and `timeupdate` fires roughly 4x/sec, waking every `useSyncExternalStore` subscriber | Fine for one bar. A per-paragraph follow-along must NOT subscribe to the snapshot; it reads position from a separate throttled channel |
| Autoplay on mount | An effect that calls `setTrack` then `play()` | `setTrack` never plays. Playback starts from a reader gesture only. Doctrine test in 5.3 |
| Orphaned transport | Route change leaves `returnHref` pointing at a page the reader left | `returnHref` is set with the track, not read from `usePathname` at render |
| Ghost lock-screen entry | `unload()` does not clear metadata (D3) | Null `mediaSession.metadata` and `playbackState` in `unload()` |
| Stuck audio route | An `AVAudioSession` left active holds the route and can keep other apps ducked | Deactivate with `.notifyOthersOnDeactivation` when nothing is loaded |
| Foreground service outliving playback | Android kills the app if a foreground service has no valid notification | Service starts on play, stops on pause, stop and unload. Never started from a React effect |
| WebView destroyed mid-playback | Native keeps speaking into a dead bridge | Service and session tear down on `onDestroy` and `applicationWillTerminate` |
| Unbounded utterance queue | Queuing a whole chapter of utterances holds every string live | Queue the current chunk plus one. Refill on `onend` |
| `speechSynthesis` fires `onend` during teardown | Chrome calls `onend` from inside `cancel()`, so a handler that advances the queue restarts it | Detach `onend` before `cancel()`, then cancel |
| Effect starts speech and never stops | Route change or unmount leaves speech running | `speechSynthesis.cancel()` in the effect cleanup and on `pathname` change |
| Window listener per mount | `SEARCH_OPEN_EVENT` and `purify:reader-prefs` precedent | Every `addEventListener` returns its `removeEventListener` from the same effect |

Two native-specific rules for any future bespoke plugin:

- `AVSpeechSynthesizer` holds its delegate **strongly**. The delegate's back
  reference to its owner is `weak`, or the plugin never deallocates.
- Android `TextToSpeech` takes `applicationContext`, never the Activity, and
  needs an explicit `shutdown()`. Passing the Activity leaks it across every
  rotation.

### 2.9 Delivery and offline

Streams from a CDN under `/audio/`. Offline is per item, written through
`@capacitor/filesystem` to `Directory.Data`, with the size shown before the
download starts and a visible way to delete it. Never automatic, never a
background prefetch. The ethos in `CONTRIBUTING.md` is quiet by default, and
silently consuming a reader's storage and data is not quiet.

---

## 3. Typography and text scaling

### 3.1 What ships, measured

`components/reader/ReaderPrefs.tsx` already provides four sizes, three families,
three leadings, focus mode, and four palettes, persisted to localStorage and
read through `useSyncExternalStore` with a `purify:reader-prefs` broadcast. This
is the cleanest state pattern in the codebase and everything below reuses it
rather than adding a second store.

| Step | Mobile | Desktop | Leading |
|---|---|---|---|
| sm | 14px | 17px | 1.55 |
| md | 17px | 19px | 1.60 |
| lg | 19px | 22px | 1.65 |
| xl | 22px | 28px | 1.70 |

Families are Lora (`serif`), DM Serif Display (`display`) and DM Sans (`sans`),
all via `next/font/google`, with per-script Noto fallbacks loaded `preload: false`
and gated by unicode-range. Leadings are `undefined`, `1.9` and `2.15`.

Against the brief's 12pt to 32pt request, at 1pt = 1.333px, the ask is 16px to
43px. Mobile currently spans 14px to 22px, desktop 17px to 28px. The top of the
range is the real shortfall, and it lands hardest on exactly the readers who
asked for light mode.

### 3.2 The decision: named ladder plus a system link

Three options were put to the operator: extend the named ladder, replace it with
a continuous 12pt to 32pt slider as briefed, or extend the ladder and add a
system link. **Option three.**

The reason is this project's own precedent rather than general merit.
`lib/reader/__tests__/readingModes.test.ts` exists to hold a promise made
publicly on 2026-07-25, that light mode stays free because "being able to read is
not a premium feature". A reader who has already set their phone to its largest
text size has told the operating system they need help reading. Only the system
link hears them. A continuous slider does nothing for that reader if the app
ignores the setting they already made, which is D6.

It is also the cheaper option: it keeps the store, the buttons, and every
`SIZE_CLASSES` consumer, where a continuous slider rewrites all of them and
retires the `text-*` tokens as a description of reader body text.

### 3.3 The design

Two steps are added to the ladder, and one boolean is added to the store.

```ts
// components/reader/ReaderPrefs.tsx

export type ReaderSize = "xs" | "sm" | "md" | "lg" | "xl" | "xxl";

// Scale (mobile → desktop): xs 12→14 · sm 14→17 · md 17→19
//                           lg 19→22 · xl 22→28 · xxl 28→34
export const SIZE_CLASSES: Record<ReaderSize, string> = {
  xs: "text-caption md:text-ui leading-[1.5]",
  sm: "text-ui md:text-body leading-[1.55]",
  md: "text-body md:text-lede leading-[1.6]",
  lg: "text-lede md:text-title-sm leading-[1.65]",
  xl: "text-title-sm md:text-title leading-[1.7]",
  xxl: "text-title md:text-reader-xxl leading-[1.75]",
};

const SYSTEM_SCALE_KEY = "purify.reader.systemScale";
```

`--text-reader-xxl: 34px` is a new token in the `@theme` block. `xs` reuses
existing tokens and needs none.

The system link multiplies the resolved step by the OS text scale, applied as a
root variable so it composes with the class-based ladder instead of replacing
it:

```ts
/**
 * The reader's own accessibility text size, as a multiplier.
 *
 * The type scale is hard px in the @theme block, so an OS text-size setting
 * changes nothing in Purify today. This reads the ratio the platform reports
 * and publishes it as --reader-scale; app/globals.css multiplies the reader
 * surfaces by it. Default off: a reader who already chose a step should not
 * have it silently doubled on first launch after an update.
 */
function readSystemScale(): number {
  if (typeof window === "undefined") return 1;
  const vv = window.visualViewport;
  if (!vv) return 1;
  // Clamped: a 3x system scale against xxl would render one word per line.
  return Math.min(1.6, Math.max(1, vv.scale === 0 ? 1 : 1));
}
```

The exact platform read is the one piece of this section that needs a device
before it is written. `window.visualViewport.scale` reports pinch zoom, not
Dynamic Type, and Android's `fontScale` is not exposed to a WebView at all
without a native shim. Section 6 asks whether a small native read is acceptable,
because the honest answer is that a correct system link needs one on Android.

### 3.4 Extending the reach (D5)

`useReaderPrefs()` is applied at the container, and children inherit. The
existing pattern in `components/bible/ChapterReader.tsx` is the one to copy:

```tsx
<article
  className={cn("text-paper/90", FONT_CLASSES[font], SIZE_CLASSES[size])}
  style={leadingValue ? { lineHeight: leadingValue } : undefined}
>
```

Apply the same container to `components/prayers/PrayerRuleReader.tsx` (which
currently hardcodes `text-body` at line 390 and does not import the hook),
`components/saints/LifeSection.tsx` and its `Miracles`, `Quotes` and `Titles`
siblings (which hardcode `text-lede`), and the theology and apologetics essay
renderers. Remove the hardcoded size class from the children, because a size on
the child wins over the container and is exactly why these surfaces are dead
today.

### 3.5 Container adaptation

The brief's explicit ask, and the part most likely to break.

First, a correction worth recording, because it would otherwise be re-fixed:
`--tab-bar-h` is **not** a flat token at `:root`. Commit `213290b6` in this
release already fixed that. It is `0px` at `:root` (`globals.css:224`) and
`86px` only inside `html.is-native` (`:277`), and the comment above it forbids
reversing that. The remaining hazard is narrower and still real.

| Constraint | Where | What breaks under scale |
|---|---|---|
| `--tab-bar-h: 86px` under `html.is-native` | `globals.css:277` | The real bar is `h-[58px]` per tab (`MobileTabBar.tsx:248`) plus padding, with a `text-caption` 12px label under `truncate` (`:275`). If chrome text scales, the bar exceeds 86px and `.safe-pb` under-clears, so the last verse hides behind it |
| `.below-topbar: calc(3rem + inset)` | `globals.css:358` | Keyed to a 48px bar whose title is `text-ui` 14px with `truncate` |
| `.below-topbar-line: calc(80px + inset)` | `globals.css:363` | Same, plus a roughly 32px context strip |
| `.sticky-safe-top: calc(72px + inset)` | `globals.css:345` | Keyed to a 72px `AppNav` |
| `sticky top-[88px]`, `max-h-[calc(100dvh-104px)]` | chapter page study rail | Two hardcoded offsets in one declaration |
| `--now-playing-h: 62px / 56px` | `globals.css:239`, `:242` | Comment derives 56px from "a 40px transport button inside py-2". A scaled title line grows the card |
| `min-h-screen` rather than `dvh` | 12+ prayer and settings routes | iOS URL-bar resize, worst in landscape |

**The invariant.** Every one of these is a measurement of a chrome element
expressed as a constant. The fix is to stop guessing the measurement:

```css
/* The bar reports its own height while it paints, the same idiom
   NowPlayingBar already uses for --now-playing-h and CartFab for
   .has-cart-fab. A constant cannot track a bar whose label scales. */
html.is-native {
  --tab-bar-h: 86px; /* fallback only, until the bar reports */
}
```

`MobileTabBar` sets `--tab-bar-h` from a `ResizeObserver` on its own root, in
the same effect that mounts it, and clears it on unmount. `MobileTopBar` does
the same for a new `--topbar-h`, and `.below-topbar` and `.below-topbar-line`
resolve against it. The four floating elements that already share the formula
`calc(var(--tab-bar-h) + var(--now-playing-h) + env(safe-area-inset-bottom) + 12px)`
need no change at all, which is the point: the contract is already correct, only
its inputs are stale.

Preserve the 16px mobile input floor in `globals.css`. It prevents iOS zooming
the page on focus, and raising the reader scale must not remove it.

### 3.6 Where the controls live

Today the size, font, leading, focus and theme controls exist both as toolbar
pills and in `/settings` via `components/settings/SettingsClient.tsx`. The
settings page already has `Section`, `Row`, `Choice` and `LinkRow` primitives
and a stated rule that nothing needing no account sits behind a sign-in.

Add one `Reading and accessibility` section there containing the ladder, the
family, the leading, the system link, and the narration voice choice. Keep the
toolbar pills; they are the in-context control and removing them would cost
readers a fast path they already have.

---

## 4. Share cards

### 4.1 The licensing gate comes first

This can block the feature, so it is settled before any pixel is drawn.

Public-domain Scripture, saint lives drawn from established hagiographies, and
patristic texts under the project's existing licences are the safe set. NKJV,
NIV and NLT arrive from API.Bible behind `BIBLE_API_KEY` and render as opaque
HTML through `components/bible/LicensedChapterReader.tsx`. Baking that text into
a redistributable image is a different grant from displaying it in the app, and
the terms were not located in the repo (see 0.3).

Until someone reads the contract, the renderer permits public-domain sources
only:

```ts
// lib/share/eligibility.ts

export type ShareEligibility =
  | { readonly ok: true }
  | { readonly ok: false; readonly reasonKey: string };

/**
 * Whether a passage may be rendered into a shareable image.
 *
 * Displaying licensed Scripture in-app and redistributing it inside a PNG are
 * different grants. Until the API.Bible terms are read and recorded in
 * docs/licensing/, the image path is public-domain only. The card degrades to
 * a text share rather than disappearing, because a dead control is worse than
 * an honest one: HIGHLIGHT_AND_FLORILEGIUM.md D1 records a gather button that
 * silently did nothing, and one of those is enough.
 */
export function canRenderToImage(source: PassageSource): ShareEligibility {
  if (source.kind === "licensed-scripture") {
    return { ok: false, reasonKey: "share.licensedTextNotImageable" };
  }
  return { ok: true };
}
```

The UI reads that: on a licensed translation the image action is replaced by the
existing text share, with a one-line explanation. It is never a no-op.

### 4.2 This is one action on an existing toolbar

Selection, the long-press toolbar, the five-colour highlight palette and the
Florilegium all ship, and `docs/architecture/HIGHLIGHT_AND_FLORILEGIUM.md` is
the agreed architecture already merged into this release. Read it before
touching selection. The share card is a new entry in
`components/bible/MobileVerseToolbar.tsx` and its desktop counterpart, not a new
subsystem.

Attribution reuses `lib/citations/`. Do not compose an attribution string by
hand: the citation layer already knows how to name a Scripture reference, a
saint's life, and a Father's homily with its edition and year, and the editorial
standards in `AGENTS.md` require exactly that.

### 4.3 Rendering

Canvas 2D, no new dependency. `next/og` `ImageResponse` is server-side and
cannot run under `output: "export"` in the native bundle, so `app/icon.tsx` is
not a reusable precedent here.

```ts
// lib/share/renderCard.ts

const CARD = { w: 1080, h: 1350 } as const;

/**
 * Fonts must be loaded, with the actual text, before the first draw.
 *
 * Two compounding reasons the naive version fails silently. Canvas never
 * triggers a font fetch, so a family that has not painted in the DOM is not
 * loaded. And next/font emits @font-face with unicode-range, so a reader who
 * has only ever seen Latin text has never fetched the Greek subset at all.
 *
 * Passing the string as the second argument is what makes load() fetch the
 * subsets that string actually needs. document.fonts.ready alone is not
 * enough: it resolves against fonts already requested, and a subset nobody
 * requested is never requested.
 */
async function ensureFonts(text: string, specs: string[]): Promise<boolean> {
  if (!("fonts" in document)) return false;
  await Promise.all(specs.map((spec) => document.fonts.load(spec, text)));
  await document.fonts.ready;
  // Abort rather than ship a card in the system serif. A wrong-font card is
  // indistinguishable from a correct one to the code and obvious to a reader.
  return specs.every((spec) => document.fonts.check(spec, text));
}

/** Canvas has no text wrapping. Segment on words, measure, break on width.
 *  Intl.Segmenter rather than /\s+/ because the corpus is not all
 *  space-delimited, and never break inside a grapheme cluster: that orphans a
 *  combining diacritic, which polytonic Greek carries throughout. */
function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  locale: string,
): string[] {
  const seg = new Intl.Segmenter(locale, { granularity: "word" });
  const lines: string[] = [];
  let line = "";
  for (const { segment } of seg.segment(text)) {
    const next = line + segment;
    if (ctx.measureText(next).width > maxWidth && line.trim()) {
      lines.push(line.trimEnd());
      line = segment.trimStart();
    } else {
      line = next;
    }
  }
  if (line.trim()) lines.push(line.trimEnd());
  return lines;
}
```

Four constraints, ordered by how quietly each one fails:

- **Never scale by `devicePixelRatio`.** The output is a file, not a screen, so
  render at a fixed absolute size. 1080 by 1350 is 1,458,000 pixels, comfortably
  inside WebKit's canvas area ceiling of 16,777,216. Multiplying a CSS box by a
  3x ratio is exactly how a card lands over that ceiling, and iOS returns an
  empty blob from `toBlob` **without throwing**. Assert both dimensions and the
  area before allocating.
- **Gate on `document.fonts.check`.** A card rendered in the fallback serif
  produces no error and no console warning. It is the single most likely defect
  in this feature and the only one a reader will notice before the developer
  does. Warm the fonts when the share sheet opens, not at the moment of draw, so
  the first card a reader ever makes is not the one that fails.
- **`toBlob`, not `toDataURL`.** The former is asynchronous; the latter builds
  the entire base64 string on the main thread.
- **OffscreenCanvas is unavailable, not merely unwise.** The iOS deployment
  target is `15.0` (`ios/App/App.xcodeproj/project.pbxproj`), below the 16.4
  floor for OffscreenCanvas in WKWebView, and a worker's font set cannot see
  document `@font-face` rules in any case. Render on the main thread in a single
  frame; the draw is one pass over a few hundred glyphs and does not need a
  worker despite the brief's "background utility" phrasing.

Use `TextMetrics.actualBoundingBoxAscent` and `actualBoundingBoxDescent` for
vertical rhythm rather than the nominal font size, or Greek with high diacritics
will collide with the line above it.

Brand tokens, read from `app/globals.css`: `--color-night #101013`,
`--color-night-soft #1d1d20`, `--color-gold #eaeaec`, `--color-festal #d4af37`.
Note that `--color-gold` is a near-white neutral despite its name; `--color-festal`
is the real liturgical gold and is the better accent for a card.

No imagery is baked into a card unless it carries a rights record.
`lib/saints/iconRights.ts` and `scripts/audit-icon-rights.mjs` are the existing
machinery, and the debt is real: of 110 files in `public/saints/icons/`,
`ICON_RIGHTS` settles 3 and `UNVERIFIED_ICONS` records 107. A card ships on type
and colour alone until that changes.

This is also the standing rule that no auto-sourced image ships without being
opened and looked at. `docs/licensing/icon-provenance.md` is the policy;
`iconRights.ts` is the data, and duplicating rows into the document is
explicitly forbidden there.

### 4.4 Handoff to the share sheet

```ts
// lib/share/shareCard.ts

export async function shareCard(blob: Blob, filename: string): Promise<void> {
  if (isNativeClient()) {
    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    const { Share } = await import("@capacitor/share");
    // Share needs a file URI, not a data URI. Cache, not Data: the OS may
    // reclaim it, which is correct for something already handed off.
    const written = await Filesystem.writeFile({
      path: filename,
      data: await blobToBase64(blob),
      directory: Directory.Cache,
    });
    await Share.share({ files: [written.uri] });
    return;
  }

  const file = new File([blob], filename, { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file] });
    return;
  }
  downloadFallback(blob, filename);
}
```

The plugin import is dynamic and inside an `isNativeClient()` guard, matching
`components/native/NativeBridge.tsx:10-12`: the JS proxies are safe to import on
the web but every call throws there.

Verified prerequisites, so none of this needs native work:
`android/app/src/main/res/xml/file_paths.xml` already declares
`<cache-path name="my_cache_images" path="." />`, which is exactly what makes a
`Directory.Cache` file shareable through the FileProvider at
`AndroidManifest.xml:36-44`. `NSPhotoLibraryAddUsageDescription` is already at
`Info.plist:61` for the iOS save-to-Photos path.

Two rules that follow from the plugin's actual behaviour:

- `Share.share` rejects data URIs. The file must be written first and the
  returned `uri` passed through unchanged. Do not reconstruct the path.
- Do not feature-detect into `navigator.share({ files })` on native. Call the
  plugin unconditionally when `isNativeClient()` is true, and keep the existing
  `ShareButton.tsx` web path for browsers. The Android WebView's `navigator.share`
  is the surface that produced the inconsistency `VerseCardActions.tsx:138`
  already documents.

`components/today/VerseCardActions.tsx:138` deliberately bypasses
`navigator.share` for the text action because support was inconsistent across
platforms. That decision stands for text. The image action is native-first
through the plugin, which is why it does not inherit the same problem.

### 4.5 Card layout

1080 by 1350, the portrait ratio that survives every feed and message thread
without a re-crop.

| Zone | Content | Type |
|---|---|---|
| Top margin | 96px | |
| Body | The passage, Lora, wrapped | 64px, leading 1.45, max 9 lines |
| Rule | Hairline, `--color-festal` at 40% | 1px, 120px wide |
| Citation | From `lib/citations/` | DM Sans 32px, `--color-gold` at 70% |
| Voice credit | Only when the card came from a narration surface | DM Sans 26px |
| Footer | `purifyapp.net` | DM Sans 28px, 55% opacity |
| Bottom margin | 96px | |

Overflow truncates at nine lines with an ellipsis and the citation still
renders, because a card without attribution is the one output that must never
exist. At thumbnail size in a message list the citation is the only legible
element, so it carries the most contrast after the body.

### 4.6 The ethos boundary

The brief filed share cards under "user engagement". `CONTRIBUTING.md` is quiet
by default and forbids growth-hack telemetry and pressure mechanics. Both can be
true, and the line is specific:

Permitted: a reader makes a card because they want to send it to someone.

Forbidden, explicitly: a share counter, a "shared N times" label, a prompt to
share, a badge or red dot on the share action, any analytics event fired on
share, any streak or reward for sharing, and any watermark beyond the quiet
footer above.

---

## 5. Phasing and QA

### 5.1 Order

All four land in 1.1 at the operator's instruction. Within that, ordered by
risk rather than by value:

1. **Typography, and the chrome-token conversion.** No native change. It de-risks
   everything after it, because narration and share both add chrome to the same
   bottom band.
2. **Search.** The precompute first, since it is a pure win and independent.
   Then `Commentaries` as a content-package record type, then the async
   `searchLibrary` source.
3. **Share cards.** Licensing gate, renderer, share sheet, in that order.
4. **Narration.** Native changes last, so both store builds are exercised once
   against a settled web layer.

The release ritual in `AGENTS.md` bumps six version identifiers and requires
that patch notes not claim anything dark in production. Narration behind an
unset CDN or an unapplied entitlement is dark.

**One clarification about what 1.1 currently is**, because it is easy to get
backwards. All six identifiers were bumped to 1.1 in commit `95556c15`, and the
changelog letter exists in `data/changelog/patches.json`. But `release/1.1` is
36 commits ahead of `main` and unpushed, and `lib/appUpdate/release.ts` holds
`androidVersionCode: 0` and `iosBuildNumber: 0`, which `AGENTS.md` defines as
"prompt nobody" and "the correct resting state for an unreleased branch". So 1.1
is written, not shipped. Adding to it is a question of editing an unpublished
letter, not of amending a published one.

That said, the 1.1 letter is titled "What was already built, and not reaching
you" and spends fourteen sections handing over work that already existed. Four
net-new features sit oddly under that framing. Section 6.5 puts the numbering
question to the operator rather than deciding it here, because the instruction
was explicit.

### 5.2 The four-step layout scaling checklist

**Step 1. Maximum in-app step crossed with maximum OS text size.**
Set the reader ladder to `xxl`, enable the system link, and set the phone itself
to its largest accessibility text size. On a real iPhone and a real Android,
visit `/bible/genesis/1`, `/prayers/morning`, `/saints/[slug]`,
`/theology/[topic]`, `/settings`, and `/search` with the palette open.
Pass: no clipped glyph, no horizontal scroll anywhere, every interactive control
still at least 44px, and the `/settings` rows still readable as label plus value
rather than collapsing into each other.
Failure signature: a truncated tab label, or a settings row whose value wraps
under its label and pushes the next row off screen.

**Step 2. Fixed-chrome collision.**
Same maximum settings, with narration playing so `--now-playing-h` is non-zero
and the native tab bar rendered. Scroll to the very end of a long chapter.
Pass: the final verse clears both bars with the 12px the shared formula
promises. Measure the tab bar's real rendered height and compare it against the
86px token; they must now agree because the bar reports its own.
Failure signature: the last verse sits under the now-playing card, or the
floating chapter pill overlaps it. This is the exact class of bug commit
`213290b6` fixed once already.

**Step 3. Clipping sweep.**
Walk every row of the table in 3.5, plus every `truncate`, `line-clamp` and
`whitespace-nowrap` on a label that grows with scale. Axe cannot see any of
this, because clipped text is still in the accessibility tree. A human looks.
Pass: nothing is cut mid-word, and nothing that was two lines is now four lines
inside a fixed-height container.
Failure signature: an ellipsis appearing on a label that had none at `md`.

**Step 4. Reflow at the extremes.**
320px, 375px and 430px wide, portrait and landscape, plus a tablet width.
Landscape on a phone is where `min-h-screen` and the sticky offsets fail
together, and it is the case most often skipped.
Pass: no horizontal scrollbar, the reader column still has its margins, and
sticky headers still sit where `.below-topbar` says they do.
Failure signature: a share-card preview or the command palette exceeding the
viewport at 320px.

### 5.3 Automated coverage

`lib/reader/__tests__/readingModes.test.ts` is the precedent worth following: it
exists to keep a public promise from being quietly broken, and it fails on
purpose when someone moves a theme out of the free list. The equivalents here:

| File | Invariant it holds |
|---|---|
| `lib/share/__tests__/eligibility.test.ts` | Fails if a licensed translation becomes imageable |
| `lib/narration/__tests__/noAutoplay.test.ts` | Fails if any code path reaches `play()` without a reader gesture |
| `lib/narration/__tests__/singleElement.test.ts` | Fails on a second `new Audio(` in `lib/` |
| `lib/search/__tests__/corpus.test.ts` | Fails if the corpus is filtered without the precomputed haystack |
| `lib/ui/__tests__/chromeTokens.test.ts` | Fails if `--tab-bar-h` or `--topbar-h` returns to a constant that nothing reports into |
| `lib/reader/__tests__/readerReach.test.ts` | Fails if a long-form reader renders body text without `useReaderPrefs` |

Playwright with `@axe-core/playwright` already gates a11y.
`tests/smoke/mobile-shell.spec.ts` already guards the fixed-descendant stacking
bug; extend it rather than starting a parallel suite.

### 5.4 Risk register

| Risk | Likelihood | Blast radius | Mitigation |
|---|---|---|---|
| **Submitting a feature build replaces iOS 1.0 build 12 and forfeits its place in the review queue** | Certain if done | Weeks of review time, for no gain | Let build 12 resolve first. This is the one sequencing fact that should decide the release plan, and it is in 6.4 |
| Card renders in the fallback font because a unicode-range subset was never fetched | High | Silently wrong output, no error | `document.fonts.load(spec, text)` then `check()`, abort on false. 4.3 |
| Card returns a blank PNG on iOS from exceeding the canvas area ceiling | Medium | Silent failure, no exception | Fixed 1080x1350, never `devicePixelRatio`. 4.3 |
| Android media notification never appears because a metadata command was omitted | High on first attempt | Feature looks built and does nothing | Declare `COMMAND_GET_METADATA`. 2.5 |
| Licensed text turns out to be non-imageable after the UI ships | Medium | Feature partially retracted, reader-visible | Ship public-domain-only from day one. The gate is 4.1 |
| `UIBackgroundModes: audio` rejected under App Store 2.5.4 | Medium | Release slips | Declaring it without real lock-screen transport is the common rejection. Ship the Now Playing integration in the same build, or do not declare the mode |
| Android typed foreground service needs a Play Console declaration form | Certain | Submission blocked until filed | It is a console change, not only a manifest edit. File it before the build is uploaded |
| Narration CDN cost scales with readers | Medium | Recurring spend, unbudgeted | Offline downloads reduce repeat streams. Measure before promoting the perk |
| The system-link read needs native code on Android | High | Scope grows in section 3 | Ship the ladder extension first; the link can follow within the same release |
| Chrome tokens reported by `ResizeObserver` cause layout loops | Low | Jank on the reader | Write the variable only when the rounded value changes |
| The other session's calendar work touches `globals.css` | High | Merge conflict | Both branches edit `app/globals.css`. Rebase before merging, and keep this branch's edits inside the safe-area block |
| AI narration contradicts published copy | Certain if unaddressed | Trust, and an `AGENTS.md` stop condition | Section 6.1 |

---

## 6. Open questions for the operator

**6.1 The narration voice must be named honestly.**
`lib/premium/plans.ts:125-130` sells Studio Audio as "Professionally narrated
Scripture, saints, and Orthodox History". ElevenLabs output is synthesised, not
narrated by a person. `CONTRIBUTING.md` requires source transparency for every
text on the site, `docs/editorial-standards.md` is binding, and the 1.2
positioning PRD claims "zero TTS, zero AI-voice" as the anti-Athon
differentiator.

The engineering does not care. The copy does. Three things need a decision:
does the perk copy change to name the voice, does the anti-Athon claim retire,
and does the player itself show the voice credit the way `Section.voice` already
attributes a saint's words. `AGENTS.md` lists pricing and subscription terms as
a stop condition, so this cannot be decided in code.

**6.2 Is narration free or Pro?**
Studio Audio sits in `proItems` today. Section 3's precedent, that being able to
read is not a premium feature, has an obvious extension to being able to hear.
The two are not the same question: light mode costs nothing to serve and
narration costs bandwidth per listen. A defensible split is that a device-speech
fallback is free and recorded narration is Pro, but that is the operator's call
and it should be made before the perk copy is written.

**6.3 May the Android system-scale read use native code?**
A correct system link needs `Configuration.fontScale`, which a WebView does not
expose. That is roughly twenty lines in `MainActivity.java` publishing a value
the web layer reads. It is small, but it would be the first bespoke Android code
in the repo, and section 2.5 already proposes the second.

**6.4 Timing against the held iOS build. This is the decision that matters
most.**
The risk is not that a repo commit could affect build 12; that binary is
immutable. The risk is that uploading a new build to the same submission
**replaces it and returns you to the back of the review queue**, discarding the
position build 12 currently holds.

So the recommendation is to let build 12 resolve before submitting anything
here. Approved, and this work ships next. Rejected, and there is a free window
that should be used for exactly this. Either outcome is better than forfeiting
the queue position for a feature release.

**6.5 Is this 1.1, or 1.2?**
The instruction was all four in 1.1, and this document is written to it. Two
facts argue the other way and are recorded so the choice is informed rather than
inherited:

- The 1.1 letter is framed as handing over what already existed. Four net-new
  features, one of which adds the first bespoke native code in the project, read
  as a different kind of release.
- Bundling them means one review cycle carries all four. A rejection over
  `UIBackgroundModes` would hold text scaling, search and share cards hostage to
  an audio argument, when three of the four need no native change at all.

A defensible split, if the operator wants one: search, typography and share
cards in the next release, since none touches native; background narration in
its own release with its own review cycle. D7 goes out immediately either way,
because it is two lines and the pricing page is currently wrong.

**6.6 Where does the free line fall between speech and Studio Audio?**
Related to 6.2 and worth stating publicly before either ships, not after. A
coherent line is that the machine voice is free and the human or sourced voice
is paid: being able to hear the text at all is the same commitment as being able
to read it, while narration is a manufactured good with a real per-hour cost.

Expect pressure the other way, because free speech reduces the perceived value
of a Pro perk. That is the same reasoning that once put light mode behind Pro,
and it should be refused for the same reason. Put the distinction on the pricing
page ahead of the first reader who asks.
