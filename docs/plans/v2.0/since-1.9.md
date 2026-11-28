# What we have done since 1.9

One entry per change readers can see, under its category, with the commit and whether it is live, gated, or waits for the store builds.

Kept from 2026-11-28 on, at his word that day ("when v2.0 comes out incorporate it into the patch notes"). What 2.0 carries from before then is in `SCOPE.md` (A to C); the note is written from both. Each entry's first line is the reader's line, as the note will say it.

## Fixes

- **"Listen on the Verse of the Day plays only the words the card shows."** A long verse shown in part played whole (his word, 2026-11-28). `9ccf5a90`, `55031420`. Waits for the store builds.

## Saints

## Library

- **"Discover on a computer shows every place in the library with its picture, as the app does."** The pills and icon cards gave way to the phone's doors, side by side (his word, 2026-11-28: "push out the discover redesign update"). `66b50939`. Website only: on the main web from `c3ae34f2` (2026-11-28, his word: "make the ui desk top changes public"; the way back is `1aea88f7`), cut from main with Silver Night's tiles left out, since main has none.
- **"On the website's front page, the verse stands on white."** Nahum 1:7 on the palette's own white, where it stood on black (his word, 2026-11-28: "make this places background white rather than black"). `1c3ed590`. Website only: on the main web from `23d85812`, in the same push.

## Shop

## Perks

## Stats

## Community and plain lines

## Silent: admin and plumbing

## The website on 2.0

- From `a43e26d4` (2026-11-28) the main web runs 2.0, in silence, at his word: "keep the website public on v2.0 and drop mobile in announcement update batches. (so silently drop v2.0 updates)". The way back is `c3ae34f2`. Every entry above that the website draws is live there from that push; what the apps draw waits for their batch. The store builds are still 1.9 (`data/release/live-apps.json`), held by `scripts/apps-compat.mjs` on every push to main. The gift of Plus went live with it: its table run by hand by the owner, Stripe Tax off, as the shop's checkout has it.

## For the 2.0 merge

- Done in `fc83f475`: main merged into 2.0, and 2.0 pushed to main as `a43e26d4`. Main and the branch are one line again; a mobile batch is cut from the branch as before.

