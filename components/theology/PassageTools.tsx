"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, type ReactNode } from "react";

import { streamedUrl } from "@/lib/media/streamed";
import { portraitLook, type Look } from "@/lib/share/verseCard";
import { medallionName, type DeckPassage } from "@/lib/theology/page";
import { SAINT_FACES, coverFile } from "@/lib/today/saintFaces";

// Loaded on the tap of Share, as the verse card loads it: a page carries no
// canvas for a reader who never shares.
const PictureSheet = dynamic(() => import("@/components/share/PictureSheet").then((m) => m.PictureSheet), { ssr: false });

/**
 * What every passage of a study carries (1.8, round 3 r3-13): "every quote
 * as a card to share or open at its source". Read where it's from opens the
 * words where they stand in the app, or the public-domain page they were
 * read on; Share makes the picture of them (components/share/PictureSheet,
 * called as it is), his portrait its first look where its rights are
 * recorded, never an icon whose rights are not.
 */

/** Read where it's from: in the app where the library has the words, else the public-domain page, in a new tab. */
export function ReadSource({ source, className, children }: { source: NonNullable<DeckPassage["source"]>; className?: string; children: ReactNode }) {
  return source.external ? (
    <a href={source.href} target="_blank" rel="noopener noreferrer" data-quote-source="" className={className}>
      {children}
    </a>
  ) : (
    <Link href={source.href} prefetch={false} data-quote-source="" className={className}>
      {children}
    </Link>
  );
}

/** The picture of a passage, open while `open`: its words, his name, the work and the place. */
export function PassagePicture({
  passage,
  open,
  onClose,
  onDevice,
  native,
}: {
  passage: DeckPassage;
  open: boolean;
  onClose: () => void;
  onDevice: boolean;
  native: boolean;
}) {
  const workLine = [passage.work, passage.place].filter(Boolean).join(", ");
  // The same object while the passage is the same: the sheet draws its preview again when it changes.
  const words = useMemo(
    () => ({ text: passage.text, reference: passage.name, lang: "en", ...(workLine ? { note: workLine } : {}) }),
    [passage.text, passage.name, workLine],
  );
  const slug = passage.saintSlug;
  const y = slug ? SAINT_FACES[slug] : undefined;
  const lead: Look | undefined = useMemo(
    () => (slug && y !== undefined && onDevice ? portraitLook(streamedUrl(coverFile(slug), native), y / 100) : undefined),
    [slug, y, onDevice, native],
  );
  if (!open) return null;
  return (
    <PictureSheet
      open={open}
      onClose={onClose}
      words={words}
      title={passage.name}
      name={passage.name}
      caption={workLine ? `${passage.name}\n${workLine}` : passage.name}
      referenceLabel={passage.name}
      lead={lead}
      leadLabel={lead ? medallionName(passage.name) : undefined}
    />
  );
}
