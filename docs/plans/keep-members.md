# Keep the members who are leaving

His word, 2026-11-24: "yes plan number 1", to the read: 5 of 17 paying members have turned auto-renew off (29%), and keeping three of them is worth more than any campaign. A draft for his yes. It serves Level 1 (`docs/plans/levels.md`).

## What already exists

- **Emails.** `lib/email/lifecyclePlan.ts`: "your Plus ends in three days" to a member with auto-renew off, "your Plus has ended", and one win-back later.
- **One reader at a time.** The reader card (`components/admin/tabs/ReaderCard.tsx`) says "ends <day>" for a member with auto-renew off.
- **The store's reason.** RevenueCat's CANCELLATION events carry a reason (unsubscribed, billing error, price increase, and others), kept in `plus_events` since 1.9.
- **Missing:** a list of everyone who is set to end, and any way to hear why in their own words.

## The plan, cheapest first

1. **The list, and his own note (today, about an hour).**
   - Money's Subscriptions, Members: a "Set to end" filter. Each row shows the reader's email, the store, the plan, the day it ends, and RevenueCat's reason where one is kept.
   - A short note in the house voice, drafted for him: a thank-you and one honest question ("Was something missing?"). No discount and no pressure. He sends it from his own address, so a reply reaches him.
2. **Google's own cancel survey (his step, free, now).**
   - Google Play asks every member who cancels why. The answers are in Play Console, under Monetize, Subscriptions, cancellation survey.
   - He reads them, or pastes them in a chat. Apple has no such survey.
3. **One question after a cancellation (about 3 hours).**
   - An email sent once per cancellation: "Would you tell us why?", with four one-tap answers (too expensive, not using it, missing something, other) and a box for words.
   - The answers are tallied in the admin.
   - It needs a small new table, so a migration, which needs his sign-off on the SQL.
   - It is a service message about the reader's own subscription, and it carries an unsubscribe link.
4. **One quiet line in the app (the next store build).**
   - For a member with auto-renew off, on their Plus page: "Your Plus ends on 12 Dec. Keep it", which opens the store's own subscription page.
   - No pop-up, no countdown.
5. **Measure it.**
   - The owner digest and the report gain the members set to end, and how many turned renewal back on (RevenueCat's UNCANCELLATION events).

## Rules

- **No discount or price change.** That is his decision on pricing. A save offer would be a separate plan for his yes.
- **No dark patterns.** Cancelling stays one tap in the store, and nothing hides or delays it.
- **Email only through the house's existing sending**, with its dedupe and its unsubscribe, never to a reader who has opted out.
- **His notes are his.** A chat drafts; he sends.

## Done when

- Fewer than one in ten paying members is set to end, a month.
- We know the top reason in readers' own words.
