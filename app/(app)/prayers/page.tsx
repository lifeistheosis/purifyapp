import Link from "next/link";
import { LESSONS } from "@/lib/prayers/learning";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { PrayersSubTabs } from "@/components/nav/PrayersSubTabs";
import {
 commemorationsOn,
 fastingStatus,
 formatMonthDay,
 paschaInfo,
 startOfDayUtc,
 type FastKind,
} from "@/lib/calendar/orthodox";
import { SaintIcon } from "@/components/saints/SaintIcon";
import { getSaint } from "@/lib/saints/saints";
import { PrayerIcon } from "@/components/prayers/PrayerIcon";
import { getServerLocale } from "@/lib/i18n/server";

export const metadata = {
 title: "Prayer",
 description:
 "Daily prayer in the Orthodox tradition: today's rule, morning and evening rules, the prayer of the heart, akathists, the liturgical hours, and a beginner's path, each anchored by a traditional Byzantine icon.",
};

// Hourly ISR so the day strip rolls forward without a redeploy.
export const revalidate = 3600;

const FAST_DOT: Record<FastKind, string> = {
 strict: "bg-[#c1272d]",
 "wine-oil": "bg-gold",
 fish: "bg-[#7b9b8f]",
 fast: "bg-paper/40",
 "fast-free": "bg-emerald-400",
 normal: "bg-paper/30",
};

const HOURS = [
 {
 icon: "christ-enthroned",
 label: "First Hour",
 time: "6 a.m.",
 body: "The rising of the sun. The Light has come into the world.",
 },
 {
 icon: "pentecost",
 label: "Third Hour",
 time: "9 a.m.",
 body: "Mid-morning. The descent of the Holy Spirit at Pentecost.",
 },
 {
 icon: "crucifixion",
 label: "Sixth Hour",
 time: "Noon",
 body: "The Lord on the Cross at the brightest hour of the day.",
 },
 {
 icon: "entombment",
 label: "Ninth Hour",
 time: "3 p.m.",
 body: "The Lord's repose. The door between this day and the next.",
 },
];

const HOURS_DE = [
 {
 icon: "christ-enthroned",
 label: "Erste Stunde",
 time: "6 Uhr",
 body: "Der Aufgang der Sonne. Das Licht ist in die Welt gekommen.",
 },
 {
 icon: "pentecost",
 label: "Dritte Stunde",
 time: "9 Uhr",
 body: "Vormittag. Die Herabkunft des Heiligen Geistes zu Pfingsten.",
 },
 {
 icon: "crucifixion",
 label: "Sechste Stunde",
 time: "Mittag",
 body: "Der Herr am Kreuz in der hellsten Stunde des Tages.",
 },
 {
 icon: "entombment",
 label: "Neunte Stunde",
 time: "15 Uhr",
 body: "Die Ruhe des Herrn. Die Tür zwischen diesem Tag und dem nächsten.",
 },
];

