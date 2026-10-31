"use client";

import { useLayoutEffect, useRef, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { SendGlyph } from "@/components/shop/shopGlyphs";
import { cn } from "@/lib/cn";
import { deviceDateLocale } from "@/lib/i18n/deviceDates";

/**
 * The parts a thread is made of, shared by a conversation with a store
 * (MessageThread) and a support ticket (TicketThread): the day over each
 * day's messages, the time on a bubble, and the composer (r3-19, Messages A,
 * the owner's pick of 2026-10-31).
 */

/** The device's own day, so two messages on one evening share a heading. */
export function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** "Thursday, October 29", over the first message of each day. */
export function DayRule({ iso }: { iso: string }) {
  const label = new Date(iso).toLocaleDateString(deviceDateLocale(), {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  return (
    <li aria-hidden className="pb-2.5 pt-4 text-center font-sans text-[11.5px] font-semibold text-paper/50">
      {label}
    </li>
  );
}

/** "6:02 PM". */
export function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString(deviceDateLocale(), { hour: "numeric", minute: "2-digit" });
}

/**
 * The composer: one field that grows with what is written, and a round white
 * send. On a phone it is held clear of the last message and above the tab
 * bar, the mini player and today's readings bar (`.shop-composer`; build 85
 * had it over the last message), with a spacer of its own height in the
 * thread so the last message scrolls clear of it. From a tablet up it sits
 * at the foot of the thread's column. A store's console (`fixed` false)
 * keeps it in the flow under the thread.
 */
export function Composer({
  placeholder,
  onSend,
  fixed,
}: {
  placeholder: string;
  /** Sends; true when it went, and the field clears. */
  onSend: (text: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  fixed: boolean;
}) {
  const { t } = useTranslate();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [height, setHeight] = useState(64);
  const formRef = useRef<HTMLFormElement | null>(null);
  const fieldRef = useRef<HTMLTextAreaElement | null>(null);

  // The spacer follows the composer's own height as the field grows.
  useLayoutEffect(() => {
    const form = formRef.current;
    if (!fixed || !form || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setHeight(Math.ceil(form.getBoundingClientRect().height) + 12));
    ro.observe(form);
    return () => ro.disconnect();
  }, [fixed]);

  // The field grows with its words, to five lines, then scrolls.
  useLayoutEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    field.style.height = "auto";
    field.style.height = `${Math.min(field.scrollHeight, 132)}px`;
  }, [body]);

  async function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = body.trim();
    if (!text || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await onSend(text);
      if (res.ok) setBody("");
      else setError(res.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {fixed ? <div aria-hidden className="md:hidden" style={{ height }} /> : null}
      <form
        ref={formRef}
        onSubmit={send}
        className={cn(fixed ? "shop-composer" : "sticky bottom-0 z-10 mt-6 bg-night/95 pb-2 pt-3 backdrop-blur safe-pb")}
      >
        <div className="shop-raise flex items-end gap-2 rounded-[26px] py-[7px] pe-[7px] ps-4">
          <label className="min-w-0 flex-1">
            <span className="sr-only">{t("shop.reply")}</span>
            <textarea
              ref={fieldRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={1}
              maxLength={4000}
              placeholder={placeholder}
              className="block max-h-[132px] min-h-[38px] w-full resize-none bg-transparent py-[9px] font-sans text-ui leading-[20px] text-paper placeholder:text-paper/45 focus:outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={busy || !body.trim()}
            aria-label={busy ? t("shop.sending") : t("shop.send")}
            className="shop-btn-lit tap-press hit-44 grid size-[38px] shrink-0 place-items-center rounded-full disabled:opacity-60"
          >
            <SendGlyph size={18} />
          </button>
        </div>
        {error ? (
          <p role="alert" className="mt-2 px-2 font-sans text-detail text-crimson-soft">
            {error}
          </p>
        ) : null}
      </form>
    </>
  );
}
