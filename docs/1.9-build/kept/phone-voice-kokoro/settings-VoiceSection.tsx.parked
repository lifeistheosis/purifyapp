"use client";

// The on-phone voice in Settings (1.9; the owner's word of 2026-11-11: "phone
// voice in v1.9", "only a reader who chooses it downloads it, about 90 MB
// once", and "yes free Heart").
//
// One panel: the download, with what it weighs said before it starts, and
// under it the voices, each a row with a sample to hear. Heart is free to
// every reader; another voice is Plus, shown to everyone with its mark, and a
// reader without Plus who chooses one meets the upgrade sheet. Whether a
// reader has Plus is decided again on the server when the voice's file is
// asked for (app/api/listen/phone-voice): this screen only offers.
//
// NOT IN ANY RELEASE YET. It is mounted only where the build says
// PHONE_VOICE_PREVIEW (components/settings/SettingsClient.tsx), which no
// store build and no website build sets: the engine has not been timed on a
// phone (lib/listen/phoneVoiceEngine.ts). The preview exists so the owner
// can be shown stills of it, made from the app's own pieces.

import { useRef, useState } from "react";

import { PlusMark } from "@/components/billing/PlusMark";
import { useUpgradeModal } from "@/components/billing/UpgradeModal";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Check } from "@/components/ui/icons/Check";
import { Play } from "@/components/ui/icons/Play";
import { Waves } from "@/components/ui/icons/Waves";
import { megabytes } from "@/lib/bible/downloads/catalog";
import { usePlusFeatures } from "@/lib/entitlements/usePlusFeatures";
import { choosePhoneVoice, useChosenPhoneVoice } from "@/lib/listen/phoneVoiceChoice";
import {
  cancelPhoneVoice,
  phoneVoiceOverMobileData,
  removePhoneVoice,
  startPhoneVoice,
  usePhoneVoice,
  type DownloadState,
} from "@/lib/listen/phoneVoiceDownload";
import { PHONE_VOICE_STORE, type PhoneVoice } from "@/lib/listen/phoneVoices";

import { Row, Section } from "./LitPanel";

/** What the download weighs, said before the list has been fetched: the model (92.4 MB), its runtime (21.6 MB) and the Heart voice, as measured from the files on 2026-11-11. */
export const PHONE_VOICE_ABOUT_BYTES = 115_000_000;

/** A voice's sample: the same short passage in each, a public file, so every reader may hear what Plus adds. */
const sampleOf = (id: string) => `${PHONE_VOICE_STORE}/samples/${id}.mp3`;

/** A voice's name to readers: its own word where the owner has given one, else the engine's name for it. */
function nameOf(id: string, t: (key: string) => string): string {
  const key = `settings.voice.name.${id}`;
  const named = t(key);
  if (named !== key) return named;
  const bare = id.split("_")[1] ?? id;
  return bare.charAt(0).toUpperCase() + bare.slice(1);
}

const quiet =
  "tap-press min-h-11 shrink-0 rounded-pill px-3 font-sans text-detail font-semibold text-paper/80 hover:bg-paper/[0.06]";

export function VoiceSection({
  voices,
  state: shown,
}: {
  voices: readonly PhoneVoice[];
  /** For the stills alone: a state to show in place of the phone's own. */
  state?: DownloadState;
}) {
  const { t, locale } = useTranslate();
  const own = usePhoneVoice();
  const state = shown ?? own;
  const plus = usePlusFeatures();
  const upgrade = useUpgradeModal();
  const chosen = useChosenPhoneVoice();
  const audio = useRef<HTMLAudioElement | null>(null);
  const [hearing, setHearing] = useState<string | null>(null);

  const hear = (id: string) => {
    audio.current?.pause();
    if (hearing === id) return setHearing(null);
    const a = new Audio(sampleOf(id));
    audio.current = a;
    a.onended = a.onerror = () => setHearing(null);
    setHearing(id);
    void a.play().catch(() => setHearing(null));
  };

  const size = megabytes(state.phase === "ready" ? state.bytes : PHONE_VOICE_ABOUT_BYTES, locale);
  const progress = (s: { done: number; total: number }) => ({ done: megabytes(s.done, locale), total: megabytes(s.total || PHONE_VOICE_ABOUT_BYTES, locale) });

  let description: string;
  let control: React.ReactNode;
  if (state.phase === "ready") {
    description = t("settings.voice.ready", { size });
    control = (
      <button type="button" className={quiet} onClick={() => void removePhoneVoice()} aria-label={t("settings.voice.removeAria")}>
        {t("common.remove")}
      </button>
    );
  } else if (state.phase === "fetching") {
    description = t("settings.voice.fetching", progress(state));
    control = (
      <button type="button" className={quiet} onClick={cancelPhoneVoice}>
        {t("common.cancel")}
      </button>
    );
  } else if (state.phase === "waiting") {
    description = t(state.waiting === "wifi" ? "settings.voice.waitingWifi" : "settings.voice.waitingSignal");
    control =
      state.waiting === "wifi" ? (
        <button type="button" className={quiet} onClick={() => void phoneVoiceOverMobileData()}>
          {t("player.offline.useData")}
        </button>
      ) : (
        <button type="button" className={quiet} onClick={cancelPhoneVoice}>
          {t("common.cancel")}
        </button>
      );
  } else {
    description = state.phase === "failed" ? t("settings.voice.failed") : t("settings.voice.about", { size });
    control = (
      <button
        type="button"
        className="set-btn hit-44 tap-press shrink-0"
        onClick={() => void startPhoneVoice()}
      >
        {t("settings.voice.download")}
      </button>
    );
  }

  return (
    <Section id="voice" title={t("settings.voice")} hint={t("settings.voice.hint")}>
      <div data-voice-download>
        <Row icon={<Waves size={18} />} label={t("settings.voice.engine")} description={description} control={control} />
      </div>
      <div role="radiogroup" aria-label={t("settings.voice.choose")} data-voice-list>
        {voices.map((v) => {
          const name = nameOf(v.id, t);
          const on = chosen === v.id;
          return (
            <Row
              key={v.id}
              label={
                <span className="inline-flex items-center gap-2">
                  {name}
                  {v.plus ? <PlusMark /> : null}
                </span>
              }
              description={v.plus ? t("settings.voice.plusVoice") : t("settings.voice.freeVoice")}
              control={
                <span className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    className={quiet}
                    onClick={() => hear(v.id)}
                    aria-label={t(hearing === v.id ? "settings.voice.stopAria" : "settings.voice.hearAria", { name })}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Play size={14} />
                      {t(hearing === v.id ? "settings.voice.stop" : "settings.voice.hear")}
                    </span>
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={t("settings.voice.useAria", { name })}
                    onClick={() => {
                      if (v.plus && plus === false) return upgrade.open("general");
                      choosePhoneVoice(v.id);
                    }}
                    className="tap-press grid size-11 shrink-0 place-items-center rounded-full text-paper/80 hover:bg-paper/[0.06]"
                  >
                    <span
                      className={
                        on
                          ? "grid size-6 place-items-center rounded-full border-2 border-paper text-paper"
                          : "block size-6 rounded-full border border-paper/40"
                      }
                    >
                      {on ? <Check size={13} strokeWidth={2.6} /> : null}
                    </span>
                  </button>
                </span>
              }
            />
          );
        })}
      </div>
    </Section>
  );
}
