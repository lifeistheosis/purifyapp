# 1.9: your steps, click by click

Everything here is something only you can do: a setting, a key, a store, live
data. Each step is one action. Under each item: what "done" looks like, and
what to send the arbiter.

Three rules for all of them:

- Never paste a key or a password into a chat, and never into a file in this
  repository (it is public). Keys go only where a step says: Render, GitHub
  secrets, RevenueCat, App Store Connect.
- If a screen looks different from a step, stop there and tell the arbiter
  what you see. Do not guess.
- "Send back" never includes a key. A yes, a number from a chart, or a red
  message is enough.

The order: **Now** (the company) as you start it, **Anytime** whenever
suits you. **The test web** when you are home (T1 to T10), and T11 at
payday. **Release day** waits until the arbiter says go.

---

## Now: move to the company

**The paperwork now, the stores after 1.9 is live** (the arbiter's
recommendation, for your word). C0 and C0b are paperwork: start them now.
C1 and C2 move the store accounts themselves: each waits until 1.9 is live
in that store, then C3 to C5 follow. Apple's and Google's own pages were
read on 2026-11-10 for these steps.

Four rules for this whole section:

- **Numbers stay out of chats and files.** Never post the EIN, the D-U-N-S
  number, an address or a phone number in a chat or in this repository. They
  go only into the vendors' own forms.
- **Never during a release.** Apple: once the change is asked for,
  developers on Apple's forums report that the account's membership is
  paused while Apple works on it (no new builds, no TestFlight, no updates),
  for anything from a day to months; Apple's own pages say nothing either
  way. So C1 starts only once 1.9 is live on the App Store. Google: its
  pages block no update to an app that is already on Play, and its 72-hour
  wait after the change is for new apps only. C2 still waits until 1.9 is
  live on Play, so that a request for documents cannot land in release week.
- **The company's name exactly as the IRS and D&B have it.** No "DBA", no
  trade name. Send the arbiter the exact form from the EIN letter (a comma
  before LLC, or not): the website's pages take it from one line.
