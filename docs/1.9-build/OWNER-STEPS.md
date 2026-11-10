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
suits you. **Release day** waits until the arbiter says go.

---

## Now: move to the company

You start tonight. Four rules for this whole section:

- **Numbers stay out of chats and files.** Never post the EIN, the D-U-N-S
  number, an address or a phone number in a chat or in this repository. They
  go only into the vendors' own forms.
- **If a switch is still going on release day, the store upload may have to
  wait.** Google asks you to wait at least 72 hours after its change before
  submitting a new app, and Apple's change can take days. Tell the arbiter
  where each one stands before R4 and R5.
- **The company's name exactly as the IRS and D&B have it.** No "DBA", no
  trade name. Send the arbiter the exact form from the EIN letter (a comma
  before LLC, or not): the website's pages take it from one line.
- Where a step says **(from Google's page; not opened directly)**, it comes
  from Google's or D&B's own help page as search results showed it, because
  those pages could not be opened from here. If the screen differs, stop and
  tell the arbiter.

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

### C1. Apple: from Individual to Organization

Before you start: C0 done; you are the Account Holder; you are the company's
founder with the authority to bind it; the company has a website on its own
domain (purifyapp.net) and you have a work email on that domain.

1. developer.apple.com, sign in as the Account Holder.
2. Open developer.apple.com/contact/request/migrate-individual-account
   (Apple's request to change an individual membership to an organization).
3. Give the company's legal name exactly as on the D-U-N-S record, the
   D-U-N-S number, the website, and your work email. Confirm you can bind
   the company.
4. In the same request, ask Apple: does the Team ID stay the same, and is
   anything about the app's installs or keys changed? (Apple's pages do not
   say.)
5. Submit. Apple may email or call, and may ask for business documents,
   sometimes notarized.
6. Wait. The developer site shows the migration as in progress.

Do not start it just before an iPhone build you need: ship urgent builds
first (others report the change taking from a day to months).

Done: **Membership details** says Organization, with the company's name. On
the App Store the seller becomes the company.

Send back: "C1 asked", then "C1 done".

### C2. Google Play: from Personal to Organization (in place)

From Google's page (not opened directly), Play Console can change the account
in place. Before you start: C0 done.

1. play.google.com/console, **Developer account**, **About you**.
2. **Website**: enter purifyapp.net and save. Click **Send verification
   request**. (Google verifies it through Search Console. If purifyapp.net is
   not in Search Console under your Google account yet, add it there first.)
3. Once the site shows as verified, and no other verification warning is
   pending, click **Change account type**.
4. Select or create an **organization payments profile**: the company's
   legal name, the D-U-N-S number, organization type, size and a business
   phone. Google may ask for documents. (A personal payments profile cannot
   become an organization one: this is a new profile.)
5. Click **Link your payments profile to your developer account**, then
   **Confirm and save**.
6. Watch the status on **Account details**.

After it completes, Google asks you to wait at least 72 hours before
submitting any new app.

If Play Console shows no **Change account type**: stop and tell the arbiter.
The other way is a new organization account and an app transfer, which also
needs RevenueCat re-linked (C4); do not start that alone.

Done: **About you** says Organization; **Account details** shows the new
payments profile linked.

Send back: "C2 done".

### C3. Payouts, tax and Stripe

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
2. Only if Google went the transfer way (C2's fallback): RevenueCat needs a
   new service account key from the new account and the notifications
   (Pub/Sub topic) set up again there. The arbiter writes those steps.
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

### 23. Is Plus selling on iPhone? (1 minute; do this before 87)

1. Open purifyapp.net/admin and sign in.
2. In the left menu, click **Money**.
3. Click the **Subscriptions** view.
4. Find the round chart titled **By source**.
5. Hover over (or tap) each slice. Look for one named **App Store**.

Done: you know whether an **App Store** slice is there.

Send back: "23: App Store slice yes, N members" or "23: no App Store slice".

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

### 87. Plus on iPhone (about an hour, mostly Apple's forms)

Do 23 first and send its answer: if an **App Store** slice already exists, the
arbiter checks before you start.

What the app expects (this does not change):

- One RevenueCat entitlement named `plus`.
- The **current** offering, with a **Monthly** package and an **Annual**
  package. On iPhone the app sells whatever App Store products those two
  packages hold.
- The words in the app say the yearly plan **begins with 7 days free, on a
  first subscription**. So the yearly product needs that free week.

**A. App Store Connect** (appstoreconnect.apple.com):

1. **Business**: the **Paid Apps** agreement must show **Active**. If it
   does not, finish what it asks for (bank, tax) first.
2. **Apps**, **Purify**, then **Monetization**, **Subscriptions**.
3. If a group already holds two products (they may say **Missing
   Metadata**), use those two and skip to step 6. Their IDs do not matter.
4. Otherwise click **+** next to **Subscription Groups**. Reference name
   `Purify Plus`.
5. In the group, click **+** twice to make two products:
   - Reference name `Plus Monthly`, Product ID `purify_plus_monthly`.
   - Reference name `Plus Yearly`, Product ID `purify_plus_yearly`.
6. For the monthly product: **Subscription Duration** 1 month.
7. For the yearly product: **Subscription Duration** 1 year.
8. For each: **Subscription Prices**, add a price. The prices are your call.
   (Google Play and the website sell at $9.99 a month and $71.99 a year.)
9. For the yearly product: **Introductory Offers**, **+**, **Free**, duration
   **1 week**, all countries.
10. For each: **Localization**, English: display name `Purify Plus` and a
    one-line description, for example "Sync, reading plans, ambience and
    more."
11. For each: **Review Information**, add a screenshot of the Purify Plus
    screen (in the app: **Account**, then **Purify Plus**).
12. The group itself: **Localization**, English, display name `Purify Plus`.

**B. Apple's In-App Purchase key** (needed by RevenueCat):

13. App Store Connect, **Users and Access**, **Integrations**, tab
    **In-App Purchase**.
14. Click **+** (Generate). Name it `RevenueCat`.
15. Download the `SubscriptionKey_….p8`. It downloads ONCE. Note its **Key
    ID**. The **Issuer ID** is on the **App Store Connect API** tab of the
    same page (the same Issuer ID the build already uses).
    (This key is not the `AuthKey_….p8` the build uses. Two different keys.)

**C. RevenueCat** (app.revenuecat.com, the Purify project):

16. **Apps** (newer layout: **Apps & providers**), **+ Add app** (or
    **+ New**), **App Store**.
17. Bundle ID `net.purifyapp.purify`.
18. Upload the `SubscriptionKey_….p8` from step 15, paste its Key ID and the
    Issuer ID. **Save**.
19. In that new App Store app, copy the **public API key** (it starts with
    `appl_`).
20. **Product catalog**, **Products**, **+ New**: add both App Store
    products by their Product IDs (or **Import**, if RevenueCat offers it).
21. **Entitlements**, open `plus`, **Attach**, tick both App Store products.
22. **Offerings**, open the offering marked **current** (default).
23. Open its **Monthly** package, add the App Store monthly product.
24. Open its **Annual** package, add the App Store yearly product.

**D. GitHub secrets** (github.com/lifeistheosis/purifyapp, **Settings**,
**Secrets and variables**, **Actions**):

25. **New repository secret** (or edit it if it exists):
    `NEXT_PUBLIC_REVENUECAT_IOS_KEY`, value: the `appl_` key from step 19.
26. Do NOT set `NEXT_PUBLIC_PLUS_ENFORCED_IOS` yet. It locks Plus features on
    iPhone, and must wait until Apple has approved the subscriptions (step 30).

**E. The builds:**

27. Nothing more today. The 1.9 iPhone build (Release day, R5) carries the
    key and can sell Plus.
28. When you submit 1.9 in App Store Connect (R5), on the version page under
    **In-App Purchases and Subscriptions**, click **+** and select both
    products, so Apple reviews them with the app.
29. In **App Review Information**, **Notes**: delete the sentence that says
    the build has no in-app purchases, and add: "Purify Plus is an
    auto-renewable subscription, monthly or yearly (the yearly begins with
    a free week). To see it: Account, then Purify Plus. The whole library
    stays free without it."
30. After Apple approves the subscriptions: set the GitHub secret
    `NEXT_PUBLIC_PLUS_ENFORCED_IOS` to `true`, then run **iOS build
    (signed)** on `main` with upload ticked, and submit that build. From
    that build on, iPhone readers meet the Plus sheet, as on Android.

Done: A to D finished; step 30 waits for Apple.

Send back: "87 A to D done" (no keys).

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

---

## Release day: NOT YET, the arbiter says when

Do these in order, on the day the arbiter names, and only after the arbiter
says go.

### R0. Put the 1.9 note in your queue, then accept it

Filing the note needs the database's service key, which only your PC has
(the `.env.local` from 70; if you have not made it yet, do that part of 70
first). The arbiter confirms that morning that the note's file is final.

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

### R1. Two SQL pastes, just before the push

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
     arbiter, then paste each 1.9 migration by hand, in the order of its
     file name, in **SQL Editor**, one at a time. Each is written to run
     twice, so one that already ran does no harm. The arbiter sends the
     final list that morning. Today, in `supabase/migrations/`:
     - `20261109180246_shared_pages.sql`
     - `20261110001550_psalms_113_115_move.sql`
     - `20261110002920_plus_events.sql`
     - `20261110002921_chant_pulls.sql`
     - `20261110002922_app_errors.sql`
     - `20261110002923_search_misses.sql`
     - `20261110012059_user_kept.sql`
     and the rest of the 1.9 SQL you approved (the florilegium kinds) as
     Updates moves it in.

### R4. Android: build, then Play Console

1. GitHub, **Actions**, **Android build**, **Run workflow**.
2. **Use workflow from**: `main`.
3. **Bundle the local-first offline build**: ticked.
4. **Run workflow**. Wait for the green tick.
5. GitHub, **Releases**, **Purify Android (release)**: download
   `app-release.aab`.
6. play.google.com/console, **Purify**, **Test and release**, **Production**.
7. **Create new release**.
8. Upload `app-release.aab`. Note the **version code** it shows.
9. Release notes: purifyapp.net/admin, **Releases**, the piece **What's new,
   for Google Play**, **Copy**, and paste. The arbiter confirms that morning that it is
   final.
10. **Next**, **Save**, then **Send for review** (or **Start rollout**).

Send back: "R4 sent, version code N".

### R5. iPhone: build, then App Store Connect

1. GitHub, **Actions**, **iOS build (signed)**, **Run workflow**.
2. **Use workflow from**: `main`. Both boxes ticked (local-first, upload).
3. **Run workflow**. Wait for the green tick (about 40 minutes).
4. App Store Connect, **Apps**, **Purify**, **TestFlight**: wait until the new
   build is done processing (5 to 15 minutes). Note its **build number**.
5. **App Store** tab, the **1.9** version (click **+** next to iOS App to make
   it, if needed).
6. **Build**: **Add Build**, pick the new one.
7. **What's New in This Version**: purifyapp.net/admin, **Releases**, the
   piece **What's New in This Version, for the App Store**, **Copy**, and
   paste (it names no Purify Plus, since
   every feature is free on iPhone; if 87 is done, the arbiter sends the
   version with Plus). On the same
   page: **Support URL** https://purifyapp.net/support, and **Copyright**
   2026 Purify Orthodox LLC. Under **App Review Information**, the contact
   email is one you read on review days (support@ lands in Admin,
   **Messages**).
8. If 87 is done: **In-App Purchases and Subscriptions**, **+**, both
   products (87, steps 28 and 29).
9. **Add for Review**, then **Submit for Review**.

Send back: "R5 submitted, build N".

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

### R7. After 1.9 is live: your admin sign-in code

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

Send back: "R7 done".

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
