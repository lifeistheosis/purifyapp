# Highlighting and the Florilegium

**UI/UX architecture for text selection, highlighting, and quote-gathering.**

Status: specification. Nothing here is implemented.
Written 2026-08-10 against `901f4353` on `feat/saint-icons-and-stylites`.

---

## How to read this document

This is not a greenfield design. Purify already ships word-level highlighting,
a five-colour palette with reader-renamable meanings, a long-press toolbar, a
Greek/English Strong's alignment, and a Florilegium with Supabase sync. The
value of this document is being accurate about what ships, what is broken, and
what is genuinely missing.

Every claim carries a `file:line`. Every number was computed or read, not
estimated. Where a claim is unverified, it says so.

**Section 0 is the part to act on first.** It lists eight defects that are
already in production and are worth fixing regardless of whether any of the
rest of this document is ever built.

---

## 0. Ground truth

### 0.1 What ships today

| Capability | Where | Notes |
|---|---|---|
| Whole-verse highlight | `lib/bible/annotations.ts` | `VerseAnnotation.highlighted` |
| Word-level highlight | `lib/bible/annotations.ts` | `highlightedWords: number[]` |
| 5 colours, renamable meanings | `lib/bible/highlightColors.ts` | `useHighlightLegend()`, key `purify:bible:highlight-legend` |
| Desktop drag-to-select words | `components/bible/VerseRow.tsx` | `elementFromPoint` + `[data-word-idx]` |
| Mobile long-press toolbar | `components/bible/MobileVerseToolbar.tsx` | 6 actions plus a swatch row |
| Greek/English alignment | `components/bible/VerseRow.tsx` | occurrence-indexed per Strong's number |
| Florilegium | `lib/florilegium/florilegium.ts` | `scripture` and `father` item kinds |
| Cross-device sync | `lib/sync/annotations.ts` | local-first, fails silent |
| Offline record kind | `lib/content/schema.ts` | `"highlight"` already declared in `UserRecordKind` |

### 0.2 The defect register

Eight defects, each verified by reading the file in this session. They are
independent of every feature proposed below.

---

**D1. The Fathers reader ships a dead button.**

`components/bible/MobileVerseToolbar.tsx:214-221` renders the gather action
unconditionally. There is no guard, unlike the clear-words button which is
gated on `state.hasWordHighlights`.

`components/saints/ParagraphRow.tsx:412-427` handles four cases and has no
`default`:

```tsx
onAction={(a: MobileVerseAction) => {
  switch (a) {
    case "highlight": ann.toggleHighlight(); break;
    case "bookmark":  toggleSectionBookmark(); break;
    case "copyLink":  copyParagraphLink(); break;
    case "note":      setDraft(ann.note ?? ""); setEditing(true); break;
  }
}}
```

`handle()` at `MobileVerseToolbar.tsx:92-95` calls `onClose()` regardless of
whether the action was handled. So a reader long-presses a paragraph of a
Father, taps the flower, the toolbar dismisses, and nothing is saved. Silent
no-op, in production.

**Fix:** add `case "gather"` opening `FlorilegiumPickerSheet` with a
`kind: "father"` item, or hide the button when no handler exists. Adding a
`default` that throws in development would have caught this.

---

**D2. Long-press haptics are dead on iOS.**

`components/bible/VerseRow.tsx:309` and `components/saints/ParagraphRow.tsx:97`
both call `navigator.vibrate?.(15)` directly. iOS WKWebView has never
implemented `navigator.vibrate`, so every long-press on every iPhone is silent.

The codebase already knows this. `components/nav/MobileTabBar.tsx:225` carries
the comment "iOS WKWebView has no navigator.vibrate", and `lib/ui/motion.ts:73`
exports the correct wrapper, which branches on `isNativeClient()` and dispatches
to `@capacitor/haptics`. The two readers are the only files that bypass it:

```
components/bible/VerseRow.tsx:309:     navigator.vibrate?.(15);
components/saints/ParagraphRow.tsx:97: navigator.vibrate?.(15);
```

**Fix:** import `haptic` from `@/lib/ui/motion` and call `haptic("light")`. The
web path is preserved: `motion.ts` falls through to `navigator.vibrate` when
`isNativeClient()` is false. This is a two-line change that restores tactile
confirmation to the entire iOS install base.

---

**D3. Highlight colour never syncs.**

`grep -n color lib/sync/annotations.ts` returns **zero matches**. The push row,
the pull select, and the rebuilt local value all omit `color`, even though
`public.annotations` would need it and `VerseAnnotation.color` is the field that
carries the reader's whole semantic system.

`syncAnnotations()` runs push then pull, and the pull writes with an
unconditional `setItem`. So a second device that has never seen a colour can
overwrite the first device's coloured annotation with a colourless one.

**Fix:** carry `color` through push, select, and merge. Requires a nullable
`color text` column on `public.annotations` (SQL in section 2.6).

---

**D4. The local-first migration drops every annotation.**

`lib/content/betaImport.ts:6-8` promises to "never drop a user's bookmark, note,
highlight, or collection when they upgrade to the local-first build."

Its prefix table at `:14-22` lists `purify:bookmark`, `purify:annotation`,
`purify:highlight`, `purify:note`, `purify:florileg`, and three reading-progress
prefixes. The scan at `:37` is `key.startsWith(p)`.

The actual annotation keys are `purify:bible:{book}:{chapter}:{verse}` and
`purify:saint:{saint}:{work}:{section}:{paragraph}`. Neither starts with any
listed prefix. `purify:bookmarks` and `purify:florilegia` match fine. Every
verse and paragraph annotation is silently discarded.

**Fix:** add `purify:bible:` and `purify:saint:` to `PREFIX_KIND`, or better,
route the scan through a shared key parser (section 2.4) so the sync layer and
the import layer cannot drift again.

---

**D5. Commentary is a read-only dead end. This is the Catena flaw, in Purify.**

```
$ grep -rln 'AddToFlorilegium\|FlorilegiumPickerSheet' components/
components/bible/VerseRow.tsx
components/florilegium/AddToFlorilegium.tsx
components/florilegium/FlorilegiumPickerSheet.tsx
components/theology/TopicReader.tsx
```

`components/bible/StudyRail.tsx` and `components/bible/MobileCommentarySheet.tsx`
have zero florilegium wiring and zero copy affordance. A reader can gather a
verse but cannot gather the patristic commentary sitting next to it. The exact
failure Catena is criticised for, minus the tab-hopping, because in Purify there
is no path at all.

**Fix:** section 5.

---

**D6. Highlights are effectively invisible in Parchment mode.**

Computed from the real tokens (`app/globals.css:1213-1221`, page `#f1e8d4`),
wash alpha `0.32`, contrast of the wash against the unhighlighted page:

