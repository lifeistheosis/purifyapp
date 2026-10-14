/**
 * The first week's numbers: read-only SQL the owner runs in Supabase a week
 * after the drop, and reads out to us.
 *
 * It counts only what the database honestly holds: the visits that began,
 * and what each was read on (the apps tell themselves apart in the user
 * agent), the visits that opened What's New, the visits that came through
 * the release email's links, the new accounts, and the release emails sent.
 * Each figure stands beside the same figure for the week before, so a
 * number can be read as more or fewer and not only as large or small.
 *
 * WHAT IT CANNOT COUNT: which version of Purify an app is on. The apps send
 * no version with a visit, and no table keeps one. Each version's share is
 * read where the stores keep it, in Play Console and App Store Connect, and
 * the SQL says so in its own first lines.
 *
 * Every table and column it names is created in supabase/migrations, and the
 * comment above each part names the file it relies on.
 * lib/drop/__tests__/numbers.test.ts holds the SQL to those files and to
 * reading only, so a renamed column fails a test here and not in the editor.
 *
 * Written out each time the kit is made, never kept in drop.json, so it
 * always counts the drop's own week. Pure.
 */

import { emailTag, storedTag } from "@/lib/analytics/tag";

import { isDay, longDay } from "./days";
import type { Drop } from "./kit";

export type FirstDay = { day: string; why: string } | null;

/**
 * The day the week starts: the day the announcement went out, when one of
 * its pieces is recorded as sent, and the drop day as planned when none is.
 * Null when neither is known: the SQL then starts the week on the day the
 * release's note went up on What's New.
 */
export function firstDayOf(drop: Pick<Drop, "day" | "pieces">): FirstDay {
  const told = drop.pieces
    .filter((p) => p.moment === "web" && p.sent && isDay(p.sent.on))
    .map((p) => p.sent?.on ?? "")
    .sort();
  if (told.length) return { day: told[0], why: "the day the announcement went out" };
  if (drop.day && isDay(drop.day)) return { day: drop.day, why: "the drop day" };
  return null;
}

/** A text as an SQL literal. */
const lit = (text: string) => `'${text.replace(/'/g, "''")}'`;

/** The rows the SQL answers in, in order: what each says, and the column of per_week it reads. */
const ROWS: readonly [string, string][] = [
  ["Visits that began", "all_visits"],
  ["  on the website", "website"],
  ["  in the Android app", "android_app"],
  ["  in the iPhone and iPad app", "iphone_app"],
  ["  in the Windows app", "windows_app"],
  ["Visits from the release email", "from_email"],
  ["Visits that opened What's New", "opened"],
  ["  of them in an app", "in_apps"],
  ["New accounts", "new_accounts"],
  ["Release emails sent", "release_emails"],
];

