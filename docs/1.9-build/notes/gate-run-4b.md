# The pre-build gate, run 4b: the taps, looks and language on the head (2026-11-15)

Started by Arbiter 14 (session_01VuYTwdsjnmK235qQJH2FGJ) at about 07:15 UTC: the taps, looks and language half of the final check before the next test build, on the head after Updates 76 to 91's mends, scoped by the owner's word of 2026-11-14 13:57 to what changed. Gate 4 runs the motion walk beside it on its own export. Run by Gate 4b (session_01VuYTwZqENgMg5ynEb8M8NS). It names faults and mends no app code.

**The export:** `node scripts/gate/export.mjs` of `f0b9ff348`, the head at the start. Cut 07:15:32 to 07:17:45 UTC by the container's clock, exit 0: 208.2 MB on disk in 7,372 files, 76.0 MB packed. The store workflow's own switches as Gate 3 had them: Plus enforced on Android with the stand-in RevenueCat key `walk`, Google sign-in unset (the walks are signed out), the EIKON Box unset, the shop and Community on. The release-day switches: CAMPAIGNS_OPENING "testers", PICTURES_IN_STORE_BUILDS false, CAMPAIGN_NOTICES true, JULY_GROUPS_GO true, CARE_NOTE_SEND true. The main web's public key went into that command alone, checked to be the anon role, and was printed and written nowhere. What landed on the branch after it is scripts and docs only (`01dd428d` the motion walk, this run's runners, `ccc6e27a` docs): no app code.

**The runner mend:** `1c3b50d3`. `scripts/guardrail-walk.mjs` takes `--lang`, set as the tap walk's `--lang` sets it (the locale, the cookie, the key the app keeps), so part 2 can be walked in Arabic, where mirroring is judged. Its self-test passes; a smoke on /settings/ in Arabic measured 0 failures. The runners are in `docs/handoffs/gate-4b-runners/`.

**The screens (44):** `/ /community/ /florilegium/begin/beatitudes/ /settings/ /settings/reading-mode/ /shop/ /shop/stores/ /shop/eikon/ /shop/cart/ /shop/orders/ /shop/requests/ /shop/messages/ /heresies/ /heresies/marcionism/ /theology/creed/ /theology/ /theology/doctrine/ /topics/ /theology/theosis/ /theology/path/christ/ /apologetics/ /apologetics/atheism/ /account/ /account/profile/ /account/profile/edit/ /account/notifications/ /account/sessions/ /account/data/ /account/security/ /account/eikon-box/ /account/export/ /account/developer/ /plan/ /set-password/ /campaigns/detail/ /email/change/ /email/first-week/ /email/unsubscribe/ /bible/ephesians/4/#v26-27 /reading/collections/anger/ /bible/multi/ /chants/psalm-135/ /saints/ /saints/theotokos/`. The theology rows' pages are those Updates 90's mend names (creed, library, way, shelves, topic, path, apologetics): the way is drawn on /theology/doctrine/, /topics/, /heresies/ and /apologetics/, the shelves on /theology/doctrine/. The verse link is one the anger collection carries.

## 1. The tap walk: pass

`scripts/tap-walk.mjs out --only <the 44> --workers 2 --max 150 --online`, both readers, 07:23 to 08:37 UTC.

| | new reader (SELLS_PLUS=1) | open reader |
|---|---|---|
| controls tapped | 1,010, **0 failed** | 1,010, **0 failed** |
| sheets, menus, dialogs opened | 50 distinct, **0 failed** checkMock | 50 distinct, **0 failed** |
| words over a picture in them | 238, all answered by their pixels | 235, all answered by their pixels |

- Past the 150 walked: /community/ (188 controls) and /saints/ (313). The rest were not tapped.
- **Looked at, and answered** (`looks4b.mjs`, real touch, a new reader). Each choice took and is kept; nothing else shows it by design:
  - /chants/psalm-135/ "English": English was already the chosen words, and the tap keeps it (`purify:chant.words` `{"view":"original","en":true}`).
  - /settings/ "Strict rule": already chosen, and now kept (`purify:fasting-rule` `strict`).
  - /settings/ "Haptic feedback" (new reader only): on to off, kept (`purify:scroll-clicks` `off`).

