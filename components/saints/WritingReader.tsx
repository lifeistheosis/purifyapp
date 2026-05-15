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

      <div className="max-w-[680px] py-10 space-y-14">
        {content.sections.map((sec) => (
          <section key={sec.n} aria-labelledby={`s-${sec.n}`}>
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
