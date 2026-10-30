"use client";

// Try the Discord status's Plus frame (r3-07 A): what friends see on Discord
// while the reader reads, as Settings shows it before they do
// (components/desktop/DiscordPreviewCard.tsx, the real card, built by the
// status's own builder, lib/desktop/presenceModes.ts, from Settings' own
// example: St John's Gospel, halfway through chapter 3). Under Plus custom
// the portrait wears a frame in the color of the church's season, today's
// unless another is chosen, with a thin gold rule inside it if wished.
//
// The pictures are drawn by the website, as Discord's are
// (app/api/discord/art), so the apps ask the website for them. The choices
// here are the preview's own: the reader's Discord status is not changed.

import { useMemo, useState } from "react";

import type { TryProps } from "@/components/billing/PlusTry";
import { DiscordPreviewCard } from "@/components/desktop/DiscordPreviewCard";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { orthodoxPascha } from "@/lib/calendar/pascha";
import { useCalendarStyleDefault } from "@/lib/calendar/useCalendarStyleDefault";
import { cn } from "@/lib/cn";
import { DEFAULT_PREFS, SEASON_COLORS, buildPresence, type SeasonColor } from "@/lib/desktop/presenceModes";
import { liturgicalColorOn } from "@/lib/desktop/seasonColor";
import { isNativeClient } from "@/lib/platform/native";
import { TRY_DISCORD_PLACE } from "@/lib/premium/plusTry";
import { SITE_URL } from "@/lib/site";

import { TrySwitch, TryWindow } from "./TryKit";

/** The swatches' own colors, as Settings draws them (components/desktop/DiscordModes.tsx, SWATCH). */
export const SWATCH: Record<SeasonColor, string> = {
  gold: "#b8892f",
  purple: "#5b2d86",
  crimson: "#8a1f2f",
  green: "#2f6d3e",
  blue: "#2b5f93",
  white: "#e8e1cf",
};

export default function TryDiscord({ row }: TryProps) {
  const { t } = useTranslate();
  const [styleDefault] = useCalendarStyleDefault();
  const style: "new" | "old" = styleDefault === "old" ? "old" : "new";
  const [now] = useState(() => new Date());
  // Today in the church year, by the reader's own calendar day.
  const today = useMemo(
    () => liturgicalColorOn(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12)), style, orthodoxPascha),
    [now, style],
  );
  const [chosen, setChosen] = useState<SeasonColor | null>(null);
  const [gilded, setGilded] = useState(DEFAULT_PREFS.gilded);
  const color = chosen ?? today.color;

  const request = buildPresence({
    prefs: { ...DEFAULT_PREFS, mode: "plus", plusBase: "reading", followSeason: chosen === null, season: color, gilded },
    plusAllowed: true,
    t,
    pathname: "/settings",
    place: TRY_DISCORD_PLACE,
    today: { color: today.color, reason: t(`desktop.presence.season.${today.reason}`) },
  });

  return (
    <>
      <TryWindow label={t(row.name)}>
        <div className="pb-14 pt-2">
          <DiscordPreviewCard request={request} status={null} example on origin={isNativeClient() ? SITE_URL : ""} />
          <p className="px-5 font-sans text-caption leading-[1.5] text-paper/55">
            {t("settings.discordSeasonToday", { color: t(`settings.discordColor.${today.color}`), reason: t(`desktop.presence.season.${today.reason}`) })}
          </p>
        </div>
      </TryWindow>

      <div role="radiogroup" aria-label={t("settings.discordColors")} className="plus-try-track mt-3.5 flex justify-between gap-1 rounded-pill p-1.5">
        {SEASON_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={color === c}
            aria-label={`${t(`settings.discordColor.${c}`)}, ${t(`settings.discordColorWhen.${c}`)}`}
            onClick={() => setChosen(c === today.color ? null : c)}
            className={cn(
              "paywall-choice grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 p-[3px]",
              color === c ? "border-paper shadow-[0_0_14px_-2px_rgba(255,255,255,0.55)]" : "border-transparent",
            )}
          >
            <span aria-hidden className="block h-full w-full rounded-full" style={{ background: SWATCH[c] }} />
          </button>
        ))}
      </div>

      <p className="mt-4 font-sans text-ui font-semibold text-paper">{t("settings.discordGilded")}</p>
      <TrySwitch
        label={t("settings.discordGilded")}
        value={gilded ? "on" : "off"}
        onChange={(v) => setGilded(v === "on")}
        options={[
          { id: "on", label: t("common.on") },
          { id: "off", label: t("common.off") },
        ]}
        className="mt-2"
      />
    </>
  );
}
