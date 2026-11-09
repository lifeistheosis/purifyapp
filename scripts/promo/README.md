# The promo maker

Still frames and two-second clips for Purify's ads, 9:16 (1080x1920), made
from the app itself. Built for the 1.8 promo (2026-11-08) and kept so the next
release's promo starts from here, not from nothing.

**These seven looks are PR promo, kept for later** (the owner's word,
2026-11-08: "save these for general promo ... more PR, like company promo").
They are clean and calm: right for the company's own promo, not for the
fast-cut edits that get the most views. Edits go all in on visuals instead:
the main subject in the middle of the screen, no phone, words on the screen
as if zoomed in, and what catches the eye is the icons, the photography, the
map and the animations (the saint web, the music player, history on the map).

Everything it makes goes in `.promo/` (out of git; `PROMO_DIR` moves it):
the screens, the house fonts, the art, the pages each look is drawn in, the
stills, the clips and the reels.

## The rules it keeps

- **A screen is what the app showed.** Every phone holds a screenshot of a
  local-first export, opened as the apps open it. Nothing in a phone is drawn
  by hand, and only the free palettes are shown (Dark, and Light for the
  psalm): an ad never shows a Plus palette as if every reader had it.
- **Every word is true of the app as it is.** Check each claim against the
  build before it goes out: 1.8 has one akathist, so "the akathists" was
  wrong; Plus is paid, so the app is "free to download", not "free".
- **Scripture and the Fathers word for word**, as the app gives them, cited.
  The art is the app's own verified public-domain art, its credit beside it
  in both versions (`lib/saints/iconRights.ts` has the record).
- **Light is a soft pool, never rays.** A burst of separate beams behind a
  subject (a repeating conic gradient, a sunburst) is vibe-coded AI slop, the
  owner's word of 2026-11-08 on the first edit frames. The promo test fails
  any script that draws one.
- **The house's voice and type**: Lora and DM Sans out of the export, the
  house colours, no em dashes. `lib/marketing/__tests__/promoLooks.test.ts`
  holds the words.
- **Both versions of every look**: with words, and clean for the editor to
  set their own.

## Making it

Needs Node, Playwright's Chromium and `ffmpeg`.

```
npm run build:android                     # the export the screens come from (out/)
node scripts/promo/capture.mjs            # screens, fonts, art -> .promo/
node scripts/promo/frames.mjs             # stills and contact sheets -> .promo/stills/
node scripts/promo/motion.mjs 2 both all  # look 2's ten clips -> .promo/clips/
node scripts/promo/check-ends.mjs         # every in-move ends on its still
node scripts/promo/reel.mjs 2 words       # look 2's five moves in one labelled reel
```

To promote a release that is already live, build the export from `main` in
a worktree and pass it: `node scripts/promo/capture.mjs --export ../purify-main/out`.
The screens show the day they were taken, and look 5 names that day.

A machine with no `.env.local` (a cloud session) needs two things for that
build, both kept out of git (2026-11-09):

- **Placeholder public settings**, or every screen opens on "This page
  couldn't load", since the Supabase client refuses to start without them.
  The screens never reach the network (`scripts/lib/shell-server.mjs`
  answers from the bundle), so nothing real is needed:
  `NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-anon-key NEXT_PUBLIC_SITE_URL=https://purifyapp.net NEXT_PUBLIC_SHOP_ENABLED=1 npm run build:android`
- **A stub for the shop's two catalog pages**, `shop/[store]` and
  `shop/icons/[slug]`: with no catalog to read, their `generateStaticParams`
  return nothing and the export refuses them. In the worktree only, let each
  fall back to one `"placeholder"` entry when the list comes back empty.

The edit frames (`edits.mjs`) take their screens with
`node scripts/promo/edit-capture.mjs --export <export>`. The fourteenth,
Toward the Nativity, is Today's card for the Nativity Fast, which shows only
while the fast runs, so its screen is taken with the clock on the fast's
first day (15 November): the card every reader sees that morning.

## The looks (`looks.mjs`)

1. **Night sanctuary**: the Bible with the Fathers, a phone in a pool of warm light.
2. **Manuscript**: Psalm 22:1 (Brenton) set large on parchment, the first letter in red.
3. **Mosaic**: St John Chrysostom's mosaic from Hosios Loukas, over his own homily.
4. **Kinetic type**: "Pray." as large as the frame allows, over the morning prayers.
5. **The Church's day**: Today, with the day's number behind it.
6. **Product shot**: three phones, the saints, the psalm, the calendar.
7. **Close-up**: the red verse numbers up close, tilted away.

## The moves (`moves.mjs`)

Two seconds, 60 frames a second, drawn at 2x and scaled down.

- **Rise**: the words come up line by line out of their own windows; the phone rises in.
- **Reveal**: the words are wiped in; the phone slides in from the side and settles; a light crosses its glass.
- **Focus**: the whole frame comes into focus from a blur; the words follow.
- **Push**: the ground, the phone and the words move at three depths.
- **Float**: the phone breathes; a light crosses its glass.

Rise, Reveal and Focus end on the still and hold it for the last third of a
second (`check-ends.mjs` proves it to the pixel), so a cut to the still is
seamless. Push and Float start and end mid-move, to be cut anywhere.
`PREVIEW=1 node scripts/promo/motion.mjs all words all` draws five moments of
every clip, small, in seconds: look at that before the long render.