- Where a step says **(from D&B's page; not opened directly)** or **(from
  Google's page; not opened directly)**, it comes from a help page as search
  results showed it, because that page could not be opened from here. If the
  screen differs, stop and tell the arbiter.

**What the change moves, and what it does not.** Both stores change the
account in place (C1, C2), so the app, its account and its keys stay where
they are. Apple's and Google's pages say little outright about an in-place
change; this is what follows from what they do say.

- **Readers, installs, ratings and reviews:** stay. It is the same app in
  the same account. Apple keeps the Team ID (Apple's developer support, on
  Apple's forum); Google keeps the account, whose ID only a transfer
  changes.
- **Subscriptions and subscribers:** stay with the app. Apple then asks for
  a new Paid Apps Agreement in the company's name (C1, afterwards). Google:
  ask Play support where payouts go (C2, step 5).
- **RevenueCat:** nothing to link again is expected. Its Google key lives in
  the Google Cloud project and in Play Console's users; Apple's in-app
  purchase key and API key belong to the team, whose ID stays. Its
  credential check confirms (C4).
- **Sign-in:** Google sign-in on Android is registered in the Google Cloud
  project with the fingerprint of the app's signing key, and neither
  changes. Sign in with Apple belongs to the team, whose ID stays.
- **Firebase and push:** a Firebase project is a Google Cloud project, apart
  from the Play account, so push keeps working.
- **What does change:** the seller name on both stores becomes the company.

### C0. FIRST: the address on the D-U-N-S record

Your word: the company record is right except its location address. Fix that
first, because:

- Apple takes the organization's details from the D-U-N-S record, and for an
  organization the App Store shows **the address on that record** to readers
  in the EU (the trader details the EU's Digital Services Act asks of anyone
  who sells, and Purify sells Plus).
- Google checks the organization against the same record, and shows a
  trader's address to EU readers too.
- So if the address on the record today is your home: switch the stores only
  after the new address is on the record.

At Dun & Bradstreet (from D&B's page; not opened directly):

1. dnb.com, **D-U-N-S Manager**, **Update My Company Information**.
2. Find the company.
3. Verify your identity, and give your role (owner).
4. Request the change of address. Updating is free.
5. Also there: if D&B lists the company as a sole proprietorship, attach the
   LLC's registration papers (Apple refuses a record that is not listed as
   a legal entity).

Apple's own route to the same update is an email form:
support.dnb.com/?CUST=APPLEDEV (Apple's D-U-N-S page links it).

D&B gives no time for its review. Once D&B has updated, Apple sees it within
two business days (Apple's page) and Google within five (Google's page).

Done: Apple's D-U-N-S lookup (developer.apple.com/support/D-U-N-S/, then the
lookup tool) shows the company at the new address.

The same corrected business address goes into `EMAIL_POSTAL_ADDRESS` (the
**Mail** step below), never a home.

Send back: "C0 asked" when sent, "C0 done" when Apple's lookup shows it.

### C0b. The papers, ready before C1 and C2 (anytime now)

Apple's and Google's pages ask for these. Gather them now, so neither switch
waits on paper:

1. The LLC's registration papers, with the name exactly as on the D&B
   record. Google asks that the two names match; Apple may ask for papers
   and sometimes wants them notarized.
2. The EIN letter.
3. The company's bank account (C3 needs it for both stores and Stripe).
4. purifyapp.net in Google Search Console under your Google account
   (search.google.com/search-console, **Add property**, the domain, then the
   DNS check it shows). C2's first step needs it, and it changes nothing on
   the website.
5. A work email on purifyapp.net that you read (Apple asks for one on the
   company's domain): support@purifyapp.net reaches you in Admin,
   **Messages**.
6. Your Apple membership's renewal date (developer.apple.com, **Membership
   details**). Apple refuses a change while a renewal is under way, so C1
   must not fall in that window.

Send back: "C0b done", or which paper is missing.

### C1. Apple: from Individual to Organization (after 1.9 is live on the App Store)

Before you start: 1.9 approved and live on the App Store; C0 and C0b done;
your membership not in its renewal window; you are the Account Holder and
the company's founder, with the authority to bind it.

Apple's page: developer.apple.com/help/account/membership/updating-your-account-information,
"Updating an individual membership to an organization membership".

1. developer.apple.com, sign in as the Account Holder.
2. Open that page and click **submit a request** (it opens
   developer.apple.com/contact/request/migrate-individual-account).
3. Give the company's legal name exactly as on the D-U-N-S record, the
   D-U-N-S number, the website (purifyapp.net) and your work email on that
   domain. Confirm you can bind the company.
4. Submit. Apple may email or call, and may ask for business documents,
   sometimes notarized (C0b).
5. Wait. While Apple works on it, plan on no iPhone build, TestFlight upload
   or update (developers' reports; Apple's pages give no time).
6. When it is done: App Store Connect, **Business**. If the **Paid Apps**
   agreement shows **Pending (New Legal Entity)** or **Pending (Update Legal
   Entity)**, sign it and add the company's tax form and bank account at
   once (C3). Until it is active, Apple takes no update to a paid app or its
   in-app purchases (Apple's page).

Apple's developer support said on Apple's forum, a week ago, that the Team
ID stays the same and readers are not affected.

Done: **Membership details** says Organization, with the company's name;
the Paid Apps agreement is active. On the App Store the seller becomes the
company.

Send back: "C1 asked", then "C1 done".

### C2. Google Play: from Personal to Organization, in place (after 1.9 is live on Play)

Google's page: support.google.com/googleplay/android-developer/answer/16260648,
"Convert a personal developer account to an organization account". Before
you start: 1.9 live on Play; C0 and C0b done; your account fully verified,
with no verification warning pending (Google's condition). The change is
one way: an organization account cannot go back to personal.

1. play.google.com/console, **Developer account**, **About you**.
2. **Website**: enter purifyapp.net and save. Click **Send verification
   request**. (Google verifies it through Search Console. If purifyapp.net is
   not in Search Console under your Google account yet, add it there first.)
3. Once the site shows as verified, and no other verification warning is
   pending, click **Change account type**.
4. Select or create an **organization payments profile**: the company's
   legal name, the D-U-N-S number, organization type, size and a business
   phone. Google may ask for documents, and answers by email. (A personal
   payments profile cannot become an organization one: this is a new
   profile.)
5. Before you link it: Play Console, **Help**, contact Play support, and
   ask: "After I change my account type, are my app's subscription payouts
   paid to the new organization payments profile?" Google's pages say a
   linked profile can never be unlinked, and that the profile used to check
   who you are may not be the one that is paid. Send the arbiter the answer.
6. Click **Link your payments profile to your developer account**, then
   **Confirm and save**.
7. Watch the status on **Account details**.

After it completes, Google asks you to wait at least 72 hours before
submitting any new app. That wait is not for updates to Purify (Google's
page).

If Play Console shows no **Change account type**: stop and tell the arbiter.
The other way is a new organization account ($25) and an app transfer.
Google moves the readers, ratings, reviews, statistics and subscriptions
with the app, and the signing key continues; it does not move old orders,
reports, promotions or test groups, and the Firebase link, the Google Cloud
project's owner and RevenueCat's access all have to be set again (C4). Do
not start that alone.

Done: **About you** says Organization; **Account details** shows the new
payments profile linked.

Send back: "C2 done".

### C3. Payouts, tax and Stripe

Steps 1 and 2 follow C1 and C2. Stripe's, 3 to 5, can be done any time
outside release week: Stripe may check the account again.

1. Apple: App Store Connect, **Business** (agreements, tax and banking). On
   the **Paid Apps** agreement: the company's tax form (W-9) with the EIN and
   the name exactly as the IRS has it, and the company's bank account.
2. Google: the new organization payments profile (from C2), at
   payments.google.com: the company's bank account and its W-9, in the IRS
   name.
3. Stripe: dashboard.stripe.com, **Test mode** OFF. **Settings**,
   **Business details** (or **Business**), **Business type**: **Company**.
   Add the EIN and the legal name exactly as the IRS has it. Stripe may ask
   for an updated W-9 and verify the account again, even if it was verified.
4. Stripe: **Settings**, **Bank accounts and currencies** (or **Payouts**):
   the company's bank account.
5. Stripe: **Settings**, **Business settings**, **Public details**: the
   public business name (Purify), and the **statement descriptor** readers
   see on their card statement (5 to 22 characters, for example PURIFY), and
   the shortened descriptor. Use the support email, support@purifyapp.net,
   as the public support email.

Done: Apple, Google and Stripe each show the company, its EIN on file, and
the company's bank account.

Send back: "C3 done" (and "Stripe asked to verify again" if it did).

### C4. Re-check afterwards

1. RevenueCat (app.revenuecat.com): open the Play Store app and the App
   Store app, and run each one's credential check. RevenueCat's pages do not
   cover an in-place change; nothing should need re-linking, and the check
   says if something does.
2. Only if Google went the transfer way (C2's fallback): RevenueCat's
   service account is invited again in the new account's **Users and
   permissions**, the Google Cloud project gains the new account as an
   owner, the Firebase link moves, and the notifications (Pub/Sub topic) are
   checked. The arbiter writes those steps.
3. Render, Supabase and GitHub: only if one of those accounts moves to the
   company. Then: the site still deploys (Render, **Events**), Services in
   Admin shows the heartbeat green, and the GitHub builds still run.
4. Admin, **Money**: the next renewals still arrive (the RevenueCat webhook
   address does not change).

Send back: "C4 done", or what failed.

### C5. The EU trader details (DSA)

What EU readers see on each store's page for Purify: the company's name,
address, phone and email. Use the business phone and support@purifyapp.net,
never personal ones.

Apple (Apple's page):

1. App Store Connect, **Business**, **Agreements**, **Compliance**,
   **Digital Services Act**, **Complete Compliance Requirements**.
2. Choose **This is a trader account.**
3. The address comes from the D-U-N-S record by itself (C0). Enter the phone
   and email; Apple sends each a code to confirm.
4. **Done**, **Next**, **Confirm**.
5. Then for the app: **App Information**, **App Store Regulations and
   Permits**, **Digital Services Act**, **Edit**.
6. If the address shown is wrong later: Apple says to contact it; others
   report a request from **Membership details** with documents worked.

Google (from Google's page; not opened directly):

1. Play Console, **Account details**, **About you**: the trader
   declaration. The address comes from the payments profile (C2), which
   follows D&B (C0).
2. Then for the app: **Policy and programs**, **App content**.

Google's notices give a deadline for existing accounts between November 2026
and 1 February 2027: do it with C2.

Send back: "C5 done".

### C6. The website's pages name the company

Already on the branch, for your OK on the words (the arbiter sends them): the
terms are between you and the company, the privacy page (English and German)
says the company runs Purify, the footer says "© 2026 Purify Orthodox LLC",
and list emails name the company with the postal address. Your part: send
the arbiter the exact name from the EIN letter, and say yes or no to the
words.

### C7. The two addresses, where readers and stores see them (10 minutes)

Your word: support@purifyapp.net for technical help, legal@purifyapp.net for
legal matters. You have already written to both and seen them arrive: that
test is done.

In the code, already on the branch: the terms (notices, the informal
dispute, the arbitration opt-out, copyright notices and Contact) and the
privacy page (English and German) give legal@; the FAQ, the shop's
questions, the seller notice, the akathists note, receipts and packing slips
give support@; your Gmail and team@purify.app are gone from every page.
From the 1.9 push, mail to legal@ shows in Admin, **Messages**, marked
**Legal**. Until then the website files only mail to support@, and mail to
legal@ stops in Resend.

The places outside the code:

1. Render: dashboard.render.com, the **purifyapp** web service,
   **Environment**. If `EMAIL_REPLY_TO` is there, delete it (**Save
   Changes**, **Save and deploy**). Left out, every email's Reply-To is
   support@. If it is not there, nothing to do.
2. Google Play: play.google.com/console, **Purify**, then type **Store
   settings** in the search box at the top. Under **Store listing contact
   details**: **Email address** support@purifyapp.net, **Website**
   https://purifyapp.net. **Save**.
3. Stripe: the public support email is support@purifyapp.net (C3, step 5).
4. Google's payments profile (C2) and Apple's banking contacts (C3): where
   a form asks for a customer or public support email, support@. A contact
   that only Google or Apple writes to can stay an inbox you read daily.
5. Apple: the 1.9 version page carries its Support URL and Copyright line
   (R5, step 7).
6. Anywhere a form asks for a legal, privacy or copyright contact:
   legal@purifyapp.net. The EU trader details (C5) ask for the support one.

Done: none of these shows your Gmail.

Send back: "C7 done".

---

## Anytime

### Android. Do notifications reach your phone? (5 minutes, once the panel's test is live)

Your word, 2026-11-10: "the notifications just still don't work on
Android. Though web notification pops up for me, but not the Android app
itself." The server's side reads right end to end (what it sends, the
channel, the permission, the Firebase file in every build), so the next
step is to see your own phone's row. The panel's test sends to your own
account and nobody else's, and says what Google answered. It goes live on
the website with your "push 77"; until then it is only on the branch.

On your Android phone:
1. Open Purify, signed in as the same account you use for the panel.
2. **You**, **Settings**, **Notifications**, **Turn on reminders**. Allow
   when Android asks. (If it says notifications are blocked: the phone's
   **Settings**, **Apps**, **Purify**, **Notifications**, on; then try
   again.)
3. In the phone's **Settings**, **Apps**, **Purify**: **Notifications** on,
   with every category under it on; **Battery**: **Unrestricted** (on a
   Samsung, also make sure Purify is not under **Sleeping apps** or **Deep
   sleeping apps**).
4. Go to the home screen, so Purify is not on screen.

On your computer:
5. purifyapp.net/admin?tab=drop, **Records** (beside the path),
   **Notifications sent**, the card **Your own devices**, **Send a test**.
6. Look at the phone, then at the card's Android row.

Send back what the Android row says, and whether the phone showed it:
- **Accepted by Google**, and the phone showed it: fixed.
- **Accepted by Google**, and nothing showed: the fault is on the phone.
  Send its make and Android version.
- **No longer there** or **Refused**: open Purify on the phone again (step
  1), then **Send again**.
- No Android row at all: step 2 did not reach your account. Send what the
  Notifications screen says under the button.

### 23. Do iPhone purchases reach your account? Done

Your word, 2026-11-10 about 18:05 UTC, after looking at Admin, **Money**,
**Subscriptions**, **By source**: "App Store: yes". iPhone purchases reach
your account and unlock Plus. Nothing more to do here.

### 53. RevenueCat's reading key on Render (10 minutes)

This turns Money's Plus figures from an estimate into what members paid.

In RevenueCat:

1. Open app.revenuecat.com and open the Purify project.
2. Click **Project settings** (bottom of the left menu).
3. Click **API keys**.
4. Click **+ New secret API key**.
5. Name it `Admin read`.
6. Version: **V2**.
7. Permissions: set **Charts & metrics** to **Overview: Read**. Leave
   everything else at no access.
8. Click **Generate** (or **Save**).
9. Copy the key. RevenueCat may show it only once.
10. Also copy the project's ID: it is on **Project settings**, and in the
    browser's address bar after `/projects/`.

In Render:

11. Open dashboard.render.com and click the **purifyapp** web service.
12. Click **Environment** in the left menu.
13. Click **+ Add Environment Variable**.
14. Key: `REVENUECAT_V2_API_KEY`. Value: paste the key from step 9.
15. Click **+ Add Environment Variable** again.
16. Key: `REVENUECAT_PROJECT_ID`. Value: paste the ID from step 10.
17. Click **Save Changes**, then choose **Save and deploy**.

Check it worked:

18. In Render, click **Events**. Wait for a new line saying the deploy is
    **live** (a few minutes).
19. Open purifyapp.net/admin, then **Money**, then the **Revenue** view.
20. The line under the figures should start **"Plus figures are real, from
    RevenueCat, as of"**. If it still says **"Plus is estimated here"**, wait
    two minutes and reload once.
21. Optional: **Money**, then **Subscriptions**: the card **Recurring revenue**
    now says **MRR (RevenueCat)**.

Done: step 20 shows "Plus figures are real, from RevenueCat".

Send back: "53 done" (or what step 20 says instead).

### 42. Stripe: the late-payment event (3 minutes)

The website's shop already handles a payment that clears after checkout (a
bank transfer, for example). Stripe has to be told to send that event.

1. Open dashboard.stripe.com. Make sure **Test mode** is OFF (you are in the
   live account).
2. Click **Developers** (bottom left), then **Webhooks**. (In the newer layout
   this opens **Workbench**, tab **Webhooks**.)
3. Click the endpoint whose address is
   **https://purifyapp.net/api/shop/stripe-webhook**.
4. Click **...** (top right), then **Edit destination** (older layout:
   **Update details**).
5. Under the events, click **Select events** (or **+ Add events**).
6. Search for `checkout.session.async_payment_succeeded` and tick it.
7. Leave every event already ticked as it is.
8. Click **Add events**, then **Save** (or **Update endpoint**).

Done: the endpoint's event list shows both `checkout.session.completed` and
`checkout.session.async_payment_succeeded`. Editing the events does not change
the signing secret, so Render needs nothing.

Send back: "42 done".

### 42b. Do any sellers or ambassadors have a Stripe account? (1 minute)

Stripe sends news about sellers' and ambassadors' own Stripe accounts (for
example when Stripe lets a seller take payments) only to a second endpoint
set to "connected accounts", with its own signing secret. Purify has only the
one endpoint today. Whether a second one is needed now depends on this:

1. purifyapp.net/admin, **Catalogue**, then **Marketplace**: is there any
   store besides EIKON with a Stripe line under it?
2. **Community**, then **Ambassadors**: does any ambassador have payouts set
   up?

Send back: "42b: none" or "42b: yes, N". If none, it waits until after 1.9.

### 67. One iPhone test build, nothing sent to Apple (5 minutes, then about 40 minutes of waiting)

It proves the iPhone app, with its home screen widget, builds and signs.

1. Open github.com/lifeistheosis/purifyapp.
2. Click **Actions**.
3. In the left list, click **iOS build (signed)**.
4. On the right, click **Run workflow**.
5. **Use workflow from**: pick the branch `ccr-07896cf2-bo0afd`.
6. **Bundle the local-first offline build**: leave it ticked.
7. **Upload to App Store Connect (TestFlight)**: UNTICK it.
8. Leave the build number box empty.
9. Click the green **Run workflow**.
10. Wait for the run to finish (about 40 minutes).

Done: the run has a green tick. The step **Upload to App Store Connect** shows
as skipped (grey). The release **Purify iOS (signed)** under **Releases** has a
new `.ipa`.

If it stops red at **Create the widgets provisioning profile**, Apple does not
know the widget yet. Do this once at developer.apple.com, **Certificates,
Identifiers & Profiles**, **Identifiers**, then run steps 4 to 10 again:

1. **+**, **App Groups**, Continue. Description `Purify`, identifier
   `group.net.purifyapp.purify`, Continue, **Register**.
2. Open the identifier `net.purifyapp.purify`, tick **App Groups**, click
   **Configure**, tick `group.net.purifyapp.purify`, Continue, **Save**.
   (Apple's warning about profiles is expected.)
3. **+**, **App IDs**, **App**, Continue. Description `Purify Widgets`,
   **Explicit** Bundle ID `net.purifyapp.purify.widgets`. Under
   Capabilities tick **App Groups** only. Continue, **Register**.
4. Open `net.purifyapp.purify.widgets`, **App Groups**, **Configure**, tick
   `group.net.purifyapp.purify`, Continue, **Save**.

Send back: "67 green", or the name of the step that went red.

### 70. The patch-notes pull, on your PC (10 minutes)

The apps carry the patch notes and the board message as files. This copies
what is live in Admin into those files. It needs the database's service key,
which only your PC has.

You need: Node 22 or newer (`node -v` shows it), and a file named `.env.local`
in your purifyapp folder with these two names in it:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

If the file is missing: Supabase dashboard, the Purify project, **Project
Settings**, **API**. The project URL is the first; the **service_role** key
(click **Reveal**) is the second. One line each: `NAME=value`. Git already
ignores `.env` files, so it is never committed.

In a terminal, in your purifyapp folder:

```
git fetch origin ccr-07896cf2-bo0afd
git checkout ccr-07896cf2-bo0afd
git pull origin ccr-07896cf2-bo0afd
npm ci
node scripts/patch-notes.mjs pull
node scripts/patch-notes.mjs pull --apply
git status
```

The first `pull` only shows what would change. `git status` should list
`data/changelog/entries.json`, `data/changelog/board.json`, or both. If it
lists nothing, the files already matched: you are done.

Otherwise:

```
git add data/changelog/entries.json data/changelog/board.json
git commit -m "Patch notes and board message pulled from Admin"
git pull --rebase origin ccr-07896cf2-bo0afd
git push origin ccr-07896cf2-bo0afd
```

Done: the push says `ccr-07896cf2-bo0afd -> ccr-07896cf2-bo0afd`, or
`git status` had nothing to commit.

Send back: "70 done" (or the last red line).

### 87. Plus on iPhone: done before 1.8 (found 2026-11-10)

Nothing to do. Found on 2026-11-10, from the apps themselves:

- The App Store lists four in-app purchases for Purify: Plus at $9.99 and
  $71.99, Pro at $19.99 and $199. Apple approved them.
- The iPhone build Apple has served since 3 November (1.8, built 1
  November) carries the iPhone purchase key and has the Plus switch on
  (`NEXT_PUBLIC_PLUS_ENFORCED_IOS` "true"): iPhone readers without Plus meet
  the lock and can buy Plus, as on Android.
- Leave that switch as it is (the arbiter's recommendation): the 1.9 iPhone
  build takes it as 1.8 did.

23 confirmed the purchases reach your account ("App Store: yes", 2026-11-10).
The steps this item held are in the repository's history (before 2026-11-10).

### Mail. The company's postal address for list email (5 minutes; before the 1.9 email)

The law (CAN-SPAM) asks every list email to carry a postal address, and
Purify refuses to send one without it (`lib/email/consent.ts`). So the 1.9
release email cannot go until this is set.

The address must be the company's mailing address: a PO box, a virtual
mailbox, or the registered agent's address. Never your home: every list
email prints it. Use the corrected business address (see "Now: move to the
company"), not the one the D-U-N-S record has today.

1. dashboard.render.com, the **purifyapp** web service, **Environment**.
2. **+ Add Environment Variable**.
3. Key: `EMAIL_POSTAL_ADDRESS`. Value: the address on one line, for
   example street or box, city, state, ZIP, country.
4. **Save Changes**, then **Save and deploy**.

Done: Admin, **Releases**, **Email**: a list send no longer says "Held:
list email needs EMAIL_POSTAL_ADDRESS".

Send back: "Mail done" (never the address).

### 56. Fix the website members filed as Google Play: WAIT for the arbiter's OK

Fable reviews this SQL first. Do not run it until the arbiter says so.

The SQL: `docs/1.9-build/sql/plus-source-relabel.sql`.

When the arbiter says go:

1. Supabase dashboard, the Purify project, **SQL Editor**, **New query**.
2. Paste only **Step 1** from the file (the first `select`). Click **Run**.
3. You get the members filed as Google Play: a list of user ids.
4. For each id: RevenueCat, **Customers**, paste the id in search, open it.
   Read the store on its subscription: **Play Store**, **Web Billing** (or
   Stripe), **Promotional**, or marked **Sandbox**.
5. Play Store: leave that member out.
6. In the file's Step 2, replace the example line with one line per member
   to change: the id, then `'stripe'` (Web Billing or Stripe), `'comp'`
   (Promotional) or `'test'` (Sandbox or Test Store). A comma between lines,
   none after the last.
7. Paste Step 2 (from `begin;` to `commit;`) into a new query. Click **Run**.

Done: it lists each member it changed. Run again, it changes nothing.

Send back: "56 done, N changed". Never the ids.

### Inboxes. Two test emails, so a notice cannot bounce (3 minutes)

**Done, on his word (2026-11-10 about 16:25 UTC):** "I ALREADY confirmed that those 2 emails works." Both support@purifyapp.net and legal@purifyapp.net receive mail; he had checked them when he set up Cloudflare's email (his word earlier that day: "I fixed the cloud flare for both email and web analytics"). Do not ask him again. The steps below stay for the record.

The terms send copyright and legal notices to legal@purifyapp.net, and help to
support@purifyapp.net. Nothing on record shows either one arriving yet, and an
address that bounces would cost Purify the protection the takedown address
gives.

1. From your own address, send a short email to support@purifyapp.net with
   the subject "Inbox test".
2. Within a minute it is a request in purifyapp.net/admin, **Messages**.
3. Send one to legal@purifyapp.net with the subject "Inbox test".
4. Today the website files only support@ as a request; legal@ joins it with
   1.9 (step R2b checks that). So for now look in Resend: **Emails**, the
   **Receiving** tab. The legal@ test is listed there.

Done: the support@ test is in Messages, and the legal@ test is in Resend's
Receiving list.

Send back: "Inboxes: both arrived", or which one did not. If one bounced back
to you, send the bounce's first lines (they hold no key).

---

## The test web: on Render's free size now, the $7 size at payday

Your word, 2026-11-10 ("rec yes to all"): yes to the test web, at payday, or
on Render's free size before then if it carries your walk. It does (Render's
own pages, checked the same day), so you do T1 to T10 on the free size when
you are home, and T11 at payday.

**What it is** (your word, 2026-11-10): a second, private website on Render
that runs the 1.9 branch with its own database, so a test build can try
everything that needs a website before release, as a reader will see it. The
main web, purifyapp.net, is not touched by any step here.

**What it costs:** nothing until payday. It starts on Render's free size,
which has the same memory as the $7 size and sleeps when nobody uses it, so
each walk starts by waking it (T10). On payday one change moves it to the $7
size, which never sleeps (T11). The database is a free Supabase project. App
test builds are free (the repository is public).

**What it never does,** whatever a setting says, because the code refuses it:
touch the main web's database, hold a live payment key, email anyone but you,
appear in a search engine, or be named in a store build.

**Order:** T1 to T6 once (about 30 minutes), T7 to T9 once (about 15
minutes), then T10 for every test build, and T11 on payday. Keep the test
web's address and its password to yourself, like any key: nothing should
link to it.

### T1. A free Supabase project for the test web (5 minutes, then a few minutes of waiting)

1. supabase.com, sign in. At the top left, open the organization menu.
2. If your Purify organization's plan says **Free**, stay in it. If it says
   **Pro**, click **New organization**, name it "Purify test", plan **Free**.
   (A project inside a Pro organization costs $10 a month; this way it costs
   nothing.)
3. **New project**. Name: **purify-test**. Database password: click
   **Generate a password** and keep it in your password manager only. Region:
   the same as the Purify project. **Create new project**.
4. Wait until it says the project is ready.
5. Look at its address at the top of the page. It must not contain
   `avbqyvjgcrucjwevwixt` (that is the live one). If it does, stop and tell
   the arbiter.

Done: a project named purify-test, ready, with an address of its own.

Send back: "T1 done". Never a key or the password.

### T2. Its GitHub link, so the branch's database changes reach it (3 minutes)

1. In purify-test: **Project Settings**, **Integrations**, **GitHub
   Integration**, **Authorize GitHub**, then **Authorize Supabase**.
2. Choose the repository **lifeistheosis/purifyapp**.
3. **Working directory**: leave it empty (the `supabase` folder is at the top
   of the repository).
4. **Production branch**: `ccr-07896cf2-bo0afd`.
5. Turn **Deploy to production** on. Leave **Automatic branching** off.
6. **Enable integration**.
7. If Supabase says the repository is already linked to another project, do
   not change the live project's link. Stop and tell the arbiter: there is
   another way.

The first run comes with the next push to the branch (there are several a
day). It builds the whole database from the repository, about a hundred
files, the last of which makes what the live database was once given by
hand.

Done: the integration page shows the repository and the branch. After the
next push, **Table Editor** lists tables (journal_entries among them).

Send back: "T2 done", and after the next push, "tables there" or what the
integration's page says.

### T3. The Render test web (10 minutes)

1. dashboard.render.com, **New**, **Web Service**, the **purifyapp**
   repository.
2. **Name**: purify-test plus a short word of your own (the name becomes its
   address, https://<name>.onrender.com, so a word nobody would guess is
   better).
3. **Branch**: `ccr-07896cf2-bo0afd`. **Region**: the same as purifyapp.
4. **Build Command** and **Start Command**: copy each exactly from the
   purifyapp service's **Settings** page.
5. **Compute plan** (until August, Render called it **Instance Type**):
   **Free**. It has the same memory as the $7 size, 512 MB, with less of a
   processor, and it sleeps after 15 minutes unused (Render's pages, read
   2026-11-10). Its builds run on the same build machine as purifyapp's.
6. Open **Advanced**. **Auto-Deploy**: **Off**. (It builds only when you press
   the button, so the branch's many pushes cost nothing.)
7. **Create Web Service**. If Render starts a first build straight away, let
   it fail: without its settings (T5) the test web refuses to start, by
   design.
8. Copy its address, shown under its name (https://....onrender.com).

Done: a second web service on the branch, Auto-Deploy off, and its address.

Send back: "T3 done". Not the address.

### T4. The test project's sign-in settings (8 minutes)

All in purify-test on supabase.com, under **Authentication**.

1. **URL Configuration**. **Site URL**: the test web's address (T3).
2. **Redirect URLs**: open the live Purify project's same page in another tab.
   Add each line it has to purify-test, with https://purifyapp.net replaced by
   the test web's address. Lines that start with anything else (the apps' own
   addresses) are copied as they are. **Save**.
3. **Sign In / Providers**, **Email**: on, with **Confirm email** on. Its
   emails come from Supabase's own sender, which only delivers to the
   project's team, that is you.
4. **Google**: on. **Client ID** and **Client Secret**: the same as the live
   project's Google provider (the secret is in Google Cloud Console,
   **Credentials**, that OAuth client). **Authorized Client IDs** (or "Client
   IDs"): the same list as the live project's. **Save**.
5. Apple: leave off for now (the iPhone comes later).
6. **Allow new users to sign up**: on, so you can walk signing up as a reader
   does. You may turn it off between walks: anyone who found the test app
   could otherwise make an account there. They could never reach the live
   database, money or anyone's email.

Done: the address, the redirect list, email and Google set.

Send back: "T4 done".

### T5. The test web's settings on Render, by name (10 minutes)

Render, the test web, **Environment**. Add each line. Values come from the
places named; never paste one into a chat.

The test web's own:

- `NEXT_PUBLIC_TEST_WEB`: `1`
- `NEXT_PUBLIC_SITE_URL`: the test web's address (T3)
- `NEXT_PUBLIC_SUPABASE_URL`: purify-test's **Project URL** (Supabase,
  **Project Settings**, **API**)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: purify-test's **anon public** key (same
  page)
- `SUPABASE_SERVICE_ROLE_KEY`: purify-test's **service_role** key (same page)
- `TEST_WEB_PASSWORD`: a long phrase of your own. The test web's pages ask
  for it.
- `ADMIN_EMAILS` and `OWNER_EMAILS`: the same as purifyapp's.

As release day will have them, copied from purifyapp's **Environment** page
with the same values:

- every setting whose name starts with `NEXT_PUBLIC_`, except the three above
  and `NEXT_PUBLIC_APPLE_SIGNIN_ENABLED` (leave that one out);
- `LICENSED_BIBLE`, `BIBLE_API_KEY`, `GIFT_PLUS_DAYS`,
  `SHOP_FLAT_SHIPPING_CENTS`, if purifyapp has them.

Never on the test web: `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` (test
mode ones come later, if you want to try the shop), `RESEND_API_KEY`,
`RESEND_WEBHOOK_SECRET`, `FCM_SERVICE_ACCOUNT_JSON`, anything starting
`APNS_`, `REVENUECAT_REST_API_KEY`, `REVENUECAT_V2_API_KEY`,
`REVENUECAT_PROJECT_ID`, `RENDER_API_KEY`, `BMC_ACCESS_TOKEN`, `ADMIN_MFA`,
`CRON_SECRET`.

**Save Changes** (not "Save and deploy" yet).

Done: the list saved.

Send back: "T5 done".

### T6. Google: one added line (3 minutes)

1. console.cloud.google.com, **APIs & Services**, **Credentials**.
2. Open the OAuth client of type **Web application** that the live project
   uses (its Client ID is the one in T4).
3. **Authorized redirect URIs**, **Add URI**: purify-test's address followed
   by `/auth/v1/callback` (it is shown in purify-test's Google provider page
   as the **Callback URL**; copy it from there).
4. **Save**. Nothing about purifyapp changes: this adds one line beside its
   own.

Done: the new line saved.

Send back: "T6 done".

### T7. The first deploy, and a look (5 minutes, plus the build)

1. Render, the test web, **Manual Deploy**, **Deploy latest commit**. It takes
   about as long as a purifyapp deploy.
2. If the log says "The test web will not start", the lines under it name
   the setting to fix. Fix it in **Environment** and deploy again.
3. When it says **Live**, open its address on your phone. It asks for a name
   and a password: any name, and the phrase from T5.
4. At the foot of the page: "1.9 · Test web". The browser tab ends "Purify
   test web".
5. Sign in with Google. Then open <the address>/admin: the admin opens for
   your account.

Done: the page, the mark, your sign-in and the admin.

If the test web's **Events** ever say it ran out of memory, tell the arbiter:
the free size cannot hold it, and it needs a bigger size, after payday.

Send back: "T7 done", or what you see.

### T8. Your Google account as a license tester (3 minutes)

So you can buy Plus in a test build without paying.

1. play.google.com/console, **Settings** (the left menu, at the account
   level), **License testing**.
2. Add the Google account you use on the phone. **Save changes**.
3. On the phone, be signed in to Google Play with that account only. Purchases
   can fail when two accounts are signed in.

A test purchase uses a test card and charges nothing. Its clock is fast: the
7-day trial lasts 3 minutes, a monthly plan renews every 5 minutes and a
yearly every 30, six times at most, then it ends.

Send back: "T8 done".

### T9. RevenueCat: a webhook for the test web (5 minutes)

So the test web knows when you bought Plus there.

1. RevenueCat, the Purify project, **Integrations**, **Webhooks**, add a new
   one.
2. Name: **Test web**. URL: the test web's address followed by
   `/api/billing/revenuecat`.
3. **Authorization header value**: a new phrase of your own, nothing before
   it (no "Bearer").
4. Environment: **Sandbox** only. **Save**.
5. Render, the test web, **Environment**: add `REVENUECAT_WEBHOOK_SECRET` with
   the same phrase. **Save and deploy**.

The live webhook is not touched. When it also hears a test purchase, it
writes nothing (the account does not exist on the live database) and
RevenueCat gives up after five tries.

Send back: "T9 done".

### T10. A test build, every time (5 minutes, plus about 10 of building)

The first time only: GitHub, the repository, **Settings**, **Secrets and
variables**, **Actions**, **New repository secret**, three times:

- `TEST_WEB_SUPABASE_URL`: purify-test's Project URL
- `TEST_WEB_SUPABASE_ANON_KEY`: purify-test's anon public key
- `TEST_WEB_SITE_URL`: the test web's address

(All three as secrets, so the address never shows in the build's log, which
anyone can read.)

Every time:

1. If the branch has changed since the last deploy: Render, the test web,
   **Manual Deploy**, **Deploy latest commit**, and wait for **Live**.
2. GitHub, **Actions**, **Android build**, **Run workflow**. Branch
   `ccr-07896cf2-bo0afd`, **local first** ticked, **website**: **test web**.
   **Run workflow**.
3. When it is green: the repository's **Releases**, **Purify Android (test
   web)**, download **purify-test-web.apk** on the phone.
4. Uninstall Purify from the phone first. (The test file is signed with your
   upload key and Play's copy with Google's; Android will not put one over
   the other.)
5. Until T11 (the free size): wake the test web first. Open its address in
   the phone's browser and wait until it asks for the password (up to a
   minute). Then go on. If you stop for more than 15 minutes, wake it again
   the same way.
6. Install the file. Open it, sign in fresh with an account on the test web,
   and keep **Testers mode** off.
7. Walk it as a reader would. Campaigns are open to every account there. Buy
   Plus with the test card (T8).
8. To go back to the store build: uninstall the test app, install Purify from
   Play.

What the test web cannot show, so these wait for the release candidate on
Play's internal testing (R5b): Play's own install and update, real money,
notifications (until push is set up for the test web), emails, real readers'
posts and counts (the test web starts empty), links opening in the app (they
open in the browser), and the stores' own pages. The iPhone comes later.

Send back: what you found, as you go.

### T11. On payday: the $7 size, so it never sleeps (2 minutes)

1. Render, the test web, **Compute**, **Edit**.
2. Choose the 512 MB size at $7 a month (Render's name for it: 0.5c-512mb;
   it was called Starter). **Save**.
3. Render deploys the test web again by itself. The new size starts with
   that deploy, with no time offline (Render's page).

Done: **Compute** shows the $7 size. From then on, T10's step 5 is not
needed.

Send back: "T11 done".

---

## Release day: NOT YET, the arbiter says when

Do these in order, on the day the arbiter names, and only after the arbiter
says go.

**How you sign a change to the database** (your word, 2026-11-10: "I don't
work with code so my take wouldn't be of value for code"). You are never
asked to read SQL. Before a file reaches you, a second chat runs it twice on
a copy of the database and reviews it. Then the arbiter sends you plain
words: what it changes, what a reader sees, and what could go wrong. Your yes
is on those words.

**Do not run a SQL file by hand unless the step says so.** A file run by hand
in another project still says "success" and changes nothing on the live
database; on 2026-11-10 one did exactly that.

### R0. Put the 1.9 note in your queue, then accept it

Filing the note needs the database's service key, which only your PC has
(the `.env.local` from 70; if you have not made it yet, do that part of 70
first). The arbiter confirms that morning that the note's file is final.

Your word, "ok to all ensure its all in v1.9" (2026-11-10): 1.9 also carries
prayer campaigns, the new onboarding and a new set of Plus themes. The note,
the board message and the email gain a line for each only once it is built
and switched on for readers (a note never claims what readers cannot open).
The arbiter confirms that morning which of the three are in.

On your PC, in a terminal, in your purifyapp folder:

```
git pull origin ccr-07896cf2-bo0afd
node scripts/patch-notes.mjs propose --file docs/plans/v1.9/patch-note-1.9.json
node scripts/patch-notes.mjs propose --file docs/plans/v1.9/patch-note-1.9.json --apply
```

The first `propose` only shows what it would file. The second files it.

Then in Admin:

1. purifyapp.net/admin, **Releases**, then **Patch notes**.
2. Read the 1.9 note. **Accept** it, or **Suggest** a change.
3. Your word: "change out all the stuff with the emails". The branch has
   already done it in the files the apps carry. The website reads its notes
   from the database, so one old line there needs the same change: open the
   **Alpha v6.5** note. In the line that starts "New SECURITY.md", change
   `security@purify.app` to `support@purifyapp.net`. **Save**. (purify.app is
   not our domain, so a report sent there goes to a stranger.)
4. If the list of board messages there shows **2026-W37** (8 September),
   change the address in its last line to `support@purifyapp.net` too.

Done: the 1.9 note shows as accepted. Until then the website does not show it.

### R0b. Sign the database changes, in plain words, before the push

Once you sign a change, it goes into `supabase/migrations/` and runs on the
live database by itself when `main` is pushed, so each needs your yes before
the push, not after. For each, the arbiter sends you what it changes, what a
reader sees and what could go wrong, after a second chat has reviewed the
SQL (above).

- Prayer campaigns, file one: signed 2026-11-10 ("R0b yes 1").
- Prayer campaigns, file two (a campaign's updates and comments) and file
  three (a campaign's pictures): reviewed by a second chat, the Admin chat,
  and signed 2026-11-10 by "All recommendations. Start.". In
  `supabase/migrations/` as `20261110135543_campaign_threads.sql` and
  `20261110135545_campaign_pictures.sql`. File three makes the pictures'
  table only: pictures stay switched off on the server until the image check
  and the lawyer.
- The florilegium's two new kinds (a council's words, a prayer's line):
  signed 2026-11-10 ("yes florilegium"), and in `supabase/migrations/` as
  `20261110090516_florilegium_kinds.sql`.

- The baseline, `20261110155643_production_baseline.sql`: signed
  2026-11-10 by "rec yes to all", where it was put to you as "yes baseline"
  after a second chat, the Updates chat, had read it again. It makes, on a
  new database (the test web's), the ten tables the live database was once
  given by hand, and on the live database it does nothing at all.
- Prayer campaigns, file four (whoever starts a campaign accepts the Terms):
  signed 2026-11-10 by "rec yes to all", which covered it once the Admin
  chat's second read passed; it passed the same day. In
  `supabase/migrations/` as `20261110172648_campaign_terms.sql`.
- The notice that tells a reader why something they posted was removed:
  signed 2026-11-10 by your "Yes to all recommended suggestions", after your
  read-only look at about 20:46 UTC showed the check
  `community_notifications_kind_check` and `none` beside `kinds_outside`
  (second read: the Updates chat). In `supabase/migrations/` as
  `20261110204814_removal_notices.sql`.

Do not run any of these by hand: the push runs them.

Every other 1.9 change to the database is signed. A change that comes later
waits for your yes in the same way.

### R0c. The new onboarding: your word, after you try it again

The new onboarding (the roads) is already switched on in the branch, on your
word of 2026-11-10: "I want to try everything as if it was public release."
So every test build shows it exactly as 1.9 would: a new reader meets the
new questions, the first week, the two cards on Today and the first test
(where a new reader is offered an account). A reader who answered the old
questions is greeted "We updated our onboarding" and asked the new ones once.
1.9 keeps all of it on unless you say otherwise after your walk:

1. Walk the newest test build as a new reader would: uninstall the old
   build first, and keep Testers mode off.
2. To walk the questions again: **Settings**, **Testers**, then **First
   open**. Nothing is counted or synced while you test. Leave Testers mode
   when you are done.

Send back: "roads on", or "roads off".

Two Plus tests ride with the roads, each on by your word: the one Plus card
on Today after a new reader's first week ("yes Plus card"), and the order
the Plus sheet opens in when a reader taps a lock, on its list or on that
feature working ("yes to all suggested", call 9).

On "roads on", the chat that pushes sets the days of all three tests again
in the release commit, together, in `lib/ab/tests.ts`:

- `ACCOUNT_PLACE` (where a new reader is offered an account): its first day
  becomes release day, its last day twelve weeks later (84 days).
- `PLUS_INTRODUCED` (the Plus card): the same two days.
- `PLUS_SHEET_ORDER` (the sheet's order): from the day after the card's
  last day, for 84 days. The two Plus tests never run on the same day.

Today they count from 10 November, when they were switched on for the test
builds. Unit tests refuse any other span and any day the two Plus tests
share; nothing but this step makes the first day release day.

On "roads off", one line changes in the release commit: `ROADS_LIVE` turns
to `false` in `lib/onboarding/flags.ts`. 1.9 then ships with the welcome
questions readers have today, nobody is asked again, and neither the first
test nor the Plus card runs, since both are for a reader with a road. The
sheet's order is not part of the onboarding and stays on.

Either Plus part can also be turned off alone, by your word: one line each
in `lib/onboarding/flags.ts`, `PLUS_INTRO_LIVE` (the card) or
`PLUS_ORDER_LIVE` (the sheet's order), turned to `false`. A test whose
switch is off runs on no day.

Either way the website goes before the apps (R2, then R4 and R5): the
tests' shares and counts are kept by the website, so it must be serving 1.9
before any phone asks it which version to show.

### R1. Two SQL pastes, just before the push

These two are the only files you run by hand, and only at this moment. In
Supabase, first check the project at the top is the live one: its address
holds `avbqyvjgcrucjwevwixt`.

The arbiter tells you the moment, and confirms both paths that morning. To
copy a file: open it on GitHub on the branch `ccr-07896cf2-bo0afd`, click
**Raw**, select all, copy. Run them in this order:

1. Supabase, **SQL Editor**, **New query**.
2. Paste all of `supabase/migrations/20261109180246_shared_pages.sql`.
   Click **Run**. It must say success.
   (It makes the table the next file also writes to. It is written to run
   twice, so the release running it again is harmless.)
3. **New query**. Paste all of
   `supabase/migrations/20261110001550_psalms_113_115_move.sql`.
   Click **Run**. It must say success.
   (It moves readers' notes, highlights and saved verses on Psalms 113 to
   115 to the new numbering, and leaves the mark the apps wait for before
   they move their own copies. It must run before any 1.9 app or website
   does; run twice, it does nothing.)
4. If either goes red: stop, change nothing else, send the arbiter the red
   message.

Send back: "R1 both green".

### R2. The push

1. Tell the arbiter **go**.
2. The chat checks everything once more and pushes `main`. That push is the
   deploy. It carries the terms' new date (your item 96): the terms say
   "Effective" today, and every reader is asked to accept them again at
   their next sign-in, checkout or EIKON claim. You do nothing for that.
   It also carries prayer campaigns at **testers**: live on the website for
   your account alone, with the SQL you signed in R0b. No reader sees them
   until R5c.
3. Render, the **purifyapp** service, **Events**: wait for **Deploy live**.
4. purifyapp.net/whats-new shows 1.9.

### R2b. Tell every account the terms changed (your item 96; 2 minutes)

Right after R2, the same day.

1. purifyapp.net/admin, **Releases**, **Email**.
2. The **Terms change notice** card shows **Terms** with today's date. If it
   still shows 2026-08-14, stop: the push did not carry the new terms. Tell
   the arbiter.
3. Click **Send to N accounts**. Read the box that opens, then confirm.
4. The first share goes at once; the rest go by themselves on the hour.
   Pressing Send again never sends anyone a second copy.
5. Write one short email from your own address to legal@purifyapp.net, and
   one to support@purifyapp.net. Within a minute both are in Admin,
   **Messages**, and the first is marked **Legal**.

Done: the card says "Terms <today>: N sent", and both test messages are in
Messages.

Send back: "R2b sent", or what went wrong.

### R3. Read the database check

1. github.com/lifeistheosis/purifyapp, **Commits** (on `main`).
2. The top commit (the push): click its tick or cross.
3. Find **Supabase Preview**.
   - **Success**: every 1.9 database change ran. Done.
   - **Failure**: open it. The summary names the error. Send it to the
     arbiter, then paste each 1.9 migration by hand (this step says so, and
     only on a Failure), in the order of its file name, in **SQL Editor**,
     in the live project, one at a time. Each is written to run
     twice, so one that already ran does no harm. The arbiter sends the
     final list that morning. Today, in `supabase/migrations/`:
     - `20261109180246_shared_pages.sql`
     - `20261110001550_psalms_113_115_move.sql`
     - `20261110002920_plus_events.sql`
     - `20261110002921_chant_pulls.sql`
     - `20261110002922_app_errors.sql`
     - `20261110002923_search_misses.sql`
     - `20261110012059_user_kept.sql`
     - `20261110084116_campaigns_rework.sql` (prayer campaigns, file one,
       signed 2026-11-10)
     - `20261110090516_florilegium_kinds.sql` (signed 2026-11-10)
     - `20261110135543_campaign_threads.sql` (prayer campaigns, file two,
       signed 2026-11-10)
     - `20261110135545_campaign_pictures.sql` (prayer campaigns, file three,
       signed 2026-11-10)
     - `20261110155643_production_baseline.sql` (signed 2026-11-10; on the
       live database it does nothing)
     - `20261110172648_campaign_terms.sql` (prayer campaigns, file four,
       signed 2026-11-10)

The order on the day (your word, 2026-11-10): the website first (R2), then
both store builds to internal testing (R4, R5), then your walk on a phone
(R5b), then campaigns open on the website (R5c), and only then do the stores
go public (R5d). With the roads on, the website has to go first for one
more reason (R0c).

### R4. Android: build, then Play Console's internal testing

1. GitHub, **Actions**, **Android build**, **Run workflow**.
2. **Use workflow from**: `main`.
3. **Bundle the local-first offline build**: ticked.
4. **Run workflow**. Wait for the green tick.
5. GitHub, **Releases**, **Purify Android (release)**: download
   `app-release.aab`.
6. play.google.com/console, **Purify**, **Test and release**, **Testing**,
   **Internal testing**.
7. **Create new release**.
8. Upload `app-release.aab`. Note the **version code** it shows.
9. Release notes: purifyapp.net/admin, **Releases**, the piece **What's new,
   for Google Play**, **Copy**, and paste. The arbiter confirms that morning that it is
   final.
10. **Next**, **Save**, then **Start rollout to Internal testing**. Install it
    on your phone from the testers' link.

Send back: "R4 internal, version code N".

### R5. iPhone: build, then TestFlight

1. GitHub, **Actions**, **iOS build (signed)**, **Run workflow**.
2. **Use workflow from**: `main`. Both boxes ticked (local-first, upload).
3. **Run workflow**. Wait for the green tick (about 40 minutes).
4. App Store Connect, **Apps**, **Purify**, **TestFlight**: wait until the new
   build is done processing (5 to 15 minutes). Note its **build number**.
   Install it on your iPhone from the TestFlight app.

Send back: "R5 in TestFlight, build N".

### R5a. A review account for Apple (10 minutes, at least a day before R5d)

Apple's reviewers sign in to see Community and prayer campaigns, so they need
an account of their own. Make it at least a day before you submit: Community
holds a post from an account younger than a day for a moderator, and a
reviewer should not meet that hold.

1. Choose an email address you control that is not your personal one (a new
   free mailbox is fine).
2. In the app, sign up with that address and a new password. Keep both in
   your password manager, and only there.
3. Open the confirmation email and confirm.
4. Sign in with it once on a phone. Give it a display name, and save a verse
   or write a journal page, so the reviewer does not meet empty screens.
   Leave it without Plus: Apple wants the reviewer to meet the whole
   purchase screen, and buys in its own test mode.
5. Nowhere else: not a chat, not a file. In R5d it goes into App Store
   Connect, and that is its only place.

Send back: "R5a done" (never the address or the password).

### R5b. Walk 1.9 on your phones, before any reader has it

On the internal Android build and the TestFlight build, as
`docs/PHONE-WALK.md` lays out, and with it:

1. Prayer campaigns: start one, join one, see it in your prayers.
2. The new onboarding: from a fresh install (or the Testers switch, "Preview
   as signed out"), each first question and the first card on Today.
3. Anything that looks wrong: a screenshot to the arbiter, and stop here.

Send back: "R5b walked", or what broke.

### R5c. Open prayer campaigns to every reader (one line; your word)

Only after R5b and your walk on the test web (T10), and once the two things
the Terms promise for campaigns are in the release: circles ("public unless
you keep it to a circle") and the removal notice with its SQL ("we tell you
why"). The words are already settled by you: items 113 and 129 ("we don't
need a priest or a lawyer to make prayer campaigns", 2026-11-10), the
Terms' words ("yes those terms are good") and the safety line's words
("rec yes to all").

1. Send the arbiter: "open campaigns".
2. A chat changes one line on `main`, `CAMPAIGNS_OPENING` from `"testers"`
   to `"open"` in `lib/campaigns/flags.ts`, and pushes. Render, **Events**:
   **Deploy live**, and every reader has campaigns on the website. The store
   builds you walked ask the website, so they follow it with no new build.

Do this before R5d. Apple's rule 2.5.19 (its page, read 2026-11-10): "Don't
include any hidden, dormant, or undocumented features in your app"; hiding
one is grounds for removing the app and closing the developer account. A
build reviewed while campaigns are still at testers carries them asleep. If
circles or the removal notice is not ready when the stores go, you choose:

- hold the stores until it is (the safe choice), or
- send the builds now, and say in R5d's notes for review that campaigns are
  in the build and switched off.

Pictures on campaigns are the one part still off. The store builds carry
them only if your three steps are done before the builds are cut; otherwise
an app has no picture and no picture control at all, whatever the website
says, and turning them on in the apps takes a new build, which Apple
reviews. "Prayed by many" is on, by your word, and ships live.

Send back: "R5c open", or "R5c wait, hold the stores", or "R5c wait, send
with notes".

### R5d. The stores go public

Only after R5b, and after R5c (or your "send with notes").

**The age ratings, first** (Apple's and Google's own pages, read
2026-11-10). The questionnaires were last answered before Community and
prayer campaigns, when nothing readers wrote could be seen by others. Both
stores ask for honest answers, and Google may remove an app whose answers are
wrong. Answer only the questions below differently; everything else stays as
it is.

Your word, 2026-11-10 ("all recs for 6"): violence is answered "infrequent
or mild", for the martyrdoms the saints' lives tell; Play's audience stays 13
and over; campaign pictures are on at submission only if your three steps
are done, and otherwise left out of the store builds (one line in the
release commit, `PICTURES_IN_STORE_BUILDS` in `lib/campaigns/flags.ts`; the
arbiter says which that morning); Australia's law gets a
lawyer's look after 1.9, and nothing waits on it.

Google Play:
1. Play Console, **Purify**, **Policy and programs** (under **Monitor and
   improve**), **App content**, **Content rating**, **Start new
   questionnaire** (or **Edit**). Keep the email and the category already
   there.
2. Where it asks whether users can interact or share content with one
   another: **Yes** (public posts, replies, prayer campaigns and their
   comments, profile photos). Where it asks about buying digital goods:
   **Yes** (Plus and Pro). Where it asks about violence: the answer for
   violence that is mild or infrequent (the martyrdoms in the saints'
   lives, told in words). Every other answer as before.
3. **Save**, **Next**: Google shows the ratings it worked out, with a notice
   that users interact. The violence answer may raise the age a step in
   some countries; Germany may show 12. Then **Submit**.
4. Still in **App content**: **Target audience and content**, **Manage**.
   Only ages 13 and over ticked (nothing under 13). **Save**. (Under 13
   would bring Google's rules for children's social features.)
5. Still in **App content**: the declaration for **foreground services**.
   Google's own page (read 2026-11-10): apps for Android 14 and up "need to
   declare any foreground service types that you use in a new declaration on
   the App content page". Purify has one type, media playback: it keeps a
   chant, a chapter read aloud or ambience playing with the phone locked
   (`FOREGROUND_SERVICE_MEDIA_PLAYBACK` in the manifest,
   `lib/player/lockScreen.ts`). 1.8 went to Play with it, so it may be done
   already: if the card shows it complete, with **Media playback** in it,
   leave it and go to step 6. If it asks, fill it in:
   - **Type**: Media playback. **Use case**: Media Playback ("Continue audio
     or video playback from the background, including streaming").
   - **What it does** (paste): "Purify plays chants, Scripture read aloud
     and ambience that the reader starts by tapping Play. A media playback
     service keeps the audio going when the reader leaves the app or locks
     the phone, and shows the player in the notification shade and on the
     lock screen, with play and pause. It runs only while something is
     playing or paused, and stops when the reader stops it."
   - **If the system delays it** (paste): "The reader taps Play and hears
     nothing, so the chant or reading they chose does not start."
   - **If the system stops it** (paste): "The chant or reading stops part
     way through when the reader leaves the app or locks the phone, and its
     controls leave the lock screen."
   - **Video link**: about thirty seconds, recorded on the phone with its
     sound, from the 1.9 build: open a chant, tap Play, go to the home
     screen, pull down the notification shade to show the player, lock the
     phone and show the player on the lock screen, then pause and play from
     there. Google asks that it show "the steps the user needs to take in
     your app in order to trigger the feature", with playback started by
     the user. Google's page does not say where the video lives: put it on
     YouTube as **Unlisted**, so its reviewers can open the link without
     signing in, and paste the link.
   - Record it on a build with the Updates 2 chat's mend of the player
     (2026-11-10: the player in the shade starts at once, the cover last),
     so the shade shows it. **Save**.
6. **Internal testing**, the 1.9 release, **Promote release**,
   **Production**.
7. **Next**, **Save**, then **Send for review** (or **Start rollout**).

App Store:
0. **App Information** (left, under **General**), **Edit** at the top of the
   page, the age rating questions:
   - **User-Generated Content**: **Yes**.
   - **Messaging and Chat**: **Yes** (Apple counts public posts and replies).
   - **Social Media**: **Yes** (Community is a feed where readers reply to
     and react to one another's posts). This sets 13+.
   - **Social Media Disabled for Users Under 13**: **No** (Apple allows that
     answer only for an app that checks a reader's age through its own
     service, which Purify does not do).
   - **Advertising**, **Parental Controls**, **Age Assurance**,
     **Unrestricted Web Access**: **No**.
   - **Shared Location** and **Dating and Relationships** (new from 16
     November): **No**.
   - **Realistic Violence**: **Infrequent/Mild** (the martyrdoms in the
     saints' lives, told in words; your word).
   - Every other content question as before. **Save**. App Store Connect
     shows the rating it worked out: expect **13+** (16+ in Australia, and
     higher in a few other countries). It goes out with 1.9.
1. **App Store** tab, the **1.9** version (click **+** next to iOS App to make
   it, if needed).
2. **Build**: **Add Build**, pick the one you walked in R5b.
3. **What's New in This Version**: purifyapp.net/admin, **Releases**, the
   piece **What's New in This Version, for the App Store**, **Copy**, and
   paste (it marks what is in Purify Plus, as the Play text does). On the
   same page: **Support URL** https://purifyapp.net/support, and
   **Copyright** 2026 Purify Orthodox LLC.
4. **App Review Information**, on the same page:
   - **Sign-in required**: ticked. **User name** and **Password**: the
     review account from R5a, from your password manager.
   - **Contact Information**: an email you read on review days (support@
     lands in Admin, **Messages**).
   - **Notes**: the arbiter sends you the notes that morning, after checking
     them against this build (they are part B of
     `docs/app-store-review-notes.md`, and nothing else is sent to Apple).
     Paste them, and fill the last line with the phone you walked in R5b
     and its iOS version.
5. **Add for Review**, then **Submit for Review**. (The subscriptions are
   approved already, so nothing is added under **In-App Purchases and
   Subscriptions**.)

Send back: "R5d Play sent, App Store submitted".

### R6. Tell installed apps, once each store serves 1.9

Only after a store is actually serving the new build (Play: the release says
**Available on Google Play**; App Store: **Ready for Distribution**). Too early
sends readers to a build that is not there. Each store on its own day.

1. Render, **purifyapp**, **Environment**.
2. For Play: edit `ANDROID_VERSION_CODE` to the version code from R4.
3. For the App Store: edit `IOS_BUILD_NUMBER` to the build number from R5.
4. **Save Changes**, **Save and deploy**.
5. Check: purifyapp.net/api/app/release shows the new `androidVersionCode` or
   `iosBuildNumber`.

Send back: "R6 Play done" / "R6 App Store done".

### R7. Not in 1.9: your admin sign-in code, once you moderate from the website

Your word, 2026-11-10 ("all recs yes"): the code stays off for 1.9, so you
can moderate from your phone. So do not add it yet. Once a code is added,
the admin and Community moderation ask for it, and the phone apps have
nowhere to type it: from that moment your account moderates from the
website only. Do this step on the day you choose to moderate from the
website.

1. purifyapp.net/admin, **Settings**, **Add a sign-in code**.
2. Scan the picture with an authenticator app on your phone (Google
   Authenticator, 1Password or Authy).
3. Type the 6 digits it shows. Click **Turn it on**.
4. Settings now says **Sign-in code: on**.
5. Only after step 4: Render, **purifyapp**, **Environment**, add `ADMIN_MFA`
   with the value `required`. **Save and deploy**. (Set before your code
   exists, it would ask you to add one before anything else opens.)

From then on, the admin and Community moderation ask for the code. The phone
apps have no code screen, so you moderate from the website.

Send back: "R7 done", on that day.

### R8. Tell people, in the drop's order

1. purifyapp.net/admin, **Releases**. The page runs in the order things go
   out: before anything, the store texts, the announcement (Discord, your
   Community post, the board message), the day a store has it (the release
   email, the cards, the captions), a few days later (the notification),
   and a week later (the numbers).
2. Each piece has **Copy**, and a mark for when it has gone. Nothing later
   goes before what is earlier is marked.
3. The board message, the notification and the email go out in the wording
   you OK (your item 100). The release email also needs the Mail step done.

The arbiter says the day for each moment.

Send back: what went, as you go.

### R9. After 1.9 is out: July's old campaign rows go on their own (nothing to run)

Your word, 2026-11-10 ("all recs yes"): July's old campaign rows are deleted
30 days after 1.9 ships (your item 125: nobody's illness stays up by
neglect).

The campaigns from July's first version are still in the database. Since
1.9 nobody sees them but the reader who started each, who finds it among
their own as ended and can take it down. On the 30th day after 1.9 ships,
the website deletes them by itself, in the heartbeat's daily upkeep
(`lib/ops/maintenance.ts`, built by the campaigns chat). It is code, not a
SQL file, so a second chat reads it before it ships, as for every change
to the live database.

Nothing for you to run, set or send. The day is written in the release
commit (`SHIPPED_ON` in `lib/campaigns/julyRows.ts`, the release day; the
1.9 checklist, `docs/plans/v1.9/RELEASE.md`, section 6), and until it is
written the job deletes nothing. The arbiter tells you when it has
happened: the job leaves a public mark when nothing of July's is left
(`campaigns-july-rows-deleted`, in `data_moves`).
