# The opening prayers at the Third, Sixth and Ninth Hours (part 1 shipped)

Build 90 note 7 (2026-11-10). The owner's first yes was "with a priest checking
first". His later word, "Yes to all recommended suggestions. Do them all."
(2026-11-10, about 20:07 UTC, call 13), took the recommendation that these
Hours open like the First with no priest first, so the change below is applied
as written. Question 2 still waits for a public-domain source. It is item 29
of the clergy review queue (`docs/editorial-standards.md`).

## What the app does today

The First Hour opens, after its blessing, with three prayers in the Morning
Rule's own words: O Heavenly King; the Trisagion through Glory and Now and
ever; and the Lord's Prayer. Its file points to them
(`data/prayers/hours/first-hour.json`, the parts `heavenly-king`, `trisagion`
and `our-father`), and the Hours' loader draws them from the Morning Rule
(`lib/prayers/hours.ts`, `resolveHour`), so the words exist once.

The Third, Sixth and Ninth Hours go from their blessing straight to their
first psalm.

## The questions for the priest

1. Does each of these Hours, read on its own as the app gives it, begin with
   these prayers after the blessing, as the First Hour does?
2. Should an Hour's beginning also carry "Lord, have mercy" twelve times and
   "O come, let us worship"? The app's texts do not hold these, so a
   public-domain source would be found and read before they are added. This
   change does not add them.

## The change, on a yes to question 1

In each of `data/prayers/hours/third-hour.json`, `sixth-hour.json` and
`ninth-hour.json`, between the part `opening` and the first psalm, the same
three parts as the First Hour's, pointing to the same words. Nothing is
written new:

```json
{
  "id": "heavenly-king",
  "from": { "ruleId": "morning", "prayerId": "heavenly-king" },
  "instruction": "The opening prayers, as in the Morning Rule."
},
{
  "id": "trisagion",
  "from": { "ruleId": "morning", "prayerId": "trisagion" }
},
{
  "id": "our-father",
  "from": { "ruleId": "morning", "prayerId": "our-father" }
}
```

With it, in each file:

- its `source` names the opening prayers' edition as the First Hour's does:
  "The opening prayers in the words of the Morning Rule (the common Orthodox
  prayer book's public-domain English)";
- its `estimatedMinutes` rises by one, at the file's own pace (188 more
  words);
- `lib/prayers/__tests__/noStandIns.test.ts` counts the Hours' pointing parts:
  3 today, 12 with this change.

Then the export walk of each Hour, its opening prayers read through, as the
First Hour's was.
