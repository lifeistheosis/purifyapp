import { ChangelogControls } from "@/components/whats-new/ChangelogControls";

export const metadata = {
  title: "What's new",
  description:
    "Patch notes and a message from the Purify team about what the site offers today and what's coming next.",
};

const SECTION = "px-5 md:px-8 py-16 md:py-24";

type Entry = {
  version: string;
  kind: string;
  date: string; // human-readable, used as the group key
  blurb: string;
  items: string[];
};

// Newest first. Grouped by `date` (string equality).
const ENTRIES: Entry[] = [
  {
    version: "v3.8",
    kind: "Cleaner Koine ↔ English",
    date: "May 19, 2026",
    blurb:
      "When you hover a Greek word, the matching English word now lights up reliably across the whole New Testament. The kaiserlik/kjv public-domain source we use for the English Strong's tags has gaps on the trailing word of many verses (Matthew 1:1's 'Abraham.' was the canonical case the user surfaced — Ἀβραάμ in the Greek column was not lighting up the English 'Abraham' in v1, even though it worked perfectly in v2 and v17). v3.8 ships a recovery pass that back-fills the missing tags using already-tagged occurrences of the same word elsewhere in the chapter. 2,629 trailing-word Strong's numbers recovered.",
    items: [
      "New scripts/patch-english-strongs.mjs walks every NT chapter, builds a per-chapter map of normalized-word → Strong's from already-tagged tokens, and back-fills any untagged token whose normalized form has an unambiguous Strong's in the same chapter (one Strong's, or one Strong's accounting for ≥ 90% of ≥ 3 observations).",
      "Conservative recovery: a stopword list of about 80 English connectors ('of', 'the', 'and', 'to', 'in', 'for', 'is', 'was', 'his', 'her', and the rest) is skipped — these recur with too many different Strong's numbers (each translating a different Greek genitive or article) to disambiguate from surface form alone. Proper nouns and content words are the primary targets, where the recovery is high-confidence.",
      "NT-wide second pass: for capitalized untagged tokens whose chapter map is too thin (short books like 2 John, Philemon, Jude), an aggregated NT-wide map is consulted. Catches proper nouns that only appear once in their home chapter.",
      "Matthew 1:1: trailing 'Abraham.' now tags G11. Hover Ἀβραάμ in the Greek column and the English Abraham lights up. The same fix lands across the New Testament — Babylon: in Matt 1:11, Aram; in Matt 1:3, wife: in Matt 1:24, God, at the close of several Romans 1 verses, and many more.",
      "Patch results: 2,629 tokens recovered across 259 NT chapters. Matthew +434, Luke +399, Acts +403, John +363, Mark +238, Romans +194, Revelation +187. Books that were already clean (Philippians, 1 Thessalonians, the Timothies, the Petrines, the Johannines) were left untouched.",
      "fetch-tagged-kjv.mjs runs the recovery automatically at the end of every fresh fetch, and its sanity check now fails the build if any chapter has more than 15% untagged content tokens after recovery. The existing artifact-scrubber (no <em>, no stray G####] fragments) is unchanged.",
      "Footer version stamp + home chip + whats-new chip all step to v3.8.",
    ],
  },
  {
    version: "v3.7",
    kind: "Mobile Bible reader — highlight fix and commentary popup",
    date: "May 19, 2026",
    blurb:
      "Two real mobile problems in the Bible reader, fixed. (1) The verse highlight system used to fire on every tap — tap a word and scroll, and that word got highlighted. The gesture is now long-press to enter select-mode (with a subtle haptic and a faint gold halo on the verse), then drag to extend the range, lift to commit. A pure tap, or a tap that turns into a scroll, is a no-op. (2) On mobile, patristic commentary used to be a collapsed `<details>` block at the bottom of the chapter — hard to tie to a specific verse. The verse-number badge for any verse with commentary now opens a bottom sheet showing exactly that verse's Father notes, with a backdrop tap or Escape to dismiss. Desktop's sticky right rail is untouched.",
    items: [
      "VerseRow: rewrote the touch-selection gesture as long-press-to-select. Tap is a no-op. ~400ms press with <8px movement enters select-mode (haptic vibration, gold inset glow on the verse). Touchmove after select-mode extends the range. Touchend commits. A scroll-leaning motion (>8px Y or >16px X before select-mode) cancels the pending press. `touch-action: pan-y` on the verse paragraph hands vertical scroll back to the browser.",
      "Fixes the bug where a tap on a verse word would silently highlight that word as soon as the user lifted or scrolled.",
      "New MobileCommentarySheet component: bottom-sheet UI with backdrop, grab handle, scroll-locked body, Escape-to-close, and a stack of commentary cards (saint icon, author, work, full text) for the tapped verse.",
      "ChapterReader owns the sheet's open-verse state and renders the sheet beside the verse list. The verse-number glyph next to verses with commentary is now a `<button>` on mobile (`lg:hidden`) that calls `onOpenCommentary`; the old `<a href=\"#rail-vN\">` anchor stays for desktop (`lg:` and up).",
      "Chapter page: removed the bottom `<details>` block that listed all commentary in one collapsed lump on mobile. The new sheet replaces it.",
      "AppNav: in-app hamburger button bumped from 40×40 to 44×44 for parity with the marketing Navbar and the WCAG 2.5.5 enhanced target.",
      "Desktop highlight + commentary behaviour unchanged: mousedown-drag-mouseup still selects words, and the sticky right-rail StudyRail still shows the chapter's commentary on `lg:` and above.",
    ],
  },
  {
    version: "v3.6",
    kind: "Icon-corner polish — monochrome cross, hero declutter, donate links",
    date: "May 19, 2026",
    blurb:
      "A small follow-up patch on top of v3.5. The home Icon Corner card drops its gold frame and candle-glow in favour of a pure black-and-white card with a proper three-bar Orthodox cross (gradient-filled beams with a soft drop-shadow), not a stick drawing. The home hero loses its Paschal greeting line and the Daily Wisdom strip — the page reads quieter. The Nahum 1:7 citation in the white Scripture break is now a real link into /bible/nahum/1#v7. Pricing is removed from the in-app secondary nav; Support takes its place. The Support page adds Cash App ($venkeshi) and PayPal (paypal.me/edgaraugustin) and drops the Monthly supporter and Direct (zero-fee) cards.",
    items: [
      "IconCornerCard rebuilt in pure black-and-white: no gold border, no gold inner frame, no candle-glow. Background is a flat dark gradient; the centerpiece is a filled three-bar Orthodox cross with a vertical white→light-gray gradient, soft drop-shadow, and a faint white halo behind it. Saint name demoted to a small italic caption.",
      "Home hero: removed the Paschal greeting line (\"Christ is risen! Truly He is risen!\") and the Daily Wisdom strip below the hero. Cleaner page rhythm.",
      "Nahum 1:7 citation in the white Scripture break is now a link to /bible/nahum/1#v7.",
      "AppNav (in-app secondary nav): Pricing replaced by Support. The /pricing route still exists but is no longer reachable from nav surfaces.",
      "/support donation paths: added Cash App ($venkeshi → cash.app/$venkeshi) and PayPal (paypal.me/edgaraugustin). Removed Monthly supporter and Direct (zero-fee) cards. Cards now: Cash App, PayPal, Buy Me a Coffee.",
    ],
  },
  {
    version: "v3.5",
    kind: "Prayer section — whole new revision with Byzantine icons",
    date: "May 19, 2026",
    blurb:
      "The /prayers hub is rebuilt from the ground up around traditional Byzantine icons. Eight icons sourced from Wikimedia Commons — all public domain, mostly 12th-15th century — give every section of the page a real visual anchor. The hero now opens with the Sinai Christ Pantocrator (6th c.) as a backdrop and a display-serif 'Pray without ceasing.' over it. The Morning Rule card carries an Anastasis icon; the Evening Rule, the Vladimir Theotokos. The Jesus Prayer becomes a contemplative panel with the Pantocrator at the top and the prayer set as a three-line chant. The four Liturgical Hours each get their themed icon: Christ Enthroned for the First, Pentecost for the Third, the Sinai Crucifixion for the Sixth, the Entombment for the Ninth. Akathists is anchored by the Theotokos; Learn to Pray by the Three Hierarchs. /prayers/today picks up the same vocabulary on its rule cards. The page reads as a prayer hub, not a dashboard.",
    items: [
      "Nine icon slots, eight unique JPGs at public/icons/prayer/: christ-pantocrator (Sinai 6c), anastasis (1500s Russian), theotokos-of-vladimir (12c Constantinople), christ-enthroned (13c Tretyakov), pentecost (1420s Sergiev Posad), crucifixion (Sinai 12c), entombment (15c Tretyakov), three-hierarchs (Novgorod pre-1917). All public domain or PD-Art, resized to max 800px long-side with sharp + mozjpeg, 30-145 KB each.",
      "New lib/prayers/icons.ts registry — slug → title, alt, src, source attribution. Server-safe.",
      "New components/prayers/PrayerIcon.tsx — same Orthodox-frame chrome as SaintIcon (gold inner frame, warm-brown outer border), sized for thumbnail / section anchor / centerpiece / full-bleed hero. Progressive JPEG fade-in.",
      "/prayers hero: full-width section with Christ Pantocrator photo behind a top-to-bottom dark gradient. Display-serif 'Pray without ceasing.' headline + 1 Thess 5:17 attribution. The day strip (date · saint · fast · Pascha) sits at the bottom of the hero like a candle in front of the icon.",
      "/prayers body organised into named chapters with eyebrow + display-serif h2 headers: Today, The Daily Rules, The Prayer of the Heart, The Hours, The Akathists, Learn to Pray. Vertical rhythm is space-y-20 between chapters — the page reads top-to-bottom as a real prayer book hub.",
      "Daily Rules: side-by-side cards where the icon (Anastasis for morning, Vladimir Theotokos for evening) sits as a vertical anchor next to the prayer summary, duration, and CTA. Card height matches the icon so it reads as a panel-with-icon.",
      "The Jesus Prayer: centered contemplative panel with the Pantocrator at the top, the prayer text rendered as a three-line chant in display serif at 22-26px, italic line about praying in the breath, and a 'Learn how to pray it →' link. No counter, no goal presets.",
      "The Hours: 4-card grid with a 72×96 icon at the top of each card, the hour name, the time (6am / 9am / Noon / 3pm), and the theme. Coming-soon eyebrow on the section header.",
      "Akathists: wide card with the Vladimir Theotokos icon left and a 'notify me' mailto right. Honest placeholder language.",
      "Learn to Pray: accent-bordered card with the Three Hierarchs icon left and copy that frames the saints as the patrons of theology and prayer.",
      "/prayers/today carries the same icon vocabulary onto the daily-prayer page: Anastasis icon on the Morning rule card, Vladimir Theotokos on the Evening rule card. The same set of components, the same visual register.",
      "Footer version stamp + home chip + whats-new chip all step to v3.5.",
    ],
  },
  {
    version: "v3.4",
    kind: "Big patch — prayer reset, Bible chrome, live funding, Discord",
    date: "May 18, 2026",
    blurb:
      "A chunky release across the site. The Jesus Prayer counter retires; the bead-counting page goes and the home/today references repoint to the learning lesson that teaches the prayer itself. The /prayers hub is rebuilt as a real daily-prayer home with a date+saint+fast strip at the top, bigger Morning/Evening rule cards, an honest Akathists placeholder, and a Hours preview. The Bible reader chrome consolidates: Interlinear sits next to the font controls on one row, search gets the full width below, and a new sticky chapter header keeps you oriented as you scroll. The end-of-chapter pager grows into a real 'continue reading' tile. The /support funding counter now pulls live totals from Buy Me a Coffee's Developer API and falls back gracefully to the static number if the token is missing. The buymeacoffee.com/purify link moves to buymeacoffee.com/purifyapp. A Discord server is wired in — footer column, footer community strip, About page section, and a community card on /support. The home Icon Corner card is rebuilt: photo-anchored when the day's saint has an icon, clean typographic when it doesn't — no more '+' placeholder over a wood gradient.",
    items: [
      "Jesus Prayer counter retired: /prayers/jesus-prayer page, JesusPrayerCounter, and JesusPrayerTodayBadge are gone. The Today page now shows a quiet card with the prayer text and a 'Learn how →' link to /prayers/learning/jesus-prayer. The home category pill and the home challenge card both repoint to the learning lesson. Streak counters on Morning + Evening rules stay (those count rule completions, not beads).",
      "/prayers/jesus-prayer → /prayers/learning/jesus-prayer 308 redirect in next.config.ts so old bookmarks land on the lesson.",
      "/prayers hub redesigned: a date+saint+fast strip card under the hero, the existing gold Today CTA below it, two larger Morning/Evening rule cards that summarise their contents, an Akathists placeholder card with an honest 'notify me' mailto, the Learn-to-Pray accent card, a 4-card Hours preview (First/Third/Sixth/Ninth) with their traditional themes, and a soft sign-in nudge at the foot.",
      "Bible reader chrome: Translation + Book on the left of row one, Font-Size + Font-Family + Interlinear clustered on the right of the same row, BibleSearch full-width on row two. Less visual noise, faster scan.",
      "New ChapterStickyHeader: a thin bar fixes below the navbar once you scroll past the chapter title, showing 'Matthew 3 · v 7 of 17'. The verse number updates via IntersectionObserver so the orientation is always live. Replaces the mobile context strip in ReadingProgressBar.",
      "Chapter h1 shrinks from 44–56px to 36–44px so the verses get more room above the fold.",
      "End-of-chapter pager: the next chapter becomes a big tile-style 'Continue reading' card with the next book/chapter heading and a serif title. Previous chapter is a smaller back-link below. Cross-book navigation lives in a small footer row.",
      "/support funding counter pulls live totals from the Buy Me a Coffee Developer API. New lib/support/buymeacoffee.ts fetches current-month one-time supporters + active subscription monthly value and caches for five minutes via Next.js fetch revalidate. /api/support/bmc proxies the same data for curl/debug. Falls back to the static SUPPORT.monthlyRaisedUsd when BMC_ACCESS_TOKEN isn't set, so the page never breaks.",
      "Buy Me a Coffee URL: buymeacoffee.com/purify → buymeacoffee.com/purifyapp.",
      "/support gains an 'Or join the community' Discord card in Discord-purple (#5865F2) alongside the donate links.",
      "Discord across the site: Footer 'About this work' column gains a Discord link with an ↗ external glyph; a community strip above the copyright invites Discord directly; About page picks up a Community section between 'Who is behind this' and 'Money'.",
      "Home Icon Corner card rebuilt. Two render modes: (1) when today's saint has an iconUrl the JPG fills the upper portion of the card as a real background with a dark gradient overlay, like a real icon corner with the icon present; (2) when no icon is indexed, a clean typographic stack — date, saint name, fast pill, Pascha countdown, CTA — with no '+' placeholder and no decorative gold. The old wood gradient + candle-glow are gone.",
      "Footer version stamp + home chip + whats-new chip all step to v3.4.",
      "About page bullet 'Not an account product' wording stays from v3.3; copy elsewhere drops 'Jesus Prayer counter' from descriptions and the about-bullet.",
    ],
  },
  {
    version: "v3.3",
    kind: "Accounts, saved, and highlighted writings",
    date: "May 18, 2026",
    blurb:
      "Three things you've asked for land together. You can highlight a paragraph from a saint's writing the same way you highlight a verse, with the same gold left-bar, the same inline note editor, the same right-click menu of copies and quotes. You can bookmark a verse, a chapter, or a writing section; everything you save lives at /saved. And there is now a real account, optional, signed-in with a one-tap email link, that lets your highlights, notes, and bookmarks follow you across devices. Without an account, every Purify entry still lives only in your browser; with an account, the same things sync to a private row no one but you can read. The 'no account required' line on the home page goes away; the privacy promise stays in a sharper form on the FAQ.",
    items: [
      "Saint writing paragraphs are now interactive. Hover any paragraph in a /saints/.../<work> page; the same toolbar you see on Bible verses appears: ✦ highlight, 🔗 copy link, ✎ note. Right-click for Copy paragraph, Copy as quote, Copy reference, Copy link, plus highlight, note, and Bookmark this section.",
      "A new gold ★ on each writing-section heading toggles a section bookmark. Right-click on a paragraph also offers the same item for power users.",
      "Bible verses get a ★ bookmark button in the verse toolbar and a Bookmark verse / Remove bookmark item in the right-click menu.",
      "New /saved page lists every bookmark — verses, chapters, and saint writing sections — grouped by kind, newest first. Tap a row to open it. Remove with the × button. Empty state explains the gestures.",
      "Footer gets a 'Your saved' link and a 'Your account' link in the About-this-work column. The v3.1 version stamp at the bottom of the footer is now v3.3.",
      "Magic-link sign-in lands at /account. Type your email, get a one-tap link in your inbox, you're signed in for 30 days. No password to make, no password to forget, no OAuth dependency. Same flow whether it's your first time or your hundredth.",
      "Signed-in /account is a real page. Hero with display name (editable inline), email, member-since. Four-stat grid (verses highlighted, paragraphs highlighted, notes written, bookmarks saved) that updates live as you read. Settings for reader font and size. Export your data to JSON. Import a previous export. Manual Sync now. Sign out. Clear local data. Delete account (cascades every server row).",
      "Background sync glue mounted in the (app) layout: while signed in, every bookmark or annotation change pushes to Supabase within 500ms (debounced). On every load of an /(app) page, the device pulls server state down. Best-effort end-to-end; local storage stays the source of truth on-device, so a Supabase outage never breaks the UI.",
      "Three Supabase tables wired with row-level security so you only ever read your own rows: profiles (display name, joined-at), bookmarks (kind, locator, label), annotations (kind, locator, highlighted, highlighted-words, note). The on-delete cascade from auth.users wipes everything when you delete the account.",
      "Home hero copy: 'Free. No tracking. No account required.' becomes 'Free. No tracking. Yours to keep.' The v3.1 changelog chip becomes v3.3 chip pointing at /whats-new.",
      "About page 'Not an account product' bullet rewrites to acknowledge accounts are now optional and the privacy stance behind them. MadeOfStrip's sixth tile reads 'No tracking. No advertising. Optional account.'",
      "FAQ Q10 ('Will there be akathists, audio, accounts...?') rewrites to confirm accounts shipped and how they work. Q11 ('Do you collect any of my data?') splits into a Without-an-account paragraph (localStorage, no copy) and a With-an-account paragraph (Supabase, RLS, you can delete it all).",
    ],
  },
  {
    version: "v3.2",
    kind: "Title hygiene + canonical routing + new-saint icons",
    date: "May 18, 2026",
    blurb:
      "A polish sweep across what shows up in browser tabs, search results, and social-share cards. The 'FAQ - Purify | Purify' double-suffix that the title template was producing on every page gets fixed. Two guessable URLs — /prayer and /scripture — that used to 404 now redirect to /prayers and /bible. Real icons land for the three new saints from v2.5 (Apostle Paul, Mary of Egypt, Nicholas the Wonderworker) whose iconUrl pointed to JPGs that didn't exist yet. Plus the Greek interlinear's alignment fix so hovering a Greek word lights the right English phrase, the Bible reader gets a custom right-click menu (copy verse, copy as quote, copy reference, copy link, highlight, note, bookmark, open commentary), and the search bar now accepts verse ranges like James 2:14-26 with arrival-time highlighting of the whole span. The saint writing reader gains a clearer separation between editorial framing and the saint's own words for the v2.5 entries that mixed the two.",
    items: [
      "Strip the redundant ' - Purify' suffix from every per-page metadata.title so the root layout's '%s | Purify' template stops producing 'FAQ - Purify | Purify' on 22 routes.",
      "Backfill descriptions on eight placeholder/stub pages (account, campaigns, marketplace + 3 sub-pages, pricing, prayers/personal) so social shares stop falling back to the generic root description.",
      "Add 308 permanent redirects: /prayer → /prayers and /scripture → /bible. Anyone guessing the singular form lands on the right page.",
      "Real public-domain icons for the three v2.5 saints whose JPGs were missing: Andrei Rublev's Saint Paul (1407), a 19th-century Russian Mary of Egypt, and a 14th-century Yaroslavl St. Nicholas. All resized to the existing 800px / quality-82 / mozjpeg pattern.",
      "Interlinear alignment bug: hovering the 2nd Greek υἱοῦ used to light the wrong 'son' because the English token occurrence counter was counting filler words ('the', 'of') as separate occurrences of the same Strong's number. Now consecutive tokens that share a Strong's are one span sharing one occurrence index, so the Nth Greek word always maps to the Nth English phrase, not the Nth English token.",
      "Right-click any Bible verse for a custom context menu: Copy verse, Copy as quote, Copy reference, Copy link, Highlight, Add note, Bookmark verse, Open commentary. Native menu is preserved when you have text selected so 'Copy' on a selection still works.",
      "Bible search accepts verse ranges: 'James 2:14-26' parses, the dropdown shows the range with verse count, the URL becomes /bible/james/2#v14-26, and on arrival the whole 14..26 span pulses gold for 1.6 seconds.",
      "Multi-word Greek-hover highlights now bridge the inter-word space, so hovering Βίβλος lights 'The book' as one continuous gold pill instead of two separated chips.",
      "Saint writing reader gains optional framing (editor's intro shown above the text with an 'Editor's note' eyebrow) and citation (source attribution gold eyebrow over the paragraphs). Used by Paul's letter-from-the-prison sections (KJV verses), Nicholas's troparion, and Mary of Egypt's life (where the paragraphs are a retelling — framing acknowledges it, no citation is set).",
      "SaintIcon renders the gold-frame + halo + initials as an instant CSS placeholder underneath the JPG so the hero icon stops appearing to load piece-by-piece into empty space. SaintHero passes priority for fetchpriority=high.",
    ],
  },
  {
    version: "v3.1",
    kind: "The icon corner on the home page",
    date: "May 17, 2026",
    blurb:
      "The home page stops being a brochure and starts behaving like an icon corner. The right column of the hero now shows the saint of the day, the fast, and the days remaining until Pascha, live. A liturgical greeting at the top changes with the season ('Christ is risen!', 'Open to me the doors of repentance', etc.). A Daily Wisdom strip alternates between a Scripture verse and a Father's saying. A season banner auto-surfaces during Great Lent, Holy Week, Bright Week, Pre-Lent, and the Apostles', Dormition, and Nativity fasts. The three home challenge cards finally go to real product. New About, FAQ, and Support pages. A deeper footer with Orthodox section names. And Today is the first item in the primary nav.",
    items: [
      "Home hero right column replaced with an Icon Corner card: today's saint icon, the date, the fast, the Pascha countdown, link straight into /prayers/today.",
      "Liturgical greeting at the top of the home page changes with the season: Christ is risen! during the Pentecostarion, Christ is born! during the Twelve Days, Open to me the doors of repentance during Great Lent, Behold the Bridegroom comes during Holy Week, Glory to Jesus Christ otherwise.",
      "Daily Wisdom strip below the hero: alternating Scripture verses (even days, 30 entries) and sayings of the Fathers (odd days, 30 entries), rotated by day-of-year, citation links to the source.",
      "Liturgical-season banner auto-appears during Great Lent (with the Sunday-of-Lent sub-theme), Holy Week (Bridegroom Monday through Holy Saturday by day), Bright Week (Bright Monday through Thomas Sunday), Pre-Lent (Publican and Pharisee, Prodigal Son, Last Judgment, Forgiveness), and the Apostles', Dormition, and Nativity fasts with days-until counters. Hidden in ordinary time.",
      "What we are made of strip: six Orthodox-anchored honest claims (Septuagint, Nestle 1904, Schaff Fathers, common Orthodox prayer book wording, both calendar reckonings, no tracking, no accounts). Replaces the generic-trust gap.",
      "Three home challenge cards now go to real product: Great Lent with the Fathers to /calendar, Learn the Jesus Prayer to /prayers/jesus-prayer, A child's first prayers to /prayers/learning. The dead Join Challenge modal is gone; CTA is now Begin.",
      "New /about page: what the site is, what it's made of, what it isn't, who is behind it, the privacy promise, the money note. Closes with a line from St. Seraphim.",
      "New /faq page: twelve Orthodox-specific questions and answers, collapsible. Jurisdiction, calendar, Bible translations, fasting rule discrepancies, where the Russian saints are, roadmap, privacy.",
      "New /support page: live monthly funding goal with a progress bar, transparent expense breakdown by line, three donation paths, and an honest note about a future supporter tier (everything that ships free stays free).",
      "Footer rebuilt with Orthodox section names: The Bible / The Saints / The Calendar / The Prayer / About this work. Glory to God for all things at the bottom.",
      "Primary nav: Today is now the first item, linking to /prayers/today. Marketplace dropped from primary nav. Pricing replaced with Support in secondary nav.",
      "Hero copy refined for inquirers: now reads 'A quiet place to begin and end the day' with the Orthodox-prayer-companion framing.",
    ],
  },
  {
    version: "v3.0",
    kind: "Daily prayer",
    date: "May 17, 2026",
    blurb:
      "Daily prayer lands. /prayers/today gathers the date, the saint, the fast, and the readings into one screen; the morning and evening rules read as proper prayer-by-prayer rules with a progress strip and a streak counter; the Jesus Prayer gets its own counter with an optional breath cue. Plus the foundation work the site has been missing: custom 404, error boundary, loading skeleton, sitemap, robots, an Open Graph image, an Old Calendar toggle, and a sweep of small fits and finishes.",
    items: [
      "/prayers/today gathers the date, the saint, the fast, today's Gospel and Epistle teasers, and one-tap links into morning rule, evening rule, and the Jesus Prayer.",
      "/prayers/morning and /prayers/evening: the full Orthodox rules split into individual prayers with check-off boxes, a progress strip, and a per-rule streak counter saved to the device.",
      "/prayers/jesus-prayer: guided counter with goal presets (33, 50, 100, 150, 300), optional breath-cue pulse, today total, and a day-streak when you pray at least 33 in a calendar day.",
      "Calendar now has an Old (Julian) Calendar toggle, used by the Russian, Serbian, Jerusalem, and Athonite traditions. Defaults to New (Revised Julian).",
      "Custom 404 page, error boundary, and Bible-chapter loading skeleton replace the generic Next defaults.",
      "Sitemap and robots ship so the site is properly indexable.",
      "Open Graph image generated at the edge, so link previews on Slack, Discord, and X now show the gold Purify card.",
      "Font display set to swap on every face (DM Sans, DM Serif Display, Lora, Cardo) so text appears immediately instead of blocking.",
      "Home page category pills now link to real routes (Morning prayers, Psalter, Jesus Prayer, etc.) instead of dead anchors.",
      "Saint cards on /saints show the count of works available alongside the feast day.",
      "Root metadata expanded: Open Graph, Twitter card, canonical, application name, color scheme.",
    ],
  },
  {
    version: "v2.5",
    kind: "Massive content patch",
    date: "May 17, 2026",
    blurb:
      "Three new saints, six new book introductions, ten new patristic commentary cards across Matthew and Acts, and a fresh batch of icon mappings. The biggest single content drop since v1.0.",
    items: [
      "Three new saints land in the registry: Holy Apostle Paul (with a selection of his final letters from prison), St. Mary of Egypt (with selections from the Life by St. Sophronius of Jerusalem), and St. Nicholas the Wonderworker of Myra (with the Three Bags of Gold and the troparion sung at his Liturgy).",
      "Six new book introductions: 1 Corinthians, Galatians, Hebrews, James, 1 John, and the Wisdom of Solomon. Each frames the book within its Orthodox liturgical use and the patristic readers who interpret it.",
      "Matthew commentary expands across four new chapters: the Beatitudes (Chrysostom and Gregory of Nyssa on poverty of spirit), the Lord's Prayer (Cyprian and Gregory of Nyssa), 'seek first the Kingdom' (Maximus the Confessor), the Pearl of Great Price (Chrysostom and Gregory the Theologian on Baptism), and the Last Judgment 'least of these' (Chrysostom and Gregory the Theologian on the poor).",
      "Acts commentary expands with five new entries: the four marks of the apostolic community (Chrysostom on Acts 2:42), the all-things-in-common verse (Chrysostom and Basil on 4:32), 'Saul, Saul' on the Damascus road (Augustine and Chrysostom on 9:4), 'in Him we live and move and have our being' (Chrysostom and Maximus on 17:28), and the agraphon 'more blessed to give than to receive' (Chrysostom and Basil on 20:35).",
      "Icon mappings extended for the new saints plus aliases for several Fathers cited in commentary cards (Cyprian of Carthage, Gregory of Nyssa, Jerome).",
      "All new content is original summary prose written for Purify. Brief representative phrases are drawn from genuinely public-domain Schaff and Ante-Nicene Fathers translations (1885-1900) or the King James Version (1611).",
    ],
  },
  {
    version: "v2.4",
    kind: "Saints, faces and full text",
    date: "May 16, 2026",
    blurb:
      "Saint icons render correctly in patristic commentary (path bug fixed plus five more saints mapped), Chrysostom's icon now shows his face not his body, Augustine's Confessions Book I lands complete, and long works get a table of contents with section deep-links.",
    items: [
      "Fixed: every patristic commentary author now renders with their real icon. A path-prefix bug had been silently 404ing every /icons/saints/* URL since v1.1; the actual files live at /saints/icons/*. Same patch maps the five saints that had no icon entry (John of Damascus, Ignatius, Maximus, Symeon, Seraphim) and adds the short-form 'St. Basil' / 'St. Cyril' aliases.",
      "Fixed: St. John Chrysostom's icon was cropping to his lower body because the JPG is a tall full-body portrait. All saint icons now use object-top so the face stays in frame.",
      "Augustine of Hippo gets his Confessions, Book I complete (Pusey translation, public domain via Project Gutenberg ebook #3296). The first interior autobiography in Christian literature, ten reflective sections from his infancy and earliest boyhood.",
      "Long works now ship with a Contents disclosure listing every section with a deep-link. URLs like /saints/augustine-of-hippo/confessions#s7 open the work and scroll to the seventh section. Short works (under four sections) hide the disclosure.",
      "More full signature works ship in v2.5: Athanasius On the Incarnation (full 57 sections), Chrysostom On the Priesthood (six books), Basil On the Holy Spirit, Ignatius Seven Epistles, Irenaeus Against Heresies Book I.",
    ],
  },
  {
    version: "v2.3",
    kind: "Less scroll, better picker",
    date: "May 16, 2026",
    blurb:
      "Patch notes group by date and collapse, the chapter intro tucks behind a disclosure, the patristic commentary scrollbar finally matches the design, and /bible gets a 'Start here' strip plus richer book cards.",
    items: [
      "Patch notes group by date and collapse. Older releases are one click away instead of one long scroll.",
      "'About this book' on chapter 1 of every book is now a closed disclosure. Tap to expand when you want the context; otherwise the verses lead.",
      "Patristic commentary side rail gets a thin paper-colored scrollbar that matches the rest of the chrome.",
      "/bible book picker redesigned. Each book card now shows its chapter count and carries a subtle category color, and a new 'Start here' strip leads with six common entry points (John, Psalms, Genesis, Matthew, Romans, 1 Cor 13).",
      "Hero on /bible trimmed down and the dead quick-nav row removed.",
      "Search hint line under the Bible search box: 'Try: John 3:16, 1 Cor 13, Psalm 23'.",
    ],
  },
  {
    version: "v2.2",
    kind: "Bible reader polish",
    date: "May 16, 2026",
    blurb:
      "Eight quiet improvements so the Bible reads well on a phone: reading progress, a chapter quick-jump strip, copy-verse-link, a floating next-chapter button, and a consolidated reader settings menu.",
    items: [
      "Reading progress bar at the top of every chapter, with a mobile-only context strip showing where you are ('John 3, v12 of 35').",
      "Mobile chapter quick-jump strip below the chrome, a horizontal row of chapter pills so you can hop chapters without the desktop sidebar.",
      "Per-verse copy-link button in the verse toolbar. One tap copies a deep link to the clipboard for sharing.",
      "Floating Next chapter button on mobile, appearing once you have read past the halfway mark. Hidden on the last chapter of Revelation.",
      "Reader font size, font family, and interlinear toggle now consolidate into a single Reader menu on mobile. Translation and book switchers stay inline.",
      "Keyboard shortcuts hint at the bottom of desktop chapters so the arrow-key chapter nav, drag-to-highlight, and save-with-Cmd+Enter are not invisible.",
      "Greek word popover sizes itself to the viewport on narrow screens, no more 300px popover overflowing a 360px phone.",
      "Verse-number-to-commentary link gets a brighter hover state so the affordance reads.",
      "Verse hash links flash gold: clicking a search result or opening a shared deep link scroll-centers the verse and pulses it for a moment.",
    ],
  },
  {
    version: "v2.1",
    kind: "Calendar polish, Koine accuracy",
    date: "May 16, 2026",
    blurb:
      "Three small fixes that matter: the calendar reads cleaner, the interlinear is now New Testament only, and the New Testament Greek finally has its accents back.",
    items: [
      "Calendar readings now show citation plus the first verse with a 'Read full passage' link, instead of two full Gospel and Epistle blocks dominating the page.",
      "Calendar hero and section headings scale down on mobile so the saint of the day fits a phone screen.",
      "Interlinear toggle and Greek column are now hidden on Old Testament chapters. The Septuagint is a Greek translation, but the Old Testament was originally Hebrew; New-Testament-only interlinear matches how most readers think about the text.",
      "New Testament Greek re-sourced as Nestle 1904 with full polytonic accents (smooth and rough breathings, circumflex, iota subscript). 'Bíblos genéseōs' rendered as 'Βίβλος γενέσεως' instead of 'βιβλος γενεσεως', proper Koine the way the Fathers read it.",
    ],
  },
  {
    version: "v2.0",
    kind: "Calendar",
    date: "May 16, 2026",
    blurb:
      "The first standalone calendar lands. Today's saint, today's fasting status, a Pascha countdown, and a full month grid with each day's commemorations and fast colour-coded. Plus three new saint icons, smoother highlight bars, and the version label finally catches up to itself.",
    items: [
      "New /calendar route. Hero shows today's date, today's saint(s) drawn from the saints index, the day's fasting rule with a colour-coded badge, and the days remaining until Pascha.",
      "Full month grid (Sun to Sat) with today tinted gold, every saint feast day dotted in gold, and the fasting rule for each day colour-coded (red strict, gold wine and oil, sage fish allowed, green fast-free). Click any day to pin it.",
      "Fasting helper covers the year-round Wednesday/Friday fast, all four major fasts (Great Lent, Apostles, Dormition, Nativity), and the four fast-free weeks (Bright Week, Trinity Week, the Twelve Days of Christmas, the Publican and Pharisee week).",
      "Pascha is computed by the Julian-based algorithm shared by all canonical Orthodox churches; fixed feasts use the New (Revised Julian) calendar of the Ecumenical Patriarchate.",
      "Three more saint icons sourced from Wikimedia Commons: Augustine of Hippo, Cyril of Alexandria, Irenaeus of Lyons.",
      "Word highlights now extend across the space between adjacent highlighted words. No more gappy two-pill look when you highlight a phrase like 'for God so loved'.",
      "Date and version-label drift fixed: changelog dates corrected to May 16, home banner now matches the /whats-new header.",
    ],
  },
  {
    version: "v1.5",
    kind: "John and the Fathers",
    date: "May 16, 2026",
    blurb:
      "A patch dedicated to the Gospel of John. Three of the great early commentators on the Fourth Gospel are added to the Saints section. Patristic commentary expands from one chapter of John to nine. The letter above is unchanged; this is a content bump, not a direction change.",
    items: [
      "Three new saints in the registry: Augustine of Hippo (Doctor of Grace), Cyril of Alexandria (Seal of the Fathers), and Irenaeus of Lyons (Disciple of the Disciple, who heard Polycarp who heard John).",
      "Each new saint ships with a curated selection from his commentary on John: Augustine's Tractates on John, Cyril's Commentary on John, and Irenaeus' Against Heresies on the Fourth Gospel.",
      "St. John Chrysostom gains a third work, Homilies on the Gospel of John, with selections from the eighty-eight homilies he preached at Antioch in the early 390s, the longest patristic treatment of any New Testament book.",
      "Patristic commentary on John expands from one chapter to nine. New verse-level entries on John 1:3, 1:12, 1:18, 1:29, 3:3, 3:5, 3:16, 6:51, 6:53, 10:11, 10:30, 14:6, 14:9, 17:21, 19:34, 20:22, 20:28, the most-cited verses of the Gospel.",
      "Commentary now draws on ten Fathers across the patristic age: Athanasius, Augustine, Basil, Chrysostom, Cyril of Alexandria, Gregory the Theologian, Ignatius of Antioch, Irenaeus, John of Damascus, and Maximus the Confessor.",
      "Saint icons for Augustine, Cyril, and Irenaeus render as deterministic-initials circles until JPGs are uploaded; both icon maps (profile and commentary-rail) are wired with the correct paths.",
    ],
  },
  {
    version: "v1.4.1",
    kind: "Bible fixes",
    date: "May 16, 2026",
    blurb:
      "A correctness patch for the Interlinear column and word lookups. No new features; just clean text where there used to be ingestion debris.",
    items: [
      "Fixed: literal 'of', 'is', and friends appearing inside the English column of the New Testament when Interlinear was on. The KJV's italicized supplied-words markers had been surviving as HTML through the ingest. 2,444 stray tags removed across 197 chapter files.",
      "Fixed: clicking certain words in the English column landed on a garbage token like G3756] instead of a real word. 3,655 orphan Strong's-bracket fragments scrubbed.",
      "The ingest script now strips italic markers before tokenizing, drops orphan Strong's fragments, and runs a sanity check that fails the build if a fragment ever reappears.",
      "The loader also defensively scrubs tokens at read time, so a stale data file can't put garbage on screen.",
      "No effect on the regular (non-Interlinear) Bible reader. The OT (Greek LXX) column is unchanged; this fix is NT-only.",
    ],
  },
  {
    version: "v1.3",
    kind: "Click any Greek word",
    date: "May 16, 2026",
    blurb:
      "With Interlinear on, every Greek word in the New Testament is now clickable. Tap a word to see its dictionary form, a short definition, the part of speech, and its Strong's number. Letter above unchanged.",
    items: [
      "New WordPopover anchored to the clicked word, flips above if it would run off the bottom of the screen.",
      "Popover shows: the word itself, the lemma (dictionary form) with transliteration, a concise Strong's definition, a friendly parse string (e.g. 'verb · aorist · active · indicative · 3rd sing.'), and the Strong's number badge.",
      "1,200+ Greek words and 5,500+ Strong's entries packed into a slim per-chapter lexicon, only the entries used in the chapter ship to the browser (~5-20 KB per page).",
      "NT text now sourced from the Robinson-Pierpont Byzantine Majority Text with Strong's tagging (PD). Same Textus Receptus tradition as the previous Stephanus rendering; accents are not shown so the words can be tagged precisely.",
      "OT (Greek LXX) keeps its accented text and shows a small 'word lookups coming' marker, OT tagging is planned for a future patch.",
      "Esc, click outside, or the close button in the corner all close the popover.",
    ],
  },
  {
    version: "v1.2",
    kind: "Interlinear",
    date: "May 16, 2026",
    blurb:
      "The Bible reader now has an Interlinear toggle. Click it on any chapter and the original Greek appears beside the English. Letter above unchanged.",
    items: [
      "New Interlinear button in the chapter header, next to the search bar. Toggle persists across chapters and reloads.",
      "Original-language coverage: KJV New Testament paired with Stephanus 1550 (Textus Receptus) Greek; Brenton Old Testament paired with the Septuagint Greek that Brenton translated from. 1,325 chapters total.",
      "Cardo serif loaded for the Greek column, polytonic accents and breathings render correctly.",
      "Mobile (under md): Greek wraps below the English instead of beside, so verses stay readable on phones.",
      "Verse highlights and notes still work with Interlinear on. The English column owns the toolbar and word-drag highlighting.",
    ],
  },
  {
    version: "v1.1",
    kind: "Polish patch",
    date: "May 16, 2026",
    blurb:
      "A polish-and-fill pass before any new feature work. The letter above is unchanged.",
    items: [
      "Three new saints: Ignatius of Antioch, Maximus the Confessor, Symeon the New Theologian, each with a representative work and a real icon.",
      "Verse highlight tint now applies cleanly with the gold inset bar.",
      "Top navigation harmonized between the marketing site and the app: same five primary items, same Pricing and Account links, same Try Free pill.",
      "Footer: removed the duplicate Pricing link and surfaced What's new in the Discover column.",
      "Saint icons resized: total weight dropped from 4.7 MB to ~440 KB, with no visible quality loss.",
      "Focus rings on filter pills are now visible against the dark background.",
    ],
  },
  {
    version: "v1.0",
    kind: "First release",
    date: "May 15, 2026",
    blurb: "The first public version. See Edgar's letter above for the full picture.",
    items: [
      "The Orthodox Bible: Brenton Septuagint plus KJV, with cross-references and patristic commentary.",
      "Saints: six founding fathers with lives, writings, marginalia, century filter, topic filter.",
      "Smart search across books, chapters, and verses (John 3:16, 1 Cor 13, Ps 23).",
      "Verse highlights and notes saved to your device.",
      "Dark, calm reading typography. Section-snap scrolling.",
    ],
  },
];

