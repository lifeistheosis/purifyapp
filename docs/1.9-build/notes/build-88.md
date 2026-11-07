# Build 88 on his phone (notes, not yet fixed)

Android build 88, from `503929f3` on `ccr-07896cf2-bo0afd`, installed from the
`android-release` page on 2026-11-07. Brainstorm mode is on: each note says
what he saw, the cause found in the code, and the fix planned. Nothing here is
built until he says start.

## 1. Holding a verse opens the computer's long menu as well as the strip

**What he saw.** Holding John 1:15 opened the verse strip under the verse
(Highlight, Copy, Share, Image, Note, Study) and, over it, a long list down the
right of the screen: Copy verse, Copy as quote, Copy reference, Copy link,
Highlight verse, Add note, the seven colours, Name colors, Bookmark verse,
Gather to florilegium, Cross-references, Open commentary.

**Cause.** That list is the computer's right-click menu
(`components/bible/VerseContextMenu.tsx`), opened by `onContextMenu` on the
verse's words (`components/bible/VerseRow.tsx`, `openContextMenu`). Android's
WebView, like Chrome on a phone, sends a `contextmenu` event on a long press,
so the hold that opens the strip (`onWordsTouchStart`, its `LONG_PRESS_MS`
timer) also opens the right-click menu. Nothing tells the two apart. It goes
back before 1.9; in 1.8 the hold's sheet covered the whole screen and may have
hidden it, and the strip has no backdrop, so now it shows. The export walk
could not catch it: it holds a verse with the browser's touch events, which
never make the phone's long-press gesture or its `contextmenu`.

**Fix planned.**
1. The right-click menu answers a mouse only: in `openContextMenu`, a
   `contextmenu` that follows a touch on the verse (the touch time is already
   kept, `touchAtRef`) is a long press, which is the strip's; it is stopped
   (`preventDefault`, so no menu of the system's either) and opens nothing. The
   computer keeps its right-click as it is, and so does a website reader with
   a mouse.
2. The walk's section 12 sends a `contextmenu` after its hold, as a phone does,
   and requires the strip and nothing else.
3. One gap to decide: the long menu had **Copy reference**; the strip's Study
   has the quote and the link but not the reference alone. Add it to Study, or
   leave it to the computer's menu.
