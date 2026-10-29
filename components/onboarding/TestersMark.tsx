"use client";

import Link from "next/link";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Close } from "@/components/ui/icons/Close";
import { backToMyOwn } from "@/lib/onboarding/testers";
import { useSpace } from "@/lib/onboarding/useSpace";
import { useTesting } from "@/lib/onboarding/useTesting";

/**
 * The mark Testers mode keeps on every screen (1.8): "Testing as Catholic ·
 * Learning", so an admin never forgets the app is showing someone else. The
 * words open the switches in Settings; the cross is Back to my own, the way
 * out from anywhere. It reads the device, not the admin check, so the way out
 * is there even signed out. Renders nothing when no test is on.
 *
 * At the foot of the screen on the reading side, over the tab bar and the
 * player (app/globals.css, "Testers mode"), under the onboarding, which has
 * its own way out.
 */
export function TestersMark() {
  const { t } = useTranslate();
  const testing = useTesting();
  const { background, level } = useSpace();
  if (!testing) return null;
  const who = [background ? t(`onboard.background.${background}`) : "", level ? t(`onboard.level.${level}`) : ""]
    .filter(Boolean)
    .join(" · ");
  return (
    <div
      role="status"
      className="testers-mark lm-card fixed start-3 z-[95] flex max-w-[calc(100vw-1.5rem)] items-center rounded-pill bg-night-soft shadow-[0_10px_28px_-12px_rgba(0,0,0,0.7)] ring-1 ring-inset ring-paper/25"
    >
      <Link
        href="/settings#testers"
        className="inline-flex min-h-11 min-w-0 items-center gap-2 ps-3.5 font-sans text-caption font-semibold text-paper"
      >
        <span aria-hidden className="testers-dot size-1.5 shrink-0 rounded-full bg-paper" />
        <span className="truncate">{who ? t("testers.mark", { who }) : t("testers.title")}</span>
      </Link>
      <button
        type="button"
        onClick={() => backToMyOwn()}
        aria-label={t("testers.back")}
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-paper/65 transition-colors hover:text-paper"
      >
        <Close size={12} />
      </button>
    </div>
  );
}
