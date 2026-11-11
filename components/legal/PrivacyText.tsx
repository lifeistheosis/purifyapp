import Link from "next/link";

import { T } from "@/components/i18n/T";
import { LEGAL_EMAIL, LEGAL_NAME, SUPPORT_EMAIL } from "@/lib/legal/entity";
import { websiteHref } from "@/lib/nav/websiteHref";

import { LegalContents } from "./LegalContents";

// The Privacy Policy, from its heading to its end, in English and in German:
// one text, drawn by the page (app/(app)/privacy/page.tsx) and by the sheet
// that opens wherever the app says you agree to it (components/legal/
// LegalSheet.tsx; build 90 note 1). Moved here word for word from the page on
// 2026-11-10, so the page and the sheet can never say different things.
//
// The German is block for block the English, in its order and with its markup,
// so lib/legal/__tests__/privacyLevel.test.ts can hold the two to the same
// paragraphs; the approved lines of A2, A5, A10 and A11 stand word for word
// (lib/admin/__tests__/privacyLines.test.ts). Only English and German have a
// text of their own; every other language is shown the English.

/** The policy in `lang`: German for a German reader, English for every other. */
export function PrivacyText({ lang }: { lang: "en" | "de" }) {
  return lang === "de" ? <PrivacyDe /> : <PrivacyEn />;
}

