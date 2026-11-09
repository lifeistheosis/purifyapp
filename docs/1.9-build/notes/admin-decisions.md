# Admin panel: the decisions for 1.9 (2026-11-09)

From the Admin panel chat, for Edgar. These are the admin ideas that need his
answer before they are built (the arbiter's list, items A2, A4 to A7 and A10
to A12). Each has a recommendation. The ready ones are being built already:
A8, the Monday email, and A9, the list of saint icons to clear. A1, the queue
for shared journal pages, waits on the sharing SQL (PLAN.md, item 14), and A3,
the update card, comes last.

Answer with the number and a word: "A2 yes", "A4 code app", "A12 keep all,
carts to Orders".

## A2. Plus over time

**What:** keep a copy of every RevenueCat event (a purchase, a renewal, a
cancel, a failed charge) with its store, its price, and whether it was a free
trial or test money. Then the admin can show who joined and who left each
week, which trials became paying members, and what Plus brought in on each
day. Home's "Came in today" can include Plus bought on Google Play, and a
member in a free trial stops counting as paying.

**Needs:** one new table. The SQL is drafted:
`docs/1.9-build/sql/plus-events.sql` (it runs twice safely, keeps no card,
email or country, and clears the member's id when an account is deleted). And
one line on the privacy page: "When you buy or renew a membership, we keep a
record of it: which store, the price, and the dates. It is not linked to you
once you delete your account."

**Recommend:** yes. It is the one table that makes every Plus number real.

## A4. A second sign-in step for the admin

**What:** after signing in, the admin asks for a 6-digit code from an
authenticator app on his phone. Today one sign-in opens everything: refunds,
free Plus, and email or push to every reader.

**Options:** a code app (built into Supabase, free); a passkey (later); or not
now.

**Needs:** he turns on app codes in Supabase (Authentication, Multi-factor)
and scans one QR code with his phone. Then the admin and its API refuse a
session without the code.

**Recommend:** a code app, in 1.9.

## A5. Counts for what 1.9 adds

**What:** count, with no reader named, which Bibles are downloaded (by
language), which plans are begun and finished, how many journal pages are
written and shared, and which app version readers run.

**Needs:** a line on the privacy page, and the 1.9 letter lists it (as the
lock counts did). Draft line: "We count, without your name, which Bible
translations are downloaded, which reading plans are begun and finished, how
many journal pages are written and shared, and which version of the app is in
use." The Updates chat adds the counts in the app; the admin shows them.

**Recommend:** yes.

## A6. Clergy review, marked done

**What:** on the list of the 66 texts waiting for a priest, mark each one
reviewed: by whom, when, with a note.

**Needs:** who reviews (PLAN.md item 41), and one small table (drafted after
his yes).

**Recommend:** yes, once a reviewer is named. Until then the list stays as it
is.

## A7. Take a chant recording down in one tap

**What:** a switch per recording. Off takes it out of every app, and every
copy saved on a phone, within minutes, with no release. Today taking one down
needs a change to the website's code and a push.

**Needs:** his answer on chants offline (PLAN.md item 3), and one small table.

**Recommend:** yes, if chants can be kept offline in 1.9. If they cannot,
later.

## A10. Errors readers hit

**What:** one list in Services of the last day's failed requests and app
crashes: the page, the app version and the kind of device, never the reader.

**Needs:** one table, the apps sending their errors (the Updates chat), and a
privacy line: "When something fails, the app reports the page, the app version
and the kind of device, never who you are."

**Recommend:** yes. It is how a problem only real phones have gets seen the
day it starts.

## A11. What readers search for and do not find

**What:** count the searches that found nothing, so new content follows what
people look for.

**Needs:** a privacy line, and one table. A search can hold a name or a
prayer intention, so three limits: never who searched, kept 90 days, and
anything that looks like an email or a phone number dropped before it is kept.

**Recommend:** yes, with those three limits. If he would rather keep searches
entirely private, no.

## A12. The October choices, still on their defaults

From the support console and the rail (sheets r3-15 and r3-16, 2026-10-30),
each taken as drawn until he says:

1. A refund or a reship comes with 3 free months of Plus, the switch starting
   on. **Recommend: keep.**
2. He chooses refund or reship in the console, never the reader. **Recommend:
   keep.**
3. Our own steps and the carrier's link, no tracking service. **Recommend:
   keep.**
4. No Help screen in the apps. **Recommend: keep for 1.9.**
5. Live carts and abandoned checkouts sit under Users. **Recommend: move them
   to Orders,** where buying is handled.
