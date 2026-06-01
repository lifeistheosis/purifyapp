import Link from "next/link";
import { SUPPORT } from "@/data/support/support";
import { fetchBmcTotal } from "@/lib/support/buymeacoffee";
import { getExpenseLines, getMonthlyGoalUsd } from "@/lib/support/expenses";
import { getServerLocale } from "@/lib/i18n/server";
import { getMessages, t } from "@/lib/i18n";

export const metadata = {
 title: "Support",
 description:
 "How the project is funded, what the money goes toward, and how to help. The core stays free; a future optional subscription layer covers heavier infrastructure under proper licensing.",
};

// Server component; revalidates every five minutes so the live BMC total
// is fresh without redeploying.
export const revalidate = 300;

const SECTION = "px-5 md:px-8 py-16 md:py-24";

function formatUsd(n: number): string {
 return n.toLocaleString("en-US", {
 style: "currency",
 currency: SUPPORT.currency,
 maximumFractionDigits: 0,
 });
}

function ago(iso: string): string {
 const diffMs = Date.now() - new Date(iso).getTime();
 if (!Number.isFinite(diffMs)) return "just now";
 const m = Math.floor(diffMs / 60000);
 if (m < 1) return "just now";
 if (m < 60) return `${m} min ago`;
 const h = Math.floor(m / 60);
 if (h < 24) return `${h}h ago`;
 return new Date(iso).toLocaleDateString();
}

