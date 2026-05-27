# Topical Index data files

Each `.json` file in this folder is one *curated topic*, a short Orthodox definition of a doctrinal question plus a list of patristic citations that confess it (or refute its opposite).

The shipped corpus of patristic text lives in `data/saints/{slug}/{work}.json` already. Topic files do **not** duplicate any of that text. Each citation is a deep link into a specific section of an existing work; the topic page renders that paragraph as a pull-quote at read time.

## File shape

See `lib/topics/topics.ts` for the typed shape. A minimal topic looks like:

```json
{
  "slug": "the-trinity",
  "title": "The Trinity",
  "definition": "The Orthodox Church confesses one God in three Persons: the Father, the Son, and the Holy Spirit; one essence, three hypostases; coeternal, coequal, and consubstantial.",
  "citations": [
    {
      "saintSlug": "athanasius-the-great",
      "workSlug": "four-discourses-against-the-arians",
      "sectionN": 1,
      "stance": "affirms",
      "gloss": "The Son was always, and never was not."
    }
  ],
  "curatedBy": "Editorial",
  "curatedOn": "2026-05-27"
}
```

- `slug`, file-stem and route segment. Lowercase, hyphenated.
- `title`, display name on the topic page and in any index lists.
- `definition`, one paragraph, plain English, no jargon. Written for an enquirer.
- `tradition`, optional second paragraph for historical / contextual notes (e.g. "The Filioque was added to the Western recension...").
- `citations[]`, list of pointers into existing saint works:
  - `saintSlug` matches `lib/saints/saints.ts`.
  - `workSlug` matches `data/saints/{saintSlug}/{workSlug}.json`.
  - `sectionN` is the 1-based section number inside the work.
  - `paragraphIndex` is optional, 0-based paragraph inside the section.
  - `stance` is `"affirms"` (the citation confesses the topic) or `"refutes"` (the citation refutes the topic's opposite).
  - `gloss` is an optional one-line editorial note above the pull-quote.
- `curatedBy` / `curatedOn`, editorial provenance. Encouraged for accountability.

## Editorial workflow

1. Pick a doctrinal question the community keeps asking about. (Trinity, the Filioque, icons, Mariology, Theosis, the Eucharist, etc.)
2. Write the definition for an enquirer, not a seminarian. One paragraph.
3. Walk the saint corpus and pick 4-8 strong primary-source citations. Prefer breadth (multiple Fathers across multiple centuries) over depth (twelve Athanasius quotes is one Father's voice, not the Church's).
4. Where applicable, add 2-4 citations under `stance: "refutes"` that refute the *opposite* of the topic. The topic page only renders the refuting column when this list is non-empty.
5. Verify every `(saintSlug, workSlug, sectionN)` triple resolves, the topic page will silently drop unresolvable citations so a broken pointer becomes invisible if not checked.
6. Sign with `curatedBy` and `curatedOn`.

## Reverence guardrails

Per `docs/prd/v6.4-community-feedback.md` §1: no upvotes, no "popular topics," no streak / gamification surfaces on `/topics`. The page is a reference. Treat it like one.

## Open question

Editorial governance, who writes, who reviews. The scaffolding is in place; the editorial process needs to be settled before this folder fills out beyond the starter examples.
