# Today's Catechism

Five questions a day on the faith, the same five for everyone on a given day
and calendar reckoning, at least one belonging to that day's saint, feast or
reading when the bank allows, every one pointing to the free page it comes
from. Route: `/catechism`. Built 2026-09-05 on `feat/catechism` for v1.4 from
the owner's spec; plan in `docs/plans/v1.4/catechism.md`.

The questions are written and reviewed by people. Nothing in the code writes
one, and `data/catechism/questions.json` ships empty until the owner's bank is
imported. While it is empty the page shows a quiet empty state, the Today card
renders nothing, and the onboarding line is not shown.

## The bank

`data/catechism/questions.json` is canonical: a JSON array, reviewed and
committed like `data/topics/*.json`. `scripts/quiz-import.ts` is its only
writer. The database table `quiz_questions` is a mirror for the admin
correct-rate view and never feeds a page.

### Import

```
node --experimental-strip-types --import ./scripts/lib/register-alias.mjs scripts/quiz-import.ts --file bank.json
node --experimental-strip-types --import ./scripts/lib/register-alias.mjs scripts/quiz-import.ts --file bank.json --apply
node --experimental-strip-types --import ./scripts/lib/register-alias.mjs scripts/quiz-import.ts --file bank.json --apply --mirror
```

`npm run quiz:import -- --file bank.json --apply` is the same command.

Dry run by default. `--apply` writes the file. `--mirror` also upserts the
rows into `quiz_questions` with the service role read from `.env.local`
(needs `supabase/migrations/20260905_catechism.sql` applied). The script
refuses the whole file on the first problem and prints every one: a row that
does not match the schema, a duplicate id, a `source_ref` that does not
resolve, a work section that does not exist, a calendar anchor naming a saint
or a Bible chapter the registries do not hold. Nothing is written until the
file is clean.

`lib/catechism/__tests__/bank.test.ts` runs the schema, id and source_ref
checks against the committed file on every test run.

### One question

```json
{
  "id": "1b4e28ba-2fa1-4d2b-9c8f-3a5d6e7f8a90",
  "type": "multiple_choice",
  "prompt": "PROMPT: the question, one sentence, no em dashes.",
  "options": ["OPTION A", "OPTION B", "OPTION C", "OPTION D"],
  "answer": 1,
  "explanation": "EXPLANATION: two or three sentences, in the steward voice, saying why, and naming the source in words.",
  "source_ref": "/councils/first-nicaea",
  "tags": ["councils", "creed"],
  "calendar_anchor": { "feast": "05-29" },
  "reviewed_by": "Name, role",
  "published_at": "2026-09-10",
  "retired_at": null
}
```

That is a format example, not a question. The capitalised placeholders are
where the reviewed text goes.

| Field | Required | What it is |
|---|---|---|
| `id` | yes | A uuid, fixed for the life of the question. Attempts and counters key on it; changing it makes a new question. |
| `type` | yes | `multiple_choice`, `true_false` or `fill_word`. |
| `prompt` | yes | The question. Up to 400 characters. |
| `options` | for `multiple_choice` | Exactly four strings, up to 200 characters each. Absent for the other types. |
| `answer` | yes | By type: the 0-based index into `options`; a boolean; or a non-empty list of accepted spellings, the first of which is shown after answering. |
| `explanation` | yes | Shown after answering, right or wrong. Up to 1200 characters. Cite the source in words; the link comes from `source_ref`. |
| `source_ref` | yes | A site path into free content. See below. |
| `tags` | yes | Lowercase slugs, up to twelve. Free-form study tags. This is the hook Study Collections attach to: a collection is a tag with a name. |
| `calendar_anchor` | no | `{ "saint": slug }`, `{ "feast": "MM-DD" }` or `{ "reading": { "book": slug, "chapter": n } }`. Makes the question a candidate for the day's anchor slot. See the algorithm. |
| `reviewed_by` | yes | Who reviewed it. Never shown to readers. |
| `published_at` | no | `YYYY-MM-DD`. The question is eligible from that day. Absent means eligible now. |
| `retired_at` | no | `YYYY-MM-DD`. Set it rather than deleting the row, so old attempts still name a question. |

Typed answers (`fill_word`) are compared case and diacritic insensitively with
punctuation dropped, so "Théotokos." matches "theotokos". List alternates
when a word has more than one accepted English form.

No field may contain an em dash. The schema refuses it.

### `source_ref` shapes

Every question links to free content, and the link is checked against the
app's own registries at import and again in the test suite:

| Shape | Resolved against |
|---|---|
| `/saints/{slug}` | `lib/saints/saints.ts` |
| `/saints/{saint}/{work}#s{n}` | the work in the registry, and section `n` in `data/saints/{saint}/{work}.json` |
| `/heresies/{slug}` | `lib/heresies/heresies.ts` |
| `/councils/{slug}` | `lib/councils/councils.ts` |
| `/topics/{slug}` | `data/topics/{slug}.json` |
| `/bible/{book}/{chapter}` | `lib/bible/books.ts`, chapter within the book |
| `/prayers`, `/prayers/{rule}`, `/prayers/hours/{slug}`, `/prayers/akathists/{slug}` | `lib/prayers/rules.ts`, `hours.ts`, `akathists.ts`, plus the fixed prayer pages |

The answer screen shows the resolved page name as the link text.

## How the five are chosen

