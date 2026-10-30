import Link from "next/link";
import { notFound } from "next/navigation";
import { COUNCILS, getCouncil } from "@/lib/councils/councils";
import { HERESIES } from "@/lib/heresies/heresies";
import { ViewInHistory } from "@/components/history/ViewInHistory";
import { eventsForCouncil } from "@/lib/history/events";
import { IS_STATIC_EXPORT } from "@/lib/platform/buildTarget";
import { T } from "@/components/i18n/T";
import { SourceList, findWords, marked, type ListedSource } from "@/components/citations/Marked";
import { shownCite } from "@/lib/citations/shown";
import { ACCOUNT_QUOTES } from "@/lib/councils/accountQuotes";
import { named } from "@/components/saints/SaintNames";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { ShareButton } from "@/components/ui/ShareButton";
import { CouncilHero } from "@/components/councils/CouncilHero";
import { CouncilFathers } from "@/components/councils/CouncilFathers";
import { DocumentsDoor } from "@/components/councils/DocumentsDoor";
import { councilBooks, shelfSize } from "@/lib/councils/books";
import { fatherFaces } from "@/lib/councils/fathers";
import { councilFocus, councilPicture, ordinalKey, placeOf } from "@/lib/councils/page";
import { cn } from "@/lib/cn";

/** Where a mark in a council's account leads: its source, under the history. */
const ACCOUNT_SOURCE = "account-source-";

/** A fact short enough to stand beside another in the glance's two columns. */
const SHORT_FACT = 40;

export function generateStaticParams() {
 return COUNCILS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
 params,
}: {
 params: Promise<{ slug: string }>;
}) {
 const { slug } = await params;
 const c = getCouncil(slug);
 if (!c) return { title: "Council not found" };
 return {
 title: `${c.byname} (${c.year})`,
 description: c.shortBio,
 };
}

/**
 * A council's page (1.8, the owner's pick of r3-03, 2026-10-30: "I like the
 * Nicaea at a glance for C"; the sheet is Homebase/boards/purify-master/
 * variants/r3-03-councils.png). It leads with the council at a glance: its
 * icon across the head of the screen with its name, year and place over the
 * icon's foot; its facts (who presided or convened it, the bishops who came);
 * the Holy Fathers principally associated, one at a time with their faces to
 * tap (components/councils/CouncilFathers.tsx); and one door, "Read the
 * Council's documents", into its shelf in the reading room (his build 80
 * notes 10 to 12). The account follows as it was: how the Church received it,
 * what it defined and condemned, its history with its sources, the parties
 * opposed, the heresies, and the council in History.
 *
 * The top bar is the saint page's own: clear over the icon with the way back
 * and Share on round plates, solid with the council's name once the name has
 * gone up under it. A local council has no picture, and its page opens on the
 * solid bar with its name.
 */
