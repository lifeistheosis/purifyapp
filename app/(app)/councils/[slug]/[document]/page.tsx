import Link from "next/link";
import { notFound } from "next/navigation";
import { COUNCILS, getCouncil } from "@/lib/councils/councils";
import { loadCouncilDocument } from "@/lib/councils/load";
import { getServerLocale } from "@/lib/i18n/server";
import { ContentNotYetTranslated } from "@/components/i18n/ContentNotYetTranslated";

export function generateStaticParams() {
 return COUNCILS.flatMap((c) =>
 c.documents.map((d) => ({ slug: c.slug, document: d.slug })),
 );
}

export async function generateMetadata({
 params,
}: {
 params: Promise<{ slug: string; document: string }>;
}) {
 const { slug, document } = await params;
 const c = getCouncil(slug);
 const doc = c?.documents.find((d) => d.slug === document);
 if (!c || !doc) return { title: "Document not found" };
 return {
 title: `${doc.title}, ${c.byname}`,
 description: doc.blurb,
 };
}

export default async function CouncilDocumentPage({
 params,
}: {
 params: Promise<{ slug: string; document: string }>;
}) {
 const { slug, document } = await params;
 const c = getCouncil(slug);
 if (!c) notFound();
 const docRef = c.documents.find((d) => d.slug === document);
 if (!docRef) notFound();
 const locale = await getServerLocale();
 const loaded = await loadCouncilDocument(slug, document, locale);
 if (!loaded) notFound();
 const { content, isLocalized } = loaded;
 const isDe = locale === "de";

 return (
 <section className="bg-night px-5 md:px-8 py-16 md:py-24">
 <article className="mx-auto max-w-[760px] w-full">
 {/* Breadcrumb */}
 <p className="font-sans text-[12px] uppercase tracking-[1.5px] text-paper/45 mb-6">
 <Link href="/councils" className="hover:text-paper transition-colors">
 {isDe ? "Die Konzile" : "The Councils"}
 </Link>
 <span className="mx-2 text-paper/30">/</span>
 <Link
 href={`/councils/${c.slug}`}
 className="hover:text-paper transition-colors"
 >
 {c.byname}
 </Link>
 </p>
 {!isLocalized && locale !== "en" && (
 <ContentNotYetTranslated locale={locale} kind="work" />
 )}

 <h1 className="font-display-serif text-[36px] md:text-[48px] text-paper leading-[1.1] tracking-[-0.01em]">
 {content.title}
 </h1>
 {content.subtitle && (
 <p className="mt-3 font-sans text-[16px] text-paper/65">
 {content.subtitle}
 </p>
 )}

 {/* Source */}
 <p className="mt-6 font-sans text-[12.5px] text-paper/45 leading-[1.55] italic">
 {content.source}
 </p>

 {/* Sections */}
 <div className="mt-12 space-y-12">
 {content.sections.map((s) => (
 <section key={s.n}>
 <p className="font-sans text-[11px] uppercase tracking-[1.5px] text-gold/70 font-semibold mb-2">
 {isDe ? `Abschnitt ${s.n}` : `Section ${s.n}`}
 </p>
 <h2 className="font-display-serif text-[24px] md:text-[28px] text-paper leading-[1.2]">
 {s.title}
 </h2>
 {s.framing && (
 <p className="mt-4 font-sans text-[14.5px] text-paper/65 leading-[1.65] border-l border-gold/30 pl-4">
 {s.framing}
 </p>
 )}
 {s.citation && (
 <p className="mt-4 font-sans text-[11.5px] uppercase tracking-[1.2px] text-paper/45 font-semibold">
 {s.citation}
 </p>
 )}
 <div className="mt-5 space-y-4 font-serif text-[18px] md:text-[19px] text-paper/90 leading-[1.7]">
 {s.paragraphs.map((p, i) => (
 <p key={i}>{p}</p>
 ))}
 </div>
 {s.notes && s.notes.length > 0 && (
 <ul className="mt-6 space-y-2 font-sans text-[13.5px] text-paper/55 leading-[1.6] border-t border-paper/10 pt-4">
 {s.notes.map((n, i) => (
 <li key={i}>· {n}</li>
 ))}
 </ul>
 )}
 </section>
 ))}
 </div>

 {/* Footer nav */}
 <div className="mt-16 pt-8 border-t border-paper/10">
 <Link
 href={`/councils/${c.slug}`}
 className="font-sans text-[14px] text-paper/65 hover:text-paper transition-colors"
 >
 {isDe ? "← Zurück zu" : "← Back to"} {c.byname}
 </Link>
 </div>
 </article>
 </section>
 );
}
