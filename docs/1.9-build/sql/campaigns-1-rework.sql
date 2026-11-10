-- Prayer campaigns, reworked, file one: the campaign itself, joining it, and
-- reports (1.9; docs/1.9-build/notes/campaigns-fable.md, sections 5.2 and 10).
--
-- NOT APPLIED YET. Signed off by the owner on 2026-11-10 ("R0b yes 1", on its
-- summary in plain words: he does not read SQL, docs/1.9-build/HANDOFF.md)
-- and copied, word for word from "set lock_timeout" down, into
-- supabase/migrations/20261110084116_campaigns_rework.sql, which the
-- integration runs on the merge to main. This copy is the SQL to paste into
-- the editor, should he run it by hand first or the integration's check be
-- red.
--
-- Probed on production on 2026-11-10 at 08:38 UTC, with the site's public
-- key: not run. The column "days" was not there, and that key still read the
-- campaigns table. A word that it had been run by hand that morning did not
-- hold, so nothing here says applied until a probe does.
--
-- Written to run twice: every statement is "if not exists", or drops what it
-- is about to make. Run twice on 2026-11-10 on a scratch PostgreSQL 16
-- standing on every migration in the folder, with a campaign of July's and
-- one reader's three reports of it put in first: no error either time, and
-- the schema after the second run is the schema after the first.
--
-- It makes no new table. What it changes, in plain words:
--   prayer_campaigns         July's table gains what a reworked campaign
--                            carries: its words, its length in days with its
--                            first and last day, the prayer of the prayer
--                            book it names (by reference, never the words), a
--                            coarse place, who can see it (everyone, or one
--                            circle), whether comments are open, whether it
--                            may stand in a list, whether it is kept after
--                            its last day, its creator's name as Community
--                            shows it, what the creator affirmed and when,
--                            and what a moderator decided. A campaign may be
--                            for three more things (study, travel, other) and
--                            be in two more states (held, ended).
--   the table's door         The public key can no longer read the table.
--                            July let anyone holding that key read every
--                            campaign whole, the creator's account id with
--                            it. From here every read is a route's
--                            (app/api/campaigns), with a list of columns
--                            that leaves the account id and the counts out.
--   prayer_campaign_prayers  Joining gains the prayers a reader carries it
--                            in, the reader's own last day, and notices of
--                            the creator's updates, off unless asked for.
--   prayer_campaign_reports  A report gains what it is about, a reason from a
--                            list, and a state. One open report a reader a
--                            campaign: a reader's repeats are closed, not
--                            deleted. The public key can no longer reach
--                            this table either.
--   community_mod_log        The moderators' log may name a campaign or a
--                            picture.
--
-- What a reader can reach once it has run: nothing new. Every campaign route
-- answers 404 while CAMPAIGNS_OPENING in lib/campaigns/flags.ts says closed,
-- and Read together's circles (prayer_campaign_groups and its members) are
-- not touched.
--
-- July's campaigns: every row keeps every column it had, and no row is
-- deleted. The new columns are empty on them. The rework runs none of them:
-- a campaign with no length is shown to nobody but the reader who started it,
-- who finds it ended and can take it down (lib/campaigns/model.ts, isJulyRow),
-- and the housekeeping never touches one (lib/campaigns/upkeep.ts). What
-- becomes of them in the end is the owner's to say.
--
-- Before running: the three tables it alters and the one it points at must be
-- there (docs/1.9-build/notes/campaigns-fable.md, 5.5, has the probe).
--
-- Check after running, in the SQL editor. Read only, one row. Expected: 22,
-- 3, 5, 0, false; the last number is how many campaigns July left. (Before
-- the SQL has run, the check stops at the column "days", which is not there
-- yet: that is its answer too.)
--   select
--     (select count(*) from information_schema.columns
--       where table_schema = 'public' and table_name = 'prayer_campaigns'
--         and column_name in ('details', 'days', 'starts_on', 'ends_on',
--           'prayer_rule', 'prayer_id', 'place_country', 'place_name',
--           'audience', 'circle_id', 'comments_open', 'listed',
--           'keep_after_end', 'creator_name', 'creator_handle',
--           'consent_kind', 'consent_at', 'held_reason', 'mod_cleared_at',
--           'removed_reason', 'removed_by_email', 'ended_at')) as campaign_columns,
--     (select count(*) from information_schema.columns
--       where table_schema = 'public' and table_name = 'prayer_campaign_prayers'
--         and column_name in ('places', 'until_on', 'notify_updates')) as join_columns,
--     (select count(*) from information_schema.columns
--       where table_schema = 'public' and table_name = 'prayer_campaign_reports'
--         and column_name in ('target_kind', 'target_id', 'reason_code',
--           'status', 'closed_at')) as report_columns,
--     (select count(*) from pg_policies
--       where schemaname = 'public' and tablename = 'prayer_campaigns'
--         and policyname = 'prayer_campaigns_public_select') as public_policy,
--     has_table_privilege('anon', 'public.prayer_campaigns', 'select') as public_key_reads,
--     (select count(*) from public.prayer_campaigns where days is null) as campaigns_of_july;

