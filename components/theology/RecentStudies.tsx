"use client";

import Link from "next/link";

import { useTranslate } from "@/components/i18n/MessagesProvider";

import { FatherFace } from "./FatherFace";

export type RecentStudy = {
  slug: string;
  title: string;
  minutes?: number;
  /** The Father the study quotes most. */
  father?: { slug: string; name: string; iconUrl?: string };
};

/**
 * The studies added last (1.8, round 3 r3-13, C's library first for a
 * practicing reader): each by the face of the Father it quotes most, its
 * title and its length, in one raised tray.
 */
export function RecentStudies({ studies }: { studies: RecentStudy[] }) {
  const { t } = useTranslate();
  if (studies.length === 0) return null;
  return (
    <section data-theology-recent="" aria-labelledby="theology-recent" className="mt-6">
      <h3 id="theology-recent" className="font-serif text-[17px] font-bold leading-tight text-paper">
        {t("study.theology.recentlyAdded")}
      </h3>
      <ul className="theology-tray mt-2.5 overflow-hidden rounded-[20px] px-1.5 py-1">
        {studies.map((s) => (
          <li key={s.slug} className="theology-rule">
            <Link href={`/theology/${s.slug}`} className="theology-row flex min-h-[56px] items-center gap-3 rounded-[14px] px-2 py-2">
              <FatherFace father={s.father} size={38} />
              <span lang="en" className="min-w-0 flex-1 font-serif text-[15px] font-semibold leading-[1.26] text-paper/92">
                {s.title}
              </span>
              {s.minutes ? (
                <span className="shrink-0 font-sans text-[12.5px] tabular-nums text-paper/55">{t("bible.minRead", { minutes: s.minutes })}</span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
