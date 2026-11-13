"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Sheet } from "@/components/ui/Sheet";
import { Check } from "@/components/ui/icons/Check";
import { Play } from "@/components/ui/icons/Play";
import { cn } from "@/lib/cn";
import { voiceContextOf, pieceNow, readAgainIn, type VoiceContext } from "@/lib/listen/speech/context";
import { speechEngine } from "@/lib/listen/speech/engine";
import { closeVoiceSheet, useVoiceSheet } from "@/lib/listen/speech/sheet";
import { useVoiceShown } from "@/lib/listen/speech/speak";
import { HEART, chooseVoice, useChosenVoice, voiceToUse } from "@/lib/listen/speech/voiceChoice";
import { askAgain, useDeviceVoices, voiceRows, type VoiceRow } from "@/lib/listen/speech/voices";
import { sentencesOf } from "@/lib/listen/texts";
import { readSpeed } from "@/lib/player/speed";
import { listeningPlace, subscribeListening } from "@/lib/readings/listen";
import { getAudioSnapshot, isSpoken, pause, play, usePersistentAudio } from "@/lib/prayers/persistentAudioStore";

/**
 * The Voice sheet (1.9, build 95 note 25, his "all recs" of 2026-11-13: the
 * phone's own voices, free for every reader, reading the Bible, the lives,
 * the councils, history, theology and the works, never the prayers). Opened
 * from the Voice row of the player's •••, over the player, from the player's
 * own parts: the sheet, its rows as the sleep timer's are, the mark of the one
 * chosen.
 *
 *  - Heart first, where the text has its recording; then the phone's own
 *    voices for the text's language, each with Hear it, which speaks the first
 *    words of the verse or paragraph being read in that voice.
 *  - Choosing one reads what is playing again in it, at the verse or
 *    paragraph being read, and keeps the choice for the language.
 *  - A voice the reader chose that the phone no longer has: said here, with
 *    the voice that reads instead.
 *  - No voice for the language and no recording (opened from a page's
 *    Listen): said, and where a voice is added.
 *
 * Mounted once in the root frame, as the ambience sheet is.
 */
export function VoiceSheet() {
  const { t } = useTranslate();
  const sheet = useVoiceSheet();

  // A link out of the app's screens leaves it behind, as the ambience sheet does.
  const pathname = usePathname();
  const firstPath = useRef(pathname);
  useEffect(() => {
    if (pathname === firstPath.current) return;
    firstPath.current = pathname;
    closeVoiceSheet();
  }, [pathname]);

  return (
    <Sheet open={sheet.open} onClose={closeVoiceSheet} title={t("player.voice")} desktop layer={sheet.overPlayer ? "over-player" : undefined} bodyClassName="pt-1">
      <VoiceSheetContent open={sheet.open} none={sheet.none} />
    </Sheet>
  );
}