## 2. checkMock with pixels: three faults, one of them in the checker

The guardrail walk (`docs/handoffs/gate-4b-runners/guard4b.sh`), `--online`, all 44 screens, the five palettes and the two earned. Done so far: the new reader in English and Arabic at 390, the open reader in English at 390 (44 of 44 measured each; 42, 41 and 42 clean). The other nine (800 and 1032 for both readers, and the open reader in Arabic at 390) are running after the suite and the build.

**Fault A: /account/ in Arabic on Light.** The line "Private on this device · no account needed" (`ui.privateOnThisDeviceNo`) over the You picture (`you.v2.jpg`) is **4.50:1 at its least on the pixels under it; it needs 4.5:1** (below it before rounding). Arabic 390, new reader. In English the same line is 6.27:1 on Light, and in Arabic 4.58 on Candlelight. File: `components/you/YouIdentity.tsx:57` (`words-halo ... text-caption text-paper`).

**Fault B (the checker): /shop/eikon/ on Light, 27 words at 1.15 to 1.22:1.** By eye (a still on Light, `probe4b.mjs`) the words are white on the room's obsidian and read clearly. The room's backdrop is a fixed layer beside the words, not behind them in the tree (`components/shop/eikon/EikonBoutique.tsx:63`, `fixed inset-0 -z-10 bg-[#0a0a0a]`; read on Light: rgb(10, 10, 10), opacity 1, the h1 white). checkMock's contrast takes the background from the words' ancestors, so it measured white on the body's parchment (rgb(241, 232, 212)). **Not an app fault; the checker's** (`scripts/mock-check.mjs`). The other palettes pass only because their body is dark too. At 4s, alone, the probe measured 59 such lines on Light.

**For the arbiter: /bible/ephesians/4/#v26-27 on Dark, 656 words at 3.33:1** (verse numbers 1.84:1), in every run. It is the verse link's landing: the rest of the chapter steps back to opacity 0.4 for two seconds (`app/globals.css:12411`, `components/bible/VerseFocusFlash.tsx:89`, the owner's design of 2026-10-19). The walk measures 1.5s after the push, inside it, and Dark is its first palette. `probe4b.mjs` read verse 1 at opacity 0.4 to 2.0s and back to 1 by 2.8s; checkMock on Dark found **656 failures at 1.5s and 0 at 4s.** Not from tonight's mends. The call is the arbiter's: allow it by name and reason in the walk, or not.

**Looks left for the eye, answered.** /community/ 40: letters that a reader's own picture is drawn across (a reader's initial under their picture). There are no pixels to read and no still, so these were answered from the record, not by eye. /settings/reading-mode/ 48: the "1"s of the reading modes' miniature pages (each still 2 to 4px wide), a picture of a page drawn small, as the palette previews on /settings/ are (allowed there by name). /saints/theotokos/ 1: a "·" under the icon.

**Community offline with its card, and Try again tapped** (`offline4b.mjs`; every address outside the bundle aborted, as Updates 91's probe made it; 390, 800 and 1032, en and ar, both readers, 12 runs): **pass.**
- The card is drawn every run (rtl in Arabic). checkMock: **0 failures before the tap and 0 after, in all 12.**
- Try again is 104 by 47 (en) and 128 by 47 (ar), and the finger meets it at its middle. Its top moves **0px** across the tap.
- The "No signal" line (role status) comes under it every time.
- Layout shifts: after the tap, one paragraph below the button moves down as the line goes in (P y 550 to 606 in English, 539 to 573 in Arabic, at 15 and 29ms; 0.0079 and 0.0039). Nothing above the finger moves. The larger entries (0.058 to 0.20, same y) come 28 to 125ms before the tap, from checkMock putting the palette back.

## 3. The language on the direct path: one fault (Community's door place)

`docs/handoffs/updates-88-runners/open88.mjs`, 390 by 844, CPU 4x, the apps' agent, a new reader, alone on the machine, exit 0: `direct@<lang>@<path>` for ar, ru and ka on /community/, / and /saints/, 2 opens each, English once each, then `switch@en@ar` and `switch@ar@en`. Then `film4b.mjs`, the same switch filmed by the compositor (Updates 81's film way).