export default async function CouncilProfilePage({
 params,
}: {
 params: Promise<{ slug: string }>;
}) {
 const { slug } = await params;
 const c = getCouncil(slug);
 if (!c) notFound();

 const condemnedHeresies = HERESIES.filter((h) =>
  h.condemnedBy.includes(c.slug),
 );

 // The quotations in the account, numbered in the order the page gives
 // them (what it defined, what it condemned, its history), each with its
 // line, listed under the history (1.8, lib/councils/accountQuotes.ts).
 const account = [...c.defined, ...c.condemned, ...c.life].join("\n");
 // The council's own picture (1.8, the owner: "Anytime we're talking about
 // history, I want there to be photos"): the icon its history page already
 // carries, opened, checked and credited there (docs/licensing/
 // HISTORY_MEDIA.md). The council's own event, not one it merely touches.
 const picture = councilPicture(c.slug, IS_STATIC_EXPORT);
 const sources: ListedSource[] = (ACCOUNT_QUOTES[c.slug] ?? [])
  .map((q) => ({ q, at: findWords(account, q.words) }))
  .filter(({ at }) => at >= 0)
  .sort((a, b) => a.at - b.at)
  .map(({ q }, i) => ({ words: q.words, n: i + 1, shown: shownCite(q.cite) }));

 // The glance: its facts, its Fathers, and its shelf in the reading room.
 const facts = [
  c.presidingEmperor ? { key: "study.councils.presidingEmperor", value: c.presidingEmperor } : null,
  c.convenedBy ? { key: "study.councils.convenedBy", value: c.convenedBy } : null,
  c.bishopsAttending ? { key: "study.councils.bishopsAttending", value: c.bishopsAttending } : null,
 ].filter((f): f is { key: string; value: string } => f !== null);
 const sideBySide = facts.length === 2 && facts.every((f) => f.value.length <= SHORT_FACT);
 const books = councilBooks(c, IS_STATIC_EXPORT);
 const shelf = shelfSize(books);

 return (
 <>
 <MobileTopBar
  title={c.byname}
  back
  backFallback="/councils"
  revealTitleOn="council-name"
  overlay={Boolean(picture)}
  trailing={<ShareButton title={c.byname} round className="h-10 w-10 border-0 bg-transparent text-paper/80 hover:text-paper" />}
 />
 <section className="bg-night px-5 pb-16 md:px-8 md:pb-24 md:pt-14">
 <article className="mx-auto max-w-[820px] w-full">
 {/* The way back on a computer, where the bar is not drawn. */}
 <p className="mb-6 hidden font-sans text-caption text-paper/45 md:block native-md-hidden">
 <Link href="/councils" className="hover:text-paper transition-colors">
 <T k="study.councils.theCouncils" />
 </Link>
 </p>

 {/* The head: the icon, and the name over its foot. */}
 {picture ? <CouncilHero picture={picture} focus={councilFocus(c.slug)} /> : null}
 <header className={cn("saint-head-in", picture ? "relative -mt-24 md:mt-6" : "pt-8 md:pt-0")}>
 <p className="font-sans text-caption font-semibold text-paper/80">
 <T k={ordinalKey(c)} />
 </p>
 <h1 id="council-name" className="mt-1.5 font-serif text-[26px] font-bold leading-[1.1] tracking-[-0.01em] text-balance text-paper md:text-display-sm">
 {c.byname}
 </h1>
 <p className="mt-1.5 font-sans text-detail text-paper/70">
 {c.year} &middot; {placeOf(c.location)}
 </p>
 </header>

 {/* Its facts, at a glance. */}
 {facts.length > 0 && (
 <dl
  data-council-facts=""
  className={cn(
  "mt-5 grid rounded-[16px] border border-paper/8 bg-paper/[0.04] font-sans shadow-[inset_0_1px_0_rgb(255_255_255/0.04)]",
  sideBySide ? "grid-cols-2 divide-x divide-paper/8 rtl:divide-x-reverse" : "grid-cols-1 divide-y divide-paper/8",
  )}
 >
 {facts.map((f) => (
 <div key={f.key} className="min-w-0 px-3.5 py-2.5">
 <dt className="text-[11px] font-semibold text-paper/50">
 <T k={f.key} />
 </dt>
 <dd className="mt-0.5 text-[13.5px] font-semibold leading-snug text-paper">{f.value}</dd>
 </div>
 ))}
 </dl>
 )}

 {/* How the Church received it. Placed ABOVE what the council defined,
     because a reader who skims the defined list and stops has to have
     already been told that this one was not adopted whole. Absent on the
     seven, which are received without qualification. */}
 {c.reception && (
 <aside
 className={`mt-6 rounded-lg border px-5 py-4 ${
 c.reception.status === "not-received"
 ? "border-crimson/30 bg-crimson/[0.06]"
 : "border-paper/25 bg-paper/[0.05]"
 }`}
 >
 <p className="font-sans text-caption font-semibold text-paper/55">
 {c.reception.status === "not-received" ? (
 <T k="study.councils.notReceived" />
 ) : (
 <T k="study.councils.receivedInPart" />
 )}
 </p>
 <p className="mt-2 font-serif text-ui text-paper/80 leading-[1.6]">
 {c.reception.note}
 </p>
 </aside>
 )}

 {/* The Holy Fathers principally associated, one at a time. */}
 <CouncilFathers fathers={fatherFaces(c, IS_STATIC_EXPORT)} />

 {/* One door to its books: its shelf in the reading room. */}
 {books.length > 0 ? (
 <DocumentsDoor
  href={`/reading/councils/${c.slug}`}
  books={shelf.books}
  minutes={shelf.minutes}
  fan={books.slice(0, 3).map((b) => ({ src: b.cover?.src, focusY: b.cover?.focusY, crop: b.cover?.crop }))}
 />
 ) : null}

 {c.pendingDocuments && c.pendingDocuments.length > 0 && (
 <div className="mt-4 rounded-md border border-dashed border-paper/15 bg-paper/[0.015] px-5 py-4">
 <p className="font-sans text-caption font-semibold text-paper/45 mb-3">
 <T k="study.pending" />
 </p>
 <ul className="space-y-3">
 {c.pendingDocuments.map((p, i) => (
 <li key={i}>
 <p className="font-serif text-body text-paper/75">
 {p.title}
 </p>
 <p className="mt-1 font-serif text-ui text-paper/55 leading-[1.6]">
 {p.note}
 </p>
 </li>
 ))}
 </ul>
 </div>
 )}

 {/* Defined / Condemned */}
 <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
 <div>
 <h2 className="font-sans text-caption font-semibold text-paper/55 mb-4">
 <T k="study.councils.defined" />
 </h2>
 <ul className="space-y-3 font-serif text-body text-paper/85 leading-[1.65] list-disc pl-5 marker:text-paper/60">
 {c.defined.map((d, i) => (
 <li key={i}>{named(marked(d, sources, ACCOUNT_SOURCE))}</li>
 ))}
 </ul>
 </div>
 <div>
 <h2 className="font-sans text-caption font-semibold text-paper/55 mb-4">
 <T k="study.councils.condemned" />
 </h2>
 <ul className="space-y-3 font-serif text-body text-paper/85 leading-[1.65] list-disc pl-5 marker:text-paper/30">
 {c.condemned.map((x, i) => (
 <li key={i}>{named(marked(x, sources, ACCOUNT_SOURCE))}</li>
 ))}
 </ul>
 </div>
 </div>

 {/* Historical narrative */}
 <div className="mt-14">
 <h2 className="font-sans text-caption font-semibold text-paper/55 mb-5">
 <T k="study.councils.historicalContext" />
 </h2>
 {c.review && (
 <p className="-mt-2 mb-5 font-sans text-caption text-paper/45">
 <T k="study.heresies.oursAwaitingReview" />
 </p>
 )}
 <div className="space-y-5 font-serif text-lede md:text-lede text-paper/85 leading-[1.7]">
 {c.life.map((para, i) => (
 <p key={i}>{named(marked(para, sources, ACCOUNT_SOURCE))}</p>
 ))}
 </div>
 <SourceList id="account-sources" idPrefix={ACCOUNT_SOURCE} sources={sources} lang="en" heading="h3" className="mt-8 border-t border-paper/8 pt-6" />
 </div>

 {/* Principal opposed */}
 {c.principalOpposed && c.principalOpposed.length > 0 && (
 <div className="mt-12">
 <h2 className="font-sans text-caption font-semibold text-paper/55 mb-5">
 <T k="study.councils.opposingParties" />
 </h2>
 <ul className="space-y-5">
 {c.principalOpposed.map((o, i) => (
 <li key={i} className="rounded-md border border-paper/10 bg-paper/[0.015] px-5 py-4">
 <p className="font-sans text-ui font-semibold text-paper/85">
 {o.slug ? (
 <Link
 href={`/heresies/${o.slug}`}
 className="hover:text-paper transition-colors underline underline-offset-4 decoration-paper/40 hover:decoration-paper"
 >
 {o.name}
 </Link>
 ) : (
 o.name
 )}
 </p>
 <p className="mt-2 font-serif text-ui text-paper/70 leading-[1.6]">
 {o.teaching}
 </p>
 </li>
 ))}
 </ul>
 </div>
 )}

 {/* Heresies condemned */}
 {condemnedHeresies.length > 0 && (
 <div className="mt-14">
 <h2 className="font-sans text-caption font-semibold text-paper/55 mb-5">
 <T k="study.councils.heresiesCondemned" />
 </h2>
 <ul className="space-y-3">
 {condemnedHeresies.map((h) => (
 <li key={h.slug}>
 <Link
 href={`/heresies/${h.slug}`}
 className="group block rounded-md border border-paper/12 bg-paper/[0.03] hover:border-paper/45 hover:bg-paper/[0.04] transition-colors px-5 py-4"
 >
 <p className="font-serif text-lede text-paper group-hover:text-paper transition-colors">
 {h.name}
 </p>
 <p className="mt-2 font-serif text-ui text-paper/75 leading-[1.6]">
 {h.shortBio}
 </p>
 </Link>
 </li>
 ))}
 </ul>
 </div>
 )}

 <ViewInHistory
  events={eventsForCouncil(c.slug)}
  title={<T k="study.councils.inHistory" />}
 />

 {/* The head's picture, credited where every picture of History is. */}
 {picture ? (
 <p data-council-credit="" className="mt-10 font-sans text-[11px] leading-snug text-paper/45">
 {picture.credit}
 </p>
 ) : null}
 </article>
 </section>
 </>
 );
}