export default async function PrayersPage() {
 const locale = await getServerLocale();
 const isDe = locale === "de";
 const today = startOfDayUtc(new Date());
 const fast = fastingStatus(today);
 const pascha = paschaInfo(today);
 const commemorations = commemorationsOn(today);
 const headline =
 commemorations.find((c) => c.kind === "feast") ?? commemorations[0];
 const headlineSaint =
 headline?.saint ?? (headline?.slug ? getSaint(headline.slug) : null);
 const hours = isDe ? HOURS_DE : HOURS;

 return (
 <div className="bg-night">
 <MobileTopBar title={isDe ? "Gebete" : "Prayers"} />
 <PrayersSubTabs />
 {/* ============== HERO ============== */}
 <section className="relative overflow-hidden border-b border-paper/8">
 {/* Christ Pantocrator (Sinai, 6th c.) backdrop, the strongest
 single-figure composition in the set: a tight, frontal bust
 of Christ with warm gold tones that read beautifully under a
 dark gradient. The most universally-recognized Orthodox
 icon, and the One we pray to without ceasing. */}
 <div className="absolute inset-0">
 <PrayerIcon slug="christ-pantocrator" size="hero" priority />
 <div
 aria-hidden
 className="absolute inset-0"
 style={{
 background:
 "linear-gradient(180deg, rgba(22,18,25,0.55) 0%, rgba(22,18,25,0.70) 35%, rgba(22,18,25,0.92) 75%, rgba(22,18,25,1) 100%)",
 }}
 />
 </div>

 <div className="relative px-5 md:px-8 pt-20 md:pt-28 pb-12 md:pb-16">
 <div className="mx-auto max-w-[1080px] w-full">
 <p className="font-sans text-[11px] font-semibold uppercase tracking-[2px] text-gold/85 mb-4">
 {isDe ? "Das Gebet" : "The Prayer"}
 </p>
 <h1 className="font-serif text-[56px] md:text-[88px] leading-[0.95] tracking-[-0.02em] text-paper max-w-[760px]">
 {isDe ? "Betet ohne Unterlaß." : "Pray without ceasing."}
 </h1>
 <p className="mt-5 font-sans text-[13px] text-paper/55 italic">
 {isDe ? "1. Thessalonicher 5,17" : "1 Thessalonians 5:17 · KJV"}
 </p>
 <p className="mt-8 max-w-[620px] font-serif text-[18px] md:text-[19px] text-paper/85 leading-[1.65]">
 {isDe
 ? "Die täglichen Regeln, das Gebet des Herzens, die Akathiste und die Horen — die Gestalt eines Lebens mit Gott. Schlag die Seite auf, wenn du aufstehst; schlag sie auf, wenn du dich niederlegst."
 : "The daily rules, the prayer of the heart, the Akathists, and the hours, the shape of a life with God. Open the page when you rise; open it when you lie down."}
 </p>

 {/* Day strip, sits at the bottom of the hero like a candle in
 front of the icon */}
 <Link
 href="/prayers/today"
 className="group mt-12 inline-flex items-center gap-4 rounded-md border border-gold/45 bg-night/75 backdrop-blur-sm px-5 py-4 hover:border-gold/75 hover:bg-night/85 transition-colors max-w-full"
 >
 <div className="shrink-0 flex flex-col items-center justify-center w-12 h-12 rounded-md border border-gold/50 bg-night text-center">
 <p className="font-sans text-[9px] uppercase tracking-[1.5px] text-gold/85 leading-none">
 {formatMonthDay(today).split(" ")[0].slice(0, 3).toUpperCase()}
 </p>
 <p className="font-sans text-[18px] font-bold text-paper leading-none mt-0.5 tabular-nums">
 {today.getUTCDate()}
 </p>
 </div>
 {headlineSaint && (
 <div className="shrink-0 hidden sm:block">
 <SaintIcon saint={headlineSaint} size="sm" />
 </div>
 )}
 <div className="min-w-0 flex-1">
 <p className="font-sans text-[10.5px] uppercase tracking-[1.5px] text-gold/85 mb-1">
 {isDe ? "Heute" : "Today"}
 </p>
 <p className="font-sans text-[14.5px] font-semibold text-paper truncate">
 {headline?.name ??
 (isDe ? "Mit der Kirche beten" : "Pray with the Church")}
 </p>
 <p className="mt-0.5 font-sans text-[12px] text-paper/65 flex items-center gap-2 truncate">
 <span
 aria-hidden
 className={`inline-block w-1.5 h-1.5 rounded-full ${FAST_DOT[fast.kind]}`}
 />
 <span>{fast.label}</span>
 <span className="text-paper/30">&middot;</span>
 <span>
 {pascha.daysAway > 0
 ? isDe
 ? `${pascha.daysAway} Tage bis Pascha`
 : `${pascha.daysAway} days to Pascha`
 : pascha.daysAway === 0
 ? isDe
 ? "Pascha ist heute"
 : "Pascha is today"
 : pascha.label}
 </span>
 </p>
 </div>
 <span
 aria-hidden
 className="shrink-0 font-sans text-[18px] text-paper/55 group-hover:text-gold transition-colors"
 >
 →
 </span>
 </Link>
 </div>
 </div>
 </section>

 {/* ============== BODY ============== */}
 <div className="mx-auto max-w-[1080px] w-full px-5 md:px-8 py-16 md:py-20 space-y-20">
 {/* ===== Today CTA ===== */}
 <section>
 <Link
 href="/prayers/today"
 className="group block rounded-lg border border-gold/35 bg-gold/[0.06] p-7 md:p-8 hover:border-gold/60 hover:bg-gold/[0.10] transition-colors"
 >
 <div className="flex items-start justify-between gap-6 flex-wrap">
 <div className="min-w-0">
 <p className="font-sans text-[11px] font-semibold uppercase tracking-[1.8px] text-gold mb-3">
 {isDe ? "Tägliches Gebet" : "Daily prayer"}
 </p>
 <h2 className="font-serif text-[34px] md:text-[42px] leading-[1.05] text-paper">
 {isDe ? "Heute" : "Today"}
 </h2>
 <p className="mt-3 font-serif text-[16px] md:text-[17px] text-paper/85 leading-[1.65] max-w-[600px]">
 {isDe
 ? "Das Datum, der Heilige, das Fasten, die festgesetzten Lesungen und Ein-Klick-Verweise auf die Morgenregel, die Abendregel und das Jesusgebet."
 : "The date, the saint, the fast, the appointed readings, and one-tap links into the morning rule, the evening rule, and the Jesus Prayer."}
 </p>
 </div>
 <span aria-hidden className="text-paper/55 text-[26px] mt-1">
 →
 </span>
 </div>
 </Link>
 </section>

 {/* ===== The Daily Rules ===== */}
 <section>
 <div className="mb-8">
 <p className="font-sans text-[11px] font-semibold uppercase tracking-[1.8px] text-gold/85 mb-3">
 {isDe ? "Die täglichen Regeln" : "The Daily Rules"}
 </p>
 <h2 className="font-serif text-[34px] md:text-[42px] leading-[1.05] text-paper">
 {isDe
 ? "Morgens und abends vor Gott."
 : "Morning and evening before God."}
 </h2>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <RuleCard
 eyebrow={isDe ? "Morgenregel" : "Morning rule"}
 title={isDe ? "Den Tag mit Gott beginnen" : "Begin the day with God"}
 body={
 isDe
 ? "Kreuzzeichen · Himmlischer König · Trisagion · Vaterunser · Aufstehen aus dem Schlaf · Jesusgebet · Theotokos-Hymnus · Entlassung."
 : "Sign of the Cross · O Heavenly King · the Trisagion · the Lord's Prayer · Rising from Sleep · the Jesus Prayer · the Theotokos hymn · dismissal."
 }
 duration={isDe ? "Etwa 8 Minuten" : "About 8 minutes"}
 href="/prayers/morning"
 iconSlug="anastasis"
 openLabel={isDe ? "Die Regel öffnen →" : "Open the rule →"}
 />
 <RuleCard
 eyebrow={isDe ? "Abendregel" : "Evening rule"}
 title={isDe ? "Den Tag niederlegen" : "Lay the day down"}
 body={
 isDe
 ? "Trisagion · Vaterunser · Tageserforschung · Jesusgebet · In deine Hände · Entlassung. Oft mit der Gottesgebärerin beschlossen."
 : "The Trisagion · the Lord's Prayer · examination of the day · the Jesus Prayer · Into Thy hands · dismissal. Often closed by the Theotokos."
 }
 duration={isDe ? "Etwa 8 Minuten" : "About 8 minutes"}
 href="/prayers/evening"
 iconSlug="theotokos-of-vladimir"
 openLabel={isDe ? "Die Regel öffnen →" : "Open the rule →"}
 />
 </div>
 </section>

 {/* ===== The Jesus Prayer, contemplative panel ===== */}
 <section className="text-center">
 <div className="mx-auto max-w-[720px] rounded-lg border border-paper/10 bg-paper/[0.02] px-6 py-12 md:py-16">
 <div className="flex justify-center mb-8">
 <PrayerIcon slug="christ-pantocrator" size="lg" />
 </div>
 <p className="font-sans text-[11px] font-semibold uppercase tracking-[1.8px] text-gold/85 mb-6">
 {isDe ? "Das Gebet des Herzens" : "The prayer of the heart"}
 </p>
 <p className="font-serif text-[22px] md:text-[26px] leading-[1.5] text-paper">
 {isDe ? (
 <>
 Herr Jesus Christus,
 <br />
 Sohn Gottes,
 <br />
 erbarme Dich meiner, eines Sünders.
 </>
 ) : (
 <>
 Lord Jesus Christ,
 <br />
 Son of God,
 <br />
 have mercy on me, a sinner.
 </>
 )}
 </p>
 <p className="mt-8 font-serif italic text-[15.5px] md:text-[16px] text-paper/65 leading-[1.65] max-w-[480px] mx-auto">
 {isDe
 ? "Bete es im Atem, mit dem Herzen, zu jeder Zeit. Die Mönche nennen es das Gebet des Herzens; die Väter sagen, das Zurückbringen sei die halbe Arbeit."
 : "Pray it in the breath, with the heart, at any time. The monastics call it the prayer of the heart; the Fathers say the bringing-back is half the work."}
 </p>
 <p className="mt-6">
 <Link
 href="/prayers/learning/jesus-prayer"
 className="font-sans text-[13.5px] font-medium text-gold hover:text-paper underline underline-offset-4 decoration-gold/40 hover:decoration-paper transition-colors"
 >
 {isDe ? "Lerne, es zu beten →" : "Learn how to pray it →"}
 </Link>
 </p>
 </div>
 </section>

 {/* ===== The Liturgical Hours ===== */}
 <section>
 <div className="mb-8 flex items-end justify-between gap-3 flex-wrap">
 <div>
 <p className="font-sans text-[11px] font-semibold uppercase tracking-[1.8px] text-gold/85 mb-3">
 {isDe ? "Die Horen" : "The Hours"}
 </p>
 <h2 className="font-serif text-[34px] md:text-[42px] leading-[1.05] text-paper">
 {isDe ? "Durch den Tag stehen." : "Standing through the day."}
 </h2>
 </div>
 <p className="font-sans text-[11px] uppercase tracking-[1.2px] text-paper/40">
 {isDe ? "In Vorbereitung" : "Coming soon"}
 </p>
 </div>
 <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
 {hours.map((h) => (
 <li
 key={h.label}
 className="rounded-md border border-paper/8 bg-paper/[0.02] p-5 flex flex-col gap-4"
 >
 <PrayerIcon slug={h.icon} size="sm" />
 <div>
 <p className="font-sans text-[10.5px] uppercase tracking-[1.5px] text-gold/85 mb-1">
 {h.label}
 </p>
 <p className="font-sans text-[12px] text-paper/55 mb-2">
 {h.time}
 </p>
 <p className="font-serif text-[14.5px] text-paper/80 leading-[1.55]">
 {h.body}
 </p>
 </div>
 </li>
 ))}
 </ul>
 </section>

 {/* ===== The Akathists ===== */}
 <section>
 <div className="mb-8">
 <p className="font-sans text-[11px] font-semibold uppercase tracking-[1.8px] text-gold/85 mb-3">
 {isDe ? "Die Akathiste" : "The Akathists"}
 </p>
 <h2 className="font-serif text-[34px] md:text-[42px] leading-[1.05] text-paper">
 {isDe ? "Folgen als nächstes." : "Coming next."}
 </h2>
 </div>
 <a
 href="mailto:team@purify.app?subject=Akathists"
 className="group flex flex-col sm:flex-row gap-6 rounded-lg border border-paper/12 bg-paper/[0.02] hover:border-paper/30 hover:bg-paper/[0.04] transition-colors p-6 md:p-7"
 >
 <PrayerIcon slug="theotokos-of-vladimir" size="md" />
 <div className="min-w-0 flex-1">
 <p className="font-serif text-[18px] md:text-[19px] text-paper/85 leading-[1.65]">
 {isDe
 ? "Akathiste an Christus, an die Gottesgebärerin und an die meistgebetenen Heiligen sind der nächste große Inhalts-Wurf. Geschriebene Ikoi und Kontakia in dem Wortlaut, den die Kirche seit Jahrhunderten trägt. Schreib uns, wenn du benachrichtigt werden möchtest, sobald sie landen."
 : "Akathists to Christ, to the Theotokos, and to the most-asked-for saints are the next major content drop. Written ikoi and kontakia in the wording the Church has carried for centuries. Email us if you want to be told when they land."}
 </p>
 <p className="mt-5 font-sans text-[13px] font-medium text-paper/65 group-hover:text-paper transition-colors">
 {isDe ? "Benachrichtige mich →" : "Notify me →"}
 </p>
 </div>
 </a>
 </section>

 {/* ===== Learn to Pray ===== */}
 <section>
 <Link
 href="/prayers/learning"
 className="group flex flex-col sm:flex-row gap-6 rounded-lg border border-accent/30 bg-accent/[0.06] hover:border-accent/55 hover:bg-accent/[0.10] transition-colors p-6 md:p-7"
 >
 <PrayerIcon slug="three-hierarchs" size="md" />
 <div className="min-w-0 flex-1">
 <p className="font-sans text-[11px] font-semibold uppercase tracking-[1.8px] text-accent mb-3">
 {isDe
 ? "Neu im orthodoxen Gebet? Hier anfangen."
 : "New to Orthodox prayer? Start here."}
 </p>
 <h3 className="font-serif text-[24px] md:text-[26px] text-paper leading-tight">
 {isDe ? "Beten lernen" : "Learn to pray"}
 </h3>
 <p className="mt-3 font-serif text-[16px] text-paper/80 leading-[1.65] max-w-[560px]">
 {isDe ? (
 <>
 Ein kurzer Einsteiger-Weg durch das Kreuzzeichen, das
 Jesusgebet, das Trisagion und eine einfache Morgen- und
 Abendregel. {LESSONS.length} Lektionen. Die Drei Hierarchen
 auf dieser Karte — Basilius, Gregor der Theologe und Johannes
 Chrysostomus — sind in der orthodoxen Überlieferung die
 Patrone der Theologie und des Gebets.
 </>
 ) : (
 <>
 A short, beginner&rsquo;s path through the Sign of the Cross,
 the Jesus Prayer, the Trisagion, and a simple morning and
 evening rule. {LESSONS.length} lessons. The Three Hierarchs of
 this card, Basil, Gregory the Theologian, and John
 Chrysostom, are the patrons of theology and prayer in
 the Orthodox tradition.
 </>
 )}
 </p>
 <p className="mt-4 font-sans text-[13px] font-medium text-paper/75 group-hover:text-accent transition-colors">
 {isDe ? "Die Lektionen öffnen →" : "Open the lessons →"}
 </p>
 </div>
 </Link>
 </section>

 {/* ===== Sign-in nudge ===== */}
 <p className="text-center font-sans text-[12.5px] text-paper/45 leading-[1.65] pt-4">
 {isDe
 ? "Deine Gebetsregel-Strähnen und Markierungen leben auf diesem Gerät. Melde dich an, um sie über Geräte hinweg zu behalten."
 : "Your prayer-rule streaks and highlights live on this device. Sign in to keep them across devices."}{" "}
 <Link
 href="/account"
 className="text-paper/65 hover:text-paper underline underline-offset-2 decoration-paper/25"
 >
 {isDe ? "Dein Konto →" : "Your account →"}
 </Link>
 </p>
 </div>
 </div>
 );
}