| Mode | page | yellow | green | blue | rose | purple |
|---|---|---|---|---|---|---|
| default | `#101013` | 2.17 | 1.80 | 1.75 | 1.78 | 1.71 |
| candlelight | `#171006` | 2.19 | 1.80 | 1.74 | 1.79 | 1.71 |
| monastery | `#0d1119` | 2.17 | 1.80 | 1.76 | 1.78 | 1.72 |
| **parchment** | `#f1e8d4` | **1.11** | **1.24** | **1.27** | **1.26** | **1.29** |

On the three dark pages a 1.7:1 to 2.2:1 wash is a correct, quiet highlight. On
the light Parchment page the same translucent light pigment has almost nowhere
to go: 1.11:1 for yellow is not a highlight, it is a rumour.

Note this affects the whole app, not just the reader.
`components/theme/AppThemeController.tsx` is mounted in the root layout
(`app/layout.tsx:231`) and does not strip the attribute, so the palette is
app-wide.

**Fix:** section 7.1. A translucent wash cannot carry a light page. Parchment
needs a different treatment, not a different alpha.

---

**D7. The Florilegium citation line fails AA in Parchment.**

`components/florilegium/FlorilegiumDetail.tsx:153` uses `text-paper/55`.
Computed against each mode's own background:

| Mode | ratio | verdict |
|---|---|---|
| default | 6.23:1 | passes AA, below AAA |
| candlelight | 5.10:1 | passes AA, below AAA |
| monastery | 5.37:1 | passes AA, below AAA |
| **parchment** | **3.40:1** | **fails AA** |

Raising to `text-paper/80` yields 12.22 / 9.66 / 10.28 / **7.12**, clearing AAA
in all four. Note `/70` is not sufficient: it measures 5.2:1 in Parchment.

**Fix:** `text-paper/55` becomes `text-paper/80`. One class.

---

**D8. The Fathers reader uses emoji where the Bible reader uses SVG.**

```
components/saints/ParagraphRow.tsx:246:  ✦
components/saints/ParagraphRow.tsx:260:  {copied ? "✓" : "🔗"}
components/saints/ParagraphRow.tsx:278:  ✎
```

`VerseRow.tsx` uses real icon components. A rendered colour emoji in a reader of
the Church Fathers is the same category of thing this document criticises
YouVersion for in section 1.1. It also renders differently on every platform and
cannot inherit `currentColor`.

**Fix:** reuse the existing icon components from `components/ui/icons/`.

---

### 0.3 Two findings this document could not verify

Both come from the design research and are recorded as claims, not facts.

- **Token-count divergence.** Roughly 10.4% of tagged NT verses are claimed to
  have a different token count between `verse.text.trim().split(/\s+/)` and the
  `english-tagged` token array. If true, toggling interlinear shifts saved word
  highlights onto the wrong words. This is the single most important thing to
  measure before building anything in section 2. **Verify before relying on it.**
- **`toMarkdown` drops the Father half** of a fused entry, because a fused item
  would take the `kind === "scripture"` branch. Only relevant once section 5
  exists.

---

## 1. Competitive deconstruction

### 1.1 YouVersion: the selection carnival

The failure is not that a popup appears. It is that the popup is **involuntary,
positional, and centrifugal**.

1. **Involuntary.** It fires on native text selection, so a mis-tap that becomes
   a selection produces a full action surface. The reader did not ask for a
   decision and gets one.
2. **Positional.** It floats at the selection point, covering the text just
   selected. You cannot see the verse while deciding what to do with it.
3. **Centrifugal.** Roughly half its actions point out of the app: share sheet,
   image generator, social card. The reading surface is a funnel into a
   distribution surface.

**Does Purify avoid this? Partly, and by structure rather than by restraint.**

Counted honestly, `MobileVerseToolbar.tsx` renders up to **12 interactive
elements**: a dismiss backdrop, 5 colour swatches, and 6 action buttons. That is
the same order of magnitude as YouVersion. Anyone claiming Purify is quieter *on
action count* is wrong. Three things are genuinely different:

- **It is voluntary.** The bar opens only on an explicit hold with an 8px
  scroll-slop cancel, never on selection and never on tap. The invariant is
  stated in the source at `VerseRow.tsx:217-219`: "no annotation writes from a
  tap."
- **It never covers the text.** The bar is pinned to the bottom of the viewport
  at `calc(var(--tab-bar-h) + env(safe-area-inset-bottom, 0px) + 12px)`
  (`MobileVerseToolbar.tsx:115-121`), not to the touch point. This is the
  strongest structural answer in the codebase today.
- **Every action is centripetal.** `MobileVerseAction` is exhaustively typed at
  `:14-20` as `highlight | bookmark | copyLink | note | gather | clearWords`. No
  share, no social card, no image generator. The only outward vector is
  `copyLink`, and it points back to `purifyapp.net`.

**Where Purify is not better:**

- Two stacked rows of unlabelled round things, no progressive disclosure. The
  `--stagger-step: 70ms` token exists and is unused here.
- The swatch row carries no visible text at any point. A reader who renamed
  "blue" to "Teaching" via `useHighlightLegend()` cannot see that name at the
  moment of choosing. The rename feature is disconnected from the moment it
  would matter.
- Swatches are 28px (`h-7 w-7`) while the six actions are 44px. Inconsistent
  within one component. Geometry allows 44px: five 44px swatches with 8px gaps
  plus 24px padding is 276px, inside the 343px available at a 375px viewport.
- **D8**: emoji icons in the Fathers reader.

### 1.2 Logos Mobile: the over-engineered labyrinth

The failure is **precision debt**. Selection uses draggable pins on a text
Range, so extending a selection means acquiring a handle a few pixels wide, and
saving a note means descending a modal tree.

**Purify structurally avoids the handle problem, because it has no handles.**
There is no `Range`-based selection anywhere in the app. `window.getSelection()`
appears only to *defer* to the native copy menu (`VerseRow.tsx:203`). Selection
is per-word hit testing against `[data-word-idx]`, so the target is a whole
word, not a pin.

That is the right call, and it should be stated as doctrine: **the selection
primitive is the word, never the character.**

The remaining risk is target size, which is a real constraint at
`--text-body: 17px`. `VerseRow.tsx:41-42` already carries a `TAP_TARGET`
absolutely positioned pseudo-element to enlarge the hit region without
disturbing the line box. Section 3 extends that.

### 1.3 Catena: the disconnected commentary

The failure is that linking a verse to a patristic comment means leaving the
verse.

**Purify currently has this flaw and has it worse.** See **D5**: commentary
cards have no gather and no copy. Section 5 is the answer.

### 1.4 Summary

