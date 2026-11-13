# Held for his yes or no: the Fast and the Journal, redrawn

Build 95, notes 3, 4 and 6 (part 3). Made 2026-11-13 by the Fable chat for the Fast and the Journal (session_01VuYTwdj2AXx6xhs4145quw). Nothing in this folder is app code that ships: the redesign is kept here as a patch so it is not lost with a container, and it lands only at his yes.

## What he is asked

The private page, with every still and a reason for each choice: https://claude.ai/artifact/CQvAy39zXXmA62dVXjj785 (version 1). It asks three separate things, and a no to one does not hold the others:

1. The Fast: the whole screen.
2. The Journal: the opening, today's page, the empty state, Write on its fade.
3. Quoting and pictures: Scripture and a Father's words as raised cards, the cover's own row and panel, the cover at the page's head and in the list.

His words are on the page and in `docs/1.9-build/notes/build-95.md`, notes 3, 4 and 6.

## What is here

| File | What it is |
|---|---|
| `fast-journal-look.patch` | The whole redesign, one commit, made on 3a08d6ed7 (it applied cleanly on 22250ed5d). Apply with `git am --3way docs/1.9-build/held/fast-journal/fast-journal-look.patch`. |
| `fast-and-journal.html`, `stills/` | The page as published, and its fifteen stills. Publish the same file to the same address to change it. |
| `page.mjs` | Builds the page from the kit's template (`docs/brand/kit/artifact-template.html`) and two folders of stills: `node docs/1.9-build/held/fast-journal/page.mjs <before> <after> <out>`, with `CHECKED="..."` for the line under "How it was checked". |
| `xlib.mjs`, `xstills.mjs`, `xcheck.mjs` | The export as a phone or a tablet opens it; the stills (`xstills.mjs <dir> new` for the redrawn screens, `old` for today's); and checkMock with pixels on both screens, the writing sheet and More, at 390, 800 and 1032, in English and Arabic, on the five palettes and the seventeen looks (`xcheck.mjs fast,journal,sheet new`). |
| `with-key.mjs` | Runs one command with the main web's public address and anon key in its environment, read from purifyapp.net's own scripts, role checked, printed and written nowhere (CLAUDE.md, "The public key for an export, always"). |
| `pagecheck.mjs`, `pagemock.mjs` | The page itself: no sideways scroll at four widths, and checkMock at 390 and 1032. |

## How it was proved

On an export cut from the patch as the store's build is (it sells Plus on Android: `NEXT_PUBLIC_PLUS_ENFORCED_ANDROID=1 NEXT_PUBLIC_REVENUECAT_ANDROID_KEY=walk`, through `with-key.mjs`):

- `xcheck.mjs fast,journal,sheet new`: 84 of 84 pass.
- `scripts/mock-journal.mjs` with `WALK=1`: as a new reader with no Plus (`SELLS_PLUS=1`) 40 flows, none failing; as a reader for whom nothing is locked 44 flows, none failing.
- The whole unit suite with the patch applied: 1111 files, 14462 tests, green. eslint clean on its files.
- The page: checkMock passes at 390 and 1032; the kit's own check passes after the table's fix (`pieces.css`: two columns of words keep a gutter).

Answered by eye, not by measure: the writing page's last field runs under the tools at the sheet's foot, so the checker cannot read its placeholder's ground; its two lines stand clear of the tools.

## At his yes

1. `git am --3way` the patch on the branch (or only the parts he said yes to: the Fast is `components/fasting/` with `lib/fasting/__tests__/build95.test.ts` and its part of `lib/ui/__tests__/gateRunOne.test.ts`; the rest is the journal's).
2. The fix checklist (`docs/OPERATIONS.md`, section 5): typecheck, the unit suite, `npm run build`, a fresh export, `xcheck.mjs`, both walks, then the push.
3. Not yet done, and named on the page: the shared page on the website (`components/journal/SharedPageView.tsx`) still draws the old quote forms. It follows the yes to part 3.

## Gotchas

- Typecheck run during or just after a native build fails on stale route types. The cure is AGENTS.md's: `rm -rf .next && npx next typegen`.
- The export's font fetch can be refused by the network for a moment ("Failed to fetch ... from Google Fonts"). Run it again.
- In the export a verse's words are shown only when kept on the device or with a signal. `xstills.mjs` reads John 3:16 from the export's own chapter and keeps it as the app keeps a starred verse's, so no Scripture is typed by hand.
- The walk taps where it writes now (`write` and `tapToWrite` in `scripts/mock-journal.mjs`): the sheet gives no cursor by itself since 72d5e35b4.
- On the Fast, the second count line keeps its room unseen until a day is kept, so nothing moves under a finger at the first mark. For a new reader that is a gap of one line above "Recent fasting days". It is named on the page.