`lib/catechism/select.ts`, `pickDaily(bank, date, reckoning)`. Pure,
deterministic, precomputable: the web server, the native bundle and a unit
test all agree with no database.

1. Seed: the first 32 bits of `sha256("YYYY-MM-DD:new")` (or `:old`),
   driving a xorshift32. Every draw below reads that one stream.
2. Anchor: the day's commemorations and feasts on the SHIFTED date (the
   menologion moves with the reckoning) and its appointed readings on the
   CIVIL date (the paschal cycle does not), the same split
   `lib/calendar/useChurchDay.ts` makes. Any eligible question whose
   `calendar_anchor` matches is a candidate; one not shown this week is
   drawn, or any candidate if all were. Skipped when fewer than 35 questions
   are eligible, because a small bank cannot both anchor and keep the
   no-repeat rule, and no-repeat wins.
3. The rest: a weighted draw without replacement. Weight is
   `1 / (1 + days since last shown)` within the trailing 7 days (1 for
   anything not shown), times a tag balance factor that up-weights tags the
   week under-covered. Questions shown in the last 7 days are excluded
   outright when enough others remain.
4. Anchor first, then the four in draw order.

"Days since last shown" needs the prior week's sets, so sets are computed in
order from a fixed epoch (2026-01-01) and memoised per bank. A question is
eligible from `published_at` until `retired_at`.

## How it reaches the reader

The native app is a static export with no server, so the page cannot ask
what day it is. `app/(app)/catechism/page.tsx` bakes a date-keyed window
(`lib/catechism/window.ts`): 400 days for the export, 3 for the web, both
reckonings per day, every question those days name once. The client child
picks the reader's own day after mount, from `useToday` and the calendar
reckoning preference. Sets are stored as indices into the question list, so
the 400-day table costs about 12KB rather than 150KB of uuids.

Grading is local, so the explanation and the source show without a server.
When the fifth answer lands the attempt is written to the device
(`lib/catechism/local.ts`, `purify:catechism:attempts`). Then:

- signed in: `POST /api/catechism/attempt` with the client-generated id, the
  date, the reckoning and the answers. The server re-derives the set with the
  same `pickDaily`, refuses answers longer than the set or outside it, grades
  again, records ITS score in `quiz_attempts` under RLS, bumps the counters,
  and records the day's set in `quiz_daily`. A second attempt for the same
  (user, date, reckoning) is a 409. An absent table is a 503 and the device
  copy stands.
- signed out: `POST /api/catechism/stats` with the shown and correct id
  lists. Nothing else leaves the device.

Two events go to `POST /api/track/event`: `catechism_started { reckoning }`
and `catechism_completed { score, total, reckoning }`. The event names and
their props are a closed list in `lib/security/schemas.ts`; the table has no
session or user column.

`/account` shows "You have completed N catechisms" once N is above zero,
from the device count or, signed in, the reader's own `quiz_attempts` count,
whichever is larger.

## Tables

`supabase/migrations/20260905_catechism.sql`, NOT SIGNED OFF until the owner
reads it. Every reader tolerates the tables being absent.

| Table | Holds | Access |
|---|---|---|
| `quiz_questions` | the bank mirror | select all, service role writes |
| `quiz_daily` | `(date, reckoning) -> question_ids`, written lazily by the attempt route | select all, service role writes |
| `quiz_attempts` | one row per signed-in reader per (date, reckoning): graded answers, score | `_self_all` |
| `quiz_question_stats` | per question: shown, correct, across everyone | service role only, bumped by `bump_quiz_stats(uuid[], uuid[])`, a security definer function granted to `service_role` alone |
| `analytics_events` | `(name, props, ts)`, no identifiers | service role only |

## Admin

Reach > Catechism (`components/admin/tabs/CatechismTab.tsx`,
`/api/admin/catechism`): the bank size, today's two sets with the anchor
marked, and per-question shown, correct and rate, lowest rate first. Counts
only; no row of `quiz_attempts` leaves the route. A table that is not there
says so; a count that could not be read says "unmeasured", never 0.

## Adding a collection later

Study Collections (`docs/plans/v1.4/collections.md`) are not built here, and
this is the shape they plug into:

- a collection is a tag with a name. `tags` on every question is the join.
- progress is the set of question ids answered rightly. Every attempt,
  local or server, already carries `answers[].question_id` and
  `answers[].correct`, so a union over attempts is the progress with no new
  write on the quiz side.
- `CATECHISM_EVENT` fires in-tab on every attempt written; a collection hook
  can subscribe to it the way `useCompletionCount` does.

## Integrity note

- C1, free: every question links to a free page and the quiz itself is free.
  Nothing on `/catechism` is gated.
- C2, data: two aggregate tables on the anonymous path, no identifiers, both
  named on `/privacy` in English and German beside the analytics tables.
  Signed-in attempts are self-only rows, deleted with the account.
- C3, calm: no timer, no score sharing, no push, no streak, no "you missed",
  no expiry, no confetti, no sound, no haptics. The completion count is one
  line on `/account`, shown only once it is above zero.
- C4, one change: page, routes, migration, admin tab, import script, doc,
  tests, and the touch points (Today card, onboarding line, FAQ, privacy,
  account) in one branch.
- C5, words: the copy was read against the banned list (reward, earn,
  unlock, streak, level, premium, VIP, elite). None appears in a catechism
  string. Two pre-existing uses elsewhere (`nav.premium`, the fasting
  "streak" strings) are recorded in `docs/plans/v1.4/README.md`.
