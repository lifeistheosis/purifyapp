# App Store review information: Purify

Prepared for App Review's request for supplementary materials. Items 2 through 7
are written out below and are ready to paste into App Review Information. Item 1,
the screen recording, is supplied separately.

Two fields need Edgar's own answer before this is sent, and are marked
**[FILL IN]**. Do not send the document with those placeholders in place.

---

## 1. Screen recording: what it has to contain

The recording is supplied separately. Apple's request is conditional, so this is
what actually applies to Purify, checked against the shipped build.

**Applies, and must be in the recording:**

- **Account registration, sign in, and account deletion.** All three exist.
  Registration and sign in are on the Account tab, by email and password or by
  Sign in with Apple or Google. Deletion is under Account, Profile, at the foot
  of the page. It is a real deletion, not a deactivation: it removes the auth
  record and every row that cascades from it (profile, bookmarks, annotations,
  saint bumps). Show it being completed.
- **User-generated content, with reporting and blocking.** Purify carries three
  user-content surfaces: Community posts, prayer Campaigns, and Trapeza recipe
  contributions. Each has a report control, and Community additionally supports
  blocking another user. Show reporting a post and blocking a user.
- **A prompt for a device capability.** The camera and photo library prompts
  appear when attaching a photo to a campaign or a post. Show one of them.

**Does not apply, and there is nothing to record:**

- **There is no purchase or subscription flow in this build.** Purify Plus is
  not purchasable on iOS. Its two App Store products are at MISSING_METADATA and
  are not attached to this submission, and the build ships with iOS entitlement
  enforcement switched off precisely so that no reader is gated behind something
  they cannot buy. Every feature in the iOS app is free. If App Review is
  looking for an in-app purchase, that is why they will not find one.
- **No location, contacts, microphone, health, or App Tracking Transparency
  prompt exists.** The app declares no such usage strings and requests no such
  permission.

**One thing worth showing even though Apple did not ask.** The previous
submission was returned under 2.1(a) for a session that did not survive a
restart. The fix is in this build. A short sequence proving it (sign in, force
quit from the app switcher, reopen, still signed in) answers that rejection
directly and is worth including.

---

## 2. Devices and operating systems tested

**[FILL IN]** with the real hardware this build was exercised on. Apple checks
this against the crash and device reports, so it must be accurate. The format
they expect:

```
iPhone [model], iOS [version]   (physical device)
iPad [model], iPadOS [version]  (physical device, if iPad is supported)
```

Name at least one physical device running the current public iOS release. If the
build was also exercised in the Simulator, say so separately and label it as the
Simulator rather than letting it read as a device.

---

## 3. What the app does, and who it is for

Purify is a free reference library and prayer companion for Eastern Orthodox
Christians.

**The problem it solves.** The primary sources of Orthodox Christian
tradition, the Scriptures in the editions the Church actually reads, the
commentaries of the Church Fathers, the lives of the saints, the acts of the
Ecumenical Councils, and the daily cycle of prayer, are scattered across print
volumes, academic archives, and parish handouts. Where they exist online they
are usually split across sites, unsearchable, and frequently locked inside
modern translations that cannot be freely redistributed. A layperson who wants
to read what St John Chrysostom wrote on the passage they read this morning has
no straightforward way to do it.

**What Purify provides.** One library, free, that works offline. Scripture with
per-verse patristic commentary attached, so the Fathers sit beside the text they
are expounding. Saints' profiles with their own writings. The daily calendar
with its readings, feasts, and fasting rule. The Hours and a prayer collection.
The councils. All of it searchable, and all of it usable on a phone with no
network, because the entire library is bundled inside the app rather than
fetched.

**Target audience.** Orthodox Christian laypeople, catechumens and inquirers,
clergy and seminarians, and students of early Christian literature. It is a
reference and devotional tool, not a social network and not a service that gives
advice.

**Editorial character.** Every patristic text is a verbatim public-domain
translation, reproduced with its author, work, and citation attached. Nothing in
the library is generated, paraphrased, or reconstructed. That is a written
policy with automated enforcement, described under item 7.

---

## 4. Setting up and reaching the main features

**No account is needed for the library.** Install and open the app and the whole
of Scripture, the commentary, the saints, the calendar, the Hours, the prayers,
and the councils are available immediately, offline, with no sign in and no
paywall. A reviewer can evaluate the app fully without any credentials at all.

An account unlocks only personal and social features: bookmarks, annotations and
reading history, Community posts, prayer Campaigns, Trapeza contributions, and
the EIKON shop.

**Demo account for the account-only features:**

```
Email:    [FILL IN]
Password: [FILL IN]
```

**[FILL IN]** must be a working account that already has a little content on it,
so the reviewer sees a populated state rather than empty screens. Create it
fresh, confirm it signs in on a device, and do not reuse a personal account.

**Where to find each feature:**

| Feature | Path in the app |
|---|---|
| Scripture with the Fathers | Bible tab, open any chapter, tap a verse |
| Saints and their writings | Saints tab, or the calendar's daily saint |
| Daily calendar, readings, fasting | Calendar tab |
| The Hours and prayers | Prayers tab |
| Registration and sign in | Account tab |
| **Account deletion** | Account, Profile, at the foot of the page |
| Data export | Account, Data |
| Community posts, reporting, blocking | Community tab |
| Prayer campaigns and reporting | Campaigns |
| EIKON shop | Shop tab |

