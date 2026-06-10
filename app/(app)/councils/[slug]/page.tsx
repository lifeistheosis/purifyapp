import Link from "next/link";
import { notFound } from "next/navigation";
import { COUNCILS, getCouncil } from "@/lib/councils/councils";
import { HERESIES } from "@/lib/heresies/heresies";

const ORDINAL_NAMES = [
 "",
 "First",
 "Second",
 "Third",
 "Fourth",
 "Fifth",
 "Sixth",
 "Seventh",
];

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

 return (
 <section className="bg-night px-5 md:px-8 py-16 md:py-24">
 <article className="mx-auto max-w-[820px] w-full">
 {/* Breadcrumb */}
 <p className="font-sans text-caption uppercase tracking-[1.5px] text-paper/45 mb-6">
 <Link href="/councils" className="hover:text-paper transition-colors">
 The Councils
 </Link>
 </p>

 {/* Hero */}
 <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-gold/80">
 {c.kind === "local"
 ? "Local Council"
 : `${ORDINAL_NAMES[c.ordinal ?? 0]} Ecumenical Council`}
 </p>
 <h1 className="mt-3 font-display-serif text-display-sm md:text-display-lg text-paper leading-[1.05] tracking-[-0.015em]">
 {c.byname}
 </h1>
 <p className="mt-4 font-sans text-ui text-paper/65">
 {c.year} &middot; {c.location}
 </p>

 {/* Brief facts strip */}
 <dl className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 font-sans text-ui">
 {c.presidingEmperor && (
 <div>
 <dt className="text-paper/45 uppercase tracking-[1.2px] text-eyebrow font-semibold">
 Presiding emperor
 </dt>
 <dd className="mt-1 text-paper/85">{c.presidingEmperor}</dd>
 </div>
 )}
 {c.convenedBy && (
 <div>
 <dt className="text-paper/45 uppercase tracking-[1.2px] text-eyebrow font-semibold">
 Convened by
 </dt>
 <dd className="mt-1 text-paper/85">{c.convenedBy}</dd>
 </div>
 )}
 {c.bishopsAttending && (
 <div>
 <dt className="text-paper/45 uppercase tracking-[1.2px] text-eyebrow font-semibold">
 Bishops attending
 </dt>
 <dd className="mt-1 text-paper/85">{c.bishopsAttending}</dd>
 </div>
 )}
 </dl>

 {/* Defined / Condemned */}
 <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
 <div>
 <h2 className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
 What the Council defined
 </h2>
 <ul className="space-y-3 font-serif text-body text-paper/85 leading-[1.65] list-disc pl-5 marker:text-gold/60">
 {c.defined.map((d, i) => (
 <li key={i}>{d}</li>
 ))}
 </ul>
 </div>
 <div>
 <h2 className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
 What the Council condemned
 </h2>
 <ul className="space-y-3 font-serif text-body text-paper/85 leading-[1.65] list-disc pl-5 marker:text-paper/30">
 {c.condemned.map((x, i) => (
 <li key={i}>{x}</li>
 ))}
 </ul>
 </div>
 </div>

 {/* Historical narrative */}
 <div className="mt-14">
 <h2 className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-paper/55 mb-5">
 Historical context
 </h2>
 <div className="space-y-5 font-serif text-lede md:text-lede text-paper/85 leading-[1.7]">
 {c.life.map((para, i) => (
 <p key={i}>{para}</p>
 ))}
 </div>
 </div>

 {/* Principal Fathers */}
 {c.principalFathers && c.principalFathers.length > 0 && (
 <div className="mt-14">
 <h2 className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-paper/55 mb-5">
 The Holy Fathers principally associated
 </h2>
 <ul className="space-y-5">
 {c.principalFathers.map((f, i) => (
 <li key={i} className="rounded-md border border-paper/12 bg-paper/[0.02] px-5 py-4">
 <p className="font-display-serif text-lede text-paper">
 {f.slug ? (
 <Link
 href={`/saints/${f.slug}`}
 className="hover:text-gold transition-colors underline underline-offset-4 decoration-gold/40 hover:decoration-gold"
 >
 {f.name}
 </Link>
 ) : (
 f.name
 )}
 </p>
 <p className="mt-2 font-serif text-ui text-paper/75 leading-[1.6]">
 {f.role}
 </p>
 </li>
 ))}
 </ul>
 </div>
 )}

 {/* Principal opposed */}
 {c.principalOpposed && c.principalOpposed.length > 0 && (
 <div className="mt-12">
 <h2 className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-paper/55 mb-5">
 The principal opposing parties
 </h2>
 <ul className="space-y-5">
 {c.principalOpposed.map((o, i) => (
 <li key={i} className="rounded-md border border-paper/10 bg-paper/[0.015] px-5 py-4">
 <p className="font-sans text-ui font-semibold text-paper/85">
 {o.slug ? (
 <Link
 href={`/heresies/${o.slug}`}
 className="hover:text-gold transition-colors underline underline-offset-4 decoration-gold/40 hover:decoration-gold"
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
 <h2 className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-paper/55 mb-5">
 Heresies condemned
 </h2>
 <ul className="space-y-3">
 {condemnedHeresies.map((h) => (
 <li key={h.slug}>
 <Link
 href={`/heresies/${h.slug}`}
 className="group block rounded-md border border-paper/12 bg-paper/[0.03] hover:border-gold/45 hover:bg-gold/[0.04] transition-colors px-5 py-4"
 >
 <p className="font-display-serif text-lede text-paper group-hover:text-gold transition-colors">
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

 {/* Documents */}
 {(c.documents.length > 0 ||
 (c.pendingDocuments && c.pendingDocuments.length > 0)) && (
 <div className="mt-14">
 <h2 className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-paper/55 mb-5">
 {c.documents.length > 0
 ? "Read the Council’s documents"
 : "The Council’s documents"}
 </h2>
 {c.documents.length > 0 && (
 <ul className="space-y-3">
 {c.documents.map((doc) => (
 <li key={doc.slug}>
 <Link
 href={`/councils/${c.slug}/${doc.slug}`}
 className="group block rounded-md border border-paper/12 bg-paper/[0.03] hover:border-gold/45 hover:bg-gold/[0.04] transition-colors px-5 py-4"
 >
 <p className="font-display-serif text-lede text-paper">
 {doc.title}
 </p>
 {doc.subtitle && (
 <p className="mt-1 font-sans text-detail text-paper/55">
 {doc.subtitle}
 </p>
 )}
 <p className="mt-2 font-serif text-ui text-paper/75 leading-[1.6]">
 {doc.blurb}
 </p>
 </Link>
 </li>
 ))}
 </ul>
 )}

 {c.pendingDocuments && c.pendingDocuments.length > 0 && (
 <div className="mt-5 rounded-md border border-dashed border-paper/15 bg-paper/[0.015] px-5 py-4">
 <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/45 mb-3">
 Pending
 </p>
 <ul className="space-y-3">
 {c.pendingDocuments.map((p, i) => (
 <li key={i}>
 <p className="font-display-serif text-body text-paper/75">
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
 </div>
 )}
 </article>
 </section>
 );
}
