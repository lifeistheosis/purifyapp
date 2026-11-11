# H2 and H3, and the lines found in the same read: the English, for the arbiter

From the fresh-eyes report (docs/1.9-build/notes/fresh-eyes.md, H2 and H3)
and the arbiter's word of 2026-11-11: remove every line that promises what is
not so, say only what the Privacy page says, no new promises. English first;
the 21 languages and the German FAQ follow on the arbiter's yes.

Every line below is held to what the code does today on every surface where
Plus is sold (the website, Android, iPhone):

- **Free, no account:** the library (the Scriptures with the Greek beside
  them and every chapter read aloud online, the prayers and akathists, the
  saints, the calendar, the councils, theology, history, search), and
  highlights, notes, bookmarks and the journal on this device.
- **Free with an account:** the days a reader has prayed their rule and the
  names they carry follow them (lib/prayers/sync.ts and /api/prayer/sync ask
  for no Plus). The rule itself stays on the device
  (prayers.mine.deviceNote says so).
- **Plus:** highlights, notes, bookmarks, the journal, the Florilegium and the
  kept library on every device (every file in lib/sync/ asks canSync), and
  the rows in lib/premium/plusRows.ts.
- **Supporters:** lifetime sync (plus.promise.supporters).

Lines marked **existing** are already in the catalogs, in all 21 languages,
and are used again as they stand.

## H2. FAQ, "Is Purify free? Will anything cost money?"

Now, three paragraphs: "Everything in the app today is free ... sync for
anyone who signs in. There are no ads and nothing is paywalled." / "An
optional layer called Purify Plus is planned for after the mobile launch ..."
/ "Pre-launch supporters keep lifetime cross-device sync. If you supported
Purify before the mobile launch ... when it arrives."

Proposed:

1. The library is free, with no account and no ads: the Scriptures with the
   Greek beside them and every chapter read aloud, the prayers and akathists,
   the saints, the calendar, the councils, theology and history, and search.
   So are your highlights, notes, bookmarks and journal on this device.
2. Purify Plus is an optional subscription that adds tools on top, among them
   word study, cross-references, more reading modes, listening offline,
   reading plans and your reading on every device. Then a link to /pricing:
   "See Purify Plus" (**existing**, premium.seePlus).
3. **Existing**, plus.promise.supporters: "A promise already made stays made:
   pre-launch supporters keep lifetime cross-device sync, no subscription
   required. That promise covers sync itself; the wider Plus tools belong to
   the subscription."

## Its neighbour. FAQ, "Will there be akathists, audio, accounts, and cross-device sync?"

Now: "Accounts and cross-device sync landed in v3.3. Sign-in is by an emailed
magic link, you never make a password. ... With an account, the same things
follow you across devices." / "Akathists ... are the next major content drop.
Audio recordings ... expect a longer wait."

Untrue three ways: there is no magic link (email and a password, or Google or
Apple), the highlights and notes follow a reader only with Plus, and the
akathists are in Prayers.

Proposed, one paragraph:

> All four are here. The akathists are in Prayers, and every chapter of the
> Bible can be read aloud to you. You sign in with your email and a password,
> or with Google or Apple. With an account, the days you have prayed your rule
> and the names you carry follow you to every device; with Purify Plus, so do
> your highlights, notes and bookmarks. You can delete the account, and every
> row it created on our side, from your [account page] at any time.

## H3. About

1. Now: "Built for the praying life, not for retention loops. There are no
   analytics watching you read, no advertising in the margins, no
   notifications pulling you back. The site is plain on purpose. ..."

   Proposed:

   > Built for the praying life, not for retention loops. There is no
   > advertising in the margins, and a prayer reminder comes only if you turn
   > it on. The site is plain on purpose. It hopes to be the only thing open
   > on the screen for a little while, and then to be closed.

2. Now: "There is no analytics layer. No third-party tracker. No advertising
   network. The full details, with every field and every third party named,
   are set out on the [privacy page]."

   Proposed:

   > We keep anonymous counts, never joined to your account. No third-party
   > tracker. No advertising network. The full details, with every field and
   > every third party named, are set out on the [privacy page].

   ("No analytics joined to your account identity" is the Privacy page's own
   line.)

3. Found in the same read, the paragraph before it. Now: "If you want your
   notes and bookmarks to follow you between phone and laptop, you may **sign
   in to sync**, with your email and a password, or one of the OAuth
   providers wired into the site. The same data is then stored in a row under
   your name ..."

   Proposed:

   > If you want your notes and bookmarks to follow you between phone and
   > laptop, **Purify Plus carries them**, once you sign in with your email
   > and a password, or with Google or Apple. They are then stored in a row
   > under your name, behind row-level security, so no one else may read it.
   > You may sign out at any time, and delete the account and every row
   > attached to it from the Data tab of your account. The choice between the
   > two paths is named plainly the first time you open [/account], and is
   > reversible in either direction.

## H3. FAQ, "Do you collect any of my data?"

1. Now: "**Without an account:** no analytics, no third-party scripts, no
   cookies that identify you. Your highlights, notes, bookmarks and
   prayer-rule completions live in your browser's localStorage ..."

   Proposed:

   > **Without an account:** your highlights, notes, bookmarks and the days
   > you have prayed stay on your device, and we have no copy. Clear them and
   > they are gone.