export default async function SupportPage() {
 const [live, expenses, monthlyGoalUsd] = await Promise.all([
   fetchBmcTotal(),
   getExpenseLines(),
   getMonthlyGoalUsd(),
 ]);
 const raised = live?.monthlyRaisedUsd ?? SUPPORT.monthlyRaisedUsd;
 const totalMonthlyExpense = expenses.reduce(
 (s, e) => s + e.monthlyUsd,
 0,
 );
 const pct = Math.min(
 1,
 Math.max(0, raised / monthlyGoalUsd),
 );
 const locale = await getServerLocale();
 const isDe = locale === "de";
 const m = getMessages(locale);

 return (
 <section className={`${SECTION} bg-night`}>
 <article className="mx-auto max-w-[760px] w-full">
 <p className="font-sans text-detail font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
 {isDe ? "Unterstützung" : t(m, "support.eyebrow")}
 </p>
 <h1 className="font-sans text-display-sm md:text-display font-bold leading-[1.05] tracking-[-0.025em] text-paper">
 {isDe
 ? "Was das Werk trägt, und wie du es mitträgst."
 : t(m, "support.h1")}
 </h1>
 <p className="mt-6 font-serif text-body text-paper/85 leading-[1.7]">
 {isDe ? (
 <>
 Der Kern von Purify, die Heiligen, die Schriften, die
 Gebete, der Kalender, ist frei und bleibt frei.
 Hosting, Speicher, Beschaffung und die Menschen, die die
 Arbeit tun, kosten Geld. Wenn die Seite dir geholfen hat,
 kannst du das Licht anhalten oder beschleunigen, was wir als
 Nächstes bauen.
 </>
 ) : (
 <>
 The core of Purify, the saints, the Scriptures, the
 prayers, the calendar, is free, and stays free. Hosting,
 storage, sourcing, and the people who do the work all cost
 money. If the site has helped you, you can keep the lights
 on, or speed up the next thing we build.
 </>
 )}
 </p>

 {/* Live goal */}
 <section className="mt-12 rounded-lg border border-paper/12 bg-paper/[0.03] p-6 md:p-8">
 <div className="flex items-baseline justify-between gap-3 mb-3 flex-wrap">
 <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-paper/55">
 {isDe ? "Ziel dieses Monats" : "This month’s goal"}
 </p>
 <p className="font-sans text-eyebrow text-paper/40">
 {live
 ? isDe
 ? `Live · aktualisiert vor ${ago(live.fetchedAt)}`
 : `Live · refreshed ${ago(live.fetchedAt)}`
 : isDe
 ? `Aktualisiert ${SUPPORT.lastUpdated}`
 : `Updated ${SUPPORT.lastUpdated}`}
 </p>
 </div>
 <div className="flex items-baseline justify-between gap-3 mb-3">
 <p className="font-sans text-title md:text-heading font-bold text-paper tabular-nums">
 {formatUsd(raised)}
 <span className="text-paper/45 text-lede font-normal">
 {" "}{isDe ? "von" : "of"} {formatUsd(monthlyGoalUsd)}
 </span>
 </p>
 <p className="font-sans text-detail text-gold font-semibold tabular-nums">
 {Math.round(pct * 100)}%
 </p>
 </div>
 <div className="h-[6px] rounded-full bg-paper/8 overflow-hidden">
 <div
 className="h-full bg-gold transition-[width] duration-500"
 style={{ width: `${Math.round(pct * 100)}%` }}
 />
 </div>
 <p className="mt-3 font-sans text-caption text-paper/55">
 {live ? (
 isDe ? (
 <>
 Echte Zahlen, gezogen von Buy Me a Coffee.
 {live.supporters > 0 ? (
 <>
 {" "}
 {live.supporters}{" "}
 {live.supporters === 1 ? "Unterstützer" : "Unterstützer"}{" "}
 in diesem Monat.
 </>
 ) : null}{" "}
 Das Ziel bewegt sich mit den monatlichen Ausgaben unten.
 </>
 ) : (
 <>
 Real numbers, pulled from Buy Me a Coffee.
 {live.supporters > 0 ? (
 <>
 {" "}
 {live.supporters}{" "}
 {live.supporters === 1 ? "supporter" : "supporters"} this
 month.
 </>
 ) : null}{" "}
 The goal moves with the monthly expenses below.
 </>
 )
 ) : isDe ? (
 <>
 Wir nennen echte Zahlen, keine Schaubilanzen. Das Ziel bewegt
 sich mit den tatsächlichen monatlichen Ausgaben unten.
 </>
 ) : (
 <>
 We list real numbers, not vanity metrics. The goal moves with
 actual monthly expenses below.
 </>
 )}
 </p>
 </section>

 {/* How to give */}
 <section className="mt-10">
 <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
 {isDe ? "Wie du gibst" : "How to give"}
 </p>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
 {SUPPORT.donateLinks.map((d) => (
 <Link
 key={d.label}
 href={d.href}
 target={d.href.startsWith("http") ? "_blank" : undefined}
 rel={
 d.href.startsWith("http") ? "noopener noreferrer" : undefined
 }
 className="group rounded-md border border-paper/15 bg-paper/[0.03] hover:border-gold/55 hover:bg-gold/[0.06] transition-colors p-5"
 >
 <p className="font-sans text-body font-semibold text-paper leading-tight">
 {d.label}
 </p>
 <p className="mt-2 font-sans text-caption text-paper/65 leading-[1.55]">
 {d.note}
 </p>
 <p className="mt-4 font-sans text-caption font-medium text-paper/65 group-hover:text-gold transition-colors">
 {isDe ? "Öffnen →" : "Open →"}
 </p>
 </Link>
 ))}
 </div>
 </section>

 {/* Or join the community, Discord + Instagram */}
 <section className="mt-10">
 <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
 {isDe ? "Oder tritt der Gemeinschaft bei" : "Or join the community"}
 </p>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <a
 href="https://discord.gg/VzBYYUsNJ6"
 target="_blank"
 rel="noopener noreferrer"
 className="group block rounded-md border border-[#5865F2]/35 bg-[#5865F2]/[0.06] hover:border-[#5865F2]/65 hover:bg-[#5865F2]/[0.10] transition-colors p-5"
 >
 <div className="flex items-start justify-between gap-4">
 <div className="min-w-0">
 <p className="font-sans text-body font-semibold text-paper leading-tight">
 Discord
 </p>
 <p className="mt-2 font-sans text-detail text-paper/70 leading-[1.6]">
 {isDe
 ? "Gebetsanliegen, Vorschläge für Akathiste, Fragen zum Inhalt, ein Ort, gehört zu werden. Offen für jeden."
 : "Prayer requests, akathist suggestions, content questions, and a place to be heard. Open to everyone."}
 </p>
 </div>
 <span className="shrink-0 font-sans text-detail font-medium text-link group-hover:text-link-soft transition-colors mt-1">
 {isDe ? "Öffnen ↗" : "Open ↗"}
 </span>
 </div>
 </a>
 <a
 href="https://instagram.com/purifymylife"
 target="_blank"
 rel="noopener noreferrer"
 className="group block rounded-md border border-paper/15 bg-paper/[0.03] hover:border-gold/45 hover:bg-gold/[0.04] transition-colors p-5"
 >
 <div className="flex items-start justify-between gap-4">
 <div className="min-w-0">
 <p className="font-sans text-body font-semibold text-paper leading-tight">
 Instagram &middot; @purifymylife
 </p>
 <p className="mt-2 font-sans text-detail text-paper/70 leading-[1.6]">
 {isDe
 ? "Der Heilige des Tages, das Fasten des Tages und gelegentlich eine kleine Notiz von Edgar. Keine Reels, kein Hinterherlaufen hinter dem Algorithmus."
 : "The day’s saint, the day’s fast, and the occasional small note from Edgar. No reels, no chasing the algorithm."}
 </p>
 </div>
 <span className="shrink-0 font-sans text-detail font-medium text-gold/85 group-hover:text-gold transition-colors mt-1">
 {isDe ? "Öffnen ↗" : "Open ↗"}
 </span>
 </div>
 </a>
 </div>
 </section>

 {/* Expense breakdown */}
 <section className="mt-14">
 <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
 {isDe ? "Wohin das Geld geht" : "Where the money goes"}
 </p>
 <p className="font-serif text-body text-paper/80 leading-[1.7] mb-6">
 {isDe ? (
 <>
 Jede Zeile ist echt. Die monatlichen Gesamtkosten zum Stand{" "}
 {SUPPORT.lastUpdated} betragen {formatUsd(totalMonthlyExpense)}.
 Das Förderziel oben ist auf {formatUsd(monthlyGoalUsd)}{" "}
 gesetzt, um Spielraum für die unvorhersehbaren Monate zu lassen.
 </>
 ) : (
 <>
 Every line is real. Total monthly cost as of{" "}
 {SUPPORT.lastUpdated} is {formatUsd(totalMonthlyExpense)}. The
 funding goal above is set at {formatUsd(monthlyGoalUsd)}
 {" "}to leave some margin for the unpredictable months.
 </>
 )}
 </p>
 <ul className="divide-y divide-paper/8 border border-paper/12 rounded-md overflow-hidden">
 {expenses.map((e) => (
 <li
 key={e.label}
 className="px-5 py-4 flex items-baseline justify-between gap-4 bg-paper/[0.02]"
 >
 <div className="min-w-0">
 <p className="font-sans text-ui font-semibold text-paper leading-tight">
 {e.label}
 </p>
 {e.note && (
 <p className="mt-1 font-sans text-caption text-paper/55 leading-[1.55]">
 {e.note}
 </p>
 )}
 </div>
 <p className="shrink-0 font-sans text-ui font-semibold text-gold tabular-nums">
 {formatUsd(e.monthlyUsd)}{isDe ? "/Mon." : "/mo"}
 </p>
 </li>
 ))}
 <li className="px-5 py-4 flex items-baseline justify-between gap-4 bg-paper/[0.06]">
 <p className="font-sans text-ui font-bold text-paper">
 {isDe ? "Monatlicher Gesamtbetrag" : "Monthly total"}
 </p>
 <p className="font-sans text-body font-bold text-paper tabular-nums">
 {formatUsd(totalMonthlyExpense)}{isDe ? "/Mon." : "/mo"}
 </p>
 </li>
 </ul>
 </section>

 {/* Free-forever note */}
 <section className="mt-14 rounded-lg border border-paper/12 bg-paper/[0.02] p-6">
 <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-paper/55 mb-3">
 {isDe ? "Der Kern bleibt frei" : "The core stays free"}
 </p>
 <p className="font-serif text-body text-paper/85 leading-[1.7]">
 {isDe ? (
 <>
 Die Heiligen, die Schriften mit dem Griechischen daneben, die
 täglichen Gebete und der Kalender bleiben unentgeltlich für
 jeden, der sie braucht. Die Gaben auf dieser Seite sind
 freiwillige Opfer, die die laufenden Kosten decken; sie
 schalten nichts frei und werden nie verlangt. Eine schwerere
 Infrastrukturschicht ist unter ordentlicher Lizenzierung im
 Werden, und wenn sie als freiwilliger, durch Abonnement
 getragener Bereich kommt, wird das, was heute frei ist, dann
 noch frei sein.
 </>
 ) : (
 <>
 The saints, the Scriptures with the Greek beside them, the
 daily prayers, and the calendar will remain free of charge to
 anyone who needs them. Gifts on this page are freewill
 offerings that cover running costs; they unlock nothing and
 are never required. A heavier infrastructure layer is on the
 way under proper licensing, and when it arrives as an
 optional, subscription-funded tier, what is free today will
 still be free then.
 </>
 )}
 </p>
 </section>

 {/* Closing */}
 <p className="mt-14 font-serif italic text-center text-lede text-paper/70">
 {isDe
 ? "Was du auch gibst oder nicht gibst, wir sind froh, daß du da bist."
 : "Whatever you give, or do not give, we are glad you are here."}
 </p>
 </article>
 </section>
 );
}
