# Baton: Updates 82 (one reader's language arrives as one thing, 1.9)

Written 2026-11-15 by Updates 82 (session_01VuYTwaDMdrdYz5ZvaWwjxv), a fixer started by Arbiter 14 (session_01VuYTwdsjnmK235qQJH2FGJ). get_session read 92,064 from the first steps and never moved (its updated_at stayed at 04:07), so the budget was kept by my own count, which passed 150,000 during the after measures; nothing new was started after them. Measure 6 (the website) was not run.

## Commits

- **61af8a5e**: the mend and its tests (pushed; the guard passed in 1m 22s).
- This file.

## The causes, as proved

1. **The hold was never on the phone.** `MessagesProvider` chose it with `IS_STATIC_EXPORT ? <RouteLanguageHold> : children`. That flag is server only (`lib/platform/buildTarget.ts`): in export 1's client chunk (`2nenodi7tzxnp.js`) the module is `"web"!==(... .env.BUILD_TARGET ...)`, and no client chunk defines `BUILD_TARGET`, so the provider handed the screen straight down. Updates 80's test mocked the flag to true, which is why it passed. The direct open is `router.refresh()` (NativeBridge), a transition that nothing held, so whenever it committed before the reader's table it went in English, with the slate (the front door's) leaving in the same commit. Also read in the code: the hold asked the address, and Next takes the router's first address from the location (`create-initial-router-state.js:28`), so on the front door opened at `/community/` the address is the screen's from the first render; the address cannot tell the front door from the screen.
2. **The stars.** Each star sits by `insetInlineStart` (`LaunchFrame.tsx:71`), on purpose: `lib/ui/__tests__/todayMirror.test.ts` holds that the sky turns with the page. `dir` was written only by `setLocale`, after the catalog and the faces (1,093 to 1,337ms in export 1's Arabic opens), with the slate up, and no pre-paint among the six set it.
3. **The switch.** `setLocale` called `setState` and then wrote `lang` and `dir` in the same tick, before React drew the new table.

## The mend (61af8a5e)

- `components/i18n/LaunchLanguageGate.tsx`: `RouteLanguageHold` decides on the device (`isNativeClient`; the website and the server never ask the router) and holds a render of a screen (the router's segments; none for Today) while the language is not settled, only when the page was opened on the front door's document (`[data-front-door]`, the mark NativeBridge reads). A screen whose own document was opened is never held, since holding a later render of it would hold the commit that settles the language. The provider renders it always.
- `lib/i18n/languagePrepaint.ts` + `app/layout.tsx`: a language pre-paint, in the export only, beside the others. It sets `lang` and `dir` before the first paint, decided as LocaleBootstrap decides: the language this device last applied (`purify:language`, kept by the provider, since the choice itself is in Preferences, which only an async call reads), else the device's languages. The pre-paint was chosen over positions that ignore `dir`, which would undo the mirrored sky the owner's test holds.
- `components/i18n/MessagesProvider.tsx`: `lang` and `dir` are written in a layout effect on the committed locale, so in the commit that draws the words; nothing at mount (the server or the pre-paint wrote them). At settle they are corrected if no language was asked for (a pre-paint guess the reader has since changed elsewhere).
- `lib/i18n/locales.ts`: `DEVICE_SPELLINGS` exported for the pre-paint. No catalog words changed; catalogs stay lazy; English decides the same as before.

## The tests, failing on the old code

Run with the app files stashed and the tests kept: 3 failed in `firstFrameLanguage.test.ts`, and `languagePrepaint.test.ts` failed to load.
- "draws nothing until the language is settled": `expected true to be false` (the screen drawn while unsettled, in a client bundle).
- "writes lang and dir only in the commit that draws the new words": `expected { lang: 'ar', dir: 'rtl' } to deeply equal { lang: 'en', dir: 'ltr' }`.
- "writes them in a layout effect on the committed language": no match.
- `languagePrepaint.test.ts` (6): the module, its decisions against `launchLanguage` for every tag, and its place in the export.
On the new code: 19 of 19 in the two files.

## The checklist

- typecheck **0**; eslint on the seven files **clean**.
- The first unit run failed 14 tests in 3 files (`lib/florilegium/__tests__/gatherWords.test.ts`, `redesign.test.ts`, `lib/today/__tests__/verseCardRender.test.ts`): their `next/navigation` mocks have no `useSelectedLayoutSegments`, and the hold asked it everywhere. The hold now asks the router only in the apps (`HoldInTheApps`). Run again: typecheck **0**; `npm run test:unit` **exit 0**: files 1,209 passed, 1 skipped; tests 15,245 passed, 9 skipped (Updates 80's 15,234 and 11 new).
- `npm run build` **exit 0**, 6,526 of 6,526 pages (its "[invest] live numbers unavailable" line is this container having no Supabase address).
- Not run: checkMock with pixels and the taps; nothing drawn changed but the moment `dir` is written.

## The measures

Both exports by `node scripts/gate/export.mjs`, exit 0; export 1 is the head before the mend (ab2ddf43, the app 44d567fa's), export 2 is 61af8a5e. `lang81.mjs`, 390x844, CPU 4x, the apps' user agent, cold, a new reader, reads in rAF; ms after navigation.

- **Community, after (ar, ru, ka, 3 each): drawn first in the reader's words 9 of 9** (ar 2,389.9, 2,211.2, 2,081.3; ru 2,090.1, 1,865.5, 2,125.9; ka 2,340.4, 2,128.3, 2,167.8). **No English inserted with the slate in any open** (Updates 81: 7 of 9). No move in x or width after the first draw; the moves left (dy -17.2 and on, the layout-shift records of one SECTION from y 197 to 120) are the same in English: the screen's own.
  - **Not clean: 4 English text nodes per open go into the page later**, 0.33 to 1.21s after the screen is drawn in the reader's words, and are **never drawn** (0 frames): "Prayer request", "New to Orthodoxy", "Community", "Shop". They match catalog values, but "New to Orthodoxy" is also content (`lib/reading/curated.ts`, `components/start/StartHere.tsx`). Read, not proved: a hidden screen readied ahead after the first screen settles (`lib/nav/readyAhead.ts`), carrying prose the export bakes in English. Not looked at further.
- **The stars, after: no jump.** In every Arabic open (3 Community, Today, 3 Saints), `dir` is rtl before the first contentful paint (written at 237 to 367ms, fcp 288 to 416) and the first four stars stay at 189.6, 179.9, 318.4, 163.5 to the end.
- **The switch, after: no mirrored frame** either way. en to ar: `lang` and `dir` written at 406.5 and 407.5ms, with the Arabic words already in the page; frames at 2.5 (ltr, English) and 421.3 (rtl, Arabic). ar to en: written at 181.6 and 181.8, the English words already in; frames at 3.7 (rtl, Arabic) and 252.9 (ltr, English). Updates 81: 272 and 195ms mirrored.
- **Today in ar, after: passes.** No English catalog string in the page; first drawn at 1,780.0 under the full slate (the saint's name, in English by design).

### Measure 4: Saints cold in ar

| | open 1 | open 2 | open 3 |
|---|---|---|---|
| before: drawn (deadline) | 3,230.1 (3,571.1) | 2,805.9 (3,385.7) | 3,435.5 (3,593.6) |
| after: drawn (deadline) | 3,726.1 (3,568.3) | 3,647.5 (3,559.4) | 3,849.6 (3,593.9) |

- Before: within the bound 3 of 3 (by 341, 580, 158ms). After: **past it 3 of 3, by 158, 88, 256ms**; +0.42 to +0.84s.
- The wait is the screen's own. The language's faces were in by 1,348 to 1,928ms after (1,191 to 1,460 before), and the screen is drawn 1.7 to 2.4s later. Before, the screen's own work ran alongside the language's (the hold was off); now the hold keeps the route's render until the language is settled, and its render starts again after. The deadline bounds the hold, not the render after it.
- **Fault, named: Saints in ar is drawn past the hold's bound in 3 of 3, a cost of the mend.** A mend would let a held screen's work go on while only its commit waits, or ready the language sooner; not mine to choose without the arbiter.

### Measure 5: English's first paint (one open each)

- Today: fcp 280 before, 260 after; first mark 1,294.5 before, 1,259.0 after (under the slate).
- Community: fcp 288 before, 304 after; first drawn 1,854.0 before, 1,783.7 after.
- English decides the same: the pre-paint writes en and ltr, as the server did; unchanged within one open's noise.

## Left, for the arbiter to route

1. Saints in ar past the hold's bound, 3 of 3 (measure 4).
2. Four English text nodes per Community open, inserted late and never drawn (above).
3. Measure 6 (the website's faces on a first visit in ar): not run.
4. checkMock with pixels and the taps: not run.

## Where things are

- The mend: `components/i18n/LaunchLanguageGate.tsx` (`RouteLanguageHold`, `HoldInTheApps`), `components/i18n/MessagesProvider.tsx` (`showLanguage`, the layout effect), `lib/i18n/languagePrepaint.ts`, `app/layout.tsx`.
- The tests: `lib/i18n/__tests__/firstFrameLanguage.test.ts`, `lib/i18n/__tests__/languagePrepaint.test.ts`.
- The runner: `docs/handoffs/updates-81-runners/lang81.mjs` (unchanged; no runner of my own). Logs and JSON were in this session's scratchpad; the numbers above are the record.
