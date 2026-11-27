# Putting Silver Night into the app: the methods

His word, 2026-11-27: "let's find design methods on implementing our new designs into our app". A plan for his yes: nothing here is built. Every surface it touches is drawn first from the app's own component on the export, passes checkMock, and waits for his yes (CLAUDE.md, "Mockups"); then the pre-build gate.

## 1. One picture per place, carried

Each place in the library gets one picture, used everywhere that place appears: its Discover door, its onboarding card, and the head of its own page. A tapped door's picture then grows into the page's head in one move, which the app already does (`BandPicture`'s `carry`, `lib/ui/routeMotion.ts`, `data-carry`) and which his rule asks of every card that opens a page ("a card that opens its own page carries its picture into it").

- **Why:** one picture per place reads as one world, halves the pictures to make, and makes the switch from door to page the house's best moment.
- **What it asks of the pictures:** made at 16:9 with the subject inside a centered 4:3 area, so one file crops to a 4:3 door and a 16:9 head. The prompts change one line.

## 2. Discover: tiles two across, each with its line

The doors become tiles two across (4:3), as in Hallow's grid, but each keeps the app's own line about what is inside, which he chose in 1.8 ("each part of the library a wide band with its picture and the app's line"): the name in white on the picture's dark foot, the line under it in two lines at most, never cut short.

- **Why:** the pictures are the reason to change; at 4:1 a band shows a sliver of them. Keeping the line keeps what 1.8 gave.
- **The other ways, named:** keep the bands (the art is lost to a strip); full-width cards (twelve screens of scrolling); one hero door and tiles below (stronger, but one door is then chosen over the rest).

## 3. One frame for every picture

The same treatment on every surface, so the art reads as a system:

- The card's radius and no border; the picture to the edge.
- A dark foot under the words, from the picture's own black, deep enough that white words stand at 4.5 to 1 on any picture (held by the words-on-pictures checks, `lib/ui/__tests__/wordsOnPicturesMends.test.ts`, and checkMock).
- The pictures stay dark on every palette, the Light one too: on a light page they read as windows onto the night, as Hallow's colours do on its black.
- A blurred preview while a picture loads, as `BandPicture` already draws.

## 4. Motion: still pictures, living heads

- Doors and cards are still: twelve moving pictures on one screen is noise and battery.
- The head of a page may move a little: its mist drifting at a steady speed, very slowly, and the picture moving slower than the page as it scrolls. Never a pop or a bounce; reduced motion keeps it still.
- The carry of section 1 is the one large move.

## 5. Empty states and letters

- **Empty states:** a new small pattern: the square picture at about 160 px, one plain line and at most one button, centered in the empty page. Today these pages show words alone.
- **Letters:** the 2:1 picture heads the letter in look 3 (`lib/email/look.ts`), dark in light and dark mail alike.

## 6. Files and records

- Each picture saved in `public/art/<place>.{avif,webp}`: 1600 wide for heads (16:9), cut by the app for doors; 1200 wide for letters; 640 for empty states. About 80 KB each, under 3 MB for all of them, well inside the export's limit.
- Each recorded in `docs/licensing/SECTION_MEDIA.md` as Purify's own, made with Gemini, with the prompt it came from.
- The saints, history, councils and prayers keep their real icons.

## The order, and the cost

1. His two answers: section 1 (one picture per place) and section 2 (tiles with the line).
2. The missing pictures, from the prompts (his Gemini time).
3. Discover drawn with the real pictures from the app's own component on the export, checkMock passing, for his yes: about $5 to $10.
4. Built behind a switch, with tests and the gate walk: about $15 to $25.
5. Then the heads, onboarding's cards, the empty states and the letters, one surface at a time, each drawn first.

## Built, 2026-11-27 (dark for readers; Testers mode walks it)

His word: "implement everything and send screengrabs at the very end". Commits `bcf1da08` and `a9e3b2b7`.

- **One picture per place** (`lib/art/art.ts`): nine of his picks built into `public/art/` (`scripts/art/build.mjs`, 5 to 25 KB each), shared by Discover's doors, onboarding's answer cards and the places' heads. `ART_LIVE` is off.
- **Discover as tiles** (`components/art/ArtTiles.tsx`): two across, the name on the picture's dark foot, the app's whole line under it, the reader's own order kept. Seven places have their picture (Find a parish, History, Councils, Chants, Shop, Start here, Reading); the other five show their old picture in grayscale until theirs is made.
- **Heads that take the carried picture** (`components/art/ArtHead.tsx`): Find a parish and Start here, with the mist drifting at a steady speed (`.art-drift`), still under data-motion="reduce".
- **Onboarding's answer cards**: the place's picture on the Fathers, the councils, history, a daily rule and quiet; the others in grayscale.
- **Black and white for the rest** (his word: "make the rest black and white so it matches the aesthetic and we will make custom images for them"): while Silver Night is on, `data-art` on `<html>` (`components/art/ArtRoot.tsx`) turns every picture still waiting for its own black and white by its folder (`/sections/`, `/discover/tiles/`, `/theology/subjects/`; app/globals.css). Then, at his word "yea all": the real icons and works too (the saints, history, the covers, the services, theology). Kept in colour by folder: the shop's goods and EIKON, the readers' own photos and campaign pictures, the kitchen's food, the banner looks a reader chose and What's New's pictures of the app.
- **Held by** `lib/art/__tests__/art.test.ts`; every screen pictured passed checkMock on the five palettes and the two earned (`docs/brand/art/shots.mjs`, `shots/`).

## Not built yet, and why

- **The other places' heads and pictures**: Saints, Theology, Calendar, Walkthroughs and Chat need their pictures (the prompts are ready), and each of those pages' tops is drawn for his yes before it changes.
- **The section heads** (Today, Bible, Prayers, Discover, You): their pictures are not made yet.
- **Empty states**: the pattern is ready to build, but only Offline has a picture, and the app has no offline page today.
- **Letters**: both have a picture slot, but the release letter's look 3 and the others' look 2 are designs he said yes to as they are; a picture in them waits for his yes on that look.
- **Theology**: one of its four pictures exists; his call whether Theology changes at all.
- **Rearranging the tiles**: the hold-to-move is built for a list; the tiles keep the reader's order but cannot be rearranged yet.
- **Before readers have it**: his yes on these screens, the missing pictures, the gate's walk, then `ART_LIVE`.