set lock_timeout = '3s';
set statement_timeout = '120s';

-- 1. What a campaign may be for, and the states it may be in ---------------
--
-- Three more intentions beside the six of July: study (an exam, a school
-- year), travel (a journey) and other (anything else, in the creator's own
-- words). Two more states: held (waiting for a moderator, as a held post in
-- Community is) and ended (its last day has passed). The old checks were
-- written inline, so they are found by what they say (the way
-- 20261005000000_community_three.sql finds its own).
do $$
declare
  c record;
begin
  for c in
    select con.conname
      from pg_constraint con
     where con.contype = 'c'
       and con.conrelid = 'public.prayer_campaigns'::regclass
       and pg_get_constraintdef(con.oid) ~ 'intention'
       and pg_get_constraintdef(con.oid) ~ 'healing'
       and pg_get_constraintdef(con.oid) !~ 'study'
  loop
    execute format('alter table public.prayer_campaigns drop constraint %I', c.conname);
  end loop;
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.prayer_campaigns'::regclass
       and conname = 'prayer_campaigns_intention_check'
  ) then
    alter table public.prayer_campaigns
      add constraint prayer_campaigns_intention_check
      check (intention in ('healing', 'comfort', 'guidance', 'persecuted', 'thanksgiving', 'departed', 'study', 'travel', 'other'));
  end if;

  for c in
    select con.conname
      from pg_constraint con
     where con.contype = 'c'
       and con.conrelid = 'public.prayer_campaigns'::regclass
       and pg_get_constraintdef(con.oid) ~ 'status'
       and pg_get_constraintdef(con.oid) ~ 'removed'
       and pg_get_constraintdef(con.oid) !~ 'held'
  loop
    execute format('alter table public.prayer_campaigns drop constraint %I', c.conname);
  end loop;
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.prayer_campaigns'::regclass
       and conname = 'prayer_campaigns_status_check'
  ) then
    alter table public.prayer_campaigns
      add constraint prayer_campaigns_status_check
      check (status in ('held', 'active', 'answered', 'memory_eternal', 'ended', 'removed'));
  end if;
end $$;

