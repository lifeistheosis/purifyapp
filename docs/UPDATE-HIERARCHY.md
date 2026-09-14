# Purify's Update Hierarchy

The six things every Purify release must account for. From the owner's board,
"things that must be included in every update", made enforceable on
2026-09-14.

The vocabulary lives in `lib/whatsNew/updateHierarchy.ts`. This file is the
prose around it. If the two disagree, the code is what the test holds.

## The six

| # | Category | Covers |
|---|---|---|
| 1 | 🐛 **Bugs and Maintenance** (Fixes) | 1.1 textual errors: typos, missing verse punctuation, translation alignment. 1.2 state retention: reading position, prayer rope counts, light and dark preference surviving a reload. 1.3 layout shifts across phone sizes and Safari and Android web views. 1.4 backend performance: caches, packages, fetch speed. |
| 2 | ✨ **New Saint Additions** (Saints Packs) | 2.1 full, curated lives of new saints and martyrs. 2.2 hymnography sync: Troparia and Kontakia attached to their feasts. 2.3 icons styled for the app. |
| 3 | 📖 **Library Experience** (UX Additions) | 3.1 ambient reading modes such as Candlelight and Monastery tones. 3.2 parallel and interlinear view controls. 3.3 focus typography for long devotional reading. |
| 4 | 🛒 **Shop Additions** | 4.1 catalog drops: EIKON boxes, prints, new items. 4.2 checkout: cart, payment, shipping address verification. 4.3 storefront presentation. |
| 5 | 💎 **Subscription Perks** (Tier Drops) | 5.1 Plus-only content: commentaries, anthologies, rare patristic bundles. 5.2 subscriber themes and fonts. 5.3 keeping a reader's tier correct on every platform. |
| 6 | 📈 **Stats Updates** (Growth) | 6.1 traction milestones: readers, accounts. 6.2 library size: saints, books, verses. |

## "Must be included" means "must be accounted for"

Not every release has a saints pack. A rule that demanded one would get a
filler line written to satisfy it, which is worse than no rule. So each release
from **1.4** on accounts for all six, one of two ways:

- **Shipped.** The note files at least one line under the category.
- **Skipped, with a reason.** Recorded for the repo and the owner. Readers
  never see "no new saints this release".

1.3 and everything before it are history and exempt.

## How to do it at release time

1. **File the lines.** In `/admin?tab=patch-notes`, every line of a note has a
   category picker. The editor shows which of the six have lines as you write.
   A line can stay uncategorised; it just does not count for any category.
   With the script, an item is either a plain string or
   `{ "category": "fixes", "text": "..." }`.
2. **Write the checklist.** Add `data/changelog/checklists/<version>.json`:

   ```json
   {
     "version": "1.4",
     "categories": {
       "fixes":   { "status": "shipped" },
       "saints":  { "status": "shipped" },
       "library": { "status": "skipped", "reason": "Reading modes moved to 1.5." },
       "shop":    { "status": "skipped", "reason": "No new pieces this cycle." },
       "perks":   { "status": "skipped", "reason": "Tier drops wait for Plus enforcement." },
       "stats":   { "status": "shipped" }
     }
   }
   ```

3. **Pull and bump as usual** (AGENTS.md §Release ritual). The test runs with
   the rest.

## What refuses a release

`lib/whatsNew/__tests__/updateHierarchy.test.ts`, when `CURRENT_VERSION` is 1.4
or later, fails the build when:

- the checklist file is missing, or names a different version;
- a category is not in it, or has a status other than shipped or skipped;
- a category is **shipped** but the newest note files no line under it;
- a category is **skipped** but the note does file lines under it, or the
  reason is empty or carries an em dash.

Each failure is a sentence naming the category, so a red build says what to
fix. Checked on 2026-09-14 by bumping a scratch copy to 1.4: no checklist
failed, a checklist claiming perks shipped with no perks line failed naming
it, an honest checklist passed.

## How readers see it

`components/whats-new/ReleaseDetails.tsx` groups a release's categorised lines
under short emoji headings, in the order above, and leaves out categories with
no lines. Old releases, which are plain strings, render exactly as before. The
admin editor's preview is the same component, so what the owner sees there is
what readers get.

## When time is short

The board lists the six as equals. They are not equal in what they cost when
missed, so when a release has to drop something, drop from the bottom of this
order, which is a recommendation rather than the board's:

1. **Bugs and Maintenance.** A forgotten reading position loses a reader today.
2. **Subscription Perks, 5.3 only.** A paying reader who cannot reach what
   they paid for is a refund and a review.
3. **Shop Additions, 4.2 only.** A broken checkout is revenue that never lands.
4. **New Saint Additions.** The library's reason to come back.
5. **Library Experience.**
6. **Stats Updates.** Worth saying, never urgent.
