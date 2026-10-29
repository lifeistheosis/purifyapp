"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { useChantAvailability } from "@/lib/chants/live";
import { chantTitleKey } from "@/lib/chants/names";
import { playChant } from "@/lib/chants/play";
import type { ChantIndexRow, ChantIndexVariant } from "@/lib/chants/types";
import { useWordsPrefs } from "@/lib/chants/wordsPrefs";
import { loadChantIndex } from "@/lib/player/chants";
import { chapterSteps, chantVersionOf, playingOf, versionSteps, type ChapterRef } from "@/lib/player/steps";
import { skipBy, toggle, type AudioSnapshot } from "@/lib/prayers/persistentAudioStore";
import { hasReadAloud } from "@/lib/readAloud/chapters";
import { startReading } from "@/lib/readAloud/play";
import { listeningPlace, stepListening, subscribeListening } from "@/lib/readings/listen";

import { Transport, type Step } from "./Transport";

/**
 * Now Playing's controls with previous and next at their ends (1.8, the
 * owner's round 8 A, built with his "add everything we left out" of
 * 2026-10-28). Where each goes is lib/player/steps.ts's:
 *
 *  - today's readings, heard one after another: the reading before and after;
 *  - a chapter of the Bible read aloud: the chapter before and after, where
 *    it has a recording, read at the reader's speed;
 *  - a chant: its version before and after that may play now, from its start,
 *    at 1, as a chant always plays.
 *
 * Its own component, drawn only while the player is open, so the chants'
 * index and the list of what may play are asked for only while a chant is
 * in it: the player itself is mounted on every screen.
 */
export function PlayerTransport({ audio, className }: { audio: AudioSnapshot; className?: string }) {
  const steps = useSteps(audio);
  return <Transport playing={audio.playing} onToggle={() => toggle()} onSkip={skipBy} size={68} steps={steps} className={className} />;
}

const NOWHERE: { previous: Step; next: Step } = { previous: null, next: null };

function useSteps(audio: AudioSnapshot): { previous: Step; next: Step } {
  const { t } = useTranslate();
  const place = useSyncExternalStore(subscribeListening, listeningPlace, () => null);
  const isChant = playingOf(audio.src)?.kind === "chant";
  const [index, setIndex] = useState<ChantIndexRow[] | null>(null);
  useEffect(() => {
    if (!isChant || index) return;
    let alive = true;
    void loadChantIndex().then((rows) => {
      if (alive && rows) setIndex(rows);
    });
    return () => {
      alive = false;
    };
  }, [isChant, index]);
  const availabilityFor = useChantAvailability(isChant);
  const prefs = useWordsPrefs();

  // Today's readings: step through them, never out of them into the chapters.
  if (place && audio.src === place.src) {
    return {
      previous: place.previous ? { label: t("player.previous", { name: place.previous }), go: () => stepListening(-1) } : null,
      next: place.next ? { label: t("player.next", { name: place.next }), go: () => stepListening(1) } : null,
    };
  }

  const playing = playingOf(audio.src, index);
  if (playing?.kind === "chapter") {
    const { previous, next } = chapterSteps(playing.book, playing.chapter, hasReadAloud);
    const name = (to: ChapterRef) => t(`bible.books.${to.book}`);
    const read = (to: ChapterRef) => () => void startReading(to.book, to.chapter, `${name(to)} ${to.chapter}`, t);
    return {
      previous: previous ? { label: t("bible.previousTargetAria", { book: name(previous), chapter: previous.chapter }), go: read(previous) } : null,
      next: next ? { label: t("bible.nextTargetAria", { book: name(next), chapter: next.chapter }), go: read(next) } : null,
    };
  }

  const found = playing?.kind === "chant" ? chantVersionOf<ChantIndexVariant, ChantIndexRow>(audio.src, index) : null;
  if (found) {
    const { row, variant } = found;
    const { previous, next } = versionSteps(row.variants, variant.id, (v) => availabilityFor(row.slug, v) === "playable");
    const sing = (to: ChantIndexVariant) => () =>
      playChant({ slug: row.slug, title: t(chantTitleKey(row.key)), variant: to, coverSrc: row.cover?.src, prefs });
    return {
      previous: previous ? { label: t("player.previous", { name: previous.label }), go: sing(previous) } : null,
      next: next ? { label: t("player.next", { name: next.label }), go: sing(next) } : null,
    };
  }

  return NOWHERE;
}
