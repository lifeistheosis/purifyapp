# Prayer campaigns, reworked: notes and stills

Notes and stills only, 2026-11-10. Nothing here is built, and nothing is built
until Edgar says start. Written by the prayer campaigns chat the arbiter started
on his word of the same day (session `session_01VuYTwbyUm9fyYex3QnL4Tu`). Every
claim about the app as it is was read from the code on `ccr-07896cf2-bo0afd` on
this date and carries its file: read at `6a302fb4`, and checked again at
`f6987145`, thirty-three commits on, before this file was pushed. Every claim
about production is marked as probed by someone else or as not probed.

**Since then (2026-11-10, the same day):** he answered every question with "ok
to all", and phase 1 was built behind a switch that is committed closed. Then
his word changed one answer: "ok to all ensure its all in v1.9". Campaigns ship
in 1.9 itself, not in a small release after it. Sections 1 to 9 are the design
as it was put to him and are left as written, so where they say 1.9.1, or that
the SQL waits until 1.9 has merged, section 10 is what holds: it says what was
built, what holds it, where the build differs, and how release day goes.

His words, the brief this answers (at more length in `BRAINSTORM.md`): "I wanted
version 1.9 to have the prayer campaign system, right? I never saw that
implemented ... creating a prayer campaign for whatever, you know, the reposed,
your sickness, your school exam. And users can participate in these prayer
campaigns, and these prayer campaigns will be inserted into their prayers for
either the day or the week or the month. And the person who created the campaign
can create how long the campaign will be for ... they can put it in whichever
section ... a 3-image photo limit for normal users. And for premium users, they
can add as up to 20 photos ... free users can add announcements ... allow
comments ... top prayer campaigns ... Allow them to add a location ... In
theory, it's actualized through Halo. They have done it, but we need to make our
own version."

**The stills:** https://claude.ai/artifact/7EuY9gDq4iu5iRQNGEhfP9 (private; four
screens, one version each; section 7). Of the screens as built, sixteen:
https://claude.ai/artifact/SCpqiXD3xgQP6cmrCxLpL9 (private; section 10).

**The whole design in five sentences.** A campaign is a name carried together:
one reader asks, and whoever joins carries that name in their own prayers, in
the place the prayer books already keep for names, with the Church's own prayer
from the prayer book, for a set number of days. Then it leaves by itself.
Nothing about anyone's praying is counted or shown. Everything a campaign lets
people write or upload passes through the safety tools Community already has,
and each campaign is read by a moderator before it is public. It is built on
what exists: the tables of July and August, the campaign card and the Campaigns
door drawn for 1.8, "Add to my prayers", and "Those you pray for".

Contents:

1. What exists, and why it was withdrawn
2. The rework, point by point
3. Safety and moderation
4. Privacy
5. The data changes
6. A phased plan, with sizes
7. The stills
8. What waits on Edgar, on a priest and on a lawyer
9. Found on the way
10. Phase 1, as built
11. Phase 2, as built: updates and comments
12. The parts that ship switched off, and "Prayed by many"

---

## 1. What exists, and why it was withdrawn

### 1.1 The history, from the commits

| Date | Commit | What |
|---|---|---|
| 2026-07-13 | `b803b32e`, `bcf3212e` | Prayer Campaigns v1 (Beta 2.0): a public board at `/campaigns`, six intentions, a prayer chosen from nine presets, a length of a week, nine days, forty days or no end, join, "prayed today", report |
| 2026-07-25 | `500209e4` | One picture a campaign (Beta 2.6), with a consent line |
| 2026-08-11 | `b962c1d3`, `4d653d18` | A day log, a streak, parish groups with invite codes and private threads, a daily reminder |
| 2026-08-12 | `15ab9f74` | Six defects closed before the switch could be thrown, among them invite codes readable by anyone, a policy that recursed, private replies that were public, reminders that never fired, and a verb the apps could not call |
| 2026-08-22 | `593d32b2` | "Prayer stops being counted": the streak, the totals, the personal best and the public "n praying, n prayers offered" came off live pages; the rule went into `CONTRIBUTING.md`, "On prayer, no figures at all" |
| 2026-08-26 | `3dc708ff` | "Prayer Campaigns is withdrawn from the web, pending its rework" (1.3) |
| 2026-10-26 | `docs/1.8-build/sql/read-together.sql` | The campaign groups became the circles of Read together; "one group system, not two", his word |
| 2026-10-30 to 11-01 | `2daabadf`, `8ab5d927`, `68d21e27` | 1.8 kept places for it: the campaign card under Pray together, the Campaigns door on a profile, a line in Your rule |

### 1.2 Why it was withdrawn

**The record does not quote his reason.** The withdrawal commit says "pending
its rework" and explains only how it was closed. The plan it points to,
`Homebase/boards/purify-master/r19/PRAYER-CAMPAIGNS.md` (named in
`lib/community/runningCampaign.ts:39` and `components/community/CampaignCard.tsx:25`),
is on his PC and not in this repository, so its list, "What the rework has to
fix", could not be read from here. Two things from it are in the code's
comments: its first item, which `runningCampaign.ts` gives as "six of the nine
prayers a campaign row can name today are lines Purify wrote, and none carries
a source", and its line "Nobody is counted". If that file says more, it
outranks this section.

What the repository itself shows, each read on this branch:

