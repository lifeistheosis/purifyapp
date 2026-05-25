import Link from "next/link";
import { ComingSoonCTA } from "@/components/marketing/ComingSoonCTA";
import { Navbar } from "@/components/nav/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SectionScroller } from "@/components/SectionScroller";
import { IconCornerCard } from "@/components/marketing/IconCornerCard";
import { SeasonBanner } from "@/components/marketing/SeasonBanner";
import { MadeOfStrip } from "@/components/marketing/MadeOfStrip";
import { Cross } from "@/components/ui/icons/Cross";
import { TodayMobileHero } from "@/components/today/TodayMobileHero";
import { MobileTabBar } from "@/components/nav/MobileTabBar";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";

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

// Each section: full viewport min-height, snap-aligned, flex-centered.
// pt offsets the 72px sticky navbar so content centers in the visible area.
const sectionBase =
 "snap-start md:[min-height:100dvh] flex items-center px-5 md:px-8 pt-24 md:pt-20 pb-16 md:pb-12";

export default function Home() {
 return (
 <>
 {/* MOBILE: app-shell Today hero. Hidden on md+ where the marketing
 home below takes over. The hero is wrapped here so the marketing
 sections (rich, long) don't double-load on phones. */}
 <div className="md:hidden flex-1 safe-pb">
 <TodayMobileHero />
 </div>

 {/* DESKTOP: existing marketing home, unchanged. Hidden on phones. */}
 <div className="hidden md:contents">
 <SectionScroller />
 <Navbar />
 <main className="flex-1">
 {/* HERO */}
 <section
 className={`${sectionBase} relative overflow-hidden`}
 style={{
 background: [
 // Soft twilight-blue glow behind the heading, like the hour before vespers
 "radial-gradient(ellipse 75% 60% at 25% 30%, rgba(70, 95, 140, 0.12) 0%, transparent 65%)",
 // Subtle deeper indigo settling toward the lower right
 "radial-gradient(ellipse 60% 50% at 85% 75%, rgba(40, 50, 80, 0.10) 0%, transparent 70%)",
 // Deep night base, a hair cooler than pure black
 "linear-gradient(180deg, #07080c 0%, #0c0e14 55%, #10121a 100%)",
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
 New
 </span>
 <span className="font-sans text-[12px] sm:text-[13px] text-paper/85 group-hover:text-paper transition-colors">
 <span className="sm:hidden">v6.0 · The Councils, at last</span>
 <span className="hidden sm:inline">v6.0 · A major release: four of the Seven Councils</span>
 </span>
 <span className="text-paper/55 group-hover:text-paper transition-colors text-[13px]">
 →
 </span>
 </Link>
 <h1 className="font-sans text-[40px] md:text-[52px] lg:text-[64px] font-bold leading-[1.02] tracking-[-0.025em]">
 The whole Orthodox life,
 <br className="hidden sm:block" /> in one quiet place.
 </h1>
 <p className="font-sans text-[17px] md:text-[18px] text-paper/85 mt-5 max-w-[560px]">
 Pray with the Church. Read with the Fathers. Walk the year.
 Free, ad-free, yours to keep.
 </p>
 <div className="mt-7 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
 <ComingSoonCTA variant="inverse">
 Open Purify
 </ComingSoonCTA>
 <Link
 href="/calendar"
 className="font-sans text-[14px] font-medium text-paper/80 hover:text-paper transition-colors"
 >
 See today →
 </Link>
 </div>
 </div>
 <div className="hidden xl:flex justify-center items-center">
 <IconCornerCard />
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
 Why Purify
 </p>
 <h2 className="font-sans text-[32px] md:text-[44px] lg:text-[56px] font-bold text-paper tracking-[-0.025em] leading-[1.05]">
 Four pillars, one quiet place.
 </h2>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
 {features.map((f) => (
 <div key={f.title} className="text-center">
 <div className="mx-auto mb-6 h-14 w-14 rounded-pill bg-paper/10 flex items-center justify-center text-gold">
 <Cross size={24} />
 </div>
 <h3 className="font-sans text-[22px] font-semibold text-paper mb-3">
 {f.title}
 </h3>
 <p className="font-sans text-body text-paper/70 max-w-[320px] mx-auto">
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
 <p className="font-serif text-[36px] md:text-[52px] leading-[1.15] tracking-[-0.01em] text-night">
 &ldquo;The Lord is good to those who trust in him.&rdquo;
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
 Where to begin
 </p>
 <h2 className="font-sans text-[32px] md:text-[44px] lg:text-[56px] font-bold text-paper tracking-[-0.025em] leading-[1.05]">
 Begin where you stand.
 </h2>
 </div>
 <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
 {categories.map((c) => (
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
 Paths to walk
 </p>
 <h2 className="font-sans text-[32px] md:text-[44px] lg:text-[56px] font-bold text-paper tracking-[-0.025em] leading-[1.05]">
 Where would you like to begin?
 </h2>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 {challenges.map((ch) => (
 <Link
 key={ch.title}
 href={ch.href}
 className="group block rounded-lg bg-night border border-paper/8 p-8 hover:border-gold/45 hover:bg-gold/[0.04] transition-colors duration-200"
 >
 <p className="font-sans text-[12px] font-semibold uppercase tracking-[1.5px] text-gold/85 mb-4">
 {ch.eyebrow}
 </p>
 <h3 className="font-sans text-[22px] md:text-[24px] font-semibold text-paper mb-3">
 {ch.title}
 </h3>
 <p className="font-sans text-[14px] text-paper/65 leading-[1.6] mb-5">
 {ch.body}
 </p>
 <span className="font-sans text-[13px] font-medium text-paper/75 group-hover:text-gold transition-colors">
 Begin →
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
 <h2 className="font-sans text-[40px] md:text-[56px] lg:text-[72px] font-bold text-paper leading-[1.02] tracking-[-0.03em]">
 Open Purify.
 </h2>
 <p className="mt-6 font-serif text-[18px] md:text-[22px] text-paper/75 leading-[1.6] max-w-[680px]">
 Begin where you stand, at a prayer, at the saint of the day, at
 a verse of the Gospel.
 </p>
 <div className="mt-10">
 <ComingSoonCTA variant="inverse" className="text-[16px]">
 Open Purify
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
