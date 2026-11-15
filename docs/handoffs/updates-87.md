# Baton: Updates 87 (the language hold's cost, and the readied screens' English, 1.9)

Written 2026-11-15 by Updates 87 (session_01VuYTwa4iVBv2dyVs1x5rjd), a fixer started by Arbiter 14 (session_01VuYTwdsjnmK235qQJH2FGJ). Measure 3 (the website) was not run: my own count passed 150,000 during the after measures.

## Commits

- **ff3aa6d1**: the mend, its tests and the runner (pushed; the guard passed in 2m 44s).
- This file, and the runner's walk order.

## Item 2: the four English text nodes, proved

They are readers' own words in the live Community feed, not catalog strings and not the ready-ahead. Export 1, Community cold in ar (`lang87.mjs`, every inserted English-only catalog string with its ancestors):
- "Prayer request" and "New to Orthodoxy": `h3[data-mock-why="a reader's own words"]` in `article#post-….community-post`, two posts' titles.
- "Community" and "Shop": `span` in `p#…-words[data-mock-why="a reader's own words"]`, one post's body.
- They arrive with the feed's data from the main web, below the fold, so 0 frames.

**The readied screens in ar** (cold open of /, the ready-ahead let run: all eight index.txt read, then each page reached by a click on its link; every English-only catalog string drawn in the 3.5s after):
- On export 2, all eight reached: no catalog string drawn in English on any of them. What is drawn in English is the library: the Bible's words and "St John the Theologian" on John 1; "The Sign of the Cross" (a prayer's own title, `data-save-title`) on Morning and Evening prayers; saints' names on Saints. Prayers, Discover, Account and Settings: nothing.
- Server-baked English that goes into the page but is never drawn on a phone: Discover's desktop header (`div.hidden.md:contents.native-md-hidden`) and Account's signed-out block (`display:none`). On a tablet in the apps, `native-md-hidden` keeps the first hidden; not looked at further.
- Also from Saints' cold open: "Martyrs" and "Priest" are saints' titles (`SaintCard.tsx:57`, `heroTitle(saint.epithet)`, `lang="en"` by design). Library words.
- So no fault to mend in item 2.

## Item 1: the hold's cost, as proved

