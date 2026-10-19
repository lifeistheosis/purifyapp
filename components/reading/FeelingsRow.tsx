"use client";

import Link from "next/link";
import type { CSSProperties } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";
import { collectionHref, collectionNameKey, type FeelingDoor } from "@/lib/reading/feelings";

import { CoverRow } from "./CoverRow";
import styles from "./room.module.css";

/** Where each door's pool of light sits across it, in turn, so no two neighbours are lit alike. */
const LIGHT = ["40%", "60%", "48%", "36%", "64%"];

/**
 * The row by feeling (1.8, the owner's note of 2026-10-17: "a section for
 * emotions"): a door for each feeling the library can answer, opening its
 * Purify collection (lib/reading/feelings.ts). A door is a title card in the
 * posters' own manner: black, a pool of light where the feeling's name
 * stands in Lora, a short rule, and how many passages wait behind it. The
 * whole door is the link, named by its words.
 */
export function FeelingsRow({ doors, className }: { doors: FeelingDoor[]; className?: string }) {
  const { t, tn } = useTranslate();
  if (doors.length === 0) return null;
  return (
    <CoverRow id="feelings" title={t("reading.row.feelings")} className={className}>
      {doors.map((door, i) => (
        <li key={door.slug} className="w-[150px] md:w-[196px]">
          <Link href={collectionHref(door.slug)} prefetch={false} className="press-card group block rounded-[8px]">
            <span
              data-feeling={door.slug}
              className={cn(
                styles.door,
                "dark-island relative flex aspect-[4/3] flex-col items-center justify-center overflow-hidden rounded-[8px] bg-night px-3 text-center shadow-[0_12px_24px_-12px_rgba(0,0,0,0.85)]",
              )}
              style={{ "--door-light": LIGHT[i % LIGHT.length] } as CSSProperties}
            >
              <span className="font-serif text-[23px] font-semibold leading-[1.1] text-paper text-balance md:text-[26px]">
                {t(collectionNameKey(door.slug))}
              </span>
              <span aria-hidden className="mt-2.5 block h-px w-6 shrink-0 bg-paper/30" />
              <span className="mt-2 font-sans text-caption text-paper/60">{tn("reading.collection.passages", door.count)}</span>
            </span>
          </Link>
        </li>
      ))}
    </CoverRow>
  );
}