2. Now: "**With an account:** the same items are also stored on Supabase
   under a row-level-security policy that lets only you read them. ..."

   Proposed:

   > **With an account:** the days you have prayed and the names you carry
   > are kept with it, and with Purify Plus your highlights, notes and
   > bookmarks too, each behind a rule that lets only you read them. We do not
   > run analytics on them, and we never share or sell them. Delete your
   > account from your account page and every row it created is deleted.

3. "In both cases, our hosting provider (Render) sees ..." stays as it is.

4. New, last:

   > In both cases we also keep anonymous counts, never joined to your
   > account, of which pages and screens are opened. The [privacy page] names
   > every count and every field.

## Found in the same read. FAQ, "How do I install this on my phone, and how do I send feedback?"

Now: "Purify is a Progressive Web App. On iOS Safari, tap the Share button and
choose "Add to Home Screen." ..."

Proposed:

> Purify is on Google Play and the App Store. On a computer it opens in your
> browser at purifyapp.net.

(The feedback half stays as it is.)

## Low. Privacy, "On this device (no account)", English and German

Now: "To wipe all local data, clear site data for this origin in your browser
settings."

Proposed:

> To wipe all local data: on the website, clear this site's data in your
> browser's settings; in the app, clear its storage in your phone's settings,
> or remove the app.

(The in-app "Clear local data on this device" is on the account's Data page,
which a reader without an account cannot open, so it is not named here.)

## The same untruth as H2, in eight more places

Each tells a reader that signing in syncs their highlights and notes. Since
Plus is enforced, it does not.

a. **Sign-up page** (app/(auth)/signup), now: "Sync your highlights, notes,
   bookmarks, and prayer streak across devices. Free, ad-free, deletable any
   time." Proposed:

   > Keep the days you have prayed and the names you carry on every device;
   > with Purify Plus, your highlights, notes and bookmarks too. No ads, and
   > you can delete it any time.

b. **/account, signed out, on a computer**, now: "Two real ways to use
   Purify, both free and both private. Keep everything on this device, or
   sync across devices with email and password (or Google / Apple). Either
   choice is reversible." Proposed:

   > Two real ways to use Purify, both free and both private. Keep everything
   > on this device, or make an account with email and password (or Google /
   > Apple). Either choice is reversible.

c. **Its account card.** Heading now "Sign in to sync": proposed "Sign in"
   (**existing**, common.signIn). The gold line under it, "Your reading, on
   every device", is the Plus row's own name, so it goes from this card. Body
   now "The same things you'd save on one device, kept synchronized across
   all of them. Sign in by email; the account exists for sync and nothing
   else." Proposed:

   > The days you have prayed and the names you carry, kept with your account
   > on every device you sign in on. With Purify Plus, your highlights, notes
   > and bookmarks too.

   "+ Open the app on a new phone, sign in, find your work." becomes "+ Open
   the app on a new phone, sign in, find your prayer days and names." "−
   Requires a working email to receive the sign-in link." becomes "−
   Requires a working email." (there is no sign-in link).

d. **You, with a name claimed on this device** (LocalProfileHero). Now:
   "Highlights, notes, and bookmarks are saved on this device. They stay
   yours without an account; signing in adds one thing, keeping them
   synchronized across your devices." Proposed: **existing**
   ui.syncLockedBody, "Your highlights, notes and bookmarks stay on the
   device that made them. Purify Plus carries them to every device you sign
   in on."

   Its link, now "Sign in to sync across devices →": proposed "Sign in →".
   Its small print, now "Signing in syncs your local highlights, notes, and
   bookmarks to your account the first time, nothing on this device is
   removed. ...": proposed "Signing in removes nothing from this device.
   Reader settings stay on this device."

e. **The banner after signing in** (PostSignInBridge): "Welcome, your local
   data is syncing. Your highlights, notes, and bookmarks from this device
   are being pushed to your account now." It shows to every reader who had a
   name on the device. Proposed: no new words; the banner asks canSync()
   first and shows only where it is true. Three lines of code, in
   components/profile/PostSignInBridge.tsx (whose file is it?).

f. **Settings and You, signed out**, the Sign in row's line, now "Sync across
   devices (optional)". Proposed: "Optional".

g. **Account settings, the Purify Plus row's hint**, now "Cross-device sync,
   notes & highlights, collections" (notes and highlights are free).
   Proposed: **existing** support.wayPlus.body, "Your notes and collections
   on every device, the reading modes and Immersive History."

h. **/account's description for search engines** (English, in the page),
   now "Sign in to sync your highlights, notes, and bookmarks across devices.
   Or keep everything local on this device. Your choice." Proposed: "Keep
   everything on this device, or make an account. Your choice."

## Then

On the arbiter's yes: the English as approved, the 21 languages (new keys
where the meaning changed, the old keys retired), the German FAQ
(components/faq/FaqDe.tsx) and the German Privacy line to match, and the
words test reading the FAQ, About and Privacy (and these places) for the
lines that are gone: "magic link", "nothing is paywalled", "is planned for
after", "no analytics", "analytics layer", "notifications pulling",
"Progressive Web App", and "sync" promised on signing in alone.
