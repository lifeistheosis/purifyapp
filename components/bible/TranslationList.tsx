"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Check } from "@/components/ui/icons/Check";
import { getBook } from "@/lib/bible/books";
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

/**
 * Which translations this chapter offers, the one it is read in, and the way
 * to choose another: the address's ?v= for a licensed one, cleared for a
 * public-domain one, and remembered for the next chapter
 * (lib/bible/translationPref.ts). The phone's sheet (MobileTranslationPill)
 * and the computer's popover (TranslationSwitcher) both read it, so the two
 * offer the same rows. The list itself is lib/bible/translations.ts.
 */
export function useTranslationChoice(currentSlug: string, configured: readonly string[]) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const book = getBook(currentSlug);
  const scope = { testament: book?.testament ?? "OT", source: book?.source, configured } as const;
  const list = translationsFor(scope);
  const current = currentTranslation({ ...scope, activeV: searchParams.get("v") });

  /** Opens the chapter in `t`. The one being read, or one that cannot be picked, changes nothing. */
  function choose(t: Translation): void {
    if (!isSelectable(t, configured) || t.id === current.id) return;
    writeTranslationPref(t.licensed ? t.id : null);
    const qs = queryFor(t, searchParams.toString());
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return { testament: scope.testament, list, current, choose };
}

/**
 * The rows: each translation by its own title, with one plain line under it
 * (public domain, its permission, or coming soon). The one being read is
 * marked as the book sheet marks its book, with a drawn check at the end. A
 * translation not in the app yet is shown and cannot be picked. No badges:
 * the line under the title already says what a badge said.
 *
 * Grouped by the language of the text once there is more than one (the
 * Greek, Romanian and Filipino Bibles of 1.7); until then the group is named
 * by its testament, as the book sheet is.
 */
export function TranslationList({
  testament,
  list,
  current,
  configured,
  onChoose,
}: {
  testament: "OT" | "NT";
  list: Translation[];
  current: Translation;
  configured: readonly string[];
  onChoose: (t: Translation) => void;
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
  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <section key={group.language} aria-label={groups.length > 1 ? languageName(group.language) : undefined}>
          <p className="mb-2 font-sans text-caption font-semibold text-paper/55">
            {groups.length > 1
              ? languageName(group.language)
              : testament === "OT"
                ? t("bible.oldTestamentShort")
                : t("bible.newTestamentShort")}
          </p>
          <ul className="space-y-1">
            {group.rows.map((tr) => {
              const isCurrent = tr.id === current.id;
              const selectable = isSelectable(tr, configured);
              return (
                <li key={tr.id}>
                  <button
                    type="button"
                    lang={tr.language}
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
                    <span className="min-w-0 flex-1">
                      <span className="block font-sans text-ui font-semibold text-paper">{tr.fullLabel}</span>
                      <span lang={locale} className="mt-0.5 block font-sans text-caption text-paper/50">
                        {t(`bible.translationNote.${tr.id}`)}
                      </span>
                    </span>
                    {isCurrent ? <Check size={18} className="shrink-0 text-paper" /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
