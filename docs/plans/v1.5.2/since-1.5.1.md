# What we have done since 1.5.1

1.5.2 is a refinement patch on top of 1.5.1, opened on 2026-10-05 from a list
the owner dictated from his phone ("there is a couple bugs that we can fix").
Everything here was found by measuring the live app at a phone's size first
(390 by 844, the apps' own shell) and is one branch, `release/v1.5.2`. Nothing
is gated behind a switch. The website has all of it the moment `main` is
pushed; the phone and Windows apps have it with their next builds.

## How it was found

| What the owner said | What was measured | What it was |
|---|---|---|
| "it's zoomed in in certain parts" (a saint's work) | Every work opened 493px wide on a 390px phone | Three desktop pills (MODE, FONT, SIZE) in a top bar with room for one |
| "when you click the question mark ... it pretty much zooms in" | The page grew to 583px, 193px past the edge | A 280px box opened from the "?" button's own left edge |
| "it loads in a weird way" | From the saints list at 7,176px, a saint opened at 5,979px; from the shop at 1,096px, a product at 1,147px | The router skips its scroll to the top when the new page's first element is already on screen, and Chrome's scroll anchoring then drags the scroll as the page arrives |
| the same | A black screen for 150 to 400 ms after a tab tap (filmed with the processor slowed four times) | The leaving screen faded to nothing and stayed there until the next one committed |
| "it is laggy" (the shop) | 1,270 ms of drawing for six swipes down and back; 633 ms with one effect removed | `backdrop-blur` on the heart button of every product card, each card itself moving with the scroll |
| "it doesn't do anything" (notifications) | A follow row changed the address and nothing else | The rows were links to `#@handle` and `#post-id` on the same page; Next changes that with `pushState`, which fires no `hashchange`, so the page never heard it |
| "the flame ... it's kind of cut off at the top" | The glow hangs 18px outside the flame's box, with 4px of room | A sheet's body scrolls, and a scrolling box clips what hangs outside it. A grey flame has no glow, so the sheet looked right with no streak |
| "the prayers image ... just doesn't look good" | The file itself ends at the beard | A soft photograph of a mosaic, cropped 16:9, under a wash that covered its lower half |

## Fixes

- 📝 **Nothing slides sideways.** A Father's work's top bar is the back arrow, the title,
  search and one gear (`components/saints/MobileWorkActions.tsx`), which opens
  the Bible reader's settings sheet. The saint's "?" is a line of text that
  opens the shared sheet (`components/saints/BumpButton.tsx`). `app/globals.css`
  clips the page's width on phones and in the apps (`overflow-x: clip`, never
  `hidden`, which would break every sticky bar), and `scripts/export-walk.mjs`
  section 8 looks for any box past the right edge on fourteen screens at two
  widths before a release.
- 📝 **Pages open at the top.** `lib/ui/scrollReset.ts` puts a forward
  navigation at the top itself and switches scroll anchoring off until the
  reader touches the page; `components/nav/ScrollResetBridge.tsx` mounts it.
  Back and forward, `#` links and a work's saved reading place are left alone.
  A product opened from another product resets too
  (`ProductDetailFromQuery`). Tested in `lib/ui/__tests__/scrollReset.test.ts`
  and walked in `export-walk.mjs` section 9.
- 📝 **No black flash between tabs.** The leaving screen dims to two fifths
  and stays (`body[data-route-exit]` in `app/globals.css`). Community holds
  the composer's and the filters' places while it loads, so its four steps no
  longer push each other down, and Discover's picture is the same shape as
  its loading placeholder.
- 📝 **The streak's flame is whole.** `FlameStage` in
  `components/streak/StreakFlame.tsx` is a box as large as the glow, so
  nothing above it can cut it; the "We got you this time" sheet uses it too.
- 📝 **Search on a phone is a full screen** (`components/search/
  CommandPalette.tsx`): a round field, Cancel, one result per row, a list that
  ends above the keyboard (`lib/ui/viewport.ts`), and Android's back button
  closes it, which the old comment said it did and it did not.
- 📝 **A saint's Request and Save are one row at one height,** with the
  request's note and its explainer under both. On Discover, Settings spans
  the row an odd count left half empty.

## Saints

Nothing added. Skipped, with the reason in the checklist.

## Library

- 📝 **Every reading setting on a Father's work.** The gear opens size,
  typeface, line spacing, reading mode and focus reading. The three pills it
  replaces offered three of those, and only by cycling.

## Shop

- 📝 **The bar.** `components/shop/ShopSubTabs.tsx`: six sections as tabs,
  the current one marked by a gold line, the cart pinned at the right with its
  count. Browsing a category or a piece keeps Explore lit. The apps write the
  shop's address as `/shop/` where the website writes `/shop`, and the bar
  reads both the same way: in the first export it stood on the shop's front
  page with no tab marked, which only a screenshot showed
  (`scripts/export-walk.mjs` section 10 looks for it now).
- 📝 **The chips.** `components/shop/CategoryChips.tsx`, one row for the
  shop's front page, a category and a store: the current kind in solid gold,
  each with the catalogue's own count.
- 📝 **Rows that scroll sideways** are `components/ui/ScrollRail.tsx`: no
  scrollbar, a fade at the end that has more, the current item in view.
  Community's filters and the quick ways in at the top of Prayers are the
  same rail, so the three surfaces read alike.
- 📝 **Smoother, and there at once.** The heart button's blur is a flat tint
  (half the drawing work, measured). The front page paints from the last
  answer of this visit and asks again behind it (`peekShopHome`, memory only,
  so a stale price is never kept on the device). Photographs fade in
  (`VitrineImage`). The free-shipping line holds its place while the shop's
  settings are read.

## Perks

Nothing changed. Skipped.

## Stats

Nothing added to the library. Skipped.

## Community and plain lines

- 📝 **The onboarding begins again for everyone** (`ONBOARDING_VERSION` 3,
  `lib/onboarding/state.ts`). Until now any reader who had used Purify before
  28 September was marked done without one question. A signed-in reader from
  before this version comes in by "We updated our onboarding"
  (`components/onboarding/FirstRunGate.tsx`, way 3): no welcome, no account
  step, earlier answers marked, reminders asked only where the device has
  none, and the first step called a next step and not a Day 1. Their
  calendar and fasting rule are never reset by the level they pick: only the
  practicing are shown both, and may change them. The account's copy of the
  answers carries the version (`purify_space.v`), so a second device takes
  them and asks nothing. Signed out on a phone's browser, the front page is
  still left alone.
- 📝 **Notifications take the reader there.** `lib/community/
  notificationTarget.ts` decides (tested); a person opens their profile, a
  post opens with its thread and the reply lit (`PostFocus` in
  `CommunityClient.tsx`). A post outside the feed's newest fifty is read by
  its id (`GET /api/community/posts?post=`, by the feed's own rules and
  projection). A link to a post from a push or an email does the same. The
  inbox shows four rows, then "See all", and rows that were new keep their
  mark while the panel is open.
- 📝 **Prayers' picture** is Christ Pantocrator of Sinai, whole, beside the
  section's words (`portrait` in `lib/media/sections.ts`), cut from the copy
  the shop already carried; `docs/licensing/SECTION_MEDIA.md` has the record
  and why the Deesis photograph was withdrawn. The other four plates are set
  in, rounded, with the wash kept to their foot.

## Silent: admin and plumbing

- `scripts/optimize-images.mjs`: encodes the bundled pictures again and
  keeps a result only when it is at least 12% smaller and measures 38 dB or
  better against the original. Six files, 2.27 MB: the four product cut-outs
  (2.79 MB to 0.55 MB) and two section plates. A second run changes nothing:
  a cut-out it has already quantised is known by its palette and passed over.
  The script already existed, for two folders; it was overwritten by mistake
  as though it were new, and rebuilt on its own rules. Its header says so.
- `scripts/export-walk.mjs` has three new sections: nothing wider than the
  phone (8), a page opened from a scrolled list starts at its top (9), the
  shop's bar marks where the reader is (10). It also names any page it does
  not find in the export, where it used to pass over it in silence: the
  first export of this patch was built without the shop's settings, had no
  shop at all, and walked all green.
- Six new strings in all 21 languages.
- The release tools start past the onboarding at version 3.

## The export, weighed

564.1 MB in 12,018 files with the shop on, 0.54 GB without `_next` against
the 0.60 GB budget. This branch built with the shop off was 0.53 GB, which is
what 1.5.1 measured, so nothing here shows at that scale: 1.5.1 was the cut
(720 MB to 551), and this patch is 2.27 MB of pictures. What is left is
where 1.5.1 said it was: 279 MB of Bible chapters, most of it the frame each
page carries, and a 33 MB content package that repeats what the pages hold.

## Looked at and left alone

- **The verse of the day table** on Today, 122 KB on the two pages the app
  opens to (named in 1.5.1 as next). Moving it to a file would make the first
  card on the first screen arrive after the page. That is the wrong trade in
  a patch about loading.
- **The shop's other costs.** The shadow under each photograph (about 13% of
  the drawing) and the rise of each card as it scrolls in (about 18%) are the
  look the owner approved on 30 September. Both stay.
- **Every other bundled picture.** 220 of 226 are already tight: encoding
  them again saved under 12% or measurably changed them.
- **The blurry plates.** Bible (the Codex page) and You (the Ladder) are
  soft photographs. Sharper sources exist on Commons; fetching one is a
  download, which is the owner's to say yes to.
- **A reader settings row for a Father's work on a computer.** The three
  pills only ever showed on a phone, so a computer has none there. Out of
  scope for a phone patch.
