"use client";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { creditKey, creditWords, isolatedName, saintPictureCredit } from "@/lib/credits/saintPictures";

const LINK = "hit-44 underline underline-offset-2 decoration-paper/30 hover:text-paper hover:decoration-paper";

/**
 * The line under a saint's picture on his page that names its maker, where
 * the picture's licence asks it (lib/credits/saintPictures.ts; the arbiter,
 * 2026-11-11, for St Mark of Ephesus's icon): "Icon by …" or "Photograph by
 * …", then the licence, which opens its deed, and Source, which opens the
 * maker's page. A picture that asks no credit has no line. Quiet type, as the
 * credits page sets its rows, centred under the icon on a phone and at the
 * start of its column beside the name on a tablet and a computer.
 */
export function PictureCredit({ src }: { src?: string | null }) {
  const { t } = useTranslate();
  const credit = saintPictureCredit(src);
  if (!credit) return null;
  return (
    <figcaption data-picture-credit={src ?? ""} className="mt-3 max-w-[300px] text-center font-sans text-detail leading-snug text-paper/70 md:text-start">
      <span className="block">{t(creditKey(credit), { name: isolatedName(credit.name) })}</span>
      <span className="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 md:justify-start">
        <a href={credit.deed} target="_blank" rel="noopener noreferrer license" className={LINK}>
          {credit.licence}
        </a>
        <a href={credit.source} target="_blank" rel="noopener noreferrer" className={LINK}>
          {t("credits.source")}
        </a>
      </span>
    </figcaption>
  );
}

/**
 * What a small face of such a picture says to a screen reader: the credit,
 * unseen, inside the link that opens the saint's page, where the line under
 * his picture names the maker for every eye (the arbiter, 2026-11-11: no line
 * under every face). A picture that asks no credit says nothing more.
 */
export function PictureCreditNote({ src }: { src?: string | null }) {
  const { t } = useTranslate();
  const words = creditWords(src, t);
  if (!words) return null;
  return (
    <span className="sr-only" data-picture-credit-note={src ?? ""}>
      {words}
    </span>
  );
}