**No sample files are required.** Nothing has to be imported or uploaded for the
app to function. The photo attachment on a campaign or post is optional and any
image from the device library will do.

**Suggested route for a reviewer:** open the app cold and read a chapter of the
Gospel with the commentary rail, since that is the core of the product and needs
no account. Then register, post to Community, report and block, and finally
delete the account.

---

## 5. External services and platforms

| Service | What it does for the app | Notes |
|---|---|---|
| **Supabase** | Authentication and the user database (Postgres) | Holds accounts, bookmarks, annotations, community content. Row Level Security enforces that a reader only ever reads their own rows. |
| **Sign in with Apple** | Third-party sign in | Offered alongside Google and email, as required. |
| **Google Sign-In** | Third-party sign in | |
| **Stripe** | Checkout for the EIKON shop | **Physical goods only** (printed icons and related items), which is why it is not In-App Purchase. The server re-prices every order; no price, subtotal, or entitlement is ever accepted from the client. |
| **RevenueCat** | Subscription infrastructure | Integrated, and **not active on iOS**. The App Store products are at MISSING_METADATA, no purchase flow is reachable in this build, and iOS entitlement enforcement ships off. It is live on Google Play only. |
| **Apple Push Notification service** | Push notifications on iOS | Opt in. Declined permission degrades nothing. |
| **Firebase Cloud Messaging** | Push notifications on Android | Not used by the iOS build. |
| **Resend** | Transactional email | Sign-in and account email only. No marketing send. |
| **Render** | Hosting for purifyapp.net and its APIs | The app is offline-first and reaches the API only for account and social features. |

**No artificial intelligence service is used to deliver any part of this app.**
There is no model provider in the dependency tree and no inference at runtime.
None of the religious text in the library is machine generated. This is
deliberate and is a written editorial rule, not an accident of the current
build.

**One integration is present but dormant and delivers nothing today:** an
API.Bible client exists in the codebase behind an unset key and returns null
without it. It is named here for completeness rather than because it is in use.

---

## 6. Regional differences

The app's function is the same in every region. Three differences are worth
stating plainly.

1. **The EIKON shop ships to the United States only.** Stripe checkout is
   configured with an allowed shipping country list of US alone. Readers
   elsewhere can browse the shop but cannot complete an order. Everything else
   in the app is unaffected.
2. **The library is in English.** Scripture, patristic commentary, saints'
   writings, and the councils are English public-domain texts and are not
   translated. The interface is localised into twenty additional languages at
   varying and mostly partial coverage, and any untranslated string falls back
   to English. No feature is hidden or withheld by locale.
3. **Purify Plus is not purchasable in any region on iOS**, per item 5. There is
   no regional pricing question to answer because there is no iOS purchase.

There is no geographic gating, no region-locked content, and no feature that
behaves differently by country other than shop shipping eligibility.

---

## 7. Regulated industry and third-party material

**Purify does not operate in a regulated industry.** It is a religious reference
and devotional library. It gives no medical, legal, or financial advice, handles
no health data, and provides no regulated service. The shop sells ordinary
physical goods.

**All third-party material in the library is in the public domain**, and that is
enforced rather than asserted.

*What the sources are.* The patristic commentary comes from named nineteenth
century editions whose copyright has long expired: the Nicene and Post-Nicene
Fathers and Ante-Nicene Fathers series edited by Philip Schaff (1885 to 1900),
the Library of the Fathers (Oxford, 1838 to 1885), the Catena Aurea in the
Oxford translation (Rivington, 1842), and R. Payne Smith's translation of St
Cyril on Luke (Oxford University Press, 1859). Scripture is public-domain
editions only, identified per chapter. Every individual note in the app carries
its author, its work, and its citation, visible to the reader.

*How it is enforced.* `docs/editorial-standards.md` is the binding policy:
public-domain sources only, quoted verbatim, cited per note, ingested by script
from a named edition and never hand-entered or paraphrased. An automated test in
continuous integration restricts the citation field to that whitelist of
public-domain series and fails the build on anything else. Saints' icons carry a
recorded provenance, checked by a separate audit script.

*What has been refused.* Modern translations still in copyright are excluded
even where they would improve the library, including the Palmer, Sherrard and
Ware Philokalia, the Fathers of the Church series, and Ancient Christian
Writers. Two commentary notes that rested on in-copyright translations were
removed outright rather than re-sourced, because no public-domain English of
those passages exists. A 1948 translation was excluded on the ground that its US
copyright was restored under the URAA and does not expire until 2043.

*Permission held.* One contemporary author's work appears in the library by
written permission, granted 2026-07-27 and recorded in the editorial standards
document. That permission covers his own writing only and does not extend to the
modern translations some of his citations rest on, which are excluded.

Documentation can be supplied on request: the editorial standards document, the
automated licensing test, the per-note citation data, and the icon provenance
records.
