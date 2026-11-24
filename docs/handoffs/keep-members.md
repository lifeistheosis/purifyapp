# Baton: keep the members who are leaving, steps 3 and 4

From the chat of 2026-11-24 (session_01VuYTwbGuypFaiAN1DaWnZQ), at his "finish rec all". The plan is `docs/plans/keep-members.md`; read it first.

## Done and live (main)

- Step 1: "Set to end" leads Money, Subscriptions, Members (`components/admin/subscriptions/SetToEnd.tsx`): each member with renewal off, the store, the day it ends, RevenueCat's reason, Copy email; two notes for him to send from his own address (`noteFor`, `cardNoteFor`, tested in `lib/admin/__tests__/setToEnd.test.ts`). The members route (`app/api/admin/subscriptions/members/route.ts`) adds `auto_renew` and the newest kept CANCELLATION reason.
- Step 5 (on the branch, waiting for his "push" when this was written): the owner digest's `keep` (CANCELLATION and UNCANCELLATION events, last 30 days) and the line in `node scripts/owner-report.mjs`.
- Step 2 is his: Google Play's cancel survey in Play Console.

## Step 3: one question after a cancellation (about 3 hours)

- **When:** once per kept CANCELLATION event with reason UNSUBSCRIBE (not BILLING_ERROR, not his own or test accounts), through the house's lifecycle sending (`lib/email/lifecyclePlan.ts`, `lib/email/sendOnce.ts` for the lock, the existing unsubscribe and opt-outs). Never to a reader who opted out.
- **The email:** the house voice ("Edgar, the Purify Team"), no em dash, no offer. "Would you tell us why?" with four one-tap answers: too expensive, not using it, missing something, other; each a signed link (an HMAC on user id and event id, as `lib/email/retention/firstWeekAsk.ts` signs its link), landing on a small page that thanks them and offers one optional box for their own words.
- **The table:** a new migration, `cancel_answers` (user_id, event_id unique, answer, words, created_at), RLS on with no public policy, writes by the service role through the route only. Name it by AGENTS.md's rule (14 digits, sorts last), runnable twice. **Show him the SQL and get his sign-off before it reaches main**: merging a migration runs it on production.
- **The admin:** the tally under "Set to end" (answers this month, and their words).
- **Tests:** the signed link refuses a changed id; one email per cancellation; none to an opted-out reader.

## Step 4: one quiet line in the app (the next store build)

- **Where:** the native Plus page (`components/billing/PlusPaywall.tsx`), for an active member whose RevenueCat entitlement says it will not renew (`customerInfo.entitlements.active[...].willRenew === false`): "Your Plus ends on <day>. Keep it", which calls the page's own `onManage` (Customer Center, or `manageSubscriptionUrl()`).
- **Words:** a new i18n key in all 21 languages (the house's i18n tests hold every locale). No pop-up, no countdown, nothing that delays cancelling.
- **Before building:** a still from the export at 390 for his yes, `checkMock` passing, as CLAUDE.md requires. It ships only in a store build that passes the pre-build gate.

## His rules that bind this work

No discount or price change (his decision). No dark patterns. Plain words, no em dash. Every design justified, and his yes before it ships. Main only at his word.
