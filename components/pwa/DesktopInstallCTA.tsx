"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import {
  consumeInstallEvent,
  useInstallStore,
} from "@/lib/pwa/installPromptStore";
import {
  isFirefoxDesktop,
  isIpadDesktopUA,
  isSafariDesktop,
  isSafariMacAtLeast,
  isStandalone,
  isIos,
} from "@/lib/pwa/detectBrowser";
import { lockBodyScroll, setOverlayOpen, unlockBodyScroll } from "@/lib/ui/overlay";
import { isNativeClient } from "@/lib/platform/native";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "tertiary" | "ghost" | "inverse";

/**
 * The hero control on the marketing home. Two things, in priority order: a
 * plain link that opens the app, and, underneath and quieter, an offer to
 * install it.
 *
 * IT DID NOT USED TO BE THAT WAY, and the reason is worth keeping. The control
 * was a single button labelled "Open Purify" whose behaviour depended on
 * install state. For a first-time visitor `isInstalled` is false, so the button
 * disabled itself for 1500ms and then either fired `beforeinstallprompt` or
 * opened an explainer modal. The plain link into the product existed only in
 * the `isInstalled` branch, which a new visitor by definition never reaches. So
 * the button that said "Open Purify" did not open Purify, and the most
 * motivated person on the page was met by an install dialog for software they
 * had not yet read a word of.
 *
 * Now the link is unconditional and the install is secondary. Install state
 * decides only whether the second line appears:
 *
 *   installable – the store has a captured `beforeinstallprompt` event. The
 *                 second line consumes it and calls `prompt()`.
 *   unsupported – grace elapsed with no event: Firefox, older Safari, iPad in
 *                 desktop UA, or Chromium with the prompt suppressed. The
 *                 second line opens the fallback modal instead.
 *   installed   – already installed, or running standalone, or inside the
 *                 native shell. No second line at all; there is nothing to
 *                 offer someone who already has it.
 *
 * Mobile is hidden by the surrounding `hidden md:contents` desktop
 * tree on `app/page.tsx`; this component does no `md:` gating itself.
 */
export function DesktopInstallCTA({
  children,
  variant = "inverse",
  className,
  offerInstall = true,
  trailing,
}: {
  /** The localized "Open Purify" label, threaded in from the page. */
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
  /**
   * Whether to show the secondary install line. The home page renders this
   * component twice, in the hero and again at the close. Both should open the
   * app, but one page should ask once, so the closing instance passes false.
   */
  offerInstall?: boolean;
  /**
   * A quieter action that belongs beside the button, such as the hero's "See
   * today". It has to be passed in rather than placed next to this component,
   * because this component is a COLUMN: the button with the install line under
   * it. A sibling in a centered row gets centered against that whole column,
   * so it sat visibly below the middle of the button it was meant to sit
   * beside. Rendered here, it shares a row with the button alone.
   */
  trailing?: React.ReactNode;
}) {
  const { t } = useTranslate();
  const { event, installed } = useInstallStore();

  // 1500ms grace period after mount. While running, we render the
  // "loading" branch (disabled button, no flicker) so a very fast
  // click on the hero doesn't dead-end before the event has fired.
  const [graceElapsed, setGraceElapsed] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setGraceElapsed(true), 1500);
    return () => clearTimeout(id);
  }, []);

  // Standalone check is window-only, so derive it after mount. The
  // 0-delay timer defers the state update outside the effect body —
  // see the same pattern in InstallPrompt for the iOS hint
  // (react-hooks/set-state-in-effect). The native store shell counts as
  // installed: the CTA then renders as a plain link into the app.
  const [standalone, setStandalone] = useState(false);
  useEffect(() => {
    const result = isStandalone() || isNativeClient();
    if (!result) return;
    const tm = setTimeout(() => setStandalone(true), 0);
    return () => clearTimeout(tm);
  }, []);

  const [modalOpen, setModalOpen] = useState(false);

  const isInstalled = installed || standalone;
  const isInstallable = !isInstalled && event !== null;
  const isUnsupported =
    !isInstalled && !isInstallable && graceElapsed;

  // Can we usefully offer an install at all? Not while already installed or
  // inside the native shell, and not during the grace window, when we do not
  // yet know whether the browser will give us an event.
  const canOfferInstall = offerInstall && (isInstallable || isUnsupported);

  function onClick() {
    if (isInstallable) {
      const ev = consumeInstallEvent();
      if (!ev) {
        // Lost the race to another consumer (mobile banner). Fall
        // back to the modal — at this point the user has no other
        // path from this surface.
        setModalOpen(true);
        return;
      }
      // Fire-and-forget; userChoice resolution drives no UI here. If
      // the user accepts, `appinstalled` will flip the store. If they
      // dismiss, the captured event is gone and a second click will
      // fall through to `isUnsupported` and open the modal.
      Promise.resolve(ev.prompt())
        .then(() => ev.userChoice)
        .catch(() => {
          /* swallow */
        });
      return;
    }
    // Unsupported browsers get the explainer modal.
    if (isUnsupported) setModalOpen(true);
  }

  return (
    <span className="inline-flex flex-col items-start gap-2">
      {/* The primary control ALWAYS opens the app. It used to be an install
          button that happened to be labelled "Open Purify": for a first-time
          visitor `isInstalled` was false, so the control disabled itself for
          1500ms and then either fired a browser install prompt or opened a
          modal. The plain link lived only in the branch a new visitor could
          not reach. The most motivated person on the page was turned away by
          the control meant to welcome them. */}
      <span className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
        <Link
          href="/prayers/today"
          className={cn(
            "font-sans text-ui leading-none font-medium whitespace-nowrap inline-flex items-center justify-center rounded-pill transition-[background-color,color,box-shadow,transform] duration-200 ease-out cursor-pointer",
            variant === "inverse"
              ? "bg-paper text-ink hover:bg-paper/90"
              : "bg-ink text-paper hover:bg-ink/90",
            "px-8 py-4 active:scale-[0.98]",
            className,
          )}
        >
          {children}
        </Link>
        {trailing}
      </span>

      {/* Installing is a real convenience, so it stays offered, quietly and
          second. Absent once installed, absent inside the native shell, and
          absent during the grace window when we do not yet know whether the
          browser will offer an event at all. */}
      {canOfferInstall && (
        <button
          type="button"
          onClick={onClick}
          className="font-sans text-caption text-paper/55 underline decoration-paper/25 underline-offset-4 transition-colors hover:text-paper/85 hover:decoration-paper/50"
        >
          {t("pwa.install.download")}
        </button>
      )}

      <InstallFallbackModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </span>
  );
}