function PrivacyEn() {
  return (
    <>
 <h1 className="font-serif text-title font-bold leading-[1.12] tracking-[-0.01em] text-balance text-paper">
 <T k="privacy.h1" />
 </h1>
 {/* The heading is the catalog's, in the reader's language; from here on the
     text is English, and says so with its direction (build 90 note 4), so
     an Arabic reader reads it left to right, as English is set. */}
 <div lang="en" dir="ltr">
 <p className="mt-4 font-serif text-[17px] leading-[1.65] text-paper/80">
 The short version is on the{" "}
 <Link
 href="/about"
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 about page
 </Link>
 . This one is the long version: every field we record, every place
 it goes, every third party the site touches, and how long we keep
 any of it. If something here is wrong, write to us; we&rsquo;ll fix
 it.
 </p>
 {/* Who runs Purify (his word of 2026-11-10; lib/legal/entity.ts). */}
 <p className="mt-3 font-serif text-[17px] leading-[1.65] text-paper/80">
 Purify is run by {LEGAL_NAME}. To write to the company, use{" "}
 <a
 href={`mailto:${LEGAL_EMAIL}`}
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 {LEGAL_EMAIL}
 </a>
 .
 </p>
 {/* The text's own headings, folded, as a way through it (./LegalContents.tsx). */}
 <LegalContents />

 {/* Two account paths */}
 <h2 className="mt-11 scroll-mt-20 font-serif text-[21px] font-bold leading-[1.2] text-balance text-paper">
 On this device vs signed in
 </h2>
 <p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 Purify works privately on this device with no account; signing in
 carries the days you have prayed and the names you pray for to
 every device, and with Purify Plus your highlights, notes and
 bookmarks too. When you open{" "}
 <Link
 href="/account"
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 /account
 </Link>{" "}
 you pick one of the two paths. Neither is the default; the choice
 is presented plainly.
 </p>
 <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
 <div className="theology-tray rounded-[18px] px-4 py-4">
 <p className="mb-2 font-sans text-detail font-semibold text-paper">
 On this device (no account)
 </p>
 <p className="font-serif text-[16px] leading-[1.65] text-paper/88">
 Highlights, notes, bookmarks, your prayer streak, and reader
 preferences (font, size) are stored in your browser&rsquo;s{" "}
 <code className="font-mono text-ui text-paper/70">localStorage</code>.
 We do not see or receive any of it. There is no row for you in
 our database. The trade-off: it lives on this device only, and
 goes away if you clear browser data.
 </p>
 <p className="mt-3 font-sans text-detail leading-[1.55] text-paper/60">
 To remove the name you claimed on this device, open /account
 and click &ldquo;Remove this name.&rdquo; To wipe all local
 data: on the website, clear this site&rsquo;s data in your
 browser&rsquo;s settings; in the app, clear its storage in your
 phone&rsquo;s settings, or remove the app.
 </p>
 </div>
 <div className="theology-tray rounded-[18px] px-4 py-4">
 <p className="mb-2 font-sans text-detail font-semibold text-paper">
 Signed in
 </p>
 <p className="font-serif text-[16px] leading-[1.65] text-paper/88">
 What you keep with your account goes to our Supabase Postgres
 database, so it reaches every device you sign in on. We store:
 your email (used to sign you in and to send confirmations on
 password/email changes), an Argon2 hash of your password
 (never the password itself), a display name, and a
 <code className="font-mono text-ui text-paper/70"> profiles </code>
 row with your account creation date, when the row last changed,
 a flag for whether you&rsquo;ve set a password, the language you
 chose (so your other devices and our emails use it), and your
 answer to what you came for, so another device does not ask
 again. What you fill in on your Community profile is kept there
 too, and anyone can see it unless you make your profile private:
 your bio and status, your parish, your patron saint, your
 favourite verse and your links, and, when you turn it on, what
 you are reading now. The colour you give your name shows
 wherever your name does. Prayer-rule check-offs and the names
 you pray for travel as their own rows, and with Purify Plus so
 do highlights, notes and bookmarks. If you sign in with Google
 or Apple, we additionally store an
 <code className="font-mono text-ui text-paper/70"> identities </code>
 row linking your account to that provider; we never see your
 Google/Apple password, only the OAuth token.
 </p>
 {/* 1.9, his yes to 59 (2026-11-10), word for word: what is kept while
 reading travels with Plus (supabase/migrations/20261110012059_user_kept.sql).
 Held by lib/admin/__tests__/privacyLines.test.ts. */}
 <p className="mt-3 font-serif text-[16px] leading-[1.65] text-paper/88">
 With Purify Plus, what you keep while reading travels too: your
 progress in each reading plan, Remember the verse&rsquo;s schedule
 (which verse is due when, not its words), your place in the Bible
 and in each long work, and your reading settings (palette, size,
 typeface, line spacing and Focus). Each is one small record that
 only your account can read or change, and it is deleted with your
 account.
 </p>
 <p className="mt-3 font-sans text-detail leading-[1.55] text-paper/60">
 To delete the account and every server-side row it created,
 use the &ldquo;Delete account&rdquo; button on /account. The
 deletion is immediate and cascades.
 </p>
 </div>
 </div>
 <p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 If you start on this device and later sign in, the days you have
 prayed and the names you pray for are kept with your account, and
 with Purify Plus your highlights, notes and bookmarks too;
 nothing on the device is removed. Your calendar style stays on
 this device. Signing out never deletes what is saved on the
 device.
 </p>
 <p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 Nothing in either path is sold, shared, or used to train models.
 The analytics described below are separate from both: they record
 page views in aggregate, without your account identity, whether you
 are signed in or not.
 </p>
 {/* Sharing a journal page (1.9; his yes of 2026-11-09 to version B,
     docs/1.9-build/drafts/privacy-sharing.md): each sentence rests on
     app/api/journal/share, lib/journal/share.ts and the shared_pages SQL. */}
 <p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 <strong className="font-semibold text-paper">Sharing a journal page.</strong>{" "}
 When you share a page, we keep a copy of it as it stood when you
 shared it, at its own link (purifyapp.net/p/...). Anyone with the
 link can read it. Search engines are kept away from it until we have
 reviewed it; after that they may list it. Your notebooks and tags are
 never in the copy. If someone reports a shared page, we keep the
 report, the account that made it, and anything written with it, up to
 500 characters, so we can review the page. Stop sharing deletes the
 copy at once, and any reports on it. Deleting your account deletes
 every page you shared, and its reports.
 </p>
 {/* Prayer campaigns and Community (1.9; his yes of 2026-11-10, "and yes
     those terms are good", to docs/1.9-build/drafts/terms-posts.md, built
     on the campaigns chat's draft in campaigns-fable.md 4.7). What each
     sentence rests on is listed in the draft. */}
 <p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 <strong className="font-semibold text-paper">Prayer campaigns.</strong>{" "}
 A prayer campaign is public unless you keep it to a circle: its
 title, the first name of the person it is for, what you wrote, its
 pictures, its place if you gave one, your updates, and the name and
 picture on your profile. People&rsquo;s comments on it are public
 too. Give only what prayer needs: a first name is enough, and say
 nothing of another person&rsquo;s health or life that they have not
 agreed to share. Before a campaign for someone else is made, you are
 asked to affirm that they, or their family, have given their
 blessing, and we keep the day you did.
 </p>
 <p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 Pictures are made again on our server before they are stored, which
 removes the place and the device a photo carries inside it, and a
 moderator looks at each one before it is shown. A place is a country
 and a town that you type; the app never asks where you are.
 </p>
 <p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 Who has added a campaign to their prayers is never shown, to its
 creator or to anyone, and no number of them is shown. If you are
 signed in, the campaigns you carry are kept with your account so
 they follow you to your other devices; if you are not, they are kept
 on your device alone. The name and the campaign&rsquo;s title are
 kept on your device while you carry it, and leave when it ends.
 </p>
 <p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 You can end a campaign, remove a picture, close its comments, or take
 the whole campaign down at any time. Taking it down deletes it from
 our servers with its pictures, updates and comments, and it leaves
 other people&rsquo;s prayers the next time their app is online. A
 campaign for a living person is deleted thirty days after its last
 day unless you renew it. Deleting your account deletes your
 campaigns. We may also remove a campaign, a picture or a comment that
 breaks our terms; one removed for that reason is kept, unseen, for
 thirty days in case of an appeal or a lawful request, and then
 deleted. If you report a campaign, we keep the report, its reason and
 the account that made it, so a moderator can review it; it is deleted
 with the campaign, and if you delete your account first, it stays
 without your name.
 </p>
 <p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 If a campaign names you, or someone in your care, and you did not
 agree to it, report it from its page or write to{" "}
 <a href={`mailto:${SUPPORT_EMAIL}`} className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper">{SUPPORT_EMAIL}</a> and we will take it down. If a picture in it is yours and
 was used without your permission, write to{" "}
 <a href={`mailto:${LEGAL_EMAIL}`} className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper">{LEGAL_EMAIL}</a>. Our terms say what you agree to when you post.
 </p>
 <p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 <strong className="font-semibold text-paper">Community.</strong>{" "}
 Posts and replies in the Community are public: anyone can read them,
 in the apps and on our website, with the name and picture your
 profile had when you posted. Your profile is public too, its name,
 picture and banner, at its own address on our website. They are kept
 until you delete them, and deleting your account deletes them.
 Moderators may hide or remove a post or a reply that breaks our
 terms. If you report one, we keep the report and the account that
 made it so a moderator can review it; it is deleted with the post,
 and if you delete your account first, it stays without your name.
 </p>

 {/* What we record */}
 <h2 className="mt-11 scroll-mt-20 font-serif text-[21px] font-bold leading-[1.2] text-balance text-paper">
 What we record
 </h2>
 <p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 The only thing the site records about a visit is an anonymous,
 ephemeral session, used for the small &ldquo;who is reading
 right now&rdquo; view that helps us understand whether the work
 is finding anyone. From your browser, on every page load:
 </p>
 <ul className="mt-3 list-disc space-y-2 ps-6 font-serif text-[16.5px] leading-[1.7] text-paper/88 marker:text-paper/40">
 <li>
 A random <em>session id</em> the browser generates on first
 visit, kept in <code>sessionStorage</code> for the tab&rsquo;s
 lifetime, never persisted across browser restarts.
 </li>
 <li>
 The <em>path</em> of the page you visited (e.g.
 <code>/bible/john/1</code>). Never form inputs, and nothing of the query string except the link tag below.
 </li>
 <li>
 The <em>referrer</em>, if your browser sent one, so we can
                see when a link from elsewhere brought someone in.
              </li>
              <li>
                A <em>link tag</em>, when the link you followed carried one.
                Links in our own emails and posts can end in a short word,
                such as <code>?via=email-release-1.5</code>. It is the same
                for everyone who gets that email. It names the email or the
                post and never you, it is kept in place of the referrer, and
                the page then takes it off the address in your browser.
              </li>
 </ul>
 <p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 On the server, when a session is first seen, we additionally
 derive and store:
 </p>
 <ul className="mt-3 list-disc space-y-2 ps-6 font-serif text-[16.5px] leading-[1.7] text-paper/88 marker:text-paper/40">
 <li>
 Your <em>user-agent</em> string (browser + OS), truncated to
 300 characters. Used to tell phones from computers and our apps from the website, and to see when a visit came through another app&rsquo;s built-in browser. Our Windows app also says that it is the Windows app, and we note that beside it.
 </li>
 <li>
 A <em>coarse, city-level geolocation</em>, country,
 region, city, and the city&rsquo;s rough lat/long ,
 derived from your request IP via <a
 href="https://ipwho.is/"
 target="_blank"
 rel="noopener noreferrer"
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >ipwho.is</a>. Your IP itself is <em>not</em> stored; only the
 city-level fields above are.
 </li>
 <li>
 Your browser&rsquo;s declared <em>primary language tag</em>
 (the first entry of the <code>Accept-Language</code> header
 with any region subtag stripped, e.g. &ldquo;es&rdquo; or
 &ldquo;ru&rdquo;). Used only to decide which UI translations
 to prioritize; nothing finer-grained than the country we
 already keep is retained.
 </li>
 </ul>
 {/* Ambassador links, added 2026-09-30 with the ambassador program
 (lib/ambassadors). Worded to match exactly what the code keeps. */}
 <p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 <em>Ambassador links.</em> Some readers are invited to share the
 Purify shop as ambassadors, with a link ending in{" "}
 <code>?ref=</code> and their code. If you arrive through one, we
 keep that code in a first-party cookie, <code>purify_ref</code>,
 for 30 days, and if you buy from EIKON in that time the
 ambassador is paid a share of the sale. The cookie holds only
 their code, nothing about you. Visits to each link are counted as
 a number per day, never tied to you, your device or your account.
 Your order records which code it came with so the ambassador can
 be paid; they see an order number and an amount, never your name.
 </p>
 <p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 If you sign in, Supabase stores the email address you signed in
 with and the rows you create: the days you have prayed and the
 names you pray for, and with Purify Plus your highlights, notes
 and bookmarks. None of that is joined to the anonymous session
 above; the two sit in separate tables and are not correlated.
 </p>

 {/* What we don't */}
 <h2 className="mt-11 scroll-mt-20 font-serif text-[21px] font-bold leading-[1.2] text-balance text-paper">
 What we don&rsquo;t
 </h2>
 <ul className="mt-3 list-disc space-y-2 ps-6 font-serif text-[16.5px] leading-[1.7] text-paper/88 marker:text-paper/40">
 <li>No third-party advertising. No ad SDKs, no ad cookies.</li>
 <li>No behavioral profile, no cross-site tracking, no fingerprinting.</li>
 <li>
 No sale of your data, ever. We share it only with the service
 providers listed below that we need to run the site (hosting,
 payment, email, push), and only to do that, never for their own
 marketing.
 </li>
 <li>
 No marketing email unless you ask for it. There are two optional
 lists, what is new in the library and what is new in the shop, and
 both stay off until you turn them on in your account. A few times a
 year, when a new version of Purify is released, we email every
 account to say what changed. That one is on unless you turn it off,
 and one tap in the email does it. Every email we send ends with an
 unsubscribe button. Everything else we email is about something you
 asked for or have with us: an order you placed, your membership,
 your account, a change to our terms, or a support message, and those
 keep arriving because they are part of having an account.
 Prayer-reminder push is opt-in.
 </li>
 <li>
 No analytics joined to your account identity. The signed-in
 sync data and the anonymous visit data live in different tables
 and are never linked.
 </li>
 <li>
 No use of your reading to train a language model. What you read,
 mark, and save is yours; it is never handed to anyone, for
 training or for anything else. Some of the published library is
 deliberately open to AI crawlers, and none of your activity is
 part of it. Our{" "}
 <Link
 href={websiteHref("/robots.txt")}
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 robots policy
 </Link>{" "}
 sets out exactly which crawlers may read which parts of the site.
 </li>
 </ul>

 {/* Where it lives */}
 <h2 className="mt-11 scroll-mt-20 font-serif text-[21px] font-bold leading-[1.2] text-balance text-paper">
 Where it lives
 </h2>
 <p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 All session and pageview rows are written to a Supabase Postgres
 database we control, in two tables: <code>analytics_sessions</code>{" "}
 (one row per session, with the coarse geo + user-agent) and{" "}
 <code>analytics_pageviews</code> (one row per page load, linking
 a session id to a path). Writes happen server-side with a
 service-role key; nothing analytics-related is exposed to the
 browser. A small admin page lets us see the live counts; it is
 the only reader.
 </p>
<p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 Today&rsquo;s Catechism adds two aggregate tables, and neither
 holds a person. <code>quiz_question_stats</code> keeps, per
 question, how many times it was shown and how many times it was
 answered rightly, across everyone, signed in or not.{" "}
 <code>analytics_events</code> keeps a row per catechism started
 or completed, with the score and the calendar reckoning and
 nothing else: no session id, no account, no device. If you are
 signed in, your own completed days are kept in{" "}
 <code>quiz_attempts</code> under your account, readable only by
 you, and deleted with it. If you are not, they stay on your
 device and only the two counters above leave it.
</p>
<p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 The welcome questions are counted in the same table, so we can
 see where new readers come from and what helps them: each screen
 reached, each answer given, a skip, a finish, and, from your own
 device, a note on your second, seventh and thirtieth day that you
 came back. A row holds the answer, the kind of device (iPhone,
 Android, website), the link that brought you if it was one of
 ours, and the day, not the time. No session id, no account, no
 device id: &ldquo;a reader who answered Catholic finished&rdquo;
 is one more on a total, never you. Your answers themselves stay
 on your device, for making Purify yours. If you sign in, your
 answer to what you came for is kept with your account too; your
 answers about your faith, how familiar you are with Orthodox
 Christianity and your background, are not kept with it.
</p>
<p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 The screens are counted in the same table, so we can see where
 reading stops and whether new readers come back. When you put the
 app away or close the page, one row says what kind of screen was
 showing (&ldquo;a Bible chapter&rdquo;, &ldquo;a prayer&rdquo;,
 never which one) and roughly how long it had been open: under ten
 seconds, under a minute, under five minutes, or longer. And from
 your own device, a note the first time it opens Purify, and once
 each when you come back a day, a week and a month after that. A
 row holds only that, with the kind of device (iPhone, Android,
 Windows, website) and the day, not the time. No session id, no
 account, no device id, no page address: &ldquo;someone put the app
 away on a saint&rsquo;s page after a minute or two&rdquo; is one
 more on a total, never you. The day you first opened Purify stays
 on your device.
</p>
 {/* 1.9 (lib/analytics/lockCounting.ts). Drafted for the owner's word
 before the release, and listed in the 1.9 letter, as "Changes to this
 page" below promises. */}
<p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 What Purify Plus is wanted for is counted in the same table. When
 you tap something that needs Plus, one row says which feature it
 was (&ldquo;Reading plans&rdquo;, &ldquo;Ambience&rdquo;), never
 the page. If you then subscribe in the sheet that opened, one row
 says which feature the sheet was opened on and whether you chose a
 month or a year. A row holds only that, with the kind of device
 (iPhone, Android, Windows, website) and the day, not the time. No
 session id, no account, no device id: &ldquo;someone who met the
 reading plans subscribed for a year&rdquo; is one more on a total,
 never you.
</p>
 {/* 1.9, admin item A5 (lib/analytics/featureCounting.ts): the owner's line
 of 2026-11-09, word for word, listed in the 1.9 letter. */}
<p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 We count, without your name, which Bible translations are downloaded,
 which reading plans are begun and finished, how many journal pages are
 written and shared, and which version of the app is in use.
</p>
 {/* 1.9, admin items A10 and A11 (lib/errors/, lib/search/missWords.ts):
 the owner's lines of 2026-11-09, word for word, listed in the 1.9 letter;
 the line on errors as he approved it again on 2026-11-10 (82a), naming
 what a report keeps and when it goes. A test holds them
 (lib/admin/__tests__/privacyLines.test.ts). */}
<p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 When something fails, Purify keeps a short report: what failed and
 the error it gave, the page, the app version and the kind of device,
 never who you are. Anything in it that looks like an email address
 or a phone number is removed first, and each report is deleted after
 14 days.
</p>
<p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 When a search finds nothing, we keep the words you searched, never
 who you are, for 90 days, so we can add what readers are looking
 for. Anything that looks like an email address or a phone number is
 removed before it is kept.
</p>
{/* 1.9 (lib/ab/): the owner's "sure" of 2026-11-10 to this line as written,
    listed in the 1.9 letter. A test holds it
    (lib/admin/__tests__/privacyLines.test.ts). No test of two versions
    runs before it is on this page. */}
<p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
  Sometimes two readers are shown a different version of the same
  screen, so we can learn which one helps. Which version your device
  shows is decided on your device, by a random number that never
  leaves it. A count may then also say which version it was, and
  nothing else is added: no session id, no account, no device id.
  &ldquo;A reader shown the second version came back a week
  later&rdquo; is one more on a total, never you.
</p>
{/* 1.9 (lib/analytics/moreCounting.ts): the eight sentences of his item
    140, his "all recs" of 2026-11-10, word for word, listed in the 1.9
    letter. A test holds them, and the counts are sent only while they
    stand here (lib/analytics/__tests__/moreCounting.test.ts). */}
<p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
  The first time a device finishes a prayer or a chapter, one row says
  which of the two it was and how many days after it first opened
  Purify. The steps of a first week are counted the same way: which
  day of the seven it was and whether it was opened or closed, never
  which step. When an account is made, one row says where in Purify it
  was made, and nothing about the account. When reminders are turned
  on or off, one row says so and where. The note your device sends
  when you come back also says whether reminders were on.
</p>
<p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
  In the Plus sheet, one row says when a feature&rsquo;s Try it was
  opened and when the button to subscribe was tapped, with the feature
  the sheet was opened on. A purchase made on the pricing page is
  counted like one made in the sheet. The row that says what kind of
  screen was showing when the app was put away also says whether it
  was the device&rsquo;s first day. The two small cards a new reader
  may meet on Today are counted as answered or closed. From your own
  device, one row also says when the first step of your first week was
  opened.
</p>

 {/* Retention. Until 2026-10-29 this said a scheduled job deleted
 these rows at 90 days. That job (docs/operations/analytics-retention.md)
 was never switched on, and the owner chose to have the page say what
 happens rather than start it. */}
 <h2 className="mt-11 scroll-mt-20 font-serif text-[21px] font-bold leading-[1.2] text-balance text-paper">
 How long we keep it
 </h2>
 <p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 We keep the anonymous visit data: the session and pageview rows,
 and the counts described above (the catechism, the welcome
 questions, the screens, what Purify Plus is wanted for, the Bibles
 downloaded, reading plans, journal pages and app versions, and the
 others described above).
 Nothing deletes them on a schedule; we keep them to see how Purify
 is used over time. Error reports are deleted after 14 days, and
 searches that found nothing after 90. Sync data tied to your account
 (highlights, bookmarks, etc.) is kept as long as your account
 exists; deleting your account from{" "}
 <Link
 href="/account"
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 /account
 </Link>{" "}
 removes those rows.
 </p>

 {/* Third parties */}
 <h2 className="mt-11 scroll-mt-20 font-serif text-[21px] font-bold leading-[1.2] text-balance text-paper">
 Third parties the site touches
 </h2>
 <ul className="mt-3 list-disc space-y-2 ps-6 font-serif text-[16.5px] leading-[1.7] text-paper/88 marker:text-paper/40">
 <li>
 <strong>Supabase</strong>, hosted Postgres and auth. Stores
 your sync data and the anonymous analytics tables.
 </li>
 <li>
 <strong>Render</strong>, web hosting. Sees the same HTTP
 request traffic any host would.
 </li>
 <li>
 <strong>API.Bible</strong> (American Bible Society), when
 you read the NKJV, NIV, or NLT, we fetch that single chapter
 from API.Bible at request time and emit the publisher&rsquo;s
 FUMS usage token they require us to send. Public-domain
 translations (KJV, Brenton LXX) never touch this. See{" "}
 <Link
 href="/about"
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 /about
 </Link>{" "}
 for the licensing detail.
 </li>
 <li>
 <strong>ipwho.is</strong>, free, server-side IP&rarr;city
 lookup, used only on the first hit of an anonymous session, then
 cached server-side for six hours so the IP isn&rsquo;t looked up
 again.
 </li>
 <li>
 <strong>Discord</strong>, an external link, not embedded.
 No Discord code runs on Purify.
 </li>
 <li>
 <strong>Amazon Associates</strong>, when a Licensed Works
 entry on a saint profile or elsewhere links to a book on
 amazon.com, the link carries our affiliate tag. Purify
 participates in the Amazon Associates program and may
 earn a commission on qualifying purchases. Amazon receives
 nothing from us about your identity; what they collect from
 your click is governed by their own policy.
 </li>
 </ul>

 {/* The shop & payments */}
 <h2 className="mt-11 scroll-mt-20 font-serif text-[21px] font-bold leading-[1.2] text-balance text-paper">
 The EIKON shop and payments
 </h2>
 <p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 When you buy from EIKON we collect only what an order needs, and we
 share it only with the providers that fulfill it. We never sell it.
 </p>
 <ul className="mt-3 list-disc space-y-2 ps-6 font-serif text-[16.5px] leading-[1.7] text-paper/88 marker:text-paper/40">
 <li>
 <strong>Order &amp; shipping details</strong>, the items you buy,
 totals, status, and the name, email, and shipping address you enter
 at checkout, stored in our Supabase database, visible only to you and
 us, so we can fulfill and support your order.
 </li>
 <li>
 <strong>Stripe</strong>, our payment processor. Card payment happens
 on Stripe; we never receive or store your full card number. Stripe
 handles it under its own privacy policy and PCI standards and returns
 us only what we need to record the order, a payment reference and the
 shipping address you gave it.
 </li>
 <li>
 <strong>Resend</strong>, our email provider, delivers the email we
 send you: order confirmations and shipping updates, account and
 membership notices, support replies, and the optional lists if you
 turn them on. It sees the recipient address and the message in order
 to send it.
 </li>
 <li>
 <strong>Support tickets</strong>, when you contact support, the
 email, name, and messages you send are stored so we can help and
 follow up.
 </li>
 <li>
 <strong>RevenueCat and the app stores</strong>, if you buy an
 optional subscription, the purchase is processed by RevenueCat and by
 Apple or Google under their own policies; we receive whether your
 subscription is active, not your payment details. When you buy or
 renew a membership, we keep a record of it: which store, the plan,
 whether it is a free trial, the price and the dates, and, when a
 membership ends, why. Once you delete your account, it is no longer
 linked to you.
 </li>
 <li>
 <strong>Apple / Google push (native apps only)</strong>, the iOS and
 Android apps deliver notifications through Apple&rsquo;s and
 Google&rsquo;s (Firebase Cloud Messaging) push services, which need a
 device token to reach your phone. The web app uses direct Web Push,
 as described below.
 </li>
 </ul>

 {/* Prayer features — what's local, what's synced */}
 <h2 className="mt-11 scroll-mt-20 font-serif text-[21px] font-bold leading-[1.2] text-balance text-paper">
 The prayer features
 </h2>
 <p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 The morning and evening rules, the Jesus
 Prayer lessons, and the diptychs are all local-first. By default
 every count, every check-off, every name on your diptych lives
 in your browser&rsquo;s <code>localStorage</code> on this device
 and never reaches us. Specifically:
 </p>
 <ul className="mt-3 list-disc space-y-2 ps-6 font-serif text-[16.5px] leading-[1.7] text-paper/88 marker:text-paper/40">
 <li>
 <em>Rule completions</em>: the dates you finished the morning
 or evening rule, kept under{" "}
 <code className="font-mono text-ui text-paper/70">
 purify.prayers.&#123;ruleId&#125;.dates
 </code>{" "}
 (a rolling 30-day list, no streak integer).
 </li>
 <li>
 <em>Prayer rope sessions</em>, recorded before the prayer rope
 was removed in version 1.6: each session&rsquo;s knot count
 and the prayer line you chose, under{" "}
 <code className="font-mono text-ui text-paper/70">
 purify.rope.sessions
 </code>. Nothing new is recorded.
 </li>
 <li>
 <em>Diptychs</em>: the lists of those for whom you pray (living
 + reposed), under{" "}
 <code className="font-mono text-ui text-paper/70">
 purify.intentions.living
 </code>{" "}
 and{" "}
 <code className="font-mono text-ui text-paper/70">
 purify.intentions.departed
 </code>. These are plain JSON in your browser; we are not
 pretending they are encrypted at rest.
 </li>
 <li>
 <em>Push reminders (opt-in)</em>: if you turn on prayer
 reminders in /account, the browser&rsquo;s native Web Push API
 negotiates a subscription endpoint with your push service
 (Google for Chrome / Firefox / Edge; Mozilla for Firefox on
 Linux; Apple for Safari). We store that endpoint, the keys it
 returned, and the two times you picked, in a{" "}
 <code className="font-mono text-ui text-paper/70">
 push_subscriptions
 </code>{" "}
 table. We do not send notification content through any third
 party; the payload is signed with our VAPID key directly from
 our server. Turn it off at any time on the same page.
 </li>
 </ul>
 <p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 If you sign in, the same shapes mirror to
 four Supabase tables:{" "}
 <code className="font-mono text-ui text-paper/70">prayer_completions</code>,{" "}
 <code className="font-mono text-ui text-paper/70">intentions_living</code>,{" "}
 <code className="font-mono text-ui text-paper/70">intentions_departed</code>,{" "}
 <code className="font-mono text-ui text-paper/70">rope_sessions</code>{" "}
 so the data follows you across devices. Each has the
 same row-level lock as bookmarks and annotations (your rows only
 visible to your <code>auth.uid()</code>). They are never joined to
 the anonymous analytics tables.
 </p>

 {/* AI bots */}
 <h2 className="mt-11 scroll-mt-20 font-serif text-[21px] font-bold leading-[1.2] text-balance text-paper">
 The AI-crawler policy
 </h2>
 <p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 This is a policy about the published library, not about you.
 Nothing in this section touches your account, your reading, your
 notes, or your bookmarks, which are never given to anyone.{" "}
 <Link
 href={websiteHref("/robots.txt")}
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >Our robots file</Link>{" "}
 sorts AI agents into three groups, and it is the whole rule.
 </p>
 <ul className="mt-3 list-disc space-y-2 ps-6 font-serif text-[16.5px] leading-[1.7] text-paper/88 marker:text-paper/40">
 <li>
 <strong className="font-semibold text-paper">
 The saints are open, training included.
 </strong>{" "}
 The lives, the writings, and the quotations under{" "}
 <code>/saints</code> are public-domain patristic texts, mostly
 the Nicene and Post-Nicene Fathers translations. We opened
 them to model-training crawlers on purpose. We published this
 material so it would spread, and a model that has read the
 Fathers answers better about them. The agents allowed here are
 GPTBot, ClaudeBot, Claude-Web, anthropic-ai, CCBot,
 Google-Extended, Applebot-Extended, Bytespider, Amazonbot,
 Meta-ExternalAgent, cohere-ai, Diffbot, FacebookBot, Timpi,
 PanguBot, and Scrapy, and they are allowed nowhere else on
 the site.
 </li>
 <li>
 <strong className="font-semibold text-paper">
 The rest of the library is open to AI search and to
 assistants a reader sent.
 </strong>{" "}
 Prayers, councils, history, the calendar, and our own pages
 can be read by the crawlers that cite a source and link back
 to it, OAI-SearchBot, PerplexityBot, DuckAssistBot, and
 YouBot, and by the fetchers that only run because a person
 pasted one of our links into an assistant, ChatGPT-User,
 Claude-User, Perplexity-User, and MistralAI-User. These do
 not build training corpora. Blocking them only meant that a
 reader asking an assistant about a Purify page got an error
 instead of the page.
 </li>
 <li>
 <strong className="font-semibold text-paper">
 Scripture is closed to all of them.
 </strong>{" "}
 The licensed-Scripture publishers require that their text not
 be ingested by language models, so every agent named above,
 in either group, is disallowed from <code>/bible</code>. That
 is a licence obligation with no exceptions, and it is
 unchanged from our first robots file.
 </li>
 </ul>
 <p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 When a model quotes a Father from these pages, the honest
 attribution is to the saint and to the public-domain translation.
 Purify never writes patristic text and never paraphrases it, so a
 passage that reads as though it came from a Father did. We keep a
 plain-language summary of all of this for machine readers at{" "}
 <Link
 href={websiteHref("/llms.txt")}
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >/llms.txt</Link>, and we will keep adding newly discovered
 agents to whichever group fits them.
 </p>

 {/* Browser storage */}
 <h2 className="mt-11 scroll-mt-20 font-serif text-[21px] font-bold leading-[1.2] text-balance text-paper">
 What lives in your browser
 </h2>
 <p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 If you aren&rsquo;t signed in, your reader preferences (font,
 size, translation choice), your bookmarks, and any streak counters
 are kept in your browser&rsquo;s <code>localStorage</code> on
 this device. They never leave it. Clear your site data and they
 reset; we have no copy.
 </p>

 {/* Changes */}
 <h2 className="mt-11 scroll-mt-20 font-serif text-[21px] font-bold leading-[1.2] text-balance text-paper">
 Changes to this page
 </h2>
 <p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 If we change what is recorded, or add a third party that sees
 your traffic, this page is updated first and the change is
 listed in the next{" "}
 <Link
 href="/whats-new"
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 /whats-new
 </Link>{" "}
 letter. We won&rsquo;t change the posture quietly.
 </p>
 {/* Call 32, his yes of 2026-11-11 ("yes privacy and phone voice in v1.9").
     Held by lib/admin/__tests__/privacyLines.test.ts. */}
 <p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 With 1.9:
 </p>
 <ul className="mt-3 list-disc space-y-2 ps-6 font-serif text-[16.5px] leading-[1.7] text-paper/88 marker:text-paper/40">
 <li>
 Buy Me a Coffee is no longer listed: the Support page asks for
 no donation.
 </li>
 <li>
 Your answers about your faith are no longer kept with your
 account, and the copies kept before 1.9 are cleared.
 </li>
 <li>
 The prayer requests written before 1.9, which no one has seen
 since 1.9, are cleared with their words, the moderators&rsquo;
 records of those words, and who prayed for them.
 </li>
 </ul>

 {/* Offline cache */}
 <h2 className="mt-11 scroll-mt-20 font-serif text-[21px] font-bold leading-[1.2] text-balance text-paper">
 Offline cache (the service worker)
 </h2>
 <p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 If you add Purify to your home screen, a small service worker
 (<code className="font-mono text-ui text-paper/70">/sw.js</code>)
 caches the pages and assets you&rsquo;ve already visited so the
 app keeps working on a bad signal. Caches are named
 {" "}<code className="font-mono text-ui text-paper/70">purify-v*-html</code>,
 {" "}<code className="font-mono text-ui text-paper/70">purify-v*-static</code>,
 and {" "}<code className="font-mono text-ui text-paper/70">purify-v*-assets</code>.
 They store only public, public-domain page HTML, the Next.js
 build output, fonts, saint icons, and the manifest. Authenticated
 API calls (Supabase, our analytics endpoint, the licensed
 translation API) are never intercepted and never cached, so your
 session stays on the network where it belongs.
 </p>
 <p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 To clear the cache, uninstall the home-screen app, or in your
 browser settings, clear site data for the Purify origin. We can
 also bump the cache version on a release, which evicts the old
 caches automatically the next time the app opens.
 </p>

 {/* Closing */}
 <div className="mt-12 border-t border-paper/8 pt-6">
 <p className="font-serif text-[16.5px] leading-[1.7] text-paper/75">
 Questions, corrections, or a privacy concern? Write to{" "}
 <a
 href={`mailto:${LEGAL_EMAIL}`}
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 {LEGAL_EMAIL}
 </a>{" "}
 and we&rsquo;ll get back to you.
 </p>
 </div>
 </div>
    </>
  );
}

