"use client";

import { sentenceSpans } from "@/lib/marks/anchor";
import { readSpeed } from "@/lib/player/speed";
import { getAudioSnapshot, play, seek, setLoopMode, setTrack, subscribeAudio, type CaptionSource } from "@/lib/prayers/persistentAudioStore";
import { keepPlace, startOf } from "@/lib/readAloud/resume";

import { listenOfSrc, listenRecording, listenTimings } from "./recordings";
import { hostKeyOf, parseListenId, type ListenRef, type ListenTimings } from "./texts";

/**
 * Load a text's recording into the app's one player and play it (1.9): the
 * same player the Bible's chapters use (lib/readAloud/play.ts), so the mini
 * player, Now Playing, the reader's speed, the sleep timer and the lock
 * screen are the ones a reader knows. It begins where the reader stopped in
 * this text, kept the way a chapter's place is (lib/readAloud/resume.ts).
 */

/** A text's place is kept under its own name, apart from any book of the Bible. */
const placeKey = (id: string) => `listen:${id}`;

/** A sentence of a paragraph on the page, as the paragraph's text has it. */
export function sentenceOnPage(ref: ListenRef, at: { sectionN: number; paragraphIdx: number }, sentence: number): { host: HTMLElement; textEl: HTMLElement; span: { s: number; e: number } | null } | null {
  const host = document.querySelector<HTMLElement>(`[data-mk="${hostKeyOf(ref, at)}"]`);
  const textEl = host?.querySelector<HTMLElement>("[data-mk-text]");
  if (!host || !textEl) return null;
  const spans = sentenceSpans(textEl.textContent ?? "");
  return { host, textEl, span: spans[sentence] ?? null };
}

/**
 * The words Now Playing shows as they are read, from the page itself (the
 * timings carry no words): each sentence of each paragraph the page has. A
 * paragraph the page does not have, or has changed, shows no words and is
 * still heard.
 */
function captionsFromPage(ref: ListenRef, timings: ListenTimings): CaptionSource | undefined {
  if (typeof document === "undefined") return undefined;
  const lines: CaptionSource = [];
  for (const block of timings.blocks) {
    if (!block.at) continue;
    const host = document.querySelector<HTMLElement>(`[data-mk="${hostKeyOf(ref, block.at)}"]`);
    const text = host?.querySelector<HTMLElement>("[data-mk-text]")?.textContent ?? "";
    const spans = sentenceSpans(text);
    if (spans.length !== block.s.length) continue;
    block.s.forEach(([time, end], i) => lines.push({ time, end, text: text.slice(spans[i].s, spans[i].e) }));
  }
  return lines.length ? lines : undefined;
}

let watching = false;

/** Keep the place of whatever text the one player reads, whoever paused it. Once for the life of the page. */
function watchPlaces(): void {
  if (watching || typeof window === "undefined") return;
  watching = true;
  let kept = 0;
  let last: { src: string | null; playing: boolean } = { src: null, playing: false };
  subscribeAudio(() => {
    const s = getAudioSnapshot();
    const listening = listenOfSrc(s.src);
    const stopped = last.src === s.src && last.playing && !s.playing;
    last = { src: s.src, playing: s.playing };
    if (!listening) return;
    const now = Date.now();
    if (!stopped && now - kept < 5_000) return;
    kept = now;
    keepPlace(placeKey(listening.id), 0, s.currentTime, s.duration, now);
  });
}

export async function startListening(id: string, about: { title: string; by: string; art?: string | null; artFallback?: string | null }): Promise<boolean> {
  const ref = parseListenId(id);
  if (!ref) return false;
  const timings = await listenTimings(id);
  setTrack(listenRecording(id), {
    title: about.title,
    artist: about.by,
    art: about.art ?? undefined,
    artFallback: about.artFallback ?? undefined,
    captions: timings ? captionsFromPage(ref, timings) : undefined,
    rate: readSpeed(),
  });
  watchPlaces();
  const at = startOf(placeKey(id), 0);
  if (at > 0) seek(at);
  setLoopMode("off");
  play();
  return true;
}
