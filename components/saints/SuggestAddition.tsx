import { T } from "@/components/i18n/T";
import { SUPPORT_EMAIL } from "@/lib/legal/entity";

/**
 * The email a suggestion opens: to support, its subject in English with the
 * saint's own name, whatever language the reader writes in, so the team can
 * find and sort it (1.9, call 24, the owner's yes of 2026-11-11).
 */
export function suggestionHref(name: string): string {
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Suggested addition: ${name}`)}`;
}

/**
 * Under every saint's life: one line in the reader's language, asking what
 * he would add and where it is written, and the link that writes it. The
 * lives stay as written and reviewed; a suggestion reaches the team, never
 * the page.
 */
export function SuggestAddition({ name }: { name: string }) {
  return (
    <div data-suggest-addition="" className="mt-10 max-w-[640px] border-t border-paper/8 pt-6">
      <p className="font-sans text-ui leading-snug text-paper/70">
        <T k="saints.suggest.line" />
      </p>
      <a
        href={suggestionHref(name)}
        className="mt-1 inline-flex min-h-11 items-center font-sans text-ui text-paper underline decoration-paper/30 underline-offset-4 hover:decoration-paper"
      >
        <T k="saints.suggest.link" />
      </a>
    </div>
  );
}
