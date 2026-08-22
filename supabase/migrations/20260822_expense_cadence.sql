-- Expense lines gain a billing cadence: one time, monthly, or yearly.
--
-- THE MODEL. monthly_cents keeps its exact current meaning, the NORMALIZED
-- monthly figure, and two new columns carry the truth behind it: cadence, and
-- amount_cents as the operator actually typed it.
--
-- The alternative was to reinterpret monthly_cents as "amount per period" and
-- normalize at read time. That was rejected because two totals sum this column
-- raw and consult nothing else on the row:
--   app/api/admin/sustainability/route.ts  monthlyExpenseCents
--   app/(app)/support/page.tsx             totalMonthlyExpense
-- Both are monthly by definition, so keeping monthly_cents normalized leaves
-- them correct with no edit. Reinterpreting it would make both wrong the moment
-- the first yearly row was saved, and there is no type safety to catch it: the
-- Supabase client here is untyped and every read already casts.
--
-- It also fails safe. Both reads use hand-written column lists, so a new column
-- is invisible until someone edits them. Forgetting to add cadence here means a
-- correct total with no cadence label. Forgetting it under the other model means
-- publishing a $780/yr licence as $780/mo with nothing saying otherwise.
--
-- 'once' rather than 'otp': OTP already means the Supabase one-time-password
-- flow in this codebase, in three comments and a doc title.

alter table public.expense_lines
  add column if not exists cadence text not null default 'monthly',
  add column if not exists amount_cents integer;

-- Backfill before any constraint is added. Every row written since May is
-- monthly by construction, because there was no other option, so the amount as
-- entered IS the monthly figure and nothing published changes by a cent.
update public.expense_lines
   set amount_cents = monthly_cents
 where amount_cents is null;

alter table public.expense_lines
  alter column amount_cents set default 0;

alter table public.expense_lines
  alter column amount_cents set not null;

-- Idempotent constraint adds. Postgres has no "add constraint if not exists",
-- so each one catches its own duplicate and moves on, which keeps this file
-- safe to run twice.
do $$ begin
  alter table public.expense_lines
    add constraint expense_lines_cadence_check
    check (cadence in ('once', 'monthly', 'yearly'));
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.expense_lines
    add constraint expense_lines_amount_nonneg
    check (amount_cents >= 0);
exception when duplicate_object then null;
end $$;

-- The integrity net. This is what makes a denormalized monthly_cents safe: the
-- database itself refuses a row whose normalized figure does not follow from
-- its cadence and amount. round(numeric) is immutable, so it is legal in a
-- check, and it rounds half away from zero exactly as JavaScript's Math.round
-- does for the non-negative values this column allows.
do $$ begin
  alter table public.expense_lines
    add constraint expense_lines_monthly_matches_cadence
    check (
      (cadence = 'once' and monthly_cents = 0)
      or (cadence = 'monthly' and monthly_cents = amount_cents)
      or (cadence = 'yearly' and monthly_cents = round(amount_cents::numeric / 12))
    );
exception when duplicate_object then null;
end $$;

-- Densify the sort ladder in the order the panel and /support already display,
-- so the new drag reorder starts from 0..n-1 with no collisions. sort_order has
-- always defaulted new rows to the ROW COUNT, which ties an existing value the
-- first time any row is deleted.
--
-- updated_at is deliberately left alone. /support publishes it as the date of
-- the numbers, and renumbering a ladder does not change what a reader reads.
with ranked as (
  select id,
         row_number() over (order by sort_order asc, id asc) - 1 as pos
    from public.expense_lines
)
update public.expense_lines e
   set sort_order = ranked.pos
  from ranked
 where ranked.id = e.id
   and e.sort_order is distinct from ranked.pos;
