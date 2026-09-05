import Link from "next/link";

import { T } from "@/components/i18n/T";
import { bankHasQuestions } from "@/lib/catechism/bank";

/**
 * One line on Today, and only while there is something behind it.
 *
 * A server component, so it can ask the bank directly and render nothing at
 * all when the file is empty: no card promising a feature that has no
 * content yet. The strings are <T> islands so the line follows a native
 * locale switch. No quiz code loads here; the link is the whole card.
 */
export function CatechismCard() {
  if (!bankHasQuestions()) return null;
  return (
    <Link
      href="/catechism"
      className="mt-4 block rounded-2xl border border-paper/10 bg-paper/[0.03] px-5 py-4 transition-colors hover:border-paper/25 hover:bg-paper/[0.05]"
    >
      <p className="font-sans text-eyebrow uppercase tracking-[2px] text-gold/80">
        <T k="catechism.card.eyebrow" />
      </p>
      <p className="mt-1 font-serif text-body leading-[1.5] text-paper">
        <T k="catechism.card.line" />
      </p>
    </Link>
  );
}