// Group entries by date, preserving array order.
function groupByDate(entries: Entry[]): { date: string; entries: Entry[] }[] {
  const out: { date: string; entries: Entry[] }[] = [];
  for (const e of entries) {
    const last = out[out.length - 1];
    if (last && last.date === e.date) last.entries.push(e);
    else out.push({ date: e.date, entries: [e] });
  }
  return out;
}

export default function WhatsNewPage() {
  const groups = groupByDate(ENTRIES);

  return (
    <section className={`${SECTION} bg-night`}>
      <article className="mx-auto max-w-[760px] w-full">
        {/* Eyebrow + version */}
        <div className="flex items-baseline justify-between flex-wrap gap-3 mb-6">
          <p className="font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-paper/55">
            What&rsquo;s new
          </p>
          <p className="font-sans text-[12px] uppercase tracking-[1.2px] text-paper/40">
            v3.8 &middot; Beta &middot; Cleaner Koine ↔ English
          </p>
        </div>

        <h1 className="font-sans text-[40px] md:text-[56px] font-bold leading-[1.05] tracking-[-0.025em] text-paper">
          Pray with the Church, every day.
        </h1>

        <p className="mt-8 font-serif text-[19px] md:text-[20px] text-paper/85 leading-[1.7]">
          The line that has stood at the bottom of every letter since v1.0
          finally goes away: daily prayer is now built. v3.0 lands the
          Morning Rule, the Evening Rule, and a guided Jesus Prayer
          counter; and it ties them together with a Today screen that
          gathers the date, the saint, the fast, and the appointed readings
          into one place. Open it when you wake. Open it again before
          sleep. That is the whole shape.
        </p>

        <p className="mt-5 font-serif text-[19px] md:text-[20px] text-paper/85 leading-[1.7]">
          The prayer texts are the ones the Church has handed down: O
          Heavenly King, the Trisagion, the Lord&rsquo;s Prayer, Rising
          from Sleep, Into Thy hands, the Theotokos hymn. They are the
          same prayers your priest prays in his cell, the same prayers
          your grandmother said in front of her icons. The English
          translation matches the form carried in the common Orthodox
          prayer books for at least a century. Each prayer is its own
          collapsible block, with a small checkbox so you can keep your
          place; the rule remembers what you prayed today, and a quiet
          gold counter tracks how many days in a row you have stood with
          the Church.
        </p>

        <p className="mt-5 font-serif text-[19px] md:text-[20px] text-paper/85 leading-[1.7]">
          The Jesus Prayer gets its own room. Tap to advance the count;
          choose a goal from 33 to 300; if it helps you, turn on the breath
          cue and let the pulse carry your inhale and your exhale. The
          Fathers say the bringing-back is half the work. The counter is
          there only to free your hands and your mind to do the work.
        </p>

        <p className="mt-5 font-serif text-[19px] md:text-[20px] text-paper/85 leading-[1.7]">
          Alongside the prayer feature, v3.0 finishes a long list of
          quieter things the site has owed itself: a proper 404 page that
          does not lose people, a loading skeleton on the Bible reader,
          a sitemap and robots so search engines can read us, a link
          preview card so the site looks like itself when you share it,
          and the Old Calendar toggle on the calendar page (used by the
          Russian, Serbian, Jerusalem, and Athonite churches; thirteen
          days behind the New for fixed feasts, the same Pascha as
          everyone). Still missing: akathists, audio, accounts and
          cross-device sync. We will get there.
        </p>

        <p className="mt-5 font-serif text-[19px] md:text-[20px] text-paper/85 leading-[1.7]">
          For now, the most important thing the site can ask of you it
          now actually offers. Open it when you rise. Open it when you
          lie down. Stand in the presence of God, even for a moment.
        </p>

        <p className="mt-5 font-serif text-[19px] md:text-[20px] text-paper/85 leading-[1.7]">
          The full release-by-release log lives below, grouped by date and
          collapsed by default. Pop one open when you want the detail.
        </p>

        {/* Closing + signature */}
        <div className="mt-16 pt-10 border-t border-paper/10">
          <p className="font-serif text-[19px] md:text-[20px] text-paper/85 leading-[1.7]">
            Thank you for staying with us through three majors. Glory to God
            for all things.
          </p>

          <p
            className="mt-10 font-serif italic text-[20px] md:text-[22px] tracking-wide"
            style={{ color: "#d4af37" }}
          >
            From Edgar, the Purify Team.
          </p>
        </div>

        {/* Changelog: dates collapse, releases inside also collapse. */}
        <section className="mt-20 pt-10 border-t border-paper/10" data-changelog>
          <div className="flex items-baseline justify-between flex-wrap gap-3 mb-6">
            <p className="font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-paper/55">
              Release notes
            </p>
            <ChangelogControls />
          </div>
          <p className="font-sans text-[13px] text-paper/45 mb-8 leading-[1.65]">
            Grouped by date. The most recent day is open by default; tap any
            other day to expand. Inside each day, tap a release to read its
            full item list.
          </p>

          <div className="space-y-3">
            {groups.map((g, gi) => (
              <details
                key={g.date}
                open={gi === 0}
                className="group rounded-md border border-paper/12 bg-paper/[0.02] open:bg-paper/[0.04] transition-colors"
              >
                <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between gap-3">
                  <span className="flex items-baseline gap-3 min-w-0">
                    <span className="font-sans text-[15px] font-semibold text-paper truncate">
                      {g.date}
                    </span>
                    <span className="font-sans text-[12px] uppercase tracking-[1.2px] text-paper/45">
                      {g.entries.length} update{g.entries.length === 1 ? "" : "s"}
                    </span>
                  </span>
                  <span
                    aria-hidden
                    className="text-paper/45 group-open:rotate-180 transition-transform duration-200 text-[12px]"
                  >
                    ▾
                  </span>
                </summary>
                <div className="px-5 pb-4 space-y-2">
                  {g.entries.map((e) => (
                    <ReleaseDetails key={e.version} entry={e} />
                  ))}
                </div>
              </details>
            ))}
          </div>
        </section>
      </article>
    </section>
  );
}

function ReleaseDetails({ entry: e }: { entry: Entry }) {
  return (
    <details className="group/rel rounded-md border border-paper/10 bg-night-soft/40 open:bg-night-soft/70 transition-colors">
      <summary className="cursor-pointer list-none px-4 py-3">
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="font-sans text-[16px] font-bold text-paper tracking-[-0.01em]">
            {e.version}
          </span>
          <span className="font-sans text-[11px] uppercase tracking-[1.2px] text-paper/50">
            {e.kind}
          </span>
          <span
            aria-hidden
            className="ml-auto text-paper/40 group-open/rel:rotate-180 transition-transform duration-200 text-[11px]"
          >
            ▾
          </span>
        </div>
        <p className="mt-1.5 font-sans text-[13.5px] text-paper/65 leading-[1.55] group-open/rel:text-paper/80 transition-colors">
          {e.blurb}
        </p>
      </summary>
      <ul className="px-4 pb-4 pt-1 space-y-2 font-sans text-[14px] text-paper/85 leading-[1.6] list-disc pl-9 marker:text-paper/30">
        {e.items.map((it) => (
          <li key={it}>{it}</li>
        ))}
      </ul>
    </details>
  );
}
