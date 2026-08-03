"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
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
} from "@/lib/pwa/detectBrowser";
import { lockBodyScroll, setOverlayOpen, unlockBodyScroll } from "@/lib/ui/overlay";
import { isNativeClient } from "@/lib/platform/native";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "tertiary" | "ghost" | "inverse";

/**
 * Desktop "Download Purify" CTA on the marketing home. Drop-in
 * replacement for `<ComingSoonCTA variant="inverse">` — visually
 * identical (same `Button` variant, same children-as-label shape),
 * with real behaviour wired up.
 *
 * State machine, derived from the shared install-prompt store
 * (`lib/pwa/installPromptStore`) plus per-browser detection:
 *
 *   loading     – first 1.5s while we wait for either the
 *                 `beforeinstallprompt` event or the grace period to
 *                 elapse. Button is disabled, label stays as the
 *                 caller-supplied "Open Purify" so there's no flicker.
 *   installable – the store has a captured event. Button label flips
 *                 to "Download Purify"; click consumes the event and
 *                 calls `prompt()`. The browser shows its native
 *                 install dialog.
 *   installed   – `appinstalled` fired this session OR the page is
 *                 running standalone. Button becomes a Link to
 *                 `/prayers/today`, labelled "Open Purify".
 *   unsupported – grace period elapsed without a captured event,
 *                 and we're not installed. Browser is Firefox / older
 *                 Safari / Chromium-with-suppressed-prompt / iPad in
 *                 desktop UA. Click opens the fallback modal with
 *                 browser-specific install instructions.
 *
 * Mobile is hidden by the surrounding `hidden md:contents` desktop
 * tree on `app/page.tsx`; this component does no `md:` gating itself.
 */
export function DesktopInstallCTA({
  children,
  variant = "inverse",
  className,
}: {
  /**
   * The localized "Open Purify" label, threaded in from the page.
   * Used as the button text in both the `loading` and `installed`
   * states; the component looks up the "Download Purify" copy itself
   * for the other states.
   */
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
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
  const isLoading = !isInstalled && !isInstallable && !graceElapsed;
  const isUnsupported =
    !isInstalled && !isInstallable && graceElapsed;

  // Installed: render a Link to the app. Keeps the same visual
  // register as a button via the Button base styles.
  if (isInstalled) {
    return (
      <Link
        href="/prayers/today"
        className={cn(
          "font-sans text-ui leading-none font-medium whitespace-nowrap inline-flex items-center justify-center rounded-pill transition-[background-color,color,box-shadow,transform] duration-200 ease-out cursor-pointer",
          "bg-paper text-ink px-8 py-4 hover:bg-paper/90 active:scale-[0.98]",
          className,
        )}
      >
        {children}
      </Link>
    );
  }

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
    // Loading clicks are no-ops (button is disabled). Unsupported
    // clicks open the explainer modal.
    if (isUnsupported) setModalOpen(true);
  }

  const label = isInstallable
    ? t("pwa.install.download")
    : children;

  return (
    <>
      <Button
        variant={variant}
        onClick={onClick}
        disabled={isLoading}
        aria-live="polite"
        className={className}
      >
        {label}
      </Button>
      <InstallFallbackModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
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
  | "pwa.install.modal.chromiumSuppressed" {
  if (isFirefoxDesktop()) return "pwa.install.modal.firefox";
  if (isIpadDesktopUA()) return "pwa.install.modal.ipad";
  if (isSafariDesktop()) {
    return isSafariMacAtLeast(17)
      ? "pwa.install.modal.safari17"
      : "pwa.install.modal.safariOld";
  }
  return "pwa.install.modal.chromiumSuppressed";
}
