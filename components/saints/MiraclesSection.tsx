import { loadWriting } from "@/lib/saints/load";
import { getServerLocale } from "@/lib/i18n/server";
import { T } from "@/components/i18n/T";

/**
 * "Miracles", a saint's proclaimed miracles told in the exact, verbatim words
 * of a public-domain official account: the Miracles part of his page (1.7),
 * which the switch above names, so it carries no label of its own. The
 * content lives at `data/saints/{slug}/miracles.json` (the same
 * `WritingContent` / `Section` shape as the saint's works) and is loaded
 * server-side. Each `Section` is one miracle: its `title`, an optional editor
 * `framing`, the source `citation`, the verbatim `paragraphs`, and optional
 * `notes`.
 *
 * The editor's framing is a quiet paragraph under a small "Editor's note",
 * set apart by its italic and its colour, not by a stripe down its side.
 *
 * Returns `null` when no account exists, so the section degrades silently for
 * saints without a public-domain miracle text.
 */
export async function MiraclesSection({ slug }: { slug: string }) {
 const locale = await getServerLocale();
 const content = await loadWriting(slug, "miracles", locale);
 if (!content || content.sections.length === 0) return null;

 return (
  <div>
   <div className="max-w-[760px] space-y-14">
    {content.sections.map((sec) => (
     <article key={sec.n}>
      {sec.title && (
       <h2 className="mb-4 text-title-sm leading-[1.2] text-paper md:text-title">
        {sec.title}
       </h2>
      )}

      {sec.framing && (
       <div className="mb-5">
        <p className="font-sans text-caption font-semibold text-paper/55">
         <T k="saints.editorsNote" />
        </p>
        <p className="mt-1 font-sans text-ui italic leading-[1.65] text-paper/70 md:text-body">
         {sec.framing}
        </p>
       </div>
      )}

      {sec.citation && (
       <p className="mb-4 font-sans text-caption font-semibold text-paper/55">
        {sec.citation}
       </p>
      )}

      <div className="space-y-5">
       {sec.paragraphs.map((p, i) => (
        <p key={i} className="font-serif text-lede leading-[1.7] text-paper/85">
         {p}
        </p>
       ))}
      </div>

      {sec.notes && sec.notes.length > 0 && (
       <ul className="mt-6 space-y-2 border-t border-paper/8 pt-5">
        {sec.notes.map((note, i) => (
         <li key={i} className="font-sans text-ui leading-[1.6] text-paper/55">
          {note}
         </li>
        ))}
       </ul>
      )}
     </article>
    ))}
   </div>

   <p className="mt-10 font-sans text-caption text-paper/55">{content.source}</p>
  </div>
 );
}
