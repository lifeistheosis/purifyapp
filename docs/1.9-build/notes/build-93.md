# Build 93 on his phone (notes)

Android build 93 (run 42912297514, from `8abb0fc88` on `ccr-07896cf2-bo0afd`),
the test build of 2026-11-10 evening: the release build, R8-shrunk, talking to
the main web (the test web is not set up yet). It holds the plugin-trap mend
(F-51) for the notification-bar player and for the "is Purify blocked" check,
and the headphone-button receiver.

What build 93 cannot show, so not bugs (it talks to the live 1.8 website):
campaigns, journal sharing, the new sync, the Bibles' downloads, the 1.9
counts, the Psalms move.

He is walking it under his word of 2026-11-11 about 00:56 UTC, "rec for all and
finalize this build", so each note here is a fix for 1.9 unless it asks for
something new, which goes to his page as a call. Each note says what he saw, in
his words with his screenshots, and who has it.

## His notes

### 1. St Alexander's picture is missing on Nicaea's page, and Back lands at the bottom (2026-11-11 about 01:13 UTC)

His words: "So, image 1 is the first council of Nicaea. Image 2 is me clicking
on St. Alexander the Great, his profile photo. Also, you could clearly see that
his photo isn't loaded. And when I go to image 3, right, when I click back to
go back to the first council of Nicaea, it scrolls all the way down. Well, it
actually doesn't scroll, it just randomly places you at the bottom of the first
council of Nicaea, which is an issue because it should be placing you at the
top of the page of first council of Nicaea."

Screenshots: `build-93/01a-nicaea-fathers-row.png` (the Holy Fathers row, St
Alexander's circle empty), `01b-alexander-page.png` (his own page, with an
icon), `01c-back-lands-mid-page.png` (Back from his page lands deep in the
council's text, not where he was).

What the code says (the arbiter, read only):
- St Alexander's icon, `/saints/icons/alexander-of-alexandria.jpg`, has no
  source, licence or attribution recorded (`lib/saints/iconRights.ts`: a
  contemporary painted icon, his name in Latin letters, not found on Commons).
  The council's row (`components/councils/CouncilFathers.tsx`) draws only
  pictures whose rights are recorded, so it draws an empty circle, while his
  own page still shows the unrecorded icon. So two faults: an empty circle
  where the plate should stand, and a picture with no recorded rights on his
  page.
- Back: the app starts the step back itself so the page transition can run
  (`docs/1.9-build/notes/transitions-fable.md`, point 3); the scroll put back
  on the council's page is wrong.

Who has it:
- Updates 2 (icons): a public-domain icon of St Alexander of Alexandria, or the
  plate, the same picture on his page and in every row; and never an empty
  circle anywhere: where no cleared picture exists, the plate.
- Fable Theology (built the page transitions): Back returns a page to where the
  reader left it (here, the top of Nicaea's page), on every page with a way
  back, with a test.

### 2. Easy Scroll on the prayers still fights the finger (2026-11-11 about 01:19 UTC)

His words: "The smooth scroll on the prayers is still buggy. Like it when I try and scroll down, it scrolls back up. When I try and scroll down, it just keeps on scrolling, so it's still buggy. And I guess it's just not refined for like UX experience"

History: build 89 note 7 (Easy Scroll, `3be66d8c1`), build 90 note 6 (a stop at every verse, `4639fa9e8`, Updates). Two faults now: a swipe down is pulled back up, and a swipe down runs on.

Who has it: Updates (built both rounds). The bar, on the arbiter's word under his "finalize this build": the scroll never fights the finger. Find what pulls the page back and what lets it run on, on the export with real touch, at three sizes, swiping down and up. If a fix that feels like the phone's own scroll is proven there within about three hours, ship it; if not, 1.9 ships the phone's own scroll on the prayers with no snapping, keeping what readers gain from it (the verse at the reading place lit, the click as each new prayer arrives, each prayer counted as it is passed), and the snapping waits for 1.9.1 and his word.