| Competitor flaw | Purify's structural answer | Where | Status |
|---|---|---|---|
| Popup fires on selection | Explicit 400ms hold only, no write from a tap | `VerseRow.tsx:217-219` | **Ships** |
| Popup covers the text | Bottom-pinned bar, verse gets an inset ring | `MobileVerseToolbar.tsx:115-121` | **Ships** |
| Half the actions are outbound | Action union has no share surface | `MobileVerseToolbar.tsx:14-20` | **Ships** |
| Neon dots on a prayerful page | Muted liturgical palette | `lib/bible/highlightColors.ts` | **Gap**, section 7.1 |
| Unlabelled colour choices | Legend labels at the point of choosing | `HighlightLegend.tsx` | **Gap** |
| Microscopic selection handles | Word-granular hit targets, no handles | `VerseRow.tsx:41-42` | **Ships** |
| Saving needs a modal tree | Lift-to-commit, undo instead of confirm | | **Gap**, section 3.1 |
| Verse and commentary are separate | Fuse a verse to its witness | | **Gap**, section 5 |
| Fathers reader parity | Colour and gather on paragraphs | `ParagraphRow.tsx` | **Broken**, D1 |

---

## 2. Data architecture

This is the backbone. Everything in sections 3 to 6 depends on it.

### 2.1 The problem

A word's identity today is its integer index into
`text.trim().split(/\s+/)` of the rendered translation
(`VerseRow.tsx:44-46`, emitted as `data-word-idx`). Two consequences:

1. **Translation switching breaks it.** The reader supports NKJV, NIV, and NLT
   via `lib/bible/translationPref.ts`. Index 4 in KJV is a different word in NIV.
2. **View switching may break it too.** If the token-count divergence in 0.3 is
   real, toggling interlinear alone shifts the indices.

### 2.2 Options considered

| Option | Survives translation change | Cost | Verdict |
|---|---|---|---|
| (a) Raw indices, scoped per translation | No, by design | None | Too lossy alone |
| (b) Quote + prefix/suffix (W3C `TextQuoteSelector`) | Yes, when the wording is shared | Moderate | **Chosen, as a layer** |
| (c) Strong's-number anchoring | Yes, where tagged data exists | High | Coverage too partial |
| (d) Verse-level only across translations | Trivially | Low | **Chosen, as the floor** |

Option (c) is attractive because the occurrence-indexed alignment already
exists, but `english-tagged` covers KJV only and the Greek LXX has no tokens at
all, so it cannot be the primary anchor.

### 2.3 The chosen model: a layered anchor

Store all three layers. Read the strongest one that still resolves.

```ts
// lib/annotations/types.ts

/** Which token array was on screen when the indices were minted. */
export type EditionId =
  | "kjv-pd"          // plain KJV, whitespace tokenization
  | "kjv-pd-tagged"   // interlinear on, english-tagged token array
  | "lxx-brenton"
  | "nkjv" | "niv" | "nlt";

/** Run-encoded word selection. Cheaper and more stable than a flat index list. */
export type WordSpan = { from: number; to: number };

/** W3C Web Annotation TextQuoteSelector, exact match only. */
export type QuoteSelector = {
  exact: string;
  prefix: string;   // up to QUOTE_CONTEXT_CHARS before
  suffix: string;   // up to QUOTE_CONTEXT_CHARS after
};

export const QUOTE_CONTEXT_CHARS = 32;

export type TextAnchor = {
  /** Layer 1: the floor. Always resolvable. */
  wholeUnit: boolean;
  /** Layer 2: precise, only trusted when edition matches. */
  words?: WordSpan[];
  edition?: EditionId;
  /** Layer 3: recovery when edition does not match. */
  quote?: QuoteSelector;
};
```

**Resolution order at render:**

1. If `anchor.edition` equals the current edition, paint `anchor.words`. Exact.
2. Otherwise attempt `refuzz(anchor.quote, currentText)`. Exact string match
   only, and it must be **unique** in the verse. On success, paint the recovered
   span.
3. Otherwise paint the whole-unit wash and tell the reader why.

**No fuzzy matching.** A similarity score would silently move a reader's
highlight onto words they did not choose. In a Scripture app that is a
correctness failure, not a UX nicety. An ambiguous match returns `null` and
degrades to the wash.

Step 3 must be **visible, not silent**: the verse toolbar says the word marks
were made in another translation. Switching back restores them exactly, because
the record is never rewritten on a failed resolve.

### 2.4 One locator for every content kind

`ParagraphRow` is a strict subset of `VerseRow` today. A unified locator lets
one annotation layer serve verses, saint paragraphs, council paragraphs, and
theology quotations.

```ts
export type ContentKind =
  | "bible-verse" | "saint-paragraph"
  | "council-paragraph" | "theology-quotation";

export type ContentLocator =
  | { kind: "bible-verse"; book: string; chapter: number; verse: number }
  | { kind: "saint-paragraph"; saintSlug: string; workSlug: string;
      sectionN: number; paragraphIdx: number }
  | { kind: "council-paragraph"; councilSlug: string; documentSlug: string;
      sectionN: number; paragraphIdx: number }
  | { kind: "theology-quotation"; topicSlug: string; quotationIdx: number };
```

The two existing key templates must round-trip byte-identically, because
`lib/sync/annotations.ts` parses local keys back into `{kind, locator}` and any
drift orphans live data:

```
purify:bible:{book}:{chapter}:{verse}
purify:saint:{saintSlug}:{workSlug}:{sectionN}:{paragraphIdx}
```

Extract `localKeyFor()` and `parseLocalKey()` into `lib/annotations/localKeys.ts`
so the parser is unit-testable in the node Vitest environment without importing
the Supabase client. **This also fixes D4**, since `betaImport.ts` can then use
the same parser instead of its own divergent prefix table.

**Constraint:** no locator component may contain `:` or `|`. Assert it in
`localKeyFor` and cover it with a corpus test over the real slug lists.

### 2.5 Multi-verse selections: fan out, do not range

A selection spanning verses 3 to 5 becomes **three records sharing a `groupId`**,
not one record with a range.

The reason is the existing unique index on `public.annotations`, which is keyed
on the flattened locator. A range record has no single locator, so it would
either collide or require dropping the index that makes sync idempotent. Fan-out
costs three rows for a three-verse highlight, which is the correct price.

The note lives on the **group head**. Deleting the head migrates the note to the
next member rather than dropping it.

### 2.6 Backward compatibility

This is the highest-risk part of the whole document. **An older shipped build
(iOS 1.0 build 12, currently in App Store review) will read whatever we write.**
`lib/bible/annotations.ts` removes the entire localStorage key when an
annotation looks empty. If a v2 record leaves all three legacy fields falsy, the
old build deletes the reader's highlight.

**The legacy floor invariant:** every v2 record must always write at least one
truthy legacy field. `highlighted` defaults to `true` whenever there are no word
spans and no note. Assert this over all legacy field combinations in
`lib/annotations/__tests__/upgrade.test.ts`.

`upgradeAnnotation()` must return **the same object reference** when the input is
already v2, because `lib/bible/annotations.ts` caches the parsed snapshot by raw
string for `useSyncExternalStore`. A fresh identity on every read sends React
into an update loop. The codebase already documents this trap in
`lib/rhythm/useDailyRhythm.ts`.

### 2.7 Migration

Idempotent, and safe to run twice. Apply this by hand in the Supabase SQL editor
(project `avbqyvjgcrucjwevwixt`) **before** shipping any client that writes the
new fields. Sync fails silent, so an unapplied migration is a stalled sync
rather than a crash, which is worse: it is invisible.

