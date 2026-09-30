"use client";

import Link from "next/link";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Sheet } from "@/components/ui/Sheet";
import { crossRefHref, crossRefNumbers, type CrossRefItem } from "@/lib/bible/crossRefShape";

/**
 * The passages a verse echoes (lib/bible/crossRefs.ts), a Purify Plus tool.
 * A sheet on a phone, a centred panel on a computer: each reference in the
 * reader's language, the words of the verse it points to, and a link that
 * opens the chapter at that verse. The data is OpenBible.info's, credited at
 * the foot as its licence asks.
 */
export function CrossRefSheet({
  book,
  chapter,
  verse,
  items,
  onClose,
}: {
  book: string;
  chapter: number;
  /** The verse whose references are open; null when closed. */
  verse: number | null;
  items: CrossRefItem[];
  onClose: () => void;
}) {
  const { t } = useTranslate();
  const reference = verse !== null ? `${t(`bible.books.${book}`)} ${chapter}:${verse}` : null;
  return (
    <Sheet
      open={reference !== null}
      onClose={onClose}
      title={reference ? t("bible.crossRefsFor", { reference }) : t("bible.crossRefs")}
      desktop
      bodyClassName="px-5 pb-6 pt-1"
    >
      <ol className="divide-y divide-paper/10">
        {items.map((ref) => (
          <li key={`${ref.book}-${ref.chapter}-${ref.verse}`}>
            <Link href={crossRefHref(ref)} onClick={onClose} className="group block py-3.5">
              <p className="font-sans text-detail font-semibold text-premium-ink group-hover:text-premium-bright">
                {t(`bible.books.${ref.book}`)} {crossRefNumbers(ref)}
              </p>
              <p className="mt-1 font-serif text-body leading-[1.6] text-paper/80">{ref.text}</p>
            </Link>
          </li>
        ))}
      </ol>
      <p className="mt-4 font-sans text-caption text-paper/45">{t("bible.crossRefsCredit")}</p>
    </Sheet>
  );
}
