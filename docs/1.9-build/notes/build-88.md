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

## 2. The end of a scroll selects a verse; selecting and highlighting collide

**What he saw.** "The select verse/highlight verse system is colliding and not
smooth. When scrolling to another verse and letting go my finger on the next
verse, my finger lands on it, clicks it."

**Cause.** A verse decides for itself what a tap is, on the finger's lift
(`onWordsTouchEnd` in `components/bible/VerseRow.tsx`): up within 400 ms of
going down (`LONG_PRESS_MS`) and moved less than 8 px (`SCROLL_SLOP_PX`) is a
tap, and a tap selects the verse and opens its strip at once (his pick B). Two
things a phone never calls a tap pass that rule:

- **The touch that stops a glide.** After a swipe the page glides on; a finger
  put down to stop it and lifted again has not moved, so it is a "tap" on the
  verse under it. The phone itself knows that touch stopped a scroll and sends
  no click; the verse does not ask.
- **A finger held still while the page moves under it.** The rule measures the
  finger on the screen, not the page, so a page that slid under a resting
  finger still reads as a tap.

And they collide: such a false tap is remembered as the first of a double tap,
so a real tap on a verse within 320 ms and 28 px of it is read as the second,
and the verse is **highlighted** instead of selected.

**Fix planned.** Let the phone say what a tap is, as every native app does:
the strip opens on the verse's `click`, which the phone does not send after a
scroll, a glide or a glide's stop, with its own thresholds for the screen.
Touch keeps only what is the verse's own: the hold, the drag across words, and
the double tap, which becomes two clicks in time. Failing that, two guards on
the present rule: a touch that begins while the page is still moving (a scroll
in the last 100 ms) is the scroll's, and a touch during which the page itself
moved is too; neither counts towards a double tap. Held by a test of the
gestures (a glide stopped, a still finger over a moving page, a slow drag, a
tap, a double tap after a glide's stop) and by the walk, which glides the page
and lifts a finger on it.