```sql
-- 20260810_annotation_anchors.sql
-- Extends public.annotations with the layered anchor described in
-- docs/architecture/HIGHLIGHT_AND_FLORILEGIUM.md section 2.3.
-- Safe to run more than once: every statement is idempotent.

begin;

-- 1. Colour. Fixes D3: the client has had VerseAnnotation.color since the
--    palette shipped, but lib/sync/annotations.ts never carried it, so a
--    second device could overwrite a coloured annotation with a blank one.
alter table public.annotations
  add column if not exists color text;

-- 2. The anchor. Stored whole as jsonb rather than as columns, because the
--    three layers are read together or not at all.
alter table public.annotations
  add column if not exists anchor jsonb;

alter table public.annotations
  add column if not exists edition text;

-- 3. Group membership for multi-verse selections (section 2.5).
--    group_id is a client-minted uuid so a merge is idempotent, the same
--    discipline as public.florilegia.id.
alter table public.annotations
  add column if not exists group_id uuid;

alter table public.annotations
  add column if not exists group_role text;

-- 4. Soft delete. lib/sync/annotations.ts has no tombstones today, so a
--    delete on one device is resurrected by the next pull from another.
alter table public.annotations
  add column if not exists deleted boolean not null default false;

alter table public.annotations
  add column if not exists created_at timestamptz not null default now();

-- 5. Widen the kind check to the four content families in section 2.4.
alter table public.annotations
  drop constraint if exists annotations_kind_check;

alter table public.annotations
  add constraint annotations_kind_check check (kind in (
    'bible-verse', 'saint-paragraph',
    'council-paragraph', 'theology-quotation'
  ));

-- 6. Group lookup.
create index if not exists annotations_group_idx
  on public.annotations (user_id, group_id)
  where group_id is not null;

-- 7. RLS is already enabled and annotations_self_all is table-wide, so the
--    new columns inherit it. Restated idempotently so a fresh database
--    reaches the same state.
alter table public.annotations enable row level security;

drop policy if exists "annotations_self_all" on public.annotations;
create policy "annotations_self_all" on public.annotations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

commit;

-- Verification. Expect 7 rows.
select column_name
from information_schema.columns
where table_schema = 'public' and table_name = 'annotations'
  and column_name in ('color','anchor','edition','group_id','group_role','deleted','created_at')
order by column_name;
```

**Deliberately not included:** a `STORED` generated `locator_key` column. It
would be tidier, but it forces a full table rewrite that locks the table for the
duration, and the owner applies migrations by hand with no ability to monitor a
long lock. The existing unique index already does the job.

### 2.8 Native offline

`lib/content/schema.ts` already declares `"highlight"` in `UserRecordKind`, and
`lib/content/syncQueue.ts` is a real durable outbox with tombstones and
exponential backoff. The annotation layer should write through it on native
rather than inventing a parallel path.

Gap to close: `lib/content/repository.ts` exposes no `user_record` read
accessor, so a highlight written offline cannot be read back. Add
`listUserRecords(kind, opts)`.

### 2.9 Test surface

Vitest covers `lib/**` pure functions only, which is exactly where this model
lives.

| File | Asserts |
|---|---|
| `lib/annotations/__tests__/localKeys.test.ts` | `parseLocalKey(localKeyFor(loc))` deep-equals `loc` for all four kinds; byte-identical output to the two shipped templates; no slug contains `:` or `\|` |
| `lib/annotations/__tests__/upgrade.test.ts` | reference-stable idempotence; the legacy floor invariant over every field combination; total behaviour on garbage |
| `lib/annotations/__tests__/spans.test.ts` | `wordsToSpans`/`spansToWords` round-trip, totality, adjacency merging |
| `lib/annotations/__tests__/quote.test.ts` | exact recovery on real fixtures; `null` on ambiguity; a positive assertion that a one-character difference returns `null`, so nobody adds a similarity score later |
| `lib/annotations/__tests__/group.test.ts` | fan-out roles; solo `groupId === id`; group delete emits per-member tombstones |

---

## 3. Mobile: the thumb-fluid gesture system

### 3.1 Zero-tap highlight

**The conflict to resolve first.** The brief asks for "lift thumb = saved, no
menu." `VerseRow.tsx:217-219` states the opposite invariant: no annotation
writes from a tap.

**These are compatible, and the invariant survives intact.** A tap is a
touchdown and a liftoff with no hold and no travel. The proposed gesture writes
only after a 350ms hold *and* at least one word has been swept. A tap still
writes nothing. What changes is that a *completed deliberate gesture* commits
without a confirming menu tap.

The safety mechanism shifts from **confirm-before** to **undo-after**, which is
the correct trade for a gesture that a reader performs dozens of times per
session.

**State machine.**

| State | Enter on | Exit on |
|---|---|---|
| `idle` | initial | `pointerdown` on a word |
| `pressing` | `pointerdown` | 350ms elapsed, or slop exceeded, or lift |
| `selecting` | 350ms hold | lift, or drag past kill radius |
| `palette` | 48px downward travel while `selecting` | lift |
| `committed` | lift from `selecting`/`palette` | undo dwell expires |

**Constants**, with justification:

| Constant | Value | Why |
|---|---|---|
| `LONG_PRESS_MS` | 350 | Below the iOS 500ms system callout so Purify wins the race. The existing 400 also wins; 350 feels more responsive and the slop guard still cancels a scroll. |
| `SCROLL_SLOP_Y_PX` | 8 | Unchanged from today. Vertical intent is scroll intent. |
| `SCROLL_SLOP_X_PX` | 16 | Unchanged. Horizontal tolerance is wider because the thumb arcs. |
| `KILL_RADIUS_PX` | 168 | Drag far away to abort. Roughly a thumb's reach, so "throw it away" is discoverable. |
| `PALETTE_ARM_PX` | 48 | Downward travel that opens the colour fan. Far enough not to trip during normal extension. |
| `PALETTE_QUIET_MS` | 200 | The head slot must be still this long before the fan arms, so a fast sweep never opens it. |
| `HAPTIC_MIN_INTERVAL_MS` | 30 | A taptic pulse is roughly 10 to 15ms. Below 30ms they blur into buzz. |
| `UNDO_DWELL_MS` | 5200 | Long enough to notice and reach, short enough not to loiter. |

**Three implementation traps**, each of which produces a plausible-looking but
broken result:

1. **React registers `touchstart`/`touchmove` as passive at the root**, so
   `preventDefault()` inside a React `onTouchMove` prop is silently a no-op.
   Attach `touchmove` imperatively with `{ passive: false }` via a ref.
2. **`touch-action` resolves once at the start of a touch sequence.** Flipping
   it to `none` at recognition time does not affect the in-flight touch. The
   non-passive `preventDefault` is the only route.
