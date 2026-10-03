-- Beta 3.0 — the reader's stated interests, kept with the account
--
-- `focus` is already collected today, in the onboarding flow ("what draws
-- you"), and stored ONLY in localStorage under `purify:focus`. So it dies on
-- reinstall, and a reader who signs in on a second device is treated as though
-- they had said nothing. These two columns are what make the answer outlive
-- the device.
--
-- `depth` is new and deliberately coarse. It decides register, not content:
-- the same saint, the same Father, the same verse, introduced either as
-- "who was St Mary of Egypt" or as "read Maximus on the Ambigua". Two values,
-- because a self-assessment with five rungs is one nobody answers honestly.
-- Null means unanswered, which is not the same as 'inquirer' and must stay
-- distinguishable from it.
--
-- Both are nullable with no default on purpose. A default would make every
-- pre-existing profile look as though it had answered.
--
-- RLS: no new policies. profiles_self_select / profiles_self_update from
-- 20260518 already scope reads and writes to the owner, and these are
-- self-service fields.
--
-- NOTE for whoever adds the next preference column: 20260527 added
-- calendar_reckoning and calendar_tradition and described a "client-side
-- preference-sync glue ... PROFILE_PREFS allowlist" that did not exist, so
-- both columns have sat unread ever since. That glue ships with this
-- migration (lib/profile/preferences.ts). Add a column here only together
-- with its entry in PROFILE_PREFS, or it will be the third orphan.

alter table public.profiles
  add column if not exists focus text[],
  add column if not exists depth text;

-- Soft enum guard, mirroring `Focus` in lib/onboarding/state.ts. Written as a
-- containment check rather than an enum type so adding a fifth interest is a
-- one-line change here instead of a type migration.
alter table public.profiles
  drop constraint if exists profiles_focus_check;
alter table public.profiles
  add constraint profiles_focus_check
    check (
      focus is null
      or focus <@ array['scripture', 'prayer', 'saints', 'calendar']::text[]
    );

alter table public.profiles
  drop constraint if exists profiles_depth_check;
alter table public.profiles
  add constraint profiles_depth_check
    check (depth is null or depth in ('inquirer', 'faithful'));
