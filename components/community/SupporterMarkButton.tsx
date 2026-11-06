"use client";

import Link from "next/link";
import { useState } from "react";

import { SupporterMark } from "@/components/community/SupporterMark";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Sheet } from "@/components/ui/Sheet";
import { authorMarkLabelKey, type AuthorMark } from "@/lib/community/authorMark";

/**
 * The supporter mark, tappable where it stands on its own (1.9, the owner's
 * Identity 2): a tap says what the cross means, in a small sheet, with the
 * way to Plus. On a phone the mark's tooltip never showed (it waits for a
 * hover), so a reader met a cross beside a name and no word for it.
 *
 * The words are about the mark, not the person: "The cross marks those who
 * keep Purify going with Purify Plus." No name and no pronoun, so no language
 * has to guess a reader's gender. His answer of 2026-11-06 keeps the word
 * Supporter: "plus users are supporters".
 *
 * Used where the mark is not inside another control (a reply's line, and a
 * post's line after the name button); SupporterMark itself stays a plain
 * image for every other place.
 */
export function SupporterMarkButton({ tier, size }: { tier: AuthorMark | undefined; size?: number }) {
  const { t } = useTranslate();
  const [open, setOpen] = useState(false);
  const key = authorMarkLabelKey(tier);
  if (!key) return null;
  const pro = tier === "pro";
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={t(key)}
        data-supporter-mark-button=""
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className="hit-44 inline-flex shrink-0 items-center align-middle"
      >
        <SupporterMark tier={tier} size={size} />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={t(key)}>
        <div className="px-1 pb-2">
          <p className="font-sans text-ui leading-relaxed text-paper/85">{t(pro ? "community.mark.bodyPro" : "community.mark.body")}</p>
          <p className="mt-2 font-serif text-body text-paper">{t("plus.kept.title")}</p>
          <Link
            href="/pricing"
            onClick={() => setOpen(false)}
            className="tap-press mt-5 flex min-h-11 w-full items-center justify-center rounded-pill border border-paper/25 font-sans text-ui font-semibold text-paper"
          >
            {t("community.mark.aboutPlus")}
          </Link>
        </div>
      </Sheet>
    </>
  );
}
