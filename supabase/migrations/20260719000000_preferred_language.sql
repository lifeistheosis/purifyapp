-- Beta 2.3 language patch: cross-device language preference.
--
-- The purify_locale cookie (web) and Capacitor Preferences (native)
-- stay the rendering source of truth. This column exists so (a) push
-- notifications and email can localize per recipient and (b) a fresh
-- device can adopt the user's language on sign-in.
--
-- App code ships resilient to this column being absent (writes are
-- best-effort and errors ignored), so applying it only lights the
-- feature up; nothing breaks before or after.

alter table public.profiles
  add column if not exists preferred_language text
  check (preferred_language is null or char_length(preferred_language) <= 8);

comment on column public.profiles.preferred_language is
  'BCP-47 locale code chosen in-app; used for push/email localization and cross-device sync.';