Export 1, Saints cold in ar, traced (`lang87.mjs open@ar@/saints/@trace`). Saints' payload was read at 1.03s and its code by 1.6s. The cost comes after settle:
1. **At settle, Today is drawn on the front door, under the slate, then replaced.** Today's greeting goes into the page with the reader's words (2,312.6 / 2,835.5 / 3,185.5 in three opens), in one long task of 614 to 675ms, with its own fetch (`read/index.json`).
2. **The held screen then waits for some other update.** After that task the main thread is nearly idle for 1.9 to 3.4s. Saints' render starts only when an unrelated timer fires: TimerFire 55 in the app's shared chunk, then a chunk evaluated, then React's update. React's own order explains it (Next's compiled react-dom, `scheduleUpdateOnFiber`): an update that lands while the held transition is suspended with delay marks that transition's lanes suspended again, so it is retried only by a later update.
3. **The runner's "cold open" is the front door at / and then a router push** (`scripts/lib/shell-server.mjs`, `go()`), not the front door's document opened at /saints/ with NativeBridge's refresh. On that path Today is the front door, and drawing it at settle is right.

## The mend (ff3aa6d1), and what it reaches

- `lib/i18n/client.ts`, `readyLanguageAhead`, called once in `components/i18n/MessagesProvider.tsx` when its code first runs. In the apps, it asks for the catalog and faces of the language the pre-paint put on `<html>`, then hands that catalog to LocaleBootstrap's ask. Nothing is decided or drawn there.
- `components/i18n/LaunchLanguageGate.tsx`, `todayMayDraw`, and `lib/i18n/launchLanguage.ts`, `frontDoorAwaitsScreen`. When the front door's document came up under another address in the apps (a notification, a link, a reload), Today is not drawn as the language settles, so no update of the gate lands on the held screen's way. If the refresh brings nothing, NativeBridge's 6s fallback brings / and Today is drawn; until then the slate stays up, where before Today showed under the wrong address.
- I touched `components/i18n/` (Updates 82's mend), which no chat holds.
- **Not measured: the gate change.** The runner never takes the direct-open path. **Not mended: cause 2,** the parked transition.

## The tests, failing on the old code

`lib/i18n/__tests__/heldScreenCost.test.ts`, 6 tests. With the four app files stashed and the test kept, 6 of 6 failed (`frontDoorAwaitsScreen`, `todayMayDraw` and `readyLanguageAhead` are not functions). On the new code they pass, with Updates 82's 19 beside them.

## The checklist

- typecheck **0**; eslint on the six changed files **clean**.
- `npm run test:unit` **exit 0**: files 1,210 passed, 1 skipped; tests 15,251 passed, 9 skipped.
- `npm run build` **exit 0**.
- Not run: checkMock with pixels and the taps. Nothing drawn changed but when.

## The measures

- Export 1: the head ea47d2e2 (app as 61af8a5e). Export 2: ff3aa6d1d, which also carries Updates 84's and 86's pushes.
- Both by `node scripts/gate/export.mjs`, exit 0.
- Numbers by Updates 81's runner, unchanged (`lang81.mjs`, 390x844, CPU 4x, the apps' agent, a new reader, reads in rAF; ms after navigation). This machine is slower than Updates 82's (their export 1 Saints 3.6 to 3.9s; mine 5.8 to 7.2s), so compare within this file only.

| ar, cold | before (export 1) | after (export 2) |
|---|---|---|
| Saints drawn (vs the bound) | 5,805.8 (+1,473); 6,478.9 (+1,799); 7,169.5 (+3,034) | 4,408.5 (+255); 4,144.2 (+20); 4,195.6 (+53) |
| Community drawn (vs the bound) | 4,104.7 (-590); 3,045.6 (-831); 3,570.0 (-712) | 3,103.9 (-1,067); 3,067.5 (-1,270); 2,966.1 (-1,117) |
| Today drawn, under the slate | 2,663.5; 2,780.3; 2,252.8 | 2,099.5; 2,005.7; 2,172.7 |

- The reader's words go in earlier: 2,206 after against 2,314 to 3,187 before (`lang87.mjs`).
- **Saints is still past the bound in 3 of 3, by 20 to 255ms.** After settle the screen still waits 1.7 to 1.9s (cause 2).
- In every open: no English catalog string drawn, no move in x or width, and `dir` rtl before the first contentful paint. Saints' "English seen" counts are the saints' names (library).
- English, once each: Saints drawn 3,363.4 before, 2,966.7 after; Today 1,698.8 before, 1,731.6 after (fcp 356 and 336). Unchanged within one open's noise.
- No measure of the code before 61af8a5e on this machine: "no slower than before 61af8a5e" is not shown.

## Left, for the arbiter to route

1. **Cause 2, the parked held transition.** It is the rest of Saints' cost. Ways I see, not tried:
   - wake it after settle, in a later task, with an update to the root;
   - or hold the commit, not the render, so nothing re-suspends.
   Either needs its own measure, and a runner that also opens the front door's document at /saints/.
2. Measure the gate change on the direct-open path, which the runner does not take.
3. Measure 3, the website's faces on a first visit in ar: not run.
4. checkMock with pixels and the taps: not run.

## Where things are

- The mend: `lib/i18n/client.ts` (`readyLanguageAhead`), `components/i18n/MessagesProvider.tsx`, `components/i18n/LaunchLanguageGate.tsx` (`todayMayDraw`), `lib/i18n/launchLanguage.ts` (`frontDoorAwaitsScreen`).
- The test: `lib/i18n/__tests__/heldScreenCost.test.ts`.
- The runner: `docs/handoffs/updates-87-runners/lang87.mjs` (`open@<lang>@<path>[@trace]`, `walk@<lang>`). Logs and JSON were in this session's scratchpad; the numbers above are the record.