function RuleCard({
 eyebrow,
 title,
 body,
 duration,
 href,
 iconSlug,
 openLabel,
}: {
 eyebrow: string;
 title: string;
 body: string;
 duration: string;
 href: string;
 iconSlug: string;
 openLabel: string;
}) {
 return (
 <Link
 href={href}
 className="group flex gap-6 rounded-lg border border-paper/12 bg-paper/[0.03] hover:border-gold/55 hover:bg-gold/[0.06] transition-colors p-6"
 >
 <PrayerIcon slug={iconSlug} size="md" className="self-stretch" />
 <div className="min-w-0 flex-1 flex flex-col">
 <p className="font-sans text-[11px] uppercase tracking-[1.5px] text-gold/85 mb-2">
 {eyebrow}
 </p>
 <h3 className="font-serif text-[24px] md:text-[26px] text-paper leading-tight">
 {title}
 </h3>
 <p className="mt-3 font-sans text-[13.5px] text-paper/70 leading-[1.65]">
 {body}
 </p>
 <p className="mt-auto pt-4 flex items-center justify-between">
 <span className="font-sans text-[12px] text-paper/55">
 {duration}
 </span>
 <span className="font-sans text-[13px] font-medium text-paper/75 group-hover:text-gold transition-colors">
 {openLabel}
 </span>
 </p>
 </div>
 </Link>
 );
}
