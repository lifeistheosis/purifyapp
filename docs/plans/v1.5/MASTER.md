# v1.5 programme: every step, in order

Owner: Edgar. Written 2026-10-02 from that day's 1.5 talk, on top of the 1.5
scope opened 2026-09-27 and the User Enhancement Patch (2026-09-29). One list,
so nothing is in two heads. Each numbered step is one PR or one owner action.
Tiers as in 1.4: 🤫 silent (admin, no note), 📝 soft (readers see it, gets a
note), 🚀 hard (the 1.5 drop: versions, CI, store builds).

## 2026-10-04: 1.5 is cut today

The owner called the release on 2026-10-04 ("finalize v1.5"), a month ahead
of step 30's Nov 3 to 5, with what is live. `RELEASE.md` in this folder is
the checklist for it, and `since-1.4.md` is what went in.

**In 1.5:** B (streaks, all of it but step 9's reminder line), Community
parts two and three, the word filter, and everything in `since-1.4.md`.

**Not in 1.5, so they ride the next build (1.6, or 1.5.1 if it is small):**
A1 to A3 (the iPhone push key, the reminder job, Gift Plus), C (October and
Nativity saints, the saint card, "Add a saint"), D (Top sort), E (the
translator), F (the Nativity Fast companion), G (the year in review), Plus
reading mode, the daily readings fix and the missing prayers.

**The date that did not move:** F is live on the web by Nov 12 and the apps
get it only in a store build approved before Nov 15. That build is no longer
1.5. Whatever carries F has to be submitted by Nov 5, as step 30 said of 1.5.

## Decided on 2026-10-02

- **In:** streaks with hidden saves, October saints with pages and icons, the
  saint card in Today in the Church, "Add a saint" on posts, a translator for
  Community posts, a Top sort, a Nativity Fast companion, a year in review,
  three switches.
- **Removed:** stars and awards, paid or free. Not to come back unless the
  owner raises them.
- **On hold:** points redeemable in the shop.
- **Declined:** paying to bump your own post up.
- **Still declined from 2026-09-27:** reply threading, the iOS widget, more
  chants and audio, Discord modes round 2.
- **Later, after 1.5:** icon prints made to order.

## Already in 1.5

- Onboarding, the motion rules and the Job walkthrough: live on the web, ride
  the 1.5 builds.
- Plus reading mode: next in the User Enhancement Patch.
- Daily readings fix, the full Paschal-cycle lectionary. The source and the
  Old Calendar question are the owner's.
- Missing prayers: 8 entries in `lib/prayers/rules.ts` still say planned.
  Verbatim public domain only.
- Email design: a working session with the owner, not drafted ahead.

## A. Switches (owner, this week)

1. **iPhone push key.** Admin, Push says Render's `APNS_KEY_P8` "cannot be
   read: it is 203 characters across 4 lines": a multi-line paste into a
   one-line field. The fix is the key file as one line of base64, which
   `lib/push/credentials.ts` already accepts. The owner pastes it; an agent
   may not type a key. Done when the iPhone row on Admin, Push is accepted by
   Apple. 🤫
2. **Prayer reminders.** Onboarding asks readers to turn reminders on, but
   `/api/cron/push-deliver` had run nowhere since 2026-09-26. Done in code on
   2026-10-04, with no Render change: the ten-minute hourly-goals call now
   carries the hour's reminders (`lib/push/deliver.ts`). The same day found
   that no browser had ever been able to subscribe (the web push key on
   Render had its own name pasted in front); the readers are forgiving now
   and a browser that had allowed reminders is subscribed on its next visit.
   It rides no build: the server sends to the apps already installed. 🤫
3. **Gift Plus.** Built, dark until Render has `STRIPE_GIFT_PLUS_PRICE_ID` and
   `GIFT_PLUS_DAYS`. The owner picks the price and the days and creates the
   Stripe price. On before December. 🤫, then 📝 once it is on.

## B. Streaks (first build)

The owner's brief: the streak is on your profile and says exactly how long
you have kept it; it is red, so it carries urgency; up to three hidden saves
catch a missed day with "It's okay. We got you this time.", and the reader is
never told the saves exist, so nobody learns to lean on them.

4. **One streak for all of Purify.** A day is kept when anything lands in the
   rhythm ledger (`prayer_completions`) for that civil day: a morning or
   evening rule, a strand on Today, a plan day, a walkthrough chapter. One mark
   is enough.
5. **Server truth.** Readers can write their own rows with the anon key, so the
   public number must not come from anything they write directly. Migration:
   a `streaks` row per reader (current, best, last kept day, saves banked,
   last save used, save seen), written only by a security-definer function; a
   trigger stamps `prayer_completions.completed_at` with the server clock; a
   mark counts only if it reached us within two days of its date, because
   offline phones sync late. The reader's own time zone decides "today".
6. **Hidden saves.** One to start. One more for every 7 kept days in a row, up
   to 3. A missed day uses one, automatically, and the saved day does not add
   to the count. Out of saves: the streak ends and the next kept day starts at
   1. The number of saves is never shown: not on the profile, not in
   settings, not in any API response a browser can read.
7. **The save moment.** The next open after a save was used: a movable sheet, a
   red flame relighting, "It's okay. We got you this time." and "Your 23-day
   streak is still going." Once per save. It never says how many saves remain
   or that there are any.
8. **Red wherever it shows.** The crimson token (already the accent in
   `MobileStatGrid`), a flame mark and the exact number, "23-day streak", on
   the Community profile card and hover card, the You screen and Today. The
   reader can hide it from their profile in the editor, like a badge; shown
   by default.
9. **Urgency, truthfully.** From 6 pm local, if today is not kept, the Today
   flame pulses red: "Keep your 23-day streak: one prayer or one chapter
   today." Never "you will lose it", because a hidden save may catch it. The
   pulse follows `data-motion`. With reminders on (step 2), the evening
   reminder adds a streak line from `lib/push/copy.ts`, worded without digits.
   That line waits for step 2: the reminder job runs nowhere yet, so it
   would be code nobody can see work.
10. **Streak badges.** 7, 40 and 100 days in a row. Earned once, kept for good,
    shown with the other badges.
11. **Retire the old rule.** The "no streak counters" notes in `YouMobile`,
    `ProfileStats` and `MobileTopTabs` go, and `docs/DECISIONS.md` records the
    owner's calls: 2026-09-28 "go all in on the streak system", 2026-10-02 this
    spec. 📝

Done when: a test reader keeps 3 days, misses 1, sees the save sheet once and
shows "4-day streak" in red on their public profile; a miss with no saves left
resets it; a reader cannot raise their own number with the anon key.

## C. Saints and the saint card

12. **October saints.** The calendar lists 58 October names, and a handful have
    a page or an icon. Every one gets a page, upcoming days first (Oct 3 on),
    Oct 1 and 2 last. Lives verbatim from public-domain sources with a
    citation. Where none exists, a short factual summary marked as Purify's,
    never passed off as a source. Icons public domain only, recorded in
    `lib/saints/iconRights.ts`, opened by eye before they ship (standing rule
    5); a plain cross card when none passes. 📝 as batches land.
13. **November 15 to January 6 saints.** The same, so the Nativity companion
    (F) has a card every day. Old Calendar readers see October's saints from
    Oct 14 to Nov 13, which step 12 covers.
14. **The saint card.** Icon, name, title, one line (verbatim from the life, or
    the calendar note) and "Read their life". One component for the feast
    thread, for posts, and for the companion.
15. **Today in the Church.** The @purify thread carries the principal saint's
    card and a real message: "Today we remember ...", the line from their
    life, then the invitation. With more than one saint, the first gets the
    card and the rest are named and linked. 📝
16. **"Add a saint" in the composer.** A movable sheet with search over every
    saint with a page; one saint per post; the post shows the card. Saint
    pages get "Discussed in Community", like Bible chapters. Migration:
    `community_posts.saint_slug`, checked against the registry on the server,
    indexed. Installed apps from before the 1.5 build show the post without
    the card. 📝

## D. Top sort

17. "Latest" stays the default, "Top" sits beside it. Top ranks the last 7 days
    by likes, Amen, Praying and Glory to God, minus dislikes, decayed by age.
    Pinned posts stay first. The prayer wall and Ask a Priest keep their own
    order: prayer requests are never ranked. 📝

## E. Translator

18. **Scope:** Community posts and replies, and Ask a Priest. Never Scripture,
    never the Fathers' or saints' texts, which stay verbatim, never a shared
    quote block, never the interface, which is already in 21 languages.
19. **How it reads:** the language is detected when a post is written, offline
    and free. "Translate" shows when it differs from the reader's language;
    after a tap, "Translated from Russian · See original". A setting turns on
    automatic translation.
20. **Quality:** an AI model with an Orthodox word list per language
    (Theotokos, Pascha, troparion, kontakion, Liturgy, hieromartyr and so on);
    names, @handles, links and verse references left as they are.
21. **Cost and safety:** translated once per post per language and kept; only
    visible posts; the word filter runs on the result; a monthly cap and a
    per-reader hourly limit, after which "Translation is resting". The privacy
    page names the provider.
22. **Owner:** an API key on Render, pasted by the owner. A few dollars a month
    at today's size. 📝

## F. Nativity Fast companion (hard date)

23. Nov 15 to Dec 24, or Nov 28 to Jan 6 on the Old Calendar, by the reader's
    reckoning. 40 days, free for everyone.
24. Each day: the day's readings, the saint card, one line from the Fathers
    (verbatim from the corpus, cited), and the day's fasting rule with a
    fast-day recipe from the Kitchen. Keeping the day keeps the streak.
25. A free seasonal plan on the plans engine (plans are otherwise Plus).
26. The way in: a Today card from Nov 8, the feast thread on day one, an email
    to opted-in readers inside the feast-email cadence, the evening reminder.
    The shop's Nativity band and Gift Plus carry December.
27. Live on the web by Nov 12. The apps get it only in the 1.5 builds, so those
    must be approved before Nov 15 (step 30). 📝

## G. Year in review

28. Dec 20 to Jan 15: days kept, best streak, chapters read, prayers, saints,
    plans finished, from what the account already syncs. Nothing new is
    tracked for it. Private until the reader taps Share, which makes an image
    with the numbers and the reader's name and nothing else. Web first, the
    apps with the build after 1.5. 📝

## H. Release

29. Patch notes for each soft push: from Purify to readers, leading with what
    they get.
30. The 1.5 builds: the six version identifiers, the Update Hierarchy
    checklist, Android and iOS builds once the owner says go for CI. Submit by
    Nov 5 so both stores approve before Nov 15. Whatever is not ready waits
    for 1.5.1. 🚀

## Later, not 1.5

- Icon prints made to order from the public-domain icons: a print partner, a
  resolution gate, rights per icon, a sample order the owner checks.
- Points in the shop, on hold.

## Order of work

| When | What |
|---|---|
| Now | A1 to A3 |
| Oct 3 to 9 | B, streaks |
| From Oct 3, rolling | C12, October saints, upcoming days first |
| Oct 6 to 12 | C14 to C16 (card, feast thread, Add a saint), then D |
| Oct 13 to 20 | E, once the key is on Render |
| Oct 20 to Nov 5 | C13, the Nov 15 to Jan 6 saints |
| Oct 27 to Nov 7 | F, on the web by Nov 12 |
| Nov 3 to 5 | 1.5 builds cut and submitted |
| Dec 1 to 15 | G, live Dec 20 |

Plus reading mode keeps its place in the User Enhancement Patch. Whatever of
it is ready by Nov 5 rides the builds.
