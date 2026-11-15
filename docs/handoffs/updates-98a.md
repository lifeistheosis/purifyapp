# Updates 98a: hand-over

Started by Arbiter 14 at about 22:08 UTC on 2026-11-15 for build 98 notes 2, 14 and 8. Stopped at its token line (its own count) with note 14 done and notes 2 and 8 planned, not built.

## Done

- **Note 14, one surface at the foot**: see "Done (Updates 98a ...)" under note 14 in `docs/1.9-build/notes/build-98.md` for the hashes and the proof.
- **The motion walk's loaded passes** (`scripts/motion-walk.mjs --loaded track|sound [--reduced] [--cpu 4] [--json f]`): every tab switch both ways (twenty) with a track loaded (John 10 from the Bible's own Listen; its recording a stand-in, the export's bell, served for audio.purifyapp.net, so no network) or a sound playing alone; each switch judged by the frame judge, plus two checks of its own: the foot's players counted frame by frame in the page (two at once, or none, fails) and a cut in the foot player's own box in the screencast (half its change in one frame, motion on). With a track it also times Now Playing's open and close at `--cpu` (rAF frame times in the page: the longest frame and every frame over 50ms), which is note 8's before and after.

## Open, and exactly where

### Note 8, Now Playing's opening (not built)

Measured on build 98's export (`/tmp` copy of 78c5297e1's export, the `--loaded track` pass, CPU 4x, a container that renders in software): open 78 to 80 frames, longest 33 to 50ms, 0 over 50ms (one run had a 50ms frame 8 frames in, where the tap mounts the whole screen); close longest 50 to 67ms, 0 to 1 over 50ms. Only a phone shows the real frames.

The plan, in `components/player/NowPlayingSheet.tsx`:

1. Built while anything is loaded: render when `audio.src` (not only after a tap). Closed, it stands at `translate-y-full` with `inert`, `aria-hidden`, and no `role="dialog"`/`aria-modal` (the walks read a dialog as a sheet up). The double rAF before `setShown(true)` goes: the closed sheet is already drawn, so the class change alone starts the slide.
2. The blurred backdrop (`filter: grayscale(1) blur(42px) brightness(0.5)` on a layer 8rem wider each side) mounted only once the panel's `transitionend` (or 380ms) has fired, then faded in where it stands; dropped at once when a close starts, so it never moves.
3. The picture carried: the panel has `overflow-hidden`, so the cover inside it cannot be seen above the panel's top edge at the start. Carry a fixed clone instead, a sibling of the panel inside the dialog's root: from the tapped picture's box (record it in the mini player's and the dock's open buttons before `openNowPlaying()`, a small `lib/player/carry.ts`) to the cover's final box (its box less the panel's offset), on `--ease-house` over the panel's 380ms (set the panel's curve to the house curve so both land together), the real cover hidden until the clone lands, then swapped. Phones only (the panel slides from the side on a computer). Reduced motion: no clone, no slide.
4. Proof: `node scripts/motion-walk.mjs <export> --loaded track` before and after, and his walk.

### Note 2, one way to listen, the Bible's (not built)

The plan, held to the Bible's own components:

1. `components/bible/ReaderDock.tsx` made general: the chapter row from props (a name, an optional number, optional arrows as `{ label, href }` or `{ label, onGo }`, an optional `onPick` that makes the name a button and shows the title at the top while drawn in), and Listen from props (`listenHere`, `onListen`); the Bible's own logic (`readingOfSrc`, `spokenOf`, `listenToChapter`) moves up into `MobileChapterPill.tsx`, which passes it. `lib/bible/__tests__/readerDock.test.ts` reads both files' source and needs its strings moved with them.
2. `components/reading/ListenHere.tsx` split: a hook (`useListenText`: recorded, speaks, loaded, playing, busy, tap) used by the page's button and by the pill's; the page's button only on a computer (`hidden md:flex native-md-hidden`); the follow (`ListenFollow`, `SpokenFollow`) and the roll on into the next part stay in the page. It registers what Listen would read in a small store (`lib/listen/onPage.ts`, like `lib/player/pagePlayer.ts`), keyed by id: a council mounts every section (only the current one shown), so the pill picks the one whose `parseListenId(id).n` is the current section.
3. `components/saints/MobileWorkPill.tsx` (works and councils): Listen after the sound button, from the store; while anything is loaded (and the dock shows: native, or under 768px on the web), the general `ReaderDock` with the work's arrows (`onGo`), its part's name and `openWorkContents`; `useOwnPlayer(EVERYTHING)` when the dock shows, so note 14's one surface holds there too.
4. A text with no pill (a life, an event; a study's part unless it has parts to turn): a new `TextPill` drawn from `MobileChapterPill`'s pill (the name in the chapter's place, a hairline, the sound, Listen) that becomes the dock while loaded. Those pages then keep the reader's room at their foot (`pb-24 safe-pb-reader`, as `CouncilReader` does), or the pill covers their last lines.
5. Tests that fail on 78c5297e1: none of the five texts draws Listen in the page on a phone; with something playing each shows one bar, the dock. Then the stills for his yes (a work and a life at rest and playing, the dock on a council, one in Arabic) with `docs/1.9-build/redesign/tools/shots.mjs`, each through `checkMock` with pixels, before any build goes to him.

### Note 14, what is left

1. The end of the change: run `node scripts/motion-walk.mjs <export> --loaded track --shots <dir>` and look at the strips of Today to Bible and Bible to Today. If the dock snaps as the change ends, suspect its own transitions on mount (`.reader-dock` width and height in `app/globals.css`, "The reader's dock") or the cover crop of the two pictures (`::view-transition-old/new(foot-player)`), not the name itself. If the strip is smooth, the box check's threshold is too tight for a morph's sparse screencast frames and wants the judge's two-measure rule.
2. The sound pass: in `loadedTour`, wait for the Bible's pill before looking for its sound button, and count `[data-reader-pill]` as the foot's surface for `--loaded sound` (on the Bible with only a sound, the pill is the surface by design). Then compare with build 98's 56px jump into the Bible.
3. checkMock with pixels on the Bible with the dock and on Prayers with the mini player (390, 800, 1032; five palettes, fourteen looks, Arabic). The still pictures should not change: the bar was already absent under the dock, and a transition name draws nothing at rest.

### Seen on the way

- On build 98, Discover to Bible with a track loaded: the dock's "1×" (Speed) jumped 52px sideways in one frame about 1.1 to 1.4s after the tap (twice in three runs): something in the dock's chapter row changed width after the dock arrived. In `ReaderDock.tsx` (the row's left group or the timer). See the note for whether it repeats on the fix.
