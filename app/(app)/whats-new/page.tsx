import Link from "next/link";
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
 version: "v6.3",
 kind: "Auth hardened, hero rebuilt",
 date: "May 26, 2026",
 blurb:
 "v6.2 shipped the password and OAuth system; v6.3 is the cleanup pass that makes it usable in production. Legacy magic-link users can now set a password from Security without being asked for a current password they never had. Google OAuth errors translate to concrete next-steps instead of raw Supabase strings, and provider errors surface on /signin in a red banner instead of redirecting silently. Apple is marked 'Coming soon' honestly (the Apple Developer account isn't provisioned yet). The Unlink action on Security is now a visible red pill with a confirm guard so a misclick can't silently drop the connection. The home page hero also gets two cleanups: the Pantocrator portrait was swapped for the three-bar Purify cross logo (the mark people see on the install screen, manifest, and elsewhere), and the intro animation was reworked from fade-with-extra-steps into a plainer empty halo → crimson drop → fade-in. Plus one layout fix so the bottom row of 'What we are made of' no longer falls behind the snap-scroller.",
 items: [
 "Set-a-password mode on Security for legacy magic-link users. The card now reads `profiles.has_password` server-side and branches: if false, it renders 'Set a password' (new + confirm only, gold-tinted callout explaining why) and calls updateUser + mark_password_set; if true, it renders the usual 'Change password' with current-password re-verification.",
 "Forgot-password path explicitly named in the wrong-password error on /signin: 'use Forgot password? below to set one.' The /forgot → /reset flow already worked for accounts without a current password (Supabase resetPasswordForEmail issues a recovery token; ResetForm calls updateUser({ password })), it just wasn't named.",
 "Apple sign-in, sign-up, and Connect-Google buttons all marked 'Coming soon' since the Apple Developer account isn't provisioned yet. The buttons are visibly dimmed with aria-disabled and cursor-not-allowed; the layout stays two-up so the row reads as a deliberate pair instead of a hole. Two-line restore when the Developer account is ready.",
 "OAuth provider errors surface on /signin in a red banner. /api/auth/callback now handles ?code (success), ?error (provider cancelled / misconfigured), and the no-code fallthrough, redirecting failures to /signin?error=<msg> with a visible message instead of a silent landing on /account.",
 "Google 'identity_already_exists' / 'access_denied' / 'redirect_uri' / 'manual linking is disabled' all translate to concrete next-steps in the Connect Google flow and on /signin, instead of relaying raw Supabase text. 'That Google account is already linked to a Purify account. Click Continue with Google on /signin and Supabase will recognize the existing link and let you in.'",
 "Unlink action on Security promoted from a faded text-link to a proper red-outlined pill (cinnabar border on a low-opacity tint) with a confirm() guard. Now visually matches the Sign-out-everywhere card's destructive treatment so the two destructive controls read as a deliberate pair.",
 "Hero icon swap. The right column on the home hero now renders the Purify three-bar cross logo instead of the Pantocrator portrait. Same blood-drop intro, gold halo, pointer-tilt, and cursor-glint still apply; only the image src moved (and the file moved from public/public/ to public/ root so it serves at /purify-logo.jpg).",
 "Hero intro animation reworked. Replaces the mask-bloom reveal with a plainer sequence: 0s empty halo and crimson drop falling; ~1s drop lands, thin splash ring, crimson wash blooms, icon begins fading in; 1.8s icon fully visible, wash settles to ambient glow. Same total length, motion-reduce still respected.",
 "MadeOfStrip layout fix. The home page SectionScroller intercepts wheel events and snaps to each top-level main > section, blocking internal scrolling. MadeOfStrip was taller than 100dvh on most desktop displays, so the sixth tile ('No tracking. No advertising. Optional account.') was clipped at the bottom and unreachable. Now adopts the same sectionBase shape the other home sections use (snap-start + md:[min-height:100dvh] + flex items-center, with navbar offset baked in), with tighter vertical rhythm so all six tiles plus the header fit comfortably under 100dvh.",
 "Footer + home-page chip + /whats-new chip step to v6.3.",
 ],
 },
 {
 version: "v6.2",
 kind: "A real account system",
 date: "May 26, 2026",
 blurb:
 "Sign in with email and a password instead of a magic-link. Continue with Google or Apple if you'd rather. Change your password from the new Security tab, change your email with a confirmation step, sign out everywhere with one click. The account page is now a tabbed dashboard, Profile / Security / Data / Sessions, so the things you might want to manage are actually findable. Existing magic-link users are walked through setting a password the first time they sign in; no other changes to their data.",
 items: [
 "Email and password sign-up at /signup, sign-in at /signin. The old one-tap magic-link flow is retired.",
 "Continue with Google and Continue with Apple on both /signin and /signup. The buttons are wired; each provider needs to be configured once in the Supabase dashboard before it works (see docs/auth-setup.md).",
 "Forgot-password flow at /forgot. We send a reset link; it lands on /reset where you pick a new password.",
 "Change password from the new Security tab. We re-verify your current password first so a stolen session can't silently rotate it.",
 "Change email from Security; we send a confirmation link to the new address before the change takes effect.",
 "Connect or disconnect Google / Apple from Security at any time, even after sign-up.",
 "Sign out everywhere with one click from Security. Useful if you signed in on a device you no longer have.",
 "Existing magic-link users are prompted to set a password the first time they sign in after this release. Everything else about their account stays the same.",
 "The signed-in /account page is now a tabbed dashboard: Profile, Security, Data, Sessions. The four old long-scroll sections are mapped one-for-one.",
 "Middleware enforces the auth gate server-side (the redirect happens before any page shell paints) so unsigned users hitting /account/* land on /signin with a return path.",
 "New supabase migration adds profiles.has_password and a mark_password_set RPC the client calls when the password is set or rotated.",
 "New docs/auth-setup.md walks the maintainer through the Google + Apple + Supabase configuration steps.",
 "Footer + home-page chip step to v6.2.",
 ],
 },
 {
 version: "v6.1",
 kind: "The app on your phone, and a clearer account choice",
 date: "May 25, 2026",
 blurb:
 "Two things this release. First, Purify now behaves like an actual app on your phone: a persistent bottom tab bar (Today, Bible, Discover, Prayers, You), a Today hero with the day's saint and fast, a real chapter picker for the Bible reader, a top bar with back-button and font controls on every reader, and a proper PWA so you can add Purify to your home screen and keep reading on a bad signal. Desktop stays exactly as it was. Second, the account question is now named plainly: when you open /account you pick one of two real paths, a local profile that keeps everything in your browser, or a public account that syncs across devices via a one-tap email magic-link. Neither is the default, both are free, both are reversible. Along the way the saint-works reader got the same mobile chrome the Bible reader has had (top bar, section pill, full TOC sheet, font controls), and the council canons got a round of OCR cleanup: eleven artifacts fixed across Nicaea, Constantinople I, Ephesus, and Chalcedon (running-header injections, mangled Greek, footnote bleed). Closer to the version of Purify that opens like a prayer book and not like a website.",
 items: [
 "Mobile app-shell. A five-tab bottom bar on phones (Today, Bible, Discover, Prayers, You) replaces the old hamburger dropdown; the desktop AppNav is unchanged. The shell sits above the iOS home indicator on notched phones, and never clips the last verse of a chapter.",
 "New /discover surface with eight category tiles (Saints, Councils, Calendar, Fasts, Daily readings, The Psalter, Patristic commentary, Pascha), each in its own colour register so the grid reads as a deliberately-coloured set instead of a uniform card stack.",
 "Today mobile hero. A full-width tinted backdrop using the day's saint icon, the date, the headline commemoration, the fast chip, one CTA into the full prayer surface, a chip row of quick actions (Pray, Read, Discover, Saved, You), and a verse-of-the-day card that now actually pulls from the headline saint's first quote when one is available, falling back to St. Seraphim of Sarov.",
 "PWA. A typed manifest with home-screen shortcuts (Today, Bible, Discover) and maskable Android Adaptive Icon variants, plus a hand-rolled service worker with three caching strategies (NetworkFirst for HTML, StaleWhileRevalidate for /_next/static and saint icons, CacheFirst for the manifest), so the pages you have visited keep working on a bad signal. An install banner surfaces after three visits, steps aside when a sheet or toolbar is open, and gives iOS Safari the right Add-to-Home-Screen hint.",
 "Bible reader mobile chrome. A 48px top bar with back to /bible, the book and chapter as the title, and a trailing icon cluster (bookmark stub, settings). Settings opens font-family + font-size controls in a bottom sheet. The chapter pill now sits above the tab bar with prev/next arrows and a real book-chapter picker sheet (two-step: testament toggle, then a grid of chapter numbers). The verse long-press toolbar finally floats above the tab bar instead of behind it.",
 "Saint-works reader mobile chrome. Previously bare; now matches the Bible reader. Top bar with back to the saint profile, a floating Section N of M pill that tracks your scroll position via an IntersectionObserver, a full table-of-contents sheet behind a tap, and the same font-family + font-size controls as the Bible reader, persisted to the same localStorage keys so a choice carries between Scripture and the Fathers. A 2px gold scroll-progress bar at the top of the page.",
 "Shared Sheet primitive in components/ui/Sheet.tsx, extracted from the bespoke MobileCommentarySheet pattern: grab handle, body-scroll lock, two-phase mount for the slide animation, backdrop tap, Escape key, and a tiny lib/ui/overlay.ts flag so the install banner steps aside whenever a sheet or toolbar is up.",
 "Safe-area plumbing. viewport-fit=cover on the root, --tab-bar-h CSS variable in :root, and two new utilities (safe-pb and safe-pb-reader) so any scroll container that sits behind the bottom tab bar (and the floating reader pill) leaves the right amount of room above the iOS home indicator. No more last verse hiding behind the chapter pill.",
 "Tab-bar icons reworked at strokeWidth 2.2 (heavier, more legible at 22px), with a soft gold halo behind the active tab so the row reads as filled. Five new custom SVGs (Sun, Book, Compass, Hands, User) following the existing Cross / Halo / Wheat pattern. No lucide-react.",
 "Today greeting. When you are signed in, a quiet hour-aware greeting appears above the date eyebrow (\"Good morning, Edgar\" / \"Good evening, Edgar\"), pulling your display name from the profiles row server-side. Silent and unsigned-out otherwise.",
 "Council canons cleanup. Eleven OCR artifacts fixed across all four currently-shipped Ecumenical Councils. Nicaea XII and XIII got trimmed of trailing two-column NOTES bleed and obvious typos (\"lie must\" → \"he must\", \"re* ceived\" → \"received\"). Constantinople I, Canon II had an \"I. CONSTANTINOPLE. A.D. 381\" page header injected mid-sentence between \"that the\" and \"synod\"; removed. Ephesus VIII body had \"1 Labbe and Copsart, Tom. v.. col. 455. ... EPHESUS. A.D. 431\" bleeding through; removed. Chalcedon XII (atCHALCEDON. A.D. 451 tempted → attempted), XIV (trailing CHALCEDON. A.D. 451), XXIII (CHALCEDON. A.D. 451 mid-sentence), and XXVIII (a 2,500-character NOTE-bleed including mangled Greek \"■n-poiBpia ... -n-poa-Tacria\" for πρεσβεῖα / προστασία) all trimmed. Canon XXVIII's notes section needs a re-fetch from a cleaner Wikisource source to restore the Bright / Van Espen / Tillemont commentary; flagged as a follow-up.",
 "Dual local-or-public account choice on /account. When you open the page signed out, you see two side-by-side cards. A local profile keeps highlights, notes, bookmarks, your prayer streak, and reader prefs in your browser only, with no server-side row. A public account stores the same items in our Supabase database so they sync across devices, with a one-tap email magic-link (no password). Both options name their trade-offs honestly. Both are reversible. /about and /privacy were rewritten to reflect the two-track model and now link to /account from inside the relevant sentences.",
 "Footer + home-page chip step to v6.1.",
 ],
 },
 {
 version: "v6.0",
 kind: "A major release: the Councils, at last",
 date: "May 24, 2026",
 blurb:
 "If you are new here, welcome. v6.0 is a major release, the largest content step Purify has taken since v5.0 and the one that brings the Councils section to a place where it can stand on its own. Four of the Seven Ecumenical Councils now live in the corpus, each with a full historical profile, principal Fathers cross-linked to their saint pages, principal opposing parties named honestly, and the conciliar documents themselves readable in full. Nicaea (325) and Constantinople (381) ship complete: Creed, Synodal Letter, and Canons for each. Ephesus (431) and Chalcedon (451) ship with their canons; their dogmatic Definitions are the next workstream. Twelve new saints joined the registry along the way (every named principal Father of the first two councils, plus St. Gregory Palamas). The em-dash is gone from the project's editorial prose. The marketing nav on the home page now actually links to the Councils section. The site reads, for the first time, as it was meant to read: the Faith confessed by the Fathers in council, with every link traceable to a public-domain primary source.",
 items: [
 "Four Ecumenical Councils now in the corpus, where v5.7 had only the foundation and v5.8 had only Nicaea. Each carries a six-paragraph historical narrative, what the Council defined, what it condemned, the principal Holy Fathers (cross-linked to /saints where present in the registry), and the principal opposing parties named honestly.",
 "Nicaea I (325) ships complete: The Symbol of the Faith with the anathemas, The Synodal Letter to the Church of Alexandria, and The Twenty Canons in full. Source: Schaff & Wace NPNF Vol. 14 (1900), public domain, via Wikisource and the archive.org plain-text OCR.",
 "Constantinople I (381) ships complete: The Niceno-Constantinopolitan Creed (the Creed you recite at every Divine Liturgy) together with the related baptismal creed of St. Epiphanius's Ancoratus, The Synodical Letter to Pope Damasus and the West, The Letter to the Emperor Theodosius, and The Seven Canons in full.",
 "Ephesus (431) opens with The Eight Canons in full, plus the full historical profile from the Antiochene exegetical tradition through Nestorius's refusal of the Theotokos, St. Cyril of Alexandria's letters, the Council itself with the famous Ephesian procession (\"Praised be the Theotokos\"), and the Formula of Reunion of 433. Cyril's Second and Third Letters to Nestorius, the Twelve Anathemas, and the Formula of Reunion are flagged as pending.",
 "Chalcedon (451) opens with The Thirty Canons in full, plus the full historical profile from the Eutychian controversy through the Robber Council of 449, the death of St. Flavian, the accession of St. Marcian and St. Pulcheria, the Council itself with the famous acclamation \"Peter has spoken through Leo,\" the dispute over Canon XXVIII, and the post-Chalcedonian Oriental Orthodox separation. The Definition of Faith itself and the Tome of Pope Leo are flagged as pending. On the Oriental Orthodox question Purify takes the principled silence already set out on /about: where the Fathers spoke with one voice, we serve their text; where later traditions differ on the reception, we name the difference, surface the standard Eastern Orthodox position, and direct the reader to their priest.",
 "Twelve new saints in the registry. From the first two Councils: St. Constantine the Great, St. Alexander of Alexandria, St. Hosius of Cordova, St. Eustathius of Antioch, St. Spyridon of Trimythous (with his demonstration of the Trinity at Nicaea), St. Theodosius the Great, St. Meletius of Antioch, St. Cyril of Jerusalem, St. Nectarius of Constantinople, St. Diodore of Tarsus, and St. Epiphanius of Salamis. Plus St. Gregory Palamas, the Archbishop of Thessaloniki and defender of hesychasm, with The Holy Hesychast (the Hagioritic Tome of 1340 in PD English plus a guided summary of the Triads). Each new saint has a full life, a first work, a feast-day entry in the calendar, and an icon on the profile.",
 "The Twenty Canons of Nicaea and the Seven Canons of Constantinople I were unblockable from this sandbox's network for a while (Wikisource hosts the canons-index pages but not the per-canon text; CCEL and New Advent are DNS-unreachable from the build environment). The eventual path: open the archive.org plain-text OCR of NPNF Vol. 14 in a real browser, copy the canons section, drop it into a project file, parse with a small extractor that handles the OCR's word-spacing, hyphenated line breaks, and Roman-numeral garbles (\"xni\" for \"xiii\", \"in\" for \"III\", \"n\" for \"II\"). The same parser carried all four Councils' canons through.",
 "Em-dashes removed from every line of project-authored prose: pages, registry bios, plan files, audit docs, release notes, all editorial fields in JSON content. The 28 em-dashes inside verbatim public-domain source paragraphs (NPNF/ANF translators 1885-1900) are deliberately preserved per the verbatim-source rule in CONTRIBUTING.md.",
 "Bug fix: the marketing Navbar on the home page never had a link to the Councils section, because the link had only been wired into AppNav (the in-app navigation). The home-page nav now matches.",
 "Calendar: feast-day entries with slug-links to the saint profiles for every council Father added (May 21 Constantine, May 29 Alexander, Aug 27 Hosius, Feb 21 Eustathius, Dec 12 Spyridon, Jan 17 Theodosius, Feb 12 Meletius, Mar 18 Cyril of Jerusalem, Oct 11 Nectarius, Oct 22 Diodore, May 12 Epiphanius, Nov 14 Palamas). Plus the conciliar feasts themselves: July 9 (Holy Fathers of Ephesus), July 16 (Holy Fathers of Chalcedon).",
 "Icons resolve cleanly across every new entry: real images for every council Father and for Palamas, with several arriving as drops that the build pass renamed from informal upload filenames to the slug-form paths the registry expects.",
 "SAINTS-AUDIT.md updated: per-council priority queue reflects all four councils now in the corpus; the remaining three (Constantinople II 553, Constantinople III 680-681, Second Nicaea 787) named with their priority documents.",
 "Footer + home banner + /whats-new chip step to v6.0.",
 ],
 },
 {
 version: "v5.9",
 kind: "Nicaea refined, Constantinople opened",
 date: "May 23, 2026",
 blurb:
 "Two pieces this evening. First, an honest audit of the First Council page surfaced seven refinements, all landed: the symbolic number of the 318 Fathers is now named with both the historical count (about 250, per Eusebius's Vita Constantini) and the Genesis 14:14 typology the Fathers themselves read into the number; St. Hosius's presidency is softened from a flat claim to the more accurate description of him as the elder of the West who signs first in the subscriptions, with St. Eustathius of Antioch named as the giver of the opening oration in the Eastern tradition; St. Spyridon's demonstration of the Trinity is now told plainly (the brick, the fire upward, the water downward, the clay in his palm); the two bishops deposed with Arius are named (Secundus of Ptolemais and Theonas of Marmarica); the homoousios gloss is updated to the modern liturgical rendering (consubstantial) with the older Hapgood rendering noted alongside; and a Pending section now appears on the council profile so readers know the Twenty Canons of Nicaea are coming once a clean public-domain source is wired. Second, the Second Ecumenical Council opens: Constantinople 381, the council of the 150 Holy Fathers under St. Theodosius the Great, which gave the Church the Creed she still recites at every Divine Liturgy. Three documents in full: the Niceno-Constantinopolitan Creed itself (with the related baptismal Creed of fourth-century Salamis preserved by St. Epiphanius), the Synodical Letter to Pope Damasus and the Western bishops written the following year, and the short Letter to the Emperor Theodosius requesting imperial ratification.",
 items: [
 "Nicaea I refinement: the historical note on the 318 Holy Fathers is updated with Eusebius's count of about 250 actual attendees and the patristic typological reading of the number (Genesis 14:14, Abraham's 318 trained servants, read by the Fathers as a type of the Faith carrying the Church through Christ).",
 "Nicaea I refinement: St. Hosius of Cordova is now described as the elder of the West and the emperor's confidant who signs first in the subscriptions, with St. Eustathius of Antioch added to the principal Fathers as the giver of the opening address to the Council in the Eastern tradition. The flat claim that Hosius \"presided\" is softened to reflect that the question of presidency at Nicaea is genuinely contested.",
 "Nicaea I refinement: St. Spyridon's demonstration of the Holy Trinity to the assembled Fathers is now told in its received form: the brick taken into his hand, the sign of the Cross, the fire upward, the water downward, the clay remaining in his palm. Three natures held in one substance.",
 "Nicaea I refinement: the two bishops who refused to subscribe the Creed with Arius (Secundus of Ptolemais and Theonas of Marmarica) are now named in the historical narrative, cross-referencing the names that already appear in the Synodal Letter.",
 "Nicaea I refinement: the gloss on ὁμοούσιος is updated from the older \"of one essence\" to the modern liturgical \"consubstantial,\" with both renderings noted (Hapgood tradition vs. current English liturgical use).",
 "Nicaea I refinement: the Symbol document's framing of the Eusebian Creed (section 3) is rewritten to acknowledge that the standard modern reading sees Eusebius's letter to his diocese as apologetic, and that the Fathers did not so much adopt his creed as look past it.",
 "New schema field on Council registry: `pendingDocuments`. Surfaces on the council profile page as a faint \"Pending\" section beneath the readable documents, listing documents that belong to the council but are not yet wired. Used immediately on Nicaea I (the Twenty Canons) and Constantinople I (the Seven Canons).",
 "The Second Ecumenical Council (Constantinople 381) added: full historical narrative from the long Arian struggle of the post-Nicene fifty years through the rise of the Pneumatomachi and the work of the Cappadocians; the 150 Holy Fathers; the brief presidency of St. Gregory the Theologian and his withdrawal in self-sparing humility; the principal Fathers (Gregory the Theologian, Gregory of Nyssa, Meletius of Antioch, Cyril of Jerusalem, Nectarius, Diodore of Tarsus) cross-linked to the saint profiles where present in the registry; and the principal opposing parties named honestly (the Pneumatomachi, Apollinaris, Eunomius).",
 "Constantinople I document: The Niceno-Constantinopolitan Creed in full, in three sections (framing + the Holy Creed as ratified by the 150 Fathers + the closely related Salaminian baptismal Creed of St. Epiphanius's Ancoratus 120 from 374, the scholarly witness to a prior liturgical use the Council ratified). With editorial notes on the Filioque (not in the original Greek), the \"whose kingdom shall have no end\" anti-Marcellan addition, and the optional \"holy\" in the article on the Church.",
 "Constantinople I document: The Synodical Letter to Pope Damasus and the Western bishops at Rome (382), the Eastern bishops' summary of the Faith confessed at Constantinople, the heresies condemned (Sabellius, the Eunomians, the Arians, the Pneumatomachi), and the canonical confirmation of the three new Eastern patriarchs (Nectarius of Constantinople, Flavian of Antioch, Cyril of Jerusalem).",
 "Constantinople I document: The short Letter to the Emperor Theodosius (381) requesting imperial ratification of the Council's decrees, with the editorial note on \"by the prayers of the Saints\" as one of the earliest formal conciliar witnesses to the Orthodox doctrine of the intercession of the saints.",
 "The Seven Canons of Constantinople I are pending the same content drop as the Twenty Canons of Nicaea (Wikisource hosts the canons-index but not the per-canon text; the Schaff & Wace edition on CCEL is currently unreachable from the build sandbox).",
 "SAINTS-AUDIT.md updated: per-council priority queue reflects Nicaea I and Constantinople I as the two councils now in the corpus.",
 "Footer + home banner + /whats-new chip step to v5.9.",
 ],
 },
 {
 version: "v5.8",
 kind: "The Councils, beginning at Nicaea",
 date: "May 23, 2026",
 blurb:
 "A new section opens on the site: /councils. It will hold the seven Ecumenical Councils of the Orthodox Church, between Nicaea in 325 and the Second Council of Nicaea in 787, with their Definitions, their Canons, the Holy Fathers principally associated with each, and the historical context that produced them. The foundation lands tonight with the First Council itself: the original Nicene Creed (the first half of the Creed every Orthodox Christian still recites at the Divine Liturgy), the Council's Synodal Letter to the Church of Alexandria announcing the deposition of Arius and the common Paschalion, the 318 Holy Fathers named in their roles, and the historical narrative from St. Constantine's summons to Athanasius's defense of the homoousios. The Twenty Canons of Nicaea are deferred to the next content drop while a clean public-domain source is wired up; the other six councils will land in sequence in the coming releases. On contested questions, notably the post-Chalcedonian separation of the Oriental Orthodox, the section observes the same principled silence /about already states: where the Fathers spoke with one voice, we serve their text; where later traditions differ on the reception of a council, we name the difference and direct the reader to their priest.",
 items: [
 "New section at /councils, index page listing the seven Ecumenical Councils, each as a card with its ordinal, year, location, and a short summary. Linked from the global app navigation alongside Bible, Prayers, Saints, and Calendar.",
 "New per-council profile page at /councils/[slug]: hero with the ordinal name and year and location, the presiding emperor and the traditional count of bishops, two-column lists of what the Council defined and what it condemned, a multi-paragraph historical narrative, the principal Holy Fathers (cross-linked to the saint profiles when present in the registry), the principal opposing parties named honestly, and the documents themselves listed as readable links.",
 "New document reader at /councils/[slug]/[document], the same reader register the saints' works use: breadcrumb, hero, source line, editorial framing where a section needs it, the conciliar text verbatim, and editorial marginalia for the right column.",
 "The First Ecumenical Council shipped: hero, historical narrative (St. Constantine's summons, the 318 Holy Fathers, Athanasius's role as a young deacon, the choice of ὁμοούσιος as the unyielding word), the principal Fathers (Athanasius, Alexander of Alexandria, Hosius of Cordova, Nicholas of Myra, Spyridon of Trimythous), and the principal opponents (Arius, Eusebius of Nicomedia) named with their teaching.",
 "Two documents for Nicaea I in full: The Symbol of the Faith (the original 325 Creed with the anathemas, plus the alternate Eusebian Creed that was presented and set aside) and The Synodal Letter to the Church of Alexandria (the Council's encyclical announcing the deposition of Arius, the Meletian settlement, and the common Paschalion). Both verbatim from Schaff &middot; Wace, NPNF Series II Vol. 14 (1900), public domain, via Wikisource.",
 "The Twenty Canons of Nicaea are deferred to the next content drop. Wikisource hosts the canons-index but not the per-canon text; CCEL and New Advent are unreachable from the build sandbox. A follow-up will fetch them from a clean source or hand-transcribe from an archive.org Schaff scan.",
 "The new /councils route is wired into the sitemap.xml for search-engine indexing alongside Bible, Saints, and Calendar.",
 "SAINTS-AUDIT.md is updated with a sister-workstream section detailing the per-council priority queue for the remaining six councils, with notes on the editorial care required at Chalcedon (the Oriental Orthodox separation) and the cross-link between Council III Constantinople and St. Maximus the Confessor.",
 "Footer + home banner + /whats-new chip step to v5.8.",
 ],
 },
 {
 version: "v5.7",
 kind: "The Apostolic Fathers, the whole way through",
 date: "May 23, 2026",
 blurb:
 "The largest patristic content burst yet. All seven authentic letters of St. Ignatius of Antioch are now present in full, in the public-domain Roberts-Donaldson translation, alongside the only writing of his fellow disciple of John, St. Polycarp's letter to the Philippians, and the eyewitness encyclical of the church of Smyrna that became the model for every Christian martyrology thereafter. St. Gregory of Nyssa's Great Catechism, one of the three or four most important systematic theological works of the Eastern fourth century, closes his zero-works gap in a single forty-chapter import. Three new saints join the registry: the Holy Archangel Michael, the great Captain of the Bodiless Hosts; St. Nektarios of Aegina, the most-loved modern Greek wonderworker; and St. Florian of Lorch, the Roman officer drowned with a millstone in 304, received in the East as a saint of the Undivided Church.",
 items: [
 "All seven authentic Ignatian epistles now read in full on his profile: to the Ephesians (22 sections), Magnesians (16), Trallians (14), Romans (11), Philadelphians (12), Smyrnaeans (14), and to Polycarp (9). The Eucharist as the medicine of immortality, the three mysteries wrought in silence by God, \"Lay hold, handle me, and see that I am not an incorporeal spirit\", all in place. Roberts-Donaldson translation, ANF Vol. 1 (1885), public domain.",
 "Polycarp of Smyrna's primary corpus complete on the PD side: his short letter to the Philippians (15 sections), the only writing to come down to us from his hand, and The Martyrdom of Polycarp (23 sections), the earliest surviving Christian martyrology, written by the church of Smyrna to the church of Philomelium within a year of the events. Contains the famous \"Eighty and six years have I served Him\" before the proconsul, the prayer at the pyre, and the first known use of the word \"birthday\" for a martyr's day of death.",
 "St. Gregory of Nyssa's The Great Catechism added in full: the framing intro plus the Prologue and all forty chapters of his catechist's notebook on Trinity, Incarnation, Atonement, and Sacraments. Closes a zero-works gap on one of the great Cappadocian Fathers. Around 120 KB of primary text from NPNF Series II, Vol. 5 (Schaff and Wace, 1893), assembled from the per-chapter Wikisource transcriptions.",
 "The Holy Archangel Michael added to the registry with a full life from Daniel, Jude, and the Apocalypse, the November 8 Synaxis, and the September 6 Miracle at Chonae. First work: Hymns to the Bodiless Hosts (the Apolytikion, Kontakion, Megalynalia, and Theotokion appointed for the Synaxis, in the public-domain English of Hapgood's 1906 Service Book).",
 "St. Nektarios of Aegina added with a full life from his birth at Selybria in 1846 through his unjust deposition from Pentapolis, his fifteen years as director of the Rizareios School, and the long illness that ended on the night of November 8/9, 1920. First work: Apolytikion and the Rule of Life, the festal hymns authorized at his 1961 glorification together with the short Rule he gave the sisters of the Holy Trinity Monastery on Aegina.",
 "St. Florian of Lorch added as a pre-Schism Western martyr received in the East: the Roman officer in Noricum who left his post to stand with the imprisoned Christian soldiers at Lauriacum, was scourged and drowned with a millstone in the river Enns in 304. Venerated in the Polish Autocephalous Orthodox Church and other Slavic Orthodox jurisdictions among the saints of the Undivided Church. First work: The Passion of St. Florian, drawn from the Acta Sanctorum and the long PD English tradition.",
 "Calendar wired: November 8 (Synaxis of the Archangel), September 6 (Miracle at Chonae), and November 9 (St. Nektarios) now deep-link from their commemoration entries straight into the new registry profiles. May 4 gains a new entry for St. Florian alongside the existing commemorations of Pelagia of Tarsus, Silvanus, and Hilary.",
 "Footer + home banner + /whats-new chip step to v5.7.",
 ],
 },
 {
 version: "v5.6",
 kind: "Credibility, the floor under the work",
 date: "May 23, 2026",
 blurb:
 "A quiet release that wouldn't be worth a chip on the home page if it weren't the prerequisite for everything that follows. The first published privacy policy, audited line-by-line against the code that records page visits. A working Continuous Integration pipeline that runs every lint rule, every type check, every Pascha-date assertion, every end-to-end smoke test, every accessibility check, and every Lighthouse performance budget on every push to the main branch. A real architecture document a new contributor can read in fifteen minutes. A contributor's guide that says no language model wrote any saint biography on this site, and that every line of patristic text is traceable to a public-domain edition. A page-long honest audit of the whole site on a ten-criterion rubric, in the repo, for anyone who cares to read it. The site is not measurably more beautiful after this release. It is measurably more serious.",
 items: [
 "A new /privacy page: ten claims about what Purify records, what it keeps, and for how long, each one cross-checked against the actual code path in app/api/track/route.ts and lib/analytics/geo.ts. No third-party trackers anywhere on the site: no Google Analytics, no Meta Pixel, no Sentry tied to user identity, no PostHog, no Mixpanel, no Amplitude.",
 "Twenty-two named AI training and assistant crawlers disallowed in robots.txt: the original fourteen (GPTBot, OAI-SearchBot, ChatGPT-User, CCBot, Google-Extended, anthropic-ai, ClaudeBot, Claude-Web, PerplexityBot, Applebot-Extended, Bytespider, Amazonbot, Meta-ExternalAgent, cohere-ai) joined by Diffbot, FacebookBot, YouBot, Timpi, MistralAI-User, DuckAssistBot, Scrapy, and PanguBot. The privacy page names all twenty-two by name.",
 "A 90-day analytics retention window: the prune statement, the pg_cron schedule, the verification queries, and an activation log file in the repo where the operator who runs the cron in the production Supabase console drops in the proof. The privacy page only promises 90 days because the policy is written, not aspirational.",
 "End-to-end test suite using Playwright with axe-core accessibility assertions on every rendered page: seven smoke specs covering the home page, the Bible reader, today's prayer rule, the calendar with deep-linked dates, a saint profile and work, the four meta pages (about, what's new, privacy, support), and the signed-out account page.",
 "Lighthouse CI configured against four representative URLs with strict thresholds: Accessibility at 95 (error), Performance at 85, Best Practices at 95, SEO at 95, every page on the deploy preview must clear all four to ship.",
 "A GitHub Actions workflow that runs on every push and pull request: install, lint, typecheck, Vitest unit tests, full Next.js build, Playwright browser install, smoke suite + axe, Lighthouse CI. CI is now what gates a green deploy, not the operator's memory.",
 "ARCHITECTURE.md: a one-page mapping a new contributor can read in fifteen minutes covering the stack (Next 16 App Router, React 19, Tailwind v4, Supabase, Render), every major route segment with its purpose, the four data layers, the rendering strategy (SSG for Bible chapters and saints, ISR for the home and calendar), and the build and deploy story.",
 "CONTRIBUTING.md: the ethos, the local setup, the dev loop, the branch and PR flow, and the strict content rules: scripture and Fathers must be public-domain or licensed with a citation; saint biographies are drawn from established hagiographies and never generated by a language model; prayers are the common Jordanville, St. Tikhon's, or Hapgood wording; icons are Wikimedia Commons public-domain with the iconographer attributed where known.",
 "AUDIT.md at the repository root: a public ten-criterion rubric (content depth, source transparency, UX polish, performance, privacy and compliance, tests, architecture documentation, contributor posture, distinctiveness, accessibility) plus a five-criterion clergy-vetter lens (doctrinal precision, liturgical accuracy, tone and voice, language register, citation density on contested topics) applied to the whole site, scored honestly. SAINTS-AUDIT.md adds a per-saint gap map across all 47 registry entries against the realistic public-domain ceiling.",
 "ESLint plugin jsx-a11y wired into the project's flat config (with a small Next 16 workaround for the redefined-plugin error), and every resulting violation either fixed in code or suppressed with a justifying comment.",
 "A new section on /about, On contested questions: a single paragraph stating that Purify does not adjudicate questions the canonical Orthodox jurisdictions answer differently, calendar reckoning, fasting typikon, jurisdictional primacy, inter-confessional polemics, and that the silence is principled, not avoidant. Where you need a judgment, ask a priest.",
 "Vitest infrastructure plus a unit test file covering the Pascha algorithm in lib/calendar/orthodox.ts: orthodoxPascha verified against canonical published dates for 2024 through 2030, fastingStatus checked on Holy Friday, Bright Monday, and an ordinary-time Wednesday, paschaInfo countdown and roll-over both asserted. Thirteen assertions; previously zero coverage on the highest-stakes math in the codebase.",
 "Three account-dashboard components (ProfileActivity, ProfileSettings, ProfileSyncStatus) converted from a hydrate-in-effect useState/useEffect pattern to useSyncExternalStore, the React 19 recommended path for localStorage subscriptions, and the reason CI lint is now green.",
 "The calendar-style preference hook split into a client-only module (lib/calendar/useCalendarStyleDefault.ts) so that the server-rendered calendar page can still import the cookie-reading helpers from styleDefault.ts without tripping the Next 16 \"useSyncExternalStore in a server component\" error.",
 "Footer + home banner + /whats-new chip step to v5.6 (then immediately to v5.7 for the saints content burst that landed alongside).",
 ],
 },
 {
 version: "v5.5",
 kind: "The full company of the Twelve",
 date: "May 23, 2026",
 blurb:
 "A long pass through the saints registry. The Twelve are now complete, all eleven who walked with the Lord plus Matthias chosen by lot, each with a profile, a deep-linked work, and an icon image. To them are added the great Equal-to-the-Apostles Mary Magdalene, the Russian elder Paisios the Athonite, and the four firmly-attested direct successors of the apostolic generation, Anianus of Alexandria (Mark's successor) and Polycarp, Papias, and Prochorus (the three disciples of John the Theologian). Every profile now supports a new 'Disciples and successors' section that makes the chain of tradition visible, with the John -> Polycarp -> Irenaeus line wired across three linked profiles. Plus a small bug fix on the Account button in the app shell, a hero rebuild on the home page, and a quieter landing.",
 items: [
 "The Twelve, complete: Andrew the First-Called, James son of Zebedee, Philip, Bartholomew (Nathanael), James son of Alphaeus, Jude/Thaddaeus, Simon the Zealot, and Matthias join Peter, John, Matthew, and Thomas with full Saint entries, deep-linked quotes, and one work file each combining KJV passages with editorial framing.",
 "Mary Magdalene added as Equal-to-the-Apostles and Myrrhbearer, with the four-section work 'The Myrrhbearer at the Tomb' covering Luke 8, John 19, the encounter in the garden, and the tradition of the Paschal egg.",
 "St. Paisios the Athonite (1924-1994, canonized 2015) added with two works: 'Spiritual Counsels' (five-section selection) and 'Epistles' (three-section selection from his letters).",
 "Four direct successors of the apostolic generation added: Anianus of Alexandria (the cobbler whose hand St. Mark healed, second bishop of Alexandria), Polycarp of Smyrna (the eighty-six-year servant burned and stabbed in the stadium), Papias of Hierapolis (the earliest external witness to the writing of Matthew and Mark), and Prochorus the Deacon (scribe of John on Patmos).",
 "St. Ignatius of Antioch's entry rewritten to make his discipleship under John explicit: new byname 'Theophorus, Disciple of John', expanded life paragraph alongside Polycarp, and a quote from his Epistle to the Romans.",
 "New 'Disciples and successors' section on saint profiles. New `Saint.disciples` field with `{ slug, relation, blurb }` entries, a new `DisciplesSection.tsx` component (styled to match the existing Great Feasts cards), and integration into the saint profile page. The chain John -> Polycarp -> Irenaeus is now navigable across three linked profiles.",
 "Eighteen icon images wired across the new entries (apostles, Magdalene, Paisios, the four successors). Files renamed where needed to the `apostle-<slug>.jpg` and `<slug>.jpg` conventions, and matching author-name mappings added to `lib/saints/icons.ts` so commentary cards that cite these saints also pick up the icon.",
 "Refreshed icons for Gregory the Theologian, Ignatius of Antioch, and Nicholas the Wonderworker.",
 "Bug fix in `AppNav`: the Account button was rendering an invisible 36x36 placeholder span before the Supabase session check resolved, which made it look absent on every app page until hydration finished. The pre-hydration default is now the text 'Account' link; the gold initials avatar still upgrades in place once a signed-in session is confirmed.",
 "Home page hero rebuilt. The harsh black-to-white linear gradient is replaced with a quieter twilight-blue ambience (soft blue glow behind the heading, a deeper indigo settling toward the Today card, deep night base). The eyebrow tagline and the four-pillar list are dropped from the hero in favor of a tighter line of body copy. The four-tile Today strip and the Daily Wisdom block are removed from the landing.",
 "Footer + home banner + /whats-new chip step to v5.5.",
 ],
 },
 {
 version: "v5.4",
 kind: "Account, made real",
 date: "May 22, 2026",
 blurb:
 "The signed-in /account dashboard becomes a real reading-life dashboard. A gold-ringed initials avatar on the hero, prayer-rule streaks alongside the highlight counters, a recent-activity strip, a sync-status widget with a manual 'Sync now' and a last-synced timestamp, a Devices section that signs you out of all other devices in one tap, and a Reader Preferences panel that finally includes the interlinear default and the calendar reckoning. AppNav swaps the static 'Account' label for a small gold-ringed initials disc when signed in. /support adds a Bible translation licensing line so the funding goal reflects the cost of the live-fetched NKJV, NIV, and NLT translations.",
 items: [
 "ProfileHero gains a gold-ringed initials avatar (SaintIcon-style night gradient + display-serif initials) and a 'Last signed in' relative-time line under the email.",
 "ProfileStats grows a second tier: Morning rule streak, Evening rule streak, and 'Both rules, in a row' (read from localStorage prayer keys, refreshes on a new purify:prayer-streak event the PrayerRuleReader now dispatches).",
 "New ProfileActivity strip, three most-recent bookmarks as quick-jump links into their verse, chapter, or saint writing section. Empty-state copy when nothing is saved yet.",
 "New ProfileSyncStatus widget, last-sync timestamp ('just now', '12 min ago', 'Today 4:21pm'), a manual 'Sync now' button, and a red error badge when the last push/pull threw. SyncOnMount now records the timestamp and the error message so the widget has something to read.",
 "New ProfileDevices section, current-device card (parsed from window.navigator.userAgent) plus a 'Sign out of all other devices' action that POSTs to /api/auth/signout-others (wrapping supabase.auth.signOut({scope:'others'})).",
 "ProfileSettings now exposes the Interlinear-by-default toggle (writes the same localStorage key the in-reader pill uses) and a functional Calendar Reckoning radio (New / Old Julian, persisted to localStorage and mirrored into a cookie so the server-rendered /calendar page can read it without a flash of wrong content).",
 "Signed-out /account adds a small 'What syncs' card strip (highlights & notes / bookmarks / prayer streaks) and a single-line privacy reassurance under the form.",
 "AppNav: when a Supabase session exists the 'Account' link becomes a small gold-ringed initials disc; signed-out keeps the text label. Mobile menu still shows the text link.",
 "/support breakdown: new 'Bible translation licensing' line at $65/mo for the live-fetched modern translations (NKJV via Thomas Nelson, NIV via Biblica, NLT via Tyndale, delivered through the American Bible Society API.Bible). Monthly goal bumped from $300 to $375 to keep the 'leave some margin' copy honest.",
 "Footer + home banner + /whats-new chip step to v5.4.",
 ],
 },
 {
 version: "v5.3",
 kind: "The front door",
 date: "May 22, 2026",
 blurb:
 "Two small changes to the first thing people see. The home page no longer reads as a prayer app and nothing else, a live 'Today' rail now sits above the fold with the day's saint, the fast, a reading, and the count to Pascha; and the hero, features, and quick-jump links have all been rebalanced so Scripture, the saints, the calendar, and prayer stand together. And when someone pastes a Purify link into Discord or Slack, the preview now shows a real Purify card on the dark scroll background rather than a broken image from a domain we don't own.",
 items: [
 "A live 'Today' rail on the home page, the saint of the day with their icon, today's fast with its bespoke icon and liturgical colour, the day's appointed Gospel verse with a one-click jump into the reader, and the days to Pascha. ISR'd so it rolls forward each hour without a redeploy.",
 "The hero broadened from 'an Orthodox prayer companion' to the whole life of the Church, with a new headline ('The whole Orthodox life, in one quiet place.') and a quiet 'See today' link straight into the calendar.",
 "Four feature cards instead of three, one per pillar: Read with the Fathers, Lives of the saints, The Sacred Calendar, and Prayer that breathes. The eight quick-jump links underneath were rebalanced to match, two per pillar (the Gospel of John, the Psalter, the saints index, St. John Chrysostom, the calendar, Today, Morning prayers, the Jesus Prayer).",
 "The 'Where would you like to begin?' challenge cards finally point at the Bible too, 'Read the Gospel with Chrysostom' joins the path through Great Lent and the Jesus Prayer.",
 "Link previews fixed: shared URLs no longer pull a broken image from a domain we don't own. A clean Purify card (the three-bar Cross, the wordmark, 'Apostolic · Orthodox · Knowledge') is now the Open Graph image, and every absolute URL in our metadata resolves through the actual deployment URL automatically, with a defensive guard that refuses any 'purify.app' value entirely.",
 ],
 },
 {
 version: "v5.2",
 kind: "The calendar as a menologion",
 date: "May 22, 2026",
 blurb:
 "The /calendar page steps further out of the SaaS-dashboard idiom and into the typographic vocabulary of an actual Orthodox menologion. Cinnabar-red rubrics for feast saints and fasting rules, an illuminated drop cap on the saint of the day, a sharp ruled month grid with small saint faces on feast days, parchment-grain texture under the night background, season-aware page tinting (burgundy in Lent, marian blue in Dormition, paschal white-gold in Bright Week), a bilingual ΜΑΪΟΣ · MAY heading above the grid, a colophon at the foot, and a dual Gregorian / Julian date when the Old Calendar is selected.",
 items: [
 "Rubric red: a new --ink-rubric CSS variable (cinnabar 196·47·36) carries the day-of-month for feast cells, the saint name in the FeastPanel, and the fasting-rule label. Gold stays for page decoration only. Two-color liturgical printing.",
 "Illuminated initial: the saint's name in the FeastPanel now renders with a 2-line-tall display-serif drop cap in rubric red, underlined in gold (`components/calendar/DropCap.tsx`). Plain weekday pages without a Latin-letter saint name skip the drop cap.",
 "Dual Gregorian / Julian date when Old Calendar is selected: 'Saturday · May 22 / May 9, 2026'. Helper `formatLongDateDual(date, style)` in `lib/calendar/orthodox.ts`. A small italic note under the hero explains the dual format.",
 "Pascha countdown and the fasting rule lose their bordered-tablet chrome, replaced with thin gold hairlines and gold uppercase labels above the value. The whole hero now reads as one composed page rather than a card-with-card-inside.",
 "Month grid sharpened: rectangular cells (no rounded corners), thin gold hairline rules between cells (no gap), single thick gold outline around today (no tinted background). Feast cells render the day number in display-serif rubric red with a small saint icon in the upper-right when one is indexed; everything else stays quiet.",
 "Parchment-grain SVG noise layered into `.menaion-surface` at mix-blend-overlay 0.07 opacity. Invisible at a glance, present on inspection; the page stops feeling like a backlit OLED rectangle and starts feeling like ink on a panel.",
 "Page-level liturgical-season tinting via a new --season-tone variable: Great Lent burgundy, Holy Week deep violet, Bright Week paschal white-gold, Apostles' Fast olive, Dormition Fast marian blue, Nativity Fast indigo, Pre-Lent quiet ochre. Affects only the vignette overlay; body text stays paper.",
 "Bilingual headpiece above the month grid: a wider three-cross ornament SVG (`components/calendar/OrnamentHeadpiece.tsx`) sits above 'ΜΑΪΟΣ · 2026' in Greek capitals + the English display-serif month/year. Real-book headpiece, not a dashboard section divider.",
 "Colophon at the foot of the page (`components/calendar/Colophon.tsx`) replacing the bordered footnote: 'Glory to God for all things.' / a small gold cross / 'Through the prayers of our holy fathers…' in display-serif italic, with the Greek dismissal underneath.",
 "Old / New calendar toggle restyled as an inline kalendrium header, gold-underlined active label, dot separator, no pill chrome. New `lib/calendar/tone.ts` helpers `seasonTone(season)` and `calendarPageVars(tone, season)` cleanly set both `--tone` and `--season-tone` on the page wrapper.",
 "Footer version stamp + home chip + /whats-new chip step to v5.2.",
 ],
 },
 {
 version: "v5.1",
 kind: "The illuminated calendar",
 date: "May 22, 2026",
 blurb:
 "The calendar has been rebuilt from the ground up to look like what it is, a window onto the Church's year. The day of the feast now stands in an illuminated panel, the saint's icon lit within a halo of light; the month reads like an illuminated page, each day glowing in its own liturgical colour, gold for feasts, deep red for the strict fasts, green for the days of release. And every day of the year now carries its full company of saints.",
 items: [
 "A bold redesign of the whole calendar page in an Orthodox, 'hallowed' register: the ornate display serif for the feast names, gold ornament rules drawn around a three-bar Cross, and the saint of the day lit by a soft lampada glow.",
 "A bespoke icon set drawn for the calendar, a haloed disc, a vigil lamp, grapes, a fish, and a sheaf of wheat, now mark feasts and the fasting rule in place of plain coloured dots.",
 "Liturgical colour: the page quietly takes the tone of the day, gold on feasts and ordinary days, crimson on strict and fasting days, green when the fast is released. Colour is always paired with an icon and a word, never alone.",
 "The month grid was reimagined: today glows like a lit lamp, feasts carry a gold Cross, and each day shows its fast at a glance.",
 "Every day of the year now lists its full commemorations, more than six hundred saints and feasts across the calendar, where many days once named only one.",
 "All of it stays fast and faithful to the reckoning: the New and Old (Julian) calendars, the fasting rules, and the day's appointed readings are unchanged underneath.",
 ],
 },
 {
 version: "v5.0",
 kind: "A major release",
 date: "May 21, 2026",
 blurb:
 "v5.0 opens the Scriptures wider. You can now read the New Testament in the New King James, New International, or New Living translation, shown exactly as published; and on the public-domain text the Greek now sits word-for-word beside the English, each word linked to its original. St. Athanasius the Great's profile is complete, with six of his works readable in full. And Purify is now free for good, the last of the old commerce gone. Whether you read in plain modern English or trace the Greek behind it, the Fathers are never far.",
 items: [
 "Three modern translations in the reader: the New King James (NKJV), New International (NIV), and New Living (NLT), fetched live and shown exactly as published, footnotes and all, with the publisher's copyright and a link, an API.Bible citation, and usage reporting, under the American Bible Society and Biblica license.",
 "A bidirectional Greek interlinear on the New Testament (public-domain KJV): hover an English word to light its matching Greek word, or hover the Greek to light the English, occurrence-aware so repeated words pair to the right one.",
 "The licensed translations are typeset with care: poetry set as verse, the words of Christ in red, the divine Name in small capitals, and footnotes and cross-references gathered into a tidy panel at the foot of the chapter rather than scattered through the text.",
 "Your reading font and size now apply to every translation, modern or ancient.",
 "St. Athanasius the Great's profile is now complete: a fuller life, eight sourced sayings, and six works readable in full, On the Incarnation, Against the Heathen, the Four Discourses Against the Arians, On the Nicene Definition, On the Councils, and his Life of Antony, which now also sits on St. Anthony the Great's page.",
 "Purify is now, and will remain, entirely free. The pricing tier and the commercial marketplace are gone, leaving only the prayers, the Scriptures, and the saints.",
 "Bible pages now ask AI crawlers not to scrape the Scriptures, and a private Live View dashboard lets the team see visits in real time without tying any of it to who is reading what.",
 "A careful quality pass under the hood: every linter warning cleared, the reader's highlights, notes, and bookmarks rebuilt on a steadier footing, and a copyrighted translation quietly replaced with its public-domain edition.",
 ],
 },
 {
 version: "v4.0",
 kind: "A major release, welcome",
 date: "May 20, 2026",
 blurb:
 "If you're just arriving: welcome, we're so glad you're here. v4.0 is the biggest step Purify has taken, a whole season of work gathered into one release. The Bible reader now carries St. John Chrysostom verse-by-verse through fourteen books of the New Testament; the Saints section has grown, gained a search bar, and added an 'In his own words' collection of quotations; and the whole app has been warmed and tidied so it feels less like software and more like a place to pray. Whether you've been here since the early days or opened Purify for the first time today, make yourself at home.",
 items: [
 "Patristic commentary across 14 New Testament books: over 2,000 verse-by-verse notes from St. John Chrysostom now sit beside Scripture in the study rail and the mobile sheet, covering John, Acts, Romans, 1 and 2 Corinthians, Ephesians, Philippians, Colossians, 1 and 2 Thessalonians, 1 and 2 Timothy, Titus, Philemon, and Hebrews.",
 "Seventeen of Chrysostom's works now read in full on his profile, including the complete homily series on Romans, Hebrews, the Corinthian letters, and the Pastoral Epistles, plus his Homilies on the Acts of the Apostles.",
 "'In his own words': a new quotations section on the saint profiles, drawn straight from the Fathers' writings, with each line linking back to the homily it comes from.",
 "Five new saints in the calendar of lives, each with a traditional Byzantine icon: St. Marina the Great-Martyr, St. Hermione of Ephesus, St. Isidora of Tabenna, St. Olympias the Deaconess, and St. Gregory of Nyssa.",
 "A search bar for the Saints section: start typing to jump straight to a saint or one of their writings.",
 "When one Father has several commentaries on a single verse, they now gather under his name, each kept as its own card so nothing runs together.",
 "A daily word, a verse of Scripture or a saying of the Fathers, now greets you on the home page; and a small gold mark shows at a glance which books of the Bible carry the Fathers' commentary.",
 "A gentler, more settled look throughout: a unified palette, a hand-drawn cross in place of stray symbols, clearer icons, and tidier typography across every page.",
 ],
 },
 {
 version: "v3.10",
 kind: "St. John Chrysostom's complete Homilies on John",
 date: "May 19, 2026",
 blurb:
 "The single largest body of patristic text in the app so far. St. John Chrysostom's eighty-eight Homilies on the Gospel of John, preached at Antioch around 391 and the longest patristic treatment of any New Testament book, are now imported in full from the public-domain Nicene and Post-Nicene Fathers (Series 1, Vol. 14, ed. Schaff). The complete homilies read on Chrysostom's work page, and the same text is split verse-by-verse into the Bible reader: open any chapter of John and Chrysostom's exposition now sits in the study rail (and the mobile commentary sheet) next to the verse he is preaching on, alongside the other Fathers already there.",
 items: [
 "All 88 homilies imported verbatim to /saints/john-chrysostom/homilies-on-john, the work is no longer a 2-section stub.",
 "Verse-by-verse commentary across all 21 chapters of John (579 Chrysostom notes), keyed to the verse each passage expounds via the homilies' own 'Ver. N' section markers.",
 "Merge-not-clobber: the existing notes from Augustine, Cyril, Gregory the Theologian, Athanasius, and Irenaeus are preserved; only the older placeholder Chrysostom summaries were replaced.",
 "New scripts/ingest-chrysostom-john.mjs parses the NPNF1-14 plaintext: slices the John block from the Hebrews homilies, strips footnote markers and paragraph bullets, rebuilds paragraphs, and emits both the work JSON and the per-chapter commentary JSON.",
 "Commentary cards (study rail + mobile sheet) now render multi-paragraph notes with proper paragraph breaks.",
 "Long-work performance: works with 20+ sections (like the 88 homilies) now render as an accordion, each homily's text mounts only when opened, so the page stays responsive on mobile. The table of contents opens and scrolls to any homily.",
 ],
 },
 {
 version: "v3.9",
 kind: "Mobile Bible reader, UI cleanup",
 date: "May 19, 2026",
 blurb:
 "Three mobile cleanups on the chapter page. (1) The control row above the search bar no longer wraps awkwardly, Translation and Book share row one, and the Interlinear pill and gear sit on a clean row two. (2) The five per-verse action buttons (highlight, copy, bookmark, note, clear-words) no longer crowd the verse text on mobile; they now live in a floating contextual toolbar that appears on a long-press of the verse, like the iOS contextual bar, and dismisses on outside-tap. (3) When Interlinear is on, the Greek now sits next to the English on mobile in two columns (where the action buttons used to be) instead of stacking below.",
 items: [
 "Header row reflow: Translation + Book switchers share the top row at flex-1; on mobile a second row carries the Interlinear pill (when NT) and the gear menu. No more flex-wrap jaggedness.",
 "Interlinear toggle un-buried: previously only reachable through the gear menu on mobile, now a first-class pill next to it.",
 "Per-verse desktop toolbar hidden on mobile (`hidden md:flex`); desktop hover-reveal behaviour is unchanged.",
 "New MobileVerseToolbar component: a pill-shaped floating action bar at the bottom of the viewport with highlight / clear-words / copy link / bookmark / note buttons, each h-11 w-11. Opens on long-press of the verse paragraph. Dismisses on outside tap, Escape, or after any action fires.",
 "Long-press gesture (added in v3.7) now opens the toolbar instead of entering a word-range select-mode. The v3.7 fix is preserved: a tap is a no-op, and a tap-then-scroll never commits a highlight.",
 "Word-level drag-to-highlight on touch is dropped, the popup's whole-verse highlight covers the primary mobile use case. Desktop mouse-drag highlighting is unchanged.",
 "Interlinear render: switched from `grid-cols-1 md:grid-cols-2` to `grid-cols-2 gap-x-3 md:gap-x-6` so English | Greek are side-by-side on every viewport when Interlinear is on.",
 "Stability fix: the Translation/Book switchers no longer stretch to equal widths (dropped the flex-1 wrappers), so they sit at their natural content width and don't shift around. The Reader gear button now reserves the space for its gold interlinear dot, so toggling interlinear no longer nudges the button.",
 ],
 },
 {
 version: "v3.8",
 kind: "Cleaner Koine ↔ English",
 date: "May 19, 2026",
 blurb:
 "When you hover a Greek word, the matching English word now lights up reliably across the whole New Testament. The kaiserlik/kjv public-domain source we use for the English Strong's tags has gaps on the trailing word of many verses (Matthew 1:1's 'Abraham.' was the canonical case the user surfaced, Ἀβραάμ in the Greek column was not lighting up the English 'Abraham' in v1, even though it worked perfectly in v2 and v17). v3.8 ships a recovery pass that back-fills the missing tags using already-tagged occurrences of the same word elsewhere in the chapter. 2,629 trailing-word Strong's numbers recovered.",
 items: [
 "New scripts/patch-english-strongs.mjs walks every NT chapter, builds a per-chapter map of normalized-word → Strong's from already-tagged tokens, and back-fills any untagged token whose normalized form has an unambiguous Strong's in the same chapter (one Strong's, or one Strong's accounting for ≥ 90% of ≥ 3 observations).",
 "Conservative recovery: a stopword list of about 80 English connectors ('of', 'the', 'and', 'to', 'in', 'for', 'is', 'was', 'his', 'her', and the rest) is skipped, these recur with too many different Strong's numbers (each translating a different Greek genitive or article) to disambiguate from surface form alone. Proper nouns and content words are the primary targets, where the recovery is high-confidence.",
 "NT-wide second pass: for capitalized untagged tokens whose chapter map is too thin (short books like 2 John, Philemon, Jude), an aggregated NT-wide map is consulted. Catches proper nouns that only appear once in their home chapter.",
 "Matthew 1:1: trailing 'Abraham.' now tags G11. Hover Ἀβραάμ in the Greek column and the English Abraham lights up. The same fix lands across the New Testament, Babylon: in Matt 1:11, Aram; in Matt 1:3, wife: in Matt 1:24, God, at the close of several Romans 1 verses, and many more.",
 "Patch results: 2,629 tokens recovered across 259 NT chapters. Matthew +434, Luke +399, Acts +403, John +363, Mark +238, Romans +194, Revelation +187. Books that were already clean (Philippians, 1 Thessalonians, the Timothies, the Petrines, the Johannines) were left untouched.",
 "fetch-tagged-kjv.mjs runs the recovery automatically at the end of every fresh fetch, and its sanity check now fails the build if any chapter has more than 15% untagged content tokens after recovery. The existing artifact-scrubber (no <em>, no stray G####] fragments) is unchanged.",
 "Footer version stamp + home chip + whats-new chip all step to v3.8.",
 ],
 },
 {
 version: "v3.7",
 kind: "Mobile Bible reader, highlight fix and commentary popup",
 date: "May 19, 2026",
 blurb:
 "Two real mobile problems in the Bible reader, fixed. (1) The verse highlight system used to fire on every tap, tap a word and scroll, and that word got highlighted. The gesture is now long-press to enter select-mode (with a subtle haptic and a faint gold halo on the verse), then drag to extend the range, lift to commit. A pure tap, or a tap that turns into a scroll, is a no-op. (2) On mobile, patristic commentary used to be a collapsed `<details>` block at the bottom of the chapter, hard to tie to a specific verse. The verse-number badge for any verse with commentary now opens a bottom sheet showing exactly that verse's Father notes, with a backdrop tap or Escape to dismiss. Desktop's sticky right rail is untouched.",
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
 kind: "Icon-corner polish, monochrome cross, hero declutter, donate links",
 date: "May 19, 2026",
 blurb:
 "A small follow-up patch on top of v3.5. The home Icon Corner card drops its gold frame and candle-glow in favour of a pure black-and-white card with a proper three-bar Orthodox cross (gradient-filled beams with a soft drop-shadow), not a stick drawing. The home hero loses its Paschal greeting line and the Daily Wisdom strip, the page reads quieter. The Nahum 1:7 citation in the white Scripture break is now a real link into /bible/nahum/1#v7. Pricing is removed from the in-app secondary nav; Support takes its place. The Support page adds Cash App ($venkeshi) and PayPal (paypal.me/edgaraugustin) and drops the Monthly supporter and Direct (zero-fee) cards.",
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
 kind: "Prayer section, whole new revision with Byzantine icons",
 date: "May 19, 2026",
 blurb:
 "The /prayers hub is rebuilt from the ground up around traditional Byzantine icons. Eight icons sourced from Wikimedia Commons, all public domain, mostly 12th-15th century, give every section of the page a real visual anchor. The hero now opens with the Sinai Christ Pantocrator (6th c.) as a backdrop and a display-serif 'Pray without ceasing.' over it. The Morning Rule card carries an Anastasis icon; the Evening Rule, the Vladimir Theotokos. The Jesus Prayer becomes a contemplative panel with the Pantocrator at the top and the prayer set as a three-line chant. The four Liturgical Hours each get their themed icon: Christ Enthroned for the First, Pentecost for the Third, the Sinai Crucifixion for the Sixth, the Entombment for the Ninth. Akathists is anchored by the Theotokos; Learn to Pray by the Three Hierarchs. /prayers/today picks up the same vocabulary on its rule cards. The page reads as a prayer hub, not a dashboard.",
 items: [
 "Nine icon slots, eight unique JPGs at public/icons/prayer/: christ-pantocrator (Sinai 6c), anastasis (1500s Russian), theotokos-of-vladimir (12c Constantinople), christ-enthroned (13c Tretyakov), pentecost (1420s Sergiev Posad), crucifixion (Sinai 12c), entombment (15c Tretyakov), three-hierarchs (Novgorod pre-1917). All public domain or PD-Art, resized to max 800px long-side with sharp + mozjpeg, 30-145 KB each.",
 "New lib/prayers/icons.ts registry, slug → title, alt, src, source attribution. Server-safe.",
 "New components/prayers/PrayerIcon.tsx, same Orthodox-frame chrome as SaintIcon (gold inner frame, warm-brown outer border), sized for thumbnail / section anchor / centerpiece / full-bleed hero. Progressive JPEG fade-in.",
 "/prayers hero: full-width section with Christ Pantocrator photo behind a top-to-bottom dark gradient. Display-serif 'Pray without ceasing.' headline + 1 Thess 5:17 attribution. The day strip (date · saint · fast · Pascha) sits at the bottom of the hero like a candle in front of the icon.",
 "/prayers body organised into named chapters with eyebrow + display-serif h2 headers: Today, The Daily Rules, The Prayer of the Heart, The Hours, The Akathists, Learn to Pray. Vertical rhythm is space-y-20 between chapters, the page reads top-to-bottom as a real prayer book hub.",
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
 kind: "Big patch, prayer reset, Bible chrome, live funding, Discord",
 date: "May 18, 2026",
 blurb:
 "A chunky release across the site. The Jesus Prayer counter retires; the bead-counting page goes and the home/today references repoint to the learning lesson that teaches the prayer itself. The /prayers hub is rebuilt as a real daily-prayer home with a date+saint+fast strip at the top, bigger Morning/Evening rule cards, an honest Akathists placeholder, and a Hours preview. The Bible reader chrome consolidates: Interlinear sits next to the font controls on one row, search gets the full width below, and a new sticky chapter header keeps you oriented as you scroll. The end-of-chapter pager grows into a real 'continue reading' tile. The /support funding counter now pulls live totals from Buy Me a Coffee's Developer API and falls back gracefully to the static number if the token is missing. The buymeacoffee.com/purify link moves to buymeacoffee.com/purifyapp. A Discord server is wired in, footer column, footer community strip, About page section, and a community card on /support. The home Icon Corner card is rebuilt: photo-anchored when the day's saint has an icon, clean typographic when it doesn't, no more '+' placeholder over a wood gradient.",
 items: [
 "Jesus Prayer counter retired: /prayers/jesus-prayer page, JesusPrayerCounter, and JesusPrayerTodayBadge are gone. The Today page now shows a quiet card with the prayer text and a 'Learn how →' link to /prayers/learning/jesus-prayer. The home category pill and the home challenge card both repoint to the learning lesson. Streak counters on Morning + Evening rules stay (those count rule completions, not beads).",
 "/prayers/jesus-prayer → /prayers/learning/jesus-prayer 308 redirect in next.config.ts so old bookmarks land on the lesson.",
 "/prayers hub redesigned: a date+saint+fast strip card under the hero, the existing gold Today CTA below it, two larger Morning/Evening rule cards that summarise their contents, an Akathists placeholder card with an honest 'notify me' mailto, the Learn-to-Pray accent card, a 4-card Hours preview (First/Third/Sixth/Ninth) with their traditional themes, and a soft sign-in nudge at the foot.",
 "Bible reader chrome: Translation + Book on the left of row one, Font-Size + Font-Family + Interlinear clustered on the right of the same row, BibleSearch full-width on row two. Less visual noise, faster scan.",
 "New ChapterStickyHeader: a thin bar fixes below the navbar once you scroll past the chapter title, showing 'Matthew 3 · v 7 of 17'. The verse number updates via IntersectionObserver so the orientation is always live. Replaces the mobile context strip in ReadingProgressBar.",
 "Chapter h1 shrinks from 44-56px to 36-44px so the verses get more room above the fold.",
 "End-of-chapter pager: the next chapter becomes a big tile-style 'Continue reading' card with the next book/chapter heading and a serif title. Previous chapter is a smaller back-link below. Cross-book navigation lives in a small footer row.",
 "/support funding counter pulls live totals from the Buy Me a Coffee Developer API. New lib/support/buymeacoffee.ts fetches current-month one-time supporters + active subscription monthly value and caches for five minutes via Next.js fetch revalidate. /api/support/bmc proxies the same data for curl/debug. Falls back to the static SUPPORT.monthlyRaisedUsd when BMC_ACCESS_TOKEN isn't set, so the page never breaks.",
 "Buy Me a Coffee URL: buymeacoffee.com/purify → buymeacoffee.com/purifyapp.",
 "/support gains an 'Or join the community' Discord card in Discord-purple (#5865F2) alongside the donate links.",
 "Discord across the site: Footer 'About this work' column gains a Discord link with an ↗ external glyph; a community strip above the copyright invites Discord directly; About page picks up a Community section between 'Who is behind this' and 'Money'.",
 "Home Icon Corner card rebuilt. Two render modes: (1) when today's saint has an iconUrl the JPG fills the upper portion of the card as a real background with a dark gradient overlay, like a real icon corner with the icon present; (2) when no icon is indexed, a clean typographic stack, date, saint name, fast pill, Pascha countdown, CTA, with no '+' placeholder and no decorative gold. The old wood gradient + candle-glow are gone.",
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
 "New /saved page lists every bookmark, verses, chapters, and saint writing sections, grouped by kind, newest first. Tap a row to open it. Remove with the × button. Empty state explains the gestures.",
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
 "A polish sweep across what shows up in browser tabs, search results, and social-share cards. The 'FAQ - Purify | Purify' double-suffix that the title template was producing on every page gets fixed. Two guessable URLs, /prayer and /scripture, that used to 404 now redirect to /prayers and /bible. Real icons land for the three new saints from v2.5 (Apostle Paul, Mary of Egypt, Nicholas the Wonderworker) whose iconUrl pointed to JPGs that didn't exist yet. Plus the Greek interlinear's alignment fix so hovering a Greek word lights the right English phrase, the Bible reader gets a custom right-click menu (copy verse, copy as quote, copy reference, copy link, highlight, note, bookmark, open commentary), and the search bar now accepts verse ranges like James 2:14-26 with arrival-time highlighting of the whole span. The saint writing reader gains a clearer separation between editorial framing and the saint's own words for the v2.5 entries that mixed the two.",
 items: [
 "Strip the redundant ' - Purify' suffix from every per-page metadata.title so the root layout's '%s | Purify' template stops producing 'FAQ - Purify | Purify' on 22 routes.",
 "Backfill descriptions on eight placeholder/stub pages (account, campaigns, marketplace + 3 sub-pages, pricing, prayers/personal) so social shares stop falling back to the generic root description.",
 "Add 308 permanent redirects: /prayer → /prayers and /scripture → /bible. Anyone guessing the singular form lands on the right page.",
 "Real public-domain icons for the three v2.5 saints whose JPGs were missing: Andrei Rublev's Saint Paul (1407), a 19th-century Russian Mary of Egypt, and a 14th-century Yaroslavl St. Nicholas. All resized to the existing 800px / quality-82 / mozjpeg pattern.",
 "Interlinear alignment bug: hovering the 2nd Greek υἱοῦ used to light the wrong 'son' because the English token occurrence counter was counting filler words ('the', 'of') as separate occurrences of the same Strong's number. Now consecutive tokens that share a Strong's are one span sharing one occurrence index, so the Nth Greek word always maps to the Nth English phrase, not the Nth English token.",
 "Right-click any Bible verse for a custom context menu: Copy verse, Copy as quote, Copy reference, Copy link, Highlight, Add note, Bookmark verse, Open commentary. Native menu is preserved when you have text selected so 'Copy' on a selection still works.",
 "Bible search accepts verse ranges: 'James 2:14-26' parses, the dropdown shows the range with verse count, the URL becomes /bible/james/2#v14-26, and on arrival the whole 14..26 span pulses gold for 1.6 seconds.",
 "Multi-word Greek-hover highlights now bridge the inter-word space, so hovering Βίβλος lights 'The book' as one continuous gold pill instead of two separated chips.",
 "Saint writing reader gains optional framing (editor's intro shown above the text with an 'Editor's note' eyebrow) and citation (source attribution gold eyebrow over the paragraphs). Used by Paul's letter-from-the-prison sections (KJV verses), Nicholas's troparion, and Mary of Egypt's life (where the paragraphs are a retelling, framing acknowledges it, no citation is set).",
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
 v6.0 &middot; A major release: the Councils, at last
 </p>
 </div>

 <h1 className="font-sans text-[40px] md:text-[56px] font-bold leading-[1.05] tracking-[-0.025em] text-paper">
 The Faith confessed by the Fathers in council, in their own words.
 </h1>

 <p className="mt-8 font-serif text-[19px] md:text-[20px] text-paper/85 leading-[1.7]">
 If you are new here, welcome. We&rsquo;re so glad you came.
 v6.0 is a major release, the largest content step Purify has taken
 since v5.0 a week ago, and the one that brings the Councils
 section to a place where it can stand on its own. The{" "}
 <Link href="/councils" className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper">councils</Link>{" "}
 section now holds four of the Seven Ecumenical Councils in full profile,
 each with the historical narrative that produced it, the principal
 Holy Fathers cross-linked to their saint pages, the principal
 opposing parties named honestly, and the conciliar documents
 themselves readable in full from the public-domain Schaff &amp;
 Wace edition of the Nicene and Post-Nicene Fathers.
 </p>

 <p className="mt-5 font-serif text-[19px] md:text-[20px] text-paper/85 leading-[1.7]">
 Nicaea (325) and Constantinople (381) ship complete: the Creed of
 each, the Synodal Letter of each, and the Canons of each. Ephesus
 (431) and Chalcedon (451) ship with their Canons, the disciplinary
 backbone of the Patristic age: the Theotokos-affirming canons of
 Ephesus, the famous Chalcedonian thirty including Canon XXVIII on
 the precedence of New Rome. Their dogmatic Definitions, the
 Christological charters Eastern Orthodoxy has rested on for
 sixteen centuries, are the next workstream and will land in the
 coming days. Three Councils remain after that, and they too will
 come.
 </p>

 <p className="mt-5 font-serif text-[19px] md:text-[20px] text-paper/85 leading-[1.7]">
 Twelve new saints joined the registry on the way. Every named
 principal Father of the first two Councils now has his own profile:
 the Emperor St. Constantine the Great and the Empress St. Helena;
 St. Alexander of Alexandria who deposed Arius; St. Hosius of
 Cordova, the elder of the West; St. Eustathius of Antioch, the
 confessor of the Eastern tradition; St. Spyridon of Trimythous,
 with the brick miracle at Nicaea; St. Theodosius the Great, who
 closed the Arian century and convened the Second Council; St.
 Meletius of Antioch, thrice exiled and presider over the Second
 Council until his death there; St. Cyril of Jerusalem and his
 Catechetical Lectures; St. Nectarius, the unbaptized senator made
 bishop of Constantinople in a single day; St. Diodore of Tarsus,
 the teacher of Chrysostom; and St. Epiphanius of Salamis, whose
 Ancoratus preserves the baptismal creed scholars hold as a
 near-cousin of the Niceno-Constantinopolitan Symbol. Plus St.
 Gregory Palamas, the Archbishop of Thessaloniki and defender of
 hesychasm.
 </p>

 <p className="mt-5 font-serif text-[19px] md:text-[20px] text-paper/85 leading-[1.7]">
 On contested questions Purify keeps the principled posture the
 <Link href="/about" className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"> /about</Link> page already sets out. Where the Fathers spoke with
 one voice (the Definition and the Creed of each Council) we serve
 their text verbatim. Where later traditions differ on the reception
 of a Council, we name the difference, surface the standard Eastern
 Orthodox position, and direct the reader to their own priest. The
 Filioque clause that the West would later add to the Creed of 381
 is named for what it is: not in the original Greek and never part
 of the Creed as the Orthodox Church receives and recites it. The
 post-Chalcedonian separation of the Oriental Orthodox Church is
 named honestly as a historical fact and not adjudicated.
 </p>

 <p className="mt-5 font-serif text-[19px] md:text-[20px] text-paper/85 leading-[1.7]">
 The promise underneath has not moved. Purify is free. It is
 ad-free. There is nothing to buy and no one to track you, only
 prayer, Scripture, the saints, the Councils, and the year of the
 Church laid out plainly. Pray with the Church. Read with the
 Fathers. Walk the year. We&rsquo;re honored you would do any of
 it with us.
 </p>

 <p className="mt-5 font-serif text-[19px] md:text-[20px] text-paper/85 leading-[1.7]">
 The promise underneath has not moved. Purify is free. It is
 ad-free. There is nothing to buy and no one to track you, only
 prayer, Scripture, the saints, the Councils, and the year of the
 Church laid out plainly. Pray with the Church. Read with the
 Fathers. Walk the year. We&rsquo;re honored you would do any of
 it with us.
 </p>

 <p className="mt-5 font-serif text-[19px] md:text-[20px] text-paper/85 leading-[1.7]">
 The full release-by-release log lives below, grouped by date and
 collapsed by default. Pop one open when you want the detail.
 </p>

 {/* Closing + signature */}
 <div className="mt-16 pt-10 border-t border-paper/10">
 <p className="font-serif text-[19px] md:text-[20px] text-paper/85 leading-[1.7]">
 Thank you for staying with us through six majors. Glory to God
 for all things.
 </p>

 <p
 className="mt-10 font-serif italic text-[20px] md:text-[22px] tracking-wide text-gold"
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