-- 2. What a campaign carries ----------------------------------------------
alter table public.prayer_campaigns
  -- More than the one line of `note`: what the creator asks prayers for.
  add column if not exists details text,
  -- Its length, set by the creator: 1 to 40 days, on the creator's own
  -- calendar. ends_at (20260713000300) stays as the moment the server treats
  -- it as over, noon UTC of the day after ends_on, when that day has ended
  -- everywhere.
  add column if not exists days smallint,
  add column if not exists starts_on date,
  add column if not exists ends_on date,
  -- The prayer it places in a reader's prayers: a prayer of the prayer book
  -- by its rule and its own id (lib/prayers/rules.ts), whose words are read
  -- from the book's own files and never copied here. prayer_key (July) named
  -- lines Purify wrote; it stays for the old rows and is not written again.
  add column if not exists prayer_rule text,
  add column if not exists prayer_id text,
  -- A coarse place, only if the creator gives one: a country and a city or
  -- region by name. Never coordinates.
  add column if not exists place_country text,
  add column if not exists place_name text,
  -- Who can see it: everyone in Community, or one circle (a parish, a
  -- household, friends: prayer_campaign_groups, which Read together shares).
  add column if not exists audience text not null default 'public',
  add column if not exists circle_id uuid,
  add column if not exists comments_open boolean not null default true,
  -- Whether it may stand in a list ordered by how many carry it (later, and
  -- only on Edgar's word), and whether it stays on the creator's profile
  -- once it has ended.
  add column if not exists listed boolean not null default true,
  add column if not exists keep_after_end boolean not null default false,
  -- The creator as Community shows them, kept on the row as a post keeps its
  -- author_name, so a read never has to carry creator_id to a browser.
  add column if not exists creator_name text,
  add column if not exists creator_handle text,
  -- What the creator affirmed, and when: their own request, the person's
  -- blessing, a parent or guardian, or the family of the departed.
  add column if not exists consent_kind text,
  add column if not exists consent_at timestamptz,
  -- Moderation, as a post has it.
  add column if not exists held_reason text,
  add column if not exists mod_cleared_at timestamptz,
  add column if not exists removed_reason text,
  add column if not exists removed_by_email text,
  add column if not exists ended_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'prayer_campaigns_details_len') then
    alter table public.prayer_campaigns add constraint prayer_campaigns_details_len
      check (details is null or char_length(details) <= 2000);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'prayer_campaigns_days_range') then
    alter table public.prayer_campaigns add constraint prayer_campaigns_days_range
      check (days is null or days between 1 and 40);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'prayer_campaigns_days_order') then
    alter table public.prayer_campaigns add constraint prayer_campaigns_days_order
      check (starts_on is null or ends_on is null or ends_on >= starts_on);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'prayer_campaigns_prayer_ref') then
    alter table public.prayer_campaigns add constraint prayer_campaigns_prayer_ref
      check (
        -- Both or neither. Said this way because a check passes on NULL:
        -- "rule ~ x and id ~ x" is NULL, not false, when one of them is missing.
        (prayer_rule is null) = (prayer_id is null)
        and (prayer_rule is null or prayer_rule ~ '^[a-z0-9-]{1,80}$')
        and (prayer_id is null or prayer_id ~ '^[a-z0-9-]{1,80}$')
      );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'prayer_campaigns_place_shape') then
    alter table public.prayer_campaigns add constraint prayer_campaigns_place_shape
      check (
        (place_country is null or place_country ~ '^[A-Z]{2}$')
        and (place_name is null or char_length(place_name) between 2 and 60)
        and (place_name is null or place_country is not null)
      );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'prayer_campaigns_audience_check') then
    alter table public.prayer_campaigns add constraint prayer_campaigns_audience_check
      check (audience in ('public', 'circle') and ((audience = 'circle') = (circle_id is not null)));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'prayer_campaigns_consent_check') then
    alter table public.prayer_campaigns add constraint prayer_campaigns_consent_check
      check (consent_kind is null or consent_kind in ('self', 'blessing', 'guardian', 'family'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'prayer_campaigns_names_len') then
    alter table public.prayer_campaigns add constraint prayer_campaigns_names_len
      check (
        (creator_name is null or char_length(creator_name) <= 80)
        and (creator_handle is null or char_length(creator_handle) <= 40)
        and (held_reason is null or char_length(held_reason) <= 300)
        and (removed_reason is null or char_length(removed_reason) <= 300)
      );
  end if;
  -- A circle that is deleted takes its campaign's audience with it: the
  -- campaign is then nobody's to see until its creator chooses again, so the
  -- row is removed with the circle rather than turned public by a default.
  if not exists (select 1 from pg_constraint where conname = 'prayer_campaigns_circle_id_fkey') then
    alter table public.prayer_campaigns add constraint prayer_campaigns_circle_id_fkey
      foreign key (circle_id) references public.prayer_campaign_groups (id) on delete cascade;
  end if;
end $$;

-- The board reads what is active, soonest to end last; a circle reads its own.
create index if not exists prayer_campaigns_board_idx
  on public.prayer_campaigns (status, created_at desc)
  where audience = 'public';
create index if not exists prayer_campaigns_circle_idx
  on public.prayer_campaigns (circle_id, created_at desc)
  where circle_id is not null;
create index if not exists prayer_campaigns_ending_idx
  on public.prayer_campaigns (ends_at)
  where status = 'active' and ends_at is not null;

-- 3. No reading it straight from the table --------------------------------
--
-- July's policy let anyone holding the public key read every campaign that
-- was not removed, whole: creator_id (the account's id, which
-- 20260802000100_revoke_public_user_id.sql names as owed), the counters the
-- 2026-08-22 rule says are never shown, and now a held campaign and one kept
-- to a circle. RLS is by row, not by column, so the policy goes and every
-- read is a route's (app/api/campaigns), with the service role and a list of
-- columns that leaves those out, as Community's posts are read.
drop policy if exists "prayer_campaigns_public_select" on public.prayer_campaigns;
revoke all on public.prayer_campaigns from anon, authenticated;
grant all on public.prayer_campaigns to service_role;

-- 4. Joining: where it goes in a reader's prayers, and until when ----------
alter table public.prayer_campaign_prayers
  -- The prayers that carry it, as lib/prayers/commemoration.ts names them.
  add column if not exists places text[],
  -- The reader's own last day when it is sooner than the campaign's.
  add column if not exists until_on date,
  -- Asked for by the reader, never on by joining: a notification when the
  -- creator posts an update.
  add column if not exists notify_updates boolean not null default false;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'prayer_campaign_prayers_places_known') then
    alter table public.prayer_campaign_prayers add constraint prayer_campaign_prayers_places_known
      check (places is null or (
        cardinality(places) between 1 and 6
        and places <@ array['morning', 'midday', 'evening', 'hours', 'compline', 'mine']::text[]
      ));
  end if;
