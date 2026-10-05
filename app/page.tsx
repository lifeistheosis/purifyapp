import Link from "next/link";
import Image from "next/image";
import { DesktopInstallCTA } from "@/components/pwa/DesktopInstallCTA";
import { Navbar } from "@/components/nav/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroChristIcon } from "@/components/marketing/HeroChristIcon";
import { WhatsNewChip } from "@/components/marketing/WhatsNewChip";
import { MadeOfStrip } from "@/components/marketing/MadeOfStrip";
import { AppsSection } from "@/components/marketing/AppsSection";
import { MobileHeroPhone } from "@/components/marketing/MobileHeroPhone";
import { PhoneStoreAsk } from "@/components/marketing/storeBits";
import { HomeSectionScroller } from "@/components/marketing/HomeSectionScroller";
import { TodayMobileV3 } from "@/components/today/TodayMobileV3";
import { MobileTabBar } from "@/components/nav/MobileTabBar";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { getServerLocale } from "@/lib/i18n/server";
import { getMessages, t } from "@/lib/i18n";
import { numberToWordsCapitalized } from "@/lib/i18n/numberWords";
import { SAINTS } from "@/lib/saints/saints";
import { WebOnly, NativeOnly } from "@/components/platform/PlatformGate";

// Single source of truth for the saints corpus size: derive it from the
// data so the home copy can never drift from what /saints actually renders.
const SAINT_COUNT = SAINTS.length;

// ISR so the live home-page surface (Today card, daily wisdom, season
// banner, paschal greeting) refreshes daily without a redeploy.
export const revalidate = 3600;

// Four pillars, equal billing, Scripture, Saints, Calendar, Prayer.
const features = [
 {
 title: "Read with the Fathers",
 body: "The Septuagint and the King James, the Greek beside the English, with the Fathers verse by verse across twenty-three books: Chrysostom on the Gospels and Epistles, Augustine on every psalm, Basil on the six days.",
 },
 {
 title: "Lives of the saints",
 body: `${numberToWordsCapitalized(SAINT_COUNT, "en")} profiles, with their writings to read in full, from Chrysostom and Athanasius to the Theotokos and the desert fathers.`,
 },
 {
 title: "The Sacred Calendar",
 body: "Every day of the Church's year, the saint and the fast, in the New and Old (Julian) reckoning. The whole menologion at a glance.",
 },
 {
 title: "Prayer that breathes",
 body: "The Morning and Evening Rules, the Jesus Prayer, and the prayers that have carried Christians for sixteen centuries.",
 },
];

const featuresDe = [
 {
 title: "Mit den Vätern lesen",
 body: "Die Septuaginta und die King-James-Bibel, das Griechische neben dem Englischen, mit dem heiligen Johannes Chrysostomus Vers für Vers über vierzehn Bücher des Neuen Testaments.",
 },
 {
 title: "Leben der Heiligen",
 body: `${numberToWordsCapitalized(SAINT_COUNT, "de")} Profile, mit ihren Schriften, ganz zu lesen, vom heiligen Chrysostomus und Athanasius bis zur Gottesgebärerin und den Wüstenvätern.`,
 },
 {
 title: "Der heilige Kalender",
 body: "Jeder Tag des Kirchenjahres, der Heilige und das Fasten, in der Neuen und Alten (Julianischen) Reckonung. Das ganze Menologion auf einen Blick.",
 },
 {
 title: "Gebet, das atmet",
 body: "Die Morgen- und Abendregel, das Jesusgebet und die Gebete, die die Christen seit sechzehn Jahrhunderten getragen haben.",
 },
];

// Two per pillar, Scripture, Saints, Calendar, Prayer.
const categories: { label: string; href: string }[] = [
 { label: "The Gospel of John", href: "/bible/john/1" },
 { label: "The Psalter", href: "/bible/psalms/1" },
 { label: "Lives of saints", href: "/saints" },
 { label: "St. John Chrysostom", href: "/saints/john-chrysostom" },
 { label: "The Sacred Calendar", href: "/calendar" },
 { label: "Today", href: "/prayers/today" },
 { label: "Morning prayers", href: "/prayers/morning" },
 { label: "The Jesus Prayer", href: "/prayers/learning/jesus-prayer" },
];

