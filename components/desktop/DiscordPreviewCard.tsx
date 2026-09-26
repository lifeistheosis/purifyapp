"use client";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import type { PresenceLevel } from "@/lib/desktop/activity";
import type { PresenceStatus } from "@/lib/desktop/bridge";
import { cn } from "@/lib/cn";

/**
 * What your friends see on Discord, shown before they see it.
 *
 * A three-way switch with a hint under it asks the reader to imagine the
 * result. This draws it: the card Discord will show, built from the SAME
 * strings DesktopPresenceBridge sends (desktop.presence.*), so the preview
 * and the real status cannot drift apart. It is an example, not a mirror of
 * this page, because on Settings the real status is only "In Purify".
 *
 * The connection line became a badge with a coloured dot, because "is it
 * working" is the question a reader has after choosing, and a sentence of
 * grey text at the bottom of a section was the easiest thing on the screen
 * to miss. Colour is never the only signal: every state has its words.
 */
export function DiscordPreviewCard({
  level,
  status,
}: {
  level: PresenceLevel;
  status: PresenceStatus | null;
}) {
  const { t } = useTranslate();

  const example =
    level === "reading"
      ? {
          details: t("desktop.presence.scripture"),
          state: "John 3",
          button: t("desktop.presence.button"),
        }
      : level === "app"
        ? { details: t("desktop.presence.app"), state: undefined, button: t("desktop.presence.buttonHome") }
        : null;

  const badge =
    level === "off" || !status
      ? null
      : !status.configured
        ? { tone: "idle" as const, text: t("settings.discordUnavailable") }
        : status.connected
          ? { tone: "live" as const, text: t("settings.discordConnected") }
          : { tone: "wait" as const, text: t("settings.discordWaiting") };

  return (
    <div className="px-5 pb-5">
      <p className="mb-2.5 font-sans text-eyebrow font-semibold uppercase tracking-[1.4px] text-paper/45">
        {t("settings.discordPreviewLabel")}
      </p>

      <div
        className={cn(
          "rounded-xl border p-4 transition-opacity [transition-duration:var(--duration-fast)] motion-reduce:transition-none",
          example ? "border-paper/12 bg-paper/[0.04]" : "border-dashed border-paper/15 bg-transparent opacity-70",
        )}
        aria-live="polite"
      >
        {example ? (
          <>
            <div className="flex items-start gap-3.5">
              {/* eslint-disable-next-line @next/next/no-img-element -- a fixed 56px app icon; next/image adds nothing here and the native export serves it statically */}
              <img
                src="/icon-192.png"
                alt=""
                width={56}
                height={56}
                className="h-14 w-14 shrink-0 rounded-[14px] border border-paper/10"
              />
              <div className="min-w-0 pt-0.5">
                <p className="font-sans text-ui font-semibold text-paper leading-tight">Purify</p>
                <p className="mt-1 truncate font-sans text-detail text-paper/80 leading-snug">{example.details}</p>
                {example.state ? (
                  <p className="truncate font-sans text-detail text-paper/60 leading-snug">{example.state}</p>
                ) : null}
              </div>
            </div>
            <div
              className="mt-3.5 flex h-9 w-full items-center justify-center rounded-md bg-paper/[0.08] font-sans text-caption font-medium text-paper/85"
              aria-hidden="true"
            >
              {example.button}
            </div>
          </>
        ) : (
          <p className="py-2 text-center font-sans text-detail text-paper/55">{t("settings.discordPreviewOff")}</p>
        )}
      </div>

      {level === "reading" ? (
        <p className="mt-2.5 font-sans text-caption text-paper/50 leading-[1.5]">
          {t("settings.discordPreviewExample")}
        </p>
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