/** The SQL for a drop's first week, as the owner pastes it. */
export function numbersSql(drop: Pick<Drop, "release" | "day" | "pieces">): string {
  const release = drop.release;
  const first = firstDayOf(drop);
  const fromEmail = storedTag(emailTag("release", `release:${release}`));

  const week = first
    ? [
        "with the_week as (",
        `  -- ${first.why.charAt(0).toUpperCase()}${first.why.slice(1)}. To count another week, change this one day.`,
        `  select date ${lit(first.day)} as first_day`,
        "),",
      ]
    : [
        "with the_week as (",
        `  -- No drop day is set and no announcement is recorded, so the week starts`,
        `  -- on the day the ${release} note went up on What's New.`,
        "  -- Relies on 20260904000100_patch_notes.sql: public.patch_notes",
        "  -- (version, status, published_at, date).",
        "  select (select coalesce((pn.published_at at time zone 'UTC')::date, pn.date)",
        "            from public.patch_notes pn",
        `           where pn.version = ${lit(release)} and pn.status = 'published') as first_day`,
        "),",
      ];

  const values = [
    "       (1, 'The days, in UTC', coalesce(to_char(pw.starts_at at time zone 'UTC', 'Dy FMDD Mon') || ' to ' || to_char((pw.ends_at - interval '1 day') at time zone 'UTC', 'Dy FMDD Mon'), 'not known yet'))",
    ...ROWS.map(([figure, column], i) => `       (${i + 2}, ${lit(figure)}, pw.${column}::text)`),
  ];

  return [
    `-- Purify ${release}: the first week in numbers.`,
    "-- Read-only: one SELECT, and nothing is written. Paste all of it into the",
    `-- Supabase SQL editor and press Run. It answers in ${values.length} rows, each with this`,
    "-- week's figure and the week before's beside it, to read out to us.",
    "--",
    first
      ? `-- The week is the seven days from ${longDay(first.day)}, ${first.why}, in UTC days, as the admin panel counts them.`
      : `-- The week is the seven days from the day the ${release} note went up on What's New, in UTC days.`,
    "--",
    "-- What it cannot count: which version of Purify an app is on. The apps send",
    "-- no version with a visit, and no table keeps one. Each version's share is",
    "-- in Play Console (Statistics, by app version) and in App Store Connect",
    "-- (Analytics, by app version).",
    "",
    ...week,
    "spans as (",
    "  -- This week and the one before it, each from midnight UTC.",
    "  select 'this week' as week_of,",
    "         (w.first_day::timestamp at time zone 'UTC') as starts_at,",
    "         ((w.first_day + 7)::timestamp at time zone 'UTC') as ends_at",
    "    from the_week w",
    "  union all",
    "  select 'the week before',",
    "         ((w.first_day - 7)::timestamp at time zone 'UTC'),",
    "         (w.first_day::timestamp at time zone 'UTC')",
    "    from the_week w",
    "),",
    "visits as (",
    "  -- Visits that began in each week, by what they were read on. Each store",
    "  -- app adds PurifyNative to its user agent and the Windows app has",
    "  -- PurifyDesktop written after it, which is how lib/analytics/platform.ts",
    "  -- tells the apps from the website. A visit through a link in the release",
    "  -- email kept the email's tag where the referrer goes (lib/analytics/tag.ts).",
    "  -- Relies on 20260521000000_analytics.sql: public.analytics_sessions",
    "  -- (session_id, first_seen, user_agent, referrer).",
    "  select sp.week_of,",
    "         count(s.session_id) as all_visits,",
    "         count(s.session_id) filter (where coalesce(s.user_agent, '') not like '%PurifyNative%' and coalesce(s.user_agent, '') not like '%PurifyDesktop%') as website,",
    "         count(s.session_id) filter (where s.user_agent like '%PurifyNative%' and s.user_agent ilike '%android%') as android_app,",
    "         count(s.session_id) filter (where s.user_agent like '%PurifyNative%' and s.user_agent not ilike '%android%') as iphone_app,",
    "         count(s.session_id) filter (where s.user_agent like '%PurifyDesktop%') as windows_app,",
    `         count(s.session_id) filter (where s.referrer = ${lit(fromEmail)}) as from_email`,
    "    from spans sp",
    "    left join public.analytics_sessions s",
    "      on s.first_seen >= sp.starts_at and s.first_seen < sp.ends_at",
    "   group by sp.week_of",
    "),",
    "whats_new as (",
    "  -- Visits that opened What's New in each week, each visit once, and how",
    "  -- many were in an app. A page view is written for every page a visit",
    "  -- opens, and again every twenty seconds it stays there",
    "  -- (components/analytics/AnalyticsTracker.tsx), so visits are counted",
    "  -- here and never page views.",
    "  -- Relies on 20260521000000_analytics.sql: public.analytics_pageviews",
    "  -- (session_id, path, ts) and public.analytics_sessions (session_id,",
    "  -- user_agent).",
    "  select sp.week_of,",
    "         count(distinct pv.session_id) as opened,",
    "         count(distinct pv.session_id) filter (where s.user_agent like '%PurifyNative%' or s.user_agent like '%PurifyDesktop%') as in_apps",
    "    from spans sp",
    "    left join public.analytics_pageviews pv",
    "      on pv.ts >= sp.starts_at and pv.ts < sp.ends_at",
    "     and pv.path ~ '^/whats-new/?([?#].*)?$'",
    "    left join public.analytics_sessions s on s.session_id = pv.session_id",
    "   group by sp.week_of",
    "),",
    "accounts as (",
    "  -- New accounts in each week. Every account gets a profile the moment it",
    "  -- signs up (the on_auth_user_created trigger), so an account deleted",
    "  -- since is not counted.",
    "  -- Relies on 20260518000000_profiles_bookmarks_annotations.sql: public.profiles",
    "  -- (id, joined_at).",
    "  select sp.week_of, count(pr.id) as new_accounts",
    "    from spans sp",
    "    left join public.profiles pr",
    "      on pr.joined_at >= sp.starts_at and pr.joined_at < sp.ends_at",
    "   group by sp.week_of",
    "),",
    "emails as (",
    `  -- Release emails that went out in each week: one row of the send log for`,
    `  -- each account, keyed release:${release}:<account>.`,
    "  -- Relies on 20260914000100_email_sends.sql: public.email_sends (kind,",
    "  -- dedupe_key, status, sent_at).",
    "  select sp.week_of, count(es.dedupe_key) as release_emails",
    "    from spans sp",
    "    left join public.email_sends es",
    "      on es.kind = 'release'",
    `     and es.dedupe_key like ${lit(`release:${release}:%`)}`,
    "     and es.status = 'sent'",
    "     and es.sent_at >= sp.starts_at and es.sent_at < sp.ends_at",
    "   group by sp.week_of",
    "),",
    "per_week as (",
    "  select sp.week_of, sp.starts_at, sp.ends_at,",
    "         vi.all_visits, vi.website, vi.android_app, vi.iphone_app, vi.windows_app, vi.from_email,",
    "         wn.opened, wn.in_apps, ac.new_accounts, em.release_emails",
    "    from spans sp",
    "    join visits vi on vi.week_of = sp.week_of",
    "    join whats_new wn on wn.week_of = sp.week_of",
    "    join accounts ac on ac.week_of = sp.week_of",
    "    join emails em on em.week_of = sp.week_of",
    ")",
    "select r.n, r.figure,",
    "       max(r.amount) filter (where pw.week_of = 'this week') as this_week,",
    "       max(r.amount) filter (where pw.week_of = 'the week before') as week_before",
    "  from per_week pw",
    " cross join lateral (values",
    `${values.join(",\n")}`,
    "     ) as r(n, figure, amount)",
    " group by r.n, r.figure",
    " order by r.n;",
    "",
  ].join("\n");
}