- **dir rtl before the first contentful paint:** ar flips at 220 to 336ms, before FCP (268 to 392ms), **6 of 6**. ru and ka stay ltr throughout.
- **English catalog strings drawn: none.** /community/ and / show 0 in every language. /saints/ shows "The Most Holy Theotokos" (an h3), which is equal to a catalog value (`walk.person.theotokos.name`) but is drawn from the library (`lib/saints/saints.ts:147`, a saint's name), so it is not a catalog string. Today's first mark is the saint's name, in English by design.
- **The first words in the reader's script:** /community/ and /saints/ in ar, ru and ka. Every open is within the language bound (by 513 to 2,041ms).
- **Steps of 1px or more:**
  - /saints/: 0.
  - Today: 2 to 4 moves an open, **all under the full slate** (0 drawn to the reader).
  - **Fault C, /community/:** the first words drawn ("Sign in") **rise 77px** (74.5 to 77) in 5 to 11 visible steps, beginning 130 to 780ms after they are first drawn. Seen in en, ar, ru and ka, 2 of 2 each (en 1 of 1).
- **The cause of fault C** (`arrive4b.mjs`, a direct open, en): the campaigns door's place in Community's head (`div[data-door-place].community-door-place`, `components/community/CommunityHead.tsx:94`, `h-[60px]` with `mt-4`) is held at the first frame and closes on the house curve (`app/globals.css:9587` to `9599`) when a new reader's first answer comes back no. It closed from 60 to 0 between 1,159 and 1,540ms, and the "Sign in" words rose with it. On a direct open the device has no kept answer yet, so the pre-paint mark (`lib/campaigns/doorPrepaint.ts`, `:root[data-pray-door="none"]`) cannot hide it. This is the same 77px as Updates 88's arrival (SECTION y 197 to 120), now on the path a link or a notification takes.
- **English once each:** Community first drawn at 1,776.7ms (with fault C's rise, -74.5), Today 1,601.7 (3 moves, under the slate), Saints 2,260.6 (0).
- **The Settings switch, en to ar and back: pass.**
  - open88: 2 frame changes each way, **0 mirrored frames**, 0 errors.
  - Filmed: 37 painted frames (en to ar) and 34 (ar to en). The page's dir and words change in the same frame.
  - By eye at the crossover: the last English frame is ltr and the next painted frame, 337ms later, is Arabic and mirrored whole. Going back, the sheet closes in its Arabic rtl form, then English ltr.
  - Each film run had one page error, "App" plugin is not implemented on android: the browser stand-in for the Android shell, not the app.

## 4. The suite and the web build

Each alone, after the language measures, on the tree at the export's head (only scripts and docs after it):

- `npm run test:unit`: **exit 0**, 09:08 to 09:12 UTC. Files 1,223 passed and 1 skipped (1,224); tests 15,312 passed and 9 skipped (15,321).
- `npm run build`: **exit 0**, 09:12 to 09:15 UTC, 6,526 of 6,526 pages.

## The faults, by cause (one fixer each)

1. **Community's door place on a direct open** (fault C): `components/community/CommunityHead.tsx:94`, `app/globals.css:9587`, `lib/campaigns/doorPrepaint.ts`. A new reader's first open of /community/ by a link or a notification holds the place and closes it 77px.
2. **The You picture's line in Arabic on Light** (fault A): `components/you/YouIdentity.tsx:57`, 4.50:1 at its least where 4.5 is needed.
3. **The checker** (fault B): `scripts/mock-check.mjs` takes no fixed backdrop beside the words as their background (EIKON on Light). The owner of checkMock. No app change.
4. **For the arbiter, not a fixer yet:** the verse landing's two-second step back measures 3.33:1 on Dark (`components/bible/VerseFocusFlash.tsx:89`, `app/globals.css:12411`). Allow it by name in the walk, or ask the owner.

## Left

(Written at the end.)

## Budget

(Written at the end.)