function VoiceSheetContent({ open, none }: { open: boolean; none: { lang: string } | null }) {
  const { t, locale } = useTranslate();
  const audio = usePersistentAudio();
  const about: VoiceContext | null = none ? null : voiceContextOf(audio.src);
  const lang = none?.lang ?? about?.lang ?? "en";
  const recorded = Boolean(about?.recorded);
  const voices = useDeviceVoices(open);
  const choice = useChosenVoice(lang);
  const { reading } = useVoiceShown();
  // What was playing as the sheet opened: a voice heard meanwhile pauses it, and it goes on after.
  const wasPlaying = useRef(false);
  const heardSome = useRef(false);
  const [busy, setBusy] = useState<string | null>(null);

  // Asked again as it opens and as the reader comes back to the app: a voice added in the phone's settings meanwhile is listed.
  useEffect(() => {
    if (!open) return;
    wasPlaying.current = getAudioSnapshot().playing;
    heardSome.current = false;
    void askAgain();
    const back = () => {
      if (document.visibilityState === "visible") void askAgain();
    };
    document.addEventListener("visibilitychange", back);
    return () => {
      document.removeEventListener("visibilitychange", back);
      // Closed without a choice after hearing a voice: the reading goes on as it was.
      if (heardSome.current && wasPlaying.current && !getAudioSnapshot().playing) play();
    };
  }, [open]);

  const rows = voices ? voiceRows(voices, lang, locale, (n) => t("player.voice.numbered", { n }), choice) : [];
  // The voice reading now: the phone's, or Heart while the recording plays.
  const now: string | null =
    about && isSpoken() && reading?.src === audio.src ? reading.voice.id : about && recorded && !isSpoken() ? HEART : null;
  const resolved = voices ? voiceToUse(choice, voices, lang, recorded) : null;
  const checked = now ?? (resolved?.kind === "heart" ? HEART : resolved?.kind === "phone" ? resolved.voice.id : null);
  const gone = resolved && resolved.kind !== "none" ? resolved.gone : undefined;
  const nameOf = (id: string | null) => (id === HEART ? t("player.voice.heart") : (rows.find((r) => r.voice.id === id)?.name ?? ""));
  const languageName = (() => {
    try {
      return new Intl.DisplayNames([locale], { type: "language" }).of(lang) ?? lang;
    } catch {
      return lang;
    }
  })();

  const choose = async (id: string) => {
    chooseVoice(lang, id);
    if (!about || id === now) {
      closeVoiceSheet();
      return;
    }
    const to = id === HEART ? HEART : rows.find((r) => r.voice.id === id)?.voice;
    if (!to) return;
    setBusy(id);
    const goOn = wasPlaying.current;
    heardSome.current = false;
    await readAgainIn(to, about, t, goOn);
    setBusy(null);
    closeVoiceSheet();
  };

  const hear = async (row: VoiceRow) => {
    const engine = await speechEngine();
    if (!engine) return;
    if (getAudioSnapshot().playing) pause();
    heardSome.current = true;
    const s = getAudioSnapshot();
    const words = s.captions?.[pieceNow()]?.text ?? "";
    const first = sentencesOf(words)[0] ?? words;
    const line = (first || s.title || "").slice(0, 160);
    if (!line) return;
    void engine.preview({ text: line, lang: row.voice.lang, voice: row.voice.id, rate: readSpeed() }).catch(() => {});
  };

  const none_ = !recorded && voices !== null && rows.length === 0;

  return (
    <div>
      {gone && checked ? (
        <p role="status" className="mb-3 font-sans text-detail leading-[1.5] text-paper/80">
          {t("player.voice.gone", { name: nameOf(checked) })}
        </p>
      ) : null}

      {none_ ? (
        <div role="status" className="pb-1">
          <p className="font-sans text-ui leading-[1.5] text-paper/90">{t("player.voice.none", { language: languageName })}</p>
          <p className="mt-2 font-sans text-detail leading-[1.5] text-paper/65">{t("player.voice.noneHow")}</p>
        </div>
      ) : (
        <div role="radiogroup" aria-label={t("player.voice")} className="divide-y divide-paper/10">
          {recorded ? (
            <VoiceChoiceRow
              name={t("player.voice.heart")}
              about={t("player.voice.heartAbout")}
              on={checked === HEART}
              busy={busy === HEART}
              onChoose={() => void choose(HEART)}
            />
          ) : null}
          {rows.map((row) => (
            <VoiceChoiceRow
              key={row.voice.id}
              name={row.name}
              about={row.language}
              on={checked === row.voice.id}
              busy={busy === row.voice.id}
              onChoose={() => void choose(row.voice.id)}
              hear={{ label: t("player.voice.hearName", { name: row.name }), word: t("player.voice.hear"), go: () => void hear(row) }}
            />
          ))}
        </div>
      )}

      {rows.length > 0 ? <p className="mt-3 font-sans text-caption leading-[1.5] text-paper/60">{t("player.voice.phoneNote")}</p> : null}
    </div>
  );
}

/** One voice: its name over its language, the mark when it is the one reading, and Hear it for a phone's voice. */
function VoiceChoiceRow({
  name,
  about,
  on,
  busy,
  onChoose,
  hear,
}: {
  name: string;
  about: string;
  on: boolean;
  busy: boolean;
  onChoose: () => void;
  hear?: { label: string; word: string; go: () => void };
}) {
  return (
    <div className="flex min-h-14 items-center gap-2">
      <button
        type="button"
        role="radio"
        aria-checked={on}
        onClick={onChoose}
        className="flex min-h-14 min-w-0 flex-1 items-center justify-between gap-3 py-1.5 text-start"
      >
        <span className="min-w-0">
          <span className={cn("block truncate font-sans text-ui", on ? "font-semibold text-paper" : "text-paper/85", busy && "motion-safe:animate-pulse")}>{name}</span>
          <span className="block truncate font-sans text-caption text-paper/60">{about}</span>
        </span>
        {on ? <Check size={18} className="shrink-0 text-paper" /> : null}
      </button>
      {hear ? (
        <button
          type="button"
          onClick={hear.go}
          aria-label={hear.label}
          className="tap-press hit-44 inline-flex h-9 shrink-0 items-center gap-1.5 rounded-pill border border-paper/15 bg-paper/[0.04] px-3 font-sans text-detail font-medium text-paper/85 hover:border-paper/30 hover:bg-paper/10"
        >
          <Play size={12} className="shrink-0" />
          <span aria-hidden>{hear.word}</span>
        </button>
      ) : null}
    </div>
  );
}

/**
 * What the player's Voice row says (components/player/PlayerMore.tsx): the
 * voice reading what is playing, Heart while its recording plays; null where
 * no voice reads it (a chant, a prayer) and where today's readings are heard
 * one after another, which step through their own recordings.
 */
export function useVoiceRowValue(src: string | null, ask: boolean): string | null {
  const { t, locale } = useTranslate();
  const place = useSyncExternalStore(subscribeListening, listeningPlace, () => null);
  const about = voiceContextOf(src);
  const { reading } = useVoiceShown();
  const spokenHere = Boolean(about) && isSpoken() && reading?.src === src;
  const voices = useDeviceVoices(ask && spokenHere);
  if (!about || (place && place.src === src)) return null;
  if (!spokenHere || !reading) return about.recorded ? t("player.voice.heart") : null;
  const rows = voiceRows(voices ?? [reading.voice], about.lang, locale, (n) => t("player.voice.numbered", { n }), reading.voice.id);
  return rows.find((r) => r.voice.id === reading.voice.id)?.name ?? reading.voice.name;
}
