"use client";

import Link from "next/link";
import type { CSSProperties } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";
import { collectionHref, collectionNameKey, type FeelingDoor } from "@/lib/reading/feelings";

import { CoverRow } from "./CoverRow";
import styles from "./room.module.css";

/** Where each door's light falls from, in turn, so the row reads as one set and no two neighbours are lit alike. */
const LIGHT = ["22%", "78%", "50%", "30%", "70%"];

/**
 * The row by feeling (1.8, the owner's note of 2026-10-17: "a section for
 * emotions"): a door for each feeling the library can answer, opening its
 * Purify collection (lib/reading/feelings.ts). A door is the posters' black,
 * lit from one side, with the feeling's name in Lora and how many passages
 * wait behind it. The whole door is the link, named by its words.
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
                "dark-island relative flex aspect-[5/4] flex-col justify-end overflow-hidden rounded-[8px] bg-night-soft p-3.5 shadow-[0_12px_24px_-12px_rgba(0,0,0,0.85)] md:p-4",
              )}
              style={{ "--door-light": LIGHT[i % LIGHT.length] } as CSSProperties}
            >
              <span className="font-serif text-[21px] font-semibold leading-[1.12] text-paper text-balance md:text-[24px]">
                {t(collectionNameKey(door.slug))}
              </span>
              <span className="mt-1 font-sans text-caption text-paper/60">{tn("reading.collection.passages", door.count)}</span>
            </span>
          </Link>
        </li>
      ))}
    </CoverRow>
  );
}
