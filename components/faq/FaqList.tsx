import type { ReactNode } from "react";

import { T } from "@/components/i18n/T";
import { ChevronDown } from "@/components/ui/icons/ChevronDown";
import { textDir } from "@/lib/i18n/textDir";

/**
 * The FAQ as it is drawn, in whichever language it is given (1.9, the
 * reader's language in the apps): the English page draws it on the server
 * (app/(app)/faq/page.tsx), the German draws it on the device
 * (./FaqDe.tsx, loaded by ./FaqInReadersLanguage.tsx).
 *
 * The English page's questions and answers are the catalog's, in all 21
 * languages, so it has no note that its body is English (it had one, which
 * was true of one line). That line, the lead, is English for every reader
 * but a German one, and says so with `leadLang` (build 90 note 4).
 */

export type QA = {
 q: string;
 /**
  * Where the message catalogs hold the question, so the island that draws it
  * can ask it in the reader's language. A server component's own string is
  * baked into the apps in English, which is why the question is not drawn
  * from `q`. The English `q` stays as the fallback, and has to stay the
  * same, letter for letter, as en.json under this key
  * (lib/i18n/__tests__/smallLabels.test.ts holds the two together). The
  * German list has no keys: its questions are written out below.
  */
 k?: string;
 a: React.ReactNode;
};

const SECTION = "px-5 md:px-8 py-16 md:py-24";

export function FaqList({ questions, eyebrow, h1, lead, leadLang }: { questions: QA[]; eyebrow: ReactNode; h1: ReactNode; lead: ReactNode; leadLang?: string }) {
 return (
 <section className={`${SECTION} bg-night`}>
 <article className="mx-auto max-w-[760px] w-full">
 <p className="font-sans text-detail font-semibold text-paper/55 mb-4">{eyebrow}</p>
 <h1 id="faq-title" className="font-sans text-display-sm md:text-display font-bold leading-[1.05] tracking-[-0.025em] text-paper">
 {h1}
 </h1>
 <p lang={leadLang} dir={textDir(leadLang)} className="mt-6 font-serif text-body text-paper/75 leading-[1.7]">{lead}</p>

 <div className="mt-10 space-y-3">
 {questions.map((qa, i) => (
 <details
 key={i}
 open={i === 0}
 className="group rounded-md border border-paper/12 bg-paper/[0.03] open:bg-paper/[0.05] transition-colors"
 >
 <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between gap-4">
 <span className="font-sans text-body md:text-body font-semibold text-paper leading-tight">
 {qa.k ? <T k={qa.k} /> : qa.q}
 </span>
 <span
 aria-hidden
 className="text-paper/45 group-open:rotate-180 transition-transform duration-200 text-caption shrink-0"
 >
 <ChevronDown size={14} className="block" />
 </span>
 </summary>
 <div className="px-5 pb-5 -mt-1 font-serif text-body text-paper/85 leading-[1.7] space-y-4">
 {qa.a}
 </div>
 </details>
 ))}
 </div>
 </article>
 </section>
 );
}
