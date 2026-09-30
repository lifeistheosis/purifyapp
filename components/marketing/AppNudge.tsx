"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { useReducedMotion } from "@/lib/ui/motion";
import { lockBodyScroll, setOverlayOpen, unlockBodyScroll } from "@/lib/ui/overlay";
import { useDraggableSheet } from "@/lib/ui/useDraggableSheet";
import { useMobileStore, type StoreId } from "@/lib/platform/mobileWeb";
import { StoreButton, StoreRating } from "./storeBits";

/**
 * "Purify is better in the app": the mobile website's word, once per visit,
 * the first time a reader on a phone or tablet goes from one page to another.
 *
 * WHY (the owner, 2026-09-29): on mobile the website is there to send people
 * to the app, "and when they try to click to a different screen ensure
 * there's a pop up that says something along the lines of purify on mobile is
 * recommended ... and the button to exit should say 'im just looking around'."
 *
 * How it listens: one capture-phase click listener on the document, so it sees
 * a link tap before Next's router does. When it steps in it cancels the tap,
 * shows the sheet, and remembers where the reader was going; "I'm just looking
 * around", a tap outside the sheet or a swipe down takes them there. The
 * store button, Back and Escape leave them where they are. Either answer holds
 * for the rest of the visit (sessionStorage), so the website asks once, not on
 * every page.
 *
 * Back: the open pop-up has a history entry of its own (same address), so the
 * phone's Back closes it rather than leaving the site for the page before,
 * usually the search results. Going on replaces that entry with the page they
 * asked for, and staying steps back off it, so the history ends up as if the
 * pop-up had never been there.
 *
 * It never interrupts a task already under way: signing in or up, an account,
 * checkout and orders, email preferences, a purchase. Nor links that open
 * elsewhere (another site, a new tab, a download), nor a jump within the same
 * page. The store apps, the Windows app and desktop browsers never see it:
 * useMobileStore() is null there.
 */

const SEEN_KEY = "purify.appNudge.seen";

/** Marks the history entry the open pop-up stands on. */
const HISTORY_KEY = "purifyAppNudge";

function onOwnEntry(): boolean {
  return window.history.state?.[HISTORY_KEY] === true;
}

/** Pages whose links are part of a task, left alone. */
const TASK_PATHS = [
  "/signin",
  "/signup",
  "/forgot",
  "/reset",
  "/set-password",
  "/signout",
  "/account",
  "/settings",
  "/premium",
  "/pricing",
  "/email",
  "/shop/cart",
  "/shop/checkout",
  "/shop/orders",
  "/shop/messages",
  "/shop/seller",
  "/shop/sell",
  "/admin",
  "/owner",
];

function inTask(pathname: string): boolean {
  return TASK_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function seen(): boolean {
  try {
    return sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return true; // No storage: asking every page would be worse than never.
  }
}

function markSeen() {
  try {
    sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function AppNudge() {
  const store = useMobileStore();
  const router = useRouter();
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    if (!store) return;
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (seen() || inTask(window.location.pathname)) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      let url: URL;
      try {
        url = new URL(a.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return;
      e.preventDefault();
      setTarget(`${url.pathname}${url.search}${url.hash}`);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [store]);

  const open = target !== null;

  // The pop-up's own history entry, and Back closing it.
  useEffect(() => {
    if (!open) return;
    window.history.pushState({ [HISTORY_KEY]: true }, "");
    const onPop = () => {
      markSeen();
      setTarget(null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [open]);

  const lookAround = useCallback(() => {
    markSeen();
    const to = target;
    setTarget(null);
    if (!to) return;
    if (onOwnEntry()) router.replace(to);
    else router.push(to);
  }, [router, target]);

  const stay = useCallback(() => {
    markSeen();
    setTarget(null);
    if (onOwnEntry()) window.history.back();
  }, []);

  if (!store) return null;
  return <NudgeSheet open={open} store={store} onLookAround={lookAround} onStay={stay} />;
}

function NudgeSheet({
  open,
  store,
  onLookAround,
  onStay,
}: {
  open: boolean;
  store: StoreId;
  onLookAround: () => void;
  /** Close and stay on this page: the store button, Escape (Back is
   *  handled above, through the history entry). */
  onStay: () => void;
}) {
  const { t } = useTranslate();
  const reduced = useReducedMotion();
  // A tap outside or a swipe down is "just looking": the reader tapped a
  // link, so they are taken where they were going.
  const { mounted, panelRef, scrimRef, bodyRef, grab } = useDraggableSheet({
    open,
    onClose: onLookAround,
    reduced,
  });

  useEffect(() => {
    if (!mounted) return;
    lockBodyScroll();
    setOverlayOpen(true);
    return () => {
      unlockBodyScroll();
      setOverlayOpen(false);
    };
  }, [mounted]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onStay();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onStay]);


  if (!mounted || typeof document === "undefined") return null;
  const titleId = "app-nudge-title";

  return createPortal(
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      {/* Hidden from assistive technology: the sheet's own "I'm just looking
          around" button does the same thing, and one is enough to hear. */}
      <button
        ref={scrimRef}
        type="button"
        tabIndex={-1}
        aria-hidden
        onClick={onLookAround}
        className="absolute inset-0 bg-night/60"
        style={{ opacity: 0 }}
      />
      <div
        ref={panelRef}
        className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[92dvh] max-w-lg flex-col rounded-t-[28px] border-t border-paper/15 bg-night shadow-[0_-12px_40px_rgba(0,0,0,0.32)] will-change-transform"
      >
        <div className="flex cursor-grab touch-none select-none justify-center pb-2 pt-3 active:cursor-grabbing" {...grab}>
          <span aria-hidden className="block h-1.5 w-11 rounded-full bg-paper/25" />
        </div>
        <div
          ref={bodyRef}
          className="overflow-y-auto overscroll-contain px-6 pt-3 text-center"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1.25rem)" }}
        >
          {/* The icon the reader will look for on their home screen. */}
          <div className="relative mx-auto h-[72px] w-[72px]">
            <span
              aria-hidden
              className="absolute -inset-6 rounded-full"
              style={{ background: "radial-gradient(closest-side, rgba(201,162,90,0.28), transparent)" }}
            />
            <Image
              src="/icon-192.png"
              alt=""
              width={72}
              height={72}
              className="relative h-[72px] w-[72px] rounded-[18px] ring-1 ring-paper/15 shadow-[0_12px_28px_-10px_rgba(0,0,0,0.7)]"
            />
          </div>
          <p className="mt-5 font-sans text-eyebrow font-semibold uppercase tracking-[1.6px] text-premium-ink">
            {t("appNudge.eyebrow")}
          </p>
          <h2 id={titleId} className="mt-2 text-balance text-title-sm font-bold leading-tight text-paper">
            {t("appNudge.title")}
          </h2>
          <p className="mx-auto mt-3 max-w-[34ch] text-pretty font-sans text-ui leading-[1.55] text-paper/70">
            {t("appNudge.body")}
          </p>
          <StoreRating store={store} className="mt-4 justify-center" />
          <StoreButton store={store} emphasis="solid" block onClick={onStay} className="mt-6" />
          <button
            type="button"
            onClick={onLookAround}
            className="mt-2 inline-flex min-h-12 w-full items-center justify-center rounded-2xl font-sans text-ui font-medium text-paper/70 transition-colors hover:bg-paper/[0.05] hover:text-paper"
          >
            {t("appNudge.lookAround")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
