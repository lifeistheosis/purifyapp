-- v6.4 — store the user's calendar matrix preference
--
-- Two independent axes:
--   calendar_reckoning  : 'new' | 'old'         (Revised Julian vs Julian)
--   calendar_tradition  : 'ecumenical' | named jurisdiction
--
-- Both default to the ecumenical / Revised Julian baseline so existing
-- profiles behave identically to before the migration. The existing
-- client-side preference-sync glue (debounced 500ms push, on-mount
-- pull, established in v3.3) picks these columns up as soon as their
-- names are added to the PROFILE_PREFS allowlist on the client.
--
-- RLS: no new policies needed. The existing profiles_self_update
-- policy already lets the owner update their own row, and these are
-- self-update fields.
--
-- See lib/calendar/matrix.ts for the type that fronts these values.
-- See docs/prd/v6.4-community-feedback.md §4 for the architecture.

alter table public.profiles
  add column if not exists calendar_reckoning text not null default 'new',
  add column if not exists calendar_tradition text not null default 'ecumenical';

-- Soft enum guard so a typo on the client doesn't poison a row. The
-- list mirrors `CalendarReckoning` and `CalendarTradition` in
-- lib/calendar/matrix.ts. Adding a new tradition requires extending
-- both this constraint and the matrix registry; intentional friction.
alter table public.profiles
  drop constraint if exists profiles_calendar_reckoning_check;
alter table public.profiles
  add constraint profiles_calendar_reckoning_check
    check (calendar_reckoning in ('new', 'old'));

alter table public.profiles
  drop constraint if exists profiles_calendar_tradition_check;
alter table public.profiles
  add constraint profiles_calendar_tradition_check
    check (calendar_tradition in (
      'ecumenical',
      'moscow',
      'constantinople',
      'antiochian',
      'serbian',
      'rocor'
    ));
