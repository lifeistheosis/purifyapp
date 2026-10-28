# What we have done since 1.7.2

One entry per change readers can see, under its category, with the commit and whether it is live, gated, or waits for the store builds.

Everything below is on `release/1.8`, not pushed, unless it says live: the
website has it at the push, the apps with their store builds. Cut on the
owner's "finalize v1.8 tonight" (2026-10-27). Two things wait on a phone,
and the note says each only as it will be:

- **The New Testament audio plays from Purify's R2 bucket.** He moved the
  bucket to 1.8.1 ("do this in v1.8.1", then "From the website"), then made
  it the same night ("r2 is done"). So the 260 recordings (284 MB) are in
  the bucket at audio.purifyapp.net, every one answered from the website's
  and both apps' origins (Homebase/tools/r2/verify.mjs: 780 of 780), and
  they were taken out of this branch's history before the push: none is in
  the repository. The switch went in, out and in again (`e56aba66`,
  `c7d43292`, `4327b078`, then `01ff9b38` so offline saving still knows the
  playing book). The Old Testament will go only to the bucket.
- **Phone checks before the store builds go to review:** listening with the
  phone locked, listening offline, and Read together, on the test build.
  A line whose check fails comes out of the note, here and in Admin.
- **The phone's own logo screen handing over to the intro** can only be seen
  on a phone.

## Fixes

- Back goes back the way you came from a book, a plan, Settings and Account (F-47, F-48). `761987ef`, `6e319684`
- The Android icon is sharp at every density. `4f306b80`
- The reading room's texts measured against their books: editors' notes and footnotes out of the Fathers' words, lost quotation marks back (F-49). `ed7f910c`, `46137d69`, `98f763a3`, `92a836fa`, `8bb09ce0`
- Discover: long names break inside their tiles, soft previews while pictures load. `5ac943ef`
- The Confessions and other big works a book at a time, their contents by their own numbers. `3ebd1155`
- Hymns from public-domain service books or marked ours; St Gregory Palamas's pages held to the editorial standards. `cf9ec853`, `29ad89f8`, `c1da9ead`, `ac2f118c`, `68f1dad4`
- A play that cannot start says so; a reading's title wraps in Now Playing. `c2ceff06`, `d8e3af63`

## Saints

- New writings: St Celestine, St Irene, St Arsenius, St Justinian, St Tarasius, St Cyprian, St Alexander, St Ephraim on the Nativity, St Leo on the Nativity, St Gregory on the Nativity. `7faad320`, `5413588f`, `31ffcfbe`, `1edde4cf`, `8e88416e`, `41e83f19`, `f8da7088`, `eb2866c6`, `286fbc7b`
- St Gregory the Theologian's orations, all 24 of NPNF II 7. `6f558350`
- St Cyril on Luke, checked through against the 1859 printing and Pearse's pages, and on the Nativity path. `73192549`, `beaaeef0`, `06ef963a`
- A saint's name in a text opens their card. `ae933c96`, `d268d2e5`
- Orthodox History: sixteen events written in full, eight more with their picture. `86213bfb` and the "History in full" commits of 2026-10-22
- Theology by subject with icons, the studies deepened, twenty-one heresies in the councils' words, every council's texts (Trullo, Sardica, Carthage, Antioch, Jerusalem 1672, Orange). `32eb542a`, `277346a9`, `21b1b67d`, `098a2eeb`, `cb96bdb0`, `b94435b6`, `468ef071`, `022488ff`, `c4bfa37a`, `e51ccf8a`, `8f297db9`, `f3ba54de`, `5ea21d8e`, `726e3b47`, `64d88627`

## Library

- The whole New Testament read aloud, 260 chapters, from Purify's R2 bucket. `c73ea2b4`, `bf206aef`, `41e8e00b`. Live at the push.
- Today's readings read aloud; memorial days; name day; history on the map; the Fathers on everyday struggles; maps that pan on a phone. `5ac943ef`
- Who said it? and its picture. `e05bcb4c`, `5ac943ef`
- Every work says where its words come from. `058550ae`
- Reading paths, Toward the Nativity, Read together (its SQL ran 2026-10-26; on since `0244febd`). `ff3f151a`, `286fbc7b`, `e33cfadc`
- The saint of the day in their own words on Today. `fd3c27e4`
- The councils on a map, with a slider through the years. `b27eebc1`, `ab58990c`
- Listen with the phone locked, in both apps. `b3edd811`. Waits for the store builds and a phone check.
- The apps open on the horizon, with the phone's logo screens drawn to match. `03f175bf`, `d8e01187`
- Highlights: yellow back, a double tap highlights a verse. `e0121e60`, `c812e2a7`

## Shop

- No gold, black and white, four tabs at the top. `379fd2d2`, `55a3240d`
- The multi-buy in steps. `499e9864`
- An icon's saint in their own words, and the way to their writings. `8868d8e2`

## Perks

- Ambience: cathedral bells, the sea and wind. `0ea8c80b`
- Listen offline, for Plus, in the apps. `5ac943ef`. Waits for the store builds and a phone check.

## Stats

- No totals restated this release (data/changelog/checklists/1.8.json).

## Community and plain lines

- Read together's circles are its community part; no other Community change.

## Silent: admin and plumbing

- Live already (pushed alone to main): the admin usage log and readout, Today's buttons at 44px, the onboarding counted as totals with Traffic > Onboarding, and the privacy page's paragraph on it. `260f2f04` here, `99edb873` and `74b91f9d` on main.
- Email: no more mail to dead addresses (a signed Resend webhook), support@ as the reply address with inbound mail as tickets, and the rest of the 2026-10-22 audit. `51216620`. At the deploy: the webhook in Resend and RESEND_WEBHOOK_SECRET on Render (the owner's).

## Not in 1.8

- Chants beyond the Anthem: wait on the owner's recordings; 1.9.
- The screens locked on 2026-10-27 (Bible reader, praying, Premium pill, chant page, shop, theology, saint page, Discover, paywall, Prayers home, player): 1.9 (Homebase/boards/purify-master/variants/INDEX.md). Today waits on his mockup.
- Onboarding version 4 and "Where are you coming from?", Find a parish and the parish plan: 1.9.
- The admin layout (A, B or C): admin only, pushed on its own when he picks.