// The German text (2026-11-09, brought level with the English on the arbiter's
// word: "a faithful translation of the English already approved, nothing new
// in substance"). The names of buttons and features are the German app's own
// (lib/i18n/messages/de.json).
function PrivacyDe() {
  return (
    <>
 <h1 className="font-serif text-title font-bold leading-[1.12] tracking-[-0.01em] text-balance text-paper">
 Was wir aufzeichnen und was nicht.
 </h1>
 {/* Its own language, as the English says its own: the two keep one shape. */}
 <div lang="de" dir="ltr">
 <p className="mt-4 font-serif text-[17px] leading-[1.65] text-paper/80">
 Die Kurzfassung steht auf der{" "}
 <Link
 href="/about"
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 Über-Seite
 </Link>
 . Diese hier ist die Langfassung: jedes Feld, das wir aufzeichnen,
 jeder Ort, wohin es geht, jeder Dritte, den die Seite berührt, und
 wie lange wir etwas davon aufbewahren. Wenn etwas hier falsch ist,
 schreib uns; wir bringen es in Ordnung.
 </p>
 {/* Wer Purify betreibt (sein Wort vom 2026-11-10; lib/legal/entity.ts). */}
 <p className="mt-3 font-serif text-[17px] leading-[1.65] text-paper/80">
 Purify wird von der {LEGAL_NAME} betrieben. Du erreichst das
 Unternehmen unter{" "}
 <a
 href={`mailto:${LEGAL_EMAIL}`}
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 {LEGAL_EMAIL}
 </a>
 .
 </p>
 {/* The text's own headings, folded, as a way through it (./LegalContents.tsx). */}
 <LegalContents />

 {/* Two account paths */}
 <h2 className="mt-11 scroll-mt-20 font-serif text-[21px] font-bold leading-[1.2] text-balance text-paper">
 Auf diesem Gerät oder angemeldet
 </h2>
 <p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 Purify funktioniert privat auf diesem Gerät, ohne Konto; die
 Anmeldung bringt die Tage, an denen du gebetet hast, und die Namen,
 für die du betest, auf jedes Gerät, und mit Purify Plus auch deine
 Markierungen, Notizen und Lesezeichen. Wenn du{" "}
 <Link
 href="/account"
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 /account
 </Link>{" "}
 öffnest, wählst du einen von zwei Wegen. Keiner ist voreingestellt;
 die Wahl wird schlicht vorgelegt.
 </p>
 <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
 <div className="theology-tray rounded-[18px] px-4 py-4">
 <p className="mb-2 font-sans text-detail font-semibold text-paper">
 Auf diesem Gerät (ohne Konto)
 </p>
 <p className="font-serif text-[16px] leading-[1.65] text-paper/88">
 Markierungen, Notizen, Lesezeichen, deine Gebets-Strähne und die
 Lese-Einstellungen (Schrift, Größe) werden im{" "}
 <code className="font-mono text-ui text-paper/70">localStorage</code>{" "}
 deines Browsers gespeichert. Wir sehen oder empfangen nichts
 davon. Es gibt keine Zeile für dich in unserer Datenbank. Die
 Kehrseite: es lebt nur auf diesem Gerät und geht verloren, wenn
 du die Browserdaten löschst.
 </p>
 <p className="mt-3 font-sans text-detail leading-[1.55] text-paper/60">
 Um den Namen zu entfernen, den du auf diesem Gerät gewählt hast,
 öffne /account und tippe auf &bdquo;Diesen Namen
 entfernen&ldquo;. Um alle lokalen Daten zu löschen: auf der
 Website lösche in den Einstellungen deines Browsers die Daten
 dieser Seite; in der App leere ihren Speicher in den
 Einstellungen deines Telefons, oder entferne die App.
 </p>
 </div>
 <div className="theology-tray rounded-[18px] px-4 py-4">
 <p className="mb-2 font-sans text-detail font-semibold text-paper">
 Angemeldet
 </p>
 <p className="font-serif text-[16px] leading-[1.65] text-paper/88">
 Was du mit deinem Konto behältst, geht in unsere
 Supabase-Postgres-Datenbank, damit es jedes Gerät erreicht, auf
 dem du dich anmeldest. Wir speichern: deine E-Mail (um dich
 anzumelden und um Bestätigungen bei Passwort- oder
 E-Mail-Änderungen zu senden), einen Argon2-Hash deines Passworts
 (nie das Passwort selbst), einen Anzeigenamen und eine{" "}
 <code className="font-mono text-ui text-paper/70">profiles</code>
 -Zeile mit dem Erstellungsdatum deines Kontos, dem Zeitpunkt, an dem
 die Zeile zuletzt geändert wurde, einem Kennzeichen, ob du ein
 Passwort gesetzt hast, der Sprache, die du gewählt hast (damit
 deine anderen Geräte und unsere E-Mails sie verwenden), und deiner
 Antwort darauf, wozu du gekommen bist, damit ein anderes Gerät
 nicht noch einmal fragt. Was du in deinem Profil in der
 Gemeinschaft ausfüllst, wird ebenfalls dort gespeichert, und jeder
 kann es sehen, außer du machst dein Profil privat: &bdquo;Über
 mich&ldquo; und dein Status, deine Gemeinde, dein Namenspatron, dein
 Lieblingsvers und deine Links und, wenn du es einschaltest, was du
 gerade liest. Die Namensfarbe, die du wählst, zeigt sich überall,
 wo dein Name steht. Abhakungen der Gebetsregel und die Namen, für
 die du betest, wandern als eigene Zeilen, und mit Purify Plus auch
 Markierungen, Notizen und Lesezeichen. Wenn du dich mit Google
 oder Apple anmeldest, speichern wir zusätzlich eine{" "}
 <code className="font-mono text-ui text-paper/70">identities</code>
 -Zeile, die dein Konto mit jenem Anbieter verbindet; wir sehen
 nie dein Google- oder Apple-Passwort, nur das OAuth-Token.
 </p>
 {/* 1.9, his yes to 59 (2026-11-10), word for word in German. */}
 <p className="mt-3 font-serif text-[16px] leading-[1.65] text-paper/88">
 Mit Purify Plus wandert auch mit, was du beim Lesen behältst: dein
 Fortschritt in jedem Leseplan, der Plan von &bdquo;Den Vers auswendig
 lernen&ldquo; (welcher Vers wann dran ist, nicht sein Wortlaut),
 deine Stelle in der Bibel und in jedem langen Werk und deine
 Leseeinstellungen (Palette, Größe, Schriftart, Zeilenabstand und
 Fokus). Jedes davon ist ein kleiner Eintrag, den nur dein Konto lesen
 oder ändern kann und der mit deinem Konto gelöscht wird.
 </p>
 <p className="mt-3 font-sans text-detail leading-[1.55] text-paper/60">
 Um das Konto und jede serverseitige Zeile, die es angelegt hat,
 zu löschen, benutze die Schaltfläche &bdquo;Konto löschen&ldquo;
 auf /account. Die Löschung geschieht sofort und erfasst alles,
 was daran hängt.
 </p>
 </div>
 </div>
 <p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 Wenn du auf diesem Gerät beginnst und dich später anmeldest,
 werden die Tage, an denen du gebetet hast, und die Namen, für die du
 betest, mit deinem Konto bewahrt, und mit Purify Plus auch deine
 Markierungen, Notizen und Lesezeichen; auf dem Gerät wird nichts
 entfernt. Dein Kalenderstil bleibt auf diesem Gerät. Die Abmeldung
 löscht niemals, was auf dem Gerät gespeichert ist.
 </p>
 <p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 Nichts auf beiden Wegen wird verkauft, geteilt oder zum Training
 von Modellen gebraucht. Die unten beschriebene Analytik ist von
 beiden getrennt: sie zeichnet Seitenaufrufe in Summe auf, ohne
 deine Konto-Identität, ob du angemeldet bist oder nicht.
 </p>
 <p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 <strong className="font-semibold text-paper">Eine Journalseite teilen.</strong>{" "}
 Wenn du eine Seite teilst, behalten wir eine Kopie davon, so wie sie
 beim Teilen war, unter einem eigenen Link (purifyapp.net/p/...).
 Jeder mit dem Link kann sie lesen. Suchmaschinen halten wir von ihr
 fern, bis wir sie geprüft haben; danach dürfen sie sie aufführen.
 Deine Notizbücher und Schlagwörter sind nie Teil der Kopie. Wenn
 jemand eine geteilte Seite meldet, behalten wir die Meldung, das
 Konto, das sie gemacht hat, und was dazu geschrieben wurde, bis zu
 500 Zeichen, damit wir die Seite prüfen können. Wenn du das Teilen
 beendest, wird die Kopie sofort gelöscht, mit allen Meldungen dazu.
 Wenn du dein Konto löschst, werden alle Seiten gelöscht, die du
 geteilt hast, mit ihren Meldungen.
 </p>
 <p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 <strong className="font-semibold text-paper">Gebetskampagnen.</strong>{" "}
 Eine Gebetskampagne ist öffentlich, es sei denn, du beschränkst sie
 auf einen Kreis: ihr Titel, der Vorname des Menschen, für den gebetet
 wird, dein Text, ihre Bilder, ihr Ort, falls du einen angibst, deine
 Neuigkeiten sowie der Name und das Bild deines Profils. Auch die
 Kommentare anderer sind öffentlich. Gib nur an, was das Gebet
 braucht: Ein Vorname genügt, und schreibe nichts über die Gesundheit
 oder das Leben eines anderen Menschen, dem er nicht zugestimmt hat.
 Bevor eine Kampagne für jemand anderen angelegt wird, bestätigst du,
 dass dieser Mensch oder seine Familie den Segen dazu gegeben hat, und
 wir speichern den Tag, an dem du das bestätigt hast.
 </p>
 <p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 Bilder werden auf unserem Server neu erzeugt, bevor sie gespeichert
 werden. Dabei gehen der Ort und das Gerät verloren, die ein Foto in
 sich trägt, und ein Moderator sieht sich jedes Bild an, bevor es
 gezeigt wird. Ein Ort besteht aus einem Land und einer Stadt, die du
 selbst eintippst; die App fragt nie, wo du bist.
 </p>
 <p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 Wer eine Kampagne in seine Gebete aufgenommen hat, wird niemandem
 gezeigt, auch nicht dem, der sie angelegt hat, und keine Zahl davon
 wird gezeigt. Bist du angemeldet, werden die Kampagnen, die du
 mitträgst, bei deinem Konto gespeichert, damit sie dir auf deine
 anderen Geräte folgen; bist du es nicht, bleiben sie allein auf
 deinem Gerät. Der Name und der Titel der Kampagne liegen auf deinem
 Gerät, solange du sie mitträgst, und verschwinden, wenn sie endet.
 </p>
 <p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 Du kannst eine Kampagne jederzeit beenden, ein Bild entfernen, ihre
 Kommentare schließen oder die ganze Kampagne löschen. Beim Löschen
 wird sie mit ihren Bildern, Neuigkeiten und Kommentaren von unseren
 Servern entfernt, und sie verschwindet aus den Gebeten anderer,
 sobald deren App das nächste Mal online ist. Eine Kampagne für einen
 lebenden Menschen wird dreißig Tage nach ihrem letzten Tag gelöscht,
 wenn du sie nicht erneuerst. Wenn du dein Konto löschst, werden auch
 deine Kampagnen gelöscht. Auch wir dürfen eine Kampagne, ein Bild
 oder einen Kommentar entfernen, der gegen unsere Bedingungen
 verstößt; was wir deshalb entfernen, bewahren wir dreißig Tage lang
 unsichtbar auf, für einen Einspruch oder eine rechtmäßige Anfrage,
 und löschen es dann. Wenn du eine Kampagne meldest, speichern wir die
 Meldung, ihren Grund und das Konto, von dem sie kam, damit ein
 Moderator sie prüfen kann; sie wird mit der Kampagne gelöscht, und
 wenn du vorher dein Konto löschst, bleibt sie ohne deinen Namen.
 </p>
 <p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 Nennt eine Kampagne dich oder einen Menschen in deiner Obhut, ohne
 dass du zugestimmt hast, melde sie auf ihrer Seite oder schreib an{" "}
 <a href={`mailto:${SUPPORT_EMAIL}`} className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper">{SUPPORT_EMAIL}</a>, und wir nehmen sie herunter. Gehört dir ein Bild darin,
 das ohne deine Erlaubnis verwendet wurde, schreib an{" "}
 <a href={`mailto:${LEGAL_EMAIL}`} className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper">{LEGAL_EMAIL}</a>. Was du zusagst, wenn du etwas veröffentlichst, steht in
 unseren Nutzungsbedingungen.
 </p>
 <p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 <strong className="font-semibold text-paper">Gemeinschaft.</strong>{" "}
 Beiträge und Antworten in der Gemeinschaft sind öffentlich: Jeder
 kann sie lesen, in den Apps und auf unserer Website, mit dem Namen
 und dem Bild, die dein Profil hatte, als du sie geschrieben hast.
 Auch dein Profil ist öffentlich, sein Name, sein Bild und sein
 Titelbild, unter einer eigenen Adresse auf unserer Website. Sie
 bleiben, bis du sie löschst, und wenn du dein Konto löschst, werden
 sie gelöscht. Moderatoren dürfen einen Beitrag oder eine Antwort
 ausblenden oder entfernen, der gegen unsere Bedingungen verstößt.
 Wenn du einen meldest, speichern wir die Meldung und das Konto, von
 dem sie kam, damit ein Moderator sie prüfen kann; sie wird mit dem
 Beitrag gelöscht, und wenn du vorher dein Konto löschst, bleibt sie
 ohne deinen Namen.
 </p>

 {/* What we record */}
 <h2 className="mt-11 scroll-mt-20 font-serif text-[21px] font-bold leading-[1.2] text-balance text-paper">
 Was wir aufzeichnen
 </h2>
 <p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 Das Einzige, was die Seite über einen Besuch aufzeichnet, ist eine
 anonyme, vergängliche Sitzung, die für die kleine &bdquo;Wer liest
 gerade jetzt&ldquo;-Ansicht gebraucht wird, die uns hilft zu
 verstehen, ob die Arbeit jemanden findet. Vom Browser, bei jedem
 Seitenaufruf:
 </p>
 <ul className="mt-3 list-disc space-y-2 ps-6 font-serif text-[16.5px] leading-[1.7] text-paper/88 marker:text-paper/40">
 <li>
 Eine zufällige <em>Sitzungs-Kennung</em>, die der Browser beim
 ersten Besuch erzeugt, in <code>sessionStorage</code> für die
 Lebenszeit des Tabs gehalten, nie über Browser-Neustarts
 hinweg behalten.
 </li>
 <li>
 Der <em>Pfad</em> der besuchten Seite (z. B.{" "}
 <code>/bible/john/1</code>). Niemals Formulareingaben, und von den
 Suchparametern nichts außer der Verweis-Marke weiter unten.
 </li>
 <li>
 Der <em>Verweiser</em>, falls dein Browser einen gesandt hat,
 damit wir sehen können, wenn ein Verweis von anderswo jemanden
 hereingebracht hat.
 </li>
 <li>
 Eine <em>Verweis-Marke</em>, wenn der Verweis, dem du gefolgt
 bist, eine trug. Verweise in unseren eigenen E-Mails und
 Beiträgen können auf ein kurzes Wort enden, etwa{" "}
 <code>?via=email-release-1.5</code>. Es ist für alle, die
 diese E-Mail bekommen, dasselbe. Es nennt die E-Mail oder den
 Beitrag und niemals dich, es wird anstelle des Verweisers
 behalten, und die Seite nimmt es danach aus der Adresse in
 deinem Browser.
 </li>
 </ul>
 <p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 Auf dem Server leiten wir zusätzlich, wenn eine Sitzung erstmals
 gesehen wird, ab und speichern:
 </p>
 <ul className="mt-3 list-disc space-y-2 ps-6 font-serif text-[16.5px] leading-[1.7] text-paper/88 marker:text-paper/40">
 <li>
 Deinen <em>User-Agent</em>-String (Browser + Betriebssystem),
 auf 300 Zeichen gekürzt. Wird benutzt, um Telefone von Computern
 und unsere Apps von der Website zu unterscheiden und um zu sehen,
 wann ein Besuch über den eingebauten Browser einer anderen App
 kam. Unsere Windows-App sagt außerdem, dass sie die Windows-App
 ist, und wir vermerken das daneben.
 </li>
 <li>
 Eine <em>grobe, städtische Verortung</em>, Land, Region,
 Stadt und die ungefähre geographische Lage der Stadt,
 hergeleitet aus deiner Anfrage-IP über{" "}
 <a
 href="https://ipwho.is/"
 target="_blank"
 rel="noopener noreferrer"
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 ipwho.is
 </a>
 . Deine IP selbst wird <em>nicht</em> gespeichert; nur die
 städtischen Felder oben.
 </li>
 <li>
 Das von deinem Browser erklärte{" "}
 <em>primäre Sprach-Etikett</em> (der erste Eintrag im{" "}
 <code>Accept-Language</code>-Header, ohne Regionsangabe, z. B.
 &bdquo;es&ldquo; oder &bdquo;ru&ldquo;). Wird nur gebraucht, um
 zu entscheiden, welche UI-Übersetzungen vorzuziehen sind; nichts
 Feinkörnigeres als das Land, das wir bereits halten, wird
 behalten.
 </li>
 </ul>
 {/* Ambassador links, as the English page has them since 2026-09-30. */}
 <p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 <em>Botschafter-Links.</em> Einige Leser sind eingeladen, den
 Purify-Laden als Botschafter weiterzuempfehlen, mit einem Link, der
 auf <code>?ref=</code> und ihren Code endet. Wenn du über einen
 solchen kommst, behalten wir diesen Code 30 Tage lang in einem
 Cookie unserer eigenen Seite, <code>purify_ref</code>, und wenn du
 in dieser Zeit bei EIKON kaufst, erhält der Botschafter einen Anteil
 am Verkauf. Das Cookie enthält nur seinen Code, nichts über dich.
 Besuche über jeden Link werden als eine Zahl pro Tag gezählt, nie
 mit dir, deinem Gerät oder deinem Konto verbunden. Deine Bestellung
 hält fest, mit welchem Code sie kam, damit der Botschafter bezahlt
 werden kann; er sieht eine Bestellnummer und einen Betrag, niemals
 deinen Namen.
 </p>
 <p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 Wenn du dich anmeldest, speichert Supabase die E-Mail-Adresse, mit
 der du dich angemeldet hast, sowie die Zeilen, die du erstellst: die
 Tage, an denen du gebetet hast, und die Namen, für die du betest,
 und mit Purify Plus deine Markierungen, Notizen und Lesezeichen.
 Nichts davon wird mit der anonymen Sitzung oben verknüpft; die
 beiden liegen in getrennten Tabellen und werden nicht in Beziehung
 gesetzt.
 </p>

 {/* What we don't */}
 <h2 className="mt-11 scroll-mt-20 font-serif text-[21px] font-bold leading-[1.2] text-balance text-paper">
 Was wir nicht tun
 </h2>
 <ul className="mt-3 list-disc space-y-2 ps-6 font-serif text-[16.5px] leading-[1.7] text-paper/88 marker:text-paper/40">
 <li>Keine Drittwerbung. Keine Werbe-SDKs, keine Werbe-Cookies.</li>
 <li>Kein Verhaltensprofil, keine seitenübergreifende Verfolgung, kein Fingerabdruck.</li>
 <li>
 Niemals ein Verkauf deiner Daten. Wir geben sie nur an die unten
 genannten Dienstleister weiter, die wir für den Betrieb der Seite
 brauchen (Hosting, Zahlung, E-Mail, Push), und nur dafür, nie für
 deren eigene Werbung.
 </li>
 <li>
 Keine Werbe-E-Mails, es sei denn, du bittest darum. Es gibt zwei
 freiwillige Listen, Neues in der Bibliothek und Neues im Laden, und
 beide bleiben aus, bis du sie in deinem Konto einschaltest. Einige
 Male im Jahr, wenn eine neue Version von Purify erscheint, schreiben
 wir jedem Konto, was sich geändert hat. Diese E-Mail kommt, solange
 du sie nicht ausschaltest, und ein Tippen in der E-Mail genügt
 dafür. Jede E-Mail, die wir senden, endet mit einer Schaltfläche
 zum Abbestellen. Alles andere, was wir dir schreiben, betrifft
 etwas, worum du gebeten hast oder was du bei uns hast: eine
 Bestellung, deine Mitgliedschaft, dein Konto, eine Änderung unserer
 Bedingungen oder eine Support-Nachricht, und diese kommen weiter,
 weil sie zu einem Konto gehören. Push-Erinnerungen an das Gebet
 gibt es nur, wenn du sie einschaltest.
 </li>
 <li>
 Keine Analytik, die mit deiner Konto-Identität verknüpft wird.
 Die angemeldeten Abgleichsdaten und die anonymen Besuchsdaten
 leben in verschiedenen Tabellen und werden nie verbunden.
 </li>
 <li>
 Keine Nutzung deines Lesens zum Trainieren eines Sprachmodells.
 Was du liest, markierst und speicherst, gehört dir; es wird
 niemandem übergeben, weder zum Training noch für sonst etwas. Ein
 Teil der veröffentlichten Bibliothek ist absichtlich für KI-Crawler
 offen, und nichts von deiner Aktivität gehört dazu. Unsere{" "}
 <Link
 href={websiteHref("/robots.txt")}
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 Robots-Regel
 </Link>{" "}
 legt genau fest, welche Crawler welche Teile der Seite lesen
 dürfen.
 </li>
 </ul>

 {/* Where it lives */}
 <h2 className="mt-11 scroll-mt-20 font-serif text-[21px] font-bold leading-[1.2] text-balance text-paper">
 Wo es liegt
 </h2>
 <p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 Alle Sitzungs- und Seitenaufrufzeilen werden in eine
 Supabase-Postgres-Datenbank geschrieben, die wir verwalten, in
 zwei Tabellen: <code>analytics_sessions</code> (eine Zeile je
 Sitzung, mit der groben Verortung und dem User-Agent) und{" "}
 <code>analytics_pageviews</code> (eine Zeile je Seitenaufruf, die
 eine Sitzungs-Kennung mit einem Pfad verbindet). Schreibvorgänge
 geschehen serverseitig mit einem Service-Role-Schlüssel; nichts,
 was die Analytik betrifft, wird dem Browser ausgesetzt. Eine
 kleine Admin-Seite lässt uns die Live-Zahlen sehen; sie ist die
 einzige Leserin.
 </p>
 <p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 Die Katechese des Tages fügt zwei Summentabellen hinzu, und keine
 von beiden enthält eine Person. <code>quiz_question_stats</code>{" "}
 hält je Frage fest, wie oft sie gezeigt und wie oft sie richtig
 beantwortet wurde, über alle hinweg, angemeldet oder nicht.{" "}
 <code>analytics_events</code> hält eine Zeile je begonnener oder
 abgeschlossener Katechese, mit der Punktzahl und der
 Kalenderrechnung und sonst nichts: keine Sitzungs-Kennung, kein
 Konto, kein Gerät. Wenn du angemeldet bist, werden deine eigenen
 abgeschlossenen Tage in <code>quiz_attempts</code> unter deinem
 Konto gehalten, nur für dich lesbar, und mit ihm gelöscht. Wenn
 nicht, bleiben sie auf deinem Gerät, und nur die beiden Zähler
 oben verlassen es.
 </p>
 <p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 Die Willkommensfragen werden in derselben Tabelle gezählt, damit
 wir sehen, woher neue Leser kommen und was ihnen hilft: jeder
 erreichte Bildschirm, jede gegebene Antwort, ein Überspringen, ein
 Abschluss und, von deinem eigenen Gerät, ein Vermerk an deinem
 zweiten, siebten und dreißigsten Tag, dass du wiedergekommen bist.
 Eine Zeile enthält die Antwort, die Art des Geräts (iPhone,
 Android, Website), den Link, der dich gebracht hat, wenn er einer
 von unseren war, und den Tag, nicht die Uhrzeit. Keine
 Sitzungs-Kennung, kein Konto, keine Geräte-Kennung: &bdquo;ein
 Leser, der katholisch geantwortet hat, ist fertig geworden&ldquo;
 ist einer mehr in einer Summe, nie du. Deine Antworten selbst
 bleiben auf deinem Gerät, damit Purify zu deinem wird. Wenn du dich
 anmeldest, wird deine Antwort darauf, wozu du gekommen bist, auch
 mit deinem Konto bewahrt; deine Antworten über deinen Glauben, wie
 vertraut du mit dem orthodoxen Christentum bist und deine Herkunft
 im Glauben, werden nicht damit bewahrt.
 </p>
 <p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 Die Bildschirme werden in derselben Tabelle gezählt, damit wir
 sehen, wo das Lesen aufhört und ob neue Leser wiederkommen. Wenn
 du die App weglegst oder die Seite schließt, sagt eine Zeile,
 welche Art von Bildschirm gezeigt wurde (&bdquo;ein
 Bibelkapitel&ldquo;, &bdquo;ein Gebet&ldquo;, nie welches) und
 ungefähr, wie lange er offen war: unter zehn Sekunden, unter einer
 Minute, unter fünf Minuten oder länger. Und von deinem eigenen
 Gerät ein Vermerk, wenn es Purify zum ersten Mal öffnet, und je
 einmal, wenn du einen Tag, eine Woche und einen Monat danach
 wiederkommst. Eine Zeile enthält nur das, mit der Art des Geräts
 (iPhone, Android, Windows, Website) und dem Tag, nicht der Uhrzeit.
 Keine Sitzungs-Kennung, kein Konto, keine Geräte-Kennung, keine
 Seitenadresse: &bdquo;jemand hat die App nach ein, zwei Minuten auf
 der Seite eines Heiligen weggelegt&ldquo; ist einer mehr in einer
 Summe, nie du. Der Tag, an dem du Purify zum ersten Mal geöffnet
 hast, bleibt auf deinem Gerät.
 </p>
 <p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 Wofür Purify Plus gewünscht wird, zählen wir in derselben Tabelle.
 Wenn du etwas antippst, das Plus braucht, sagt eine Zeile, welche
 Funktion es war (&bdquo;Lesepläne&ldquo;,
 &bdquo;Klangkulisse&ldquo;), nie die Seite. Wenn du dann in dem
 Blatt, das sich geöffnet hat, ein Abonnement abschließt, sagt eine
 Zeile, für welche Funktion das Blatt geöffnet wurde und ob du einen
 Monat oder ein Jahr gewählt hast. Eine Zeile enthält nur das, mit
 der Art des Geräts (iPhone, Android, Windows, Website) und dem Tag,
 nicht der Uhrzeit. Keine Sitzungs-Kennung, kein Konto, keine
 Geräte-Kennung: &bdquo;jemand, der den Leseplänen begegnet ist, hat
 für ein Jahr abonniert&ldquo; ist einer mehr in einer Summe, nie
 du.
 </p>
 {/* 1.9, admin item A5: the owner's line of 2026-11-09, word for word in German. */}
 <p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 Wir zählen, ohne deinen Namen, welche Bibelübersetzungen
 heruntergeladen werden, welche Lesepläne begonnen und beendet werden,
 wie viele Tagebuchseiten geschrieben und geteilt werden und welche
 Version der App benutzt wird.
 </p>
 {/* 1.9, admin items A10 and A11: the owner's lines of 2026-11-09, word for
 word in German, the line on errors as of 2026-11-10 (82a). A test holds
 them (lib/admin/__tests__/privacyLines.test.ts). */}
 <p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 Wenn etwas fehlschlägt, behält Purify einen kurzen Bericht: was
 fehlgeschlagen ist und welchen Fehler es gab, die Seite, die
 App-Version und die Art des Geräts, niemals, wer du bist. Alles
 darin, was wie eine E-Mail-Adresse oder eine Telefonnummer aussieht,
 wird vorher entfernt, und jeder Bericht wird nach 14 Tagen gelöscht.
 </p>
 <p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 Wenn eine Suche nichts findet, behalten wir 90 Tage lang die Wörter,
 nach denen du gesucht hast, niemals aber, wer du bist, damit wir
 ergänzen können, wonach Leser suchen. Alles, was wie eine
 E-Mail-Adresse oder eine Telefonnummer aussieht, wird entfernt,
 bevor es behalten wird.
 </p>
 {/* 1.9 (lib/ab/): the owner's line of 2026-11-10, in German. A test holds it. */}
 <p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
   Manchmal sehen zwei Leser eine unterschiedliche Fassung desselben
   Bildschirms, damit wir lernen, welche hilft. Welche Fassung dein
   Gerät zeigt, wird auf deinem Gerät entschieden, durch eine
   Zufallszahl, die es nie verlässt. Eine Zählung kann dann auch
   sagen, welche Fassung es war, und sonst kommt nichts hinzu: keine
   Sitzungs-Kennung, kein Konto, keine Geräte-Kennung. &bdquo;Ein
   Leser, dem die zweite Fassung gezeigt wurde, kam eine Woche später
   wieder&ldquo; ist einer mehr in einer Summe, nie du.
 </p>
 {/* 1.9 (lib/analytics/moreCounting.ts): the eight sentences of his item 140, in German. A test holds them. */}
<p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
   Wenn ein Gerät zum ersten Mal ein Gebet oder ein Kapitel beendet,
   sagt eine Zeile, welches von beiden es war und wie viele Tage nach
   dem ersten Öffnen von Purify. Die Schritte einer ersten Woche werden
   ebenso gezählt: welcher der sieben Tage es war und ob er geöffnet
   oder geschlossen wurde, nie welcher Schritt. Wenn ein Konto angelegt
   wird, sagt eine Zeile, wo in Purify es angelegt wurde, und nichts
   über das Konto. Wenn Erinnerungen ein- oder ausgeschaltet werden,
   sagt eine Zeile das und wo. Die Notiz, die dein Gerät sendet, wenn
   du wiederkommst, sagt auch, ob Erinnerungen eingeschaltet waren.
</p>
<p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
   Im Plus-Blatt sagt eine Zeile, wann das Ausprobieren einer Funktion
   geöffnet und wann die Schaltfläche zum Abonnieren angetippt wurde,
   mit der Funktion, für die das Blatt geöffnet wurde. Ein Kauf auf der
   Preisseite wird gezählt wie einer im Blatt. Die Zeile, die sagt,
   welche Art von Bildschirm zu sehen war, als die App weggelegt wurde,
   sagt auch, ob es der erste Tag des Geräts war. Die zwei kleinen
   Karten, denen ein neuer Leser auf Heute begegnen kann, werden als
   beantwortet oder geschlossen gezählt. Von deinem eigenen Gerät sagt
   eine Zeile auch, wann der erste Schritt deiner ersten Woche geöffnet
   wurde.
</p>

 {/* Retention */}
 <h2 className="mt-11 scroll-mt-20 font-serif text-[21px] font-bold leading-[1.2] text-balance text-paper">
 Wie lange wir es behalten
 </h2>
 <p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 Die anonymen Besuchsdaten behalten wir: die Sitzungs- und
 Seitenaufruf-Zeilen und die oben beschriebenen Zählungen (zur
 Katechese, zu den Willkommensfragen, zu den Bildschirmen, dazu,
 wofür Purify Plus gewünscht wird, zu den heruntergeladenen Bibeln,
 den Leseplänen, den Tagebuchseiten, den App-Versionen und zu den
 übrigen oben beschriebenen).
 Nichts löscht sie nach Plan; wir behalten sie, um zu sehen, wie
 Purify über die Zeit genutzt wird. Fehlerberichte werden nach 14
 Tagen gelöscht, erfolglose Suchen nach 90 Tagen. Abgleichsdaten, die an dein Konto
 gebunden sind (Markierungen, Lesezeichen usw.), werden so lange
 behalten, wie dein Konto besteht; die Löschung deines Kontos über{" "}
 <Link
 href="/account"
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 /account
 </Link>{" "}
 entfernt diese Zeilen.
 </p>

 {/* Third parties */}
 <h2 className="mt-11 scroll-mt-20 font-serif text-[21px] font-bold leading-[1.2] text-balance text-paper">
 Dritte, die die Seite berührt
 </h2>
 <ul className="mt-3 list-disc space-y-2 ps-6 font-serif text-[16.5px] leading-[1.7] text-paper/88 marker:text-paper/40">
 <li>
 <strong>Supabase</strong>, gehostetes Postgres und Auth.
 Speichert deine Abgleichsdaten und die anonymen
 Analytik-Tabellen.
 </li>
 <li>
 <strong>Render</strong>, Webhosting. Sieht denselben
 HTTP-Anfrageverkehr, den jeder Hoster sieht.
 </li>
 <li>
 <strong>API.Bible</strong> (American Bible Society), wenn du die
 NKJV, NIV oder NLT liest, holen wir dieses einzelne Kapitel zur
 Anfragezeit von API.Bible und senden das vom Verlag verlangte
 FUMS-Nutzungs-Token. Gemeinfreie Übersetzungen (KJV, Brenton-LXX)
 berühren das nie. Siehe{" "}
 <Link
 href="/about"
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 /about
 </Link>{" "}
 für die Lizenz-Einzelheiten.
 </li>
 <li>
 <strong>ipwho.is</strong>, freie serverseitige
 IP&rarr;Stadt-Auflösung, nur beim ersten Treffer einer anonymen
 Sitzung gebraucht, danach sechs Stunden lang serverseitig
 zwischengespeichert, damit die IP nicht erneut nachgeschlagen
 wird.
 </li>
 <li>
 <strong>Discord</strong>, ein externer Verweis, nicht
 eingebettet. Kein Discord-Code läuft auf Purify.
 </li>
 <li>
 <strong>Amazon-Partner-Programm</strong>, wenn ein Eintrag der
 lizenzierten Werke auf einem Heiligen-Profil oder anderswo auf ein
 Buch bei amazon.com verweist, trägt der Verweis unsere
 Partner-Kennung. Purify nimmt am Amazon-Partner-Programm teil und
 kann an qualifizierten Käufen eine Provision verdienen. Amazon
 empfängt von uns nichts über deine Identität; was sie aus deinem
 Klick erheben, regelt ihre eigene Richtlinie.
 </li>
 </ul>

 {/* The shop & payments */}
 <h2 className="mt-11 scroll-mt-20 font-serif text-[21px] font-bold leading-[1.2] text-balance text-paper">
 Der EIKON-Laden und Zahlungen
 </h2>
 <p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 Wenn du bei EIKON kaufst, erheben wir nur, was eine Bestellung
 braucht, und geben es nur an die Anbieter weiter, die sie
 ausführen. Wir verkaufen es nie.
 </p>
 <ul className="mt-3 list-disc space-y-2 ps-6 font-serif text-[16.5px] leading-[1.7] text-paper/88 marker:text-paper/40">
 <li>
 <strong>Bestell- und Versanddaten</strong>, die Artikel, die du
 kaufst, Summen, Status sowie Name, E-Mail und Lieferadresse, die du
 an der Kasse eingibst, gespeichert in unserer Supabase-Datenbank,
 nur für dich und uns sichtbar, damit wir deine Bestellung
 ausführen und betreuen können.
 </li>
 <li>
 <strong>Stripe</strong>, unser Zahlungsdienstleister. Die
 Kartenzahlung geschieht bei Stripe; wir empfangen oder speichern
 nie deine vollständige Kartennummer. Stripe behandelt sie nach
 seiner eigenen Datenschutzrichtlinie und den PCI-Standards und gibt
 uns nur zurück, was wir brauchen, um die Bestellung festzuhalten,
 eine Zahlungsreferenz und die Lieferadresse, die du dort angegeben
 hast.
 </li>
 <li>
 <strong>Resend</strong>, unser E-Mail-Anbieter, stellt die E-Mails
 zu, die wir dir senden: Bestellbestätigungen und
 Versandnachrichten, Hinweise zu Konto und Mitgliedschaft,
 Support-Antworten und die freiwilligen Listen, wenn du sie
 einschaltest. Es sieht die Empfängeradresse und die Nachricht, um
 sie zu senden.
 </li>
 <li>
 <strong>Support-Anfragen</strong>, wenn du den Support
 kontaktierst, werden die E-Mail, der Name und die Nachrichten, die
 du sendest, gespeichert, damit wir helfen und nachfassen können.
 </li>
 <li>
 <strong>RevenueCat und die App-Stores</strong>, wenn du ein
 freiwilliges Abonnement kaufst, wird der Kauf von RevenueCat und
 von Apple oder Google nach deren eigenen Richtlinien abgewickelt;
 wir erfahren, ob dein Abonnement aktiv ist, nicht deine
 Zahlungsdaten. Wenn du eine Mitgliedschaft abschließt oder
 verlängerst, bewahren wir eine Aufzeichnung davon auf: welcher
 Store, der Tarif, ob es eine kostenlose Probezeit ist, der Preis
 und die Datumsangaben und, wenn eine Mitgliedschaft endet, warum.
 Sobald du dein Konto löschst, ist sie nicht mehr mit dir verbunden.
 </li>
 <li>
 <strong>Apple- und Google-Push (nur in den Apps)</strong>, die
 iOS- und die Android-App stellen Mitteilungen über die
 Push-Dienste von Apple und Google (Firebase Cloud Messaging) zu,
 die ein Geräte-Token brauchen, um dein Telefon zu erreichen. Die
 Web-App nutzt direktes Web Push, wie unten beschrieben.
 </li>
 </ul>

 {/* Prayer features */}
 <h2 className="mt-11 scroll-mt-20 font-serif text-[21px] font-bold leading-[1.2] text-balance text-paper">
 Die Gebetsfunktionen
 </h2>
 <p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 Die Morgen- und die Abendregel, die Lektionen zum Jesusgebet und
 die Diptychen arbeiten zuerst lokal. Von Haus aus lebt jede
 Zählung, jede Abhakung, jeder Name in deinen Diptychen im{" "}
 <code>localStorage</code> deines Browsers auf diesem Gerät und
 erreicht uns nie. Im Einzelnen:
 </p>
 <ul className="mt-3 list-disc space-y-2 ps-6 font-serif text-[16.5px] leading-[1.7] text-paper/88 marker:text-paper/40">
 <li>
 <em>Erledigte Gebetsregeln</em>: die Tage, an denen du die
 Morgen- oder Abendregel beendet hast, gehalten unter{" "}
 <code className="font-mono text-ui text-paper/70">
 purify.prayers.&#123;ruleId&#125;.dates
 </code>{" "}
 (eine fortlaufende Liste über 30 Tage, keine Strähnen-Zahl).
 </li>
 <li>
 <em>Gebetsschnur-Sitzungen</em>, aufgezeichnet, bevor die
 Gebetsschnur in Version 1.6 entfernt wurde: die Knotenzahl jeder
 Sitzung und die gewählte Gebetszeile, unter{" "}
 <code className="font-mono text-ui text-paper/70">
 purify.rope.sessions
 </code>
 . Neues wird nicht aufgezeichnet.
 </li>
 <li>
 <em>Diptychen</em>: die Listen derer, für die du betest (Lebende
 und Entschlafene), unter{" "}
 <code className="font-mono text-ui text-paper/70">
 purify.intentions.living
 </code>{" "}
 und{" "}
 <code className="font-mono text-ui text-paper/70">
 purify.intentions.departed
 </code>
 . Das ist schlichtes JSON in deinem Browser; wir tun nicht so, als
 wäre es auf dem Gerät verschlüsselt.
 </li>
 <li>
 <em>Push-Erinnerungen (nur wenn du sie einschaltest)</em>: Wenn
 du in /account Gebetserinnerungen einschaltest, handelt die
 eingebaute Web-Push-Schnittstelle des Browsers mit deinem
 Push-Dienst einen Abonnement-Endpunkt aus (Google für Chrome /
 Firefox / Edge; Mozilla für Firefox unter Linux; Apple für
 Safari). Wir speichern diesen Endpunkt, die Schlüssel, die er
 zurückgab, und die zwei Uhrzeiten, die du gewählt hast, in einer
 Tabelle{" "}
 <code className="font-mono text-ui text-paper/70">
 push_subscriptions
 </code>
 . Wir senden keinen Mitteilungsinhalt über Dritte; die Nutzlast
 wird direkt von unserem Server mit unserem VAPID-Schlüssel
 signiert. Schalte es jederzeit auf derselben Seite aus.
 </li>
 </ul>
 <p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 Wenn du dich anmeldest, werden dieselben Formen in vier
 Supabase-Tabellen gespiegelt:{" "}
 <code className="font-mono text-ui text-paper/70">prayer_completions</code>,{" "}
 <code className="font-mono text-ui text-paper/70">intentions_living</code>,{" "}
 <code className="font-mono text-ui text-paper/70">intentions_departed</code>,{" "}
 <code className="font-mono text-ui text-paper/70">rope_sessions</code>, damit
 die Daten dir über Geräte hinweg folgen. Jede hat dieselbe
 Zeilensperre wie Lesezeichen und Anmerkungen (deine Zeilen sind
 nur für deine <code>auth.uid()</code> sichtbar). Sie werden nie
 mit den anonymen Analytik-Tabellen verknüpft.
 </p>

 {/* AI bots */}
 <h2 className="mt-11 scroll-mt-20 font-serif text-[21px] font-bold leading-[1.2] text-balance text-paper">
 Die KI-Crawler-Regel
 </h2>
 <p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 Dies ist eine Regel über die veröffentlichte Bibliothek, nicht
 über dich. Nichts in diesem Abschnitt betrifft dein Konto, dein
 Lesen, deine Notizen oder deine Lesezeichen; die werden niemandem
 gegeben.{" "}
 <Link
 href={websiteHref("/robots.txt")}
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >Unsere Robots-Datei</Link>{" "}
 teilt die KI-Agenten in drei Gruppen ein, und das ist die ganze
 Regel.
 </p>
 <ul className="mt-3 list-disc space-y-2 ps-6 font-serif text-[16.5px] leading-[1.7] text-paper/88 marker:text-paper/40">
 <li>
 <strong className="font-semibold text-paper">
 Die Heiligen sind offen, das Training eingeschlossen.
 </strong>{" "}
 Die Lebensbeschreibungen, die Schriften und die Zitate unter{" "}
 <code>/saints</code> sind gemeinfreie patristische Texte,
 überwiegend die Übersetzungen der Nicene and Post-Nicene
 Fathers. Wir haben sie den Trainings-Crawlern absichtlich
 geöffnet. Wir haben dieses Gut veröffentlicht, damit es sich
 verbreitet, und ein Modell, das die Väter gelesen hat,
 antwortet besser über sie. Erlaubt sind hier GPTBot,
 ClaudeBot, Claude-Web, anthropic-ai, CCBot, Google-Extended,
 Applebot-Extended, Bytespider, Amazonbot, Meta-ExternalAgent,
 cohere-ai, Diffbot, FacebookBot, Timpi, PanguBot und Scrapy,
 und sonst nirgends auf der Seite.
 </li>
 <li>
 <strong className="font-semibold text-paper">
 Der übrige Bestand ist offen für KI-Suche und für Assistenten,
 die ein Leser geschickt hat.
 </strong>{" "}
 Gebete, Konzilien, Geschichte, der Kalender und unsere eigenen
 Seiten dürfen von den Crawlern gelesen werden, die eine Quelle
 nennen und auf sie zurückverweisen, OAI-SearchBot,
 PerplexityBot, DuckAssistBot und YouBot, sowie von den
 Abrufern, die nur laufen, weil ein Mensch einen unserer Links
 in einen Assistenten eingefügt hat, ChatGPT-User, Claude-User,
 Perplexity-User und MistralAI-User. Diese bauen keine
 Trainings-Korpora. Sie zu sperren hieß nur, dass ein Leser, der
 einen Assistenten nach einer Purify-Seite fragte, statt der
 Seite einen Fehler bekam.
 </li>
 <li>
 <strong className="font-semibold text-paper">
 Die Schrift ist für alle gesperrt.
 </strong>{" "}
 Die Verleger der lizenzierten Schrift verlangen, dass ihr Text
 nicht in Sprachmodelle eingespeist wird. Darum ist jeder oben
 genannte Agent, aus beiden Gruppen, von <code>/bible</code>{" "}
 ausgeschlossen. Das ist eine Lizenzpflicht ohne Ausnahme und
 seit unserer ersten Robots-Datei unverändert.
 </li>
 </ul>
 <p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 Wenn ein Modell einen Vater von diesen Seiten zitiert, gebührt
 die Nennung dem Heiligen und der gemeinfreien Übersetzung. Purify
 schreibt niemals patristischen Text und schreibt ihn niemals um;
 was also klingt, als käme es von einem Vater, kommt von ihm. Eine
 knappe Fassung dieser Regel für maschinelle Leser halten wir
 unter{" "}
 <Link
 href={websiteHref("/llms.txt")}
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >/llms.txt</Link> bereit, und wir ordnen neu entdeckte Agenten
 weiterhin der jeweils passenden Gruppe zu.
 </p>

 {/* Browser storage */}
 <h2 className="mt-11 scroll-mt-20 font-serif text-[21px] font-bold leading-[1.2] text-balance text-paper">
 Was in deinem Browser liegt
 </h2>
 <p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 Wenn du nicht angemeldet bist, werden deine Lese-Einstellungen
 (Schrift, Größe, Übersetzungswahl), deine Lesezeichen und alle
 Strähnen-Zähler im <code>localStorage</code> deines Browsers auf
 diesem Gerät gehalten. Sie verlassen es nie. Lösche deine
 Seitendaten, und sie setzen sich zurück; wir haben keine Kopie.
 </p>

 {/* Changes */}
 <h2 className="mt-11 scroll-mt-20 font-serif text-[21px] font-bold leading-[1.2] text-balance text-paper">
 Änderungen an dieser Seite
 </h2>
 <p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 Wenn wir ändern, was aufgezeichnet wird, oder einen Dritten
 hinzufügen, der deinen Verkehr sieht, wird diese Seite zuerst
 aktualisiert und die Änderung im nächsten{" "}
 <Link
 href="/whats-new"
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 /whats-new
 </Link>
 -Brief aufgeführt. Wir ändern die Haltung nicht im Stillen.
 </p>
 {/* Call 32, his yes of 2026-11-11, in German. Held by lib/admin/__tests__/privacyLines.test.ts. */}
 <p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 Mit 1.9:
 </p>
 <ul className="mt-3 list-disc space-y-2 ps-6 font-serif text-[16.5px] leading-[1.7] text-paper/88 marker:text-paper/40">
 <li>
 Buy Me a Coffee wird nicht mehr genannt: die Seite &bdquo;Dieses
 Werk unterstützen&ldquo; bittet um keine Spende.
 </li>
 <li>
 Deine Antworten über deinen Glauben werden nicht mehr mit deinem
 Konto bewahrt, und die vor 1.9 bewahrten Kopien werden gelöscht.
 </li>
 <li>
 Die vor 1.9 geschriebenen Gebetsbitten, die seit 1.9 niemand mehr
 gesehen hat, werden gelöscht, mit ihrem Wortlaut, den Aufzeichnungen
 der Moderatoren über diesen Wortlaut und den Angaben, wer für sie
 gebetet hat.
 </li>
 </ul>

 {/* Offline cache */}
 <h2 className="mt-11 scroll-mt-20 font-serif text-[21px] font-bold leading-[1.2] text-balance text-paper">
 Offline-Zwischenspeicher (der Service-Worker)
 </h2>
 <p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 Wenn du Purify auf deinen Startbildschirm legst, speichert ein
 kleiner Service-Worker (
 <code className="font-mono text-ui text-paper/70">/sw.js</code>
 ) die bereits besuchten Seiten und Anlagen zwischen, damit die
 App bei schlechtem Signal weiterläuft. Die Zwischenspeicher heißen{" "}
 <code className="font-mono text-ui text-paper/70">purify-v*-html</code>,{" "}
 <code className="font-mono text-ui text-paper/70">purify-v*-static</code>{" "}
 und{" "}
 <code className="font-mono text-ui text-paper/70">purify-v*-assets</code>.
 Sie speichern nur öffentliches, gemeinfreies Seiten-HTML, die
 Next.js-Bauausgabe, Schriften, Heiligen-Ikonen und das Manifest.
 Authentifizierte API-Aufrufe (Supabase, unser Analytik-Endpunkt,
 die lizenzierte Übersetzungs-API) werden nie abgefangen und nie
 zwischengespeichert, damit deine Sitzung im Netz bleibt, wo sie
 hingehört.
 </p>
 <p className="mt-3.5 font-serif text-[16.5px] leading-[1.7] text-paper/88">
 Um den Zwischenspeicher zu leeren, deinstalliere die
 Startbildschirm-App, oder lösche in deinen Browser-Einstellungen
 die Seitendaten für die Purify-Herkunft. Wir können auch die
 Cache-Version bei einer Veröffentlichung erhöhen, was die alten
 Zwischenspeicher beim nächsten Öffnen der App automatisch
 räumt.
 </p>

 {/* Closing */}
 <div className="mt-12 border-t border-paper/8 pt-6">
 <p className="font-serif text-[16.5px] leading-[1.7] text-paper/75">
 Fragen, Korrekturen oder ein Datenschutz-Anliegen? Schreib an{" "}
 <a
 href={`mailto:${LEGAL_EMAIL}`}
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 {LEGAL_EMAIL}
 </a>
 , und wir melden uns bei dir.
 </p>
 </div>
 </div>
    </>
  );
}
