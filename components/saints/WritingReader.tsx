import Link from "next/link";
import type { WritingContent } from "@/lib/saints/load";
import type { Saint } from "@/lib/saints/saints";

export function WritingReader({
  saint,
  content,
}: {
  saint: Saint;
  content: WritingContent;
}) {
  return (
    <article className="pt-12 md:pt-16 pb-24">
      <nav className="mb-10 flex items-center gap-2 font-sans text-[13px] text-paper/55">
        <Link
          href="/saints"
          className="hover:text-paper transition-colors duration-150"
        >
          Saints
        </Link>
        <span className="text-paper/30">›</span>
        <Link
          href={`/saints/${saint.slug}`}
          className="hover:text-paper transition-colors duration-150 truncate"
        >
          {saint.name}
        </Link>
        <span className="text-paper/30">›</span>
        <span className="text-paper truncate">{content.title}</span>
      </nav>

      <header className="pb-10 border-b border-paper/8">
        <p className="font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
          {saint.name}
        </p>
        <h1 className="font-serif text-[40px] md:text-[52px] text-paper leading-[1.1] tracking-[-0.01em]">
          {content.title}
        </h1>
        {content.subtitle && (
          <p className="mt-4 font-sans text-[17px] text-paper/65 italic">
            {content.subtitle}
          </p>
        )}
      </header>

      {/* Table of contents — only for longer works (4+ sections). */}
      {content.sections.length >= 4 && (
        <details className="mt-8 group rounded-md border border-paper/12 bg-paper/[0.02] open:bg-paper/[0.04] transition-colors">
          <summary className="cursor-pointer list-none px-5 py-3.5 flex items-center justify-between">
            <span className="flex items-baseline gap-3">
              <span className="font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-paper/55">
                Contents
              </span>
              <span className="font-sans text-[12px] text-paper/40">
                {content.sections.length} sections
              </span>
            </span>
            <span
              aria-hidden
              className="text-paper/40 group-open:rotate-180 transition-transform duration-200 text-[12px]"
            >
              ▾
            </span>
          </summary>
          <ol className="px-5 pb-4 pt-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 font-sans text-[13.5px]">
            {content.sections.map((sec) => (
              <li key={sec.n}>
                <a
                  href={`#s${sec.n}`}
                  className="group/toc inline-flex items-baseline gap-2.5 py-1 text-paper/70 hover:text-paper transition-colors"
                >
                  <span className="font-semibold tabular-nums text-paper/40 group-hover/toc:text-paper/65 w-6 text-right">
                    {sec.n}
                  </span>
                  <span className="truncate">{sec.title}</span>
                </a>
              </li>
            ))}
          </ol>
        </details>
      )}

      <div className="py-10 space-y-16">
        {content.sections.map((sec) => (
          <section
            key={sec.n}
            id={`s${sec.n}`}
            aria-labelledby={`s-${sec.n}`}
            className="scroll-mt-24 grid grid-cols-1 lg:grid-cols-[minmax(0,680px)_minmax(0,1fr)] gap-x-12 gap-y-8"
          >
            <div className="min-w-0">
              <div className="mb-6 flex items-baseline gap-4">
                <span className="font-sans text-[12px] font-semibold uppercase tracking-[1.2px] text-paper/40 tabular-nums">
                  {String(sec.n).padStart(2, "0")}
                </span>
                <h2
                  id={`s-${sec.n}`}
                  className="font-sans text-[22px] md:text-[26px] font-semibold text-paper tracking-[-0.01em]"
                >
                  {sec.title}
                </h2>
              </div>
              <div className="space-y-5">
                {sec.paragraphs.map((p, i) => (
                  <p
                    key={i}
                    className="font-serif text-[19px] md:text-[20px] text-paper/90 leading-[1.7]"
                  >
                    {p}
                  </p>
                ))}
              </div>
            </div>

            {sec.notes?.length ? (
              <aside
                aria-label={`Notes on ${sec.title}`}
                className="lg:pt-1 lg:border-l lg:border-paper/10 lg:pl-8"
              >
                <p className="font-sans text-[11px] font-semibold uppercase tracking-[1.5px] text-paper/45 mb-4">
                  Notes
                </p>
                <ul className="space-y-4">
                  {sec.notes.map((note, i) => (
                    <li
                      key={i}
                      className="font-sans text-[14px] text-paper/70 leading-[1.55]"
                    >
                      {note}
                    </li>
                  ))}
                </ul>
              </aside>
            ) : null}
          </section>
        ))}
      </div>

      <footer className="max-w-[680px] pt-8 border-t border-paper/8">
        <p className="font-sans text-[12px] text-paper/40">
          Source: {content.source}
        </p>
      </footer>
    </article>
  );
}
