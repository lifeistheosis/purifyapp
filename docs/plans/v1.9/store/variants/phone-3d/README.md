# Store pictures: the phone in 3D, one sample

His word to the store pictures chat, 2026-11-12: "can you make the phone 3d?"

One picture, to see it before anything else is made again: `phone-3d-play-phone-01-today.png`, Play phone 01 (Today), 1080 by 1920, on design A1's back (Dawn). The screen is the set's own, untouched.

## What was made

The body is a solid slab with real thickness, about a phone's own proportion, turned in perspective: 25 degrees about the upright, 7 about the level. Its front edge is lit, its side is shaded from front to back, and it casts a shadow on the hills behind it. It is built from boxes the browser turns in space (the face, and behind it a stack of thin leaves that make the side), so every colour is still a palette token and the picture is still held to checkMock.

## What it is not, and why

It is a plain slab and not a model of any phone: no camera, no speaker, no button, no maker's shape.

- **App Store.** Apple's Marketing Resources and Identity Guidelines do not permit "rendering in 3D or creating any simulation of an Apple product", and allow a generic device only without details unique to Apple's (they name the Home button, the sensor housing, the Ring/Silent switch and the volume controls). A real iPhone may be shown only as Apple's own bezel, upright and unaltered.
- **Google Play.** Its page recommends against device imagery on screenshots and the feature graphic. That is advice and not a requirement: the page says failing it does not affect the listing.

So a plain 3D slab is allowed on both stores. It goes against Play's advice, which is his to weigh.

## Checks

checkMock passes all fifteen rules on five palettes, with the scrollbar's room off. The heritage list is held again: the only picture in view is St Nicholas on Today. Nothing fans out from a point, and the only light is A1's one soft pool.

## To know

- The turn makes the app's finest print a little softer than the upright screen, as design B's did. It reads well at the store's sizes.
- On a tablet the same body would be a wide slab. It can be made, with a smaller turn.
- `node docs/plans/v1.9/store/variants/phone-3d/phone-3d.mjs` makes it again. The turn, the thickness and the back are a few values at the head of the script.
- `../../make.mjs` gained one guard from this: on Today the one-question card is tapped again if the page moved under the finger. Once, here, the card stayed in the picture.
