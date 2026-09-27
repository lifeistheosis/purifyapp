"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { isDesktopApp } from "@/lib/desktop/bridge";
import { WINDOWS_DOWNLOAD, isWindowsComputer } from "@/lib/desktop/download";
import { isNativeClient } from "@/lib/platform/native";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "tertiary" | "ghost" | "inverse";

/**
 * The hero control on the marketing home. Two things, in priority order: a
 * plain link that opens the app, and, underneath and quieter, the Windows
 * app for a visitor on a Windows computer.
 *
 * IT DID NOT USED TO BE THAT WAY, and the reason is worth keeping. The control
 * was a single button labelled "Open Purify" whose behaviour depended on
 * install state: for a first-time visitor it disabled itself for 1500ms and
 * then fired a browser install prompt or opened an explainer modal. The plain
 * link into the product existed only in a branch a new visitor never reached,
 * so the button that said "Open Purify" did not open Purify. Now the link is
 * unconditional.
 *
 * The second line was "Download Purify", which installed the website as an
 * app and read as a download of something else. On 2026-09-27 the owner asked
 * for it to be the Windows app, the real one (desktop/, with Discord status),
 * so it now says "Download for Windows", links to the installer, and appears
 * only on a Windows computer: never in the desktop app itself, never inside
 * the phone apps, and not on a Mac, an iPad or a phone, which have nothing to
 * run it with.
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
   * Whether to show the download line. The home page renders this component
   * twice, in the hero and again at the close. Both should open the app, but
   * one page should offer the download once, so the closing instance passes
   * false.
   */
  offerInstall?: boolean;
  /**
   * A quieter action that belongs beside the button, such as the hero's "See
   * today". It is passed in rather than placed next to this component so it
   * shares the button's row and is centred on the button alone, not on the
   * button and the download line together.
   */
  trailing?: React.ReactNode;
}) {
  const { t } = useTranslate();

  // Decided on the device: the server cannot see the visitor's system. The
  // 0-delay timer keeps the state update out of the effect body
  // (react-hooks/set-state-in-effect).
  const [onWindows, setOnWindows] = useState(false);
  useEffect(() => {
    if (!offerInstall || isDesktopApp() || isNativeClient()) return;
    if (!isWindowsComputer(navigator.userAgent)) return;
    const tm = setTimeout(() => setOnWindows(true), 0);
    return () => clearTimeout(tm);
  }, [offerInstall]);

  return (
    // A grid, not nested flex rows: the button and `trailing` share the first
    // row, centred on each other, and the download line sits in the second row
    // under the button alone, centred on it. It used to hang from the
    // button's left edge, which read as misaligned under a round pill
    // (reported 2026-09-27). One column on a phone: button, then trailing.
    <span className="inline-grid grid-cols-1 justify-items-start gap-y-3 sm:grid-cols-[auto_auto] sm:items-center sm:gap-x-4 sm:gap-y-2">
      <Link
        href="/prayers/today"
        className={cn(
          "font-sans text-ui leading-none font-medium whitespace-nowrap inline-flex items-center justify-center rounded-pill transition-[background-color,color,box-shadow,transform] duration-200 ease-out cursor-pointer",
          variant === "inverse"
            ? "bg-paper text-on-paper hover:bg-paper/90"
            : "bg-ink text-paper hover:bg-ink/90",
          "px-8 py-4 active:scale-[0.98] sm:col-start-1 sm:row-start-1",
          className,
        )}
      >
        {children}
      </Link>
      {trailing ? <span className="sm:col-start-2 sm:row-start-1">{trailing}</span> : null}

      {onWindows && (
        <a
          href={WINDOWS_DOWNLOAD.url}
          className="justify-self-center font-sans text-caption text-paper/55 underline decoration-paper/25 underline-offset-4 transition-colors hover:text-paper/85 hover:decoration-paper/50 sm:col-start-1 sm:row-start-2"
        >
          {t("home.downloadWindows")}
        </a>
      )}
    </span>
  );
}