const categoriesDe: { label: string; href: string }[] = [
 { label: "Das Evangelium nach Johannes", href: "/bible/john/1" },
 { label: "Der Psalter", href: "/bible/psalms/1" },
 { label: "Leben der Heiligen", href: "/saints" },
 { label: "Hl. Johannes Chrysostomus", href: "/saints/john-chrysostom" },
 { label: "Der heilige Kalender", href: "/calendar" },
 { label: "Heute", href: "/prayers/today" },
 { label: "Morgengebete", href: "/prayers/morning" },
 { label: "Das Jesusgebet", href: "/prayers/learning/jesus-prayer" },
];

const challenges: {
 eyebrow: string;
 title: string;
 body: string;
 href: string;
}[] = [
 {
 eyebrow: "Sixteen centuries of reading",
 title: "Read the Gospel with Chrysostom",
 body: "Open the Gospel of John and the eighty-eight homilies of St. John Chrysostom read along with you, verse by verse, in the study rail.",
 href: "/bible/john/1",
 },
 {
 eyebrow: "40-day journey",
 title: "Great Lent with the Fathers",
 body: "Walk the great fast with the saints who shaped its services. Each Sunday names a Father; each week names a theme.",
 href: "/calendar",
 },
 {
 eyebrow: "The prayer of the heart",
 title: "Learn the Jesus Prayer",
 body: "A short prayer that has carried Orthodox Christians for sixteen centuries. Pray it in the breath; the bringing-back is half the work.",
 href: "/prayers/learning/jesus-prayer",
 },
];

const challengesDe: {
 eyebrow: string;
 title: string;
 body: string;
 href: string;
}[] = [
 {
 eyebrow: "Sechzehn Jahrhunderte des Lesens",
 title: "Das Evangelium mit Chrysostomus lesen",
 body: "Schlag das Evangelium nach Johannes auf, und die achtundachtzig Homilien des heiligen Johannes Chrysostomus lesen mit dir, Vers für Vers, in der Studienspalte.",
 href: "/bible/john/1",
 },
 {
 eyebrow: "Vierzigtägige Reise",
 title: "Die große Fastenzeit mit den Vätern",
 body: "Geh das große Fasten mit den Heiligen, die seine Gottesdienste geprägt haben. Jeder Sonntag nennt einen Vater; jede Woche nennt ein Thema.",
 href: "/calendar",
 },
 {
 eyebrow: "Das Gebet des Herzens",
 title: "Lerne das Jesusgebet",
 body: "Ein kurzes Gebet, das orthodoxe Christen seit sechzehn Jahrhunderten getragen hat. Bete es im Atem; das Zurückbringen ist die halbe Arbeit.",
 href: "/prayers/learning/jesus-prayer",
 },
];

// Each section: full viewport min-height, snap-aligned, flex-centered.
// pt offsets the 72px sticky navbar so content centers in the visible area.
// Padding tightened ~20% as part of the v6.1.1 home polish (less shouty).
// On a phone each section is one screen: the small viewport height (the
// browser's bars showing) less the header, which the snap offset in
// app/globals.css ([data-phone-pages]) keeps above it.
const sectionBase =
 "snap-start min-h-[calc(100svh-72px)] md:[min-height:100dvh] flex items-center px-5 md:px-8 pt-8 md:pt-14 pb-8 md:pb-10";

// Sections the phone front page leaves out. The owner, 2026-09-30: "i said
// only 4", counting the footer, and "remove the verse". So a phone gets the
// download, the four pillars and the reviews with the download again, then
// the footer. The desktop keeps every section.
const desktopOnly = "max-md:hidden";

