-- Prayer campaigns, reworked, file four: the moment a creator accepted the
-- Terms of Service, kept with the campaign (1.9;
-- docs/1.9-build/notes/campaigns-fable.md, section 18).
--
-- NOT SIGNED YET, AND NOT APPLIED. It waits for a second chat's read (Admin)
-- and then for the owner's yes on its summary in plain words (he does not
-- read SQL: docs/1.9-build/HANDOFF.md). Until then it is not in
-- supabase/migrations, which a merge runs against production and which the
-- test web's database runs from the branch, each file once
-- (docs/1.9-build/HANDOFF.md); lib/campaigns/__tests__/closed.test.ts holds
-- it out of that folder.
--
-- His word, 2026-11-10 (docs/1.9-build/BRAINSTORM.md): "whenever they make a
-- prayer campaign, they accept to the terms of service so that it's like
-- their prayer campaigns are distinct from us."
--
-- Written to run twice: its one statement is "if not exists". Run twice on
-- 2026-11-10 on a scratch PostgreSQL 16 standing on the migrations folder as
-- it was that afternoon, files one to three among them: no error either
-- time; the first run adds the one column to the schema and nothing else,
-- and the schema after the second run is the schema after the first.
--
-- What it makes, in plain words:
--   prayer_campaigns.terms_accepted_at   One new column on the campaigns
--                                        table: the moment the creator
--                                        ticked "I agree to the Terms of
--                                        Service" when starting the campaign,
--                                        as the server's own clock had it.
--                                        Empty on July's campaigns, which
--                                        were started before the line
--                                        existed and run for nobody.
--
-- It changes no row and deletes nothing. It gives no right to anyone: since
-- file one the campaigns table answers the public key nothing, and this
-- column with it (checked on the scratch database with that key's role and
-- with a signed-in reader's: both are refused). It is read and written by
-- the campaigns' own routes, with the service role.
--
-- What a reader can reach once it has run: nothing new. Starting a campaign
-- writes it, and the route starts no campaign where it cannot
-- (lib/campaigns/server.ts).
--
-- Check after running, in the SQL editor. Read only, one row. Expected: 1,
-- false, and 0 on a database where no campaign has been started since.
--   select
--     (select count(*) from information_schema.columns
--       where table_schema = 'public' and table_name = 'prayer_campaigns'
--         and column_name = 'terms_accepted_at') as terms_column,
--     has_column_privilege('anon', 'public.prayer_campaigns', 'terms_accepted_at', 'select') as public_key_reads,
--     (select count(*) from public.prayer_campaigns
--       where terms_accepted_at is not null) as accepted_so_far;

set lock_timeout = '3s';
set statement_timeout = '120s';

-- When the creator accepted the Terms of Service, on starting the campaign.
-- Written by the route that asked, at the server's own time. No default: a
-- write that never asked records no acceptance.
alter table public.prayer_campaigns
  add column if not exists terms_accepted_at timestamptz;
