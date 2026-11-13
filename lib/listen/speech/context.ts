"use client";

import { downloadableBible } from "@/lib/bible/downloads/catalog";
import { startListening } from "@/lib/listen/play";
import { hasListen, listenOfSrc } from "@/lib/listen/recordings";
import { captionLines, lineAt } from "@/lib/player/captions";
import { currentTimeNow, getAudioSnapshot, pause, seek } from "@/lib/prayers/persistentAudioStore";
import { hasReadAloud, readAloudManifest, readingOfSrc } from "@/lib/readAloud/chapters";
import { startReading } from "@/lib/readAloud/play";

import type { PhoneVoice } from "./engine";
import { anchorsOf, rememberAnchors } from "./pageText";
import { speakText } from "./speak";
import { spokenBibleSrc, spokenOf, spokenTextSrc, voiceLang } from "./spoken";
import { HEART } from "./voiceChoice";

/**
 * What the player is reading, as the Voice sheet needs it (1.9, build 95 note
 * 25): the language a voice is asked for, whether the text has its recording
 * (Heart), and what it is, to read it again in another voice at the verse or
 * paragraph being read. Null for what no voice reads: a chant, a prayer.
 */
export type VoiceContext =
  | { kind: "chapter"; book: string; chapter: number; bible: string | null; lang: string; recorded: boolean }
  | { kind: "text"; id: string; lang: string; textLang: string; recorded: boolean };

export function voiceContextOf(src: string | null): VoiceContext | null {
  const reading = readingOfSrc(src);
  if (reading) return { kind: "chapter", ...reading, bible: null, lang: "en", recorded: true };
  const spoken = spokenOf(src);
  if (spoken?.kind === "bible") {
    const bible = downloadableBible(spoken.bible);
    return {
      kind: "chapter",
      book: spoken.book,
      chapter: spoken.chapter,
      bible: bible?.id ?? null,
      lang: bible ? voiceLang(bible.textLang) : "en",
      recorded: !bible && hasReadAloud(spoken.book, spoken.chapter),
    };
  }
  if (spoken?.kind === "text") return { kind: "text", id: spoken.id, lang: voiceLang(spoken.lang), textLang: spoken.lang, recorded: hasListen(spoken.id) };
  // A text's recording is Purify's own telling, in English.
  const text = listenOfSrc(src);
  if (text) return { kind: "text", id: text.id, lang: "en", textLang: "en", recorded: true };
  return null;
}

/** The piece being read now: the verse or paragraph, by the player's own clock. */
export function pieceNow(): number {
  const s = getAudioSnapshot();
  if (!s.captions?.length) return 0;
  return Math.max(0, lineAt(captionLines(s.captions, s.duration), currentTimeNow(), 0));
}

/**
 * Read what is playing again in another voice, at the verse or paragraph being
 * read: Heart (its recording) or one of the phone's voices. The words are the
 * player's own (a recording's captions carry each verse's words), so nothing
 * is fetched to change to a phone's voice. `autoplay`: go on reading, as it
 * was; else it waits there.
 */
export async function readAgainIn(
  to: typeof HEART | PhoneVoice,
  about: VoiceContext,
  t: (key: string, values?: Record<string, string | number>) => string,
  autoplay: boolean,
): Promise<boolean> {
  const s = getAudioSnapshot();
  const at = pieceNow();
  const lines = s.captions ?? [];
  if (to === HEART) {
    if (!about.recorded) return false;
    if (about.kind === "chapter") {
      const verse = lines[at]?.n;
      await startReading(about.book, about.chapter, s.title ?? `${t(`bible.books.${about.book}`)} ${about.chapter}`, t);
      const manifest = await readAloudManifest(about.book, about.chapter);
      const found = manifest?.verses.find((v) => v.n === verse);
      if (found) seek(found.at);
    } else {
      await startListening(about.id, { title: s.title ?? "", by: s.artist ?? "", art: s.art });
    }
    if (!autoplay) pause();
    return true;
  }
  if (!lines.length || lines.some((l) => !l.text)) return false;
  const src = about.kind === "chapter" ? spokenBibleSrc(about.book, about.chapter, about.bible) : spokenTextSrc(about.id, about.textLang);
  // The page's places stay with the words: a recording's verses by their numbers.
  const places = anchorsOf(s.src) ?? lines.map((l) => (typeof l.n === "number" ? `v${l.n}` : undefined));
  const ok = await speakText({
    src,
    pieces: lines.map((l) => ({ text: l.text, ...(typeof l.n === "number" ? { n: l.n } : {}) })),
    lang: about.lang,
    voice: to,
    title: s.title ?? "",
    artist: s.artist ?? undefined,
    art: s.art ?? undefined,
    artFallback: s.artFallback ?? undefined,
    rtl: s.rtl,
    from: at,
    autoplay,
  });
  if (ok) rememberAnchors(src, places);
  return ok;
}
