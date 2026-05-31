import { loadWriting } from "@/lib/saints/load";
import { getServerLocale } from "@/lib/i18n/server";
import { getMessages, t } from "@/lib/i18n";

/**
 * "Miracles", a saint's proclaimed miracles told in the exact, verbatim words
 * of a public-domain official account. Rendered inline on the profile between
 * the quotes ("In his/her own words") and the disciples/works. The content
 * lives at `data/saints/{slug}/miracles.json` (the same `WritingContent` /
 * `Section` shape as the saint's works) and is loaded server-side. Each
 * `Section` is one miracle: its `title`, an optional editor `framing`, the
 * source `citation`, the verbatim `paragraphs`, and optional `notes`.
 *
 * Returns `null` when no account exists, so the section degrades silently for
 * saints without a public-domain miracle text. Mirrors the per-field styling
 * of `WritingReader` and the section chrome of `QuotesSection`.
 */
export async function MiraclesSection({ slug }: { slug: string }) {
 const locale = await getServerLocale();
 const content = await loadWriting(slug, "miracles", locale);
 if (!content || content.sections.length === 0) return null;

 const m = getMessages(locale);
 const eyebrow = t(m, "saints.miracles");

 return (
  <section className="py-14 border-b border-paper/8">
   <p className="font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-paper/55 mb-8">
    {eyebrow}
   </p>

   <div className="max-w-[760px] space-y-14">
    {content.sections.map((sec) => (
     <article key={sec.n}>
      {sec.title && (
       <h3 className="font-serif text-[24px] md:text-[26px] text-paper mb-5 leading-[1.2]">
        {sec.title}
       </h3>
      )}

      {sec.framing && (
       <div className="mb-6 pl-4 border-l-2 border-paper/15">
        <p className="font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-paper/45 mb-2">
         Editor&rsquo;s note
        </p>
        <p className="font-sans text-[15px] md:text-[16px] text-paper/70 leading-[1.65] italic">
         {sec.framing}
        </p>
       </div>
      )}

      {sec.citation && (
       <p className="font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-gold/85 mb-4">
        {sec.citation}
       </p>
      )}

      <div className="space-y-5">
       {sec.paragraphs.map((p, i) => (
        <p
         key={i}
         className="font-serif text-[19px] text-paper/85 leading-[1.7]"
        >
         {p}
        </p>
       ))}
      </div>

      {sec.notes && sec.notes.length > 0 && (
       <ul className="mt-6 space-y-2 border-t border-paper/8 pt-5">
        {sec.notes.map((note, i) => (
         <li
          key={i}
          className="font-sans text-[14px] text-paper/55 leading-[1.6]"
         >
          {note}
         </li>
        ))}
       </ul>
      )}
     </article>
    ))}
   </div>

   <p className="mt-10 font-sans text-[12px] uppercase tracking-[1.2px] text-paper/40">
    {content.source}
   </p>
  </section>
 );
}