3. **Suppressing the OS callout removes the reader's only way to copy an
   arbitrary phrase.** If `-webkit-touch-callout: none` ships, it must ship in
   the same commit as `copyText` and `copyQuote` actions on the toolbar. Treat
   them as one atomic change or it is a straight regression.

**Undo.** A transient pill, portaled to body, positioned with the same
`calc(var(--tab-bar-h) + env(safe-area-inset-bottom, 0px) + 12px)` expression the
toolbar uses. `role="status"`, `aria-live="polite"`, a real focusable button.
Depth 1 for launch: a stack needs a "how far back am I" affordance, which is
more chrome than this app wants.

**Undo must also hold the sync push.** `SyncBridge` debounces at 500ms and
`lib/sync/annotations.ts` has no tombstones, so a commit pushed at 500ms and
undone at 2000ms is resurrected by the next pull. Add
`holdAnnotationSync(UNDO_DWELL_MS)` after any gesture commit.

**Haptic profile.** `@capacitor/haptics` exposes
`selectionStart`/`selectionChanged`/`selectionEnd`, which exist for exactly this.

| Moment | Call |
|---|---|
| Enter `selecting` | `Haptics.selectionStart()` |
| Cross a word boundary | `Haptics.selectionChanged()`, throttled to 30ms |
| Cross a verse boundary | `Haptics.impact({ style: Light })` |
| Commit on lift | `Haptics.selectionEnd()` |
| Undo | `Haptics.impact({ style: Light })` |

All of it routed through `lib/ui/motion.ts`, never `navigator.vibrate`. Add a
doctrine assertion to `lib/ui/__tests__/motionDoctrine.test.ts` that no file
under `components/` matches `/navigator\.vibrate/`, so **D2 cannot regress**.

### 3.2 The colour fan

Five colours do not divide into quadrants. Use a **160 degree arc of five 32
degree sectors**, bisector pointing away from the hand, with a 28px dead zone at
the centre so a small wobble selects nothing.

- **Rendered below and around the contact point**, never above it, so the thumb
  does not occlude the choice.
- **Edge clamping:** the bisector rotates to stay on screen, with a 20px guard.
  Near the bottom edge it flips upward, which is acceptable because the hand
  approaches from below.
- **Implementation:** SVG annular sector paths, filled with each colour's
  translucent `wordBg` so the text stays readable underneath. Portaled to body,
  `pointer-events: none`, `aria-hidden`. No animation library needed; a single
  `@keyframes radial-in` at `--duration-fast` with `--ease-house`.
- **Reduced motion:** `prefersReducedMotion()` from `lib/ui/motion.ts` skips the
  scale-in and renders the fan at final state.
- **Accessibility fallback:** the fan is unusable with a screen reader or with
  motor impairment. The equivalent non-gestural path already exists and must
  remain: the swatch row on `MobileVerseToolbar`. The fan is an accelerator,
  never the only route.

### 3.3 Interlinear mirroring

Highlighting English should faintly mark the aligned Greek. The alignment
already exists in `VerseRow.tsx` and correctly tracks **occurrence index per
Strong's number**, so the second `ἐγέννησεν` lights the second "begat".

**Treatment: a 1.5px underline, not a fill.** Use `background-image` with a
`linear-gradient`, not `text-decoration` (which cannot be positioned or
thickened reliably across the Noto fallback chain) and not `box-shadow` (which
does not follow wrapped inline boxes). The Greek token already sets
`backgroundColor` inline for the matched state, and `background-image` is a
different longhand, so the two compose rather than collide.

Colour derives from the active highlight's `bar` value at higher alpha than the
word fill, because a 1.5px rule needs more alpha than a wash to read at the same
weight. This is a sixth field on `HighlightColor`, call it `mirror`.

**Degradation, which is the common case:**

| Situation | Behaviour |
|---|---|
| KJV word has no Strong's tag | No mirror. Silent. |
| LXX verse has no tokens at all | No mirror, and no attempt. |
| Interlinear is off | Nothing to mirror. |

**Direction:** English to Greek only for v1. Bidirectional doubles the surface
and the Greek side has no annotation layer today.

### 3.4 Gesture conflict matrix

| Competing gesture | Disambiguation |
|---|---|
| Vertical scroll | `dy > 8` cancels the armed press. Unchanged. |
| Horizontal chapter swipe | None exists in the reader today. Verify before assuming. |
| Pull to refresh | Only at scroll top; the press arms on a word, and slop cancels. |
| iOS edge-swipe back | 20px edge guard: no press arms within it. |
| OS text selection | Purify's 350ms beats the 500ms callout. Requires the non-passive `preventDefault`. |
| Double-tap zoom | Existing pinch-zoom policy governs. A double tap on a highlight opens the modify path instead. |

---

## 4. Desktop

### 4.1 Hover and snapping

**Margin bracket.** A `::before` on `[data-verse-row]`, not a real element, so it
costs no node per verse. It must be suppressed while `data-focus="true"` or it
collides with the existing focus wash.

Colour: derive from `--color-gold-soft` (`#cfcfd3` in default mode). Note the
trap: **`--color-gold` is `#eaeaec`, a near-white grey, not gold.** The token
name was kept only so `*-gold` utilities keep resolving. Introduce explicit
`--bracket` and `--bracket-strong` variables and override them in each
reading-mode block, because a single alpha over a remapped `--color-gold-soft`
does not hold across all four palettes.

Timing: `--duration-instant` (90ms) in, `--duration-fast` (200ms) out, both
`--ease-house`. **Hover intent: 110ms arm delay**, and no arming at all above
1.10 px/ms traverse speed, so mousing across the page does not strobe every
verse. One delegated `pointermove` listener for the whole chapter, writing
`data-hover` directly to DOM nodes rather than through React state.

**Granularity acceleration.** Drag slowly for words, quickly for phrases.

| Band | Speed | Granularity |
|---|---|---|
| slow | < 0.35 px/ms | word |
| medium | 0.35 to 1.10 px/ms | phrase |
| fast | > 1.10 px/ms | whole verse |

Smoothed with `alpha = 0.3`, **two-sample confirmation**, and 0.7 hysteresis on
the refine direction, so a tremor at a boundary cannot oscillate. The preview
shows the widened range live, so the widening is visible before commit and never
a surprise at pointerup.

**What is a "phrase"?** Be honest: there is no clause-boundary data in
`lib/bible/load.ts`. What is buildable today is **punctuation-delimited
segmentation**, which the research measured at roughly 3.6 segments per verse.
That is genuinely useful, but it is the KJV punctuator's structure, not the
Greek or Hebrew clause structure. Anything better is a content project, not a
UI one. Say so in the UI copy rather than implying semantic understanding.

**Fix a live bug while here.** The current mousemove handler is
`if (idx !== null) setDragEnd(idx)`, which silently drops every miss, so the
preview freezes whenever the pointer is in an inter-word gap or the leading
between lines. Replace with nearest-rect projection weighting vertical distance
3x.

### 4.2 Keyboard flow

