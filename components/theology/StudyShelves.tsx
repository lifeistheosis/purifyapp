"use client";

import Link from "next/link";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Check } from "@/components/ui/icons/Check";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import type { PathRead } from "@/lib/theology/path";
import { usePathProgress } from "@/lib/theology/usePathProgress";

import { FatherFace } from "./FatherFace";
import { KindIcon, ReadMeta } from "./PathRead";
import { WholeIcon } from "./WholeIcon";
import { WAY_FACT, WAY_H2, WAY_TRAY } from "./wayStyle";

/** A subject of the faith and the studies the library holds on it. */
export type StudyShelf = {
  /** The subject's id, which is its step on the path. */
  id: string;
  title: string;
  line: string;
  /** The subject's icon (lib/theology/subjects.ts). */
  picture: string;
  /** Its studies, as the path builds them (lib/theology/pathSteps.ts). */
  studies: PathRead[];
};

/**
 * Doctrine's shelves (1.9, build 89 note 2): the treatises by subject, in the
 * order of the Creed, as the hub's path has them. Each shelf is headed by its
 * subject's icon whole in its own light on a small plate (the nine plates of
 * the hub, components/theology/PathPlates.tsx), with the subject's name and
 * its line, and opens that step of the path. The plates' numerals are left
 * off here: a subject with no study yet has no shelf, and I, III, IV would
 * read as shelves gone missing. Under it one raised tray of its
 * studies, each wearing the face of the Father it quotes most (the hub's
 * "Recently added", a step's studies), with what a step shows beside it: its
 * length, or the part the reader is in while it is begun, and a check once
 * it is read to its end (lib/theology/usePathProgress.ts, kept on the device
 * by the study's own reader, so it is the same whichever way the study was
 * opened).
 *
 * Until 1.9 this was a column of titles, lengths, subtitles and summaries
 * under hairlines, with no picture.
 */
export function StudyShelves({ shelves }: { shelves: StudyShelf[] }) {
  const { t } = useTranslate();
  const progress = usePathProgress();
  return (
    <>
      {shelves.map((shelf, at) => (
        <section key={shelf.id} data-study-shelf={shelf.id} aria-labelledby={`shelf-${shelf.id}`} className={at === 0 ? "mt-7" : "mt-8"}>
          <Link href={`/theology/path/${shelf.id}`} className="tap-press flex items-center gap-3.5">
            <span aria-hidden data-row-picture="" className="path-plate w-[56px] shrink-0">
              <WholeIcon src={shelf.picture} eager={at < 3} className="aspect-[4/5] w-full rounded-[3px]" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id={`shelf-${shelf.id}`} lang="en" className={WAY_H2}>
                {shelf.title}
              </h2>
              <p lang="en" className="mt-1 font-sans text-caption leading-[1.42] text-paper/55">
                {shelf.line}
              </p>
            </div>
            <ChevronRight size={14} className="shrink-0 text-paper/45 rtl:-scale-x-100" />
          </Link>

          <ul className={`${WAY_TRAY} mt-3`}>
            {shelf.studies.map((study) => {
              const read = progress.read.includes(study.id);
              return (
                <li key={study.id} className="theology-rule">
                  <Link
                    href={study.href}
                    data-read-state={read ? "read" : undefined}
                    className="theology-row flex min-h-[56px] items-center gap-3 rounded-[14px] px-2 py-2"
                  >
                    {study.father ? (
                      <span data-row-picture="" className="shrink-0">
                        <FatherFace father={study.father} size={38} />
                      </span>
                    ) : (
                      <span aria-hidden className="theology-plate grid size-[38px] shrink-0 place-items-center rounded-[12px] text-paper/85">
                        <KindIcon kind="study" size={18} />
                      </span>
                    )}
                    <span lang="en" className={`min-w-0 flex-1 font-serif text-[15px] font-semibold leading-[1.26] ${read ? "text-paper/60" : "text-paper/92"}`}>
                      {study.title}
                    </span>
                    <span className={WAY_FACT}>
                      <ReadMeta read={study} progress={progress} />
                    </span>
                    {read ? (
                      <>
                        <Check size={15} className="shrink-0 text-paper/60" />
                        <span className="sr-only">{t("paths.read")}</span>
                      </>
                    ) : (
                      <ChevronRight size={14} className="shrink-0 text-paper/45 rtl:-scale-x-100" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}
