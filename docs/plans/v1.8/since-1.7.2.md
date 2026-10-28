# What we have done since 1.7.2

One entry per change readers can see, under its category, with the commit and whether it is live, gated, or waits for the store builds.

Everything below is on `release/1.8`, not pushed, unless it says live: the
website has it at the push, the apps with their store builds. Cut on the
owner's "finalize v1.8 tonight" (2026-10-27). Three things hold the push or
the store builds, and the note says each only as it will be:

- **The New Testament audio waits on the bucket.** The recordings play from
  Purify's Cloudflare R2 bucket at audio.purifyapp.net (`0adb4b5f`). The
  bucket is the owner's to make (Homebase/tools/r2/README.md); then the 260
  recordings are uploaded and taken out of this branch's history, and only
  then is the branch pushed.
- **Phone checks before the store builds go to review:** listening with the
  phone locked, listening offline, and Read together, on the test build.
  A line whose check fails comes out of the note, here and in Admin.
- **The phone's own logo screen handing over to the intro** can only be seen
  on a phone.

## Fixes

- Back goes back the way you came from a book, a plan, Settings and Account (F-47, F-48). `94482b1f`, `b79c1311`
- The Android icon is sharp at every density. `dba82aee`
- The reading room's texts measured against their books: editors' notes and footnotes out of the Fathers' words, lost quotation marks back (F-49). `c1c123ac`, `dba3eefd`, `b0967063`, `e7a93df8`, `0a72eee3`
- Discover: long names break inside their tiles, soft previews while pictures load. `55a39924`
- The Confessions and other big works a book at a time, their contents by their own numbers. `844e09d0`
- Hymns from public-domain service books or marked ours; St Gregory Palamas's pages held to the editorial standards. `431f3294`, `57d17e9b`, `652ec946`, `847d0403`, `bbcd305e`
- A play that cannot start says so; a reading's title wraps in Now Playing. `53867144`, `dca79e5d`

## Saints

- New writings: St Celestine, St Irene, St Arsenius, St Justinian, St Tarasius, St Cyprian, St Alexander, St Ephraim on the Nativity, St Leo on the Nativity, St Gregory on the Nativity. `d485b895`, `be96760c`, `bf8f91ff`, `d84d0ff1`, `d0b8cd7b`, `c65140c1`, `17eff1a7`, `02d5956b`, `b1101fa6`
- St Gregory the Theologian's orations, all 24 of NPNF II 7. `7c4d7b99`
- St Cyril on Luke, checked through against the 1859 printing and Pearse's pages, and on the Nativity path. `2f4c2dec`, `4b2e9636`, `6bff051c`
- A saint's name in a text opens their card. `a75fe820`, `91fa73c3`
- Orthodox History: sixteen events written in full, eight more with their picture. `cf71dc2f` and the "History in full" commits of 2026-10-22
- Theology by subject with icons, the studies deepened, twenty-one heresies in the councils' words, every council's texts (Trullo, Sardica, Carthage, Antioch, Jerusalem 1672, Orange). `fd6e555a`, `d5def856`, `e96eca26`, `f397ff97`, `8f253b73`, `3f953bf3`, `5f9ee37d`, `4fe103a5`, `6c1ae34a`, `aa6027d1`, `90b95c66`, `e11f058a`, `16305c8e`, `25adc3f6`, `69c989f6`

## Library

- The whole New Testament read aloud, 260 chapters. `a2bec4b7`, `77fb97d7`, `1c5fc41a`. Gated: plays from the bucket (`0adb4b5f`), which must hold the recordings before the push.
- Today's readings read aloud; memorial days; name day; history on the map; the Fathers on everyday struggles; maps that pan on a phone. `55a39924`
- Who said it? and its picture. `ece23b83`, `55a39924`
- Every work says where its words come from. `59dd7796`
- Reading paths, Toward the Nativity, Read together (its SQL ran 2026-10-26; on since `90a15797`). `5a5b8e27`, `b1101fa6`, `046adcc4`
- The saint of the day in their own words on Today. `ee3bffbf`
- The councils on a map, with a slider through the years. `415fa797`, `b2b8c78a`
- Listen with the phone locked, in both apps. `b56a2233`. Waits for the store builds and a phone check.
- The apps open on the horizon, with the phone's logo screens drawn to match. `dcc6c09b`, `97ccadc3`
- Highlights: yellow back, a double tap highlights a verse. `8ef9ba65`, `38436191`

## Shop

- No gold, black and white, four tabs at the top. `a239df18`, `02fdd6cb`
- The multi-buy in steps. `5bccf1bd`
- An icon's saint in their own words, and the way to their writings. `f4ca6e71`

## Perks

- Ambience: cathedral bells, the sea and wind. `ebf6b4f4`
- Listen offline, for Plus, in the apps. `55a39924`. Waits for the store builds and a phone check.

## Stats

- No totals restated this release (data/changelog/checklists/1.8.json).

## Community and plain lines

- Read together's circles are its community part; no other Community change.

## Silent: admin and plumbing

- Live already (pushed alone to main): the admin usage log and readout, Today's buttons at 44px, the onboarding counted as totals with Traffic > Onboarding, and the privacy page's paragraph on it. `002687dc` here, `99edb873` and `74b91f9d` on main.
- Email: no more mail to dead addresses (a signed Resend webhook), support@ as the reply address with inbound mail as tickets, and the rest of the 2026-10-22 audit. `6422fa7a`. At the deploy: the webhook in Resend and RESEND_WEBHOOK_SECRET on Render (the owner's).

## Not in 1.8

- Chants beyond the Anthem: wait on the owner's recordings; 1.9.
- The screens locked on 2026-10-27 (Bible reader, praying, Premium pill, chant page, shop, theology, saint page, Discover, paywall, Prayers home, player): 1.9 (Homebase/boards/purify-master/variants/INDEX.md). Today waits on his mockup.
- Onboarding version 4 and "Where are you coming from?", Find a parish and the parish plan: 1.9.
- The admin layout (A, B or C): admin only, pushed on its own when he picks.
