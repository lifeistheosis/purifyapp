# 1.9 brainstorm

**From 2026-11-09 the main chat is the arbiter** (his word): it sends requests out to the Updates, Admin panel and SSM board chats and reports back to him. Its handoff is `HANDOFF.md` in this folder: read that first.

**Build 93, note 5 (his word, 2026-11-11 about 01:24 UTC, a screenshot of the 1054 event's Story timeline):** "Remember, on this section, I wanted you to add haptic feedback and make the design more... I feel like you can make the design better on this. It's good, but..." (`notes/build-93.md`, note 5).

**Build 93, note 4 (his word, 2026-11-11 about 01:21 UTC, a screenshot of the reader's Reading mode section):** "Refine this section and refine the design also." (`notes/build-93.md`, note 4).

**Build 93, note 3 (his word, 2026-11-11 about 01:20 UTC, a screenshot of Reading mode with Dawn checked and the screen still Dark):** "So this screen actually doesn't do anything. When I click on the stuff, it doesn't change anything." (`notes/build-93.md`, note 3).

**Build 93, note 2 (his word, 2026-11-11 about 01:19 UTC):** "The smooth scroll on the prayers is still buggy. Like it when I try and scroll down, it scrolls back up. When I try and scroll down, it just keeps on scrolling, so it's still buggy. And I guess it's just not refined for like UX experience" (`notes/build-93.md`, note 2).

**Build 93, his first note (his word, 2026-11-11 about 01:13 UTC, three screenshots in `notes/build-93/`):** "So, image 1 is the first council of Nicaea. Image 2 is me clicking on St. Alexander the Great, his profile photo. Also, you could clearly see that his photo isn't loaded. And when I go to image 3, right, when I click back to go back to the first council of Nicaea, it scrolls all the way down. Well, it actually doesn't scroll, it just randomly places you at the bottom of the first council of Nicaea, which is an issue because it should be placing you at the top of the page of first council of Nicaea." Before it: "im on build 93 im gonna tell you my critiques". The notes and who has each are in `notes/build-93.md`.

**"rec for all and finalize this build" (his word, 2026-11-11 about 00:56 UTC).** It answers, each as the arbiter recommended it on his page (version 48) and in the chat: call 23, the Portuguese Bible, Almeida 1911, labelled as the Spanish is; call 24, the Suggest link's words ("Suggest an addition", the English subject "Suggested addition: <the saint's name>", one line in the reader's language); call 25, St Irenaeus (Against Heresies III.4.1) and St Vincent on sola scriptura, after St Basil, St John Chrysostom and St John of Damascus; call 26, yes to the short private safety note, sent only after a moderator has read the words, its numbers checked on their official pages; call 27, the picture check as built; call 28, the truer line under a campaign's prayer list ("It is prayed by those who add this campaign to their prayers, in the same prayers as the name."); call 29, the eleven campaign lines (a place, Run it again, the two inbox notices, the update switch and its line); call 30, the quiet picture where there is one (St Sebastian's 1904 print, St Anastasia's Hermitage icon) and the plate for the Holy Innocents, St Eustratius and his companions, the Ten Martyrs of Crete and St Anysia; call 31, the four lines for changing a waiting campaign's words, a running campaign's words staying as they are in 1.9; and "yes Fable voices" (rec yes in the chat at 20:41 UTC), so a new Fable chat takes the voices and the Bible's tools on every historical text. "Finalize this build": every chat finishes its 1.9 lane and says so, then the arbiter cuts the final test build as the release would be (his rule of 2026-11-10), which talks to the test web once his steps T1 to T10 are done.

**Notifications on the Android app (his word, 2026-11-10 about 20:53 UTC):** "And also what I need to do for the notifications to work, because I swear we fixed the notifications and the notifications just still don't work on Android. Though web notification pops up for me, but not the Android app itself. It's weird, but yeah." The record (F-21, HANDOFF): Google accepts the Android sends and no phone has been seen receiving one since F-43's repair; iPhones receive (Apple accepted 279 of 292). So in 1.9 the Android path is found and mended end to end (Admin, which holds the push server and F-21), with one test sent to his account alone, never a broadcast; his part is to allow Purify's notifications in the phone's settings and turn a reminder on in the new build so his phone registers.

**The player in the notification bar (his word, 2026-11-10 about 20:50 UTC):** "Oh, also, I noticed that when you leave the app, the usually on Android, I don't know about iPhone. I haven't tested on iPhone, but on Android, when you leave the home screen, right, or you close the app, right, the audio player still plays, and it doesn't show the audio player on the native Android app. For example, on Spotify, if you leave the Spotify app, there is a Spotify music player on the notification bar, etc. I want the same thing for Purify." This was meant to work since 1.8 (lib/player/lockScreen.ts, the @capgo/capacitor-media-session plugin, a media-playback service with controls in the notification shade and on the lock screen), so it is a fault on his Android phone, not a new feature: found and mended in 1.9, then checked on his phone, the iPhone's lock screen with it.

**His three SQL results (2026-11-10 about 20:46 UTC, screenshots in the arbiter's chat, run on avbqyvjgcrucjwevwixt):** call 18's read-only check shows one check, `community_notifications_kind_check` (its list cut off by the phone's cell), and `none` beside kinds_outside; July's reminder lines show reminders_stopped 0 and still_on 0, so none were on. With his "Yes to all recommended suggestions", call 18's yes stands: the removal notice's SQL goes into supabase/migrations by Admin, unless Admin needs the full cell.

**Voices, and the Bible's tools on every historical text (his word, 2026-11-10 about 20:41 UTC):** "And also in this version, add the multiple voices. And yes, ensure every single part of, actually not every single part, but make sure the Bible section, the saints' lives, the saints' works, the ecumenical councils, the theology section, everything, like text related in terms of historically text, right? Even the history section, allow that to be read out, okay? And allow those sections, right, to be able to be highlighted. Allow it so you can share it, make an image. So pretty much the same features that the Bible section has, ensure that the other works also has, including the lives of the saints. And yeah, make sure there's one default voice for everybody, but make it so that Plus users get the other voices, and also make it downloadable, right? This is so we avoid a large app size. The same way we download the different Bible versions, once you get Plus, you can download all the different versions of, or all the different voices, right? But obviously, allow sample voice examples of samples, so you can like listen through each voice, and then you can come to the conclusion that, oh, okay, I want to download this voice, and then maybe download this one. So implement that. I'd say that's pretty safe. But yeah." So in 1.9: read aloud on the saints' lives and works, the councils, the theology section and history, as on the Bible; highlighting and sharing as a picture there too; one default voice free for every reader (today's, Kokoro's "Heart", his word of 2026-10-15 already gave Plus every voice); the other voices for Plus, each downloaded on demand like a Bible version, each with a sample to hear first. Today the Bible's New Testament is read from recordings made ahead on his PC (Homebase) and kept on audio.purifyapp.net; the Old Testament's are not made yet (PLAN 35). The arbiter proposed a new Fable chat for it, its first step a test on a phone of how the voices can run without making the app large, pending his word on the new chat.

**No report to the authorities, ever (his word, 2026-11-10 about 20:12 UTC):** "I don't know what you're talking about to the authorities. Like, no, we didn't do that." So no July campaign and no prayer wall request was ever reported, nothing is held back from the clean-up, and the release commit can write the day. In the same message: "Show me the 2 SQLs to send and I'll send them right now. Like, send it in the chat. Don't put it in the, you know, the calls. And I'll set it up when I'm home." So SQL for him is sent in the chat, never on the decisions page; the test web is set up when he is home.

**"Yes to all recommended suggestions. Do them all." (his word, 2026-11-10 about 20:07 UTC),** to his decisions page (https://claude.ai/artifact/HtMHvpk9SsKLwXG7AgJutq, version 35). Each call takes its "We suggest": (13) the Third, Sixth and Ninth Hours open like the First (O Heavenly King, the Trisagion, the Lord's Prayer), no priest (clergy item 29's part 1; part 2 waits for a source); (14) no editing of lives by readers; St John of Shanghai's full life in our own words, each part with its source, in 1.9; a Suggest an addition link under every life that emails us; (15) the passions and virtues picks; (16) saints month by month after December (January next, with St Philip of Moscow, in an update before January 1; readers' asks first in their month; St Tikhon of Athos only once his glorification is confirmed); (17) in 1.9 a public-domain Portuguese Bible, the language list saying what each language covers, and the Portugal words made Brazilian; next the daily prayers in Portuguese from free Orthodox texts, never machine translation; then other languages, the biggest first; (19) "yes Fathers" (the Arianism passages also on The Holy Trinity and The Incarnation, St John Chrysostom's own words on four heresy cards, three Fathers each on deism and sola scriptura, St Irenaeus and St Vincent read from their editions and shown to him first, the paragraph number left to the line, the studies' credit "Began as a thread on Purify's Discord server, in dogma-exegesis: ..."); (20) St Peter of Moscow's sentence on the Koran cut and shown as [...]; (21) the Terms, Privacy Policy and shop policy in the new look, as shown; (22) circles' seven lines and two rules. Not covered, because a recommendation cannot answer them: (18) the removal notice waits for his two-minute look at the live database, and his yes stands once it matches; whether any July campaign or wall request was ever reported to the authorities is a fact only he knows; the onboarding stays on (R0c) unless he says "roads off" after walking build 92; the July reminder SQL and the test web's steps are his to run.

**"finalize all the builds, and then send me the version 1.9 update." (his word, 2026-11-10 about 19:22 UTC).** Every chat lands what is its own in 1.9, with the gates, and no new scope; each reports what is open with an honest time, what waits on him, and "done for 1.9" when nothing is left. Then the final 1.9 test build is cut as the release would be (CLAUDE.md, the test web and the main web), on the test web once he has set it up (T1 to T10, Render's free size), and sent to him. Until then he gets the in-between build (92) and later ones as work lands, each with its limits named. The longest piece is December's saints with the whole of My Life in Christ, about November 20, by his word "whole Kronstadt".

**"whole Kronstadt. again no preist so just full publish." (his word, 2026-11-10 about 18:41 UTC),** to calls 11 and 12 on his decisions page. (12) St John of Kronstadt's My Life in Christ (English, 1897) goes into 1.9 whole, not a selection of about 50 pages: more than three days of typing from the scans, by the November saints chat, verbatim and read against the page images. (11) Butler's Lives go out with no priest's check: December's (about 15 saints, St Barbara, St Sabbas, St Lucy and the rest) and, on the same word ("again no priest"), November's eight held as clergy item 31 are published in 1.9, word for word with Butler's name on each. The cuts already made stay cut and shown as [...] (St Stephen's sentence on the pope of Rome, by the rule on Roman doctrine; St Catherine's sentence likening peoples to apes, by his call 10), and any December passage on Roman doctrine is cut the same way. Not covered by this word: clergy item 29 (the opening prayers of the Third, Sixth and Ninth Hours), put to him as call 13; St Theodore the Studite's Life (clergy item 4, his letters to Rome) was never put to him and keeps the short entry.

**"yes to all suggested" (his word, 2026-11-10 about 18:30 UTC),** to calls 9 and 10 on his decisions page: (9) the Plus sheet's test (B5) is switched on, a reader who taps a locked feature meeting either the list as built or the sheet open on that feature working, with the same price, words and button, starting only after the Plus card's test ends; (10) the sentence in Butler's life of St Catherine likening "savages" to apes stays cut, marked […], in the held life the priest will read.

**His last answers on the decisions page (2026-11-10 about 18:15 UTC):** "match light. all recs. yes prayers." (4) On Android 14 and older, Light and the light looks paint the status strip in their own paper with dark marks, so the top reads as one page. (5) Picture themes on tablets and the website, and the season themes (Lent, Pascha, Pentecost), come after 1.9; no gold theme, by his own rule. (8) Each campaign kind carries its preset prayer as listed on his page: the reposed "O God of spirits, and of all flesh" (Hapgood 1906, p. 91); an illness the Trisagion prayers; a trial Psalm 90; the persecuted Psalm 26; guidance Psalm 142; a journey Psalm 120; thanksgiving Psalm 102; exams the name alone (or Psalm 24); something else the name alone or any prayer on the list. The start screen's "A psalm" row becomes "The prayer". Real prayers for the sick, studies, travel and thanksgiving, word for word from public-domain books, come after 1.9, one at a time.

**His answers on the decisions page (2026-11-10 about 18:00 UTC):** "wall B yes July chats yes Plus card and pictures for 4 and 5? all recs for 6 and push 76 for 7." So: (1) wall B, asking for prayers goes everywhere (the wall and profiles, with the profile's "prayed" count), a campaign is the one way to ask, and the old requests are shown to no one from 1.9 and cleared 14 days after it ships; (2) July's old campaigns are deleted whole 30 days after 1.9 ships, the private group chats inside them included; (3) the Plus card is switched on (B4) with its test; (6) the stores' forms as recommended: the violence question answered honestly ("infrequent or mild", for the martyrdom accounts), the Play audience kept at 13 and over, pictures on at submission only if his three steps are done (otherwise left out of that store build), and Australia's under-16 law a lawyer's look later, not blocking; (7) push 76, given here in this chat. He asked where the pictures for calls 4 (Light's top strip) and 5 (theme ideas) are: they were still on their way from Fable Themes.

**The prayer wall goes; prayer campaigns stay (his word, 2026-11-10 about 17:25 UTC):** "I'd say remove the prayer wall and just keep the prayer campaigns." Community's Pray together shows campaigns alone in 1.9. The campaigns chat plans the removal (the wall's screens, its routes and count, the moderators' queue, the sheet that campaigns share with it, which stays) and what happens to the posts already on the wall, which is his to say (the arbiter's rec: hidden at 1.9, each author can read and delete their own for 30 days, then deleted, with a line in the 1.9 note).

**The Fire look comes out (his word, 2026-11-10 about 17:20 UTC):** "also I don't really like the fire theme", then, of the arbiter's two ways (remove it, which was the recommendation, or redesign it): "remove fire". It leaves the app's looks in 1.9 and goes to the Vault on the SSM board (nothing made is deleted). The share-picture style "Fire" that he picked on 2026-10-30 stays, as recommended, since he did not say otherwise.

**"all recs yes" (his word, 2026-11-10 about 17:05 UTC),** to the four small calls put to him after "rec yes to all": July's old campaign rows are deleted 30 days after 1.9 ships (OWNER-STEPS R9, a dated job in the heartbeat's upkeep); the admin sign-in code stays off in the apps for 1.9, so he can moderate from his phone, and R7 waits until he moderates from the website; the Greek word for "journal" against "calendar" waits for a native Greek reader after 1.9; and the Florilegium's starters in the reader's downloaded Bible (Theology's F3) come after 1.9.

**"rec yes to all" (his word, 2026-11-10 about 16:45 UTC).** It answers every recommendation put to him in this chat since his start, each as the arbiter wrote it: the test web, yes, set up at his next paycheck (or on Render's free size before then if Admin finds it carries his walk); the timeline "A now, B after" (A in 1.9; B, the backlog, as 1.9.1 and after with dates); "Prayed by many" with one exception to the "no figures on prayer" rule (an order only, never a number, five praying first, a creator can stay out); pictures at launch once his three steps are done (an AWS account for the check, NCMEC's CyberTipline registration, the Copyright Office's agent), with PhotoDNA added when Microsoft approves; the same picture limit for every reader, not a Plus perk; the safety line's words; the fourth campaigns SQL file (the Terms acceptance) once Admin's second read passes; "their own writings" for the Fathers' line on the Plus page; the four German mends on the Plus page; Butler's lives for 8 November saints, word for word with his name and the cuts shown, with a priest checking those 8 before release; St Paul the Confessor among Sardica's Fathers; the five Bible covers in the apps (+0.9 MB); the passions row varied with other Fathers' readings, the picks shown to him first; the 12 marked saint icons off the main web now, by a small fix to main, and off in 1.9; the other 84 unsourced icons swapped in 1.9 in batches, a free icon or the plate; modern saints on the plate until a painter or monastery gives written permission; St Memnon from Commons' clean copy; St Adrian on the plate; the councils' 13 portraits in the apps (+2.1 MB); an in-between test build once note 4 and note 8 land, talking to the main web, its limits named; the Privacy Policy and the shop's policy taking the Terms' new look; the website's page caching (optimization 7b) held; and the production baseline (`20261110155643_production_baseline.sql`, after Updates' second read), put to him as "yes baseline". Not covered, because they were never put to him as recs: "push 76" (his own word in the Admin chat), the July reminder SQL's two numbers (an action of his), Admin's R7 and R9 calls, the Greek calendar word, Theology's F3, and the clergy reviewer's name.

**Yes to the Terms for posts and campaigns, and a new look for the Terms (his word, 2026-11-10 about 16:30 UTC):** "and yes those terms are good / and also can you revamp the TOS design?" His yes covers Admin's drafts in `drafts/terms-posts.md` (d2a17b48d): the Terms' four parts in section 8 and the privacy page's campaigns and Community paragraphs, English and German, with the promise to tell a poster why their post was removed and the reasons shown to him with them (unkind or hateful toward a person or a group; names or shows someone without their agreement; private details about another person; a picture or words not theirs to share; advertising or spam; unlawful; against the house rules in another way). The notice's SQL still comes to him in plain words. The Terms page and its sheet get a new design: stills first, from the app's own parts, with the words unchanged.

**Everything in 1.9, nothing off at release (his word, 2026-11-10 about 15:34 UTC):** "Again, not off at release. I want everything in version 1.9." It answers the arbiter's list of what was off at release or left for 1.9.1: campaign pictures and "Prayed by many" (built, switched off), campaigns phase 4 (moved to 1.9.1 by "all recs" at 08:25), the optimization's larger wins (5 to 9 of `notes/optimization-fable.md`), and the like. Each chat lists every such item in its area with its size, its risk and what only he can do; the arbiter puts the new timeline to him. Pictures still need, before they open, an automatic image check (his account and key, never in chat) and the US Copyright Office's designated agent.

**Campaigns need no priest and no lawyer (his word, 2026-11-10 about 15:32 UTC, answering 113 and 129):** "Yeah, we don't need a priest or a lawyer to make prayer campaigns. Just make it clear that the prayer campaigns are made by the people, right? The photos they upload are their photos. And whenever they make a prayer campaign, they accept to the terms of service so that it's like their prayer campaigns are distinct from us. So, you know, if they put a controversial prayer campaign, like, they're the ones at fault, but also at the same time we are allowed to remove any prayer campaign, something along those lines." So: the Terms gain a section on campaigns in plain words (made by readers, not by Purify; their words and photos are theirs, and they confirm they may share them, with the consent of anyone they name or picture; they accept the Terms when they start one; they answer for what they post; Purify may remove any campaign at any time), drafted by Admin for his OK, with the privacy page's lines to match; the start of a campaign carries the acceptance. The arbiter's two recs, no priest needed: a plain safety line pointing a reader in danger to emergency help (the stores look for it where people post), and, before pictures open, the US Copyright Office's designated agent for takedowns. Opening campaigns for every reader no longer waits on a lawyer or a priest: it follows his walk on the test web and his OK of those words.

**The test web (his word, 2026-11-10 about 15:18 UTC):** first, of campaigns: "exactly I meant it should be in my build"; then "So when there's certain things we need to do that requires a public website to be pushed also, should we set that up also? So there's a second website on render"; then "Then yeah, let's make a test website. So a test web, that's what we're gonna call it. Because usually we would call the main, like the main web, but we would actually call this one the test web." A test build talks to the main web (purifyapp.net, still 1.8), so nothing new on the server side can be tried before release. The test web is a second, private website on Render running the branch, with its own test database, which test builds talk to. Admin plans it and writes his steps in `OWNER-STEPS.md`; the rule is in CLAUDE.md.

**Start on build 90's notes, and all recommendations (his word, 2026-11-10 about 13:50 UTC):** "All recommendations. Start." Brainstorm mode ends for build 90's notes 1 to 10; each is built to its plan in `notes/build-90.md`. "All recommendations" answers every rec put to him so far: the arbiter's list of 10:41 UTC ("all recs" covers 1 to 7: the covers carried in the apps with icons for St John Cassian's two books; the shop's shipping and refund policy in the sheet too; a plate, never another saint's face; a cover tapped at a book's head opens About this book; the English of Arabic and Urdu set right in 1.9; Plus and Your plan in all 21 languages; campaigns SQL file two), campaigns SQL file three (put to him at 12:02 UTC with Admin's check), note 7's new line "The opening prayers, as in the Morning Rule" and the same opening for the Third, Sixth and Ninth Hours with a priest checking first, note 8's three calls (the icon's blurred light leaves the prayer page's ground; Candlelight keeps the season on a prayer page; the slow breath stays on the plain dark themes and is still on a look), and a new Opus chat for November's saints. Note 2 is built for both cases (signed in or not), since his answer to that question is not needed for the plan.

**November's saints, all of them, in 1.9 (his word, 2026-11-10, in brainstorm mode):** "And also, I want all the saints commemorated on the month of November shown and added into version 0.9. Sorry, version 1.9. Alright. And check if any, well, also remember to add their works, add their life, and also if they are affiliated to any of the, right, like the fathers that we have associated, or if they're associated to any historical events or any timelines or any works that they need to get added. If it's also attributed to any councils, right, then we need to add that. But yeah, Opus can work on that, since that's like a lot of work, right? That doesn't necessarily need a fable. Right?" The arbiter's answer: Opus, not Fable; the work is sourcing and volume, not invention. Rec: a new Opus chat for it (asked of him), which plans first (who November holds on both calendars, who the app already has, which lives and works have a public-domain source, the links to the Fathers, events, timelines and councils, the size), then builds on his start. `docs/editorial-standards.md` binds it: public-domain sources only, verbatim and cited, nothing invented; a saint with no such source gets a short factual entry, never a written life; icons only with verified rights. Rec: built as a path that repeats each month, so December is ready before it begins.

**Start on build 89's notes (his word, 2026-11-10):** "You could start working on the fixes, right? While I do my thing, and when I come back, you could just update me on the status. But so far, everything's clean, everything's good." Brainstorm mode ends for his 14 notes; who builds which is in `notes/build-89.md`.

**Prayer campaigns, reworked, by Fable 5.2 (his word, 2026-11-10):** "I wanted version 1.9 to have the prayer campaign system, right? I never saw that implemented ... creating a prayer campaign for whatever, you know, the reposed, your sickness, your school exam. And users can participate in these prayer campaigns, and these prayer campaigns will be inserted into their prayers for either the day or the week or the month. And the person who created the campaign can create how long the campaign will be for ... they can put it in whichever section ... whether it's their custom prayers or whether it's ... the preset prayers that we put, that's based off ... Saint Tikhon's monastery ... a 3-image photo limit for normal users. And for premium users, they can add as up to 20 photos ... free users can add announcements ... Each day they can post an update ... allow comments on the prayer campaign ... top prayer campaigns ... Of the month, of the year, of the week, of the day. Allow them to add a location ... In theory, it's actualized through Halo. They have done it, but we need to make our own version." Prayer Campaigns was live on the web and withdrawn on 2026-08-26 pending a rework (3dc708ff, `lib/campaigns/flags.ts`); its tables and code remain. A Fable 5.2 chat at Max (session_01VuYTwbyUm9fyYex3QnL4Tu) designs the rework as notes and stills (`notes/campaigns-fable.md`), with safety, moderation and privacy for user content; nothing is built until his start.

**Themes: free plain, Plus unique, by Fable 5.2 (his word, 2026-11-10):** "I also want you to cook up better themes, and yes, use Fable for that. I want to see what themes Fable can cook up with. I don't like the themes we have now, except that light mode, parchment, and the dark one, and the one we have now for the default. Everything else, honestly, can look better. And yeah, pretty much users without premium will have generic colors, but users with premium will have more unique designs. For example, right, we, in our ads, we use that Galaxy Stars one. That should be one, that's part of plus users, and add a bunch more plus designs." A Fable 5.2 chat at Max (session_01VuYTwaqifrTcbG21cPxPqh) proposes them as stills; nothing is built until he picks. The same night he ended his notes on build 89 ("those are all the bugs for now", 14 notes) and confirmed the Theology chat at Max, which got its brief.

**Brainstorm mode on again, 2026-11-10, his word:** "Okay, so brainstorm mode on. I'm going over the app right now. I'm gonna send you a bunch of things to fix or revise." He is walking Android test build 89. His notes go to `notes/build-89.md`, each with what he saw and, once looked into, the cause and the planned fix; nothing new from them is built until he says start.

**Brainstorm mode ended again the afternoon of 2026-11-09, on his word:** "And let's continue working on version 1.9 ... And all you need to do is report back to me with creative decisions. That the chat needs answers on, and send out all the messages." The chats build what is ready and needs no answer from him; every decision goes to him through the arbiter. The same day the arbiter sent him every open decision as one sheet of 44, in four photos, each with its recommendation ("all recs" takes them all); his answers are recorded here as they come.

**His answers to the sheet (2026-11-09, by number, from voice).** Yes: 1 to 4 (the journal's line, covers from the 14 verified icons, print and export free, sharing; "I didn't put the SQL yet", so it moves into the migrations for the merge), 6, 7 ("just do the safer route"), 12 to 14, 15 ("we can't really get it checked by priests right now, so just, I guess, do your best"), 16, 17, 19 (built with no new framing to review), 20 (he picks the languages from TikTok and Discord requests), 25 ("if you're gonna implement it into the onboarding, make sure it's clean"), 26, 27, 29 to 31, 36, 37 ("a generic card, but I want like a unique design for every single version"), 38 (he pushes purify-ads himself), 45 ("make sure the design is good and optimized for the user's platform"), 46 to 48, 50, 51. Later: 18. Parked: 28 ("no one right now"). His own tasks: 24 (the chants), 42 (Stripe, which he notes serves the shop only, not subscriptions), 44 (Discord screenshots). Open, explained or drawn for him next: 8, 9, 10 (he leans to letting a lapsed reader read their own collection, and asked which limit is better), 11, 21, 22, 23 (he says Plus sells on the iPhone; the record says it cannot, so the Admin chat checks purchases by store), 32 to 35, 39 to 41, 43 (photos of the gift flow), 49 (Candlelight: "the themes in itself will need a very specific type of talk", so U6 waits for that talk).

**The promo's look (2026-11-09, his word, from voice):** shot like a trailer or a car brand's ad: "Each frame is a new beautiful background, new beautiful shot, new angle ... the globe is actually zoomed in, so you only see like a piece of the globe and it's spinning, rather than like the whole globe is like zoomed out and you see like the whole thing optimized just in the middle." So the clips are close crops of the real app with slow camera moves, never a whole screen centered. The SSM chat drafts a shot list and three sample shots for his OK first. He cuts the edit himself (the sheet's 35) and wants the clips at full quality, not through the chat, which compresses them on his phone.

**Covers are the saint the book is attributed to (his word, 2026-11-09, repeated):** "I wanted the cover photo to be the saint attributed to it. So if it's John, it's gonna be a cover of John." He had said it before; it was not in this record, so the plans page still showed one manuscript on the Psalter and the four Gospels. The Psalter shows David, John St John, Acts St Luke, and so on; feasts keep their own pictures.

**The reader's bars leave later and slower (his word, 2026-11-09):** "Can you just make it so that you need to scroll just a little bit more, and then it will like pretty much move the bottom? ... I want it to be slower ... So it could be more immersive." They went after 24px (`lib/ui/scrollAway.ts`, AWAY_AFTER_PX) on a 200ms front-loaded curve, which reads as a snap. Asked of Updates: about 80px before they go, a leave of about 500 to 600ms on a gentler curve, the return a little quicker, reduced motion untouched, every reader that shares the hook alike.

**The company (his word, 2026-11-10):** "We just got the DUNS number. We already got the EIN number." Then: "Okay, when I get home, I'm gonna start switching both of them. And yes, include the company name and like all the privacy and term stuff in the terms. So it switches from [his personal name] ... over to Purify Orthodox LLC 2026, or I think the correct format is 2026 Purify Orthodox LLC." He moves both store accounts to the company himself, starting that night, against the arbiter's rec to wait for 1.9. The legal name is taken as "Purify Orthodox LLC" until he confirms it from the EIN letter; the year belongs only in the copyright line, "© 2026 Purify Orthodox LLC". The terms, the privacy page (English and German), the footer and anything a reader sees name the company; the wording waits for his OK before release. Marketing email needs a business mailing address (EMAIL_POSTAL_ADDRESS, never his home).

**Onboarding, tailored by where a reader comes from: a Fable 5.2 brainstorm (his word, 2026-11-10):** "I want Fable, when you're done, right, when the builds are done, I pretty much want Fable to brainstorm this ... how we want to revamp our onboarding. Because remember, the whole point of our app is it's pretty good right now with how it does things, but it definitely could be way better in terms of onboarding execution to customizing a certain style of their Purify app to retain retention ... If they're Protestant and they picked out their Protestant, there's going to be a certain type of a Purify that they see that's customized for Protestants, right? This doesn't necessarily mean they're not going to see certain things that Orthodox Christians are going to see, but it's going to be tailored to their experience ... so it helps them retain and learn Orthodoxy or whatever they want to learn realistically, right? Early church, through whichever route they want to go to, because this is honestly the best way for us to tailor to a wide audience without actually being ecumenist. So we explain the faith as it is, the history as it is, and we invite everyone from all faiths and all beliefs to learn this Eastern Orthodox faith ... It's technically a spider web, right? Like how we can improve the spider web and how we can improve the results of the spider web. So like what to change after they get asked those new questions." A Fable 5.2 chat brainstorms it (notes only) once the builds are done; it builds on the transitionary rule of 2026-10-28 (`lib/onboarding/readerType.ts`). His reason, the same day: "there's a company that is a tarot spiritual reading type of app, and they tailor their experience depending on the person and their needs. So if they clicked on an anxiety ad, right, they're gonna get anxiety-based questions ... notice how they have a tailored based experience, and they also spent $1 million only on A/B testing ... So there's gonna be a lot of A/B testing with Purify. We're gonna A/B test a lot ... They A/B tested on the paywall screens, the different designs, right? The different features. They A/B tested the onboarding the most, right? Because that's how you get to know your customer, and then that's how you get to retain, you know, what they actually want." So the brainstorm also covers onboarding that starts from where a reader came in (the ad or link, `lib/analytics/source.ts` and `tag.ts`), and a way to A/B test onboarding and the paywall that keeps readers' privacy; none exists in the code yet.

**The company's name, state and addresses (his word, 2026-11-10):** "It's registered in Florida ... Purify Orthodox LLC. Just remember to change out all the stuff with the emails and replace it with the new ones. Support at [purifyapp.net] for technical support, but for legal issues, it's legal at [purifyapp.net]. '94, sure. '95, Florida. '96, change it all when ... version 1.9 gets dropped. And I guess keep it." So: the legal name is Purify Orthodox LLC; Florida law stays; support@purifyapp.net for help and legal@purifyapp.net for legal matters, everywhere, in the code and in the stores and Stripe; the terms' new date, TERMS_VERSION and the terms email on release day; the sign-off "Edgar, the Purify Team" stays.

**The company's address (his word, 2026-11-10):** "add a notice to something we need to change for the DNS and the company data is the location address, but other than that it's perfectly fine. You can do this for now." The D-U-N-S record is right but for its location address, which he will change with Dun & Bradstreet. OWNER-STEPS carries the notice: change it there first, since the stores read the company from it and show a selling developer's address to EU readers; never a home address in a public field or in EMAIL_POSTAL_ADDRESS.

**Steps for him, and the go to finalize (his word, 2026-11-10):** "So for all the stuff you need me to do, I need you to make a step-by-step like list on all of them, like on how I should do it. So when I get home, I can easily just click through and add the changes ... I'm talking about like more sensitive info, like if the ENV is messed up, if a setting needs to be changed. But yeah, other than that, if these are good, then start finalizing the version 1.9 build, right? If there's no more bugs to fix, and send it to me. So like send me the GitHub so I can download it on my Android and start testing it out." The arbiter read "if these are good" as yes to its recs for what is in the app and the admin, and told him so; whatever touches the live site, live data or money still waits for his word on release day. The Admin chat writes `OWNER-STEPS.md` and then formalizes 1.9; Updates finishes its queue; the Android test build follows, and its link goes to him.

**Covers for the 18 books with none (his word, late 2026-11-09, 86):** "The small book should, yes, and we should look for public domain icons for them. And yeah, make sure it's unique too ... make each book have a unique icon that's attributed to its book, either its author or like an icon about something that happened in the book." One icon per book, never shared and never repeating another book's cover, of the author or of a scene in the book, public domain and through the rights file; a book with none after a fair search keeps the manuscript until one turns up.

**His picks from the photos, and the Vault (late 2026-11-09, his words):** "lifted, keep red, and keep the pantocrator": 9 Lifted (the hours that are not now keep their icons, only the words go grey), 11 the commentary marks stay red, 77 the Holy Week plan keeps the Sinai Pantocrator. "Yes, the three new Bibles should go in version 1.9": 15 rides, Serbian, Arabic and Spanish (Romanian waits). On the 1.8 promo: "52 doesn't really matter that much. Again, that's not what really I was talking about for the promo. So like everything you made for that is technically like dead promo. Like, I'm not gonna say scrap it, right? Because we used our credits on it. We're still gonna use it in some type of way, but it's not really like what I was looking for. So just put that in our vaults." So the 1.8 reels, posters, frames, cards and kit go into a Vault on the SSM board, nothing is deleted, and no new promo is made until his direction.

**Yes to the arbiter's three (his word, late 2026-11-09: "yes to all your 3 questions"):** (1) a Stop sharing control for a shared journal page in 1.9, with the patch that makes stopping delete the copy and its reports (`docs/1.9-build/drafts/stop-sharing-deletes.patch`); (2) version B of the sharing paragraph on the privacy page, English and German (`docs/1.9-build/drafts/privacy-sharing.md`); (3) readers' things on Psalms 113 to 115 moved to the new numbering on release day (`docs/1.9-build/drafts/psalms-113-115-move.md`). The push to main that carries the move is still his separate word.

**The chant player (2026-11-09):** readers reported that it would not load, Plus readers most. A Fable 5.2 chat found the cause in the apps' own player (one failed request left a recording dead, or the chant list unread, until the app was closed) and fixed it on the branch (5ab77ecd, 331895fc, with a lasting guard in ba6b2a65). His word on a 1.8.1: "Nah, just add this to version 1.9. We're dropping version 1.9 really, really soon." So the fix ships with 1.9, with a line in its note.

**The privacy lines (2026-11-09):** the Admin chat's four lines for the privacy page, for 27 (counts), 31 (searches), 26 (Plus records) and 30 (errors), each going live with its feature and listed in the 1.9 letter. His word: "yes to all 4".

**Brainstorm mode was on again earlier on 2026-11-09, on his word:** "brainstorm mode on im back". Notes and plans only: nothing is built until he says start. Paused where it stood: the promo's edit clips (the frames and the count-up for the years are in `scripts/promo/`; the clips are not made).

**Brainstorm mode ended 2026-11-08 on his word:** "Just keep working on the apps. You have a list of things that you still need to do. Just do all of it ... Leave directive decisions for me ... don't stop until I come back." From here the work is built; decisions only he can make go to `PLAN.md`, Waiting on you.

Brainstorm mode is on since 2026-11-06: notes and plans only. Nothing here is
built until Edgar says to start. He said start on 2026-11-07 and the build day
followed (`PLAN.md`); on the evening of 2026-11-07, with test build 88 on his
phone, he turned brainstorm mode on again: notes and plans only once more.

The repository is public: no figures, no readers' names, no money in this file.

## The theme of 1.9: expand and refine (his words, 2026-11-06)

"the aim for version 9 is to expand, right, and refine. I think if there was
two words, it would be that, to expand and refine."

- **Expand:** the content, Plus, the languages, the chants, the history.
- **Refine:** the chants, the systems, Plus, the backend, the systems overall.
- **Last of all, the app itself:** the megabytes, the animations, all of it,
  once everything else is done.

The goal he set for the Plus review: retention and experience, so a
subscriber feels they get the most from Plus and Plus gives the most for the
money. Bugs and anything that breaks his flags go in too ("I want version 9
to be impeccable").

## Where the record lives

The first part of the 1.9 brainstorm ran on a second Claude account (this one
had hit its limit), on the PC, and its notes stayed in Homebase. A cloud
session cannot open Homebase (on 2026-11-06 the PC did not offer the folder to
cloud sessions), and one account cannot read the other's chats. So from here
this file is the record: any account on any machine can read it on GitHub.
Whatever is decided elsewhere is copied in here, and a new session reads this
file first.

**One branch (his word, 2026-11-07).** The work and this record are on the
branch `ccr-07896cf2-bo0afd` until 1.9 merges into main, and main has neither:
main is the website, and a push to it deploys. A new session, on any account
or machine, checks that branch out first and pushes nowhere else. On GitHub,
read this file on that branch.

Not here yet:

- The other account's 1.9 notes.
- The SSM board changes made there (the board lives with purify-ads, not in
  this repository).

## Built since 1.8 (admin only, live on main)

2026-11-02, this account (`00500450`, `be40c49b`, `390320ff`): Traffic shows
visitors by day for 7 to 120 days with a median line, and any single day can be
picked.

2026-11-04, the other account (`6445c854`, `aaa74a50`, `632aa536`, `27f1bcaf`):

- No Home flash on a saved link; the phantom Home visits left the usage log.
- A timeline that never resets, read a week at a time back to May 2026; the
  bell reads the same log.
- Goals as pace bars that keep themselves up to date.
- Home A (numbers first) or B (money leads), picked in Settings.
- One chart: Visitors, Page views and Signups as switches.
- Today beside last night, A or B, picked in Settings.
- A zoomable map with readers in green, and Traffic > Live: everyone on the
  site, and the pages each one opened.
- A phone pass: switches and links a thumb can hit, nothing wider than the
  screen.

## Carried into 1.9

From `docs/plans/v1.8/since-1.7.2.md` (Not in 1.8) and
`docs/plans/v1.8/drop.md` (What may not be said), checked against the code on
2026-11-06:

1. **Find a parish**: the parish directory. Not built.
2. **Purify Parish**: the parish plan. Not built.
3. **The screens locked on 2026-10-27**: Bible reader, praying, Premium pill,
   chant page, shop, theology, saint page, Discover, paywall, Prayers home,
   player (`Homebase/boards/purify-master/variants/INDEX.md`). Today waits on
   his mockup.
4. **Chants beyond the Anthem**: wait on his recordings.

Stale in the 1.8 file, so not carried: Onboarding version 4 and "Where are
you coming from?" went into 1.8 after that file was written (the question is
first in `components/onboarding/OnboardingFlow.tsx`, counted from version 4
in `lib/onboarding/counting.ts`, and the priest, deacon or layman screen
followed as version 5).

Not built, with no release named: the Old Testament read aloud (only the New
Testament is recorded) and a choice of voices.

Open audit items with a claim on a slot (`docs/audit/findings.yaml`):

- **F-37** (P2): the Stripe webhook can mark an order paid while Stripe says
  the checkout is unpaid, so goods can go out before the money is in.
- **F-09** (P2): no tests on the API routes and money paths.
- **F-21** (P2, partly corrected): native push.
- **F-49** (P2, partly corrected): reading-room sections shown as words their
  book does not hold.
- **F-22** (P2, mitigated): 107 of 110 saint icons with no source or licence
  on record.

## First read (Claude, 2026-11-06)

To be weighed against the other account's notes once they are here.

- **Parish is the biggest lever and the biggest risk.** A priest pointing his
  people to Purify reaches readers no ad reaches. But a directory is only as
  good as its accuracy: a wrong address, or a community listed that a reader's
  own bishop does not recognise, costs trust with the very clergy a parish plan
  is sold to. Which jurisdictions are listed is a church question, so it is a
  rule for Edgar and the clergy queue to set, never for Claude
  (`docs/editorial-standards.md`). Build it from a list Purify may use (a
  licence, or the parishes' own submissions), not scraped from a diocese's
  site. Read-only first, with a way to report a correction.
- **The parish plan comes after the directory.** A paid plan is pricing and
  terms: his decision, and new legal text. Let the directory show parishes
  come before anything is sold to them.
- **The eleven locked screens go in slices.** Eleven redesigns in one release
  is the riskiest shape a release can take; 1.8 was still merging fix branches
  into its last build (the `r5` and `r6` branches, build 87). Three or four a
  release, the ones that touch revenue first (paywall, Premium pill, shop).
- **Chants and the Old Testament are waiting on inputs, not code.** Each takes
  a slot when its recordings exist; neither should lead.
- **F-37 goes in whatever the theme.** Small fix, real money.
- **Let the counts choose the content.** Since 1.8 the admin counts where
  readers come from and what they look for. Read those before deciding what
  1.9 teaches.

## Questions for Edgar

1. The other account's 1.9 notes: paste them here, or name the file in
   Homebase.
2. The SSM board: what changed, and does any of it touch 1.9?
3. What leads 1.9?

## Plus, feature by feature (from 2026-11-06)

His words: "let's talk about the plus subscription. list ever single feature
of it and we will individually brainstorm each feature and how we can improve
it".

**The price** (`lib/premium/plans.ts`): $9.99 a month or $71.99 a year; the
year saves 40% and begins with 7 days free on a first subscription. Pro, at
$19.99 or $199, is everything in Plus with the EIKON Box, the members'
benefits, and Studio Audio (coming soon). Prices and terms are his decision.

**Where it is sold:** the website and Google Play lock Plus. iOS cannot sell
it yet (the App Store products were at MISSING_METADATA,
`docs/app-store-review-notes.md`), and the rule in
`lib/entitlements/entitlements.ts` never locks what cannot be bought, so an
iOS reader has all of Plus free.

**What nobody can see:** which lock a reader taps, and which lock leads to a
purchase. The server takes onboarding and screen events only
(`lib/security/schemas.ts`, `trackEventSchema`), so which feature sells Plus is
not known.

The fourteen, as the paywall lists them (`lib/premium/plusRows.ts`), each with
what stays free and where its lock is. All twelve locks checked in the code on
2026-11-06.

| # | Feature | What it does | Free beside it | Lock |
|---|---|---|---|---|
| 1 | Word study | Every place a Greek word stands, Septuagint and New Testament, the verse beside each | The Greek beside the text, every word's dictionary entry | `components/bible/ChapterReader.tsx` |
| 2 | Candlelight and Monastery | Two reading palettes for long hours | Dark, Light, True black | `components/reader/ReadingModeChips.tsx`, `components/settings/ReadingModePages.tsx` |
| 3 | Cross-references | The passages a verse echoes across the New Testament, one tap to open | Every verse, the Greek, the Fathers' commentary | `components/bible/ChapterReader.tsx` |
| 4 | Your journal | Every note, dated and gathered, with this day in past months brought back | The notes on the verses themselves | `components/journal/JournalClient.tsx`, `components/you/KeptShelf.tsx` |
| 5 | Listen offline | Save a book's readings on the phone (the apps) | Listening online to every chapter | `components/player/SaveOffline.tsx` |
| 6 | Ambience | Rain, birds, a bell, cathedral bells, the sea, wind, under the words | The chant under prayers | `components/player/AmbienceSheet.tsx`, `components/player/PrayWith.tsx` |
| 7 | Reading plans | The Psalter by kathisma, the Gospels a chapter a day, Proverbs in a month; place and streak kept | The whole Bible and the daily readings | `components/plans/PlanClient.tsx` (Begin, and marking a day) |
| 8 | Remember the verse | Saved verses come back, one card a day, until known by heart | Saving verses | `components/today/RememberCard.tsx`, `components/you/PractiseSheet.tsx` |
| 9 | Your Florilegium | Collections of verses and the Fathers, with notes | What is already gathered stays on the device | `components/bible/VerseRow.tsx`, `components/florilegium/AddToFlorilegium.tsx`, `components/saved/FlorilegiumRow.tsx` |
| 10 | Sync | Notes, highlights, bookmarks and collections on every device | Reading and saving on the device; pre-launch supporters keep sync for life | `components/profile/ProfileSyncStatus.tsx` |
| 11 | History in full dress | Period artwork behind every event, the motion through the timeline, a council's picture moving | Every event, source and citation | `components/history/EventPictures.tsx`, `components/councils/CouncilHero.tsx` |
| 12 | Profile extras | Avatar frame, profile effect, banner picture, two-color theme in Community | Profile, handle, badges, banner color | `components/community/profile/ProfileEditor.tsx`, `components/community/CommunitySide.tsx` |
| 13 | The Plus mark | A small cross beside the name in Community, which he can turn off | | Settings |
| 14 | Discord status | In the Windows app, the Discord portrait framed in the season's color | The other Discord modes | `components/desktop/DiscordModes.tsx` |

Each feature's ideas go under its number below as we reach it.

### How we go through it (his call, 2026-11-06)

Section by section, in chat, with real screenshots of each feature as it is
today: not designs, a picture of what it is. No showcase page (his words:
"more token usage"). The shots come from a local run of the app, where Plus is
open, because this cloud session cannot reach purifyapp.net. His picks are
recorded here under each feature.

The order:

1. Study: word study, cross-references
2. Reading: Candlelight and Monastery, ambience
3. Listening: listen offline
4. Practice: reading plans, remember the verse, journal
5. Keeping: Florilegium, sync
6. Beauty: history in full dress
7. Identity: profile extras, the Plus mark, Discord status
8. The bundle: the price, the trial, the paywall, iOS, and counting what sells

### Section 1: Study (2026-11-06)

**1. Word study.** With the Greek on, a tapped Greek word gives its meaning
free (Strong's, with its parsing); "Every place it appears" is Plus: every
verse holding the word, the New Testament (λόγος: 331) and the Septuagint
(1,101), the English (KJV, Brenton) above the Greek with the word lit.

What is weak:

- Hidden: it is reached only with the Greek turned on, which is off by
  default and, on a phone, sits in a menu. Most readers never meet it, so they
  never meet its lock either.
- The meaning is Strong's (1890): short, in the English of its day, with
  nothing of the Church in it.
- The list is a wall: 331 verses in Bible order, from Matthew, with no sense
  of how the word is translated.
- Only the Greek is lit in each verse, not the English word that renders it.
- The lock is in the app only: `/api/bible/word` answers anyone. Low risk
  for public-domain text, but it is not a server-side gate.

Ideas, best first:

- A. Tap any English word to study its Greek. The English is already tagged
  word by word with its Greek number (`data/bible/english-tagged`: 25 of the
  27 New Testament books, all but Philippians and Philemon, and 44 books of
  the Old Testament), so this needs little new data, and it puts the feature
  in front of every reader.
- B. "Translated as": how the KJV renders the word (word, saying, account),
  with counts, each a filter. From the same tags.
- C. Begin where the reader is: the verses of the open book first.
- D. Say the count before the lock: "Every place it appears, 331 and 1,101".
- E. Light the English word in each verse, beside the Greek.
- F. A fuller dictionary beside Strong's, public domain only (for example
  Abbott-Smith, 1922; the licence of the digital copy checked first).
- G. Later: the Fathers on the verses that hold the word, from the commentary
  the app already carries. Editorial care: exact passages only.

**2. Cross-references.** On a phone: hold a verse, then Cross-references,
seventeenth of eighteen rows in that menu (counting the seven colours). Plus: the verses it echoes, with their
words, one tap to open. Source: OpenBible.info (readers' votes, CC BY). New
Testament to New Testament only: the KJV and the Septuagint number verses
differently, and no map between them exists yet (`lib/bible/crossRefs.ts`).

What is weak:

- No Old Testament. For an Orthodox reader the Psalms and the prophets are
  where the links matter most (John 1:1 to Genesis 1:1 and Proverbs 8).
- Hidden on a phone: nothing on a verse says it has links.
- The links are readers' votes, not the Church's reading.

Ideas, best first:

- A. The Old Testament in the Septuagint: build the numbering map between the
  KJV and Brenton. The biggest gap.
- B. The Fathers' own links: the verses the Fathers cite when they comment on
  this verse, from the commentary the app already carries, each with its
  source line (`lib/citations`). No other app can have this. Exact citations
  only, never inferred.
- C. Show it: a small mark on verses that have links, and the count on the
  menu item.
- D. Read around a linked verse (the verse before and after) without leaving
  the sheet.

### His picks, section 1 (2026-11-06)

His words, from voice: "we kind of need like the UI system really clean so
someone can easily highlight, easily copy, easily share, easily make an image
... and easily look at the Greek and easily compare it ... with the premium",
and "just do your pick for now and really explain what your pick is ... show
photos". On the Fathers' links he is unsure: parked, not dropped.

- **Word study: A, tap the English word**, inside one clean verse system
  (below), because a tap or a hold on a word collides with what the reader
  already does with a verse.
- **Cross-references: A, the Old Testament in the Septuagint.**

**The verse system, one rule per gesture** (mockups made 2026-11-06 on the
local app, not built):

| Gesture | Today (`components/bible/VerseRow.tsx`) | Proposed |
|---|---|---|
| Tap a verse | Nothing | Selects it; one bar comes up: the seven colours, Copy, Share, Image, Note, Greek, Compare (Plus), Cross-refs (Plus), More. Tap more verses to add them; tap outside to close |
| Tap a word | Nothing (only Greek words, with the Greek on) | In a selected verse, its card: the Greek word, the meaning (free), every place it appears (Plus), with the count said before the lock |
| Double tap | Highlights the verse | The same; the first tap selects, so nothing waits |
| Hold | An eighteen-row menu | Hold and drag marks some words, as now; the menu's rows move into the bar and More |

**Superseded for tap, double tap and hold (his word, build 90 note 10, built 2026-11-10 by Updates, `e7aa51c7`):** "make it so that when you double tap, it automatically highlights the last color you picked. And also make it so that when you hold it down, then that window pops up." Now: a single tap does nothing, with no wait added; a double tap highlights the verse in the colour last picked (yellow if none was ever picked), with the soft tap and Undo, and a double tap on a highlighted verse takes it off; a hold opens the verse's window. The red verse numbers and the Greek words keep their own taps. Each verse has a hidden "Verse actions" button for screen readers and keyboards. The Fathers' paragraphs take the same double tap. The three choices were built to the chat's recs under his "All recommendations"; he can flip any after the next test build. The table above records the 2026-11-06 proposal.

Nothing appears while a reader only reads: no popups until a tap. Compare,
if Plus, needs one check first: licensed translations (NIV, NKJV, NLT) often
may not be sold behind a paywall under their publishers' terms.

**Cross-references, the numbers** (OpenBible.info's set,
`scripts/cr/cross_references.txt`, counted 2026-11-06):

- 344,799 links in the set; the app uses 84,369 of them (New Testament to New
  Testament, 24%). Dropped: 30,226 from the New Testament into the Old, and
  all 230,204 that start in the Old Testament.
- The most-voted link for John 1:1 is Genesis 1:1 (333 votes), and it is
  dropped today. So are Proverbs 8:22-31 (106) and Isaiah 9:6 (95).
- 21,556 Old Testament verses, the Psalms among them, would have
  cross-references for the first time.
- The map is the work: the link data is numbered as the KJV is, Purify's Old
  Testament as the Septuagint is. Psalm 33:9 in the data is Purify's 32:9;
  opened unmapped it lands on "Fear the Lord, all ye his saints". Jeremiah
  31:31 is 38:31. The Psalms are mapped by whole psalm already
  (`lib/bible/psalmNumbers.ts`); cross-references need it verse by verse.
  What cannot be placed exactly stays out, as now.
- Shown as two groups: the Old Testament first (up to three), then the New
  (up to six as now), because by votes alone the Old Testament links would
  mostly fall below the cap of six.

### Sections 2 to 7, ten each (2026-11-06)

His call: "just run it down", ten refinements per section, with photos, plus
bugs and anything vibe coded. Once he picks, three versions per section.
Photos: real screenshots of the local app at phone size (26 shots), the
Plus-locked features through the paywall's own Try it screens.

**Bugs found**

1. Saved says "Tap the star on a verse to keep it here" (`saved.emptyLine`).
   On a phone there is no star: the star is the desktop toolbar's
   (`components/bible/VerseRow.tsx`), and a phone keeps a verse through Bookmark
   verse in the hold menu.
2. The Sync preview (Try it) shows "Verses highlighted 0": a sales preview
   showing a zero.
3. The Try it header cuts a long name: "Candlelight and Monastery rea...".
4. Two sounds share one icon: Bell and stillness, Cathedral bells.
5. In the reader, while audio plays, two bars stack at the bottom: the chapter
   bar and the mini player.
6. Copy: "Remember a verse is part of Purify Plus" beside the name "Remember
   the verse".
7. Copy: the Plus mark is called "Supporter" (`community.supporterMark`,
   "Show my supporter mark"), while supporters are the pre-launch readers
   with lifetime sync, and Plus has one name.

**Against his flags**

1. Candlelight is almost the free palettes: ground `#0a0a0a`, text `#d4d4d8`
   (`app/globals.css`), beside True black `#000000` and Dark. Its amber went on
   2026-09-25, and nothing took its place.
2. The Florilegium's dashed "Begin a new gathering" card with a typed arrow.
3. Sync's custom drawing of devices (custom drawings were flagged in the 1.7
   walkthroughs, note 24).
4. The star for bookmarks (the Premium pill's star was flagged, 1.7 note 14).
5. To check with him: the red commentary dots in the reader (he called the
   timeline's red dot vibe coded, 1.7 note 20).

**2. Reading** (Candlelight and Monastery, ambience)

1. Give Candlelight its own look again without gold: a soft white glow at the
   centre of the page, dimmer edges, gentler contrast.
2. Candlelight at Vespers: on by itself at sunset, when the Church's day
   begins, and off in the morning. One switch.
3. Palettes that follow the Church year: Lent, Pascha, Pentecost, the
   Theotokos' feasts, each in its season.
4. Show the earned palettes: Councils and Cappadocian unlock by finishing a
   study collection but stay hidden until then. Show them as goals.
5. Night reading in one tap: Candlelight, Focus, larger text and a sound
   together (the code already calls Candlelight with Focus the best pair).
6. Layer two sounds (rain and a distant bell), each with its own volume.
   Today one plays at a time.
7. Orthodox sounds: the semantron at dawn, a monastery courtyard, the Paschal
   bells in their season. Rain is in every app; these are ours. Recorded or
   CC0, each licence checked.
8. One icon per sound (bug 4).
9. Ambience remembers the last sound and fades out at the end of the timer.
10. Decide the red commentary dots (flag 5).

**3. Listening** (listen offline)

1. Keep the coming week's daily readings on the phone by themselves, on Wi-Fi,
   for Plus: in church and on the road without thinking about it.
2. Expand what can be kept: the Psalms first when the Old Testament is
   recorded, then the saints' lives and the chants.
3. A storage view: what is saved, its size, remove a book.
4. Say the size and time before saving ("John: 21 chapters, about N MB").
5. One bar at the bottom while playing (bug 5).
6. The verse being read lights up and the page follows the voice, as the
   chants' words do since 1.8.
7. Saved books marked in the Bible's book list.
8. Resume where you stopped, per book, from the lock screen too.
9. Check: does saving pick up again after a lost signal, and can it wait for
   Wi-Fi?
10. Speed control for the voice, if missing.

**4. Practice** (reading plans, remember the verse, journal)

1. Seasonal plans that start with the season: the Nativity Fast (from 15 or 28
   November), Great Lent, Holy Week, the Dormition Fast, by the reader's
   calendar. The Nativity Fast is days away: 1.9 will likely miss this one.
2. More plans: the New Testament in a year, John in 21 days, Acts in 28, the
   Psalter in a week as monastics read it. Three plans today.
3. Plans with the Fathers: each day's reading with one passage of the
   commentary the app already carries, verbatim and cited.
4. The plans list shows your progress and a picture; today it is text rows.
5. A missed day offers catch up or shift the plan, never a broken streak.
6. Remember the verse in three steps (missing words, first letters, from
   memory), spaced over days.
7. Remember the verse on the widget and the lock screen.
8. Journal prompts from the day's feast or saint, through the editorial
   queue (doctrinal wording is never shipped straight).
9. Journal search and export to PDF: a reader's journal is theirs.
10. One copy fix: Remember a verse or Remember the verse (bug 6).

**5. Keeping** (Florilegium, sync)

1. Fix "Tap the star on a verse" (bug 1).
2. Fix the zero in the Sync preview (bug 2).
3. Replace the dashed card and the typed arrow (flag 2).
4. Gather from everywhere: prayers, councils, history, not only verses and
   the Fathers.
5. Share a florilegium as a page or a booklet, citations kept exact: readers
   bring readers.
6. Starter florilegia to begin from, verbatim and cited, for the empty first
   day.
7. A line from your own florilegium on Today.
8. Show sync working: "Synced 2 minutes ago, 3 devices".
9. Sync everything kept: plan progress, Remember progress, place, palette,
   settings (check what syncs today).
10. One word for keeping: Saved, Kept, Gather and Florilegium today.

**6. Beauty** (history in full dress)

1. Expand the history: 40 events across 11 eras today, for two thousand
   years.
2. Make full dress visible: a clear switch on the timeline, and a short
   preview for a free reader.
3. History on a map: `data/maps/church-history.json` is already in the repo.
4. The saints at each event, one tap to their card.
5. This day in Church history on Today, with its artwork.
6. Listen to an era with the reading voice.
7. The Creed line by line, showing which council gave which line.
8. Megabytes: the artwork's weight, formats and sizes, the next picture
   loaded ahead.
9. F-22: 107 of 110 saint icons have no source on record. Fix it in 1.9.
10. Check the timeline against his 1.7 notes (era colours, the dots).

**7. Identity** (profile extras, the Plus mark, Discord)

1. One name: the Plus mark, not "Supporter" (bug 7).
2. Frames earned by practice (the Psalter finished, Lent kept), quiet, with
   no confetti; Plus members earn more.
3. Frames and banners of the season, back each year (no countdowns: his
   paywall rule).
4. A patron saint's icon as the profile picture, only icons with a source on
   record (F-22).
5. The patron and their feast on the profile; Community greets a name day.
6. Preview extras where they appear: a post row and a reply, not only the
   large avatar.
7. Tap the mark on a name: "Purify Plus member", a quiet way in for free
   readers.
8. Show Discord status on the paywall only on Windows, where it works.
9. Banner pictures need moderation: check uploads can be reported and
   reviewed.
10. A favourite line from your florilegium on your profile.

### His decision on sections 2 to 7 (2026-11-06)

All of them: "So far, I like all of these. Let's do all of these". He named
the history ("expand history, make the artwork a little lighter") and every
part of keeping, practice and listening, and asked for refinement "as much
as we can" across the sections and identity.

### Who asked for what: `ideas.json`

His words: "there's updates that I request specifically ... these are
attributed to you ... so we can learn from what type of requests I give and
what types of requests you give ... history is so we can learn from our
mistakes and our actions."

`docs/1.9-build/ideas.json` holds every 1.9 item with `from` (edgar, claude
or both), its status and whether it needs a design. After the release each
gets its `outcome`: shipped or not, and what readers did with it. On
2026-11-06: 89 items, 6 from him, 83 from Claude.

### Three versions per section (2026-11-06)

One design question per section, three versions each, drawn on the local app
with its own fonts, icons and artwork (mockups, nothing built):

- 2 Reading, Candlelight's look: A Glow (a soft white glow, dark edges), B The
  lamp follows (the lines being read lit, the rest dimmed), C Vellum (a fine
  grain and a drop capital).
- 3 Listening, one bar while playing: A The bar is the player, B One card in
  two rows (player above, chapter, speed and timer below), C A small pill (the
  chapter moves to the top bar).
- 4 Practice, the plans page: A The season first (the Nativity Fast on top),
  B Continue first (today's reading, then picture tiles), C The week (seven
  days, progress bars, Catch up).
- 5 Keeping, the Florilegium's first page: A Begin with a collection
  (starter tiles), B One line (a single verse, two buttons), C The shelf
  (collections, sync status, starters below).
- 6 Beauty, full dress on the timeline: A A switch on top (Plain or Full
  dress), B Art in each row, C Era bands (full-width artwork per era).
- 7 Identity, the profile: A Patron as picture, B Patron banner (and the name
  day), C Mark and frames (the mark explained on a post, earned frames).

His picks (2026-11-06, from voice, numbered by the pictures he was sent):

- Reading: a mix of A and B. Drawn: the lines being read lit and the rest
  dimmed (B), with A's glow behind them and dark edges.
- Listening: B, and "when you scroll, it turns into C": the card at rest, the
  small pill while scrolling, the chapter moving to the top bar.
- Practice: a mix of A and B. Drawn: Continue first, the season's plan below
  it, then the other plans as picture tiles.
- Keeping: "honestly, a whole entire revamp", and for that a mix of A and C.
  Drawn: your collections and the sync line on top, the ready collections
  below as tiles.
- Beauty: a mix of A and B: "the prominent historical events, we're gonna make
  it big like A, but for smaller ones, do B". No switch between plain and full
  dress: "always full dress all the time". And the pictures are for everyone:
  "images should be for everyone ... When I meant like an immersive
  historical design timeline for premium users, I kind of meant it in another
  way, not just images ... we'll extrapolate more on that after."
- Identity: "unsure ... I don't like many of them." Checked after: the 1.8
  profile he picked (r3-28 A) already has the patron and their name day, a
  favourite verse, the badges and the Plus cosmetics, and the three versions
  ignored it. What is new for Identity is only: the Plus mark's name (bug 7),
  the mark explained on a tap, Discord shown only on Windows, frames earned
  from the badges, seasonal frames, the patron's icon as a picture. Claude's
  view: keep Identity to the small fixes in 1.9; the profile was redesigned
  in 1.8 and has not been measured yet.

**What "pictures for everyone" changes:** the history artwork leaves Plus. The
Plus row "See the timeline in full dress" (`lib/premium/plusRows.ts`,
`plus.history.*`) and the free/Plus split in `components/history/EventPictures.tsx`
and `components/councils/CouncilHero.tsx` change with it, and the paywall may
not promise artwork once it is free. Plus keeps a history row only when the
new immersive layer exists; what that is, he will say.

### The artwork's weight, found 2026-11-06

`public/history/media` is 21 MB: every picture twice, JPG (13.6 MB) and AVIF
(7.5 MB), and the apps carry the folder. Keeping one format per platform could
take about 13 MB off the apps, once the oldest Android WebView and iOS version
the apps support are checked for AVIF. Three files (0.7 MB) are named nowhere
in the history code or data: `council-of-jerusalem.v1.jpg`,
`mission-of-cyril-and-methodius.v1.jpg`, `philokalia-published.v1.jpg`; to
confirm before removing.

### The order of work, when he says start

1. The seven bugs and the copy (each line in all twenty-one languages).
2. The designs he picks, and the verse system of section 1.
3. Expanding: plans, history events, sounds, starter collections (verbatim and
   cited, through the editorial queue), the Old Testament cross-references,
   the English word tap.
4. Last: the megabytes and the animations.

### Immersive history for Plus: the Thread (2026-11-06)

His words: "Everyone else gets a standard read article, right? But for plus
users ... they get the timeline, right? The same timeline that we have on
like a saint's life, we want that for the history section ... not
necessarily more in depth, but just more immersive."

- **Everyone:** the article as it is, with its pictures.
- **Plus:** the event as a Thread, drawn as a saint's Timeline is (the Web
  door's second view, `components/saints/web/WebTimeline.tsx`, his 1.8 pick):
  year by year, each moment one of the event's own sentences that carries a
  year, the people in it as chips (a saint opens his page), the event itself
  lit with its picture, what followed it on a dashed line, and "Also in this
  council" at the foot.
- **The data is there:** each event in `data/history/*.json` has its context,
  narrative and consequences, its people with their saints' pages, and its
  sources (Nicaea: 17). The mockup of Nicaea uses its sentences word for word.
- **To weigh:** every history text is still marked `awaiting-clergy-review`.
  More events, and a Thread made from them, lengthen that queue.
- **More immersive, to brainstorm with him:** the map following the Thread,
  the Thread read aloud, a quotation opening its source in place, a person
  followed across events.

### The Supporter mark (2026-11-06)

Two things are called supporter today: the small cross beside a Plus or Pro
member's name in Community ("Supporter", `community.supporterMark`), and the
pre-launch supporters, who keep cross-device sync for life
(`plus.promise.supporters`). His answer: "plus users are supporters." So the
mark keeps its word, and bug 7 becomes: tapping the mark says what it means
("Supporter: Herman keeps Purify going with Purify Plus"). Mockups made for
his Identity 2 (the mark tapped) and 3 (no Discord row on a phone's paywall).

### Review stays on our side (2026-11-06, his rule)

Readers never see that a text awaits review; the team's own writing is
credited to the editorials (his word), never to Purify. Recorded as item 27 of
`docs/editorial-standards.md`. Six reader-facing lines break it today, each to
be rewritten in all twenty-one languages:

| Key | Today | 1.9 |
|---|---|---|
| `study.councils.framingAwaitingReview` | Our introduction. Awaiting review by a priest. | An introduction summarized by the editorials. |
| `study.heresies.oursAwaitingReview` | Our account, written from the councils and the Fathers. Awaiting review by a priest. | Summarized by the editorials from the councils and the Fathers. |
| `saints.voice.editorialLabel` | Summary by Purify | Editorial summary |
| `saints.voice.editorialBody` | Written by Purify, not {name}'s words. | Summarized by the editorials, not {name}'s words. |
| `reading.work.ours` | Written by Purify: our retelling, not the saint's own words. | Summarized by the editorials: not the saint's own words. |
| `translationDisclaimer.body` | ... still in English while editorial review for theological precision completes. | The body of this page is in English for now. |

Our side: a Review list in the admin panel gathering every file marked
`awaiting-clergy-review` (66 on 2026-11-06: history 36, councils 25, chants 4,
Today 1), so a reviewer's work is tracked there and nowhere else.

### The verse bar: his pick B (2026-11-06)

Three looks were drawn on the reader (A the tray from the bottom, B the strip
under the verse, C two tabs Keep and Study). His answer: "B". A tap on a verse
selects it and a slim strip opens just under it: Highlight, Copy, Share,
Image, Note, and Study (the Greek, Compare, Cross-references, the
commentary). A word tapped in the selected verse opens its Greek. Double tap
still highlights; hold and drag still marks some words.


**Then C (2026-11-08), in place of B.** On build 88 he found the strip
plain ("I don't like any of it": not premium, the wrong idea) and chose C of
three new versions: the focus, the page stepping back and the verse lifting
into a card, the colours above it and the tools below, "smooth with
animations". The versions, the pick and its motion are in
`docs/1.9-build/notes/build-88.md`, note 3.

### Editorials: readers' own pieces (his word, 2026-11-08)

His words, from voice, after the journal round: "I want people to be able to
make their own editorials ... super clean ... desktop adaptable ... super
similar to how Notion has their system, where you can add an image as the
banner, where you add a title, a cover text ... a highlighting system ... go
all in on that so people can make their own editorial forums, and also make
it so that they're able to share it in the community section, and if they
really want, they can also submit it to Purify so that we can review it, and
if we think it's good enough and it's clergy reviewed, then we can actually
implement it into Purify officially. And they're gonna be tagged as an
editorial with the editorial badge, or whatever badge that's closest ...
super optimized and super mobile friendly, and make it clean for the
shareables ... the embed photo is the photo they use, and like it's super
clean with the title." (The message ended at "Oh,".)

The system, as Claude reads it:

1. **A page in the journal, built like Notion's:** a cover image, a title, a
   cover text under it, then blocks: text, headings, a quote, a verse card
   from the app's own Bible, an image, and highlights in the seven colours.
   Private by default. The same page on a phone and a computer.
2. **Shared when the writer wants:** into Community as a post, or as a link
   whose preview (Discord, Instagram, messages) is the cover image and the
   title, the way a profile's link preview is drawn now
   (`app/(app)/u/[handle]/opengraph-image.tsx`).
3. **Submitted to Purify when the writer wants:** into the admin's review list
   (the one built for the 66 texts awaiting clergy review, PLAN row 10). If
   accepted and reviewed, it is published in Purify as an Editorial, with
   its writer's name, and the writer gets a badge: Contributor exists
   already and is the closest (`profile.badge.contributor`).

What it touches, before any design is final:

- **Editorial standards bind it** (`docs/editorial-standards.md`): a reader's
  piece is the reader's words, never shown as the Church's teaching. In
  Community it is marked as a reader's; only a reviewed piece is an
  Editorial. No priest reviews Purify yet (his standing note of 2026-10-16),
  so submissions can wait in the queue until one does.
- **Images from readers** bring copyright and unsuitable pictures. Claude's
  recommendation: covers from Purify's own artwork first (only pictures whose
  source `lib/saints/iconRights.ts` verifies), uploads later with review.
  Community already has Block and report, which the stores ask of anything
  readers publish.
- **Submitting needs a contributor clause in the Terms** (permission to
  publish and edit, credit kept): legal, his word or a lawyer's.
- **Free or Plus** is his call (the journal is Plus today).
- **Size:** an editor, pictures, public links, a review flow. Proposed in
  three steps: the page editor in the journal; sharing with the link preview;
  submitting, review and the badge.

Next: the screens drawn (the editor on a phone and on a computer, the link
preview, Community and Submit), and his answers to the questions above.

**His follow-up (2026-11-08):** readers should quote the Fathers and
Scripture in their pages; the journal is Purify's own system, "not
Orthodoxy's", so it is kept apart from what the Church teaches; Plus gets
"a way better journal system ... pretty much a one-to-one revamped Notion",
and everyone else a general, personal one. Then his question: "we want as
much exposure, so we want users to be able to share it with their friends,
but at the same time, how would we deal with plus users?"

**Claude's recommendation: write and share free, depth is Plus.** Every
shared page reaches someone without Purify, with the writer's cover and
title in the preview, so a paywall on sharing would cut the growth it is
for. What heavy writers need (and they are the readers most likely to pay)
is power and order, so that is what Plus holds:

- **Everyone:** journal pages with a title, text, Scripture as verse cards,
  the seven highlight colours and the Church's day on each page; covers
  from a small set of Purify's artwork; sharing as a link with the clean
  preview and into Community; notes on verses (free already); submitting
  to Purify (the review is the filter).
- **Plus:** the whole editor (headings, callouts, checklists for prayer
  lists, dividers, images, columns on a computer), the Fathers quoted from
  Purify's own library, saint, feast and reading cards, every cover,
  templates, notebooks and tags, search, From this day, sync on every
  device, export. Each shown in the editor's block menu with the Plus mark,
  never hidden, and counted by the lock counting of item 12, so what sells
  is measured, not guessed.

**The Fathers, quoted from the library only.** A Father's words go into a
page as a card taken from Purify's own sourced texts, verbatim, with the
citation filled in, and are not editable as the Father's; the writer's own
words go around them. Words typed by hand are never dressed as a Father's
quote. That keeps the editorial standards true in readers' pages too, and no
other app can do it.

**The journal is the reader's, never the Church's.** A shared page says it
is a reader's page, made with Purify. Only a reviewed piece is an
Editorial. Shared links are unlisted and kept out of search engines until a
piece is reviewed, so the website's name is never lent to an unreviewed
page; every shared page carries Report.

Still his: this split (a change to what the journal's Plus row holds), the
contributor clause in the Terms, and whether a clergy reviewer is sought.

**His decisions (2026-11-08):** free is "just a journal, for you", and a free
reader shares parts of it, not the whole, with a limit, "so they know that
there is incentive with the premium"; Plus is the full Notion-style
journal, agreed; the contributor system (submitting, review, the badge) is
on hold, "I still need to talk to you about that".

Claude's proposal for the free limit, for his word: a free reader shares one
page at a time, three a month (a link or a Community post); Plus shares
without limit, and shares whole notebooks. The count is kept on the server,
where a share is made, never trusted from the app. Free pages share with
Purify's own preview (the title and the Church's day); a Plus page's preview
is its cover. Free pages have no covers; covers are Plus.

**Drawn for him (2026-11-08)**, from the house's parts over the native
export, every screen passing `scripts/mock-check.mjs`:

- **A Plus page on a phone:** a cover (the translation of St Ignatius's
  relics from the Menologion of Basil II, public domain, its source recorded
  in `lib/history/events.ts`, credited under it), the title, the cover text,
  the Church's day, the writer's words with a highlight, a heading, John 1:47
  as a verse card, St John Chrysostom quoted word for word from the app's own
  commentary (`data/bible/commentary/john/1.json`, Homily 20) with its
  citation and "Quoted from Purify's library", and a prayer checklist.
- **Add a block, as a free reader sees it:** Text and Verse free; Words of
  the Fathers, Checklist, Image, Saint or feast, Callout and Divider shown
  with the Plus mark.
- **Share a page, free:** the preview, "2 of 3 shares left this month",
  Copy link, Post to Community, Share, and what Plus adds.
- **The page on a computer:** notebooks at the side, the page in a column.
- **The link previews** (1200 by 630), drawn the way the profile's preview is
  (`app/(app)/u/[handle]/opengraph-image.tsx`): a Plus page's cover under its
  title; a free page's title and Church's day on Purify's night.

New words in them, for his word: Add a block, Text, Verse, Words of the
Fathers, Checklist, Image, Saint or feast, Callout, Divider, Share this page,
"2 of 3 shares left this month", Post to Community, "Unlimited sharing, whole
notebooks, and your cover in the preview", "Quoted from Purify's library".

`scripts/mock-check.mjs` learned one thing on the computer screen: it had read
English words inside an Arabic line as misplaced, which they are not (a run
of English keeps its own order there). It now compares the boxes the layout
places, skips what the flow of a sentence places, and flags text set left or
right instead of start or end. Its self-test still catches every mistake of
the first drawings.

**His next thought (2026-11-08):** "let them quote saints ... let them quote
any text, so allow easy implementation for that", and custom things
(dividers, fonts) with freedom, "make sure it's not ... against our
guardrails". "So far it looks pretty good, like the system you set up."

Claude's proposal, for his word:

- **Quote anything, from anywhere.** Purify's own hold pill (lib/ui/pressCopy.ts,
  held on any paragraph of a prayer, a saint's life, a Father's work, a chant)
  and the verse's focus gain "Quote in journal": the words land on today's
  page, or a notebook's, as a quote card with where they are from filled in
  and a way back to them. In the editor, a Quote block searches the same
  library (Scripture, the Fathers, the saints' lives, the prayers, the
  chants). Library quotes are verbatim and cited, and carry "Quoted from
  Purify's library".
- **And a quote of one's own.** Any other words can go in a plain quote block
  with the writer's own attribution. It never carries the library's mark,
  so hand-typed words are never dressed as a Father's.
- **Freedom inside a designed set.** Every choice is made of the house's own
  tokens, so whatever a writer picks still passes the guardrails: two fonts,
  Book (Lora) and Clean (DM Sans), which with their Noto fallbacks already
  cover all 21 languages, where a third face would have to as well; colours
  from the seven highlight colours and the palette's inks, so every pick is
  legible on all five palettes; dividers as a plain line, a space or three
  dots, and no ornaments drawn by hand (1.7 note 24); callouts as a soft box
  with an icon from the house set; text set at the start or the centre, never
  left or right, so a page holds in Arabic; sizes from the house scale. Gold
  stays where his rule of 2026-10-31 puts it unless he says otherwise. A
  test would hold every style against every palette, as litPalette.test.ts
  does for its surfaces.
- **Free and Plus:** Scripture and quotes of one's own for everyone; the
  whole library (saints, Fathers, prayers, chants) and the styles in Plus,
  shown with the Plus mark.

**The onboarding, built (his word, 2026-11-10, about 03:25 UTC):** "and also start working on and implement the revised on boarding system with new sections or new screens". The Fable onboarding chat builds it from its own notes (`notes/onboarding-fable.md`): phase 1 (the road, the first week on four roads), phase 3's account step out of the questions, phase 4 (the other roads and the questions' new shape), then phase 2's A/B system with no test running. Behind one flag, off for readers and on for testers, so 1.9 ships with or without it and he tries it first; lit for readers only on his word. Where his word is pending it builds to its recs, which are his questions page's 105 to 112; 113 (an hour with a lawyer on holding a reader's faith background) and 114 (the onboarding numbers in the admin) are his alone. Not this round: phases 5 to 9, any price or trial, which plan is free. Stills of every new screen go to him before any push.

**"ok to all" (his word, 2026-11-10, about 04:13 UTC), to his questions page (https://claude.ai/artifact/7JTm8bbtF96SmpCCcJ5S2D, version 24):** every rec on it is a yes. Handed out the same minute: Theology, 102 (the four pages pushed from their patch); Updates, 103 (notes 7 and 10 pushed) and 131 (the prayer page's dimmed lines lifted to 4.5:1); Admin, 104 (For the living, the Nameday arrow down), 59 (the sync privacy line), 100 (the 1.9 words), 138 (the /invest deck's stripe), its focus ruling (a field with its own quiet focus keeps only its own) and 76 (the German privacy fix to main, a production push, its text confirmed by the arbiter first); Updates 2, 115 (note 3's covers), 99 (CC BY and CC BY-SA allowed, photographers named on a credits page) and 98 (Chronicles' David and Solomon; Zechariah and Jude held); Fable onboarding, 105 to 112 and 132 to 137 (pushed behind the flag, 137 built, 135's new line to him first); Fable campaigns, 116 to 128 (phase 1 built behind the switch for 1.9.1, its SQL kept out of `supabase/migrations` until 1.9 has merged and he has signed it); SSM, 39 and 40 (plans and drafts only). Saving chants offline stays Plus, like saving a book (`lib/chants/saving.ts`). Not covered, still his: the "Only you can do" list (113 the lawyer, 114 the onboarding numbers, 129 the crisis words with a priest, 130 the stores' forms, 23, 53, 67, 42, 70, 43, 44, 87, 56), his three answers on "a new set of designs", and 49 (Candlelight through the Church year), which waits for the themes talk. Then, a few minutes later, "all recs": the same yes again, which also settles chant saving as Plus.

**"ok to all ensure its all in v1.9" (his word, 2026-11-10, about 04:20 UTC):** a yes to the arbiter's rec on "a new set of designs" (a brand new set of Plus themes, bolder and more premium, keeping Night sky; the Fable Themes chat draws them, one version each, stills first), and everything goes in 1.9. So prayer campaigns move from 1.9.1 into 1.9 (his page's 116, reversed by his word): phases 1, 2 and 4 in 1.9; pictures and top campaigns built and shipped switched off by a server-side switch until the image check service and the lawyer, then turned on with no store build; the campaigns SQL into `supabase/migrations` with his sign-off on the SQL before the merge; his phone walk on release day, the website first and the store builds held on internal testing until he has walked it. The onboarding ships in 1.9, lit at release once his retest passes; the A/B system ships with no test running until he OKs its privacy line. The cost, said to him: the retest moves back by days.

**The themes, expanded (his word, 2026-11-10, about 04:25 UTC):** "make a lot more designs I want this expanded in v1.9 and a nice scrollable theme system in the settings when picking a theme". Given to the Fable Themes chat: about 20 Plus themes in 1.9, Night sky among them, grouped in a few families so a big catalog stays premium, each with its own signature, one version each, stills first; and a scrollable theme picker in Settings, each theme a live preview of a real page, by family, the free ones first, Plus marked as Plus, the earned two with their progress, never a row of pills. His picks before anything is built. His direction for all of it, minutes later: "I want clean and unique" (passed on as: restrained and calm, one quiet signature per theme, no two alike, and where bold and clean pull apart, clean wins).

**"sure" (his word, 2026-11-10, about 04:32 UTC)**, to the arbiter's message of three asks, taken as yes to all three and said so to him: (1) the team@purify.app address on the live privacy page (a domain that is not ours) fixed in the same push to main as 76, the German privacy page (Admin: `03645780` and a second minimal commit on origin/main `27f1bcaf`, the way back); (2) note 12's Plus feature cards pushed (Updates 2); (3) the new "Just curious" line, "We'll start you with a few small steps into the faith.", in all 21 languages (Fable onboarding).

**The A/B line, and a self-learning test (his word, 2026-11-10, about 04:36 UTC):** "sure. ensure you have a A/B test based around this. a self learning criterion etc". The privacy line for tests goes on /privacy in English and German, with the server's closed list and the sender on (no test in the registry yet). The Fable onboarding chat designs the first test around the new onboarding (the arbiter's lean: the account's place, the card on Today against the step at the end of the questions), with one primary outcome, guardrails, the small-cell rule, a self-learning share (a bandit on the counts, a floor for every version, the weights one public setting from the server, the choice kept on the device so the privacy line stays true) and a stopping rule whose last step, making a version permanent, is his word. Its design comes to him in plain lines before it is built; it starts when the onboarding is lit at release.

**The testing system, for the whole app (his word, 2026-11-10, about 04:40 UTC):** "allow fable to cook up on the A/B test system and ensure its applicable to other parts of our system too. we need to track certain things also". Given to the Fable onboarding chat with wide latitude: one testing system any screen can use (each test with its self-learning share, criterion, guardrails, small-cell and stopping rules), a short list of counts the business needs, each naming the decision it serves and carrying its own sentence on /privacy (English and German) and the server's closed list, no account, device or session id, nothing of a reader's faith background off the device; no test on a price, a trial or what Plus includes without his word for that test, none on the need road's paywall, nothing that pressures. A plain page of the system, the counts and the next three tests comes to him before anything is built into 1.9. The onboarding's 15 new lines in 20 languages were written by the chat, not checked by a reader of each language: a ten-minute read per language before the flag flips for readers (his call how). Then: "we can change terms if we need to implement new tracking system of course" (his word, about 04:45 UTC): the Terms and the privacy page may change to carry the testing system and its counts; the words are drafted on the chat's plain page for his OK and ride with 1.9's planned terms update (his 96); anything beyond id-free counts waits for the lawyer (113).

**Go (his word, 2026-11-10, about 04:48 UTC):** "finalize all of this and let's get going". From then on finished work no longer waits for his eye: each chat pushes when its gates pass (behind its flag or switch where it has one) and sends the arbiter stills at the push, which go to him; he can change anything after. Still held for his own word: anything on main or production, the SQL of a migration, a price, a trial or what Plus includes, and words on the privacy page or the Terms (drafted, put to him, shipped at release). The Themes chat designs and builds in one pass. Each chat was asked what is left for it in 1.9 and how long; the arbiter checks hourly and runs the release check and the Android test build when every piece is in.

**"all recs and yes to the test build" (his word, 2026-11-10, about 08:25 UTC; he also reset Fable's usage):** yes to the privacy and Terms words (140, 141), the three Plus lines for the themes, the six theme questions as recommended, the security updates (to Updates: Capacitor 8.4.3, zod, Next) and the three speed wins (to the optimization chat), campaigns' phase 4 moved to 1.9.1, no Google Fonts in the emails (145), the reminders test waiting, a cover at a reading room book's head (to Fable Theology), St Moses for Cassian's Conferences with the other four keeping the plate. A test build with everything done so far started on the branch the same minute. The campaigns SQL (file one) and the florilegium kinds SQL went to him to read and sign.
