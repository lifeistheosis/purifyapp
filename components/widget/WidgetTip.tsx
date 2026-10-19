"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { CARD_BG } from "@/components/ui/Graphite";
import { Close } from "@/components/ui/icons/Close";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/cn";
import { nativePlatform, type NativePlatform } from "@/lib/platform/native";
import { todayKey } from "@/lib/rhythm/dayKey";
import { useMounted } from "@/lib/useMounted";
import {
  WIDGET_STEPS,
  WIDGET_TIP_EVENT,
  WIDGET_TIP_KEY,
  hasWidget,
  parseTipState,
  tipDue,
  type WidgetTipState,
} from "@/lib/widget/tip";

/**
 * The widget tip (lib/widget/tip.ts has the why and the rules).
 *
 *   WidgetTipCard      the card at the foot of Today: once, after two days,
 *                      gone at a tap
 *   WidgetTipSheet     the steps
 *   useWidgetPlatform  which phone this is, when it is one with a widget
 *
 * Settings mounts the sheet behind a row of its own, so the steps outlive the
 * card.
 */

/** The shell this is, if it carries a widget. Null on the web, on the server and on a shell without one. */
export function useWidgetPlatform(): NativePlatform | null {
  const mounted = useMounted();
  if (!mounted) return null;
  const platform = nativePlatform();
  return hasWidget(platform) ? platform : null;
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(WIDGET_TIP_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(WIDGET_TIP_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(WIDGET_TIP_KEY);
  } catch {
    return null;
  }
}

function writeTip(next: WidgetTipState): void {
  try {
    window.localStorage.setItem(WIDGET_TIP_KEY, JSON.stringify(next));
  } catch {
    // Storage is blocked: nothing is remembered, so the card never shows.
  }
  window.dispatchEvent(new Event(WIDGET_TIP_EVENT));
}

export function WidgetTipSheet({
  open,
  onClose,
  platform,
}: {
  open: boolean;
  onClose: () => void;
  platform: NativePlatform;
}) {
  const { t } = useTranslate();
  return (
    <Sheet open={open} onClose={onClose} title={t("widgetTip.sheetTitle")} openFull>
      <ol className="space-y-3.5 pt-1">
        {WIDGET_STEPS[platform].map((key, i) => (
          <li key={key} className="flex items-start gap-3">
            <span
              aria-hidden
              className="mt-px inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-paper/20 font-sans text-caption font-semibold text-paper/75"
            >
              {i + 1}
            </span>
            <span className="font-sans text-ui leading-[1.5] text-paper">{t(key)}</span>
          </li>
        ))}
      </ol>
      <p className="mt-4 font-sans text-caption leading-[1.5] text-paper/55">{t("widgetTip.note")}</p>
      <button
        type="button"
        onClick={onClose}
        className="mt-5 mb-1 inline-flex min-h-11 w-full items-center justify-center rounded-pill bg-paper px-5 font-sans text-ui font-semibold text-night transition-transform active:scale-[0.98]"
      >
        {t("widgetTip.done")}
      </button>
    </Sheet>
  );
}

export function WidgetTipCard({ className }: { className?: string }) {
  const { t } = useTranslate();
  const platform = useWidgetPlatform();
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  const [open, setOpen] = useState(false);
  const state = parseTipState(raw);
  const { first, done } = state;

  // The wait counts from the first day this phone could have shown the card.
  useEffect(() => {
    if (platform && !first && !done) writeTip({ first: todayKey(), done: false });
  }, [platform, first, done]);

  if (!platform) return null;
  // The sheet outlives the card it was opened from: opening the steps is what
  // retires the card, and the sheet must not vanish under the reader's thumb.
  if (!open && !tipDue(state, todayKey(), platform)) return null;

  const retire = () => writeTip({ first, done: true });

  return (
    <>
      {done ? null : (
        <aside
          aria-labelledby="widget-tip-title"
          className={cn("lm-card relative overflow-hidden rounded-[22px] p-5 ring-1 ring-inset ring-paper/10", className)}
          style={CARD_BG}
        >
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-sans text-caption font-semibold text-paper/55">
                {t("widgetTip.eyebrow")}
              </p>
              <p id="widget-tip-title" className="mt-2 font-heading text-title-sm font-bold leading-tight text-paper">
                {t("widgetTip.title")}
              </p>
              <p className="mt-1.5 font-sans text-detail leading-[1.55] text-paper/65">{t("widgetTip.body")}</p>
            </div>
            <button
              type="button"
              onClick={retire}
              aria-label={t("onboard.nudge.dismiss")}
              className="-mr-2 -mt-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-paper/50 transition-colors hover:text-paper"
            >
              <Close size={14} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              setOpen(true);
              retire();
            }}
            className="mt-4 inline-flex min-h-11 items-center rounded-pill border border-paper/20 px-5 font-sans text-ui font-semibold text-paper transition-colors hover:border-paper/40"
          >
            {t("widgetTip.show")}
          </button>
        </aside>
      )}
      <WidgetTipSheet open={open} onClose={() => setOpen(false)} platform={platform} />
    </>
  );
}
