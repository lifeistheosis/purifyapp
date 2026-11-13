"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Check } from "@/components/ui/icons/Check";
import { getBook } from "@/lib/bible/books";
import { DOWNLOADABLE_BIBLES, type DownloadableBible } from "@/lib/bible/downloads/catalog";
import { writeBibleChoice } from "@/lib/bible/downloads/choice";
import { holdPlace } from "@/lib/bible/keepPlace";
import { offerLanguageFor } from "@/lib/bible/downloads/languageOffer";
import { useShownBible } from "@/lib/bible/downloads/useShownBible";
import {
  byLanguage,
  currentTranslation,
  isSelectable,
  queryFor,
  translationsFor,
  type Translation,
} from "@/lib/bible/translations";
import { writeTranslationPref } from "@/lib/bible/translationPref";
import { cn } from "@/lib/cn";
import { textDir } from "@/lib/i18n/textDir";

import { BibleRow } from "./BibleRow";

/**
 * Which translations this chapter offers, the one it is read in, and the way
 * to choose another: the address's ?v= for a licensed one, cleared for a
 * public-domain one, and remembered for the next chapter
 * (lib/bible/translationPref.ts). The phone's sheet (in the reader's ••• sheet,
 * ReaderMoreSheet) and the computer's popover (TranslationSwitcher) both read
 * it, so the two
 * offer the same rows. The list itself is lib/bible/translations.ts.
 *
 * From 1.9 the Bibles a reader downloads are chosen here too
 * (lib/bible/downloads/): a choice kept on the device, not in the address,
 * which choosing the English or a licensed translation clears. `shown` is
 * the downloaded Bible the chapter is shown in, when it is; `label` names
 * what the chapter is read in, for the pills.
 */
export function useTranslationChoice(currentSlug: string, configured: readonly string[]) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { locale } = useTranslate();
  const book = getBook(currentSlug);
  const scope = { testament: book?.testament ?? "OT", source: book?.source, configured } as const;
  const list = translationsFor(scope);
  const current = currentTranslation({ ...scope, activeV: searchParams.get("v") });
  const { shown } = useShownBible(currentSlug);

  /**
   * Opens the chapter in `t`. The one being read, or one that cannot be picked,
   * changes nothing. A switch keeps the reader's verse (1.9, build 93 note 20,
   * lib/bible/keepPlace.ts): it is read before, the page does not jump to its
   * top, and the chapter sets it back at the reading place (KeptPlace).
   */
  function choose(t: Translation): void {
    if (!isSelectable(t, configured)) return;
    if (shown || t.id !== current.id) holdPlace(pathname);
    // From a downloaded Bible back to the English the chapter already names.
    if (shown) writeBibleChoice(null);
    if (t.id === current.id) return;
    writeTranslationPref(t.licensed ? t.id : null);
    const qs = queryFor(t, searchParams.toString());
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  /** Reads on in a downloaded Bible (on the phone, in the apps), and offers the app in its language. */
  function chooseBible(bible: DownloadableBible): void {
    if (shown?.id === bible.id) return;
    holdPlace(pathname);
    writeBibleChoice(bible.id);
    writeTranslationPref(null);
    if (searchParams.get("v")) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("v");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }
    offerLanguageFor(bible, locale);
  }

  return { testament: scope.testament, list, current, choose, shown, chooseBible, label: shown?.shortLabel ?? current.shortLabel };
}

/**
 * The rows: each translation by its own title, with one plain line under it
 * (public domain, its permission, or coming soon). The one being read is
 * marked as the book sheet marks its book, with a drawn check at the end. A
 * translation not in the app yet is shown and cannot be picked. No badges:
 * the line under the title already says what a badge said.
 *
 * Grouped by the language of the text: the English first, then each Bible a
 * reader downloads (1.9), under its language's name, its row saying what it
 * is and, in the apps, downloading it, showing how far it has come, and
 * taking it off the phone again (BibleRow).
 */
export function TranslationList({
  list,
  current,
  configured,
  onChoose,
  book,
  shown = null,
  onChooseBible,
}: {
  testament?: "OT" | "NT";
  list: Translation[];
  current: Translation;
  configured: readonly string[];
  onChoose: (t: Translation) => void;
  /** The chapter's book, for a Bible that does not have it. */
  book: string;
  /** The downloaded Bible the chapter is shown in, when it is. */
  shown?: DownloadableBible | null;
  onChooseBible: (bible: DownloadableBible) => void;
}) {
  const { t, locale } = useTranslate();
  const groups = byLanguage(list);
  const languageName = (code: string) => {
    try {
      return new Intl.DisplayNames([locale], { type: "language" }).of(code) ?? code;
    } catch {
      return code;
    }
  };
  // A downloaded Bible in a language the list already has (the World English
  // Bible, build 95 note 25) stands under that language's heading, after its
  // rows: one English, not two.
  const withRows = (language: string) => groups.some((g) => g.language === language);
  const bibleGroups: { language: string; bibles: DownloadableBible[] }[] = [];
  for (const b of DOWNLOADABLE_BIBLES) {
    if (withRows(b.language)) continue;
    const group = bibleGroups.find((g) => g.language === b.language);
    if (group) group.bibles.push(b);
    else bibleGroups.push({ language: b.language, bibles: [b] });
  }
  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <section key={group.language} aria-label={languageName(group.language)}>
          <p className="mb-2 font-sans text-caption font-semibold text-paper/55">{languageName(group.language)}</p>
          <ul className="space-y-1">
            {group.rows.map((tr) => {
              const isCurrent = !shown && tr.id === current.id;
              const selectable = isSelectable(tr, configured);
              return (
                <li key={tr.id}>
                  <button
                    type="button"
                    disabled={!selectable}
                    aria-current={isCurrent ? "true" : undefined}
                    onClick={() => onChoose(tr)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md border px-3 py-3 text-start",
                      isCurrent
                        ? "border-gold/45 bg-gold/15"
                        : selectable
                          ? "border-transparent hover:bg-paper/[0.04]"
                          : "border-transparent opacity-50",
                    )}
                  >
                    {/* The row keeps the page's direction (its check on the page's far side); its words say their own. */}
                    <span className="min-w-0 flex-1">
                      <span lang={tr.language} dir={textDir(tr.language)} className="block font-sans text-ui font-semibold text-paper">
                        {tr.fullLabel}
                      </span>
                      <span lang={locale} dir={textDir(locale)} className="mt-0.5 block font-sans text-caption text-paper/50">
                        {t(`bible.translationNote.${tr.id}`)}
                      </span>
                    </span>
                    {isCurrent ? <Check size={18} className="shrink-0 text-paper" /> : null}
                  </button>
                </li>
              );
            })}
            {DOWNLOADABLE_BIBLES.filter((b) => b.language === group.language).map((b) => (
              <BibleRow key={b.id} bible={b} book={book} current={shown?.id === b.id} onChoose={() => onChooseBible(b)} />
            ))}
          </ul>
        </section>
      ))}
      {bibleGroups.map((group) => (
        <section key={group.language} aria-label={languageName(group.language)}>
          <p className="mb-2 font-sans text-caption font-semibold text-paper/55">{languageName(group.language)}</p>
          <ul className="space-y-1">
            {group.bibles.map((b) => (
              <BibleRow key={b.id} bible={b} book={book} current={shown?.id === b.id} onChoose={() => onChooseBible(b)} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