export default async function Home() {
 const locale = await getServerLocale();
 const isDe = locale === "de";
 const m = getMessages(locale);
 const homeFeatures = isDe ? featuresDe : features;
 // One custom illustration per pillar, keyed by index to homeFeatures:
 // Scripture (Fathers/LXX-KJV), saints, calendar, prayer.
 const featureIcons = [
 { src: "/fathers_widget_v2.png", alt: "" },
 { src: "/saint_widget_v2.png", alt: "" },
 { src: "/calendar_widget_v2.png", alt: "" },
 { src: "/pray_widget_v2.png", alt: "" },
 ];
 const homeCategories = isDe ? categoriesDe : categories;
 const homeChallenges = isDe ? challengesDe : challenges;
 return (
 <>
 {/* This document is the front door's. Inside the apps the shell hands it
 over for EVERY address, so when the app comes up on some other address
 this mark is how it knows the screen it drew is not the one that was
 asked for (lib/nav/entry.ts, read by NativeBridge). On the website an
 inner address gets its own page, which has no such mark. */}
 <span hidden data-front-door="" />
 {/* NATIVE app shell: the Today hero + bottom tab bar. Absent from the
 web (mobile or desktop), which gets the marketing site below. */}
 <NativeOnly>
 {/* No safe-pt: TodayMobileV3's header (MobileTopTabs) is `sticky top-0`
    and owns the status-bar inset itself, clearing the bar at rest AND when
    pinned on scroll. Adding safe-pt here too double-padded the top. */}
 {/* data-route-content: the target of the route-exit fade. It has to be
    a SIBLING of MobileTabBar, never an ancestor, so the bar does not fade
    with the content and the selected tab answers a tap immediately. See
    lib/ui/routeTransition.ts. */}
 <div data-route-content className="flex-1 safe-pb">
 <TodayMobileV3 />
 </div>
 <MobileTabBar />
 </NativeOnly>

 {/* WEB (mobile + desktop): the responsive marketing home. */}
 <WebOnly>
 <Navbar />
 {/* data-phone-pages: on a phone, the screens below settle one at a
 time (app/globals.css). */}
 <main data-phone-pages className="flex-1">
 {/* HERO. Black-and-white surface (the older blue twilight was
 swapped out for a pure dark register on the v6.1.1 polish);
 the right column now holds a still typographic accent rather
 than a phone-shaped card. */}
 <section
 className={`${sectionBase} relative overflow-hidden max-md:flex-col max-md:items-stretch max-md:pb-0`}
 >
 {/* The hero's own ground, from md. On a phone the first screen sits on
 the page's one ground like the three after it, so no edge shows
 where it ends. */}
 <div
 aria-hidden
 className="lm-hero pointer-events-none absolute inset-0 hidden md:block"
 style={{
 background: [
 // Soft white halo behind the heading, quiet, candle-like.
 "radial-gradient(ellipse 75% 60% at 25% 30%, rgba(255, 255, 255, 0.05) 0%, transparent 65%)",
 // A second, fainter halo near the right column.
 "radial-gradient(ellipse 55% 45% at 80% 70%, rgba(255, 255, 255, 0.03) 0%, transparent 70%)",
 // Pure dark base, true black at the corners settling into night.
 "linear-gradient(180deg, #050505 0%, #0a0a0c 55%, #121214 100%)",
 ].join(", "),
 }}
 />
 {/* Off-canvas cross. Bled off the right edge of the viewport and
 layered behind the copy; clipped by the section's overflow-hidden.
 It used to appear only from xl (1280px), so an iPad, landscape or
 portrait, never showed it (reported 2026-09-27). From md it is
 smaller and further off the edge, and faint where it sits behind
 the heading; from xl it is the full piece, as before. Phones keep
 the plain hero. */}
 <div className="hidden md:block absolute top-1/2 right-0 -translate-y-1/2 translate-x-[30%] opacity-35 lg:translate-x-[12%] lg:opacity-70 xl:-translate-x-[4%] xl:opacity-100 pointer-events-none">
 <HeroChristIcon />
 </div>
 <div className="mx-auto max-w-[1240px] w-full relative z-10 max-md:flex max-md:flex-1 max-md:flex-col">
 <div className="text-paper max-w-[620px]">
 {/* The release chip is for returning readers; a phone's first
 screen is for the download. */}
 <div className="hidden md:block">
 <WhatsNewChip isDe={isDe} />
 </div>
 <h1
 style={{ animationDelay: "240ms" }}
 className="hero-copy-in font-sans text-heading md:text-display-sm lg:text-display font-bold leading-[1.05] tracking-[-0.025em]"
 >
 {t(m, "home.heroH1")}
 </h1>
 <p
 style={{ animationDelay: "340ms" }}
 className="hero-copy-in font-sans text-ui md:text-ui text-paper/85 mt-6 max-w-[520px]"
 >
 {t(m, "home.heroSubtitle")}
 </p>
 {/* On a phone the website's job is the app (the owner, 2026-09-29):
 one button for the visitor's own store, its rating, the other store
 as a line beneath. The desktop keeps its own control below. */}
 <div style={{ animationDelay: "440ms" }} className="hero-copy-in mt-8 md:hidden">
 <PhoneStoreAsk />
 </div>
 {/* "See today" goes through `trailing` rather than sitting here as a
 sibling. The CTA is a column, button over install line, so a sibling in
 a centered row was centered against both and sat below the middle of
 the button. Passed in, it shares a row with the button alone. */}
 <div style={{ animationDelay: "440ms" }} className="hero-copy-in mt-10 hidden md:block">
 <DesktopInstallCTA
 variant="inverse"
 trailing={
 <Link
 href="/calendar"
 className="font-sans text-ui font-medium text-paper/80 hover:text-paper transition-colors"
 >
 {t(m, "home.seeToday")}
 </Link>
 }
 >
 {t(m, "nav.openPurify")}
 </DesktopInstallCTA>
 </div>
 </div>
 <MobileHeroPhone />
 </div>
 </section>

 {/* FEATURES */}
 <section className={`${sectionBase} md:bg-night`}>
 <div className="mx-auto max-w-[1240px] w-full">
 <div className="text-center max-w-[720px] mx-auto mb-7 md:mb-16">
 <p className="max-md:hidden font-sans text-detail font-semibold uppercase tracking-[1.5px] text-paper/60 mb-4">
 {isDe ? "Warum Purify" : "Why Purify"}
 </p>
 <h2 className="font-sans text-title md:text-display-sm lg:text-display font-bold text-paper tracking-[-0.025em] leading-[1.05]">
 {isDe
 ? "Vier Säulen, ein stiller Ort."
 : "Four pillars, one quiet place."}
 </h2>
 </div>
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-6 md:gap-10">
 {homeFeatures.map((f, i) => {
 const icon = featureIcons[i] ?? featureIcons[0];
 return (
 <div key={f.title} className="text-center">
 <div className="mx-auto mb-4 h-18 w-18 flex items-center justify-center md:mb-6 md:h-48 md:w-48">
 <Image
 src={icon.src}
 alt={icon.alt}
 width={192}
 height={192}
 className="lm-invert h-18 w-18 object-contain md:h-48 md:w-48"
 />
 </div>
 <h3 className="font-sans text-lede font-semibold text-paper max-md:text-balance max-md:leading-snug md:mb-3">
 {f.title}
 </h3>
 {/* The titles say it on a phone; the full line is for the desktop. */}
 <p className="max-md:hidden font-sans text-ui text-paper/70 leading-[1.55] md:max-w-[300px] md:mx-auto">
 {f.body}
 </p>
 </div>
 );
 })}
 </div>
 </div>
 </section>

 {/* THE APPS. Purify on iPhone and Android: both stores, their ratings,
     and the app rising into view with the scroll. */}
 <AppsSection className={sectionBase} />

 {/* SCRIPTURE — one verse held on black, like a single illuminated page.
            (Was a full-bleed white band that broke the candlelit palette.) */}
 <section className={`${sectionBase} ${desktopOnly} bg-black text-center lm-band`}>
 <div className="mx-auto max-w-[820px] w-full">
 <p className="font-serif text-title md:text-display-sm leading-[1.15] tracking-[-0.01em] text-paper">
 {isDe
 ? "„Der Herr ist gut zu denen, die auf ihn vertrauen.“"
 : "“The Lord is good to those who trust in him.”"}
 </p>
 <Link
 href="/bible/nahum/1#v7"
 className="lm-ink-gold inline-block mt-7 font-sans text-detail font-semibold uppercase tracking-[1.5px] text-gold/80 hover:text-gold transition-colors underline-offset-4 hover:underline"
 >
 Nahum 1:7
 </Link>
 </div>
 </section>

 {/* CATEGORIES */}
 <section className={`${sectionBase} ${desktopOnly} bg-night`}>
 <div className="mx-auto max-w-[1240px] w-full">
 <div className="mb-12">
 <p className="font-sans text-detail font-semibold uppercase tracking-[1.5px] text-paper/60 mb-4">
 {isDe ? "Wo anfangen" : "Where to begin"}
 </p>
 <h2 className="font-sans text-title md:text-display-sm lg:text-display font-bold text-paper tracking-[-0.025em] leading-[1.05]">
 {isDe ? "Fang an, wo du stehst." : "Begin where you stand."}
 </h2>
 </div>
 <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
 {homeCategories.map((c) => (
 <Link
 key={c.label}
 href={c.href}
 className="block rounded-pill border border-paper/15 bg-paper/[0.04] px-5 py-4 font-sans text-ui font-medium text-paper text-center hover:bg-paper/10 hover:border-paper/30 transition-colors duration-150"
 >
 {c.label}
 </Link>
 ))}
 </div>
 </div>
 </section>

 {/* CHALLENGES */}
 <section className={`${sectionBase} ${desktopOnly} bg-night-soft`}>
 <div className="mx-auto max-w-[1240px] w-full">
 <div className="mb-12">
 <p className="font-sans text-detail font-semibold uppercase tracking-[1.5px] text-paper/60 mb-4">
 {isDe ? "Wege zu gehen" : "Paths to walk"}
 </p>
 <h2 className="font-sans text-title md:text-display-sm lg:text-display font-bold text-paper tracking-[-0.025em] leading-[1.05]">
 {isDe
 ? "Wo möchtest du anfangen?"
 : "Where would you like to begin?"}
 </h2>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 {homeChallenges.map((ch) => (
 <Link
 key={ch.title}
 href={ch.href}
 className="lm-card group block rounded-[28px] p-8 ring-1 ring-inset ring-paper/10 shadow-[0_18px_40px_-16px_rgba(0,0,0,0.5)] transition-transform duration-200 hover:-translate-y-0.5"
 style={{
 background:
 "radial-gradient(115% 90% at 88% 8%, rgba(255,255,255,0.06) 0%, transparent 55%), linear-gradient(155deg, #26262b 0%, #1a1a1d 60%, #151518 100%)",
 }}
 >
 <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-gold/85 mb-4">
 {ch.eyebrow}
 </p>
 <h3 className="font-sans text-lede md:text-lede font-semibold text-paper mb-3">
 {ch.title}
 </h3>
 <p className="font-sans text-ui text-paper/65 leading-[1.6] mb-5">
 {ch.body}
 </p>
 <span className="font-sans text-detail font-medium text-paper/75 group-hover:text-gold transition-colors">
 {isDe ? "Anfangen →" : "Begin →"}
 </span>
 </Link>
 ))}
 </div>
 </div>
 </section>

 {/* What we are made of */}
 <MadeOfStrip className={desktopOnly} />

 {/* FINAL CTA. On a phone the verse's screen closes the page instead. */}
 <section className={`${sectionBase} ${desktopOnly} bg-night`}>
 <div className="mx-auto max-w-[1100px] w-full">
 <h2 className="font-sans text-heading md:text-display lg:text-display-lg font-bold text-paper leading-[1.02] tracking-[-0.03em]">
 {isDe ? "Purify öffnen." : "Open Purify."}
 </h2>
 <p className="mt-5 font-serif text-ui md:text-lede text-paper/75 leading-[1.6] max-w-[640px]">
 {isDe
 ? "Fang an, wo du stehst, bei einem Gebet, beim Heiligen des Tages, bei einem Vers des Evangeliums."
 : "Begin where you stand, at a prayer, at the saint of the day, at a verse of the Gospel."}
 </p>
 <div className="mt-10">
 <DesktopInstallCTA variant="inverse" className="text-body" offerInstall={false}>
 {isDe ? "Purify öffnen" : "Open Purify"}
 </DesktopInstallCTA>
 </div>
 </div>
 </section>
 </main>
 <Footer />
 {/* One-tap "next section" control; advances the full-viewport home
 panels one at a time and flips to back-to-top at the end. */}
 <HomeSectionScroller />
 </WebOnly>
 {/* PWA install prompt: web-only behavior, self-hides inside the app. */}
 <InstallPrompt />
 </>
 );
}
