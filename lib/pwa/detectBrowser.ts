/**
 * Browser + display-mode detection for the PWA install flow.
 *
 * Pure functions, all guarded for SSR (return false during the
 * brief server-render pass before hydration). Centralized here so
 * the desktop CTA and the mobile install banner share one source
 * of truth — previously these checks were duplicated inside
 * `components/pwa/InstallPrompt.tsx`.
 *
 * UA sniffing is a last resort; we use it only where there is no
 * standard API (e.g. distinguishing Firefox-desktop from
 * Chromium-desktop for the install-modal fallback copy). Where a
 * feature query exists (e.g. display-mode: standalone, the
 * presence of `beforeinstallprompt`), prefer that.
 */

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

function hasNavigator(): boolean {
  return typeof navigator !== "undefined";
}

function ua(): string {
  return hasNavigator() ? navigator.userAgent || "" : "";
}

/** True when the page is running as an installed PWA (no browser chrome). */
export function isStandalone(): boolean {
  if (!hasWindow()) return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS-specific Safari flag, predates the display-mode media query
    (window.navigator as unknown as { standalone?: boolean }).standalone ===
      true
  );
}

/** Phone-class iOS device (iPhone / iPod / iPad in mobile UA mode). */
export function isIos(): boolean {
  if (!hasWindow()) return false;
  return /iPad|iPhone|iPod/.test(ua()) && !("MSStream" in window);
}

/**
 * iPad masquerading as desktop Safari. From iPadOS 13+ the default UA
 * is the macOS Safari UA, distinguished only by the touch-points hint.
 * Important: we treat iPad-as-desktop as a *mobile* install path
 * (Add to Home Screen via Share), not as desktop (Add to Dock isn't
 * supported on iPad Safari).
 */
export function isIpadDesktopUA(): boolean {
  if (!hasNavigator()) return false;
  const u = ua();
  if (!/Macintosh/.test(u)) return false;
  const tp = (navigator as Navigator & { maxTouchPoints?: number })
    .maxTouchPoints;
  return typeof tp === "number" && tp > 1;
}

/** Any mobile UA (Android, iPhone, iPod, mobile Firefox). */
export function isMobileUA(): boolean {
  const u = ua();
  return /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/.test(
    u,
  );
}

/** Desktop Firefox. Firefox on desktop does not support PWA install. */
export function isFirefoxDesktop(): boolean {
  const u = ua();
  return /Firefox\//.test(u) && !/Mobile|Tablet/.test(u);
}

/**
 * Desktop Safari (macOS), excluding Chrome/Edge which include "Safari"
 * in their UA. iPadOS-as-desktop UA is NOT counted here — it's its
 * own bucket via `isIpadDesktopUA()`.
 */
export function isSafariDesktop(): boolean {
  const u = ua();
  if (!/Safari\//.test(u)) return false;
  if (/Chrome\/|Chromium\/|Edg\/|OPR\//.test(u)) return false;
  if (isIpadDesktopUA() || isIos() || isMobileUA()) return false;
  return /Macintosh/.test(u);
}

/**
 * True when desktop Safari is at least `major.minor` major version.
 * Safari 17 was the first to support "Add to Dock" from the Share menu,
 * so the modal copy branches on this.
 */
export function isSafariMacAtLeast(major: number): boolean {
  if (!isSafariDesktop()) return false;
  const m = ua().match(/Version\/(\d+)(?:\.(\d+))?/);
  if (!m) return false;
  return parseInt(m[1], 10) >= major;
}

/**
 * Chromium-family desktop (Chrome, Edge, Brave, Arc, Opera, Vivaldi…).
 * These browsers fire `beforeinstallprompt` and support PWA install.
 */
export function isChromiumDesktop(): boolean {
  const u = ua();
  if (!/Chrome\/|Chromium\//.test(u)) return false;
  if (isMobileUA() || isIos() || isIpadDesktopUA()) return false;
  return true;
}
