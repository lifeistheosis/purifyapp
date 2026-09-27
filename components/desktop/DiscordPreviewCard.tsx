"use client";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import type { PresenceStatus } from "@/lib/desktop/bridge";
import { artQuery, type PresenceRequest } from "@/lib/desktop/presenceModes";
import { cn } from "@/lib/cn";

/**
 * What your friends see on Discord, shown before they see it.
 *
 * Drawn from the very request the status sends (lib/desktop/presenceModes.ts
 * builds both), and its pictures are the very pictures Discord fetches: the
 * same /api/discord/art URL the desktop app builds, so the preview cannot
 * drift from the status. It is a Discord card, so it stays dark on every
 * palette (dark-island).
 *
 * The connection is a badge with a coloured dot, because "is it working" is
 * the question a reader has after choosing, and colour is never the only
 * signal: every state has its words.
 */
export function DiscordPreviewCard({
  request,
  status,
  example,
  on,
}: {
  request: PresenceRequest | null;
  status: PresenceStatus | null;
  /** The request is an example (Reading, away from a text). */
  example?: boolean;
  on: boolean;
}) {
  const { t } = useTranslate();

  const art = request?.art ? artQuery(request.art) : "";
  const large = art ? `/api/discord/art?${art}` : "/icon-192.png";
  const small = request?.badge ? `/api/discord/art?badge=${request.badge}` : art ? "/icon-192.png" : null;

  const badge = !on || !status
    ? null
    : !status.configured
      ? { tone: "idle" as const, text: t("settings.discordUnavailable") }
      : status.connected
        ? { tone: "live" as const, text: t("settings.discordConnected") }
        : { tone: "wait" as const, text: t("settings.discordWaiting") };

  return (
    <div className="px-5 pb-5 pt-4">
      <p className="mb-2.5 font-sans text-eyebrow font-semibold uppercase tracking-[1.4px] text-paper/55">
        {t("settings.discordPreviewLabel")}
      </p>

      <div
        className={cn(
          "dark-island max-w-[400px] rounded-xl border p-3.5",
          request ? "border-white/10 bg-[#1b1c1f]" : "border-dashed border-white/15 bg-[#111214]",
        )}
        aria-live="polite"
      >
        {request ? (
          <>
            <div className="flex items-center gap-3.5">
              <div className="relative h-[76px] w-[76px] shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element -- the exact picture Discord fetches; next/image would re-encode it */}
                <img src={large} alt="" width={76} height={76} className="h-[76px] w-[76px] rounded-lg object-cover" />
                {small ? (
                  // eslint-disable-next-line @next/next/no-img-element -- as above
                  <img
                    src={small}
                    alt=""
                    width={26}
                    height={26}
                    className="absolute -bottom-[7px] -right-[7px] h-[26px] w-[26px] rounded-full border-[3px] border-[#1b1c1f]"
                  />
                ) : null}
              </div>
              <div className="min-w-0">
                <p className="font-sans text-ui font-bold leading-tight text-white">Purify</p>
                <p className="mt-0.5 truncate font-sans text-detail leading-snug text-white/85">{request.details}</p>
                {request.state ? (
                  <p className="truncate font-sans text-detail leading-snug text-white/60">{request.state}</p>
                ) : null}
              </div>
            </div>
            {request.buttonLabel || request.homeLabel ? (
              <div className="mt-3 flex flex-col gap-2" aria-hidden="true">
                {request.path && request.buttonLabel ? (
                  <span className="flex h-8 items-center justify-center rounded bg-[#4e5058] font-sans text-caption font-semibold text-white">
                    {request.buttonLabel}
                  </span>
                ) : null}
                {request.path && request.path !== "/" && request.homeLabel ? (
                  <span className="flex h-8 items-center justify-center rounded bg-[#4e5058] font-sans text-caption font-semibold text-white">
                    {request.homeLabel}
                  </span>
                ) : null}
              </div>
            ) : null}
          </>
        ) : (
          <p className="py-2 text-center font-sans text-detail text-white/55">{t("settings.discordPreviewOff")}</p>
        )}
      </div>

      {example && request ? (
        <p className="mt-2.5 font-sans text-caption leading-[1.5] text-paper/55">{t("settings.discordPreviewExample")}</p>
      ) : null}

      {badge ? (
        <p
          role="status"
          className="mt-3 inline-flex items-center gap-2 rounded-pill border border-paper/12 bg-paper/[0.03] px-3 py-1.5 font-sans text-caption text-paper/75"
        >
          <span
            aria-hidden="true"
            className={cn(
              "h-2 w-2 shrink-0 rounded-full",
              badge.tone === "live" && "bg-emerald-400",
              badge.tone === "wait" && "bg-amber-300",
              badge.tone === "idle" && "bg-paper/35",
            )}
          />
          {badge.text}
        </p>
      ) : null}
    </div>
  );
}
