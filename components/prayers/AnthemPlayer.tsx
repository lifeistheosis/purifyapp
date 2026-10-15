"use client";

// The Prayer Rope Anthem (English, Français, العربية), each with its own
// recording and its words timed line by line. From 1.7 this is the door to
// Now Playing (components/player/NowPlayingSheet.tsx): choose a language,
// press play, and the player opens with the live captions, the words lighting
// as they are sung. The owner named the Anthem the first real test of the
// captions (2026-10-15: "this is when you start implementing the prayer rope
// anthem into this ... the first real like test subject for the captions").
//
// The words stay on the page as well, to read without playing. The loop
// counts the old player had (Off, Loop, 3, 7, 12) are in Now Playing.

import { useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { openNowPlaying } from "@/lib/player/sheet";
import { ANTHEM_ART, ANTHEM_VERSIONS } from "@/lib/prayers/anthemLyrics";
import { play, setTrack, usePersistentAudio } from "@/lib/prayers/persistentAudioStore";

export function AnthemPlayer() {
  const { t } = useTranslate();
  const [code, setCode] = useState(ANTHEM_VERSIONS[0].code);
  const version = ANTHEM_VERSIONS.find((v) => v.code === code) ?? ANTHEM_VERSIONS[0];
  const audio = usePersistentAudio();
  const title = t(`prayers.anthem.version.${version.code}.title`);
  const loaded = Boolean(audio.src && (audio.src === version.src || audio.src.endsWith(version.src)));
  const sounding = loaded && audio.playing;

  const start = () => {
    setTrack(version.src, {
      title,
      artist: "Purify",
      art: ANTHEM_ART,
      captions: version.lyrics,
      rtl: version.rtl,
    });
    if (!sounding) play();
    openNowPlaying({ captions: true });
  };

  return (
    <div>
      <div
        role="tablist"
        aria-label={t("prayers.anthem.languageAria")}
        className="mb-5 inline-flex items-center gap-1 rounded-pill border border-paper/12 bg-paper/[0.03] p-1"
      >
        {ANTHEM_VERSIONS.map((v) => (
          <button
            key={v.code}
            type="button"
            role="tab"
            aria-selected={v.code === code}
            onClick={() => setCode(v.code)}
            className={`rounded-pill px-4 py-1.5 font-sans text-detail transition-colors ${
              v.code === code ? "bg-paper/[0.1] text-paper" : "text-paper/55 hover:text-paper/85"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-4 rounded-[22px] border border-paper/10 bg-paper/[0.04] p-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- a static export serves files as they are. */}
        <img src={ANTHEM_ART} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover shadow-[0_10px_24px_-8px_rgba(0,0,0,0.6)]" />
        <div className="min-w-0 flex-1">
          <p className="font-serif text-ui font-semibold leading-snug text-paper">{title}</p>
          <p className="mt-1 font-sans text-caption leading-snug text-paper/55">{t("prayers.anthem.playerSubtitle")}</p>
        </div>
        <button
          type="button"
          onClick={start}
          aria-label={sounding ? t("prayers.nowPlaying") : t("prayers.play")}
          className="tap-press grid h-14 w-14 shrink-0 place-items-center rounded-full bg-paper text-night shadow-[0_8px_22px_-8px_rgba(0,0,0,0.6)]"
        >
          {sounding ? (
            // Already playing: the bars of the music, and a tap opens it.
            <svg width={22} height={22} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <rect x="4" y="10" width="3" height="10" rx="1" />
              <rect x="10.5" y="5" width="3" height="15" rx="1" />
              <rect x="17" y="8" width="3" height="12" rx="1" />
            </svg>
          ) : (
            <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor" className="translate-x-[2px]" aria-hidden>
              <path d="M7 4.5v15l12.5-7.5L7 4.5z" />
            </svg>
          )}
        </button>
      </div>

      {/* The words, to read as well as to hear. */}
      <ol
        dir={version.rtl ? "rtl" : undefined}
        className="mt-8 space-y-2.5 font-serif text-detail leading-[1.7] text-paper/70"
      >
        {version.lyrics.map((line, i) => (
          <li key={i}>{line.text}</li>
        ))}
      </ol>
    </div>
  );
}