1. **Its prayers were ours.** `lib/campaigns/campaigns.ts:128` (`PRESET_PRAYERS`):
   six of the nine are sentences written for the feature ("Lord Jesus Christ,
   Son of God, have mercy on your servant and grant them healing of soul and
   body."), with no source. The other three are the Jesus Prayer, the Trisagion
   and "Most Holy Theotokos, save us". The editorial standard is the opposite:
   a prayer is verbatim from a public-domain book, with its source.
2. **It was built on counting, and counting went.** Four days before the
   withdrawal the streak, the totals and the public counts were removed as a
   matter of principle (`CONTRIBUTING.md`, "On prayer, no figures at all": "no
   public count of who prayed or how often", because a count beside a need
   "ranks a board of needs, and it ranks it backwards"). What was left on the
   page was a title, a note, a line of ours to pray and a button.
3. **It stood outside Community's safety.** Creating one runs no word filter
   and no spam check (`app/api/campaigns/route.ts`: no `censorPost`, no
   `guardWrite`). A report has no state and no limit of one a reader
   (`supabase/migrations/20260713000200_prayer_campaigns.sql:97`), so reports
   pile up, and nothing is hidden by them. There is no block.
4. **Anyone with the public key can read every campaign whole.** The policy
   `prayer_campaigns_public_select` serves each row that is not removed,
   `creator_id` (the account's id) and both counters included.
   `20260802000100_revoke_public_user_id.sql` names this as owed: "Those two
   need a code change first". Probed by the audit on 2026-10-03: "one campaign
   readable" (`docs/audit/findings.yaml`, F-29).
5. **Its picture was stored as it was uploaded.** `app/api/campaigns/image/route.ts`
   writes the reader's bytes to a public bucket: no new copy is made, so a
   phone photo keeps the place and the device inside it, and nothing looks at
   the picture. The shop has had the fix since `lib/shop/imageNormalize.ts`.
6. **Part of it may never have run in production.** On 2026-08-22 the groups
   and streaks migration was probed as not applied
   (`docs/audit/continuation-ledger.md`, "Four migrations sit on main
   unapplied"). He ran `read-together.sql` by hand on 2026-10-26 (his word, in
   that file's header), and it alters the groups table, which it could not
   have done had the table been missing. Whether `prayer_campaign_days` and
   the reminder columns exist was not probed, then or from here. Probe before
   building (5.5).

### 1.3 What exists today, to build on

| Piece | Where | State |
|---|---|---|
| The switch | `lib/campaigns/flags.ts` (`WITHDRAWN_FOR_REWORK = true`) | Every `/campaigns` page and route answers 404 |
| The model | `lib/campaigns/campaigns.ts`, `streak.ts`, `groups.ts`, `image.ts`, `client.ts`, `catalog.ts` | Compiles, tested; the presets and the streak are what the rework replaces |
| The pages | `app/(app)/campaigns/` (board, `detail?id=`, `new`, `mine`), `components/campaigns/` | The July look: gold, pills, a hand-drawn tick, English typed into the code. None of it passes today's guardrails; the rework draws them again from the house's parts |
| The routes | `app/api/campaigns/` (list, create, one, pray, report, remind, image, groups) | Behind the flag |
| The tables | `prayer_campaigns`, `prayer_campaign_prayers` (the join row), `prayer_campaign_days`, `prayer_campaign_reports`, `prayer_campaign_groups` and its members | The groups are live as Read together's circles; the rest is dormant |
| The card | `components/community/CampaignCard.tsx`, `PrayTogether.tsx` | Drawn for 1.8 from his pick of r3-02; never shown, since `runningCampaign()` returns null |
| Joining | `components/community/AddToPrayersSheet.tsx`, `components/prayers/PlaceChips.tsx`, `lib/prayers/wallNames.ts` | Live for the prayer wall: a name goes into the prayers the reader ticks, for a week |
| In the prayers | `lib/prayers/commemoration.ts`, `components/prayers/service/CommemorationStep.tsx` | Live: "Those I pray for" before the dismissal, with Hapgood's prayer for the departed, word for word |
| On Your rule | `components/prayers/mine/MyRuleBuilder.tsx:84`, `components/prayers/Diptychs.tsx:25` | A place kept in words only: "a prayer campaign a reader joins lands on this page ... its prayer a step on this thread and its name among the names, each until its last day" |
| On a profile | `lib/profile/doors.ts` (`CAMPAIGNS_DOOR = false`) | The door is drawn and off |
| Moderation | `lib/community/moderation.ts`, `lib/admin/communityQueue.ts`, `app/api/admin/community/route.ts` | One queue with ten seconds of Undo; reported campaigns already have a row in it |
| Told to Apple | `docs/app-store-review-notes.md:25` | "two user-content surfaces: Community posts and prayer Campaigns" |

---

## 2. The rework, point by point

### 2.0 Its own form, not Hallow's

The July file says it was "heavily inspired by Hallow's prayer campaigns"
(`20260713000200_prayer_campaigns.sql:5`). What made it like them was the
counting, and the house rule now forbids that for good reasons. So Purify's own
form starts from what the Church already does with a name:

- **A campaign is a commemoration shared.** The forty days for the departed, a
  name read for the sick: the prayer books keep a place for names, and the app
  already has it ("Those I pray for"). A campaign puts one name there, in many
  readers' prayers, for a set time.
- **The prayer is the Church's.** It comes from the prayer book by reference
  and is shown with its printing. The campaign never carries words written for
  it.
- **It lives in the reader's own rule,** not in a feed. Joining is "Add to my
  prayers"; the campaign is then met while praying.
- **Nobody is counted.** No "n praying", no streak, no total, for the reader or
  for the campaign.
- **It ends.** Every campaign has a last day, and leaves by itself.

### 2.1 Creating a campaign, for any intention

His words: "creating a prayer campaign for whatever, you know, the reposed, your
sickness, your school exam."

**Screens (still 2).** Community, Pray together, "Start a campaign" opens a page
of its own, built as making a post is (`components/community/ComposePage.tsx`):

1. **For whom:** two doors, For the living and For the reposed (existing words,
   `prayers.diptychs.livingHeading`, `reposedHeading`). The head's picture
   follows the door: the app's own Anastasis for the reposed, Christ
   Pantocrator otherwise (`lib/prayers/icons.ts`).
2. **What for** (the living only): one row that opens a sheet of lines to
   tick. An illness. An exam or studies. A journey. Thanksgiving. A trial.
   Guidance. The persecuted. Something else.
3. **The name:** a first name, set like a post's title, with one line under
   it: "A first name only, as the Church remembers them." For oneself, a line
   to tick fills the reader's own name.
4. **What you ask prayers for:** the reader's own words, with no box. The
   existing hint stands: "One or two lines. No private medical or personal
   details of others."
5. **A row each** for How long (2.2), The prayer (2.4), Pictures (2.5) and
   Place (2.9), each opening its sheet.
6. **The blessing:** one line to tick, worded for who it is for (4.3).
7. **At the thumb:** who can read it (everyone in Community, or one circle),
   and Create.

**Data.** `prayer_campaigns`: `intention` gains `study`, `travel` and `other`
beside the six of July; new columns `details`, `days`, `starts_on`, `ends_on`,
`prayer_rule`, `prayer_id`, `audience`, `circle_id`, `consent_kind`,
`consent_at`, `creator_name`, `creator_handle` (5.2). The title is typed, or
offered from the parts ("Forty days for Nicholas").

**Rules.**

- An account is needed to create, as now. Carrying one needs none (2.3).
- The words pass Community's word filter and spam check, which the old route
  never called. A link is refused, as a prayer request refuses one
  (`app/api/profile/me/route.ts`, `intention_link`). Asking for money, a
  phone number, an email address or a street address holds it for a moderator.
- **Every campaign is read by a moderator before everyone can see it**
  (`status: 'held'`, then `'active'`). The creator sees it at once, with the
  line "It will show once a moderator has read it." Later, a trusted creator
  (`lib/community/trust.ts`: thirty days, ten contributions, nothing removed)
  can publish at once. Question 1 for him.
- One campaign running at a time for an account under a day old, three for
  everyone else; at most three started a day.
- A campaign prays for someone, never against anyone, and is not for a party,
  a candidate or a cause of state. A moderator's call, written in the rules
  (3.2).

### 2.2 Its length, set by the creator

His words: "the person who created the campaign can create how long the campaign
will be for. So for example, they can set it for 30 days, right, for a month."

**Screen.** The row How long opens a sheet of lines: A day. A week. Thirty
days. Forty days. Choose the last day (a calendar, at most forty days out). For
the reposed, Forty days is ticked to begin with, as the Church keeps them.

**Data.** `days` (1 to 40), `starts_on` and `ends_on` on the creator's own
calendar, and `ends_at`, which exists: noon UTC of the day after `ends_on`,
when that day has ended everywhere.

**Rules.**

- Forty is the ceiling. It is the Church's own number, it covers his month,
  and it keeps a sick person's name from standing in public without end. A
  need that lasts longer is renewed: "Run it again" makes a new campaign from
  the same parts, and nobody is carried over without choosing to be. Question
  3.
- The page says the dates, never a score: "Forty days, to December 19", then
  "Last day" (`campaigns.lastDay`, existing). The old code's own argument
  holds: when it ends "is a fact about the campaign rather than a measure of
  anyone's praying" (`components/campaigns/CampaignDetailClient.tsx`).
- The creator can end it early, with the two closings that exist: "Answered,
  glory to God" and "Memory eternal" (`statusLabel`).
- When the last day has passed it reads "ended", takes no new joins or
  comments, and leaves the board (4.5 for how long it is kept).

### 2.3 Joining, and where it goes in one's own prayers

His words: "users who participate in that will have that into their daily
prayers, and they can put it in whichever section, honestly. So they can put it
in the morning, you know, the dinner, or whatever they have the set up ...
whether it's their custom prayers or ... the preset prayers that we put."

**Screen (still 3).** "Add to my prayers" on the campaign's page or its card
opens the prayer wall's own sheet (`AddToPrayersSheet`), with two changes:

- **In which prayers:** the six the app already offers, to tick
  (`PRAY_PLACES` in `lib/prayers/commemoration.ts`): Morning prayers, Midday
  prayers, Evening prayers, The Hours, Small Compline, Your rule. The reader's
  usual choice is ticked to begin with. This is his "whichever section": the
  prayer book's own rules, and the reader's own.
- **For how long** (new): Until its last day (ticked), A week, Today only.
  This is his "for either the day or the week or the month". Question 4.
- The line under them (new words): "It leaves your prayers by itself after the
  last day. Only you can see this."

"The dinner": the six places hold no prayer at table, because the prayer books
keep names in the morning and evening prayers, not at the blessing of food.
Evening prayers is the nearest. Adding the table prayers as a seventh place is
a small change if he wants it.

**In the prayers (still 4).** Nothing new is drawn in the praying itself.

- **For the reposed:** the name joins the reader's departed, inside the
  Church's prayer where the book prints NN. (`departedPrayer`), which is how a
  name of the reader's own already stands. One quiet line is added under the
  prayer's source: "With the prayer campaign “Forty days for Nicholas”, until
  December 19."
- **For the living:** the name stands among the living, with the campaign's
  title under it, as a name from the prayer wall stands with its words
  (`prayers.wall.alsoFor`).
- **A prayer of the book, when the creator chose one** (2.4): it follows
  "Those I pray for" as a step of its own, with its title, its words read from
  the prayer book's file, and its source. In Your rule it is a step on the
  thread, and the reader can drag it to another place in their own rule.

**On Your rule.** The name shows among "Those you pray for" as a medallion with
one line: "Campaign, until December 19" (the wall's names already say "Until
{date}", `prayers.diptychs.wallUntil`). A tap opens the sheet again, to move it
to other prayers or take it out.

**Data.**

- **On the device, always:** `purify.prayers.campaigns`, modelled on
  `lib/prayers/wallNames.ts`: the campaign's id, the name, the title, living
  or reposed, the prayer's reference, the places, the day it leaves, and when
  it was added or taken out. The prayer reader reads only this, so a campaign
  is prayed with no signal.
- **With an account, also:** the join row that exists
  (`prayer_campaign_prayers`), with two new columns, `places` and `until_on`,
  so it follows the reader to another device. Without an account nothing is
  sent: the reader carries it on the device alone.
- **Nothing is sent when it is prayed.** "Mark prayed" keeps the day in the
  device's own ledger, as every prayer's does. The old pray route and the day
  log (`prayer_campaign_days`) get no new writes: which days a person prayed
  for whom is not something the feature needs to know.

**How it leaves.**

- On the day after its last day, or the reader's own shorter day, by the
  device's clock.
- At once when the reader takes it out.
- When the creator ends it or a moderator removes it: the next time the app is
  online it asks the server about the campaigns it carries (one small route,
  ids in, states out) and lets go of any that are over.
- Then, once, on the page of Your rule and nowhere else: "The campaign for
  Nicholas has ended. Keep this name among those you pray for?" with Keep and
  Let go. Keep puts the name in the reader's own list of the reposed, where it
  stays theirs.

### 2.4 The prayer a campaign places

The standard binds here: verbatim from the prayer book, never written by AI.

**What the prayer book holds today that a campaign can carry:**

| For | The prayer | Printing | In the app |
|---|---|---|---|
| The reposed | "O God of spirits, and of all flesh" | Hapgood, Service Book (1906), p. 91 | Yes, as the commemoration's own (`DEPARTED_PRAYER`) |
| Protection, danger, a trial | Psalm 90, Psalm 26 | Brenton's Septuagint (1851) | Yes (`data/prayers/rules/protection.json`) |
| Repentance | Psalm 50 | As the Horologion carries it | Yes (`repentance.json`) |
| Any | The Trisagion, the Lord's Prayer, the Jesus Prayer | The common prayer book | Yes (`morning.json`) |

**What it does not hold yet,** read from the scan of Hapgood the app already
ingests from (Cornell, `cu31924029363128`, its contents and its headings read
on 2026-11-10):

| For | In Hapgood, as its contents name it | Page | Note |
|---|---|---|---|
| An exam, studies | Prayer Service "for Children beginning Instruction" | 519 | A priest's service |
| A journey | Blessing "for a Journey (by land)" and "(by water)"; on its page, "The Rite of Blessing for a Journey" | 524, 529 | A priest's service; it opens with the psalm the app numbers 142 (Hapgood prints it as cxliii) |
| Thanksgiving | Thanksgiving "for an Answer to Prayer" | 512 | A priest's service |
| Any need | Prayer Service, "General (Molieben)" | 559 | A priest's service |
| The sick | Nothing but Holy Unction (p. 333), a sacrament | | No office for the sick stands alone in its contents |

Only the contents and the headings were read. Not one of these prayers has
been read on its page yet, and none is quoted here. The titles in quotation
marks are the book's own words, found in the scan's text and not typed from
memory, as the rule of 2026-11-10 asks of every quotation
(`docs/editorial-standards.md`, item 28).

So, honestly:

- **The reposed are ready today.** That is why the stills show them.
- **For the living, the campaign carries the name,** under the line the app
  already says over the living ("Remember, O Lord, Thy servants for whom I
  pray, and have mercy on them.": ours since 1.7.1, his own choice, marked for
  review in `COMMEMORATION_REVIEW`), **and may carry a psalm** the book has.
  No new words are written.
- **Three offices can be ingested** (study, journey, thanksgiving), each read
  off its page image and held by a test, as the prayers before Communion
  were. Each is a priest's service, so which of its prayers a reader may say
  in their own rule is a priest's question (8.2), the same question already
  open for the prayer over the departed.
- **A prayer for the sick needs a source.** A book to open next, named from
  memory and not checked here: G. V. Shann's Book of Needs (London, 1894).
  Whether a scan of it can be read, whether it is free to use, and whether it
  holds a prayer a layman says for the sick are all still to be found out.
  Until a source is found, a campaign for the sick carries the name and, if
  the creator wishes, Psalm 90.
- The planned rows of the prayer book that have waited for exactly these
  texts (`before-work`, `before-travel`, `thanksgiving`, `psalms-needs` in
  `lib/prayers/rules.ts`) get their words from the same ingest.

**Data.** `prayer_rule` and `prayer_id` name a prayer of the registry. The
words are never copied into the campaign: they are read from the book's file
when it is prayed, so a correction to a prayer reaches every campaign.
A campaign for the reposed names none: the commemoration's own prayer is said
over its name, as it is over every name of the reader's departed.
`prayer_key`, which named the six lines of ours, stays for the old rows and is
not written again.

### 2.5 Pictures: up to 3 for everyone, up to 20 with Plus

His words: "a 3-image photo limit for normal users. And for premium users, they
can add as up to 20 photos."

**Screens.** The first picture is the page's head. The rest stand in a row
under About; a tap opens them one at a time. In creating, the row Pictures
opens a sheet: the pictures chosen, "Add a picture", the consent line that
exists (`campaigns.pictureConsent`), and, at three, the next place shown with
the Plus mark (`components/billing/PlusMark.tsx`); a tap on it opens the
upgrade sheet. Plus is shown where it is met and never promised to every
reader.

**A campaign with no picture** wears the app's own icon of its kind, so no one
feels they must post a photo of a sick person.

**Data.** A new table, `prayer_campaign_pictures` (5.4). The old single
`image_url` stays for the old rows.

**Rules.**

- **The server holds the limit,** from the creator's entitlement at the moment
  of the upload, as the profile banner's route does
  (`app/api/profile/banner/route.ts:63`, `subscriptionTier`). The client's own
  belief is not trusted.
- **If Plus lapses,** pictures already up stay up; no more can be added past
  three. What was given is not taken back.
- **On iPhone: corrected, 2026-11-10.** This line said that Plus was not
  sold on iPhone, so the limit there would be three and the Plus place not
  shown. That was untrue when it was written: Plus has been sold on iPhone
  since 1.8, and that build has its Plus switch on, as Android's has
  (`docs/1.9-build/OWNER-STEPS.md`, 87, found the same day from the apps
  themselves). I had read the default in `lib/entitlements/entitlements.ts`
  and not what the build is given. So iPhone was never a case of its own
  here. And the question it raised is gone with his word of that afternoon
  ("rec yes to all", `BRAINSTORM.md`): the limit is the same for every
  reader and is not a Plus perk, so there is no Plus place among the
  pictures on any phone (section 20).
- Each picture is made again by the server, checked, and held until a
  moderator has looked (3.5).
- JPEG, PNG or WebP, 4 MB at most, as now. No moving pictures.

### 2.6 The creator's updates and announcements

His words: "free users can add announcements, right, to their campaign ... Each
day they can post an update if they want."

**Screen.** The door Updates on the campaign's page: the creator's updates,
newest first, each with its day. The creator has a field at its head. Free for
everyone.

**Data.** An update is a reply of the creator's in the campaign's own thread in
Community, marked `campaign_update` (5.3). So no new table, and no second set
of safety tools.

**Rules.**

- Words only at first, a thousand characters, three a day at most.
- The filter, the spam check and holds apply, as to any reply.
- **Nobody is told by default.** A reader who carries the campaign can turn on
  "Tell me when there is an update" on its page, off until asked, as the rule
  for reminders requires (`CONTRIBUTING.md`, "Reminders and streaks"). The
  notification names nobody and says nothing of the need: the copy lives in
  `lib/push/copy.ts` and passes `lib/push/doctrine.ts`, as the campaign
  reminder's does today. This part comes last (phase 4).
- The card and the row show the day of the latest update as a date, not a
  badge.

### 2.7 Comments

His words: "allow comments on the prayer campaign, right? So users can actively
comment on the prayer campaign."

**Screen.** The door Comments: the campaign's thread, with the field at the
foot, drawn as a post's replies are.

**Data.** A comment is a reply in the campaign's thread: one row of
`community_posts` carries the campaign's id (5.3). Everything a reply has, a
comment has, with nothing built twice: the word filter, the spam check, holds,
reports, blocks, mutes, the moderators' queue, its log, its Undo.

**Rules.**

- An account is needed. A new account's comments are held (`new_account`, a
  hold reason that exists).
- The creator can close comments (`comments_open`), and can take a comment off
  their own campaign; that is logged as theirs.
- No reactions and no counts under a comment on a campaign. Community's Amen
  and its counts stay in Talk together.
- Two gaps in Community get closed with this, since a grief is where they
  would hurt (9, items 5 and 6): a reply can be reported from its own menu,
  and a blocked person can no longer write under the campaign of the one who
  blocked them.

### 2.8 Later: top campaigns by day, week, month and year

His words: "obviously this is for the future when they actually use the prayer
campaign system. They could be top prayer campaigns, right? Of the month, of
the year, of the week, of the day."

**This one meets a rule he made himself, so it waits for his word.**
`CONTRIBUTING.md`, 2026-08-22, allows "no public count of who prayed or how
often", and gives its reason:

> "Forty praying" beside one intention and "two praying" beside another ranks
> a board of needs, and it ranks it backwards: the one with two is the one
> that needs somebody.

A list of top campaigns is that ranking, even with the numbers hidden. He can
amend his own rule. If he does, this is the form I recommend:

- **Its name says what it is:** "Prayed by many", with one small switch: Today,
  This week, This month, This year. A switch that filters what is on screen is
  where a pill belongs.
- **The order is shown; no figure ever is.** No number of people, no rank
  numeral.
- **It is ordered by how many readers added it to their prayers** in that time,
  one for each account. Never by comments.
- **It never stands alone.** The board opens on "Newly asked", newest first, so
  a need nobody carries yet is seen first. "Prayed by many" is the second
  list.
- **A floor and a way out.** A campaign appears only once enough readers carry
  it that the list says nothing about any one of them, and the creator can
  keep a campaign out of it (`listed`). A campaign kept to a circle never
  appears.
- **Wording for the rule,** for his own hand: "One list is permitted, on the
  owner's word: campaigns ordered by how many readers added them to their
  prayers in a day, a week, a month or a year. The order is shown; no figure
  ever is. It stands beside the newest campaigns, never in place of them, and
  a creator can keep a campaign out of it."

**Data.** Nothing new is needed to begin: `prayer_campaign_prayers.joined_at`
is already there, and the list can be worked out by a route and kept for a
minute. A small table of sums by day comes only if the board grows.

### 2.9 A place, and details

His words: "Allow them to add a location. If it's location specific, allow them
to add details about the prayer campaign."

**Details** are the words of 2.1: six hundred characters to begin with (the
table allows two thousand).

**Place.** The row Place opens a sheet: a country, from the list the app
already has (`COUNTRIES` and `countryNamer` in `lib/onboarding/clergy.ts`,
named in the reader's own language by the device), then a town or region,
typed, sixty characters, letters only, so no street and no number. It shows as
"Thessaloniki, Greece" beside who started it.

**Rules.** Optional, and off to begin with. Typed by the creator, never read
from the device and never from the network address: the app asks for no
location anywhere today, and this does not change that. No coordinates, no
map. It passes the filter like the rest. A campaign made by a parent or
guardian for a child shows the country alone (3.6).

### 2.10 Where campaigns are found

- **Community, Pray together.** Under the head: the campaign the reader
  carries, as the card already drawn; then "Newly asked", as rows with a small
  picture each, never pills; then the prayer wall, as now. A choice of kind
  sits behind the sliders, as Talk together's filters do.
- **A campaign's page** (still 1): `/campaigns/detail?id=`, the address that
  already works in the apps. Built as a saint's page is: the picture, the
  name, three actions, three doors.
- **You:** "Campaigns you are praying" and "Campaigns you started" (existing
  words, `shop.campaignsYouArePraying`, `shop.campaignsYouStarted`).
- **A profile:** the Campaigns door, for the campaigns a reader chose to keep
  there (`keep_after_end`).
- **Sharing:** a link to the page. Its preview names nobody: "A prayer campaign
  on Purify".
- **Not in search,** in the app or outside it (4.2).
- **Every page switch moves.** The card's picture carries into the page's
  head, as his rule of 2026-11-10 asks.

---

## 3. Safety and moderation

### 3.1 The stores' rules, as their pages read on 2026-11-10

**Apple, App Review Guideline 1.2, User-Generated Content.** Apps "must
include":

- "A method for filtering objectionable material from being posted to the app"
- "A mechanism to report offensive content and timely responses to concerns"
- "The ability to block abusive users from the service"
- "Published contact information so users can easily reach you"

**Google Play, User Generated Content.** An app must have users "accept the
app's terms of use and/or user policy before users can create or upload UGC",
define "objectionable content and behaviors" in those terms, moderate, give
a way inside the app to report and to block where content is public, and
keep "safeguards to prevent in-app monetization from encouraging objectionable
user behavior". Its Child Safety Standards policy, for social apps, asks for
published standards that forbid child sexual abuse and exploitation, a way to
report inside the app, action on such material, compliance with child safety
laws, and a named point of contact.

(Apple's list is quoted from developer.apple.com/app-store/review/guidelines;
Google's from support.google.com/googleplay/android-developer/answer/9876937
and /answer/9878809. Read by a fetch tool, not by a lawyer. Whether Play counts
Purify as a social app is a question for 8.3.)

### 3.2 Each rule, what Community has, what campaigns add

| Rule | Community today | For campaigns |
|---|---|---|
| Filter | The word list masks and holds (`lib/moderation/`), the spam check refuses or holds (`lib/community/guard.ts`, `spam.ts`), a link in a prayer request is refused | The create and edit routes call the same two, which they never did. Links refused in every field. Money, phone numbers, email and street addresses held. A campaign is held until read (2.1) |
| Report | `app/api/community/report` for a post, a reply or a profile; free words only; no screen offers it on a reply | A report on the campaign (the menu at the top), on each picture (in its viewer), on each update and comment (the reply's own menu, which is new for all of Community). Reasons to tick, below. One open report a reader for each thing |
| Timely response | Three reports hide a post until a moderator looks; one from staff does (`lib/community/autoHide.ts`, `AUTO_HIDE_WEIGHT = 3`) | The same for a campaign and a picture. One report with the reason "It is about me or someone in my care", from an account older than a day, hides it at once until a moderator looks. So that this cannot be used to silence a campaign, one a moderator has cleared is no longer hidden by reports, as a cleared post is not today (`mod_cleared_at`). The aim: looked at within a day |
| Block | `app/api/community/block`; the blocker stops seeing the other's posts, replies and prayer request | The same for campaigns, updates and comments. New: a blocked person cannot comment on, or be shown as carrying, the campaign of the one who blocked them |
| Contact | support@purifyapp.net, on the Terms and in Support | The same address at the foot of every campaign's page, in words that can be selected |
| Terms before creating | Terms accepted at sign-up (`terms_acceptances`); they say nothing of Community or campaigns; no page of rules exists | A short page of rules, shown once before a reader's first campaign or comment, with "I agree", kept as an acceptance (5.6). The Terms gain a section that names what is not allowed (8.3) |
| Children | Terms: 13 and older; no age is asked anywhere | 3.6 |

**The reasons to tick on a report** (`reason_code`): It is about me or someone
in my care, and I did not agree. It gives private details of another person.
It asks for money, or links elsewhere. It is unkind or abusive. It is not a
request for prayer. A picture that should not be here. Something else (with
words).

**The rules of praying together** (a draft for his hand; the page a reader
agrees to):

1. A campaign prays for someone or something, never against anyone.
2. First names only. Nothing private about another person without their
   blessing.
3. No links, and no asking for money or goods.
4. No picture of anyone who has not agreed, none of a child unless you are the
   parent or guardian, nothing indecent or violent.
5. Speak with charity. A grief is not a place to argue.
6. We may hold or remove what breaks these, and close an account that keeps
   doing so. Anything that sexualises or endangers a child is removed at once
   and reported to the authorities.

### 3.3 What can go wrong here that a discussion board does not see

- **Asking for money.** An illness draws it. The rule is plain (no money, no
  links) and the filter holds it. No fundraising in campaigns.
- **A reader in crisis.** People who write "pray for me" are sometimes in
  danger. On certain words the app should hold the campaign for a moderator
  and show its writer, before anything else, where to reach help now: the
  local emergency number, a helpline in their country, their priest. It must
  not refuse the request for prayer. The wording is his and a priest's (8.2);
  none is drafted as final here.
- **A third party named.** First names, the blessing line (4.3), and the
  report reason that hides at once.
- **A campaign against a person,** or for a party: rule 1 and a moderator's
  eye.
- **A stranger's comment under a grief:** held when from a new account, and
  the creator can take it off or close comments.
- **Flooding:** one running campaign for a new account, three a day at most,
  the rate limits the routes already have.
- **Passing as clergy or a parish:** the clergy seal shows only for a verified
  account (`clergy_verifications`); a campaign by one wears it, nobody else's
  does.

### 3.4 The admin's moderation, and the sign-in code over it (item 64)

**One queue.** `lib/admin/communityQueue.ts` already folds what waits into one
row for each thing, and reported campaigns have a row. It gains: a campaign
waiting to be read (new), a picture waiting to be looked at (new, drawn small
and veiled until tapped), and a campaign's reports with a state. Updates and
comments arrive as replies do, with nothing new. Each row carries its buttons:
Approve, Keep held, Remove, and for what was removed, Restore. A removal waits
ten seconds with Undo, as now (`UNDO_MS`).

**The log.** Each action writes a line to `community_mod_log` with who took
it. Its list of what a line may be about gains `campaign` and `picture` (5.2).

**Who moderates what.** Readers holding the Moderator badge work the same queue
from the app (`app/(app)/community/moderate`), for campaigns, updates and
comments. Pictures are the admin's alone at first: nobody else is shown one
before it is cleared.

**The sign-in code (item 64).** `lib/community/adminStanding.ts`:
`COMMUNITY_ADMIN_NEEDS_CODE = true`, his yes of 2026-11-10. With it, an admin's
account counts as one in Community only when the session has passed the
panel's second step; until then it is "held" and its badges count for nothing.

- The admin's own campaign actions (`/api/admin/community`: remove, dismiss,
  and the new approve) are behind `getAdminUser()`, which already asks for the
  code.
- Every new campaign route that acts as a moderator must ask
  `requestStanding` and `moderatorFor`, exactly as
  `app/api/community/moderation/route.ts` does, so a session lifted from a
  browser moderates nothing. A test in the shape of
  `lib/community/__tests__/adminStanding.test.ts` holds each one.
- It changes nothing until his code is added (the admin's Settings, "Add a
  sign-in code"), and the phone apps have no place to type it, so he
  moderates campaigns from the website, as `OWNER-STEPS.md` R7 says of
  Community.

### 3.5 Pictures: checked, and their location stripped

1. **On the phone,** the picture is drawn again at 1600 pixels and sent as a
   JPEG, as the Kitchen's photos were (`lib/trapeza/upload.ts`). This saves
   the reader's data. It is not the guarantee.
2. **On the server, the guarantee:** the picture is made again from its pixels
   with `sharp`, which the app already carries, as every shop picture is
   (`lib/shop/imageNormalize.ts`: turned upright, EXIF dropped, 1600 pixels at
   most). Only that new copy is stored. So no place, no device, no hidden
   text reaches anyone. A test uploads a photo carrying a place and reads the
   stored file back.
3. **Held, out of reach.** A picture waiting to be looked at is kept in a
   private bucket, not in the public one `campaign-media` is today. It is
   copied to the public bucket only when cleared, under a random name
   (`c/<uuid>`, as `lib/campaigns/image.ts` already makes), and deleted if
   refused.
4. **An automatic check first,** for what must never be shown and for what the
   law says must be reported: known illegal images of children by their
   fingerprints, and nudity or violence by a classifier. This needs a service
   he chooses and a lawyer's word on the duty to report (8.3). Its answer is
   kept in `check_result`. No such check exists anywhere in the app today.
5. **Then a person.** Every picture is looked at by the admin before it shows,
   at least while campaigns are new.
6. **No faces are read,** matched or named by the app.
7. **Deleted** with the campaign, by its creator's hand, or with the account
   (`lib/auth/accountFiles.ts` already takes every file `upload_owners` gives
   a reader).

### 3.6 What a minor can and cannot do

**The app cannot tell.** No age is asked at sign-up or anywhere
(`components/auth/SignUpForm.tsx` has the terms tick alone). The Terms say:
"Purify is for people aged 13 and older. If you are under 18, you may use it
only with a parent or guardian's involvement" (`app/(app)/terms/page.tsx:53`).
His decision of 2026-09-25: no child profiles (`docs/DECISIONS.md:79`). The
stores list the app as 4+ and Everyone (`docs/launch/STORE-LISTINGS.md:73`).

So the rules cannot rest on knowing who is a child. They rest on what is done:

| | Anyone, child or not | Needs an affirmation |
|---|---|---|
| Read a campaign, add it to one's prayers, pray it | Yes, with no account | |
| Comment, start a campaign in words | With an account, as the Terms allow | The rules of praying together, once |
| Put up a picture | | "I am 18 or older", with the consent line. Question 5 |
| A campaign about a child | A first name; the country alone as its place | "I am this child's parent or guardian" (`consent_kind: 'guardian'`) |
| A picture of a child | | The same, and the picture is held like every other |
| Private messages | None exist in campaigns, and none are added | |

A report that touches a child's safety goes to the head of the queue. Whether
the app should ask an age before a campaign or a picture, and what the stores'
forms must then say, is the lawyer's (8.3).

---

## 4. Privacy

### 4.1 What is sensitive here

- **A named person's illness** is data about health, which European law sets
  apart and protects more strictly, and here it is often a third party's.
- **Who prays for whom** shows a person's faith and practice.
- **The departed** are outside most data law, but their families are not
  outside decency, and some countries protect them.
- **A place** narrows who a first name is.

### 4.2 What is public, and what never is

| Public (unless kept to a circle) | Never shown to anyone |
|---|---|
| The title, the first name, the words, the kind, the dates | Who added it to their prayers |
| Its pictures, once cleared | How many did, as a number |
| A country and a town, if given | Which days anyone prayed (not kept at all) |
| The creator's name and picture as Community shows them | The creator's account id, email, or anything from their account |
| Updates and comments | A reader's choice of prayers and of how long |

- **A circle.** A campaign can be kept to one circle (a parish, a household,
  friends: the circles of Read together, joined by a code). Then only its
  members can open it, its thread is the circle's own
  (`lib/community/groupAccess.ts`), and it is on no board.
- **Not for search engines.** The page says so to them, it is in no sitemap,
  and its link's preview names nobody.
- **No reading it around the app.** The table stops answering the public key
  at all (5.2). Every read is a route's, which leaves the account's id and the
  counters out.

### 4.3 Consent wording (drafts for his OK)

One line to tick before Create, chosen by who it is for, kept with its day
(`consent_kind`, `consent_at`). Today the tick is checked and thrown away.

| For | The line | Kept as |
|---|---|---|
| Oneself | "This is my own request." | `self` |
| Another living person | "They have given me their blessing to ask for prayers by name, and to share what I have written here." | `blessing` |
| A child | "I am this child's parent or guardian." | `guardian` |
| The reposed | "I am of the family, or the family has given its blessing." | `family` |
| Each picture | "This picture is mine to share, and anyone in it has given me their blessing to post it." (exists: `campaigns.pictureConsent`) | `consent_at` on the picture |

And one line of counsel over the words, in place of a rule nobody reads: "Say
as little as prayer needs. A first name is enough."

### 4.4 What a creator can delete

- **Their words:** edit them (read again by a moderator), end the campaign
  early, close comments, take a comment off.
- **A picture:** removed from the page and from storage at once.
- **Everything:** "Take this campaign down" (the control exists). Today it
  marks the row removed and deletes the one picture. Reworked, it deletes the
  campaign from the servers with its pictures, its updates and its comments
  (the tables cascade; tested, 5.5), and it leaves other readers' prayers the
  next time their app is online. The line that asks first already says most
  of this (`campaigns.takeDownConfirm`).
- **Their account:** deleting it deletes their campaigns and their join rows
  (the tables cascade from `auth.users`, read in the migrations).
- A campaign a moderator removed for breaking the rules is kept, unseen,
  for thirty days in case of an appeal or a lawful request, then deleted.

### 4.5 How long things are kept

- **Running:** until its last day.
- **Ended, for a living person:** off the board at once; deleted thirty days
  after its last day unless renewed. Nobody's illness stays up by neglect.
- **Ended, for the reposed:** the same, unless the creator ticked "Keep it on
  my profile", in which case it stays there as a memorial until they remove
  it.
- **A reader's join row:** deleted when they take the campaign out, and with
  the campaign.
- **On a reader's device:** the name and the title, while it is carried.

Question 9 for him.

### 4.6 Location kept coarse

2.9: a country and a town, typed by the creator, optional, never from the
device, never coordinates, the country alone for a child.

### 4.7 The privacy page: what it says today, and the new lines

**It says nothing of Community today.** `app/(app)/privacy/page.tsx` does not
contain the words community, campaign, picture, photo or upload (a search of
the file finds none). Posts, the prayer wall, profile pictures and banners are
live and public, and the page that promises "this page is updated first" does
not name them. That is a gap whatever is decided about campaigns (9, item 4).

**New lines for campaigns** (a draft, in the format of
`docs/1.9-build/drafts/privacy-sharing.md`; true once the rework is built as
these notes say, and not before):

> **Prayer campaigns.** A prayer campaign is public unless you keep it to a
> circle: its title, the first name of the person it is for, what you wrote,
> its pictures, its place if you gave one, your updates, and the name and
> picture on your profile. People's comments on it are public too. Give only
> what prayer needs: a first name is enough, and say nothing of another
> person's health or life that they have not agreed to share. Before a
> campaign for someone else is made, you are asked to affirm that they, or
> their family, have given their blessing, and we keep the day you did.
>
> Pictures are made again on our server before they are stored, which removes
> the place and the device a photo carries inside it, and a moderator looks at
> each one before it is shown. A place is a country and a town that you type;
> the app never asks where you are.
>
> Who has added a campaign to their prayers is never shown, to its creator or
> to anyone, and nothing is counted in public. If you are signed in, the
> campaigns you carry are kept with your account so they follow you to your
> other devices; if you are not, they are kept on your device alone. The name
> and the campaign's title are kept on your device while you carry it, and
> leave when it ends.
>
> You can end a campaign, remove a picture, close its comments, or take the
> whole campaign down at any time. Taking it down deletes it from our servers
> with its pictures, updates and comments, and it leaves other people's
> prayers the next time their app is online. A campaign for a living person is
> deleted thirty days after its last day unless you renew it. Deleting your
> account deletes your campaigns.
>
> If a campaign names you, or someone in your care, and you did not agree to
> it, report it from its page or write to support@purifyapp.net and we will
> take it down.

**German (the page says "du"):**

> **Gebetskampagnen.** Eine Gebetskampagne ist öffentlich, es sei denn, du
> beschränkst sie auf einen Kreis: ihr Titel, der Vorname des Menschen, für
> den gebetet wird, dein Text, ihre Bilder, ihr Ort, falls du einen angibst,
> deine Neuigkeiten sowie der Name und das Bild deines Profils. Auch die
> Kommentare anderer sind öffentlich. Gib nur an, was das Gebet braucht: Ein
> Vorname genügt, und schreibe nichts über die Gesundheit oder das Leben eines
> anderen Menschen, dem er nicht zugestimmt hat. Bevor eine Kampagne für
> jemand anderen angelegt wird, bestätigst du, dass dieser Mensch oder seine
> Familie den Segen dazu gegeben hat, und wir speichern den Tag, an dem du das
> bestätigt hast.
>
> Bilder werden auf unserem Server neu erzeugt, bevor sie gespeichert werden.
> Dabei gehen der Ort und das Gerät verloren, die ein Foto in sich trägt, und
> ein Moderator sieht sich jedes Bild an, bevor es gezeigt wird. Ein Ort
> besteht aus einem Land und einer Stadt, die du selbst eintippst; die App
> fragt nie, wo du bist.
>
> Wer eine Kampagne in seine Gebete aufgenommen hat, wird niemandem gezeigt,
> auch nicht dem, der sie angelegt hat, und nichts wird öffentlich gezählt.
> Bist du angemeldet, werden die Kampagnen, die du mitträgst, bei deinem Konto
> gespeichert, damit sie dir auf deine anderen Geräte folgen; bist du es
> nicht, bleiben sie allein auf deinem Gerät. Der Name und der Titel der
> Kampagne liegen auf deinem Gerät, solange du sie mitträgst, und verschwinden,
> wenn sie endet.
>
> Du kannst eine Kampagne jederzeit beenden, ein Bild entfernen, ihre
> Kommentare schließen oder die ganze Kampagne löschen. Beim Löschen wird sie
> mit ihren Bildern, Neuigkeiten und Kommentaren von unseren Servern entfernt,
> und sie verschwindet aus den Gebeten anderer, sobald deren App das nächste
> Mal online ist. Eine Kampagne für einen lebenden Menschen wird dreißig Tage
> nach ihrem letzten Tag gelöscht, wenn du sie nicht erneuerst. Wenn du dein
> Konto löschst, werden auch deine Kampagnen gelöscht.
>
> Nennt eine Kampagne dich oder einen Menschen in deiner Obhut, ohne dass du
> zugestimmt hast, melde sie auf ihrer Seite oder schreib an
> support@purifyapp.net, und wir nehmen sie herunter.

**What each sentence rests on** (so nothing is promised that the build does not
do):

- Public unless kept to a circle: `audience`, `circle_id`, and the routes'
  list of columns (5.2).
- The blessing and its day: `consent_kind`, `consent_at`.
- Pictures made again, and looked at: 3.5, steps 2 and 5, and the test of
  step 2.
- A place typed, never asked: 2.9; the app has no location permission today
  (`docs/app-store-review-notes.md:41`).
- Who has added it is never shown: no route returns join rows or counts
  (5.2, step 3), and `prayer_campaign_prayers` is readable by its own reader
  alone (the policy of July).
- Kept with the account, or on the device alone: 2.3.
- Taking it down deletes it: the cascades, tested (5.5).
- Thirty days: a scheduled job, to be built with phase 1.
- The address: `support@purifyapp.net`, the inbox the Terms now name.

**The 1.9 letter** must list the change, as the page promises ("the change is
listed in the next /whats-new letter"), in the release that turns campaigns on.

---

## 5. The data changes

### 5.1 The rules these follow

- **New files only.** No migration that has reached `main` is edited.
- **Not in `supabase/migrations/` yet.** A file there runs against production
  on the merge, so the three below stay in this note until he signs the SQL
  off. Then each is named `<YYYYMMDDHHMMSS>_<name>.sql` from
  `date -u +%Y%m%d%H%M%S` on that day, fourteen digits, later than every file
  in the folder (the newest today is `20261110012059_user_kept.sql`).
- **Each runs twice.** Every statement is "if not exists" or drops what it is
  about to make.
- **Nothing a reader can reach changes when they run:** the campaigns routes
  answer 404 while the flag stands, and Read together's circles are not
  touched.

### 5.2 File one: the campaign itself, joining it, and reports

For phase 1. What it does:

1. `intention` may also be `study`, `travel` or `other`; `status` may also be
   `held` or `ended`.
2. New columns on `prayer_campaigns` for 2.1 to 2.9, each with its check.
3. **The public policy goes.** `prayer_campaigns_public_select` is dropped and
   the table stops answering the public key. Every read becomes a route's,
   with the service role and a list of columns that leaves out `creator_id`
   and the counters. This is the code change
   `20260802000100_revoke_public_user_id.sql` says is owed, and it must land
   in the same release as the new routes; the old client code that read the
   table directly (`lib/campaigns/client.ts`, `fetchMyPrayers`) is replaced in
   that release.
4. The join row gains `places`, `until_on` and `notify_updates`.
5. Reports gain a target, a reason to tick and a state, and are held to one
   open report a reader for each thing. Old repeats are closed, not deleted.
6. The moderators' log may name a campaign or a picture.

```sql
-- Prayer campaigns, reworked: the campaign itself, joining it, and reports.
--
-- DRAFT in docs/1.9-build/notes/campaigns-fable.md. Not a migration until
-- Edgar signs the SQL off; then it is named <YYYYMMDDHHMMSS>_campaigns_rework.sql
-- from `date -u +%Y%m%d%H%M%S`, later than every file in the folder.
--
-- Follows 20260713000200, 20260713000300, 20260725000000 and
-- 20260811000000, none of which is edited. Written to run twice: every
-- statement is "if not exists", or drops what it is about to make.
--
-- Nothing a reader can reach changes when this runs: the campaigns routes
-- answer 404 while lib/campaigns/flags.ts holds WITHDRAWN_FOR_REWORK, and
-- Read together's circles (prayer_campaign_groups and its members) are not
-- touched.

set lock_timeout = '3s';
set statement_timeout = '120s';

-- 1. What a campaign may be for, and the states it may be in ---------------
--
-- Three more intentions beside the six of July: study (an exam, a school
-- year), travel (a journey) and other (anything else, in the creator's own
-- words). Two more states: held (waiting for a moderator, as a held post in
-- Community is) and ended (its last day has passed). The old checks were
-- written inline, so they are found by what they say (the way
-- 20261005000000_community_three.sql finds its own).
do $$
declare
  c record;
begin
  for c in
    select con.conname
      from pg_constraint con
     where con.contype = 'c'
       and con.conrelid = 'public.prayer_campaigns'::regclass
       and pg_get_constraintdef(con.oid) ~ 'intention'
       and pg_get_constraintdef(con.oid) ~ 'healing'
       and pg_get_constraintdef(con.oid) !~ 'study'
  loop
    execute format('alter table public.prayer_campaigns drop constraint %I', c.conname);
  end loop;
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.prayer_campaigns'::regclass
       and conname = 'prayer_campaigns_intention_check'
  ) then
    alter table public.prayer_campaigns
      add constraint prayer_campaigns_intention_check
      check (intention in ('healing', 'comfort', 'guidance', 'persecuted', 'thanksgiving', 'departed', 'study', 'travel', 'other'));
  end if;

  for c in
    select con.conname
      from pg_constraint con
     where con.contype = 'c'
       and con.conrelid = 'public.prayer_campaigns'::regclass
       and pg_get_constraintdef(con.oid) ~ 'status'
       and pg_get_constraintdef(con.oid) ~ 'removed'
       and pg_get_constraintdef(con.oid) !~ 'held'
  loop
    execute format('alter table public.prayer_campaigns drop constraint %I', c.conname);
  end loop;
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.prayer_campaigns'::regclass
       and conname = 'prayer_campaigns_status_check'
  ) then
    alter table public.prayer_campaigns
      add constraint prayer_campaigns_status_check
      check (status in ('held', 'active', 'answered', 'memory_eternal', 'ended', 'removed'));
  end if;
end $$;

-- 2. What a campaign carries ----------------------------------------------
alter table public.prayer_campaigns
  -- More than the one line of `note`: what the creator asks prayers for.
  add column if not exists details text,
  -- Its length, set by the creator: 1 to 40 days, on the creator's own
  -- calendar. ends_at (20260713000300) stays as the moment the server treats
  -- it as over, noon UTC of the day after ends_on, when that day has ended
  -- everywhere.
  add column if not exists days smallint,
  add column if not exists starts_on date,
  add column if not exists ends_on date,
  -- The prayer it places in a reader's prayers: a prayer of the prayer book
  -- by its rule and its own id (lib/prayers/rules.ts), whose words are read
  -- from the book's own files and never copied here. prayer_key (July) named
  -- lines Purify wrote; it stays for the old rows and is not written again.
  add column if not exists prayer_rule text,
  add column if not exists prayer_id text,
  -- A coarse place, only if the creator gives one: a country and a city or
  -- region by name. Never coordinates.
  add column if not exists place_country text,
  add column if not exists place_name text,
  -- Who can see it: everyone in Community, or one circle (a parish, a
  -- household, friends: prayer_campaign_groups, which Read together shares).
  add column if not exists audience text not null default 'public',
  add column if not exists circle_id uuid,
  add column if not exists comments_open boolean not null default true,
  -- Whether it may stand in a list ordered by how many carry it (later, and
  -- only on Edgar's word), and whether it stays on the creator's profile
  -- once it has ended.
  add column if not exists listed boolean not null default true,
  add column if not exists keep_after_end boolean not null default false,
  -- The creator as Community shows them, kept on the row as a post keeps its
  -- author_name, so a read never has to carry creator_id to a browser.
  add column if not exists creator_name text,
  add column if not exists creator_handle text,
  -- What the creator affirmed, and when: their own request, the person's
  -- blessing, a parent or guardian, or the family of the departed.
  add column if not exists consent_kind text,
  add column if not exists consent_at timestamptz,
  -- Moderation, as a post has it.
  add column if not exists held_reason text,
  add column if not exists mod_cleared_at timestamptz,
  add column if not exists removed_reason text,
  add column if not exists removed_by_email text,
  add column if not exists ended_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'prayer_campaigns_details_len') then
    alter table public.prayer_campaigns add constraint prayer_campaigns_details_len
      check (details is null or char_length(details) <= 2000);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'prayer_campaigns_days_range') then
    alter table public.prayer_campaigns add constraint prayer_campaigns_days_range
      check (days is null or days between 1 and 40);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'prayer_campaigns_days_order') then
    alter table public.prayer_campaigns add constraint prayer_campaigns_days_order
      check (starts_on is null or ends_on is null or ends_on >= starts_on);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'prayer_campaigns_prayer_ref') then
    alter table public.prayer_campaigns add constraint prayer_campaigns_prayer_ref
      check (
        -- Both or neither. Said this way because a check passes on NULL:
        -- "rule ~ x and id ~ x" is NULL, not false, when one of them is missing.
        (prayer_rule is null) = (prayer_id is null)
        and (prayer_rule is null or prayer_rule ~ '^[a-z0-9-]{1,80}$')
        and (prayer_id is null or prayer_id ~ '^[a-z0-9-]{1,80}$')
      );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'prayer_campaigns_place_shape') then
    alter table public.prayer_campaigns add constraint prayer_campaigns_place_shape
      check (
        (place_country is null or place_country ~ '^[A-Z]{2}$')
        and (place_name is null or char_length(place_name) between 2 and 60)
        and (place_name is null or place_country is not null)
      );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'prayer_campaigns_audience_check') then
    alter table public.prayer_campaigns add constraint prayer_campaigns_audience_check
      check (audience in ('public', 'circle') and ((audience = 'circle') = (circle_id is not null)));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'prayer_campaigns_consent_check') then
    alter table public.prayer_campaigns add constraint prayer_campaigns_consent_check
      check (consent_kind is null or consent_kind in ('self', 'blessing', 'guardian', 'family'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'prayer_campaigns_names_len') then
    alter table public.prayer_campaigns add constraint prayer_campaigns_names_len
      check (
        (creator_name is null or char_length(creator_name) <= 80)
        and (creator_handle is null or char_length(creator_handle) <= 40)
        and (held_reason is null or char_length(held_reason) <= 300)
        and (removed_reason is null or char_length(removed_reason) <= 300)
      );
  end if;
  -- A circle that is deleted takes its campaign's audience with it: the
  -- campaign is then nobody's to see until its creator chooses again, so the
  -- row is removed with the circle rather than turned public by a default.
  if not exists (select 1 from pg_constraint where conname = 'prayer_campaigns_circle_id_fkey') then
    alter table public.prayer_campaigns add constraint prayer_campaigns_circle_id_fkey
      foreign key (circle_id) references public.prayer_campaign_groups (id) on delete cascade;
  end if;
end $$;

-- The board reads what is active, soonest to end last; a circle reads its own.
create index if not exists prayer_campaigns_board_idx
  on public.prayer_campaigns (status, created_at desc)
  where audience = 'public';
create index if not exists prayer_campaigns_circle_idx
  on public.prayer_campaigns (circle_id, created_at desc)
  where circle_id is not null;
create index if not exists prayer_campaigns_ending_idx
  on public.prayer_campaigns (ends_at)
  where status = 'active' and ends_at is not null;

-- 3. No reading it straight from the table --------------------------------
--
-- July's policy let anyone holding the public key read every campaign that
-- was not removed, whole: creator_id (the account's id, which
-- 20260802000100_revoke_public_user_id.sql names as owed), the counters the
-- 2026-08-22 rule says are never shown, and now a held campaign and one kept
-- to a circle. RLS is by row, not by column, so the policy goes and every
-- read is a route's (app/api/campaigns), with the service role and a list of
-- columns that leaves those out, as Community's posts are read.
drop policy if exists "prayer_campaigns_public_select" on public.prayer_campaigns;
revoke all on public.prayer_campaigns from anon, authenticated;
grant all on public.prayer_campaigns to service_role;

-- 4. Joining: where it goes in a reader's prayers, and until when ----------
alter table public.prayer_campaign_prayers
  -- The prayers that carry it, as lib/prayers/commemoration.ts names them.
  add column if not exists places text[],
  -- The reader's own last day when it is sooner than the campaign's.
  add column if not exists until_on date,
  -- Asked for by the reader, never on by joining: a notification when the
  -- creator posts an update.
  add column if not exists notify_updates boolean not null default false;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'prayer_campaign_prayers_places_known') then
    alter table public.prayer_campaign_prayers add constraint prayer_campaign_prayers_places_known
      check (places is null or (
        cardinality(places) between 1 and 6
        and places <@ array['morning', 'midday', 'evening', 'hours', 'compline', 'mine']::text[]
      ));
  end if;
end $$;

create index if not exists prayer_campaign_prayers_notify_idx
  on public.prayer_campaign_prayers (campaign_id)
  where notify_updates = true;

-- 5. Reports: of a campaign or one of its pictures, each once, with a state -
alter table public.prayer_campaign_reports
  add column if not exists target_kind text not null default 'campaign',
  add column if not exists target_id uuid,
  add column if not exists reason_code text,
  add column if not exists status text not null default 'open',
  add column if not exists closed_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'prayer_campaign_reports_shape') then
    alter table public.prayer_campaign_reports add constraint prayer_campaign_reports_shape
      check (
        target_kind in ('campaign', 'picture')
        and ((target_kind = 'campaign') = (target_id is null))
        and status in ('open', 'actioned', 'dismissed')
        and (reason_code is null or reason_code in ('about_me', 'private_details', 'money', 'unkind', 'not_prayer', 'picture', 'other'))
      );
  end if;
end $$;

-- Until now the same reader could report the same campaign any number of
-- times. All but each reader's first open report are closed (not deleted)
-- before the index that holds them to one.
update public.prayer_campaign_reports r
   set status = 'dismissed', closed_at = now()
 where r.status = 'open'
   and r.reporter_id is not null
   and exists (
     select 1 from public.prayer_campaign_reports o
      where o.campaign_id = r.campaign_id
        and o.reporter_id = r.reporter_id
        and o.status = 'open'
        and coalesce(o.target_id, o.campaign_id) = coalesce(r.target_id, r.campaign_id)
        and (o.created_at, o.id) < (r.created_at, r.id)
   );

create unique index if not exists prayer_campaign_reports_once_idx
  on public.prayer_campaign_reports (campaign_id, reporter_id, coalesce(target_id, campaign_id))
  where status = 'open' and reporter_id is not null;

revoke all on public.prayer_campaign_reports from anon, authenticated;
grant all on public.prayer_campaign_reports to service_role;

-- 6. The moderators' log may name a campaign or a picture -------------------
--
-- community_mod_log (20261005000000) lists what a line may be about. Found
-- by what it says, as above.
do $$
declare
  c record;
begin
  for c in
    select con.conname
      from pg_constraint con
     where con.contype = 'c'
       and con.conrelid = 'public.community_mod_log'::regclass
       and pg_get_constraintdef(con.oid) ~ 'target_kind'
       and pg_get_constraintdef(con.oid) !~ 'campaign'
  loop
    execute format('alter table public.community_mod_log drop constraint %I', c.conname);
  end loop;
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.community_mod_log'::regclass
       and conname = 'community_mod_log_target_kind_check'
  ) then
    alter table public.community_mod_log
      add constraint community_mod_log_target_kind_check
      check (target_kind is null or target_kind in ('post', 'reply', 'profile', 'report', 'hold', 'term', 'clergy', 'campaign', 'picture'));
  end if;
end $$;
```

### 5.3 File two: updates and comments, as a thread in Community

For phase 2. One nullable column on `community_posts`, one on its replies. The
thread's `category` stays null: the table's check allows only `question` and
`feast` there, which the first test of this draft found. The public feed must
ask for `campaign_id is null`, as it asks for `group_id is null`
(`app/api/community/posts/route.ts`, `listPosts`).

```sql
-- Prayer campaigns, reworked: a campaign's updates and comments are its own
-- thread in Community.
--
-- DRAFT in docs/1.9-build/notes/campaigns-fable.md. Named
-- <YYYYMMDDHHMMSS>_campaign_threads.sql when Edgar signs it off, after the
-- core file. Written to run twice.
--
-- One thread per campaign: a row of community_posts that carries the
-- campaign's id. A comment is a reply to it, and an update is a reply of the
-- creator's marked as one. So the word filter, the spam guard, holds,
-- reports, blocks, mutes, the moderators' queue, its log and its Undo all
-- apply to campaigns as they stand, with nothing built twice.
--
-- A column added to these two tables is not readable with the public key
-- (20260802000100_revoke_public_user_id.sql left them on column grants), and
-- that is wanted: both are read by routes, with the service role.

set lock_timeout = '3s';
set statement_timeout = '120s';

alter table public.community_posts
  add column if not exists campaign_id uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'community_posts_campaign_id_fkey') then
    alter table public.community_posts add constraint community_posts_campaign_id_fkey
      foreign key (campaign_id) references public.prayer_campaigns (id) on delete cascade;
  end if;
end $$;

-- One thread a campaign, and the feed's own read stays an index scan: the
-- public feed asks for campaign_id is null, as it asks for group_id is null.
create unique index if not exists community_posts_campaign_thread_idx
  on public.community_posts (campaign_id)
  where campaign_id is not null;

alter table public.community_post_replies
  add column if not exists campaign_update boolean not null default false;

-- The Updates door: the creator's updates, newest first.
create index if not exists community_post_replies_updates_idx
  on public.community_post_replies (post_id, created_at desc)
  where campaign_update;
```

### 5.4 File three: pictures

For phase 3.

```sql
-- Prayer campaigns, reworked: a campaign's pictures, up to 3, or 20 with
-- Purify Plus.
--
-- The copy that was put before him, with its header in plain words and its
-- check, is docs/1.9-build/sql/campaigns-3-pictures.sql, and the statements
-- below are that file's, word for word (lib/campaigns/__tests__/closed.test.ts
-- holds the two together). Signed on 2026-11-10, and since then also
-- supabase/migrations/20261110135545_campaign_pictures.sql, after files one
-- and two (section 15). Written to run twice.
--
-- The limit of 3 or 20 is the server's to hold, from the creator's
-- entitlement at the moment of the upload (the table's own ceiling is 20). A
-- picture is stored only after the server has made it again from its pixels
-- (no EXIF, so no place and no device), and it is `held`, in a private
-- bucket, until a moderator has looked. Section 13 has what was built.
--
-- image_url on prayer_campaigns (20260725000000) stays for the old rows and
-- is not written again.

set lock_timeout = '3s';
set statement_timeout = '120s';

-- 1. A campaign's pictures ---------------------------------------------------
create table if not exists public.prayer_campaign_pictures (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.prayer_campaigns (id) on delete cascade,
  -- Where the file is: the private bucket while it waits, the public one
  -- once a moderator has cleared it. Its name is random in both
  -- (c/<uuid>.<ext>) and says nothing of whose it is; who uploaded it is in
  -- upload_owners, as for every stored file.
  bucket text not null check (char_length(bucket) between 1 and 60),
  path text not null check (char_length(path) between 3 and 200),
  -- Its place in the row of pictures; the first is the page's head.
  position smallint not null check (position between 0 and 19),
  width integer check (width is null or width between 1 and 4096),
  height integer check (height is null or height between 1 and 4096),
  -- What it shows, in the creator's words, for a reader who cannot see it.
  alt text check (alt is null or char_length(alt) <= 140),
  -- held: waiting for a moderator, seen by its creator and the moderators
  -- alone; it is new, or readers' reports have hidden it again. shown:
  -- cleared. removed: taken off by a moderator, or with its campaign; the
  -- file is deleted and the row is kept as the record.
  status text not null default 'held' check (status in ('held', 'shown', 'removed')),
  -- What the automatic check answered, in a word.
  check_result text check (check_result is null or char_length(check_result) <= 120),
  reviewed_by_email text,
  reviewed_at timestamptz,
  removed_reason text check (removed_reason is null or char_length(removed_reason) <= 300),
  -- When the creator affirmed the two lines a picture needs: "I am 18 or
  -- older", and "This picture is mine to share, and anyone in it has given
  -- me their blessing to post it". Required, and with no default: the
  -- moment is written by the route that asked, so a write that never asked
  -- cannot record that anyone affirmed anything.
  consent_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (bucket, path)
);

-- A place in the row is held by one picture at a time; a removed picture
-- gives its place up.
create unique index if not exists prayer_campaign_pictures_place_idx
  on public.prayer_campaign_pictures (campaign_id, position)
  where status <> 'removed';

-- The moderators' queue: what waits, oldest first.
create index if not exists prayer_campaign_pictures_held_idx
  on public.prayer_campaign_pictures (created_at)
  where status = 'held';

-- 2. Nobody reads it straight from the table --------------------------------
--
-- Row level security with no policy at all, and no right for the public key:
-- every read and every write is a route's (app/api/campaigns), with the
-- service role, behind the campaigns switch and the pictures' own switch.
alter table public.prayer_campaign_pictures enable row level security;
revoke all on public.prayer_campaign_pictures from anon, authenticated;
grant all on public.prayer_campaign_pictures to service_role;
```

### 5.5 How these were checked

On a scratch PostgreSQL 16.15 in this session, with stand-ins for what a
Supabase project has before any migration (the `auth` schema, `auth.uid()`,
the three roles):

- **The ground:** 97 of the 98 files in `supabase/migrations/` applied in
  order (the one that did not, `20260526000000_profiles_has_password.sql`,
  reads a column of the real `auth.users` that the stand-in lacks), then the
  six files of `docs/1.8-build/sql/`, among them `read-together.sql`, which he
  ran by hand, so the circles are as that file leaves them.
- **Twice:** each draft ran twice on a fresh copy of that ground, with no
  error. The second run changed nothing (only "already exists, skipping").
- **Old data kept:** a July campaign, a circle that follows a reading path
  with no campaign, and one reader's three reports of one campaign were put
  in first. After the drafts: the campaign unchanged, the circle unchanged,
  the first report open and the two repeats closed, none deleted.
- **The door shut:** before, the `anon` role read the campaign; after, it and
  `authenticated` are refused on `prayer_campaigns` and on the pictures, and
  the service role reads.
- **The checks hold:** 41 days, a circle audience with no circle, a town with
  no country, half a prayer reference, an unknown state, an unknown place in
  a join, a second thread for one campaign, a second picture in one place, a
  place past the twentieth, and the same picture reported twice are each
  refused.
- **Taking down:** deleting a campaign deletes its thread, its replies, its
  pictures and its join rows.
- **One fault found and fixed on the way:** the first draft's check on the
  prayer reference let half a reference through, because a check passes on
  NULL. The draft above says it the safe way and says why.

Not checked, because it cannot be from here: production itself. Before file
one is signed off, probe what is there (the public key answers 200, 404 or
401):

```
for t in prayer_campaigns prayer_campaign_prayers prayer_campaign_days \
         prayer_campaign_reports prayer_campaign_groups; do
  curl -s -o /dev/null -w "$t %{http_code}\n" \
    "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/$t?select=*&limit=1" \
    -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"
done
curl -s -o /dev/null -w "remind_enabled %{http_code}\n" \
  "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/prayer_campaign_prayers?select=remind_enabled&limit=1" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"
```

File one alters `prayer_campaign_prayers` and `prayer_campaign_reports`, and
adds a reference to `prayer_campaign_groups`. If any of the three answers 404,
its migration never ran, and that comes first, by his hand.

### 5.6 Smaller changes, each with its phase

- **An acceptance of the rules** (with the rules page, 3.2):
  `terms_acceptances.context` allows `signup`, `checkout`, `eikon_claim` and
  `seller_agreement` today; it needs `community`. One statement, found by what
  it says, as above.
- **A notification of an update** (phase 4):
  `community_notifications.kind` needs one more word.
- **Nothing is dropped.** `prayer_campaign_days`, `prayer_key`, `image_url`,
  `last_prayed_at`, `prayer_days` and the two counters stay where they are and
  are no longer written. Whether to remove them one day is his, in a file of
  its own.

---

## 6. A phased plan, with sizes

Sizes are hours of a building chat, the unit `HANDOFF.md` uses (its own
examples: Compare's line about half an hour, chants offline about three, F-49
about six). They do not include his time, a priest's or a lawyer's.

### Phase 1: the campaign in words (about 30 hours)

What a reader gets: start a campaign for anyone or anything, for one to forty
days; find it in Pray together; add it to their prayers in the places they
choose; pray it there; let it go when it ends. Reported, blocked, filtered and
read by a moderator from the first day.

| Piece | Hours |
|---|---|
| The model and the device's list (kinds, lengths, the prayer's reference, `purify.prayers.campaigns` after `wallNames.ts`), with tests | 3 |
| The routes: create through the filter and the spam check, the board, one campaign, mine, join and leave with places, the state route, end and take down, report with reasons and auto-hide; none hands out `creator_id` or a count; tests at each route, the sign-in code among them | 6 |
| The screens: Pray together's rows, the page (About), Starting one and its sheets, the joining sheet, Your rule's medallion and step, the two lines in the prayers, "Keep this name", You's rows; the pages in the list of pages with their own bar; every switch moving; five palettes; Arabic | 9 |
| Moderation: campaigns waiting and reports with a state in the one queue, the moderators' page, the log | 3 |
| About 70 new lines in 21 languages | 2 |
| The privacy lines on the page (English and German), the rules page, the release note's line, the stores' review notes | 1.5 |
| The switch's middle position, testers first, asked by every route, with tests ("What can safely ride in 1.9", below) | 1.5 |
| The gates: typecheck, unit, lint, both exports, a new section of the export walk, the website's build, the four stills rendered again from the real screens with `checkMock` | 4 |

Needs before it is built: his answers to questions 1, 3, 4, 6, 8, 9 and 10
(8.1); his sign-off of file one; the probes of 5.5.

Needs before it opens to every reader: his own walk of it on his phone; the
words for a reader in crisis, his with a priest (question 12); his OK of the
privacy lines, the rules and the Terms' new section, once a lawyer has read
them (question 13); the stores' answers (question 14).

### Phase 2: updates and comments (about 10 hours)

File two. The thread made when a campaign is cleared; the two doors and their
fields; the creator closing comments and taking one off; Report on a reply and
no writing past a block, for all of Community; tests; words in 21 languages.

### Phase 3: pictures, 3 and 20 (about 14 hours, and a wait)

File three. The pipeline of 3.5; the row and the viewer; the Plus place, its
row in `lib/premium/plusRows.ts` and its words in 21 languages; the admin's
pictures; the check service; the test that a stored photo carries no place.
The wait is for the service he chooses and the lawyer's word (8.3), not for
the code.

### Phase 4: the rest (about 16 hours)

A place (2). A campaign kept to a circle (4). The door on a profile (2). An
update's notification for a reader who asked (4; it needs native push, F-21,
which is still open). "Prayed by many" (4), only on his word.

### Beside any phase: the prayers (about 5 hours, and a search)

The three offices from Hapgood read off their page images with a test each,
and the table of which prayer goes with which need, for a priest to read. The
search for a prayer for the sick in a public-domain book is about two hours to
look, and unknown to finish.

### What can safely ride in 1.9

His two words of the same night pull apart, so this is his to settle
(question 10). First: "I wanted version 1.9 to have the prayer campaign
system, right? I never saw that implemented" (`BRAINSTORM.md`). Later, about
03:15 UTC: "remember when you finish with everything and the questions are
answered you finalize the v1.9 so I can retest it out" (`HANDOFF.md`).

**One fact decides how any of it can be walked.** A test build "talks to the
live 1.8 website and database until release day" (`notes/build-89.md`), and
today's switch is cut into a build when the build is made
(`lib/campaigns/flags.ts`). So as things stand he could not walk campaigns on
his phone before they were either open to every reader or missing from the
build.

**So the switch gains a middle position** (the hour and a half in phase 1's
table):

- **Closed,** as today: every campaign page and route answers 404.
- **Testers first:** the routes answer for the accounts the server names as
  admins, his own among them, which is the answer Testers mode already asks
  for from a phone (`app/api/admin/whoami`), and 404 for everyone else. Seeing
  campaigns early gives no powers: moderating still asks for the sign-in code
  (3.4). The onboarding was given the same kind of flag the same night, "off
  for readers and on for testers" (`HANDOFF.md`).
- **Open:** every reader.

It stays one constant in `lib/campaigns/flags.ts`, in version control with its
date and its reason, as that file argues for today. The website obeys it on a
push. An app carries the campaign pages unless its build says closed, and
shows the doors to them only when the server answers, so an app follows the
website with no new store build.

**The order, whichever release carries it:**

1. Phase 1 is built with the switch closed. Nothing of it can be reached, as
   today.
2. File one is signed and run, and the website is pushed at "testers first".
   Both are production, so both wait for his word.
3. He walks it on his phone, in a test build cut from that commit, against the
   live website: starting a campaign, clearing it as a moderator on the
   website, joining it, praying it, ending it.
4. When the walk is clean and questions 12 to 14 are answered: open, and the
   store builds are cut from that commit, with campaigns described in the
   notes for review. The release's own note names campaigns only from then: a
   note may not claim what is dark in production (AGENTS.md, the release
   ritual, 4).

A build sent to a store's review is cut closed or open, never in the middle
position. Apple asks that a new feature be "described with specificity in the
Notes for Review" and "accessible for review" (guideline 2.3.1), and forbids
"hidden, dormant, or undocumented features" (2.5.19; both as its page read on
2026-11-10).

**Recommended: 1.9 goes out as it is, and campaigns lead a small release
straight after it (1.9.1).**

- 1.9's retest and its store builds wait for nothing here.
- Phase 1 can start the day he says start, on the same branch, with the switch
  closed. Its changes to the three screens he has approved (below) wait until
  1.9 has merged, so the build he is retesting does not move under him.
- After 1.9's release day the four steps above run. The website has campaigns
  as soon as they open, and the apps have them with 1.9.1.
- The words that wait on a priest and on a lawyer (questions 12 to 14) have
  time to come back without holding a release.
- Campaigns reach the apps at about the same date either way. What differs is
  whether the rest of 1.9 waits with them, and whether a public feature about
  the sick and the departed stands on the critical path of a release he wants
  finished.

**If he wants campaigns inside 1.9's own store builds,** it can be done, and
the cost is that 1.9 reaches the stores later. Its store builds would wait for
phase 1 (about 30 hours of building, so about two days with two chats at it),
then for release day's push, his walk of campaigns and its fixes, and
questions 12 to 14. The website's 1.9 would not wait; the stores' would.

**Why not as the onboarding rides,** asleep inside 1.9 and lit on his word
(`BRAINSTORM.md`)? The onboarding lives on the device, so he can try it in a test
build before release day. Campaigns need the website and the database, so he
cannot. They would go into every reader's app unwalked, his first walk would
most likely bring fixes that need a new store build anyway, and a feature
that sleeps in a reviewed build is what the store's rule above warns of.

**Why phase 1 is safe to build beside 1.9 either way:**

- It adds pages and rows. It changes three screens he has approved only by
  adding to them: Pray together gains a section, Your rule's names gain a kind
  of medallion, and "Those I pray for" gains one line, each only for a reader
  who carries a campaign.
- While the switch is closed, no reader meets any of it, as today.
- It adds one file to a release day (file one), which changes nothing a reader
  can reach.
- The campaign for the reposed is whole today: its prayer is already in the
  app, word for word.

**Better after phase 1 in any case:** comments (the first days of a public
feature are when a moderator is busiest), pictures (a service, a lawyer, and
the stores' forms), the list, and everything in phase 4.

---

## 7. The stills

https://claude.ai/artifact/7EuY9gDq4iu5iRQNGEhfP9 (private to him until he
shares it). Four screens, one version each, as his rule of 2026-11-09 asks.

| # | Screen | Made from | New words on it |
|---|---|---|---|
| 1 | A campaign's page | `MobileTopBar` (overlay), the saint page's picture and fade, the doors (`components/ui/doors.ts`), `CommunityAvatar`, `ShareButton`, the top's one plate (`components/nav/topPlate.ts`), and the prayer from `lib/prayers/commemoration.ts` | "Updates", "Comments", "The prayer", "Pictures", "Started November 10", "Forty days, to December 19" |
| 2 | Starting one | The page for a new post (`ComposePage`): its head, its doors, its fields, its foot; the rows of Your rule; the tick of In which prayers | "A first name only, as the Church remembers them.", "What you ask prayers for", "How long", "Place", "None yet. Up to three.", "I am of the family, or the family has given its blessing.", "A campaign is read by a moderator before everyone can see it. No links, and no asking for money." |
| 3 | Joining, and where it goes | `Sheet` and `PlaceChips`, as `AddToPrayersSheet` draws them | "For how long", "Until its last day, December 19", "It leaves your prayers by itself after the last day. Only you can see this." |
| 4 | The campaign inside the prayers | The app's own Evening prayers at `CommemorationStep`, with one line added | "With the prayer campaign “Forty days for Nicholas”, until December 19." |

Everything else on them is an existing key.

**How they were made.** From the native export, as CLAUDE.md asks. In a scratch
copy of the branch, never committed: one page that draws the three proposed
screens from the app's own components, and one added line in
`CommemorationStep`. The export was built as `scripts/promo/README.md` says a
cloud session builds one (placeholder public settings, a stand-in for the
shop's two catalog pages), opened with `openPhone` at 390 by 844, and
photographed at twice that. No app code on the branch was changed.

**Rendered twice, because the branch moved.** First from `6a302fb4`. While
these notes were being checked the branch went thirty-three commits on, and
one of them changed a part still 1 is made of: build 89 note 15 put every
round button at the top of a page on one plate (`components/nav/topPlate.ts`,
`9e6fe463`). So the export was built again from `f6987145`, the campaign's
menu button was drawn on that plate as the works' reader draws its own
(`MobileWorkActions`), and all four were rendered and checked again. Stills 2,
3 and 4 came out the same to the pixel. Still 1 differs in that button and in
the weight of Share's mark. The page above shows the second render.

Two things for whoever builds this:

- Your rule's rows are now one component, `WayRow`
  (`components/prayers/mine/WayRow.tsx`, `52dbbe27`). The rows of Starting one
  and the row For how long are drawn as it draws its own, with the padding set
  by start and end (9, item 3), and should be that component.
- What a page puts opposite the way back must be one of the plates the new
  test knows (`lib/ui/__tests__/topPlates.test.ts`). The campaign's menu
  button is a new one: drawn from `TOP_PLATE`, and added to that test's list.

**The check.** `checkMock` from `scripts/mock-check.mjs`, on each still, on all
five palettes and in Arabic's direction:

```
Mock check: a campaign's page ([data-still=page])
  ok   contrast, placeholder, target, glyph, palette, gold, stripe, mirror, emdash, rays
Mock check: starting a campaign ([data-still=create])
  ok   contrast, placeholder, target, glyph, palette, gold, stripe, mirror, emdash, rays
Mock check: joining: add to my prayers ([role=dialog])
  ok   contrast, placeholder, target, glyph, palette, gold, stripe, mirror, emdash, rays
Mock check: the campaign inside the prayers (#commemoration)
  ok   contrast, placeholder, target, glyph, palette, gold, stripe, mirror, emdash, rays
```

- **One thing is excused, and named on the piece itself:** on still 4 the
  report also prints three lines marked "allowed, contrast", one for each line
  of the prayer that is not being read. Those lines are dimmed by the reader's
  own reading light as it ships (`useLitLine`), not by this proposal. They
  measure 3.82:1 on Dark and 2.31:1 on Light (9, item 7). Without the
  allowance the still fails on them, as the app's own page would.
- **What the tool could not measure** (words on the lit panels, which stand on
  a gradient) was looked at by eye on Light, Black, Candlelight and Monastery
  as well as Dark.
- **Three faults were caught before anything was sent,** and all three turned
  out to be the app's own, borrowed with its parts: the check found the rows
  2 pixels off in Arabic (9, item 3), and the eye found the rows stacked (9,
  item 2) and the doors drawn under the picture (9, item 1). The stills avoid
  each. The app has since mended the second (`52dbbe27`); the other two stand.

**By eye,** the checker's four questions:

- Built from the app's own component for the job: yes, as the table says.
- Icons from `components/ui/icons`: yes. The globe at the foot of still 2 is
  the page for a new post's own. Plus is not on the stills; "Up to three" is
  what every reader has.
- Sample words plain: the campaign's words are a plain request; the prayer is
  the Church's, read from the app's own data and not typed.
- Existing words first: every label that had a key uses it; the new lines are
  listed above.

**The sample.** "Forty days for Nicholas" is the sample the 1.8 sheet used
(`lib/community/runningCampaign.ts`). It is a campaign for the reposed because
that is the one kind whose prayer the app carries today. The picture is the
app's own icon of the Resurrection (`lib/prayers/icons.ts`, public domain),
standing where a campaign's first picture would be.

---

## 8. What waits on Edgar, on a priest and on a lawyer

### 8.1 His word (each with a recommendation; "all recs" answers them)

1. **Is every campaign read by a moderator before it is public?** Recommend:
   yes while campaigns are new; a trusted creator publishes at once later.
2. **Top campaigns against his rule of 2026-08-22.** Recommend: later, as
   "Prayed by many", the order shown and no figure, beside "Newly asked", with
   a way for a creator to stay out; and he amends the rule in his own words
   (2.8).
3. **Lengths.** Recommend: a day, a week, thirty days, forty days, or a chosen
   last day up to forty days; longer needs are renewed.
4. **A reader's own shorter stay** (until its last day, a week, today only).
   Recommend: yes, with "until its last day" ticked.
5. **Pictures.** Recommend: 3 and 20 as he said; each held until looked at;
   "I am 18 or older" to put one up. (Corrected 2026-11-10: this ended
   "three on iPhone until Plus is sold there", which was untrue, since Plus
   has been sold there since 1.8; see 2.5. And answered since by his word:
   one limit for every reader, five, and no Plus place; section 20.)
6. **Who can see it.** Recommend: everyone in Community, or one circle; the
   reader chooses when creating.
7. **The prayers.** Recommend: ingest the three offices from Hapgood (study,
   journey, thanksgiving); look for a prayer for the sick in a public-domain
   book; until then a campaign for the living carries the name, and a psalm if
   the creator wishes. The line over the living stays the one he chose in
   1.7.1.
8. **No links and no asking for money.** Recommend: yes.
9. **How long an ended campaign is kept.** Recommend: thirty days for the
   living unless renewed; for the reposed, as long as its creator keeps it on
   their profile.
10. **1.9 or after.** Recommend: 1.9 goes out as it is; phase 1 is built
    beside it with the switch closed, opens to testers first (his own
    account), and leads a small release straight after (1.9.1). Campaigns
    inside 1.9's own store builds can be done, and hold those builds for it
    (section 6).
11. **Comments.** Recommend: the creator can close them and take one off; no
    reactions under a campaign.
12. **The words for a reader in crisis** (3.3). His, with a priest.
13. **The privacy lines** (4.7), **the rules of praying together** (3.2) and
    the Terms' new section. His OK, after the lawyer.
14. **The stores' forms:** the age rating answers and Play's child safety
    form, now that public content is back. His, after the lawyer.
15. **The table prayers as a seventh place** for "the dinner". Recommend: no;
    Evening prayers is where the books keep names.
16. **The name.** Recommend: keep "Prayer campaigns", his own word.

### 8.2 A priest

- Which prayer goes with which need, and whether a reader may say in their
  own rule a prayer the book gives to a priest. The same question is already
  open for the prayer over the departed (`docs/editorial-standards.md`, Clergy
  item 17).
- The forty days as the length offered first for the reposed.
- The words shown to a reader in crisis.
- Whether a list ordered by how many pray is fitting at all (2.8).
- The line the app keeps at the foot of every campaign ("Campaigns are the
  prayers of the faithful, not the teaching of the Church ..."), which stays.

None of this is shown to readers as awaiting review (his rule of 2026-11-06);
the marks stay in the files.

### 8.3 A lawyer

- **The Terms and the rules:** a section for Community and campaigns that
  names what is not allowed, and the acceptance before a first campaign or
  comment. The lawyer's pass on the Terms is already an open item
  (`docs/editorial-standards.md`, "Rights / legal").
- **Health data of a third party,** and data that shows a person's faith,
  under European law: whether a creator's affirmed blessing is enough, what
  the page must say, and how a named person asks for removal.
- **The departed:** the countries where a family has rights over a dead
  person's data.
- **Children:** the 13 in the Terms against no age being asked; whether a
  campaign or a picture should ask an age first; what the stores' newer age
  rules require; the app's 4+ listing.
- **Pictures:** the duty to report illegal images of children once known, to
  whom, and what must be kept; the choice of a checking service.
- **Play's child safety standards** and whether they bind Purify; **Europe's
  rules for services that host what users post** (a contact point, a way to
  give notice, reasons given when something is removed).

I am not a lawyer and none of section 3 or 4 is legal advice. They are the
design a lawyer should be asked to read.

---

## 9. Found on the way

Not part of the design. Each was seen while reading or while making the
stills, and each is for the chat whose area it is. None was fixed here: no app
code on the branch was touched. The first ten were held against `f6987145`
before this file was pushed: item 2 has been mended by another chat in the
meantime; item 1 was measured again on the second export and stands to the
number; the files the rest name did not change in those thirty-three commits,
but for the stylesheet, whose changes touch neither item 3's rule nor item
7's reading light. The eleventh was found on the second render.

1. **The page for a new post draws its doors under its picture.** In the
   export, Discussion, Ask a Priest and Share a line cannot be seen: the doors
   stand from 193 to 267 pixels and the head's picture reaches 284 and is
   painted over them (`components/community/ComposePage.tsx`). With the
   picture hidden they are there. The smallest fix: `relative` on the block
   that holds the doors. `checkMock` on the same page also fails Close (42.5
   pixels), the title field (41.6 pixels tall) and the house rules line (3.82:1
   on Dark, 2.31:1 on Light). Worth a look on a phone before 1.9.
2. **Build 89 note 14 had this cause, and is mended since.** `.set-row` is
   `display: block` (in `app/globals.css`), and it wins over `flex` on the
   same element, so "In which prayers" stacked. My first still stacked the
   same way with the same classes. The chat that took note 14 found the same
   cause and mended it while these notes were being written (`52dbbe27`): all
   three of Your rule's rows are now one component, `WayRow`. Nothing is left
   to do.
3. **That row sits 2 pixels off in Arabic.** `.rule-way` sets its padding by
   left and right (`padding: 11px 14px 11px 12px`, in `app/globals.css`), and
   since `52dbbe27` all three of Your rule's rows wear it.
   `padding-inline: 12px 14px` mirrors it. Found by the checker.
4. **The privacy page says nothing of Community** (4.7): posts, the prayer
   wall, profile pictures and banners are public and unnamed there.
5. **No screen offers Report on a reply.** The route takes one
   (`app/api/community/report/route.ts`); only a post's menu calls it
   (`CommunityClient.tsx:1245`). Apple's rule asks for a way to report
   content.
6. **A block does not stop writing.** A blocked person can still reply under
   the posts of the one who blocked them (the replies route's POST never asks),
   and that reply still notifies (`notifyOfReply` in `lib/community/notify.ts`
   does not look at blocks; mentions and follows do).
7. **The prayer reader's dimmed lines are under the contrast floor on every
   palette:** 3.82:1 Dark, 2.31:1 Light, 3.66:1 Black, 2.86:1 Candlelight,
   3.39:1 Monastery, against 4.5:1. They are the reading light he likes
   (build 89 note 7). Candlelight's stepped-back verses were lifted for the
   same reason on 2026-11-09 (`d24b9161`). His call.
8. **The prayer wall still sends a count.** Nothing draws it, by design
   (`PrayerWall.tsx`), but `app/api/community/prayer-wall` hands every reader
   how many prayed for each request.
9. **The stores' age answers predate Community.** The listing says 4+ with "no
   objectionable content in any category" (`docs/launch/STORE-LISTINGS.md:73`)
   while public posts are live.
10. **A blessing ticked is not kept.** The campaign's consent and the
    picture's are checked when sent and then forgotten
    (`lib/security/schemas.ts:419`, `:435`). File one keeps them.
11. **A field the page focuses before any touch still wears the white box.**
    The quiet edge of build 89 note 11 is drawn only once the app has seen a
    tap (`html[data-input="pointer"]`, set on the first `pointerdown`,
    `components/ui/InputModality.tsx`). The page for a new post puts the
    caret in its words field by itself, so opened at its own address that
    field shows the keyboard's ring: 2 pixels of white at 70 percent,
    measured in the export at `f6987145`. After one tap the same field
    measures the new edge, 1 pixel at 32 percent. A reader who arrives by
    tapping never sees it; a page opened whole does (a link, a reload, the
    app brought back to that page). For the chat that holds note 11.

---

## 10. Phase 1, as built (2026-11-10)

**The word.** His answer to every question of 8.1, relayed by the arbiter:
"ok to all", 2026-11-10, about 04:13 UTC, covering items 116 to 128 on his
page, every recommendation as written (`BRAINSTORM.md`). About 04:20 UTC his
word changed item 116: "ok to all ensure its all in v1.9". And about 04:48
UTC: "finalize all of this and let's get going", so finished work no longer
waits for his eye before a push behind the switch.

What that makes the rules of the build, as the arbiter relayed them:

- Campaigns are in 1.9: phases 1, 2 and 4. Pictures (phase 3, item 121) and
  "Prayed by many" (item 118) are built and ship in 1.9 switched off, by a
  switch on the server, and turn on with no store build once the image
  checking service and the lawyer are done.
- The SQL goes into `supabase/migrations`, where the merge of 1.9 runs it on
  production, and only after he has signed the SQL itself. Until then it
  waits in `docs/1.9-build/sql/` (10.2).
- With the switch closed the app behaves exactly as it did, and a test holds
  that.
- Prayers come from the prayer book only (123).
- Each push is behind the switch, in commits that can be read one at a time,
  with the stills sent to the arbiter at the push.
- Still his own word, and not built around: the SQL's signature, the words on
  the privacy page and in the Terms (113), the words for a reader in crisis
  (129), the stores' forms (130), and anything on main or production.

**The stills, of the real screens:** https://claude.ai/artifact/SCpqiXD3xgQP6cmrCxLpL9
(private; sixteen, one of each screen). The four of section 7 were drawings
of a proposal; these are the screens.

### 10.1 What is in the app now

Everything is behind one constant, `CAMPAIGNS_OPENING` in
`lib/campaigns/flags.ts`, committed `closed`.

| Part | Where |
|---|---|
| The switch in three positions, and who campaigns are open for | `lib/campaigns/flags.ts`, `opening.ts`, `useCampaignsOpen.ts`, `app/api/campaigns/open` |
| The model: kinds, lengths, the psalms a campaign may name, the blessing, what a reader is handed | `lib/campaigns/model.ts` |
| The device's list of carried campaigns | `lib/campaigns/carried.ts`, `useCarried.ts`, `useCampaignUpkeep.ts` |
| The routes: the board, one campaign, start, close and keep, take down, join and leave, the state of those carried, mine, report | `app/api/campaigns/**`, `lib/campaigns/server.ts` |
| The screens | `components/campaigns/*`, `app/(app)/campaigns/**` |
| Pray together's section, and the card for the campaign a reader carries | `components/campaigns/PrayTogetherCampaigns.tsx`, `components/community/CampaignCard.tsx` |
| In the prayers: the name in Those I pray for, the psalm as a step | `components/prayers/service/CommemorationStep.tsx`, `components/campaigns/CampaignPsalmSteps.tsx`, `lib/campaigns/psalms.ts` |
| Your rule: the medallions, and "Keep this name?" | `components/campaigns/CampaignNames.tsx` |
| Moderation: the four decisions, reports that hide, the queue | `lib/campaigns/moderation.ts`, `app/api/community/moderation`, `app/api/admin/community`, `lib/admin/communityQueue.ts`, `components/campaigns/CampaignModeration.tsx` |
| Kept only as long as was said | `lib/campaigns/upkeep.ts`, from `lib/ops/maintenance.ts` |
| The new lines, 93 of them, in all 21 languages | `lib/i18n/messages/*.json` |
| The stills and the walk, to run again | `scripts/mock-campaigns.mjs` |

July's screens and client went (`CampaignsClient`, `CampaignDetailClient`,
`CreateCampaignClient`, `CampaignGroup`, `CampaignProgress`, `MyPrayers`).
July's routes for praying, reminding, groups and the picture are kept and
closed for good (`julyCampaignRoutes()`), as the Vault asks: nothing made is
deleted that could be wanted, and their tables are untouched.

### 10.2 The switch, and the order to open it

`closed`: every route answers 404 and reads nothing; every campaign page is
not found; the device asks the server nothing and neither reads nor writes
its list; no screen draws anything of campaigns.

`testers`: the same build serves everyone, and campaigns answer only for the
accounts the server names as admins (the list Testers mode already asks
about). Everyone else finds exactly what a closed build gives them: the
pages draw the app's own not-found page (`CampaignsGate`). Moderating still
asks for the sign-in code, as it does for a post.

`open`: for everyone.

**File one is signed** (2026-11-10, "R0b yes 1", on its summary in plain
words; `HANDOFF.md`) **and is now a migration:**
`supabase/migrations/20261110084116_campaigns_rework.sql`, word for word the
copy below, which the merge of 1.9 runs. A test holds the two together.
Files two and three were held out of that folder by the same test until he
signed them later that day, and are migrations too now (section 15).

**The SQL, as it was put before him:** `docs/1.9-build/sql/campaigns-1-rework.sql`.
It is file one of 5.2, word for word (a test holds the two together), under a
header in plain words: what it changes, what a reader can reach once it has
run (nothing new), what happens to July's campaigns (nothing), and a read-only
check to run after it. It makes no new table. It ran twice on a scratch
PostgreSQL 16 standing on every migration in the folder as of this date, and
the schema after the second run is the schema after the first. Files
two and three (updates and comments; pictures) join it in `docs/1.9-build/sql/`
as their phases are built against them. File two is there now:
`docs/1.9-build/sql/campaigns-2-threads.sql` (section 11).

**Release day, in order** (his word through the arbiter, and
`OWNER-STEPS.md` R2 to R5d). The constant stays `closed` on the branch until
then.

1. The merge to main carries the constant at `testers`. The website has the
   server side, for his account alone, and the SQL he signed runs. Until it
   has run, a build at `testers` shows nothing: every route that meets the
   missing columns answers 404 and says so in the log.
2. Both store builds are cut from that commit and go to internal testing. He
   walks campaigns on his phones: starting one, clearing it as a moderator on
   the website, joining it, praying it, ending it.
3. One line moves the constant to `open` on main: the website, for every
   reader. That is his word, and it waits for the words that are his, a
   lawyer's and a priest's: the privacy page's lines and the Terms' section
   (113), and the words for a reader in crisis (129).
4. The stores go public with the builds he walked. Cut at `testers`, they ask
   the website, which now says open, so they show campaigns to every reader
   with no new store build. Two quiet places in such a build read the
   constant itself and wait for the next store build: the Discover menu's row
   on a wide screen, and the free plan's line that names campaigns. Neither
   promises anything that is not there.

**What the stores' rule asks of this.** Apple wants a new feature "accessible
for review" and forbids "hidden, dormant, or undocumented features" (section
6, with the guideline numbers). So step 3 comes before step 4: a build
reviewed while the website still says `testers` carries campaigns asleep. If
step 3 has to wait for the lawyer or the priest, the choice is his: hold the
stores, or send the builds with campaigns named in the notes for review as
switched off. Pictures and "Prayed by many" are in that second position by his
word either way, so the notes for review name them plainly (his item 130).

### 10.3 What holds it

- `lib/campaigns/__tests__/closed.test.ts`: the arbiter's rule 2. The
  constant is committed closed and read from no setting of the environment;
  each of the five pages is not found before anything of theirs is drawn;
  the device makes no request and touches no list, whatever it holds; the
  screens that carry campaigns reach them only through the two gates; only
  SQL he has signed is in `supabase/migrations`, word for word as he signed
  it; and the file put before him is the SQL that was checked, word for word.
- `routes.test.ts`: every route, run against an in-memory database: closed
  means 404 and no read; testers first; 404 where the SQL has not run; a
  campaign is written held; no response carries an account id or a count;
  and July's campaigns run for nobody (10.6).
- `moderating.test.ts`: the moderators' queue by the switch and by the
  sign-in code; the team's one queue (one row a campaign, danger first); how
  long a campaign is kept, and July's rows left alone.
- `model.test.ts`, `carried.test.ts`: the pure parts.
- The stills: sixteen screens, each passing `checkMock` on all five palettes.
- The walk (`WALK=1 node scripts/mock-campaigns.mjs`): seven flows in the
  browser against the export, with what each sends checked.

### 10.4 Where the build differs from the design above, and why

- **The title is typed, never composed** from the parts (2.1 offered both):
  a composed "Forty days for Nicholas" needs the name's case in twenty
  languages.
- **The blessing is one choice among three for the living** (someone else,
  me, a child in my care), which sets what is kept (`consent_kind`). For the
  reposed it is one line to tick.
- **The page has no doors row.** About, Updates and Comments were its three
  doors; with updates and comments in phase 2 there is one, so the page is
  one column until then.
- **A psalm follows the names** as a step of its own. In Your rule it moves
  with "Those I pray for", which the reader can already drag. Dragging it
  apart from the names is not built.
- **Keeping a campaign for the reposed** (125) is a switch in its creator's
  menu, since the profile's Campaigns door is phase 4. Kept, it stays at its
  own address and among "Campaigns you started".
- **A campaign that waits for a moderator cannot be shared** by its creator:
  its link opens for nobody else yet.
- **On the card, a campaign for the living shows the line the app's own
  prayers say over the living**, with no printing under it, because it has
  none: it is ours since 1.7.1 and is marked for the clergy's review
  (`COMMEMORATION_REVIEW`). No new words were written for campaigns.
- **A psalm's printing is its rule's own words about its psalms, cut and
  never rephrased.** The rule's line also names the printings of its
  petitions, which are not the psalm's.
- **Upkeep rides the heartbeat** (`/api/cron/hourly-goals`), as housekeeping
  does, so it needs no new line on Render.

### 10.5 Not built yet, and the order for 1.9

In this order, each pushed behind the switch with its stills:

1. **Phase 2, updates and comments:** built (section 11): the creator's
   updates; comments, which the creator can close or take one off; no
   reactions (126); no links and no asking for money (124); file two of the
   SQL.
2. **"Prayed by many"** (118), built and switched off on the server: no
   number, and a creator can stay out.
3. **Pictures** (121): built and switched off on the server (section 13): 3,
   or 20 with Plus, each checked before it is shown, with "I am 18 or older";
   file three of the SQL. Off until the image checking service is chosen and
   the lawyer has answered.
4. **The new lines in twenty languages**, in one pass, and the screens held
   to the eighteen looks.

**Moved to 1.9.1 by his word** ("all recs", 2026-11-10, about 08:25 UTC;
`BRAINSTORM.md`): phase 4, the rest in words. One circle as the audience
(122); a place; a campaign's door on its creator's profile; changing a
campaign's words after it is sent (read again by a moderator); "Run it
again"; telling a creator that a moderator has decided, and notices of an
update for a reader who asks; a choice of kind behind the sliders on the
board. File one already carries the columns the circle and the place need,
so 1.9.1 brings no change to the campaigns table for them.

Not built, and not to be built without his word: the crisis words a reader is
shown (129). Only the hold in the moderators' queue is built, and it reads
English alone.

### 10.6 Found while building

- **Your rule's small lines were under the contrast floor.** A list's name
  (58 percent) and a medallion's line (50 percent) are written in the
  stylesheet and not as `text-paper` utilities, so the lift of faint text
  never reached them: 3.72:1 and 2.97:1 on Light, 3.91:1 on Candlelight,
  measured on the export. Mended in `app/globals.css`, each palette at the
  share that lift gives it, with a test in `yourRulePage.test.ts`. The fault
  was the page's own, on every name a reader keeps.
- **The campaign card's buttons were 38 pixels.** It was drawn for 1.8 and
  never shown, since no campaign ran. They reach the 44 pixel target now
  (`hit-44`), with not a pixel of ink moved.
- **July's campaigns would have come back with the board.** July's rows are
  still in the table: public then, with no last day, and never read by a
  moderator. The first build of the board listed whatever was active and
  public, so on the day campaigns opened, a months-old campaign for someone's
  illness would have stood on it with no end, and a reader who tapped
  "prayed" once in July would have found it among those they carry. Now the
  rework runs none of them (`isJulyRow`: a campaign with no length). Nobody
  is shown one but the reader who started it, who finds it among their own as
  ended and can take it down; it is on no board, joined by nobody, carried by
  nobody and not counted against the campaigns its creator may run; and the
  row itself is left exactly as it was. `routes.test.ts` holds each of those.
  **Production holds one**, probed on 2026-11-10 at 08:38 UTC with the
  site's own public key and nothing fetched but its state: active, for the
  living, its last day long past. **What becomes of it in the end is his to
  say** (kept unseen as now; or deleted after a date, which item 125's
  "nobody's illness stays up by neglect" argues for).
- **Production, probed the same minute: file one had not run.** The arbiter
  relayed his words of that morning, "ran both sql's and success", as file
  one run by hand. The probe said otherwise, in Postgres's own words:
  `column prayer_campaigns.days does not exist`, and the same for `places`
  on the join rows; and the public key still read the campaigns table, its
  creator's account id with it, which file one's section 3 closes. So nothing
  was recorded as applied, and the file's header still says it is not. The
  rule this follows is the house's own: being recorded is not the same as
  having run. Checked at the same time, from main's code at `27f1bcaf`: when
  file one does run, nothing in the live 1.8 site reads either table with the
  public key (every campaign page is not found and every route answers 404
  first; the one direct read is July's "My prayers" screen, which no page
  mounts and which fails quietly), and no row policy, view or trigger on any
  table reads the campaigns table.
- **The prayer page changed under the build** (build 89 note 7: nothing is
  ticked under a prayer, each is counted as it is passed, and a long hold
  saves one). A campaign's psalm follows: it is not one of the rule's own
  prayers, so passing it counts nothing, and a long hold saves the psalm
  itself under its own rule in the prayer book.
- **The guard on Your rule was restated.** `yourRulePage.test.ts` forbade
  the word "campaign" in the page's four files, which was 1.9's way of
  saying nothing is drawn. It now holds that `Diptychs` mounts exactly one
  part for campaigns, and that the part is empty while the switch is closed.
- **Three Serbian campaign lines stood in Latin script** in a Cyrillic
  catalog. Set in Cyrillic, letter for letter. 143 other Serbian lines are
  still Latin; they are not campaigns' and were left.
- **The Russian, Greek and Polish catalogs name the feature in two or three
  words** each (the heading one way, the running text another). The new
  lines follow each catalog's commonest word. A native reader should settle
  one for each.
- **The moderators' page draws red and typed-in black** (`border-crimson`,
  `bg-black/25`), which `checkMock` refuses on Light. The campaign cards on
  it are drawn in the palette's own ink. The page's older cards were left to
  the chat that holds it.

---

## 11. Phase 2, as built: updates and comments (2026-11-10)

His words: "free users can add announcements, right, to their campaign ...
Each day they can post an update if they want", and "allow comments on the
prayer campaign". His yes to item 126 (its creator can close comments and take
one off; no reactions) and to item 124 (no links, no asking for money).

### 11.1 What a reader sees

A campaign's page has three doors under its head, the squares a saint's page
and a profile wear: **About** (what the page was: the words, the prayer, the
psalm), **Updates** and **Comments**. The open door is kept in the address
(`#updates`, `#comments`), as a saint's page keeps its own. A campaign that
waits for a moderator has no doors yet, and one of July's has none.

- **Updates** are its creator's own word to those who pray, newest first,
  each under its day. The creator has a field at the head: words only, a
  thousand characters, three a day.
- **Comments** are drawn as the replies under a post are, oldest first, with
  the field at the foot for a signed-in reader. A comment has a menu: Report
  on someone else's; Delete on one's own; and, for the campaign's creator,
  Take off, on a comment under their campaign.
- **Nothing is counted and nothing can be reacted to.** No number stands on a
  door, under a comment or anywhere on the page.
- The creator's menu gains one row, **Comments**, a switch. Closing stops new
  comments; those already written stay. Updates still go up.
- **Pray** leads to the prayer from any door: About opens, then the prayer.

### 11.2 How it is kept

Both are replies in the campaign's own thread in Community, as 2.6 and 2.7
proposed, so the word filter, the spam guard, holds, reports, blocks, mutes,
the moderators' queue, its log and its Undo apply as they stand, with nothing
built twice. **One thing changed from the draft of 5.3, and it is the
important one.** There, a thread was a post that carried the campaign's id,
and every read of Community would have had to learn to skip it. Here a thread
is a post with a state of its own, `campaign`:

- Every read of Community already asks for a post that is `visible`: the
  feed, a post's page, its replies, a profile, the weekly letter. So a thread
  is in none of them, with no read changed.
- The tables' own row policies ask the same, and a reply can be read only
  when its post is visible (`20260811000100_community_group_threads.sql`). So
  neither a thread nor one comment under it can be read with the public key.
  **Checked on a scratch PostgreSQL with that key's role:** it read Talk
  together's post and reply, and no thread and no comment.
- A thread must say `campaign` and only a thread may; one thread a campaign;
  deleting a campaign deletes its thread and every comment under it. Each
  was tried on the scratch database and held.

**The SQL, for his signature:** `docs/1.9-build/sql/campaigns-2-threads.sql`
(file two; it replaces the draft in 5.3, which is left as it was written). It
makes no new table: one column and one more state on posts, one column on
replies. It ran twice on the scratch database standing on every migration and
on file one, and the schema after the second run is the schema after the
first. Not signed when this was written; signed since, and a migration
(section 15).

| Part | Where |
|---|---|
| Reading a thread, writing a note, taking one off, the guards | `lib/campaigns/thread.ts` |
| The route | `app/api/campaigns/[id]/thread` (GET, POST, DELETE) |
| Opening and closing comments | `app/api/campaigns/[id]` (PATCH `commentsOpen`) |
| The doors, and the two panels | `components/campaigns/CampaignDoors.tsx`, `CampaignNotes.tsx` |
| No reaction under a campaign | `app/api/community/reactions`, `app/api/community/responses` |
| A held comment approved tells nobody yet | `lib/community/moderation.ts`, `restoreReply` |

### 11.3 The rules a note is held to

- **A campaign that is running**, and one of the rework's: not one that
  waits, has ended, was removed, or is July's.
- **An update is its creator's alone**, three a day.
- **A comment needs an account**, comments open, and a writer its creator has
  not blocked.
- **No link**, as the campaign itself carries none: refused, with its reason.
- **Words that ask for money wait for a moderator.** They are held, not
  refused, since "we gave to the parish in his memory" asks for nothing. The
  pattern reads English alone, which is said in the code: an ask in another
  language is caught by a reader's report and by the spam guard's own signs.
- **The word filter asks first**, as under a post, and the words as written
  go to the moderators with the masked ones.
- **The spam guard** holds or refuses as it does a reply: a new account's
  first words wait.
- **Its own writer deletes a note**, and it is gone. **The campaign's creator
  takes a comment off**: the row is kept, marked removed as a moderator's
  removal is, and the moderators' log names the creator, so a creator cannot
  quietly erase what a moderator may need to read.
- **Nobody is told of anything yet.** No notice goes out for an update, a
  comment or an approval under a campaign. Notices come in phase 4, asked for
  by each reader and off until then.

### 11.4 With the switch closed

Nothing of this is reached: the thread route answers 404 and reads nothing.
The two guards in Community's reaction routes read nothing either while
campaigns are closed, so a reaction in Community costs exactly what it did,
and the approval of a held reply reads its parent only where it always did.
`thread.test.ts` holds each.

### 11.5 What holds it

- `lib/campaigns/__tests__/thread.test.ts`, 28 cases against the in-memory
  database: the switch; who may read; no account id and no count in what a
  reader is handed; blocks and mutes; each rule of 11.3; taking one off and
  its line in the log; the guards on reactions; and that every read of
  Community still asks for a post that is visible.
- `closed.test.ts`: file two was held out of `supabase/migrations` until he
  signed (section 15: it is held to the signed words now), and has to go on
  giving a thread its own state.
- The stills and the walk (`scripts/mock-campaigns.mjs`): two more screens
  and three more flows.

### 11.6 Found in review, and closed

Admin read files one and two on their own and found both safe at the merge,
with nothing to change. The same reading found one hole in the app, which is
closed: **a campaign's creator could have deleted the whole thread.** A
thread is a post of the creator's, and Community lets a post's author delete
their own post, with every reply under it. His yes to item 126 gives a
creator two things only, to close comments and to take one off. Community's
delete now answers "not found" for a thread, as every other read of
Community does, and a thread goes only with its campaign.
`thread.test.ts` holds it both ways: a thread cannot be deleted there by
anyone, and a post of Talk together still can by its writer.

### 11.7 Not built in this phase

- On the moderators' page a held or reported comment is drawn as any reply
  is, with no word that it stands under a campaign (the hold's own line says
  so only when it asked for money).
- The day of the latest update on a campaign's card and row (2.6).
- Telling anyone anything (phase 4).

---

## 12. The parts that ship switched off, and "Prayed by many" (2026-11-10)

His word, as `BRAINSTORM.md` records it: pictures and top campaigns are "built
and shipped switched off by a server-side switch until the image check service
and the lawyer, then turned on with no store build".

### 12.1 The switch for a part

`lib/campaigns/parts.ts` holds two constants, `many` and `pictures`, both off.

- **A constant in version control,** as the campaigns' own switch is and for
  its reasons: a date, a reason, and nothing a dashboard can flip.
- **The server's alone.** The file can only be loaded on the server. No app
  reads a part from its own bundle: it is told, by the same answer that tells
  it campaigns are open (`app/api/campaigns/open`), and believes a part is on
  only on a plain yes. So the website's value is every app's value, and
  turning a part on is one line on main and no store build.
- **Off is off on the server too.** A part's routes answer 404 and read
  nothing while it is off, so a request written by hand reaches nothing the
  screens do not offer.
- **What the stores' rule asks** (10.2): both parts are in the reviewed
  builds and asleep, by his word, so the notes for review name them
  (`OWNER-STEPS.md`, R5d).

### 12.2 "Prayed by many" (his item 118)

Built to the form 2.8 proposed and he said yes to, and no wider:

- **A second list on the board,** under "Newly asked" and never in its
  place, with one switch for the time, in his own words for them: Day, Week,
  Month, Year. A switch that filters what is on screen is where a pill
  belongs.
- **An order, and never a figure.** A row is the board's own row: what a
  campaign is for and until when. The route hands on campaigns and nothing
  else; the tally is made on the server, used to sort, and dropped.
- **Ordered by how many readers with an account added a campaign to their
  prayers** in that time, one each. A reader who carries a campaign on the
  device alone tells the server nothing, and is not counted: that is kept so.
- **A floor of five.** Under it a campaign is not listed at all, so the list
  never says who carries a small one. While no campaign in the whole year has
  reached the floor, the list is not drawn.
- **A way out.** Its creator's menu has a switch, "In Prayed by many", on to
  begin with. A campaign kept to a circle, one of July's, one that waits or
  is over, and one by someone the reader has blocked or muted are never in
  it.
- **Kept for a minute,** so the board cannot be used to watch one reader
  join.

**Two things stood between this and the day it was turned on, both his,
and both are done (2026-11-10, section 19):**

1. **His own rule.** `CONTRIBUTING.md` (2026-08-22, "On prayer, no figures at
   all") allowed no list ordered by how many pray. It now carries the one
   exception, in his words, with the date.
2. **One line:** `many: true` in `lib/campaigns/parts.ts`, on the branch, so
   it is on wherever campaigns are.

It needs no SQL: the join rows and `listed` are file one's.

| Part | Where |
|---|---|
| The switches | `lib/campaigns/parts.ts` |
| What an app is told, and believes | `app/api/campaigns/open`, `lib/campaigns/useCampaignsOpen.ts` (`useCampaignPart`) |
| The list | `lib/campaigns/server.ts` (`listMany`), `app/api/campaigns/many` |
| The board's second list | `components/campaigns/PrayedByMany.tsx` |
| The creator's switch | `components/campaigns/CampaignPage.tsx`, `app/api/campaigns/[id]` (PATCH `listed`) |

`lib/campaigns/__tests__/parts.test.ts` holds it, 20 cases: the switches
committed off and the server's alone; what an app believes; off means 404 and
no read; the order, the spans, the floor, who is left out; every reader
counted past the thousand rows one request returns; no figure in what is
handed on; the minute; and the creator's switch.

**Found on its first still, on Light, and mended in the palette:** the
house's switch draws its off labels at 65 percent of the ink, which measured
4.52:1 on Light's page and 4.41:1 on the switch's own 3 percent track, so
`checkMock` refused it. For a few hours this switch therefore stood on the
page with no tint under it, and the fault was reported as the palette's to
mend.

It already had been. The Themes chat's sweep of faint text (`14aa6ce89`,
"Light its cards' 62 to 66") makes Light draw that share of the ink at 70
percent. The tree the first still was measured on did not have it yet; the
next pull, twenty minutes later, did. So this page's override outlived its
reason from then on, and the report of a fault in every switch on Light was
out of date when it was sent. Both are put right here (14.2): the switch
stands on the house's own track again. Measured on the track as it is
painted, on a scratch export of the final code, the off labels are 8.04:1 on
Dark, 5.10:1 on Light, 8.48:1 on Black, 5.99:1 on Candlelight and 6.88:1 on
Monastery. What the other rows that copy the switch's look draw on Light
(`BarSwitch`, the doors' slim row) was not measured again here: the
palette's own test, `lib/ui/__tests__/faintText.test.ts`, holds every share
the app writes.

**Found while building it:** the first draft tallied one request's rows, and
the house's own test refused it (`lib/supabase/__tests__/rowCap.test.ts`):
the API returns a thousand rows a request and says nothing when it stops, so
the board would have been ordered by the newest thousand joins and read as
whole. The tally reads every row of the span in pages now, with a total
order, and says aloud if it ever meets its cost limit.

## 13. Pictures, as built (2026-11-10)

His item 121, his words: "a 3-image photo limit for normal users. And for
premium users, they can add as up to 20 photos." His yes: three, or twenty
with Plus; each checked before it is shown; "I am 18 or older" to put one up;
and it waits for a checking service and a lawyer. So it is built whole, and
it ships asleep.

### 13.1 Two locks, both his

1. **The pictures' switch** (`pictures` in `lib/campaigns/parts.ts`, 12.1):
   off. Every pictures route answers 404 and reads nothing, a picture cannot
   be reported, the two decisions about a picture are not actions, the team's
   queue does not carry the key, and no screen draws or asks for anything.
2. **The automatic check** (`lib/campaigns/pictureCheck.ts`): no service is
   wired in, and with none **no picture is accepted at all**, whatever the
   switch says. So turning the switch on by mistake opens nothing. A test
   holds the committed value to "none", and that an upload then answers 503
   with nothing stored.

Turning pictures on is therefore two changes on main, and no store build:
the service wired into that one file (with the lawyer's answer written into
the branch 13.6 names), and `pictures: true`.

### 13.2 What happens to a picture, in order

1. **On the device** it is drawn again at 1600 pixels as a JPEG
   (`lib/trapeza/upload.ts`, shared). This saves the reader's data. It is not
   the guarantee.
2. **The route asks first:** signed in; the campaign's own creator, and to
   anyone else the campaign is simply not found; the two lines each sent as a
   yes ("I am 18 or older", and that it is theirs to share with the blessing
   of anyone in it); a still JPEG, PNG or WebP of 4 MB at most; a campaign
   that waits or runs, and never one of July's. Three things are not taken on
   the sender's word. **Its length:** the body is read with a hard limit and
   dropped as it arrives if it runs past it, whatever length it declared.
   **Its kind:** the bytes are read for what they really are, since the image
   library opens far more kinds than these three (a drawing in SVG among
   them, which is a program for a renderer and not a picture), and a small
   file can claim a size that would fill the server's memory. **Its words:**
   what it shows, in its creator's words, cannot carry a link, as nothing in
   a campaign can.
3. **The limit is the server's:** three, or twenty when the creator's own
   entitlement says Plus at that moment (`subscriptionTier`, as the profile
   banner's route reads it). Nothing in the request is asked about Plus, and
   a test sends "plus" every way a request can and is still refused the
   fourth. If Plus lapses, pictures already up stay up and no more can be
   added past three.
4. **Made again on the server** from its pixels (`lib/shop/imageNormalize.ts`,
   `sharp`): turned upright, 1600 pixels at most, written with no EXIF. Only
   that copy is ever stored. The test uploads a phone's photograph that
   really carries a place and a device, reads the stored bytes back, and
   finds neither; the photo as it was sent is kept nowhere.
5. **The automatic check** is shown that same copy and is never told whose it
   is. Clear: it goes on. Refused: nothing is stored, and its writer is told
   only "That picture can't be used here." A check that cannot answer is not
   a pass.
6. **Stored in a private bucket** (`campaign-held`), under a random name that
   says nothing of whose it is, written down in `upload_owners` under its
   creator before the file exists, and marked held. Nobody can load it but
   its creator and the team, each through an address that expires in an hour.
   Nobody else learns that one waits: to every other reader the list is as if
   it were not there. **That the bucket is private is read back from the
   storage before anything is written to it, and never assumed** (13.9): one
   of that name that is public, or whose record cannot be read, takes no
   picture at all.
7. **A moderator looks.** Cleared: it is copied to the public bucket
   (`campaign-media`) under a new random name, the private copy is deleted,
   and every reader who may open the campaign is handed it. Refused: the file
   is deleted and the row is kept as the record, with the reason. A file is
   stored to be cached for five minutes and not the service's hour, so that
   what a browser or the storage's own cache already holds outlives a
   removal only that long. (Whether the copy to the public bucket keeps that
   time is the storage service's doing and could not be tried here, where
   there is none: to be looked at once on the day pictures open.)
8. **A reader can report it** from its viewer, with a picture's own reasons:
   it shows me or someone in my care and I did not agree; it should not be
   here; something else. Reports hide it until a moderator looks, by the rule
   that hides a campaign (`lib/campaigns/reportsSay.ts`, one rule written
   once): at once on the first reason from an account older than a day, or
   when three readers' reports add up. Hidden means its file goes **back to
   the private bucket under a new name**, so the address readers had opens
   nothing. A report that does not hide it still reaches the team, who keep
   it or remove it. Kept after reports, it is not hidden by reports again.
9. **It goes** when its creator removes it (file first, then the row, at
   once); when its creator takes the campaign down; when a moderator removes
   the campaign (files deleted, rows kept and marked); when the housekeeping
   deletes the campaign thirty days on (`lib/campaigns/upkeep.ts` now asks
   which campaigns a rule is about to delete, has their files deleted, and
   only then deletes them, since a cascade deletes rows and never a file;
   the pictures are read fifty campaigns at a time, so that no read meets
   the thousand rows the API stops at, and a test deletes sixty campaigns of
   twenty pictures each and finds no file left);
   and with the account (`lib/auth/accountFiles.ts` takes every file
   `upload_owners` gives a reader, and every copy is written there).

No faces are read, matched or named, anywhere.

### 13.3 What a reader sees

- **The first picture a moderator has cleared is the page's head.** With none,
  the head is the app's own icon of the campaign's kind, as before, so nobody
  feels they must post a photograph of a sick person. A picture that still
  waits is never the head: its creator sees the head every reader sees.
- **A grid under About,** "Pictures", four across: every cleared picture; a
  tap opens one, with what its creator says it shows, and one row under it:
  the picture before, Report, the picture after. Never a row to drag
  sideways: twenty pictures stand in five rows.
- **Its creator sees besides:** their own pictures that wait, each marked
  "Waiting"; a place to add one while a place is free, which is the plus
  sign alone with "Add a picture" as its name for a screen reader (13.8 has
  why); and at three, where Plus can be bought, the next place with the Plus
  mark, on the second row and two places wide so the mark stands whole in
  it, which opens the upgrade sheet. Plus is shown where it is met and never
  promised to every reader. Where Plus cannot be bought (iPhone today) that
  place is not drawn, and the limit there is three, since the server decides
  by entitlement. Where it is drawn is a rule of its own with a test
  (`showsPlusPlace`, `lib/campaigns/model.ts`).
- **Adding one** is a sheet: the picture, what it shows (optional, for a
  reader who cannot see it), the two lines to tick, and one line saying that
  campaigns are public and that the picture is made again, which removes the
  place and the device a photograph carries.
- **The rules page** gains the rule about pictures the notes drafted (3.2),
  fourth, and only while pictures are on.
- **The team's queue** (the moderators' page, for an admin's account past the
  sign-in code): each picture covered until it is tapped, with its campaign,
  what its creator says it shows, what the check answered and any reasons
  readers ticked. Approve or Remove; for one still shown and reported, Keep
  it or Remove. Readers holding the Moderator badge are shown no picture and
  can decide nothing about one (3.4: the admin's alone at first).

### 13.4 Where it differs from the design above, and why

- **Pictures are added from the campaign's own page, not in the creating
  screen** (2.5 said a row in creating). A picture belongs to a campaign that
  exists, and every campaign waits for a moderator anyway, so its creator
  lands on their waiting campaign and adds pictures there. A row in creating
  would mean holding files on the device and uploading after the campaign is
  made, with a second way to fail. Said here so it is a choice and not a gap.
- **A card on the board keeps the icon of its kind.** Only the campaign's own
  page shows its pictures: a photograph of someone unwell is seen by a reader
  who opened that campaign, and is not laid out on a public list.
- **The Plus list has no line for it yet** (the plan named
  `lib/premium/plusRows.ts`). A line there would promise, in every app,
  something that is switched off. What Plus includes is his word; the line
  goes in when pictures open.
- **The team's panel has no row for a waiting picture yet.** The moderators'
  page carries them, for the team alone, and the button in Community counts
  them. The panel's own queue (`lib/admin/communityQueue.ts`) is Admin's, and
  gains its row when pictures open.
- **A removed campaign's pictures are deleted, not set aside.** A campaign
  put back comes back without them. Keeping the files of something a
  moderator removed is a question for the lawyer (13.6), and until it is
  answered the smaller keeping is the safer one.

### 13.5 What holds it

`lib/campaigns/__tests__/pictures.test.ts`, 51 cases against the in-memory
Supabase, with real images through the real decoder: switched off (nothing
answered, nothing read, the second lock); what is stored (no place, no
device, upright, what the check was shown, private, random, written down);
who is handed a waiting picture; what is asked first, and what is not taken
on the sender's word; three and twenty; where the Plus mark is drawn; the
check's three answers; a moderator's decisions and the team alone; its
creator removing one; reports that hide, that reach the team, that cannot
hide twice; and every way a campaign goes, with its files. Each guarantee was
broken on purpose once and a test failed each time: the photo stored as sent,
the waiting bucket made public, a waiting picture handed to anyone, the limit
believed, a report that only marks the row, the second lock removed, a file
taken by the name it gives itself, the housekeeping reading every campaign's
pictures at once, and the waiting place taken to be private without asking.

`closed.test.ts` held file three out of the migrations folder until he signed
it (section 15: it is held to the signed words now), and holds it to the
notes' own words and to giving the public key nothing; and holds that a
closed device asks nothing of the four new calls.

The in-memory Supabase gained what this needed and nothing more: a private
bucket and an address that expires, a copy to another bucket, the bytes of
what was uploaded, the pictures' table with its two unique rules, and the
one cascade.

### 13.6 What is not this chat's to finish

- **The service** that checks a picture: his to choose. It is wired into
  `lib/campaigns/pictureCheck.ts` and nowhere else.
- **A lawyer's answers** (8.3), before the switch: what the law says must be
  kept and who must be told when a service answers "report" (the branch that
  handles that verdict in `addPicture` stores nothing, tells the team at
  once, and says in its own comment that it is not to be relied on until the
  answer is written into it); whether "I am 18 or older" is the right line
  and enough; whether a removed picture must be kept for a time.
- **The words:** the rule about pictures on the rules page is the draft of
  3.2; the privacy page's lines are 4.7's, with item 113.
- **File three's signature:** given on 2026-11-10, on its plain summary, after
  a second chat had read the SQL (section 15).

### 13.7 Found while building it, in phase 1's own code

**No report could hide a campaign.** Every campaign is read before it is
public (117), and the first approval marked it "cleared by a moderator"; a
cleared campaign is never hidden by reports. So "it is about me or someone in
my care", the report that is meant to take a campaign down at once for the
person it names, would have done nothing, and neither would three readers.
The tests had not seen it because they began from a running campaign that
had never been approved, which the real path never makes. Campaigns were
closed, so no reader met it.

Now a first reading is only a reading: it clears nothing, because whoever
reads a new campaign cannot know whether the person it names agreed. A
campaign is cleared when a moderator looks at it after reports hid it and
keeps it. `routes.test.ts` walks the whole way through the real path: read,
reported and hidden, kept, and then not hidden again. Keeping a campaign also
no longer sets aside a report of one of its pictures, which nobody had
decided about.

### 13.8 What the first stills found, and what was done

- **Report was under the fold.** A picture opened at six tenths of the
  screen's height, and what could be done with it had to be scrolled to. The
  picture is a little smaller now and Previous, Report (or Remove) and Next
  share one row, on the screen.
- **The Plus place was off the right edge.** The pictures stood in a row that
  scrolls sideways, so the place after the third could not be seen. That is
  why they are a grid.
- **The hidden file input** counted as a target too small to tap. It is
  hidden as the profile editor hides its own.
- **"Add a picture" as words on its tile** was cut in twenty-four of
  sixty-three cases (twenty-one languages at 390, 360 and 320 pixels,
  measured with the export's own fonts). The tile carries the sign alone.

### 13.9 From the second chat's read of file three (Admin, 2026-11-10)

Safe at the merge, with two changes, both made:

1. **In the SQL: the moment of consent has no default.** `consent_at` was
   "not null default now()", so any write to the table would have recorded
   that a creator affirmed being 18 and having everyone's blessing, whether or
   not anything had asked them. It is "not null" with no default: only the
   route that asked writes the moment, and a write without it is refused.
   Changed in the file and in 5.4, run twice again on a table made fresh, and
   held by a test.
2. **In the code: private is a check, not an assumption.** Asking the storage
   for a private bucket proves nothing when one of that name is already
   there, since "already exists" is the same answer whoever made it and
   however, and a bucket can be made public afterwards from the dashboard. So
   before anything is written to the waiting place its own record is read,
   and unless that says it is not public, nothing is written there.

One consequence had to be decided with the second: **a reported picture is
still hidden when the waiting place cannot be used.** If the check fails at
the moment reports say a picture must go out of sight, its file is given a
new name where it is, so the address readers had opens nothing, the new one
is handed to nobody but its creator and the team, and the log says so in
plain words. Hiding does not wait on the storage being set up right: the one
who reported is the one this is for.

## 14. The last pass for 1.9 (2026-11-10)

### 14.1 The languages

The 62 lines of phases 2 and after (updates and comments, "Prayed by many",
pictures) were English alone. They are in the twenty other languages now, in
one pass, by four translators working from one brief, each reusing its
catalog's own words for campaigns, moderators, reports and pictures. Checked
for every language before it went in: the same 62 keys, each placeholder
once, no em or en dash, nothing left in English, and a picture's size written
with the unit that catalog already uses beside the same button.

**Three names are the translators' own renderings,** and worth an eye from
someone who prays in the language before campaigns open to every reader:

- **"Prayed by many."** No language was given a word for ranking. Most say
  "many pray" (Russian "Молятся многие") or "in the prayers of many" (Greek
  "Στις προσευχές πολλών", Italian "Nelle preghiere di molti"); German says
  "Viele beten mit", French "Portées par beaucoup".
- **"Updates."** Where a catalog's word for an update means a software
  update, the everyday word for news of a person was used (Russian
  "Новости", Polish "Wieści", German "Neuigkeiten").
- **"I am 18 or older."** Several languages say it with their own set phrase
  for having turned eighteen. It is a line a lawyer reads with the rest
  (8.3).

One thing the pass showed in the catalogs as they already were: Russian says
"campaign" three ways (in `community.prayerCampaigns`, in July's lines, and in
phase 1's), and Serbian two. The new lines follow phase 1's word. Making them
one is a small pass of its own, and a reader's word on which is right would
settle it.

### 14.2 What the languages found in the screens

**"Prayed by many" cut the word for "week".** The house's switch gave its
parts equal widths and cut a word that did not fit, and "week" is long in
some languages beside very short words for day and year (Romanian: Zi,
Săptămână, Lună, An). Measured in all twenty-one languages at 390, 360 and
320 pixels: nineteen cuts. As a first mend, each part of this one switch was
made as wide as its own word needs, with the room left over shared out.

**The house's switch was mended the same day, and this one is the house's
own again.** On the arbiter's word every other use of the switch was
measured, and the shared part now sizes to its words (`321788c10`,
`components/ui/SegmentedSwitch.tsx`: equal parts while every word fits, a
longer word takes its room, and no part is under 44 pixels). So this page's
own sizing came out, on the arbiter's yes, "so one rule draws every switch",
and with it this page's other override, the missing tint, whose reason had
gone as well (12.2). The switch here now carries nothing of its own.

Measured again on a scratch export of the final code, on the real switch, in
all twenty-one languages at 390, 360 and 320 pixels: no word cut, no part
under 44 by 44 (the narrowest is 58 wide, Romanian at 320), and no row
scrolls. The parts are equal wherever the words fit, and they fit in
German, Russian, Georgian and Hungarian at all three widths. A longer word
for "week" takes its room in Romanian at 360, and in Bulgarian, Greek,
Italian, Romanian and Ukrainian at 320. Still 19 passes the mockup check on
the five palettes and the eighteen looks.

### 14.3 The eighteen looks

Every campaign still, all twenty-four, was held to the mockup check wearing
each of the eighteen looks as well as the five palettes: contrast, 44 pixel
targets, the house icons, palette colours, no gold, no side stripes, Arabic
mirroring, no em dashes, no light rays. `ALL_LOOKS=1` on
`scripts/mock-campaigns.mjs` does it. Nothing of campaigns failed on a look.

### 14.4 The stills and the walk

Twenty-four stills, one of each screen, and twenty flows walked in a browser
against the same export, with what each sends checked. The scratch export
for them has the switch open, and made-up purchase keys so that Plus counts
as sold and the Plus place is drawn (the head of the script says which).

## 15. The three SQL files, signed (2026-11-10)

All three are signed, and all three are in the folder a merge runs against
production. **Nothing has run on production, and nothing will until 1.9
merges to main, which waits for his word.**

| File | What it is | His word | The migration |
|---|---|---|---|
| One | The campaign itself, joining it, reports | "R0b yes 1", about 08:40 UTC | `20261110084116_campaigns_rework.sql` |
| Two | A campaign's updates and comments, as its own thread | "All recommendations. Start.", about 13:50 UTC, answering the arbiter's list of 10:41 whose item 7 was this file | `20261110135543_campaign_threads.sql` |
| Three | A campaign's pictures | The same words: it had been put to him at 12:02 UTC on its plain summary, after Admin's read and its one change | `20261110135545_campaign_pictures.sql` |

His words are in `BRAINSTORM.md` and the list of his signatures in
`HANDOFF.md`. He does not read SQL: each yes is on a summary in plain words,
and each file was read by a second chat first.

**Each migration is the copy he was asked about, statement for statement.** A
header of its own says it is signed and not applied by hand, with his words,
the day, and what a probe of production saw. `closed.test.ts` holds each
migration to its copy in `docs/1.9-build/sql` word for word, to being in the
folder exactly once, to saying whose word signed it, and holds the three to
running in order by name: one, two, three.

**Checked once more as they now stand in the folder:**

- A scratch database was built from empty by running every migration in the
  folder in name order. The three ran in order with no error. (One old
  migration of May's fails there, and only there: it reads a column of the
  accounts table that the scratch stand-in for it does not have. It is not
  one of these and was the same before them.)
- Each of the three was then run a second time: no error.
- Each file's own check, from its header, gave what the header says it
  should: file two 1, 1, true, 0; file three 15, true, 0, false, 0.
- `lib/supabase/__tests__/migrationVersions.test.ts` passes: fourteen digits
  each, shared with no other file, and the two new ones sort last.

**Probed on production at 13:55 UTC, with the site's public key: none of the
three has run.** The campaigns table has no "days", posts have no
"campaign_id", and there is no pictures table. So the headers say signed,
and not applied. When a probe shows one applied, its header in
`docs/1.9-build/sql` is where that is written.

**What each merge-time run changes for a reader: nothing.** Campaigns are
closed, and pictures are switched off besides. File one also closes July's
table to the public key, which nothing in the live app reads.

## 16. Build 90, and July's reminder (2026-11-10)

**The question.** The arbiter brought his words about Android test build 90
(run 42782850621, from `53dbb696`): "why does my build have the campaign
prayers". It was first read as campaigns showing where they should not. He
meant the opposite, that they should be in his build to try, and the test web
is the answer to that (CLAUDE.md, "The test web and the main web"). The first
reading was checked all the same, and what it found is kept here.

**Build 90 shows nothing of campaigns.** Checked on the commit itself:

- The switch said "closed" there, and has never been committed any other way.
- That commit's Android export was built again, with its own packages and the
  switch as committed, and 35 screens were walked as four readers: signed
  out, signed in, an admin with Testers mode on, and an admin against a
  made-up website that says yes to everything on a phone that already
  carries a campaign. In all four the app asked the website nothing about
  campaigns, and the five campaign addresses were the page-not-found page.
- Prayers, each prayer, Your rule and Those you pray for, Today, Discover,
  both rooms of Community, You, Settings, the plan pages and the walkthroughs
  held no line and no part of campaigns. Thirty-three English lines outside
  the campaigns' own name them: each is drawn only by a campaign page, stands
  behind the switch, or is a moderator's. The onboarding, the tour and the
  search have none.
- What's New names them only in July's own notes (Beta 2.0 to 2.9), folded
  under July, as the live app does. The 1.9 note and the week's message do
  not.
- An admin's account changes nothing. One thing was seen only against the
  made-up website: the moderators' page draws a campaign card if the
  website's queue hands it one. The main web hands none.

**Found on the way: July's daily reminder was still being sent.** The main
web's reminder run carried July's "remind me each day" for a campaign
(`lib/push/deliver.ts`, `deliverCampaigns`). Campaigns were withdrawn on
2026-08-26 and the switch that turned it off went with their screens, but the
sender was left running, and from 2026-10-04, when the heartbeat began to
carry the reminders, it sent "Your prayer campaign" once a day to every
reader who had turned it on in July: for a campaign long ended, to a page
that is not found, with no way to stop it. The rework retired the reminder's
route with July's others and missed its sender. That is this chat's miss.

- **On the branch:** the sender follows July's routes, reads no opt-in and
  sends nothing, and a reader's own morning and evening reminders go on.
  `lib/push/__tests__/campaignRemindersRetired.test.ts` holds it, and fails
  on the sender as it was.
- **On the main web:** unchanged until a deploy carries this, or until he
  switches July's opt-ins off by hand; that statement is drafted and with
  Admin for the second read. How many readers it reaches is not known: only
  he can count the rows.
- **His count (2026-11-10 about 20:46 UTC): none.** He ran the statement on
  the live database: reminders_stopped 0, still_on 0. No reader had July's
  reminder on, so the sender ran and found nobody; it reached no one. Above,
  "it sent ... to every reader who had turned it on in July" is what the
  code would have done, and there was no such reader. Nothing is left for
  him here: the old sender leaves the main web with the merge of 1.9.
- **In the record:** `docs/audit/findings.yaml`, F-50, and a line in
  `docs/SCHEDULED-JOBS.md`.
- **When the reminder comes back** in the rework's own phase (1.9.1), it is
  written to the rework's rules, and this pass is not it: it must know a
  campaign's last day, and a reader must be able to turn it off.

**What campaigns need on the test web** was sent to Admin the same hour: the
switch is a constant, so the branch itself has to say "testers" for the test
web and a test build to show campaigns (not changed; the arbiter's and his
call); the usual Supabase values, the admin list and the test web's own
address; every migration in name order on the empty project; no job they
cannot do without; and nothing of theirs that emails or notifies anyone.

## 17. The switch at testers on the branch (2026-11-10)

**His word, through the arbiter:** "exactly I meant it should be in my
build". He wants campaigns in his test build to try, and chose the test web
for it. So `CAMPAIGNS_OPENING` says "testers" on the branch from this
commit. **This is release day's step 1 done early** (10.2): the position the
merge was always to carry.

**What it changes, and what it does not:**

- **The main web: nothing.** It runs main, where the switch says closed
  until the merge. A build that talks to it asks once whether campaigns are
  open, is told no, and shows nothing.
- **A build cut from the branch has the campaign pages.** They show only for
  a reader the website says yes to.
- **The test web answers yes for the accounts it names as admins**
  (`ADMIN_EMAILS` there), once the three SQL files have run on its own
  database. For anyone else it is a page not found, as before.
- **Open, for every reader, is still one line that waits for his word.** The
  test holds the constant to "testers" and never "open"
  (`lib/campaigns/__tests__/closed.test.ts`).
- **Closed is still a position.** Every case that holds what closed means
  sets it; none assumes it. One test outside campaigns leaned on closed as
  the default, the admin panel's community route
  (`lib/admin/__tests__/communityRoute.test.ts`); it now sets the position
  it was written for. **A gap this showed:** no test runs that handler in a
  build that has the rework. The library it hands to is held
  (`moderating.test.ts`); the handler in that position is not.
- **The stills and the walk** run on the committed export now
  (`scripts/mock-campaigns.mjs`); no scratch build with the switch opened is
  needed.

**113 and 129 are answered (his word, the same day):** campaigns need no
priest and no lawyer. The Terms say campaigns are readers' own, starting one
carries the acceptance, and a plain safety line points a reader in danger to
emergency help. Opening for every reader waits on his walk on the test web
and his OK of those words, and on nothing else.

### 17.1 The test web stands one step ahead, and the main web never does

**His word for a test build:** "as if it was public release". The build is
cut as the store builds will be, at "testers", and it should meet campaigns
as readers will once he has opened them. One commit makes both the website
and the build, so the constant cannot say "testers" to one and "open" to the
other.

**So the server has one rule of its own** (`lib/campaigns/opening.ts`,
`serverOpening`; the arbiter's word, with Admin's plan in
`docs/1.9-build/notes/test-web.md`): where the constant says "testers" and
this server is the test web, it answers "open", to every account there.

- **It lifts "testers" and nothing else.** A branch that says closed has no
  campaigns on the test web either.
- **It cannot reach the main web.** What the test web is, the test web's own
  rules say (`lib/testWeb/rules.ts`, the Admin chat's): its flag, on its own
  database (by its address and by the project its public key names), at an
  address that is not purifyapp.net, with no live payment key. A server that
  says it is the test web and breaks one of these refuses to start, and is
  not the test web. So the flag pasted into the main web's settings by
  mistake changes nothing there. The main web opens by the one line in
  `flags.ts`, on his word, and by nothing else.
- **The constant's file still reads no setting,** nor does the rule's own
  file, and every campaign route still asks one place.
- **Held from this side by** `lib/campaigns/__tests__/testWeb.test.ts`, by
  what a campaign route is told, on the real rules and no stand-in: nine
  mistakes (the flag in the main web's own settings, the main web's database,
  its key, its address, a live payment key, and their like), each alone, and
  for each the server stays at "testers" and answers for its admins only.
  If the rules are ever loosened so that a server shaped like the main web
  passes, it fails.

**A collision on the way, mine, and mended in seven minutes.** I first
wrote the marker's reader as a file of my own, `lib/testWeb.ts`, with a
marker of my own, and pushed it (`a0eb97365`) minutes after Admin had pushed
the test web's rules as the folder `lib/testWeb/`. A file of that name is
found before a folder of it, so every page of Admin's that asked the folder
(the layout, robots, the sitemap, the footer, mail, the proxy) was handed my
file instead, which has none of what they ask for. The rebase had no
conflict to show, and I had run campaigns' tests after it and not the
typecheck. The file is gone (`d2f6260f3`); the rule asks Admin's
`isTestWeb()`; there is one marker, Admin's. What it costs to say plainly:
from about 16:21 to 16:28 UTC the branch did not build, and a chat whose
gates ran in those minutes saw eight errors that were not its own. Nothing
ran from it: the main web runs main, and the test web does not exist yet.
(This note first said "half an hour"; the commits' own times say seven
minutes.) The lesson is in how I work from here: after a pull that brings
code in, the typecheck runs again before the push, every time; and I read
what a chat I am agreeing something with has pushed before I push my side.

**What will differ from the release on the test web, to tell him before he
walks:** two quiet places read the constant itself and do not follow the
server, the Discover menu's row on a wide screen and the free plan's line
that names campaigns. They stay hidden there, as they do in a store build
until the build after campaigns open. And "Prayed by many" and pictures are
constants of the server too (`lib/campaigns/parts.ts`): off there until they
are turned on for everyone.

**The gap named above is closed:** the admin panel's community route is now
run in a build that has the rework as well
(`lib/admin/__tests__/communityRoute.test.ts`, four cases): the rail counts a
campaign that waits and the open reports on it as one row, a decision is
handed to the campaigns' own moderation as that admin, and the route deletes
nothing itself.

## 18. The Terms of Service, accepted on starting a campaign (2026-11-10)

**His word** (`BRAINSTORM.md`, the same day, answering 113 and 129): "we
don't need a priest or a lawyer to make prayer campaigns. Just make it clear
that the prayer campaigns are made by the people ... whenever they make a
prayer campaign, they accept to the terms of service so that it's like their
prayer campaigns are distinct from us."

**Phase 1 did not have it.** A creator ticked the blessing and the house
rules, and the campaign kept what they affirmed and when. Now there is a
third line.

- **The line:** "I agree to the Terms of Service", under the rules line on
  the start screen. No new words: "I agree to the" and "Terms of Service" are
  the sign-up form's own, already in all twenty-one languages. The Terms open
  in the legal sheet over the page (Admin's, build 90 note 1), so nothing a
  creator has written is lost; the link ticks nothing.
- **How the line is drawn:** the campaigns' own tick
  (`components/campaigns/TickLines.tsx`, `TickBox`) learned one thing. A link
  cannot stand inside a button, so on a line with a link the tick is the
  button and the words are its label: a tap on either ticks, a tap on the
  link opens it.
- **Required as checkout's is:** the request must say `termsAccepted: true`,
  literally (`lib/security/schemas.ts`). Create stays dim until all the lines
  are ticked.
- **Kept with the campaign and its time:** `terms_accepted_at`, the moment by
  the server's own clock, never the sender's. It is the same instant as the
  blessing's (`consent_at`), kept as its own fact.
- **The fourth SQL file:** `docs/1.9-build/sql/campaigns-4-terms.sql`, one
  statement, one new column, no right given to anyone, safe to run twice. Run
  twice on the scratch database: the first run adds the one column and
  nothing else, the second changes nothing, and the public key's role and a
  signed-in reader's are both refused the column. When this was first
  written it was not signed and `closed.test.ts` held it out of the folder a
  merge runs.
- **Signed, and written into the folder at 17:26 UTC the same day:**
  `supabase/migrations/20261110172648_campaign_terms.sql`. His yes is "rec
  yes to all" (about 16:45 UTC), which covered this file once a second
  chat's read had passed; Admin's read passed at about 17:00 UTC with
  nothing to change (run twice there on all 103 files of the folder, the
  production baseline among them); and the file went in after both, not
  before. The file itself, as committed, was then run twice here on a fresh
  scratch database standing on the other 103: the first run adds the one
  column and nothing else, the second changes nothing, its own check answers
  1, false and 0, and both roles are refused. (One old file of the 103 does
  not run on my stand-in, `20260526000000_profiles_has_password.sql`,
  because the stand-in's sign-in table has no password column; it touches
  nothing of campaigns.) Probed on production at 17:22 UTC with the public
  key: not run, there is no such column yet. It runs at the merge. The
  statements are the docs copy's word for word, and `closed.test.ts` now
  holds that, the signature, the second read and its place after files one
  to three. It is never edited again: a change is a new file.
- **Until that file has run on a database, no campaign can be started
  there.** The route starts none where it cannot keep the acceptance, and
  answers as a closed door does. That is deliberate: a campaign with no
  record of its acceptance is the one thing this must not make. On the test
  web the folder is run from the branch, so the file is there before he
  walks campaigns; on the main web it runs at the merge, with the code that
  needs it.

**Found by its first walk, and mended before it was pushed:** with the
Terms' sheet open, Escape closed the sheet and also left the start page, with
everything written on it. The page left on Escape unless one of its own three
sheets was open, and the Terms' sheet is not one of its own. The page now
asks whether any sheet stands over it (`lib/ui/overlay.ts`, `isSheetUp`) and
stands aside. The phone's Back was never wrong: there the topmost layer alone
answers.

**Held by:** three cases in `routes.test.ts` (not started without it, with
nothing written; the moment is the server's; none started where the column is
absent), one in `model.test.ts`, the file-four case in `closed.test.ts`,
`startTerms.test.ts` (the line, Create, the tick with a link, Escape, and
when a sheet counts as standing over the page), and the walk's first flow,
which now also opens the Terms from the line, sees the tick untouched,
closes the sheet with Escape and finds the page and its written words still
there, and ticks the line by its words.

## 19. "Prayed by many" is on (2026-11-10)

**His word** (`BRAINSTORM.md`, "rec yes to all", answering the recommendation
as the arbiter put it): "Prayed by many" with one exception to the "no
figures on prayer" rule: an order only, never a number, five praying first,
a creator can stay out.

- **His rule carries the exception now.** `CONTRIBUTING.md`, under "On
  prayer, no figures at all", after the paragraph that says why public counts
  went: one list is permitted, on his word, with the date; the order is shown
  and no figure ever is; a campaign is listed only once five readers carry
  it; it stands under the newest campaigns and never in their place; a
  creator can keep a campaign out; and it is no precedent for a count beside
  an intention anywhere. The words are the ones drafted in 2.8, with the
  floor of five written in, since that is part of what he said yes to.
- **The part is switched on:** `lib/campaigns/parts.ts`, `many: true`. An app
  is told with the answer that campaigns are open, as before, so no build is
  needed for it.
- **Tied together by a test:** `parts.test.ts` holds that the part is on only
  while his rule carries the exception, in this form. If the paragraph is
  ever taken out of his rule, the test fails until the part is off again.
- **Off is still a position,** as pictures are today: the cases that hold
  what off means (404, nothing read, nothing drawn) set it and no longer
  assume it.
- **What it is, unchanged from 12.2:** a second list under "Newly asked", by
  Day, Week, Month or Year; an order and never a figure; five readers before
  a campaign is listed; kept for a minute; a creator's switch to stay out.

## 20. Pictures: one limit for every reader (2026-11-10; his word, the code follows)

**His word** ("rec yes to all", `BRAINSTORM.md`): the same picture limit for
every reader, not a Plus perk; and pictures at launch once his three steps
are done (an AWS account for the check, NCMEC's CyberTipline registration,
the Copyright Office's agent), with PhotoDNA added when Microsoft approves.
The limit I recommended is five; the arbiter's answer the same day: five for
everyone, yes, and nine is one constant away if he asks.

**Not built as this is written.** The code still holds three and twenty and
the Plus place (`PICTURES_FREE`, `PICTURES_PLUS`, `showsPlusPlace`), and
pictures are off on the server besides (`lib/campaigns/parts.ts`). The change
comes in its turn, after July's rows and the notice of a removal, and this
section is finished then: the one constant, the Plus place and its row on the
Plus page gone, the check's adapter and what it lacks (his key), and his
steps.

### 20.1 As built (2026-11-10, in the evening)

**Five, for every reader.** One constant, `PICTURES_MAX`
(`lib/campaigns/model.ts`). No entitlement is read for it and nothing a
request says can raise it. The place that wore the Plus mark is gone from a
creator's pictures, with its line ("Up to twenty pictures with Purify Plus")
out of the 21 catalogs; the server's refusal at the limit says nothing of
Plus. There was no row for pictures on the Plus page to remove: the only
place Plus was named was that one tile. A campaign that somehow holds more
than five is still read whole (a read asks for up to twenty), so nothing
stored is ever hidden from a moderator or missed by a clean-up.

**One correction to my own reason for five.** I told the arbiter that five
"fills the page exactly, a head and one full row". It does not: the row
under About shows every picture, the head's among them, so five is a row of
four and one more. Five stands as he said it. If the row is to fill, the
head's picture can leave the row; not built, and said to the arbiter.

**The check is written, and only his key is missing.**
`lib/campaigns/pictureCheckRekognition.ts` calls Amazon Rekognition's
content moderation (DetectModerationLabels), written to the service's own
documentation as read that day, and signed by
`lib/security/awsSigV4.ts`, a signer in Node's own crypto held to the
service's published examples (its test suite's two plainest requests and
the worked example's signing key, each to the last hex digit). No new
package. With no key on the server there is no check, and with no check no
picture is accepted: the second lock stands as it did.

- **The key** is three values in the server's environment, pasted there by
  his hand and never in chat or in the code:
  `PICTURE_CHECK_AWS_ACCESS_KEY_ID`, `PICTURE_CHECK_AWS_SECRET_ACCESS_KEY`,
  `PICTURE_CHECK_AWS_REGION`. It should be allowed one action only,
  `rekognition:DetectModerationLabels`. A key that is half set or
  misshapen is no key, said once in the log by the names of what is wrong.
  The region is part of the address a picture is sent to, so it is held to
  the shape of a region.
- **What is sent:** the picture as the server made it again, and nothing
  else: not who, not which campaign, not a name. A redirect is an error and
  is never followed.
- **What it refuses, with no person looking,** when the service is at least
  60 percent sure: everything it files under Explicit; nudity short of
  explicit that is still not for a prayer page (implied nudity, a partly
  exposed breast or buttocks); an intimate part that is covered but is the
  picture's subject; violence that is shown (blood, a fight, self-harm, an
  explosion); hate symbols.
- **What it leaves to the moderator, with a note of what it noticed:** a
  bare back or a man's bare chest (a patient in a hospital bed, a child at
  the sea), a kiss (a wedding), swimwear, a weapon that is only carried (a
  soldier someone prays for), a body or a coffin (a funeral), a crash,
  alcohol, tobacco, pills, a rude gesture, gambling. The note stands on the
  moderators' card before they uncover the picture. This line between the
  two lists is a judgment, and it is one table to change
  (`REFUSED`, `REFUSE_AT`).
- **It fails closed.** A picture that is not the JPEG the server made, a
  call that takes more than ten seconds, an answer that is not 200, an
  answer that is not the documented shape: each is "the check could not
  answer", which is never a pass. Nothing is stored and the reader is asked
  to try again later. An answer that says the picture can never be read
  refuses it instead, since trying again would not help.
- **It never answers "report".** It knows no list of known illegal images.
  That is PhotoDNA's, which waits for Microsoft's approval, and the branch
  that handles that verdict still says it is not to be relied on until
  NCMEC's guidance for providers is written into it.

**Every campaign picture is now a JPEG with nothing see-through in it.**
Found while writing the check: a picture with see-through parts was stored
as a PNG, and a PNG shows one way on the white a checking service lays it
on and another on this app's dark page, so white writing on nothing would
pass the check unseen and be plain to a reader. A campaign's picture is
laid on white once, on the server, before the check: what is checked, what
a moderator sees and what a reader is shown are one picture
(`opaqueJpeg`, `lib/campaigns/pictures.ts`). The shop's cut-out pictures
are untouched.

**Not proved against the service itself.** There is no key, so the tests
answer as the documentation says the service does. The first real picture
on the test web, with his key, is the proof that the service reads the
JPEGs this server writes and accepts the signature. Named to Admin with the
steps.

**Held by** `lib/campaigns/__tests__/pictureCheckRekognition.test.ts` (25
cases), `lib/security/__tests__/awsSigV4.test.ts` (8) and
`lib/campaigns/__tests__/pictures.test.ts` (57: five for everyone and for a
Plus member alike, no door to Plus, the opaque JPEG, and four cases of the
real check deciding through the route). Eighteen ways of breaking it were
tried: fifteen failed a case at once; two were doubled by another guard
and have a case of their own now; one is doubled by the language itself (a
labels list that is not a list cannot be walked) and is left.

**Still off, and his:** the pictures' switch on the server
(`lib/campaigns/parts.ts`) and `PICTURES_IN_STORE_BUILDS`, until his steps
are done: the AWS account and key, the registration with NCMEC's
CyberTipline, the Copyright Office's agent; PhotoDNA when Microsoft
approves. The steps are with Admin for `OWNER-STEPS.md`.

## 21. The prayer wall goes: the plan and its size (2026-11-10; a plan, nothing built)

**His word** (`BRAINSTORM.md`, about 17:25 UTC): "I'd say remove the prayer
wall and just keep the prayer campaigns." The two photos he decides from are
`docs/1.9-build/notes/decisions/wall-1-today.png` and `wall-2-after.png`
(stills 30 and 31 of `scripts/mock-campaigns.mjs`).

### 21.1 What the wall is, from the code

- **Not a table of posts.** A request is two fields on the reader's own
  profile: when they asked (`profiles.prayer_request_at`) and, since 1.7.1,
  up to 120 characters of their own words (`prayer_request_intention`), which
  go through the word filter and wait for a moderator when it masks any.
- **It ends by itself** fourteen days after it was made (`PRAYER_REQUEST_MS`),
  and its author can take it down sooner. The words stay in the column after
  it lapses, unseen, until the next request writes over them. That is a small
  leftover and the job below mends it.
- **It is shown in two places:** the wall in Community's Pray together
  (`components/community/PrayerWall.tsx`, `app/api/community/prayer-wall`),
  and the reader's own profile, as "Asking for your prayers" with I prayed
  (`ProfileViewer.tsx`), switched from the profile's editor.
- **"I prayed"** is a row in `profile_prayers` and a notice to the asker
  (`app/api/community/pray`). The profile still draws how many prayed
  ("3 prayed"), a public figure beside a prayer, which his rule in
  `CONTRIBUTING.md` does not allow; the wall dropped its own in 1.8.
- **"Add to my prayers"** carries the name and the words into the reader's
  own prayers on their device for seven days (`lib/prayers/wallNames.ts`,
  synced for a signed-in reader), under "From the prayer wall".
- **The weekly Community email** says how many asked, and "The prayer wall is
  in Community" (`lib/email/templates/communityBodies.ts`).
- **On the main web today** (its own public route, 17:40 UTC, counted and not
  kept): 12 requests standing, 2 with words, the oldest 13.2 days old.

### 21.2 The one question that is his

His word names the wall. Asking for prayers also stands on each reader's own
profile. Which goes?

- **A. The wall only.** The list leaves Pray together. A reader can still
  switch asking on in their profile, and whoever opens that profile can say I
  prayed. About 5 hours. The profile's "3 prayed" loses its number either
  way.
- **B. Asking for prayers altogether (recommended).** The list, the
  profile's line and switch, I prayed and its notice. One way to ask for
  prayer in Purify, a campaign: read by a moderator first, with a length and
  the Terms. A request left on a profile that no list shows is half a
  feature with a moderators' path of its own, for almost nobody. About 9
  hours.

### 21.3 The plan, for B (A is lines 1, 7, 8 and 9, and the first sentence of 3)

1. **Pray together draws campaigns alone.** `PrayerWall` and
   `AskPrayersSheet` leave `PrayTogether`. Nothing new is drawn in their
   place: `wall-2-after.png` is the page.
2. **The profile:** the request's line and I prayed leave the profile, and
   the switch leaves its editor.
3. **The server, kind to apps that have not updated:** the wall's route
   keeps answering, with nobody on it, so a 1.8 app shows "No one is asking
   for prayers right now" and not an error. Asking is refused with a code
   the old app already has words for. I prayed answers that they are not
   asking, which the old app already handles. No count was sent since the
   branch's section 9, item 8; that goes with the route's rows.
4. **The requests already made** (his to say). Recommended in place of
   thirty days and a place to read one's own: nothing is migrated, because
   nothing here was ever kept. From 1.9 no request is shown to anyone.
   Fourteen days after 1.9 ships, when the last of them would have lapsed
   anyway, a dated job in the heartbeat clears the two fields from every
   profile, closes the holds on their words, and deletes the I-prayed rows.
   The day is a constant written in the release commit, as July's rows' is.
   It can run twice. A second chat reads it before it ships. If he would
   rather they went the day 1.9 ships, that is the same job with no wait.
5. **The moderators' queue (with Admin):** no new hold on a request's words
   is made. Those waiting stay readable until the job closes them.
6. **The names readers carry from the wall** stay in their prayers until
   their own week ends and leave with the line the app already has. So 1.9
   keeps the prayers' side as it is (the names' list, the rule reader's
   lines, the sync). `AddToPrayersSheet` is not what readers' campaigns use
   (they have `CampaignJoinSheet`); its other user is the card for a campaign
   the app itself runs, which none fills. It and the names' store are taken
   out in the release after, when nothing can be carried any more.
7. **Words.** The wall's own lines are retired in all twenty-one languages;
   the ones campaigns borrow stay ("Add to my prayers", "In my prayers", "In
   which prayers", "Until {date}"). New lines for his OK: the weekly email's
   (it names the wall today), and the note's line.
8. **Tests and walks.** `prayerWallRoute.test.ts` and `prayAndTalk.test.ts`
   are rewritten to hold what is now true (campaigns alone; an empty wall for
   old apps; no new request; no request on a profile); new cases for the
   dated job. Still 01 and the campaigns' page of stills are redrawn; the
   walk and the three builds run.
9. **The 1.9 note:** one line, in his voice, for his OK.
10. **The privacy page and the Terms** name neither the wall nor a request
    (both read): nothing to take out.
11. **Later, with SQL he signs:** the two profile columns and `profile_prayers`
    are dropped, and the prayers' side of the wall's names removed. Not 1.9.

The wall's code stays in the repository's history; its Vault entry names the
commit that takes it out.

## 22. A preset prayer for each kind: the mapping for his OK (2026-11-10; a plan, nothing built)

**His word** (the arbiter's relay, about 17:28 UTC): "we're gonna add preset
per, so like if it's for the reposed, we're gonna use like Saint Ticon's
prayers for the reposed. If it's for the martyred, we have the martyred. If
it's for healing, we have healing, etc."

### 22.1 What the app holds, read from its files

- **A prayer made for the need, for one kind only:** the reposed. "O God of
  spirits, and of all flesh", Hapgood's Service Book (1906), p. 91, public
  domain (`lib/prayers/commemoration.ts`, `DEPARTED_PRAYER`). A campaign for
  the reposed already says it.
- **No prayer for the sick, for travellers, for students, for the
  persecuted, to the martyrs, or of thanksgiving for a mercy** is in the
  prayer book (`data/prayers`: every text read by a search for those needs'
  own words). Nothing stands under St Tikhon's name either: the prayer
  book's own source lines say the Jordanville, St Tikhon's and Hapgood books
  carry these prayers in nearly the same form, and the words printed are
  public-domain English.
- **What he remembers is July's.** July's campaigns had nine presets ("For
  the sick", "For the persecuted", "Memory eternal" and so on,
  `lib/campaigns/campaigns.ts`, `PRESET_PRAYERS`). Six were sentences written
  for the feature, with no printing behind them, and that is why the rework
  did not carry them: his standard takes the Church's words from a
  public-domain printing, word for word, and nothing written by us
  (`docs/editorial-standards.md`). The three true ones were the Jesus
  Prayer, the Trisagion and "Most Holy Theotokos, save us".
- **What it does hold that speaks to a need in its own words:** the common
  prayers of the morning rule, and the whole Psalter in Brenton's Septuagint
  (1851, public domain): some psalms in the prayer book's files (90, 26, 50,
  and those of the Hours), every psalm in the Bible's.

### 22.2 The mapping proposed

Each line is the prayer, the words in it that speak to the need (read from
the app's file, not typed from memory), and where it is printed from.

| Kind | Preset | Its words | Printed from |
|---|---|---|---|
| The reposed | "O God of spirits, and of all flesh" | "give rest to the souls of thy departed servants" | Hapgood (1906), p. 91. As built |
| An illness | The Trisagion prayers | "Holy God, visit and heal our infirmities, for Thy Name's sake." | The common prayer book, as the morning prayers have it |
| A trial | Psalm 90 | "I am with him in affliction; and I will deliver him" | Brenton (1851) |
| The persecuted | Psalm 26 | "my persecutors and mine enemies, they fainted and fell" | Brenton |
| Guidance | Psalm 142 | "Teach me to do thy will ... thy good Spirit shall guide me in the straight way." | Brenton |
| A journey | Psalm 120 | "The Lord shall keep thy coming in, and thy going out" | Brenton |
| Thanksgiving | Psalm 102 | "Bless the Lord, O my soul, and forget not all his praises" | Brenton |
| An exam or studies | The name alone | Nothing the app holds speaks of studies. The nearest is Psalm 24, "Shew me thy ways, O Lord; and teach me thy paths." | |
| Something else | The name alone | The creator may choose any prayer on the list | |

The pairing of a prayer with a need is a judgment, and it is his to approve
line by line. Only the reposed's is a prayer the Church made for that need;
the rest are psalms and one common prayer whose own words ask for what the
campaign asks.

### 22.3 What a reader sees

- **Starting a campaign:** choosing the kind sets the prayer's row to that
  kind's preset, by name. The creator can change it to any other on the
  list, or to "The name alone". Today that row is named "A psalm"
  (`campaigns.new.psalm`), offers the name alone or one of three psalms (90,
  26, 50), and nothing is set for the creator; those three stay on the list.
  With presets it takes the name the campaign's page already gives it, "The
  prayer" (`campaigns.thePrayer`), a line every language has. (This note
  first called the row "The prayer" as if it were so today; the photo for
  his call, `decisions/prayers-1-start.png`, shows it as it is.)
- **On the campaign's page:** the prayer's name, its words, and under them
  the printing they are from, as a psalm stands there today.
- **In a reader's own prayers:** the name stands among those they pray for,
  and when they pray the campaign its prayer is read as a step of its own,
  as the psalm is today.
- **For the reposed nothing changes.**
- **No SQL:** a campaign already keeps a pointer to a prayer of the book
  (`prayer_rule`, `prayer_id`) and never its words, so a correction to the
  book reaches every campaign.

### 22.4 The gaps, and what would close them

Prayers made for the sick, for studies, for a journey and for thanksgiving
exist in public-domain books and are not in the app. Hapgood has a
thanksgiving for an answer to prayer (p. 512), a service for children
beginning instruction (p. 519) and a blessing for a journey (p. 524), each a
priest's service (section 2.4, read from its contents only); a prayer for the
sick still needs its source found. Each would be read off its page image,
word for word, and held by a test, about three hours apiece. Because a
preset is a pointer, a real prayer can take a psalm's place later without
anything else changing.

July's written lines are not proposed: they are ours, not the Church's.

### 22.5 Size

About 8 hours with the gates: the list and a kind's default with their
tests (1.5), reading a prayer from the prayer book's or the Bible's own file
when it is needed, with its printing's line (2), the start screen (1.5), the
campaign's page and the prayer's step (1), new words if any for his OK and
twenty languages (0.5), tests, three stills, the walk and the builds (2).

## 23. July's rows go thirty days after 1.9 ships (2026-11-10; built, waiting for a second read)

**His word** (`BRAINSTORM.md`, "all recs yes", about 17:05 UTC;
`OWNER-STEPS.md`, R9): July's old campaign rows are deleted 30 days after
1.9 ships. Put to him plainly since, by the arbiter: all of it goes, the
groups' private threads included, because nothing has reached them since 26
August.

**Since then:** Admin's second read passed (clear to ship, nothing to
change, 18:15 UTC). Its one legal note, that a campaign ever reported to
the authorities must be kept by US law, was put to him, and he answered
(about 20:12 UTC): "I don't know what you're talking about to the
authorities. Like, no, we didn't do that." None was ever reported, nothing
is held back, and the release commit can write the day. Its other note, that
a hundred kept rows would be all a run ever read, is written in the job's
header: nothing keeps a hundred today.

**The job** is `lib/campaigns/julyRows.ts`, carried by the heartbeat once a
day in a build that has campaigns (`lib/ops/maintenance.ts`,
`julyCampaignRows` in its report).

- **The day** is one constant, `SHIPPED_ON`, null on the branch. The release
  commit writes the day 1.9 shipped there, as it writes the first test's
  days. Rows go on that day plus thirty. Null, a string that is not a real
  day, or a day before 2026-11-10 means nothing is read and nothing is
  deleted, and the report says which. Agreed with Admin, who adds the line to
  R9 and to the release checklist (`docs/plans/v1.9/RELEASE.md`, section 6).
- **Only July's:** no length AND made before 2026-09-01, both, at every read
  and again at the delete, by id. A row with no length made later is left
  alone and counted as a stray.
- **The picture first,** by the rule a take-down uses: only when it is
  provably its creator's own upload. A file the storage will not delete keeps
  its row for the next run. A file that is not provably theirs is left, and
  the log says where it is.
- **Never a reading circle, and never a campaign of 1.9.** A circle on a path
  has no campaign, so nothing reaches it. Should a group of one of July's
  campaigns be in use (a circle on a path, or a campaign of 1.9 kept to it),
  that campaign of July's is kept and the report says so. Where the job
  cannot ask, it deletes nothing.
- **One switch** if he says the groups stay: `JULY_GROUPS_GO`. Then a
  campaign a group hangs from stays with it.
- **Twice is safe.** When nothing of July's is left to delete it leaves one
  public mark, a name and a time, in `data_moves`
  (`campaigns-july-rows-deleted`), so it can be seen to have happened with
  the public key.

**Run on a scratch PostgreSQL 16** standing on all 104 files of the folder,
with made-up rows: three of July's, one of 1.9 with its thread and a reader
joined, a stray, a parish group of July's with a member and a thread post,
and a reading circle with a member and a day's post. The delete the job
makes took the three, and with them the reader who had joined, the day log,
the report, the parish group, its member and its post. It left the campaign
of 1.9 whole, the stray, and the reading circle whole. A second time it took
nothing.

**What that run found, which reading the code had not:** a campaign kept to
a circle is deleted with that group (`prayer_campaigns.circle_id`, the
rework's own key). With a campaign of 1.9 kept to July's parish group, the
same delete took the campaign of 1.9 too. Nothing can make that row today,
since keeping a campaign to a circle is not built; the job asks all the
same, and when the circle is built its chooser must offer circles on a path
and never one of July's groups.

**Held by** `lib/campaigns/__tests__/julyRows.test.ts`, 23 cases against the
in-memory database, which now cascades on as the real one does. Eight ways
of breaking the job were tried one at a time, and each failed a case: the
second condition dropped, the day not waited for, a circle not kept, a row
deleted though its picture stayed, the delete not narrowed, an unwritten day
taken as today, a group in use not kept, a failed read passed over. The
tables' keys the job relies on are read from the SQL that made them.

## 24. A moderator's removal tells its creator why (2026-11-10)

**His word** (the Terms for what readers post, his yes of that day): "When we
remove something you posted, we tell you why, unless the law or someone's
safety stops us." The notice itself is the Admin chat's
(`lib/community/removal.ts`: one row in the reader's own inbox, what was
removed and a reason from a fixed list, no push). This is campaigns' side of
it, at Admin's ask.

- **A campaign taken down by a moderator** tells its creator once: a
  campaign, the reason, and its title in one line
  (`lib/campaigns/moderation.ts`, `removeCampaign`).
- **A picture taken down by a moderator** tells the campaign's creator, who
  is the only one who can put a picture on a campaign: a picture, the
  reason, and no words (`lib/campaigns/pictures.ts`,
  `removePictureAsModerator`).
- **The reason** is the one the moderator chose in the team's panel, carried
  from its route through `runCampaignModAction`. The moderators' page in the
  app asks none yet, and the notice then says the house rules, as it does
  for a post.
- **Once.** Only the removal that took it down tells anyone. A second tap on
  a campaign that is down changes nothing of its row and tells nobody, and
  two moderators deciding at once make one notice: the write is held to a
  row that is still up. Before this a second tap rewrote the reason and the
  time, and the upkeep counts its thirty days from that time, so a second tap
  quietly kept a removed campaign thirty days longer. It no longer does. It
  still tries once more for a picture's file the first try could not delete.
- **Never when it was not us:** a campaign whose days ran out and that the
  upkeep deletes, July's rows, a creator's own take-down, their own picture
  or comment. A test holds that the notice is written from the two removals
  and from nowhere else in campaigns.
- **A removal never waits on its notice.** Before the notice's SQL has run
  (it waited for his yes as `docs/1.9-build/sql/removal-notices.sql`; signed
  the same day and moved by Admin to
  `supabase/migrations/20261110204814_removal_notices.sql`, so the merge of
  1.9 runs it), the campaign is taken down all the same and no notice is
  written.
- **A campaign's comment** removed by a moderator goes through Community's
  own removal of a reply, which already tells its writer, as "your reply".
  Saying "comment" there is Admin's to change; `isCampaignThread` is the
  question it needs.

**Held by** `lib/campaigns/__tests__/removalNotice.test.ts`, 15 cases, and one
more in `lib/admin/__tests__/communityRoute.test.ts` (the panel's reason
reaches the removal). Five ways of breaking it were tried, and each failed a
case.

## 25. A store build has pictures only when it was cut with them (2026-11-10)

**Why.** The stores' rule against a feature asleep in a build (Apple's
2.5.19, already the rule for campaigns as a whole in
`lib/campaigns/flags.ts`). Pictures have a switch of their own on the server
(`lib/campaigns/parts.ts`). A store build that carried their controls while
the server had them off, to be turned on later by the server alone, would
carry them asleep. Raised by the arbiter and Admin; agreed with Admin, who
asked for it alone and first, so that every test build from now on is the
build he will submit.

- **The constant:** `PICTURES_IN_STORE_BUILDS` in `lib/campaigns/flags.ts`,
  committed false. In the release commit it is true only if pictures are on
  at submission (`docs/plans/v1.9/RELEASE.md`, section 6; `OWNER-STEPS.md`,
  R5d). A test holds it false for as long as the server's own switch is off.
- **False:** an app draws no picture and no picture control and asks the
  pictures' route for nothing, whatever the server answers. Turning pictures
  on in the apps then takes a new store build, which is reviewed.
- **True:** the server decides, as before.
- **The website** has no such rule and follows the server.
- **Where it is asked** (`lib/campaigns/partsHere.ts`): where the server's
  answers come into the app. The parts it says are on
  (`useCampaignsOpen.ts`), so the campaign's page, the rules and every call
  to the pictures' route follow; and the moderators' queue and the count on
  the moderators' button (`lib/community/client.ts`), which now say
  `pictures=0` to the server, are sent none and count none.
- **A picture put up on the website while a store build has none:** an app
  reader sees that campaign as one with no picture looks, under the app's
  own icon of its kind. Nothing says a picture is missing.
- **Whether it is a store build** is asked of the running app
  (`lib/platform/native.ts`): what a build was made for cannot be read in the
  app's own code.

**The harness** (`scripts/mock-campaigns.mjs`) wears the apps' own user
agent, so to the app it is a store build. On the committed export the walk
now holds, with the server saying pictures are on, that a campaign's page
draws none and asks for none and that the team's queue shows none. The
pictures' own stills (20 to 24) and flows need a scratch export cut with
the constant true, and are run only with `PICTURES_BUILD=1`.

**Held by** `lib/campaigns/__tests__/storePictures.test.ts` (10 cases) and one
more in `pictures.test.ts` (the route sends and counts none for a build that
says it has none). Three ways of breaking it were tried, and each failed a
case.


## 26. The prayer wall is gone: what was built (2026-11-10)

**His words** (`BRAINSTORM.md`): "I'd say remove the prayer wall and just keep
the prayer campaigns" (about 17:25 UTC), then "wall B" (about 18:00 UTC):
asking for prayers goes everywhere, the wall, the line on a profile and its
switch, I prayed and its notice, and the profile's count of who prayed. The
old requests are shown to no one from 1.9 and cleared fourteen days after it
ships. Section 21 is the plan; where the two differ, this section holds.

### 26.1 What a reader of 1.9 sees

- **Pray together is prayer campaigns alone.** `PrayerWall` and
  `AskPrayersSheet` are removed, and nothing is drawn in their place
  (`components/community/PrayTogether.tsx`).
- **Its door is drawn only where there is something behind it.** The door is
  the switch between Community's two halves. With the wall gone, Pray
  together would be an empty half for every reader campaigns are not open
  for, which is everyone but the testers between the release's first step
  and his opening them (R5c). So (`lib/community/halves.ts`, `prayDoor` and
  `halfShown`):
  - campaigns open for this reader: the switch, as before;
  - not open: no switch, Community shows the conversations, and an address
    that asks for Pray together shows them too;
  - not said yet (the app asks the website once a page load): nothing is
    drawn, and the switch's place is kept empty, its own height and the
    space above it, so the page under it does not move when the switch
    comes. The switch fades into the kept place; a place kept for nothing
    closes on the house curve. With motion off neither moves. (The place
    wears the switch's own two measures and not a size of its own: on the
    export a rem is 17px on a phone, and a place written in px stood one
    pixel off, which the walk caught.)
- **A profile** carries no "Asking for your prayers", no I prayed and no
  count of who prayed, and its editor has no switch for one
  (`ProfileViewer.tsx`, `ProfileEditor.tsx`).
- **The weekly Community email** loses its line ("N readers asked for prayers
  this week. The prayer wall is in Community."). Nothing is written in its
  place (the arbiter, 18:37 UTC).

### 26.2 The server, kind to an app of 1.8

An app that has not updated still draws the wall and the profile's line, and
cannot be changed. Each address it asks keeps answering, with nothing of
anyone's in the answer:

| What the 1.8 app asks | What it is told | What it shows |
| --- | --- | --- |
| The wall (`GET /api/community/prayer-wall`) | Nobody on it, and `intentions: false`. Nothing is read. | "No one is asking for prayers right now." |
| Ask, from the wall (`PUT /api/profile/me`, the request by itself) | 410, `request_closed`. No words are read, filtered or held. | Its own line for a save that failed. |
| The profile editor's save with the switch on | The other changes are saved; the request is passed over. | Saved; the switch reads off. |
| Taking one's own request down | Done: the time, the words, and a hold still waiting on them. | As before. |
| I prayed (`POST /api/community/pray`) | 409, `no_request`. Nothing is read or written: no row, no notice. | Its own line for a save that failed. |
| A profile, its settings, the relation | `prayerRequest: null`, `prayerRequest: false`, `prayed: false` | No line, the switch off, no I prayed. |

Honest limit: the 1.8 app has no words for "this has closed", so a reader who
taps Ask there is told the save failed and to try again. Updating the app is
the cure.

### 26.3 The requests already made

`lib/community/prayerRequestsEnd.ts`, once a day on the heartbeat
(`lib/ops/maintenance.ts`, `prayerRequestsEnd` in its report), whatever
campaigns' switch says.

- **When:** on and after the day 1.9 shipped plus fourteen days. The day is
  `SHIPPED_ON` in `lib/campaigns/julyRows.ts`, the one line the release
  commit writes for July's rows too (`docs/plans/v1.9/RELEASE.md`, section 6).
  While it is null, is not a real day, or is before 2026-11-10, nothing is
  read and nothing is cleared, and the report says which.
- **Why fourteen:** a request always ended by itself after fourteen days, so
  by then every one of them has run the whole of what its writer was told.
  Nothing is cut short and nothing is migrated.
- **What it clears, and only this:** `profiles.prayer_request_at` and
  `profiles.prayer_request_intention`, set to empty on every profile that
  has one (the words of long-lapsed requests too, which used to stay unseen);
  the holds still waiting on a request's words (`community_text_holds` with
  `profile_id` set and `status` pending); and every row of `profile_prayers`.
- **A hold a moderator had already decided** keeps its record, who decided
  and when, and loses the reader's own words (`original_body` set to empty
  where `profile_id` is set). Admin found on the second read that the
  moderators' history would otherwise keep, for good, the words the wall's
  end is meant to let go; the arbiter said yes as the plain consequence of
  his wall B.
- **One line in the moderators' log** for a run that changed something, in
  counts, with no words and no names (`requests_ended`), so a moderator who
  saw a hold yesterday can see why it went. Admin's suggestion, the
  arbiter's yes.
- **Nothing is held back for a report.** What was ever reported to the
  authorities must be kept, by US law, so it was asked of him. His answer
  (`BRAINSTORM.md`, 2026-11-10 about 20:12 UTC): "I don't know what you're
  talking about to the authorities. Like, no, we didn't do that." No request
  and no July campaign was ever reported, and the release commit can write
  the day.
- **What it leaves:** the "prayed for you" notices already in a reader's
  inbox, the names a reader carried from the wall into their own prayers
  (on their device, gone after their week), and the two columns and the
  table themselves.
- **It can run twice.** A second run finds nothing set. When a run goes
  through with nothing failed it leaves the public mark
  `prayer-requests-cleared` in `data_moves`. A part of the database that is
  not there is said as "absent"; any other failure leaves the rest to be
  tried, is said, and holds the mark back.
- **Until it runs** the old rows stay where they are, shown to no one. A hold
  on a request's words stays in the moderators' queue until it is decided or
  the job deletes it.
- It changes production data, so a second chat (Admin) reads it before it
  ships. Admin read the first four statements on a scratch PostgreSQL
  standing on all 104 files, twice: clear to ship (2026-11-10, 20:05 UTC).
  The fifth statement and the log line go to Admin for the same read.

### 26.4 The words

Retired in all twenty-one languages, 22 keys: `community.filterPrayer`,
`community.wallAsk`, `wallAsked`, `wallAskedAgo`, `wallBody`, `wallEmpty`,
`wallIntentionHint`, `wallIntentionLabel`, `wallIntentionPlaceholder`,
`wallNoLinks`, `wallTitle`, `wallWithdraw`, `wallWithdrawn`, `wallYou`,
`profile.pray`, `prayFailed`, `prayed`, `prayedCount` (every plural form),
`prayerRequest`, `prayerRequestMine`, `prayerToggle`, `prayerToggleHint`.

Kept: the ones campaigns borrow (`community.wallAdd`, `wallAddWhen`,
`wallAdded`, `wallTakeOut`, `wallTakenOut`, `wallInMyPrayers`,
`prayers.diptychs.wallUntil`), and the prayers' own two lines for names
already carried from the wall, which leave within a week
(`prayers.diptychs.wallHeading`, `prayers.wall.left`).

**One line named the wall and lost that clause:**
`prayers.commemorate.whereHint`, "These names are remembered before the
dismissal of the prayers you choose, with those you add from the prayer
wall." It now ends at "the prayers you choose." On the arbiter's word
(2026-11-10, 19:15 UTC), as a consequence of his wall B: it only takes away
the clause the wall's removal makes false and adds no new words, as with the
email's line. In the twenty other languages the same clause was cut from
each existing translation, with no new translation; a test holds that every
one is still one sentence and names no wall.

### 26.5 What holds it

- `lib/community/__tests__/prayerRequestsEnd.test.ts` (15 cases: the day,
  nothing before it, what is cleared and what is left, a decided hold's
  record without its words, the log's one line, a second run, a missing
  column or table, a failed step, the heartbeat). Eight ways of breaking
  the job were tried, and each failed a case.
- `prayerWallRoute.test.ts` (6: the wall's and I prayed's answers, and that
  neither reads or writes), `lib/profile/__tests__/prayerIntention.test.ts`
  (12: the profile's route, an ask alone and among other changes, taking one
  down).
- `halves.test.ts` and `prayAndTalk.test.ts`: the door's rule, the kept
  place and its height, no file naming the wall's parts, a profile with no
  request. Six ways of breaking the door were tried, and each failed a case.
- `wallNames.test.ts`: the wall's own words are in no language any more,
  and the line under Those I pray for sends nobody to the wall.
- The walk (`scripts/mock-campaigns.mjs`): Pray together with campaigns alone
  and the wall never asked for; the door waiting then open, with the page
  under it not moving; waiting then no; a reader campaigns are not open for;
  a profile with no request.

### 26.6 What waits

- Admin's second read of `lib/community/prayerRequestsEnd.ts`.
- The note's line, held by Admin in the release checklist until the wall is
  gone from the build and campaigns are open
  (`docs/plans/v1.9/RELEASE.md`, "Held lines").
- Later, not 1.9, with SQL he signs: the two profile columns and
  `profile_prayers` dropped; and `AddToPrayersSheet` with the prayers' side
  of the wall's names taken out, once nothing can be carried any more.
- Search still knows Community by the hidden words "prayer wall"
  (`lib/search/buildCorpus.ts`), so a reader who looks for the wall lands
  where it stood. Left as it is.

The wall's own code is in the repository's history. It is whole at
`bac1be393`: `components/community/PrayerWall.tsx`, `AskPrayersSheet.tsx`,
and the routes as they were. Its picture is
`docs/1.9-build/notes/decisions/wall-1-today.png`.

## 27. A campaign kept to one circle: the plan and its size (2026-11-10; a plan, nothing built)

**Why now.** The privacy page he approved says "A prayer campaign is public
unless you keep it to a circle" (`components/legal/PrivacyText.tsx`), and a
reader cannot yet. The arbiter put it first after the wall for that reason.
The design is section 4.2: a campaign can be kept to one circle (a parish, a
household, friends: the circles of Read together, joined by a code); then
only its members can open it, its updates and comments are theirs alone, and
it is on no board.

### 27.1 What is there already, from the code

- **The columns:** `prayer_campaigns.audience` ("public" or "circle") and
  `circle_id`, with a check that the two agree, in file one (run and signed).
  No SQL is needed.
- **The circles:** rows of `prayer_campaign_groups` that follow a reading
  path (`campaign_id` empty, `path_id` set), their members in
  `prayer_campaign_group_members`, made and joined on a path's page
  (`app/api/circles`, `components/reading/ReadTogether.tsx`).
- **The server refuses them today:** every start writes "public", the board
  and "Prayed by many" read only "public", and `mayRead` answers no for a
  row that says "circle" (`lib/campaigns/server.ts`).
- **One edge that decides the size:** a circle is deleted when its last
  member leaves (`app/api/circles/[id]`), and file one's foreign key then
  deletes a campaign kept to it, rows and all. Its picture files in storage
  are not rows, and would be left behind.

### 27.2 The plan

1. **Choosing it.** One more row on the start screen, "Who can see it",
   opening a sheet: Everyone in Community (as now), or one of the reader's
   own circles by name. Recommended: the row is drawn only for a reader who
   is in a circle, so nobody is offered a choice they do not have. Circles
   are still made and joined where they are today, on a reading path's page.
2. **The reader's circles and what is in them:** one new route of campaigns'
   own, `GET /api/campaigns/circles`, for a signed-in reader: their reading
   circles (never one of July's groups), and the campaigns running in them.
3. **Starting one:** the start takes a circle's id. The server takes it only
   if the caller is a member and it is a reading circle; anything else is
   answered as "no such circle", the same for a circle that is not theirs
   and one that does not exist.
4. **Who may open it:** its circle's members, and its creator. Everyone else
   is told what they are told of a campaign that does not exist. The one
   question is asked in one place and used by every route that opens a
   campaign (its page, its updates and comments, joining, reporting, its
   pictures, and the check a device makes of the names it carries).
5. **Finding it:** Pray together gains a list, "In your circles", above the
   newly asked, for a reader who has any. It is on no board and in no
   "Prayed by many", as now. Its page says who can see it in one line.
6. **A member who leaves the circle** can no longer open it, and its name
   leaves their prayers at the device's next check, with the line the app
   already has.
7. **A moderator reads it first**, like every campaign (recommended: the
   reasons for the reading, a named person's health and their blessing,
   hold in a circle too). The moderators' queue says it is kept to a circle,
   and which.
8. **A circle that ends.** When the last member leaves, the campaigns kept to
   it go with it, as file one already has it. Before that, the leave route
   removes their picture files, with the call July's job uses; if a file
   cannot be removed the circle is kept, empty, and the next leave tries
   again. This touches ten lines of Read together's leave route.
9. **July's groups** are never offered, and July's job already keeps a group
   that a campaign of 1.9 is kept to.

### 27.3 Words for his OK (English; then the twenty languages)

| Where | Line |
| --- | --- |
| The start screen's row | Who can see it |
| Its sheet, first choice | Everyone in Community |
| Its sheet, under the choices | A campaign kept to a circle is seen by its members only, and is on no list. |
| Pray together's new list | In your circles |
| The campaign's page | Only {circle} can see this. |

The circle's kind (Parish, Household, Friends) uses the words Read together
already has. The moderators' queue is English and says "Kept to a circle".

### 27.4 What holds it, and its size

Tests: who may open one, as a table of cases; the start's rule (not a member,
one of July's groups, no such circle); the new route (only the caller's, only
reading circles); each of the seven routes answering a reader outside the
circle as not found; the leave route's cleanup. The walk: starting one kept
to a circle; a member finds and opens it; a reader outside it is shown the
not-found page. Three stills: the row and its sheet, Pray together with the
new list, the page's line.

**About 9 hours.** The phased plan said 4 (section 6); the difference is
items 5, 7 and 8, which that figure did not count. Nothing here waits on SQL.
It does not miss 1.9 on its own account: the build can go ahead in English
and the five lines take their other languages after his OK.

### 27.5 As built (2026-11-10)

**His yes** (`BRAINSTORM.md`, about 20:07 UTC, to his decisions page):
"Yes to all recommended suggestions. Do them all." Call 22 carried circles
with all seven lines below and both rules (a moderator reads a circle's
campaign first; the choice is shown only to a reader in a circle). The seven
lines are in all twenty-one languages: each of the twenty is written from
that language's own neighbouring line (the note under the rules, the
waiting page's line, "Everyone in Community can read this", "Only your group
can read this", Read together's word for a circle), with only who sees it
changed. Where a circle's name stands in a sentence whose grammar would
bend it (Greek, French, Georgian, Hungarian, Turkish, Arabic), the word for
a circle or its members carries the grammar and the name stands as it is.

- **The question, in one place:** `mayRead` (pure) now takes the circles a
  reader is known to be in, and `mayOpen` finds them for a route
  (`lib/campaigns/server.ts`; the circles themselves, `lib/campaigns/circles.ts`).
  All seven places a route opens a campaign ask it; a test holds that none
  asks the bare question, which knows no circle. To a reader outside the
  circle every one answers exactly what it answers for an id that does not
  exist.
- **Its creator can always open their own**, also after leaving the circle.
  A member who leaves cannot, and their device is told "gone" at its next
  check, so the name leaves their prayers.
- **The reader's circles:** `GET /api/campaigns/circles` takes no id, and
  answers from the caller's own token: their reading circles (id, name,
  kind, never the invite code) and the campaigns running in them.
- **Starting one:** the start takes a circle's id only from a member of a
  circle on a reading path. A circle that is not theirs, one of July's
  groups and one that does not exist are refused with one answer, and
  nothing is written.
- **The screens:** the start screen's row "Who can see it" and its sheet,
  drawn only for a reader who is in a circle, with the foot saying who will
  see it; "In your circles" in Pray together; the page's line "Only
  {circle} can see this." and no link to share; the moderators' card saying
  the same.
- **A circle that ends:** Read together's leave route calls
  `beforeCircleGoes` (`lib/campaigns/circleEnd.ts`) before it deletes an
  empty circle, so the pictures' files of the campaigns that go with it are
  removed first. Told to the Updates chat, on the arbiter's word.
- **Two rules are asked twice** (in the read, and of what came back): only a
  circle on a reading path, and only the campaigns of the reader's own
  circles. A test holds both halves of each.
- **Seven lines, not five:** the five of 27.3, and two that are an existing
  line with only who sees it changed: under the rules on the start screen
  ("...before its circle can see it..."), and on a waiting campaign's own
  page ("It will show to {circle} once a moderator has read it..."). Sent to
  the arbiter for call 22.
- **The fold-in** (the arbiter's yes): a reader's own words on a campaign,
  its title, its words, an update and a comment, say `dir="auto"` wherever
  they are drawn, as Community's posts do
  (`lib/campaigns/__tests__/ownWords.test.ts`).

**Held by** `lib/campaigns/__tests__/circles.test.ts`, 32 cases, and
`ownWords.test.ts`, 4. Twelve ways of breaking the circle's rule were tried:
nine failed a case at once, and the three that did not were the doubled
rules, which now have a case of their own. The shared test stand-in learned
an exact count, a database function call, and the circles' two tables.


## 28. Each kind starts with its own prayer: as built (2026-11-10)

**His word:** "yes prayers" (about 18:15 UTC, `BRAINSTORM.md`), to the
mapping of section 22.

### 28.1 What a reader sees

- **Starting a campaign for the living:** the third row is "The prayer"
  (it was "A psalm"), and says "The name alone" until a kind is chosen.
  Choosing what the campaign is for sets it:

  | What for | The prayer |
  |---|---|
  | An illness | The Trisagion Prayers |
  | A trial | Psalm 90 |
  | The persecuted | Psalm 26 |
  | Guidance | Psalm 142 |
  | A journey | Psalm 120 |
  | Thanksgiving | Psalm 102 |
  | An exam or studies | The name alone |
  | Something else | The name alone |

- **The creator can change it.** The row opens a list: The name alone, The
  Trisagion Prayers, then Psalms 24, 26, 50, 90, 102, 120 and 142. Psalm 24
  is there for studies ("Shew me thy ways, O Lord; and teach me thy paths")
  and Psalm 50 because it was on the list before.
- **What a creator chose themselves stays.** Once they have chosen from the
  list, the name alone included, a later change of kind leaves the prayer as
  they set it. Not in section 22; added in the building, because a choice
  made by hand should not be changed for someone.
- **On the campaign's page:** the prayer's name, its words, and under them
  the printing they are from.
- **In a reader's own prayers:** the name is read among those they pray for,
  and the campaign's prayer follows the names as a step of its own, once
  however many campaigns name it. A rule that already says that prayer
  gains no second copy: Morning and Evening prayers open with the Trisagion
  prayers, so a campaign for an illness adds a name there and no step.
- **For the reposed nothing changed.**

### 28.2 Where the words come from

Nothing is written by us and nothing is copied: a campaign keeps a pointer
and the words are read from the app's own file when they are prayed.

- Psalms 26, 50 and 90: the prayer book's files, as before.
- The Trisagion prayers: the morning prayers' file.
- Psalms 24, 102, 120 and 142: the Bible's own files of them (Brenton's
  Septuagint, 1851), a verse a line. The prayer book has no copy of these
  four. It prints its own psalms from the same Psalter: a test holds that
  Psalms 90 and 26 are word for word the same in the prayer book and in the
  Bible's files, so the four are set as the prayer book would set them.
- **The printing under each** is its file's own source line, cut and never
  rephrased. For a psalm from the Bible's file it is the prayer book's own
  sentence for that Psalter, "Psalms from Brenton's public-domain
  Septuagint.", and only for a file that says it is that text.

### 28.3 What did not change

- **No new words.** "The prayer" is the line the campaign's page already
  had (`campaigns.thePrayer`), in every language; "The Trisagion Prayers"
  is the line the first-day walkthrough already had. `campaigns.new.psalm`
  ("A psalm") left the 21 catalogs.
- **No SQL.** The table's rule and the route's schema already take any
  pointer of this shape, and the route still holds it to the list: a psalm
  of the Bible's that is not on the list is refused.
- **Three files took the names of what they now carry:**
  `lib/campaigns/prayerTexts.ts` (was `psalms.ts`), `useCampaignPrayer.ts`
  (was `useCampaignPsalm.ts`) and
  `components/campaigns/CampaignPrayerSteps.tsx` (was
  `CampaignPsalmSteps.tsx`, the name in the table of section 9).

### 28.4 One line that is now a little loose

Under the list stands the line that was there before, "It is read from the
prayer book, after the names, by those who add this campaign to their
prayers." It is still true of every psalm. Of the Trisagion prayers in
Morning and Evening prayers it is loose: those rules say them at their
start, so nothing is added after the names there. Left as it is, because a
truer line is new words for his OK and twenty languages. Said to the
arbiter.

### 28.5 What holds it

`lib/campaigns/__tests__/model.test.ts`: the list of eight; each opening
from its file word for word; his mapping; each kind's prayer holding the
words put to him with it, read from the file; the psalm file's guard (not
another psalm, another book or another text); a creator's own choice kept;
the printing under each. `routes.test.ts`: the route takes each pointer and
refuses a psalm that is not on the list. `carried.test.ts`: a device keeps
only a prayer of the list. Eight ways of breaking it were tried: seven
failed a case at once, and the one that did not (the psalm file's guard,
doubled by the list) has a case of its own now.

The walk: the start sends the kind's own prayer (a journey, Psalm 120), and
a second flow walks every kind, reads the list, and holds that a prayer
chosen by hand stays. Stills: the start screen with the kind chosen (09),
the list (30), a campaign's page with the Trisagion prayers (04), and
Evening prayers with a campaign's psalm after the names (12).

### 28.6 After 1.9

Prayers made for the sick, for studies, for a journey and for thanksgiving,
word for word from public-domain books, one at a time: Hapgood's Service
Book has a thanksgiving (p. 512), a service for children beginning
instruction (p. 519) and a blessing for a journey (p. 524); a prayer for the
sick still needs its source found. Each is read off its page image and held
by a test, about three hours apiece. A preset is a pointer, so a prayer
takes a psalm's place in `KIND_PRAYER` and nothing else changes. Given to
the arbiter for the timeline's list of what comes after 1.9.

## 29. The safety line: as built (2026-11-10)

**His word.** Item 129 is answered (`BRAINSTORM.md`, 2026-11-10): no priest
and no lawyer is needed for campaigns, and "a plain safety line points a
reader in danger to emergency help". The words are the ones put to him and
approved in "rec yes to all", after each number and the site was checked on
its own page that day (the FCC for 911, the European Commission for 112,
988's own site, findahelpline.com's own). The one change that check made is
in them: "the European Union", where the draft said "most of Europe".

> If you or someone else is in danger right now, call your local emergency
> number (911 in the United States, 112 in the European Union). In the United
> States you can call or text 988 at any hour. Elsewhere, findahelpline.com
> lists helplines by country.

And over it, to a writer whose own words were caught: "A moderator will read
your words first."

### 29.1 Where a reader meets it

- **Always:** at the foot of the rules page, and at the foot of the start
  screen under the line about the moderator. A quiet line, for whoever reads
  that far before they write a word.
- **At once, to the writer of words that may mean danger:**
  - on their campaign's own page while it waits, under what the page says of
    waiting and above their own words;
  - under the field, the moment they send an update or a comment with such
    words.
  Both say "A moderator will read your words first." over the line, set apart
  so that it is seen.
- **The site's name is the one thing to tap,** and it opens the list of
  helplines outside the app. The numbers are words and not buttons, so that
  nobody calls an emergency line by a slip of the thumb.
- **Nobody else is ever told.** The mark is handed to a campaign's own
  creator and to a note's own writer, in the answer to their own request,
  and to no other reader, on no list and no card.

### 29.2 What happens to the words

- **A campaign** always waits for a moderator while campaigns are new. Words
  that may mean danger put it at the head of their queue, marked "Read first:
  the writer may be in danger". That was built in phase 1; what is new is
  that its writer is shown the line.
- **An update or a comment** was never read for this. Now it is: such words
  wait for a moderator instead of showing at once, their hold stands first in
  the moderators' queue, and its card says "Read first: the writer may be in
  danger" where it would have named a reason.
- **No SQL.** The table that keeps holds allows a few reasons and none is
  this one. Such a hold is filed as a note held at writing already is (the
  reason "spam", as words that ask for money are) with the truth in its
  detail ("crisis: the writer may be in danger"), and the queue draws the
  mark from the detail, never from the reason. Where something else held the
  note too (a new account's first words), the mark goes before it and that
  reason is kept.

### 29.3 What it does not do, said plainly

- **It reads English alone.** A reader in danger who writes in another
  language is read by the moderator who reads every campaign, and no sooner;
  the line that is always there is in their language.
- **It is a pattern, not a judgment.** It reads for a handful of plain
  phrases ("I want to die", "I do not want to live", "suicide", "kill
  myself", "end my life", "self-harm"). It will hold a comment about a death
  by suicide in a family, and it will miss what is said in other words. A
  moderator reads every campaign either way.
- **A held comment that a moderator then removes** counted against its
  writer as any removal does, and its notice said "against the house rules"
  unless a reason was chosen. For words like these that is the wrong weight.
  Named to Admin, whose rule for the moderators is in 29.5 and is built.
- **The words say nothing of doctrine,** and none was written for this.

### 29.4 What holds it

`lib/campaigns/__tests__/safety.test.ts` (14 cases): the phrases read and
the ordinary words of a grief left alone; the mark, and that nothing a
reader could write into a hold's detail makes one; the queue's order; his
words to the letter in English; in each of the 21 languages the three
numbers once each in the digits a phone dials, no other number, the site
once, no em dash; the one link and no number to tap; who is told; where it
is drawn. `routes.test.ts` (2 new): a creator's own waiting campaign says so
and no other reader's ever does, on its page or the board, and not once it
has been read. `thread.test.ts` (4 new): an update and a comment held with
the mark, the mark before another reason, and plain words told nothing.
Eight ways of breaking it were tried and each failed a case.

The walk: five flows (the rules, the start screen, a creator's waiting
campaign, a comment, the moderators' queue). Stills: the rules (31), a
waiting campaign in danger as its creator sees it (32), a comment's answer
(33), and the start screen (09), which now ends in the line.

### 29.5 The moderators' rule for such words (Admin's, 2026-11-10; built)

Held by `lib/community/dangerHolds.ts` and
`lib/community/__tests__/dangerHolds.test.ts` (14 cases, seven ways of
breaking it each caught). A hold is known by the mark in its detail,
whatever reason it is filed under and whether it still waits or was decided,
so the rule holds on every road to the same words: the queue's, or a
report's.

- **Never against the writer.** Removing words the safety line held does not
  count in their standing (`lib/community/trustServer.ts`): their limits are
  as they were. The reply keeps the record of who removed it.
- **Never "against the house rules".** Removing them needs a reason a
  moderator chose from the list, and the one that stands for "none was
  chosen" is refused, so the notice their writer is sent is true. The server
  refuses on every road; the moderators' page asks for the reason at once on
  such a card, offers the six real reasons, and keeps Remove dim until one is
  ticked. If no rule is broken the words are approved, or left waiting: a
  request for prayer in a hard hour is what campaigns are for.
- **Never quoted.** The moderators' log says such words were removed, or
  approved, and by whom, and not the words ("words that may mean danger, not
  quoted").
- **Filed as "spam", and never called it.** The holds' table has no reason
  for this and a new one would be SQL for his signature. The reason "words"
  will not do: it means "shown with some words masked", and approving such a
  hold would not show a note that is hidden. So the storage says "spam", the
  truth is in the detail, the moderators' page draws the mark from the
  detail, and nothing counts these as spam. The admin panel's own queue is
  Admin's to bring to the same mark.
- **Whether a moderator writes to such a writer,** in what words and with
  which help lines, is his to decide and is with the arbiter as a call. Not
  built.

---

## 30. A place: as built (2026-11-10)

His words: "Allow them to add a location." Planned in 2.9, 3.6 and 4.6; the
two columns were in file one from the start (`place_country`, `place_name`,
with the table's own check on their shape), so this needed no SQL.

### 30.1 What a reader sees

- **On the start screen** a row, Place, under the others, reading "Optional"
  until one is given. It opens a sheet: the country, in the house's own
  searchable list (`components/ui/SearchSelect.tsx`, the one the profile's
  patron saint uses), with None first; then, once a country is chosen, a
  field for a town or region.
- **The list** is the app's own list of countries
  (`lib/onboarding/clergy.ts`), named in the reader's language by the device,
  with the country the device's language points to first. A country is also
  found by its name in English, by its code, and by "usa" and "uk". That
  order is the only thing the device's language is used for: nothing is
  asked of the device, nothing is located, and only what the creator chooses
  is sent.
- **The town** is letters of any script, with spaces, hyphens, apostrophes
  and full stops, sixty characters at most. No digit at all, so no street
  number, no postcode and no telephone. A town that is not one is said so
  under the field ("A town or region is letters only, with no numbers.") and
  is left out: the row always says exactly what will be sent.
- **For a child** (a campaign its creator says is for a child in their
  care) no town is asked for, the sheet says "A campaign for a child shows
  the country alone.", and a town typed before that was said is not sent.
- **On the campaign's page** it is said under who started it and when:
  "Thessaloniki, Greece", or the country alone. A campaign with no place
  says nothing.
- **The moderators** read it with the rest, in the in-app list ("Place: Novi
  Sad, Serbia"), since every reader will see it once it is approved. The
  admin panel's queue is Admin's to give the same line (the fields are on
  what the server hands it).

### 30.2 What the server holds, whatever a screen sends

`lib/campaigns/server.ts`, `startCampaign`:

- the country is one of the app's list, and a town is a town by the same
  pattern the screen uses (`lib/campaigns/model.ts`, `cleanTown`). Anything
  else is refused whole (`bad_place`), never trimmed into something else;
- a campaign made by a parent or guardian keeps the country alone;
- the town is read as the rest is: a link in it refuses the campaign, what
  the filters see in it counts, and a town the word filter would mask is
  left out (a masked town is no town), with the creator asked first as for
  any masked word;
- on the way out (`publicCampaign`) a town is never handed over without its
  country, and never one that is not a town, whatever a row holds.

### 30.3 What it does not do

- No map, no coordinates, nothing read from the device or from the network
  address. `lib/campaigns/__tests__/place.test.ts` reads every file of the
  campaigns for the words that would do it.
- A place cannot be changed after the campaign is sent, until changing a
  campaign's words is built (phase 4's rest).
- The board does not sort or filter by place.

### 30.4 What holds it

`lib/campaigns/__tests__/place.test.ts` (the town's pattern in six
scripts, what is never a town, the way out, how it is said, the list and
its search words, the screens, and "never from the device"),
`lib/campaigns/__tests__/routes.test.ts` (four cases under "starting a
campaign"), and `lib/ui/__tests__/listbox.test.ts` (the list's hidden
search words). The walk: six flows. Stills: the Place sheet (34) and a
campaign's page with its place (35).

### 30.5 Words (his yes to call 29, 2026-11-11; in all 21 languages)

| Key | English |
|---|---|
| `campaigns.new.place` | Place |
| `campaigns.new.placeTown` | Town or region |
| `campaigns.new.placeNote` | A place is shown with the campaign to everyone who can see it. Give a town or a region, never an address. |
| `campaigns.new.placeChild` | A campaign for a child shows the country alone. |
| `campaigns.err.place` | A town or region is letters only, with no numbers. |

Already in the catalog and used as they are: Country (`shop.country`), None
(`profile.none`), Search for a country, No matches., Optional, Done.

---

## 31. Run it again: as built (2026-11-10)

The notes, 2.2: forty days is the ceiling, and "a need that lasts longer is
renewed: 'Run it again' makes a new campaign from the same parts, and nobody
is carried over without choosing to be." No SQL, and no change to the
server: a campaign run again is a new campaign through the same door.

### 31.1 What a reader sees

- **On its creator's own campaign, once it is over** (past its last day, or
  closed with "Answered, glory to God" or "Memory eternal"), the place where
  "Add to my prayers" stood holds **Run it again**. Nobody else sees it, and
  it is not there on one that still runs or still waits for a moderator.
- **It opens the start screen** with what was written and chosen then: for
  whom, the kind, the title, the name, the words, the length, the prayer (or
  the name alone), the place, and the circle it was kept to. One line at the
  head says what this is: "A new campaign, starting from what you wrote last
  time. Change anything you like. A moderator will read it first, and no one
  is added to it without choosing to be."
- **What never comes over:** who it is for by blessing (the three lines to
  choose from), the rules' tick and the Terms' tick. They are given again,
  and Create stays dim until they are. The blessing is kept with its own
  day, so a blessing given for forty days never stands for eighty unasked.
- **A new campaign in every way.** A moderator reads it before anyone sees
  it, it begins in nobody's prayers, and the old campaign is untouched: it
  is still deleted thirty days after its last day, as the page says.
- **One of July's** can be run again by the reader who started it: the one
  way a campaign of July's comes into the new form, by its creator's own
  hand and read by a moderator like any other.

### 31.2 What holds it

- Only the reader's own, and only once over (`lib/campaigns/model.ts`,
  `mayRunAgain`). The route says whose a campaign is, so an address that
  names anyone else's, or one that runs or waits, opens an empty page.
- **Never wider.** One that was kept to a circle comes over only if that
  circle is still among the reader's own, and then kept to it. Otherwise
  nothing comes over at all, so what was written for a parish is never set
  out on a page that would send it to everyone.
- `lib/campaigns/__tests__/again.test.ts` (15 cases). The walk: four flows.
  Stills: the ended campaign with the offer (36) and the start screen as it
  opens from it (37).

### 31.3 Words (his yes to call 29, 2026-11-11; in all 21 languages)

| Key | English |
|---|---|
| `campaigns.again` | Run it again |
| `campaigns.again.note` | A new campaign, starting from what you wrote last time. Change anything you like. A moderator will read it first, and no one is added to it without choosing to be. |

---

## 32. A kind on the board: as built (2026-11-10)

The notes, 2.10: "A choice of kind sits behind the sliders, as Talk
together's filters do." No SQL, no server change, and no new words.

- **Where.** On the board (`/campaigns`), at the end of the line that says
  "Newly asked": the sliders Talk together already has
  (`components/community/ActionMenu.tsx`), opening the same menu of choices.
- **What it offers.** Only the kinds that are on the board now, in the start
  screen's order, the reposed last, each by the name it already has ("An
  illness", "A journey", "For the reposed"). With one kind on the board
  there is nothing to choose, and no sliders are drawn.
- **How it behaves.** One kind at a time. While one is on, the sliders are
  lit and say its name; the same choice again goes back to every campaign.
  "Prayed by many", when it is drawn, keeps to the same kind where it holds
  any of it.
- **Never an empty board by a choice.** A kind that has left the board since
  it was chosen shows every campaign, not none.
- **It asks nothing.** The board is asked for once, whole, and a choice
  filters what is on the screen. Which kind of need a reader looks at is
  told to no one, which the walk checks against every address the page asks
  for.
- **A filter, so a small control is right for it** (his rule on floating
  pills, 2026-11-10): it switches what is on screen and leads nowhere.

Held by `lib/campaigns/__tests__/boardKind.test.ts` (15 cases; twelve ways
of breaking it tried, each caught). The walk: two flows. Still: the board
with a kind chosen (38). Its accessible name is a line the catalog has,
"What for".

---

## 33. Changing a campaign's words: what is built, and what waits for him (2026-11-10)

The notes, 4.4: "Their words: edit them (read again by a moderator)."

### 33.1 What is built: a change while it still waits

- **When.** From the moment a campaign is sent until a moderator reads it
  for the first time. That is when a creator sees the slip: a name
  misspelled, a day that moved.
- **What.** Its title, the name and the words. Nothing else: not who it is
  for, its kind, its length, its prayer, its place, or who can see it.
- **Where.** On its page, in its creator's menu: "Change the words". The
  sheet begins from the campaign as it stands and says until when: "You can
  change these until a moderator has read your campaign. After that, write
  an update, or end it and run it again."
- **Held to everything a new campaign is.** No link. A word the filter
  masks is asked about first. The moderator is told again what the filters
  saw in the new words, and words that may mean danger put it first in
  their queue and show its creator the safety line, as at the start.
- **Nothing is seen unread and nothing is read twice.** The moderator reads
  it once, as changed. If they read it between the sheet opening and Save,
  the change is refused and the sheet says why: "A moderator has read this
  campaign, so its words stay as they are." The rule is asked again inside
  the write itself, so there is no moment between the two.
- **After that line, nothing more can be saved from the sheet.** Save goes
  dim and the three fields are only to read, so what was typed can still be
  copied into an update. When the sheet is put away the page reads the
  campaign again: it no longer says it waits for a moderator, and its menu
  no longer offers to change its words. The page reads it then and not
  sooner, so the sheet is never taken from under the line that says why.
- **Never while hidden on readers' reports.** The words that were reported
  are the words a moderator must read.
- **Twenty changes an hour** for an account, which mends any slip and keeps
  nobody reading the same campaign all day.

### 33.2 What is not built, and why it is his call

Changing the words of a campaign that is **already running** cannot be done
honestly with the table as it is. There are three ways, and two are wrong:

1. **The change goes live at once.** Then words nobody read are in front of
   everyone, and "a moderator reads every campaign before anyone sees it"
   stops being true. Approve something plain, then change it: that is the
   door this would open. Not built, and I would not build it.
2. **The campaign goes back to waiting.** Then it leaves the board, its page
   closes to everyone but its creator, and it drops out of the prayers of
   everyone who carries it, for as long as a moderator takes. A typo would
   cost a sick person their prayers for an afternoon. Not built.
3. **The new words wait beside the old ones.** The campaign stays exactly as
   it is until a moderator reads the change, and then the new words take
   the old ones' place. This is the right one, and it needs somewhere to
   keep the waiting words: five columns on the campaigns table, which is
   one small SQL file for his signature, with a second chat's read, on a
   day that already carries the others.

**My recommendation:** ship 1.9 with the change while it waits (33.1), and
take the third way in 1.9.1 if he wants it. Until then a running campaign's
creator has what the note in the sheet says: write an update (which readers
see at once, and which is held by the same filters), or end it and run it
again with the words mended (section 31).

### 33.3 What holds it

`lib/campaigns/__tests__/routes.test.ts`, "changing its words while it
waits" (11 cases: whose, when, what, the filters, danger, July's, the
closed door) and `lib/campaigns/__tests__/change.test.ts` (12 cases: the
rule's one function, the write that asks it again, and the screens).
Fifteen ways of breaking it were tried and each failed a case, and ten more
for what happens after a moderator has read it in the meantime (14 cases in
that file now). The walk: two flows, the second through to the page read
again. The first failed on its first run by the script's own fault: it
expected three fields to be sent, and the app sends four, the fourth saying
that the writer has not yet been asked about a masked word. The script was
mended, not the app. Stills: the sheet (39), and the sheet after Save on a
campaign a moderator read in the meantime, saying why its words stay, with
Save gone dim (43). They are on
his page with call 31 as `decisions/change-words.png` and
`decisions/change-words-read.png`.

### 33.4 Words (his yes to call 31, 2026-11-11; in all 21 languages)

| Key | English |
|---|---|
| `campaigns.change` | Change the words |
| `campaigns.change.note` | You can change these until a moderator has read your campaign. After that, write an update, or end it and run it again. |
| `campaigns.change.saved` | Saved. A moderator will read it as it is now. |
| `campaigns.change.late` | A moderator has read this campaign, so its words stay as they are. |

---

## 34. The two notices: built, and on since 2026-11-11

The notes, 2.7 ("Nobody is told by default") and phase 4. No SQL: the
inbox's table already allows the kinds and the target these use
(`20261110204814_removal_notices.sql`).

### 34.1 What they are

1. **"Purify approved your prayer campaign."** To a campaign's creator,
   once, the first time a moderator reads it and puts it up. Its own title
   stands under the line. Not when a moderator keeps it after reports (its
   creator was never told it was hidden), and not when its days ran out
   while it waited. A tap opens "Your campaigns".
2. **"A prayer campaign in your prayers has an update."** Only to a reader
   who carries the campaign and asked to be told, on that campaign. The row
   carries no title, no name and no word of the update, only where the
   update is. A tap opens the campaign at its updates.

Both are a line in the inbox inside the app. Neither is a push: Community's
push would put "Your post was approved" on a lock screen, and a campaign has
no words of its own for one, so these rows never go through that writer
(`lib/campaigns/notices.ts`, "In the app only").

### 34.2 How a reader asks

- On a campaign's Updates door, a line to tick: **"Tell me when there is an
  update"**, with under it "A notice in the app, with no name in it. It
  stays off until you ask."
- Off until ticked, as the rule for reminders requires (`CONTRIBUTING.md`,
  "Reminders and streaks"). Adding a campaign to one's prayers never turns
  it on, and changing which prayers carry it leaves it as it was set.
- Kept on the reader's own row, so it is offered only where their account
  already carries the campaign: never to its creator, to a signed-out
  reader, or for a campaign carried on the device alone.
- A reader whose own last day has passed is no longer told.
- An update that waits for a moderator tells nobody until it is approved. A
  comment never tells anyone.

### 34.3 The switch

`lib/campaigns/noticesOn.ts`, `CAMPAIGN_NOTICES`, **true since 2026-11-11**.
Off, no row is written, the line to tick is not drawn, and the route that
keeps the tick is not a request at all. It was built off because a row must
be said in its own words before it is written: drawn by its kind alone, the
first would have read "approved your post" and the second "replied to your
post".

What turned it on, in order:

1. Admin built the inbox's side (aec6ad665, 2a204f3e8, d0ca4573c): the two
   lines in 21 languages, where each opens, and a rule that hands these rows
   only to an app new enough to say them (it asks with `inbox=2`), so an
   installed 1.8 never gets a dot for a row it cannot draw.
2. His yes to the lines (call 29, "rec for all", 2026-11-11 00:56 UTC).
3. Admin read the writers as pushed (c50c53d2b, cef0cdab0) and answered
   "Yes, flip it" (02:07 UTC): the rows match the inbox, neither is a push,
   and each is written only at the moment the notes say.

The four cases that held the shipped state as off now hold it as on, with
the real switch (`routes.test.ts` and `thread.test.ts`, "the notices, as
they ship"). He chose no test web for 1.9, so the first real rows are read
on the main web after the merge, for his account, before campaigns open
for every reader.

### 34.4 What holds it

`lib/campaigns/__tests__/notices.test.ts` (20 cases: the rows, who is told,
best effort, in the app only, the switch), `tellMe.test.ts` (12 cases,
through the routes with the switch on), and the shipped, switched-off state
in `routes.test.ts` and `thread.test.ts` (4 cases). Twenty-one ways of
breaking it were tried and each failed a case. The test stand-in for the
database now takes several rows in one insert, all or none, as the real one
does.

One fault of mine was caught by a guard that was already there
(`lib/supabase/__tests__/rowCap.test.ts`): I read the readers to tell in one
request, which the API cuts at a thousand rows without saying so. They are
read a thousand at a time now, and a case with 2,300 readers holds it.

A second fault of mine was caught by the still, and by nothing else. The
server said whether a reader had asked to be told, and the app dropped the
answer on the way: `fetchThread` (`lib/campaigns/client.ts`) names each
field it keeps of a thread, and the new one was not named. The routes' tests
passed, since they never ran the app's side, and the line could not have
been drawn on the day the switch went on. The app keeps the answer now, when
it is a plain yes or no, and `threadClient.test.ts` (4 cases) runs the app's
side against what a server can answer; broken four ways, it fails four
times. It was harmless as it stood, the notices being off. The lesson is the
house's own: a screen nobody has looked at in a browser is not done.

The walk: four flows (the line is not drawn as campaigns ship; ticking and
unticking; a tick the account could not keep; never for its creator).
Still: the Updates door with the line (41), drawn from the server's answer
as it will be once the notices are on.

### 34.5 Words (his yes to call 29, 2026-11-11; in all 21 languages)

| Key | English |
|---|---|
| `campaigns.tellMe` | Tell me when there is an update |
| `campaigns.tellMe.note` | A notice in the app, with no name in it. It stays off until you ask. |

The two inbox lines are Admin's and are already with him (call 29).

---

## 35. The Campaigns door on a profile: as built (2026-11-11)

The notes, 2.10: "A profile: the Campaigns door, for the campaigns a reader
chose to keep there." No SQL and no new words: the door and its name
("Campaigns") were drawn in 1.8 and switched off.

Agreed with the Updates chat, which holds the profile's files: the door's
hook, its panel and its route are in the campaigns' folders, and the three
lines that mount them in `components/community/profile/ProfileViewer.tsx`
went in with them, at Updates' word, so the door and what is behind it
landed together.

### 35.1 What a reader sees

- On a reader's profile card, a fourth door, **Campaigns**, beside About,
  Badges and Posts, **only when that reader has a campaign to show**. With
  none there is no door, never a door onto an empty box.
- Behind it, the board's own rows in one lit panel, newest first: a small
  picture, the title, and what it is for and until when. Rows, because each
  is a place to go. Never a count of anyone.
- A row opens the campaign's own page, and the profile's card steps aside.

### 35.2 What is on a profile, and what never is

`lib/campaigns/server.ts`, `listByCreator`:

- **On it:** that reader's campaigns that run now for everyone in
  Community; and one for the reposed that its creator chose to keep after
  its last day (his yes to item 125), which is the memorial the notes meant.
  Twelve at most.
- **Never:** one kept to a circle, one that waits for a moderator, one that
  was taken down, one of July's. Never one for the living once it is over:
  nobody's illness stays up by neglect (4.5).
- **Nothing at all** for a private profile (which shows a name, a picture
  and standing badges only), its owner included, so nobody is drawn
  something others cannot see; for a reader the asker has blocked or muted;
  or for a handle nobody holds. Each answers with the same empty list, so
  the answer tells nobody which it was.
- **Not on the page a search engine can read.** The shareable profile page
  (`/u/<handle>`) shows no campaigns: campaigns are not for search (4.2).
- While campaigns are closed for a reader, the door is not drawn and that
  reader's app asks for nothing.

### 35.3 What holds it

`lib/campaigns/__tests__/routes.test.ts`, "a reader's profile: the Campaigns
door" (10 cases through the route) and `profileDoor.test.ts` (10 cases: the
door, the viewer, the hook, the panel, the shareable page). Fifteen ways of
breaking it were tried: thirteen failed a case, and the other two were each
one of two locks on the same rule (which campaigns may be shown), where the
second lock still held; with both off, a case fails. The walk: two flows,
and the closed-door flow now opens a profile too. That last step timed out
on its first run by the script's own fault: it changed the address under an
open page with the router's push, which fires no `hashchange`, so no profile
opened to look at. It now leaves Community and comes back by the profile's
address, as a link from anywhere else does. Still: a profile with the door
open (42).

---

## 36. His answers of 2026-11-11, and what they put in

His word, about 00:56 UTC: "rec for all and finalize this build"
(`BRAINSTORM.md`). For campaigns it answered five calls, each as it was
recommended on his page:

| Call | His answer | What it put in |
|---|---|---|
| 26 | Yes to the short private note to a writer who may be in danger, sent only after a moderator has read the words | Admin: the notice, its words in 21 languages and its SQL. Here: the moderator's button and what it writes (section 38) |
| 27 | Yes to the picture check as built | Nothing to change. Pictures stay off until his key and his steps |
| 28 | Yes to the truer line under a campaign's prayer list | `campaigns.new.psalmNote`, in all 21 languages: "It is prayed by those who add this campaign to their prayers, in the same prayers as the name." The line of 28.4 is settled |
| 29 | Yes to the eleven lines: a place, Run it again, the two inbox notices, the line to be told of an update | The nine of them that are here, in twenty more languages (30.5, 31.3, 34.5). The notices are turned on with Admin (34.3) |
| 31 | Yes to the four lines for changing a waiting campaign's words; a running campaign's words stay as they are in 1.9 | Those four in twenty more languages (33.4). 33.2 is closed for 1.9: no SQL |

Each language follows its own catalog's words for a campaign, a moderator
and an update (German "Gebetsaktion" and "Neuigkeit", Greek "αίτημα", Russian
"просьба", Polish "intencja" and "wieści", French "nouvelles"), and its own
way of addressing the reader. The whole set was run through the language
tests before it was written in.

His rule of the same night binds what is left: "A release ships finished"
(`CLAUDE.md`). Nothing found while 1.9 is made waits for a 1.9.1.

---

## 37. The names carried from the prayer wall: two lines that named it (build 93, note 14)

When the wall went (section 26) two lines were kept on purpose, for a
reader who had taken a name from it into their own prayers before 1.9: the
heading over those names, "From the prayer wall", and the line at the end
of a rule when they are let go, "Those from the prayer wall leave your
prayers now." He met the second in build 93, and the arbiter's note is
right: both name a page nobody has.

The names themselves stay to their promised end. They were added under the
words "They stay in your prayers for a week, or until you have prayed for
them", and that is a promise about praying for a real person. A week after a
reader updates, nobody carries one and neither line can be seen again.

So the two lines say the same thing without naming where the names came
from:

| Key | Was | Is |
|---|---|---|
| `prayers.diptychs.wallHeading` | From the prayer wall | For a week |
| `prayers.wall.left` | Those from the prayer wall leave your prayers now. | The names you added for a week leave your prayers now. |

English is in. They are new words, so they are on his page ("yes week
lines"); the other way, put to him with them, is to let the names go at once
when a reader updates and delete both lines. The twenty languages are
written and wait for his answer. No other line a reader sees names the
wall, in any of the 21 languages (checked by each language's own word for
it); `lib/community/__tests__/prayAndTalk.test.ts` holds the English.

