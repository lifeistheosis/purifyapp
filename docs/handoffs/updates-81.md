# Baton: Updates 81 (the language mend's after side and the last checks, 1.9)

Written 2026-11-15 by Updates 81 (session_01VuYTwbjQRuMw4rKj9X8xif), a checks chat on the fixer card started by Arbiter 14 (session_01VuYTwdsjnmK235qQJH2FGJ). No app code touched. get_session read 91,384 after the first turn and never moved (its updated_at stayed at 03:41), so the budget was kept by my own count. It passed the 150,000 line during step 4; the steps already begun were finished, and step 3c was not started.

## Commits

- The runners: `docs/handoffs/updates-81-runners/` (`lang81.mjs`, `film81.mjs`, `journal81.mjs`) and the mend to `docs/handoffs/updates-51-runners/quote51.mjs` (`QUOTE51_DAY`, the saint's share and his sheet). Hashes in the report.
- This file.

## The steps

| Step | Result | Measure |
|---|---|---|
| 1 | **PASS** | The export of **bc4250b05** (the app is 44d567fa's): exit 0 after 135s, **206.0 MB on disk in 7,372 files, 75.3 MB packed** (ceilings 240 and 85). The script checked the key's role (anon); no token is in the log. |
| 2 Community | **FAULT** (laid out in English; not seen in the film) | See below. |
| 2 Today | **PASS** | No English catalog string, 9 of 9. |
| 2 English | **measured, not compared** | No before number exists in this container. |
| 2 the trade | **not separable here** | See below. |
| 2 Bible, Saints, Settings | **Bible and Settings PASS; Saints FAULT by the bound** (one open) | See below. |
| 3a | **FAULT** | The stars jump at the dir flip, up to 247.8px. |
| 3b | **FAULT** both ways | 272ms (en to ar) and 195ms (ar to en) mirrored with the old words. |
| 3c | **not measured** | The budget. |
| 4 | **PASS** | 5.21 to 6.25:1 on the seven. |
| 5 | **PASS** | 8 of 8 in en and in ar. |

All timing at 390x844, CPU 4x, the apps' user agent, a new reader, cold, on this one export, reads in requestAnimationFrame. Times are ms after the navigation began.

### Step 2: Community in ar, ru and ka (3 opens each)

`node docs/handoffs/updates-81-runners/lang81.mjs out <jsonl> open@<lang>@/community/ ...`

- **The first frame (read in rAF) is in the reader's words in 9 of 9**: ar 2122.5, 2576.3, 2137.0; ru 1930.2, 2030.8, 1980.1; ka 2245.8, 1983.7, 2832.2. After it, nothing moves by 1px or more in x or width in any open.
- **But in 7 of 9 (ar 2, ru 3, ka 2) the screen is put into the page in English first.** "Community", "Sign in to share with the community.", "Sign in" and the tab bar ("Today", "Bible", "Discover", "Prayers", "You") arrive in the same mutation that takes the slate out of the page. In the first ar open: the slate out at 2017.0, the English at 2017.1, `<html>` already lang ar, dir rtl (written at 1674.7). The reader's words replace them 80 to 110ms later, before the next read in rAF.
- **The layout-shift record shows that English laid out in a rendering**, at Updates 79's width for "Sign in": the link at x 152 to 130, width 87 to 131 (ar, score 0.0102); x 152 to 145, width 87 to 99 (ka, 0.0014); a tab bar label 43 to 56 wide (ru, 0.0008).
- **Filmed once (ar, `film81.mjs`, the CDP screencast, every compositor frame): no English frame.** The English was in the page from 1843.1. No frame was painted from 1776.7 to 1974.5 (the main thread busy). Then the compositor showed the slate's fade (1974.5, 1989.3, 2006.7: the cross dimming, nothing of the screen), and the screen's first frame, at 2028.0, was already Arabic.
- In the 2 opens where the screen came later (2576.3 and 2832.2), no English was put in the page.
- So the hold lets the screen through on the settled mark, with the English table, and the screen is drawn again in the reader's words 80 to 110ms later. On this machine the compositor hid it once; a faster phone may paint it. Owner: lib/i18n (`RouteLanguageHold`, `MessagesProvider.setLocale`, the settled mark).

### Step 2: Today, English, the trade, three more screens

- **Today (`open@<lang>@/`), 9 of 9: no English catalog string put in the page, none drawn.** The greeting is first drawn under the full slate (1.78 to 2.22s), and the slate lifts from about 3.1s. The moves after it (dy -6 to -1px over 4 frames) are its own entrance (`title-in`), under the slate. The day's saint is named in English on purpose (`components/today/GreetingHeader.tsx:136`, `lang="en"`): content, not a catalog string.
- **English once**: Community first drawn at 2342.5, Today at 1780.1 (under the slate). Updates 79 took no English number and this round had one export, so "unchanged" is not proved. Here English is not drawn sooner than the others (Community en 2342.5; ar median 2137, ru 1980, ka 2246).
- **The trade.** Updates 79's before (another container): the link put in the page at 1362 in English, its Arabic about 120 to 150ms later. After, here: Arabic first drawn at a median 2137, +0.6s on the raw numbers. But this container's English open, with no language to wait for, draws later than the Arabic, so the raw difference is the container's, and the wait itself cannot be separated without a before export here. Every first frame came before the deadline (armed at 1.18 to 1.48s, so 3.7 to 4.0s).
- **Bible, Saints, Settings, cold in ar, once each.** Each is drawn in Arabic, and the slate goes as each is drawn: none was left under it.
  - `/bible/` "الكتاب المقدس" at 3101.0; deadline armed at 1499.5, so within (3999.5).
  - `/settings/` "الإعدادات" at 3054.8; armed at 1376.2, so within (3876.2).
  - `/saints/` "القديسون." at 4162.3; armed at 1381.3, so **281ms past the bound** (3881.3). The language had settled by about 1750 (dir written), so the 2.4s after was the screen's own. English `/saints/` drew at 2696.1 (one open), 1.47s sooner. One open each: a second look first.
  - English words drawn on those Arabic screens, from content, never replaced: "Anonymous" in a figcaption on `/bible/`, and saint names in English ("The Most Holy Theotokos", an h3) on `/saints/`. Both are catalog strings with an Arabic value too, so the i18n holder may want a look.

### Step 3: Updates 80's found list

- **a. The stars move under the visible slate (FAULT).** In every Arabic open (3 Community, 3 Today, Bible, Saints, Settings and the film), at the dir flip (1364.8 to 1921.0; the slate at opacity 1, the stars fading in at 18 to 41%), the first four stars go in one frame from x 199.3, 209.0, 70.6, 225.4 to 189.6, 179.9, 318.4, 163.5: the third jumps 247.8px. The layout-shift record has them (`I x 15->241`, `68->188`, `190->67`, `189->67`). Updates 80's suggestion (a language pre-paint setting lang and dir from a synchronous guess) would answer it.
- **b. A switch in Settings (FAULT, both ways).** `lang81.mjs ... switch@en@ar switch@ar@en`: Settings, the picker, the other language.
  - en to ar: lang and dir written at 302.5 and 304.7ms after the tap. The frame at 309.9 is drawn rtl with "Settings", "Language" and the English tab bar; the Arabic words come at 582.2. About **272ms of frames mirrored with the old words**.
  - ar to en: written at 152.9 and 153.9. The frame at 157.8 is ltr with the Arabic words; English at 352.9: about **195ms**.
- **c. The website's faces: not measured.** A web build and a server were not cheap at this point of the budget.

### Step 4: the journal placeholder (PASS)

`node docs/handoffs/updates-81-runners/journal81.mjs out <json>` (mockrun60's reader and opening, 390, en).
- **The svg is not across the words.** checkMock measures a placeholder against the field's whole inner box (17,247 to 373,500 at 390; the field is `min-h-[30vh]`). Four icons of the two rows below the words lie inside that box: each row's 20px icon in its 38px plate (x 53, y 431 and 487) and its 18px pen (x 329, y 432 and 488), `aria-hidden`, in `button.tap-press` rows of a list. The placeholder's own two lines (y 247 to 305) have nothing across them.
- **With the four hidden**, checkMock with pixels on the composer, on Dark, Light, Black, Candlelight, Monastery, Councils and Cappadocian: **0 failures, nothing unmeasured**.
- **The words' contrast** (the placeholder's colour as the browser converts it, against the screen's pixels under its two lines with the placeholder made clear; the least kind pixel): Dark 6.21, Light 5.23, Black 6.25, Candlelight 5.26, Monastery 5.36, Councils 5.22, Cappadocian 5.21 (need 4.5).
- Found: the field's box runs under those two rows. Whether the rows lie over the field, or the box is only taller than its place, was not looked at.

### Step 5: quote51 on a day whose headline saint has words (PASS)

- **2026-11-13, St John Chrysostom**, is the one day from 10 November to 31 December (New Calendar) whose headline saint has words: `data/today/saint-words.json` read against `commemorationsOn`.
- `QUOTE51_DAY=2026-11-13 node docs/handoffs/updates-51-runners/quote51.mjs out <json> en`, then `ar`. That day Today stands with the bands saint, fast and readings, one saint share and no saying share.
- The saint's picture opens on Look with the quote's looks; the layout is kept across a look, and the sheet stands still across the tabs. **8 of 8 in en, 8 of 8 in ar**, no page errors. The runner's lines still say "the saying's picture" from Updates 51; it was the saint's.
- The first run failed on the runner, not the app: it found the sheet by "picture.title", and the saint's sheet is named by his name (`ChurchTodayRail.tsx`, `title={saint.name}`). Mended.

## Left, for the arbiter to route

1. **2, Community**: the screen put in the page in English at the hold's release (7 of 9), laid out once, not seen in the one film. Owner lib/i18n.
2. **2, Saints**: drawn in ar at 4.16s, 281ms past the deadline counted from its arming, with the language settled 2.4s before. One open; look again first.
3. **3a**: the stars' jump at the dir flip.
4. **3b**: lang and dir written before the words commit: 195 to 272ms mirrored with the old words on a switch.
5. **3c**: not measured.
6. **Step 4's overlap**: the field's box under the two rows.
7. **English content on Arabic screens**: "Anonymous" (Bible), the saint names (Saints), and the greeting's saint name (by design).

## Where things are

- `docs/handoffs/updates-81-runners/lang81.mjs`: `open@<lang>@<path>` (the first mark, slate, stars, English put in the page and drawn, faces, shifts, the deadline's arming) and `switch@<from>@<to>`.
- `docs/handoffs/updates-81-runners/film81.mjs <out> <shots> <lang> <path>`: the compositor's frames around the dir flip and the slate's leaving, as strips.
- `docs/handoffs/updates-81-runners/journal81.mjs <out> <json>`.
- `QUOTE51_DAY=<yyyy-mm-dd> [QUOTE51_SHARE=saying] node docs/handoffs/updates-51-runners/quote51.mjs <out> <json> <lang>`.
- Logs, JSON and the film's frames were in this session's scratchpad; the numbers above are the record.
