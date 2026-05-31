import Link from "next/link";
import { ComingSoonCTA } from "@/components/marketing/ComingSoonCTA";
import { Navbar } from "@/components/nav/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SectionScroller } from "@/components/SectionScroller";
import { HeroChristIcon } from "@/components/marketing/HeroChristIcon";
import { SeasonBanner } from "@/components/marketing/SeasonBanner";
import { MadeOfStrip } from "@/components/marketing/MadeOfStrip";
import { Cross } from "@/components/ui/icons/Cross";
import { TodayMobileV3 } from "@/components/today/TodayMobileV3";
import { MobileTabBar } from "@/components/nav/MobileTabBar";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { getServerLocale } from "@/lib/i18n/server";
import { getMessages, t } from "@/lib/i18n";

// ISR so the live home-page surface (Today card, daily wisdom, season
// banner, paschal greeting) refreshes daily without a redeploy.
export const revalidate = 3600;

// Four pillars, equal billing, Scripture, Saints, Calendar, Prayer.
const features = [
 {
 title: "Read with the Fathers",
 body: "The Septuagint and the King James, the Greek beside the English, with St. John Chrysostom verse by verse across fourteen books of the New Testament.",
 },
 {
 title: "Lives of the saints",
 body: "Twenty-four profiles, with their writings to read in full, from Chrysostom and Athanasius to the Theotokos and the desert fathers.",
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
 body: "Sechsundfünfzig Profile, mit ihren Schriften, ganz zu lesen, vom heiligen Chrysostomus und Athanasius bis zur Gottesgebärerin und den Wüstenvätern.",
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
const sectionBase =
 "snap-start md:[min-height:100dvh] flex items-center px-5 md:px-8 pt-16 md:pt-14 pb-12 md:pb-10";

export default async function Home() {
 const locale = await getServerLocale();
 const isDe = locale === "de";
 const m = getMessages(locale);
 const homeFeatures = isDe ? featuresDe : features;
 const homeCategories = isDe ? categoriesDe : categories;
 const homeChallenges = isDe ? challengesDe : challenges;
 return (
 <>
 {/* MOBILE: app-shell Today hero. Hidden on md+ where the marketing
 home below takes over. The hero is wrapped here so the marketing
 sections (rich, long) don't double-load on phones. */}
 <div className="md:hidden flex-1 safe-pb">
 <TodayMobileV3 />
 </div>

 {/* DESKTOP: existing marketing home, unchanged. Hidden on phones. */}
 <div className="hidden md:contents">
 <SectionScroller />
 <Navbar />
 <main className="flex-1">
 {/* HERO. Black-and-white surface (the older blue twilight was
 swapped out for a pure dark register on the v6.1.1 polish);
 the right column now holds a still typographic accent rather
 than a phone-shaped card. */}
 <section
 className={`${sectionBase} relative overflow-hidden`}
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
 >
 <div className="mx-auto max-w-[1240px] w-full grid grid-cols-1 xl:grid-cols-2 gap-12 items-center">
 <div className="text-paper">
 <Link
 href="/whats-new"
 className="group inline-flex items-center gap-2 rounded-pill border border-paper/20 bg-paper/[0.06] px-3 py-1.5 mb-5 hover:bg-paper/10 hover:border-paper/35 transition-colors duration-150"
 >
 <span className="font-sans text-[10px] font-semibold uppercase tracking-[1.5px] px-2 py-0.5 rounded-pill bg-gold text-night">
 {isDe ? "Neu" : "New"}
 </span>
 <span className="font-sans text-[12px] sm:text-[13px] text-paper/85 group-hover:text-paper transition-colors">
 <span className="sm:hidden">v8.1 · The Council Fathers, now saints</span>
 <span className="hidden sm:inline">v8.1 · The Council Fathers of all seven, now saints in their own right</span>
 </span>
 <span className="text-paper/55 group-hover:text-paper transition-colors text-[13px]">
 →
 </span>
 </Link>
 <h1 className="font-sans text-[32px] md:text-[42px] lg:text-[52px] font-bold leading-[1.05] tracking-[-0.025em]">
 {t(m, "home.heroH1")}
 </h1>
 <p className="font-sans text-[14px] md:text-[15px] text-paper/85 mt-4 max-w-[520px]">
 {t(m, "home.heroSubtitle")}
 </p>
 <div className="mt-7 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
 <ComingSoonCTA variant="inverse">
 {t(m, "nav.openPurify")}
 </ComingSoonCTA>
 <Link
 href="/calendar"
 className="font-sans text-[14px] font-medium text-paper/80 hover:text-paper transition-colors"
 >
 {t(m, "home.seeToday")}
 </Link>
 </div>
 </div>
 <div className="hidden xl:flex justify-center items-center">
 <HeroChristIcon />
 </div>
 </div>
 </section>

 {/* Season banner, auto-surfaces during major Orthodox seasons. */}
 <SeasonBanner />

 {/* FEATURES */}
 <section className={`${sectionBase} bg-night`}>
 <div className="mx-auto max-w-[1240px] w-full">
 <div className="text-center max-w-[720px] mx-auto mb-16">
 <p className="font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-paper/60 mb-4">
 {isDe ? "Warum Purify" : "Why Purify"}
 </p>
 <h2 className="font-sans text-[26px] md:text-[36px] lg:text-[46px] font-bold text-paper tracking-[-0.025em] leading-[1.05]">
 {isDe
 ? "Vier Säulen, ein stiller Ort."
 : "Four pillars, one quiet place."}
 </h2>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
 {homeFeatures.map((f) => (
 <div key={f.title} className="text-center">
 <div className="mx-auto mb-6 h-14 w-14 rounded-pill bg-paper/10 flex items-center justify-center text-gold">
 <Cross size={24} />
 </div>
 <h3 className="font-sans text-[18px] font-semibold text-paper mb-3">
 {f.title}
 </h3>
 <p className="font-sans text-[14px] text-paper/70 max-w-[300px] mx-auto leading-[1.55]">
 {f.body}
 </p>
 </div>
 ))}
 </div>
 </div>
 </section>

 {/* SCRIPTURE - white rhythm break */}
 <section className={`${sectionBase} bg-paper text-center`}>
 <div className="mx-auto max-w-[820px] w-full">
 <p className="font-serif text-[28px] md:text-[42px] leading-[1.15] tracking-[-0.01em] text-night">
 {isDe
 ? "„Der Herr ist gut zu denen, die auf ihn vertrauen.“"
 : "“The Lord is good to those who trust in him.”"}
 </p>
 <Link
 href="/bible/nahum/1#v7"
 className="inline-block mt-7 font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-ink-soft hover:text-night transition-colors underline-offset-4 hover:underline"
 >
 Nahum 1:7
 </Link>
 </div>
 </section>

 {/* CATEGORIES */}
 <section className={`${sectionBase} bg-night`}>
 <div className="mx-auto max-w-[1240px] w-full">
 <div className="mb-12">
 <p className="font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-paper/60 mb-4">
 {isDe ? "Wo anfangen" : "Where to begin"}
 </p>
 <h2 className="font-sans text-[26px] md:text-[36px] lg:text-[46px] font-bold text-paper tracking-[-0.025em] leading-[1.05]">
 {isDe ? "Fang an, wo du stehst." : "Begin where you stand."}
 </h2>
 </div>
 <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
 {homeCategories.map((c) => (
 <Link
 key={c.label}
 href={c.href}
 className="block rounded-pill border border-paper/15 bg-paper/[0.04] px-5 py-4 font-sans text-[15px] font-medium text-paper text-center hover:bg-paper/10 hover:border-paper/30 transition-colors duration-150"
 >
 {c.label}
 </Link>
 ))}
 </div>
 </div>
 </section>

 {/* CHALLENGES */}
 <section className={`${sectionBase} bg-night-soft`}>
 <div className="mx-auto max-w-[1240px] w-full">
 <div className="mb-12">
 <p className="font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-paper/60 mb-4">
 {isDe ? "Wege zu gehen" : "Paths to walk"}
 </p>
 <h2 className="font-sans text-[26px] md:text-[36px] lg:text-[46px] font-bold text-paper tracking-[-0.025em] leading-[1.05]">
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
 className="group block rounded-lg bg-night border border-paper/8 p-8 hover:border-gold/45 hover:bg-gold/[0.04] transition-colors duration-200"
 >
 <p className="font-sans text-[12px] font-semibold uppercase tracking-[1.5px] text-gold/85 mb-4">
 {ch.eyebrow}
 </p>
 <h3 className="font-sans text-[18px] md:text-[20px] font-semibold text-paper mb-3">
 {ch.title}
 </h3>
 <p className="font-sans text-[14px] text-paper/65 leading-[1.6] mb-5">
 {ch.body}
 </p>
 <span className="font-sans text-[13px] font-medium text-paper/75 group-hover:text-gold transition-colors">
 {isDe ? "Anfangen →" : "Begin →"}
 </span>
 </Link>
 ))}
 </div>
 </div>
 </section>

 {/* What we are made of */}
 <MadeOfStrip />

 {/* FINAL CTA */}
 <section className={`${sectionBase} bg-night`}>
 <div className="mx-auto max-w-[1100px] w-full">
 <h2 className="font-sans text-[32px] md:text-[46px] lg:text-[60px] font-bold text-paper leading-[1.02] tracking-[-0.03em]">
 {isDe ? "Purify öffnen." : "Open Purify."}
 </h2>
 <p className="mt-5 font-serif text-[15px] md:text-[18px] text-paper/75 leading-[1.6] max-w-[640px]">
 {isDe
 ? "Fang an, wo du stehst, bei einem Gebet, beim Heiligen des Tages, bei einem Vers des Evangeliums."
 : "Begin where you stand, at a prayer, at the saint of the day, at a verse of the Gospel."}
 </p>
 <div className="mt-10">
 <ComingSoonCTA variant="inverse" className="text-[16px]">
 {isDe ? "Purify öffnen" : "Open Purify"}
 </ComingSoonCTA>
 </div>
 </div>
 </section>
 </main>
 <Footer />
 </div>
 {/* Bottom tab bar + PWA install prompt mount on the mobile shell.
 Both render md:hidden internally, so they're inert on desktop. */}
 <MobileTabBar />
 <InstallPrompt />
 </>
 );
}
