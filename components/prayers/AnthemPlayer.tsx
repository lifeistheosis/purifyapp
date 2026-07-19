"use client";

// Prayer Rope Anthem with a language switcher (English / Français / العربية).
// Each version has its own recording and synced lyrics. Switching remounts the
// player (keyed by code) so the previous track stops cleanly.

import { useState } from "react";
import { AudioPlayer } from "@/components/prayers/AudioPlayer";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { ANTHEM_VERSIONS } from "@/lib/prayers/anthemLyrics";

export function AnthemPlayer() {
  const { t } = useTranslate();
  const [code, setCode] = useState(ANTHEM_VERSIONS[0].code);
  const version =
    ANTHEM_VERSIONS.find((v) => v.code === code) ?? ANTHEM_VERSIONS[0];

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
              v.code === code
                ? "bg-gold/[0.12] text-gold"
                : "text-paper/55 hover:text-paper/85"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      <AudioPlayer
        key={version.code}
        src={version.src}
        title={version.title}
        subtitle={version.subtitle}
        lyrics={version.lyrics}
        rtl={version.rtl}
      />
    </div>
  );
}