**Check bindings against what is already bound.** `ChapterKeyNav.tsx` and
`CommandPalette.tsx` both listen on window keydown, and the research counted
roughly 25 keydown listeners app-wide. Derive `RESERVED_KEYS` from them and fail
a doctrine test on collision, rather than discovering conflicts in the field.

| Key | Action |
|---|---|
| `1` to `5` | Apply colour n |
| `f` | Send to Florilegium |
| `n` | Note |
| `b` | Bookmark |
| `t` | Tag |
| `Escape` | Clear selection |

**Use `t`, not `Cmd/Ctrl+D`.** The brief asks for `Cmd/Ctrl+D`, but that steals
Bookmark-this-page in all four desktop browsers, needs a `preventDefault`, and
`t` is free, mnemonic, and costs nothing. Recommend `t`; if muscle memory from
another app matters more, `Cmd/Ctrl+D` can be added as an alias.

**Also fix:** `ChapterKeyNav` currently fires while a Sheet is open, navigating
the route out from under the sheet. Add `if (isOverlayOpen()) return;`.

**Hint overlay arming.** Never show it to a pointer-only reader. Three states:
off, armed for the session after the first real keyboard interaction, and always
after several armed sessions. Plus an explicit Auto / Always / Never control in
`ReaderSettingsMenu`, matching the existing cycle-pill idiom.

**The sidebar.** No `Drawer` or `Sidebar` primitive exists. `Sheet.tsx` is
`md:hidden` with a `desktop?: boolean` opt-in that caps at 440px, which is a
bottom sheet on a desktop screen and the wrong shape.

Build `components/ui/SideRail.tsx`, **non-modal by default**: no scroll lock, no
`aria-modal`, no backdrop, no focus trap, `role="complementary"`. A gather rail
that traps focus would be actively hostile, because the reader wants to keep
reading. Modal is an opt-in flag for future callers. Scroll lock, when used at
all, must go through the depth-counted `lockBodyScroll()` in `lib/ui/overlay.ts`.

### 4.3 Keyboard-only highlighting

A hard requirement, not an afterthought. With no pointer at all:

1. Roving `tabIndex` moves a verse cursor.
2. `Enter` enters word mode; arrow keys move the word caret; `Shift+Arrow`
   extends.
3. `1` to `5` commit a colour.

