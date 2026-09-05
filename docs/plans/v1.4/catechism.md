# Feature A: Today's Catechism

Five questions a day, the same five for everyone on a given (date, reckoning),
at least one anchored to that day's saint, feast or reading, every question
deep-linking to free content. Human-written bank. No timer, no sharing, no
push.

## Shape of the build

**The selection is a pure function.** `pickDaily(bank, date, reckoning,
churchDay) -> QuestionId[5]` in `lib/catechism/select.ts`, seeded by
`${YYYY-MM-DD}:${new|old}` through a small xorshift so the web server, the
native bundle and a unit test all agree without a database. This is what
makes the native app work: the static export has no server, so the page
bakes a date-keyed window exactly as `VerseOfDayCard` does (3 days on web,
400 in the export) and the client picks today's key.

**The bank is content and lives in the repo.** `data/catechism/questions.json`
is canonical, reviewed, versioned in git like `data/topics/*.json`. The
import script validates the owner's file and writes it there, then mirrors it
into `quiz_questions` for the admin correct-rate view. Two copies, one
source; the DB never edits questions.

**Attempts are server-recorded for signed-in users and local for everyone
else.** `POST /api/catechism/attempt` (bearer or cookie, `apiFetch`) writes
`quiz_attempts` under RLS and bumps aggregate per-question counters.
Anonymous attempts stay in localStorage and post the aggregate counters only
(no session id, no identifiers), so the correct-rate still counts them.

## Files

```
lib/catechism/
  types.ts          Question, QuestionType, SourceRef, DailySet
  bank.ts           server-only loader of data/catechism/questions.json
  select.ts         pickDaily(): seed, anchor, weighted pool (pure, tested)
  sourceRef.ts      parse + resolve a source_ref to an href and a label
  window.ts         buildDailyWindow(days): the VerseOfDay pattern
  local.ts          localStorage attempts and completion count (anon)
app/(app)/catechism/page.tsx        server shell: metadata + window -> client
components/catechism/
  CatechismClient.tsx   picks today's key, runs the five, posts the attempt
  QuestionCard.tsx      one question, option buttons with aria-pressed
  AnswerPanel.tsx       explanation + source link, aria-live="polite"
  CompletionScreen.tsx  five marks fill in, one quiet line
  CatechismCard.tsx     optional Today card (one line, links to /catechism)
app/api/catechism/attempt/route.ts  POST, zod, rate limit, RLS write
app/api/catechism/stats/route.ts    POST aggregate counters (anon path)
app/api/admin/catechism/route.ts    per-question correct-rate for the panel
scripts/quiz-import.ts              validate + write JSON + mirror to DB
data/catechism/questions.json       the bank (owner-supplied)
docs/CATECHISM.md                   import format, seed algorithm, adding a collection
```

Touch points: `components/today/TodayMobileV3.tsx` (card), the last
onboarding step in `components/onboarding/OnboardingFlow.tsx` (one line),
`public/sw.js` (`CACHE_VERSION` bump; nothing else, see below),
`app/(app)/faq/page.tsx` (one Q), `app/(app)/privacy/page.tsx` (one
paragraph, EN and DE), `lib/i18n/messages/en.json`, `components/admin`
(one small tab or a card on Content).

## Question types at launch

Multiple choice (4 options), true/false, fill-the-missing-word (typed, case
and diacritic insensitive, accepts listed alternates). Match-pairs deferred:
it does not stay clean at 360px without drag, and drag is a second motion
vocabulary.

## Selection algorithm (explainable)

1. Seed `sha256(date + ":" + reckoning)` truncated to 32 bits.
2. Anchor: the day's `commemorationsOn`, `feastsOn`, `readingsOn` for the
   shifted (saints) and civil (readings) dates, as `useChurchDay` does. Any
   question whose `calendar_anchor` matches a saint slug, feast key, or
   reading book+chapter is a candidate; pick one with the seed. If none, or
   the bank has fewer than 35 questions, skip the anchor.
3. Remaining four: weighted draw without replacement. Weight = 1 / (1 + days
   since last shown within the trailing 7 days, computed by replaying the
   seed for the prior 7 days), times a tag balance factor (under-covered tags
   up-weighted). Never repeats a question within 7 days when the bank allows.
4. Output is ordered anchor first, then by seed.

All of this is deterministic from (bank, date, reckoning, calendar data), so
tomorrow's set is computable today and the test asserts the same five ids on
two runs.

## Data

```sql
quiz_questions   id uuid pk, type text check, prompt text, options jsonb,
                 answer jsonb, explanation text, source_ref text, tags text[],
                 calendar_anchor jsonb, reviewed_by text, published_at timestamptz,
                 retired_at timestamptz
quiz_daily       date date, reckoning text check ('new','old'), question_ids uuid[],
                 pk (date, reckoning)                       -- written lazily by the attempt route
quiz_attempts    id uuid pk (client uuid), user_id uuid references auth.users,
                 date date, reckoning text, answers jsonb, score int, completed_at timestamptz,
                 unique (user_id, date, reckoning)
quiz_question_stats  question_id uuid pk, shown int, correct int   -- aggregate, no ids
```
RLS: `quiz_questions` select for all, writes service role. `quiz_attempts`
`_self_all`. `quiz_daily` select all, service role writes.
`quiz_question_stats` service role only, bumped by an RPC `bump_quiz_stats`
callable by the attempt and stats routes.

Migration: `supabase/migrations/2026MMDD_catechism.sql`. NOT SIGNED OFF until
the owner reads it; the code tolerates the tables being absent (attempts stay
local, stats are dropped).

## Env

None new. `CRON_SECRET` unused: no nightly job, the set is computed on
request and the window is baked for native.

## Events

`catechism_started`, `catechism_completed { score }`,
`catechism_question_answered { question_id, correct }`. The first two go to a
new `analytics_events (name, props jsonb, ts)` table through
`POST /api/track/event` (same hardening as `/api/track`, no session id
stored). The third is the `quiz_question_stats` counter, not an event row.
`/privacy` gains one paragraph naming `analytics_events` and
`quiz_question_stats` and what they hold.

## Offline

The service worker precaches nothing today, by design. Rather than add a
precache manifest, the window approach makes the page itself carry today and
tomorrow, so the HTML the SW already keeps under `networkFirst` is enough.
`CACHE_VERSION` bumps with the release as always. Native carries 400 days in
the bundle.

## Motion

`QuestionCard` enters with `.cascade-rise` (options stagger with
`--stagger-step-tight`), selection uses a 200ms `--ease-house` fill on the
correct option and a drawn check (one SVG path, `stroke-dashoffset`),
incorrect settles to `text-paper/55`. Explanation expands with a `max-height`
transition at `--duration-base`. Completion: five marks with
`.onboard-mark-in` at 70ms steps. Reduced motion: opacity only, 120ms, via
the existing per-keyframe media blocks.

## Tests

- `select.test.ts`: same five ids for a (date, reckoning) across runs; anchor
  present when calendar data has a matching question; no repeat within 7
  days on a 40-question bank; anchor skipped under 35.
- `sourceRef.test.ts`: every ref in the bank resolves (also run by the
  import script).
- `attempt` route: rejects a second attempt for the same day, rejects an
  answers payload longer than the set.
- Playwright: keyboard-only completion of the five at 360px.

## Integrity note (draft)

C1: all question content links to free pages; the quiz itself is free.
C2: two aggregate tables, no identifiers on the anonymous path; disclosed.
C3: no timer, no streak, no "missed", no expiry. Completion count is one
line on /account.
C4: same PR. C5: copy reviewed against the banned list.