/* ───────────────────────────────────────────────────────────────────
 * Fallback modal: shown for Firefox-desktop, older Safari, Safari 17+
 * (different copy), iPad-in-desktop-UA, and Chromium where the prompt
 * was suppressed. Mirrors the visual register of `ConfirmDialog`:
 * night-soft surface, gold hairline, fade-in via shown flag.
 * ─────────────────────────────────────────────────────────────────── */

function InstallFallbackModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslate();
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) {
      setMounted(true);
      const r = requestAnimationFrame(() => {
        setShown(true);
        closeBtnRef.current?.focus();
      });
      return () => cancelAnimationFrame(r);
    } else if (mounted) {
      setShown(false);
      const tm = setTimeout(() => setMounted(false), 200);
      return () => clearTimeout(tm);
    }
  }, [open, mounted]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Keyed on `mounted` with a cleanup, per the contract in lib/ui/overlay.ts.
  // Previously set and cleared inline above, which released the flag at the
  // start of the exit and left no unmount path for the depth counter.
  useEffect(() => {
    if (!mounted) return;
    setOverlayOpen(true);
    return () => setOverlayOpen(false);
  }, [mounted]);

  useEffect(() => {
    if (!shown) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shown, onClose]);

  // Lock body scroll while shown.
  useEffect(() => {
    if (!shown) return;
    lockBodyScroll();
    return unlockBodyScroll;
  }, [shown]);

  // Pick the right copy at open time (don't re-evaluate per render,
  // since UA strings don't change but we'd rather not run UA sniffing
  // on every parent re-render either).
  const bodyKey = pickBodyKey();

  if (!mounted) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-modal-title"
      className="fixed inset-0 z-[80] flex items-center justify-center px-4"
    >
      <div
        aria-hidden
        onClick={onClose}
        className={
          "absolute inset-0 bg-night/72 backdrop-blur-sm transition-opacity duration-200 " +
          (shown ? "opacity-100" : "opacity-0")
        }
        style={{
          backgroundImage:
            "radial-gradient(ellipse 100% 80% at 50% 50%, rgba(16,16,19,0) 0%, rgba(0,0,0,0.45) 100%)",
        }}
      />
      <div
        className={
          "relative w-full max-w-[460px] rounded-lg border border-paper/15 bg-night-soft/95 shadow-2xl transition-all duration-200 " +
          (shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2")
        }
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(29,29,32,0.65) 0%, rgba(16,16,19,0.95) 100%)",
        }}
      >
        <div
          aria-hidden
          className="absolute inset-x-6 top-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(183,176,163,0.45) 50%, transparent 100%)",
          }}
        />
        <div className="p-6 md:p-7">
          <h2
            id="install-modal-title"
            className="font-display-serif text-title-sm text-paper leading-[1.2] tracking-[-0.01em]"
          >
            {t("pwa.install.modal.title")}
          </h2>
          <p className="mt-3 font-sans text-ui text-paper/75 leading-[1.6]">
            {t(bodyKey)}
          </p>

          <div className="mt-7 flex items-center justify-between gap-3 flex-wrap">
            <Link
              href="/prayers/today"
              className="font-sans text-detail font-medium text-paper/70 hover:text-paper underline decoration-paper/30 underline-offset-4 transition-colors"
            >
              {t("pwa.install.openInBrowser")}
            </Link>
            <button
              ref={closeBtnRef}
              type="button"
              onClick={onClose}
              className="font-sans text-detail font-semibold rounded-pill border border-paper/20 bg-paper/[0.04] text-paper/85 hover:bg-paper/10 hover:border-paper/40 px-5 py-2 transition-colors"
            >
              {t("pwa.install.modal.close")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function pickBodyKey():
  | "pwa.install.modal.firefox"
  | "pwa.install.modal.safari17"
  | "pwa.install.modal.safariOld"
  | "pwa.install.modal.ipad"
  | "pwa.install.modal.ios"
  | "pwa.install.modal.chromiumSuppressed" {
  // iPhone first. Without this branch an iPhone fell through to the Chromium
  // default and was handed a modal titled "Install Purify on your computer",
  // which is the wrong instruction on the wrong device. isIos() has existed in
  // lib/pwa/detectBrowser.ts the whole time and was never called here.
  if (isIos() && !isIpadDesktopUA()) return "pwa.install.modal.ios";
  if (isFirefoxDesktop()) return "pwa.install.modal.firefox";
  if (isIpadDesktopUA()) return "pwa.install.modal.ipad";
  if (isSafariDesktop()) {
    return isSafariMacAtLeast(17)
      ? "pwa.install.modal.safari17"
      : "pwa.install.modal.safariOld";
  }
  return "pwa.install.modal.chromiumSuppressed";
}
