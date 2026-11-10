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

The order: **Anytime** first, whenever suits you. **Release day** waits until
the arbiter says go.

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

### R0. Accept the 1.9 note

1. purifyapp.net/admin, **Releases**, then **Patch notes**.
2. Read the 1.9 note. **Accept** it, or **Suggest** a change.

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
3. **New query**. Paste all of `docs/1.9-build/sql/psalms-113-115-move.sql`.
   Click **Run**. It must say success.
   (It moves readers' notes, highlights and saved verses on Psalms 113 to
   115 to the new numbering. It must run before any 1.9 app or website
   does; run twice, it does nothing.)
4. If either goes red: stop, change nothing else, send the arbiter the red
   message.

Send back: "R1 both green".

### R2. The push

1. Tell the arbiter **go**.
2. The chat checks everything once more and pushes `main`. That push is the
   deploy.
3. Render, the **purifyapp** service, **Events**: wait for **Deploy live**.
4. purifyapp.net/whats-new shows 1.9.

### R3. Read the database check

1. github.com/lifeistheosis/purifyapp, **Commits** (on `main`).
2. The top commit (the push): click its tick or cross.
3. Find **Supabase Preview**.
   - **Success**: every 1.9 database change ran. Done.
   - **Failure**: open it. The summary names the error. Send it to the
     arbiter, then paste each 1.9 migration by hand, in the order of its
     file name, in **SQL Editor**, one at a time. The arbiter sends the
     final list that morning. Today it is
     `supabase/migrations/20261109180246_shared_pages.sql`, and the 1.9 SQL
     you approved (Plus history, sync, the admin tables, the florilegium
     kinds) joins it as files before the release.

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
9. Release notes: the arbiter sends the text.
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
7. **What's New in This Version**: the arbiter sends the text.
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