**Screen reader treatment.** A partially highlighted verse becomes a run of
`<mark>` elements, which some screen readers announce individually and turn into
word salad. Wrap the verse text in a container with the full text as the
accessible name and mark the individual spans `aria-hidden`, then expose the
highlight state through a single per-verse description ("verse 4, highlighted in
Altar Gold, words 3 to 7"). Announce changes through one `aria-live="polite"`
region, throttled, not one per keystroke.

---

## 5. Direct canvas linking

The structural answer to Catena: fuse a verse to its patristic witness in one
gesture, producing one Florilegium entry.

### 5.1 Data model

`FlorilegiumItem` is a union of `kind: "scripture"` and `kind: "father"`. A
fused entry is both.

**Do not add `kind: "fused"`.** `supabase/migrations/20260612_florilegia.sql`
constrains `florilegium_items.kind` to `('scripture','father')`, and
`lib/sync/florilegium.ts` casts `row.kind` straight through. A third kind
breaks the constraint and, worse, breaks old clients silently.

**Instead, add an optional `witness` to the base type.** A fused entry is a
scripture item that carries a witness. Old clients see a normal scripture item
and ignore the extra field. The check constraint is untouched.

```ts
export type FusedWitness = {
  text: string;
  author: string;
  work?: string;
  citation?: string;
  /** Declared, never inferred. See lib/saints/load.ts on SectionVoice. */
  voice: "father" | "editorial";
  source?: string;
};
```

**Attribution integrity is the hard constraint here.** `lib/saints/load.ts`
declares `voice` as a field precisely because inferring whose words these are is
unacceptable. `CommentaryNote` has no `voice` field today, so **every fused
witness must default to `"editorial"`** until the corpus is backfilled. Labelling
Purify's own editorial prose as a saint's words in a reader's permanent
collection is the worst possible failure mode of this feature.

Make `voice` required on `FusedWitness` at the type level so the default is
forced at the boundary, and cover it with a Vitest case.

### 5.2 Desktop interaction

- **Drag source:** the verse-number anchor, which is a sibling of the words
  paragraph, not a descendant, so it does not collide with the existing word-drag
  pipeline.
- **Drop target:** any `[data-fuse-target]` commentary card.
- **Pointer events, not HTML5 drag and drop.** HTML5 DnD has poor touch support
  and no reliable control over the drag image.
- **Ghost:** portaled to body, `position: fixed`, positioned with a `translate3d`
  written once per animation frame. Never a CSS transition on `transform`, and
  never rendered inline: a transform on any ancestor makes it the containing
  block and the ghost teleports.
- **Failure is silent.** A drop on nothing returns the ghost home and says
  nothing.

### 5.3 Mobile equivalent

Drag-onto is a bad gesture across a scrolling reader. The mobile path is a
"Gather with this verse" control in the commentary sheet, pre-filled with the
verse currently in view. Same result, fewer steps, no drag.

### 5.4 Visual separation

Three voices can appear in one card: Scripture, the witness, and the reader's
own note. They must never be confusable.

| Element | Treatment |
|---|---|
| Scripture | serif italic blockquote, existing style |
| Witness | serif roman, its own citation eyebrow, visually seamed below |
| Reader's note | **sans**, with an unconditional "Your note" label |

Today `FlorilegiumDetail` renders the reader's note in serif with no label,
which lets a reader's words read as a third source between two quotations. Fix
this regardless of whether fusion ships.

### 5.5 Export and share

`toMarkdown` must gain a fused branch **in the same commit as the data model**,
not as a follow-up, or a reader exports their library and silently loses every
Father half.

For community sharing, v1 shares the **Scripture half only**, with one plain
line explaining why. The existing quote verifier cannot verify a commentary
witness, and shipping an unverifiable patristic quotation into a public feed is
exactly the failure `docs/editorial-standards.md` exists to prevent.

---

## 6. The Florilegium engine

### 6.1 The Scripture Card

The rendered form of a saved highlight. Anatomy:

| Element | Token |
|---|---|
| Colour spine | 3px, the highlight's `bar` value |
| Quote | `--text-body` 17px, `--font-serif`, leading 1.7 |
| Citation | `--text-caption` 12px, uppercase, tracking 1.2px, **`text-paper/80`** (see D7) |
| Metadata row | feast, date, translation, commentary count |
| Radius | `--radius-card` 28px |

**Freeze the metadata at gather time.** Do not recompute the feast day on
render. `shiftForStyle` shifts the lookup by 13 days for Old Calendar readers,
driven by a changeable preference, so a recomputed feast would silently rewrite
history on a saved card. A card is a record of a moment. The same argument
covers the translation label.

**Do not import the calendar module on the florilegium route.** It pulls
roughly 190KB of JSON. Resolve the feast once at gather time via a dynamic
`await import()` inside the gather handler, so the chunk loads behind a user
gesture.

**Image export.** Use **Canvas 2D**, not SVG serialised to a blob: a serialised
SVG cannot reference `next/font`'s self-hosted faces and would silently render
every shared quote in Times New Roman. Await `document.fonts.ready` and read the
resolved family from `getComputedStyle`, because `next/font` emits an obfuscated
family name.

Two hard rules on export:

1. **The renderer takes a narrow whitelist type, never a `FlorilegiumItem`.** No
   collection id, item id, user id, entitlement tier, or plan name can reach a
   shared image, because no such field is in the argument.
2. **Refuse to render licensed Scripture without a publisher notice.** NKJV,
   NIV, and NLT are licensed. If the item's translation is in the licensed set
   and no notice string is present, image export refuses and offers text-only
   share instead. Public domain text is unaffected.

### 6.2 Resurfacing: ship the quiet version first

**Recommendation: build the pull-based surface first, and ship the push
reminder only after it exists.**

A "From your gatherings" block on the florilegium hub resurfaces one saved quote
when the reader opens the app. It needs no schema change, no notification
permission, no cron work, and no doctrine amendment. It answers the actual
product need, which is that highlights sit forgotten in a database.

Bookkeeping lives in a separate localStorage key, `purify:florilegia:surfaced`,
mapping item id to last-surfaced timestamp, with a deterministic day-seeded
picker. Deliberately not a field on the item, so resurfacing never dirties a
synced record.

Render nothing below three gathered items. At most one item. No badge, no count.

### 6.3 Review reminders

**Doctrine note.** `CONTRIBUTING.md:10` and `:78` prohibited new notifications
and streaks. The operator amended both on 2026-08-10, and the amendment is part
of this change. The prohibition is replaced with a bar the feature must clear,
restated here because it is binding on the implementation:

- Reader-initiated and default off.
- No badge, no count, no streak surfaced back to the reader as pressure.
- **At most one review notification per reader per week**, enforced at the
  reader level, not the folder level. Five folders each set to weekly would
  otherwise assemble into a daily habit loop out of parts that each looked
  harmless.
- **No folder names in the payload.** A folder title would send the reader's
  chosen collection name, and by extension a hint about their spiritual reading,
  through APNs and FCM in plaintext and store it in a Postgres column. The copy
  stays generic. The content lives in the app.

**Implementation.** `lib/push/schedule.ts` has `ReminderKind = "morning" |
"evening"` and `dueKind()` matches on the local hour with no day-of-week
concept. Add a `"review"` kind, a `review_time` and `review_dow` pair on **both**
`push_subscriptions` and `device_push_tokens`, and a day-of-week branch.

**The trap:** read the weekday from the timezone-adjusted value, not from
`now.getUTCDay()`. `nowInTz()` rebuilds the Date from the target zone's calendar
parts, so `local.getUTCDay()` is correct and `now.getUTCDay()` fires on the wrong
day for every reader west of Greenwich in their evening.

```sql
-- 20260810_review_reminders.sql
-- Weekly review reminders (section 6.3). Safe to run more than once.
-- Both transports carry the same schedule columns, as morning_time and
-- evening_time already do.

begin;

alter table public.push_subscriptions
  add column if not exists review_time text,
  add column if not exists review_dow  smallint,
  add column if not exists review_scope text;

alter table public.device_push_tokens
  add column if not exists review_time text,
  add column if not exists review_dow  smallint,
  add column if not exists review_scope text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'push_subscriptions_review_dow_check'
  ) then
    alter table public.push_subscriptions
      add constraint push_subscriptions_review_dow_check
      check (review_dow is null or (review_dow >= 0 and review_dow <= 6));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'device_push_tokens_review_dow_check'
  ) then
    alter table public.device_push_tokens
      add constraint device_push_tokens_review_dow_check
      check (review_dow is null or (review_dow >= 0 and review_dow <= 6));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'push_subscriptions_review_scope_check'
  ) then
    alter table public.push_subscriptions
      add constraint push_subscriptions_review_scope_check
      check (review_scope is null or review_scope in ('always','fasting'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'device_push_tokens_review_scope_check'
  ) then
    alter table public.device_push_tokens
      add constraint device_push_tokens_review_scope_check
      check (review_scope is null or review_scope in ('always','fasting'));
  end if;
end $$;

commit;

-- Verification. Expect 6 rows.
select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and table_name in ('push_subscriptions','device_push_tokens')
  and column_name in ('review_time','review_dow','review_scope')
order by table_name, column_name;
```

**Notification copy.** Quiet, no urgency, no emoji, no streak language, no
count:

- "Something you gathered is waiting."
- "A line you kept, when you have a moment."
- "From your gatherings."

Add `lib/push/__tests__/quietDoctrine.test.ts` asserting that no
`reminderPayload` title or body contains a digit, an exclamation mark, or any of
`streak`, `don't miss`, `still`, `again`, `hurry`, `last chance`. A doctrine test
is how this codebase keeps a promise, and a promise about tone needs one more
than most.

### 6.4 The living transcript canvas

**This subsystem is blocked and should be scoped last.** There is no Patristic
Vault: `grep -ri vault` across `.ts` and `.tsx` returns zero. There is no saint
audio, no per-paragraph timing data, and `Section` has no time fields.

What is *not* blocked is the machinery. `components/prayers/AudioPlayer.tsx`
already solves synced-transcript scrolling: active line by elapsed time with a
0.15s lead, centering by `getBoundingClientRect` deltas, tap-to-seek, and a
`useMemo` keyed on the active index rather than the current time so 20+ nodes are
not rebuilt four times a second.

**The one piece worth building now** is extracting that math into
`lib/audio/sync.ts` as pure functions, which makes it unit-testable and reusable.
Everything else waits on recordings.

Two decisions to record for when it unblocks:

- **Timing lives in a sidecar**, `data/saints/{slug}/audio/{work}.json`, not in
  `Section`. The text corpus is editorially governed and should not carry
  playback metadata.
- **A saved snippet is a pointer**, `{ recordingId, src, startMs, endMs }`,
  roughly 140 bytes, never stored audio. A 20 second clip is about 320KB as
  base64 and localStorage holds strings only; sixteen would exhaust the quota.
  The pointer carries `recordingId` so that if a recording is replaced,
  playback resolves to a miss and the card renders **without** a play control.
  Silence is the correct failure. Never fall back to playing new audio at old
  offsets, which would attribute words to a Father they did not say there.

**Auto-scroll and highlighting.** Suspend auto-scroll at `pointerdown`, at t=0,
before any threshold. Deciding afterwards whether it was a press or a scroll is
fine, and in either case suspension is correct, because a manual scroll is
itself a reason to stop auto-scrolling. Suspending only at the 350ms threshold
would let the transcript slide out from under the reader's thumb.

---

## 7. Tokens, motion, and haptics

### 7.1 The palette, resolved

**Decision: retune the five colour values, keep the five ids.** The `id` is an
opaque storage key persisted in localStorage and in `public.annotations`. Nothing
in the UI shows it. Changing the pigment and the display name is free; changing
the id would orphan every saved highlight.

The reader-facing meanings stay renamable through `useHighlightLegend()`, which
is untouched. **Only pigment changes, never meaning.**

Measured, current versus proposed:

| id | Current | S | Proposed | S | Display name |
|---|---|---|---|---|---|
| `yellow` | `rgb(233,196,106)` | 74.3% | `rgb(190,170,124)` | 33.7% | Altar Gold |
| `green` | `rgb(127,176,105)` | 31.0% | `rgb(132,166,131)` | 16.4% | Sanctuary Sage |
| `blue` | `rgb(107,164,201)` | 46.5% | `rgb(126,150,176)` | 24.0% | Incense Smoke |
| `rose` | `rgb(217,138,168)` | 51.0% | `rgb(188,146,150)` | 23.9% | Byzantine Crimson |
| `purple` | `rgb(169,138,217)` | 51.0% | `rgb(154,142,177)` | 18.3% | Lenten Violet |

Mean saturation drops **50.7% to 23.3%**. Peak drops **74.3% to 33.7%**. That is
the measurable difference between a highlighter set and a liturgical one.

Body text remains AAA through every wash (default mode, `text-paper/90` over the
composited wash): 8.53, 9.13, 9.54, 9.16, 9.54 to 1.

**On "Charcoal".** The brief asks for a charcoal tone. On a `#101013` page a
charcoal wash is invisible, and no alpha fixes that. Two honest options: drop it,
or give it a **rule treatment instead of a fill**, a 2px left margin bar with no
background. Recommend dropping it for v1. Five colours is already at the limit of
what a reader assigns stable meanings to, and "Incense Smoke" occupies the same
tonal territory more usefully.

**Parchment needs a different treatment, not a different alpha.** Raising the
wash to 0.42 only reaches 1.28 to 1.42 against the page (measured), which is
still not a highlight. Recommendation: in Parchment, render highlights as a
**3px left rule plus a 0.18 wash**, so the mark is carried by the rule and the
wash only tints. Specify this in the Parchment override block, not per component.

### 7.2 Motion

Every duration comes from the existing scale. Every easing is `--ease-house`
except one deliberate exception.

| Trigger | Property | Duration | Easing | Reduced motion |
|---|---|---|---|---|
| Selection enter | `background-color` | 90ms | `--ease-house` | instant |
| Word boundary advance | `background-color` | 90ms | `--ease-house` | instant |
| Commit | `background-color` | 200ms | `--ease-house` | instant |
| Undo pill in | `opacity`, `translateY` | 200ms | `--ease-house` | opacity only |
| Undo pill out | `opacity` | 200ms | `--ease-house` | instant |
| Colour fan open | `opacity`, `scale` | 200ms | `--ease-house` | final state |
| Sector hover | `opacity` | 90ms | `--ease-house` | none |
| Margin bracket in | `opacity` | 90ms | `--ease-house` | none |
| Margin bracket out | `opacity` | 200ms | `--ease-house` | none |
| Hint overlay | `opacity` | 200ms | `--ease-house` | instant |
| SideRail slide | `transform` | 320ms | `--ease-house` | opacity only |
| **Fuse seam** | `scaleX` | 320ms | **`--ease-pop`** | instant |
| Transcript line advance | `opacity` | 320ms | `--ease-house` | instant |

`--ease-pop` is documented as "deliberate pop only". It is used exactly once, on
a 1px seam drawing itself between two fused quotations, which is the single
moment in this feature where something is created rather than merely revealed.

**Every new animated class must be added to the list in
`lib/ui/__tests__/motionDoctrine.test.ts`**, or it escapes the doctrine that
exists to catch the containing-block trap. Both new keyframes use `fill-mode:
backwards` and neither has fixed descendants.

### 7.3 Tailwind v4 notes

There is no `tailwind.config` file. New tokens go in the `@theme` block in
`app/globals.css` and utilities generate from them.

**Highlight colours cannot be static utility classes**, because the colour is
runtime data read from a record. `VerseRow.tsx` already applies them as inline
style values, which is correct and should not be "cleaned up" into class names.

If new class *groups* are introduced, `lib/cn.ts`'s `extendTailwindMerge`
configuration must learn about them, or `cn()` will fail to dedupe conflicting
classes. The existing config already registers the custom `text-*` size scale as
`font-size` so it does not collide with `text-<color>`.

---

## 8. Phasing

**Phase 0. Defect repair. No schema change, no new UI, no risk.**

D1 dead gather button, D2 iOS haptics, D3 colour sync (needs the `color` column
from section 2.7 first), D4 the betaImport prefix gap, D7 the citation contrast,
D8 the emoji icons. Verified by: typecheck, unit tests, and a browser walk of the
two readers. This phase is worth doing whether or not anything below it happens.

**Phase 1. Palette and Parchment.** Section 7.1. Pure token work. Ships in a
release whose patch notes name it plainly, because every existing highlight
changes appearance.

**Phase 2. Fathers parity.** Colour on `ParagraphAnnotation`, gather wired,
`ParagraphRow` taking a `ContentLocator`. Closes the oldest gap in the app.

**Phase 3. The anchor model.** Section 2. Carries the migration. Highest risk,
because of the older shipped build reading v2 records. Gate on the legacy floor
invariant tests being green.

**Phase 4. Mobile gestures.** Section 3. Depends on Phase 3 for `wordBasis`.

**Phase 5. Desktop.** Section 4. Independent of Phase 4.

**Phase 6. Canvas linking.** Section 5. Depends on Phase 2.

**Phase 7. Resurfacing, pull-based.** Section 6.2. No schema, no permission.

**Phase 8. Review reminders, push.** Section 6.3. Only after Phase 7 exists.

**Blocked, not phased. The living transcript canvas.** Section 6.4. Blocked on
audio recordings and timing data that do not exist and are not commissioned. The
only piece worth building now is the `lib/audio/sync.ts` extraction.

---

## 9. Open questions for the operator

1. **Is fusion a Plus feature or a free one?** The Florilegium hub is already
   gated. Fusion inherits the gate for free, but if fusion is the answer to
   Catena it may need to be visible to free readers as a reason to subscribe.
2. **Does image export of licensed translations have a licence path?** Section
   6.1 defaults to refusing. Confirm the NKJV/NIV/NLT terms permit rendering
   verse text into a shareable image at all, and what notice string is required.
3. **Should the 4,479 commentary notes get a `voice` field backfill?** Until
   they do, every fused witness is labelled editorial, which is correct and will
   read as a bug to anyone who fuses a genuine Chrysostom passage.
4. **Does the token-count divergence in 0.3 actually exist?** Measure it before
   Phase 3. If it is real, some existing word highlights are already landing on
   the wrong words when interlinear is toggled.
5. **Is word-level highlighting wanted on touch at all?** It is currently
   desktop-only in practice, and the mobile clear-words button can only ever
   appear for highlights made on a desktop.
