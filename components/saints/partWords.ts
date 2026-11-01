"use client";

import { useCallback } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { numberShown, type PartName, type SectionHead } from "@/lib/saints/parts";

/**
 * How the reader says a part (lib/saints/parts.ts): "Conference 1" in the
 * reader's language (reading.part.<level>), with the number as the edition
 * prints it, or a section's own words as the work has them. One name for the
 * parts everywhere: the head, the pill, the running line and the contents all
 * say it through this.
 */
export function usePartWords() {
  const { t } = useTranslate();
  const say = useCallback(
    (name: PartName): string => ("text" in name ? name.text : t(`reading.part.${name.level}`, { n: numberShown(name) })),
    [t],
  );
  /** A chapter's name as the pill says it, from what the reading room keeps: "Conference 10 · 10". */
  const sayPill = useCallback((p: SectionHead["pill"]): string => {
    const outer = say(p.name);
    return p.inner !== undefined ? `${outer} · ${p.inner}` : outer;
  }, [say]);
  /** The pill's name: "Conference 10 · 10", "Homily 15". */
  const pill = useCallback((head: SectionHead): string => sayPill(head.pill), [sayPill]);
  /** "Chapter 10 of 14", or null where the parts are not numbered. */
  const count = useCallback(
    (head: SectionHead): string | null => (head.count ? t("reading.part.of", { part: say(head.count.name), total: head.count.total }) : null),
    [say, t],
  );
  return { say, pill, sayPill, count };
}
