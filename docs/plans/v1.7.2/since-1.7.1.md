# What we have done since 1.7.1

One entry per change readers can see, under its category, with the commit and whether it is live, gated, or waits for the store builds.

The owner's 1.7.2 list of 2026-10-19 (items 1 to 8), his two notes the same afternoon ("Read it in Purify" opening on the words, and the History pictures loading "spiratically"), his "ok just optimize them" for the covers, and his pick of paywall B with posters that open. All of it waits for the website deploy and the store builds; nothing is gated off.

## Fixes

- The reading room's rows and a collection's passages stand still on Android (b94dde04). Item 1.
- The phone's back closes the music player first, Android (58deb06f). Item 3.
- Landing on a verse from Continue dims the rest of the chapter for two seconds, with no box (5e161673). Item 5, the Luke 9 box.
- The top bar's Premium pill, streak, search and bell a size larger (1aee12ce); the pill's word and the streak's count grow only from 380px, after the walk caught the Filipino word cut at 360px (193c0a63). Item 6.
- Community: one quiet reactions row, no gold (bef3cc31). Item 7.
- The century timeline fades at its edges as the chapter strip does, and both click in the hand in the apps (8baa5a10, lib/ui/scrollTicks.ts). Item 8.
- Orthodox History's pictures: an AVIF beside each JPEG, 41% smaller, a 24px blurred preview, shown only once whole and decoded (4aeb7baa), with the JPEG taken when an AVIF is missing (5721278d).
- The reading room's covers: an AVIF beside all 90 cover JPEGs, 44% smaller, with the same fallback (ef6cc48e).

## Saints

None. The nine covers below are pictures of saints on their books, filed under library.

## Library

- Nine more books have covers (e20ff7f2): St Mary of Egypt (an icon), St Augustine, St James son of Zebedee, St James son of Alphaeus, St Jude, St Simon, St Matthias and St Theodosius (old Western paintings, no icon passed), and The Way of a Pilgrim (Perov's Wanderer). Item 2: 15 books keep the plain cover. St Augustine's and St Mary of Egypt's ship on his yes, his look decides.
- Read it in Purify, in Your first Liturgy, opens on the quoted words and lights them (1a8939eb, components/reading/QuoteFocus.tsx).

## Shop

None.

## Perks

- Paywall B (4462fe47): the scribe in black and white, no gold on any premium surface, the features as posters that scroll and open in the movable sheet with the posters on either side a step away. Your plan shows the same posters, with a way to six of the features. Item 4.
- The free trial shown only as the store gives it, Google Play's free phase or the App Store's free introductory offer for an eligible reader; Ambience while you read and Remember a verse, both live Plus locks, named among the features (d912d913).

## Stats

None.

## Community and plain lines

The reactions row above.

## Silent: admin and plumbing

- `PLAN_PRICE_CENTS` in lib/premium/plans.ts still says Plus 499 and 3899 cents while the prices are $9.99 and $71.99, so the admin's revenue estimate is low. Not changed in 1.7.2.
- The iOS free week on Plus Yearly does not exist yet in App Store Connect: the old "first year $19.49" introductory offer has to go first. Until it does, the iOS paywall shows no trial, which is the truth.
