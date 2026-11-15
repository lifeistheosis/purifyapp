# Baton: Updates 98c (build 98 notes 4, 12 and 5)

Written 2026-11-15, by my own count about 185,000 tokens at the end. Started by Arbiter 14 at his word of about 22:06 UTC ("ensure this is a new build and if not fix all of these issues and come back to me with a new link to redownload for android").

## Role and scope

A fixer (docs/roles/fixer.md). Held android/, components/ui/Sheet.tsx, lib/ui/useDraggableSheet.ts, lib/ui/sheetGesture.ts, components/journal/, lib/journal/ and the i18n keys added. Changed: patches/@capacitor-community+safe-area+8.0.1.patch (the native mend; the plugin's own file is in node_modules, written by patch-package on every install), lib/ui/useDraggableSheet.ts, components/journal/PageBlocks.tsx, components/journal/usePage.ts, components/journal/LibraryQuote.tsx (new), lib/journal/libraryQuote.ts (new), 21 message files (two keys), scripts/keyboard-sheet-walk.mjs (a frames mode, the scrim's writes), scripts/quote-library-walk.mjs (new). No other chat's files touched.

## Done, with hashes

- **Notes 4 and 12, the keyboard's slide, a0bf82c95.** The plugin's listener padded the window by the keyboard's whole height at the start of its slide. Now a WindowInsetsAnimationCompat callback beside it moves the room with the keys on every frame and the listener settles it at the end. Compiled here (javac 21, android.jar 36, androidx.core 1.17.0) and by **CI run 43770272198** (run number 99, publish false, success on fa3af57df; a compile check, nothing uploaded). Tests failing on 78c5297e1: lib/ui/__tests__/keyboardSlide.test.ts 6 of 6.
- **The scrim's blink, a0bf82c95.** `scrimStrip` measures the strip from the panel's own top. lib/ui/__tests__/scrimStrip.test.ts fails 3 of 3 on 78c5297e1.
- **Note 5, the editor's Quote searches the library, a0bf82c95, fa3af57df, 99e82874f.** lib/journal/__tests__/libraryQuote.test.ts fails on 78c5297e1 (the module is missing). The walk's checkMock found the passages clamped at three lines (cut); shown whole since 99e82874f.
- Checklist: typecheck 0; the whole suite green (1,232 files; its one failure, writingSheet's reading of the old Quote tool, mended in fa3af57df and passing 26 of 26); eslint clean on the changed files; two exports (the second because the walk found the clamp); the walks and checkMock as in docs/1.9-build/notes/build-98.md under notes 4, 5 and 12.

## Open, each with its owner

1. **His phone walk** of the next build, on the release APK: the six items under note 4 in build-98.md. Only a phone shows the slide's frames.
2. **Note 5 not walked:** a life, a prayer, a chant or a council opened to its passages (the same code reads each page's main); the Plus mark seen by a reader without Plus (`SELLS_PLUS=1`, scripts/lib/sells-plus.mjs). The next checks chat.
3. **Note 5's translations** of "Words of your own" and "Find the words" are mine in 20 languages, unreviewed.
4. **Fable round 3** draws the journal as its own page: LibraryQuote is the editor's own part and moves with it unchanged.

## Gotchas

- A fresh checkout has no next-env.d.ts: `npx next typegen` before `npm run typecheck`, or 15 image-module errors appear in components/admin/drop/cards.generated.ts.
- The export moves the web-only trees aside while it builds: `git status` shows them deleted and `git pull --rebase` refuses until it ends.
- `[data-journal-write]` matches a hidden button first: tap `[data-journal-write] >> visible=true`.
- `printMockCheck` prints the report and returns the verdict; checkMock's result has no `ok`.
- To prove a test fails on old code with the plugin installed: a worktree at the old head, node_modules linked, the safe-area plugin copied and moved back with `patch -R -p1` then the old patch (git apply refused the node_modules path).