end $$;

create index if not exists prayer_campaign_prayers_notify_idx
  on public.prayer_campaign_prayers (campaign_id)
  where notify_updates = true;

-- 5. Reports: of a campaign or one of its pictures, each once, with a state -
alter table public.prayer_campaign_reports
  add column if not exists target_kind text not null default 'campaign',
  add column if not exists target_id uuid,
  add column if not exists reason_code text,
  add column if not exists status text not null default 'open',
  add column if not exists closed_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'prayer_campaign_reports_shape') then
    alter table public.prayer_campaign_reports add constraint prayer_campaign_reports_shape
      check (
        target_kind in ('campaign', 'picture')
        and ((target_kind = 'campaign') = (target_id is null))
        and status in ('open', 'actioned', 'dismissed')
        and (reason_code is null or reason_code in ('about_me', 'private_details', 'money', 'unkind', 'not_prayer', 'picture', 'other'))
      );
  end if;
end $$;

-- Until now the same reader could report the same campaign any number of
-- times. All but each reader's first open report are closed (not deleted)
-- before the index that holds them to one.
update public.prayer_campaign_reports r
   set status = 'dismissed', closed_at = now()
 where r.status = 'open'
   and r.reporter_id is not null
   and exists (
     select 1 from public.prayer_campaign_reports o
      where o.campaign_id = r.campaign_id
        and o.reporter_id = r.reporter_id
        and o.status = 'open'
        and coalesce(o.target_id, o.campaign_id) = coalesce(r.target_id, r.campaign_id)
        and (o.created_at, o.id) < (r.created_at, r.id)
   );

create unique index if not exists prayer_campaign_reports_once_idx
  on public.prayer_campaign_reports (campaign_id, reporter_id, coalesce(target_id, campaign_id))
  where status = 'open' and reporter_id is not null;

revoke all on public.prayer_campaign_reports from anon, authenticated;
grant all on public.prayer_campaign_reports to service_role;

-- 6. The moderators' log may name a campaign or a picture -------------------
--
-- community_mod_log (20261005000000) lists what a line may be about. Found
-- by what it says, as above.
do $$
declare
  c record;
begin
  for c in
    select con.conname
      from pg_constraint con
     where con.contype = 'c'
       and con.conrelid = 'public.community_mod_log'::regclass
       and pg_get_constraintdef(con.oid) ~ 'target_kind'
       and pg_get_constraintdef(con.oid) !~ 'campaign'
  loop
    execute format('alter table public.community_mod_log drop constraint %I', c.conname);
  end loop;
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.community_mod_log'::regclass
       and conname = 'community_mod_log_target_kind_check'
  ) then
    alter table public.community_mod_log
      add constraint community_mod_log_target_kind_check
      check (target_kind is null or target_kind in ('post', 'reply', 'profile', 'report', 'hold', 'term', 'clergy', 'campaign', 'picture'));
  end if;
end $$;
